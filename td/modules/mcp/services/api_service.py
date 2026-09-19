"""
TouchDesigner MCP Web Server API Service Implementation
Provides API functionality related to TouchDesigner
"""

import contextlib
import importlib
import inspect
import io
import pydoc
import re
import sys
import traceback
from typing import Any, NamedTuple, Optional, Protocol

from mcp.services.node_layout import first_free_cell
import td
from utils.logging import log_message
from utils.result import error_result, success_result
from utils.serialization import safe_serialize
from utils.types import LogLevel, Result
from utils.version import get_mcp_api_version


class IApiService(Protocol):
	"""API service interface"""

	def get_td_info(self) -> Result: ...
	def get_td_python_classes(self) -> Result: ...
	def get_td_python_class_details(self, class_name: str) -> Result: ...
	def get_module_help(self, module_name: str) -> Result: ...
	def get_node_detail(self, node_path: str) -> Result: ...
	def get_node_errors(self, node_path: str) -> Result: ...
	def update_node(self, node_path: str, properties: dict[str, Any]) -> Result: ...
	def exec_node_method(
		self, node_path: str, method: str, args: list, kwargs: dict
	) -> Result: ...


class TouchDesignerApiService(IApiService):
	"""Implementation of the TouchDesigner API service"""

	def get_td_info(self) -> Result:
		"""Get information about the TouchDesigner server"""

		version = td.app.version
		build = td.app.build

		server_info = {
			"server": f"TouchDesigner {version}.{build}",
			"version": f"{version}.{build}",
			"osName": td.app.osName,
			"osVersion": td.app.osVersion,
			"mcpApiVersion": get_mcp_api_version(),
		}

		return success_result(server_info)

	def get_td_python_classes(self) -> Result:
		"""Get list of Python classes and modules available in TouchDesigner"""
		classes = []

		for name, obj in inspect.getmembers(td):
			if name.startswith("_"):
				continue

			description = inspect.getdoc(obj) or ""
			class_info = {
				"name": name,
				"description": description,
			}

			classes.append(class_info)

		return success_result({"classes": classes})

	def get_td_python_class_details(self, class_name: str) -> Result:
		"""Get detailed information about a specific Python class or module"""

		obj = None
		if hasattr(td, class_name):
			obj = getattr(td, class_name)
			log_message(f"Found {class_name} in td module", LogLevel.DEBUG)
		else:
			log_message(f"Class not found: {class_name}", LogLevel.WARNING)
			return error_result(f"Class or module not found: {class_name}")

		methods = []
		properties = []

		for name, member in inspect.getmembers(obj):
			if name.startswith("_"):
				continue

			try:
				info = {
					"name": name,
					"description": inspect.getdoc(member) or "",
					"type": type(member).__name__,
				}
				if (
					inspect.isfunction(member)
					or inspect.ismethod(member)
					or inspect.ismethoddescriptor(member)
				):
					methods.append(info)
				else:
					properties.append(info)
			except Exception as e:
				log_message(
					f"Error processing member {name}: {str(e)}", LogLevel.WARNING
				)

		if inspect.isclass(obj):
			type_info = inspect.classify_class_attrs(obj)[0].kind
		else:
			type_info = type(obj).__name__

		class_details = {
			"name": class_name,
			"type": type_info,
			"description": inspect.getdoc(obj) or "",
			"methods": methods,
			"properties": properties,
		}

		return success_result(class_details)

	def get_module_help(self, module_name: str) -> Result:
		"""Get Python help() output for a module or class"""

		target = self._resolve_help_target(module_name)
		if target is None:
			log_message(f"Module not found: {module_name}", LogLevel.WARNING)
			return error_result(f"Module not found: {module_name}")

		try:
			help_text = self._normalize_help_text(pydoc.render_doc(target))
		except Exception as exc:  # noqa: BLE001
			log_message(
				f"Error generating help for {module_name}: {str(exc)}",
				LogLevel.ERROR,
			)
			return error_result(
				f"Failed to get help for {module_name}: {str(exc)}",
			)

		log_message(f"Retrieved help for {module_name}", LogLevel.DEBUG)
		return success_result(
			{
				"moduleName": module_name,
				"helpText": help_text,
			}
		)

	def get_node(self, node_path: str) -> Result:
		"""Alias for get_node_detail for backwards compatibility"""
		return self.get_node_detail(node_path)

	def get_node_detail(self, node_path: str) -> Result:
		"""Get node at the specified path"""

		node = td.op(node_path)

		if node is None or not node.valid:
			return error_result(f"Node not found at path: {node_path}")

		node_info = self._get_node_summary(node)
		return success_result(node_info)

	def get_node_errors(self, node_path: str) -> Result:
		"""Collect error and warning messages for a node and all its descendants

		TouchDesigner reports many of the most common failures (missing files,
		dangling operator references, shader compile failures) as warnings
		rather than errors, so both streams are collected. Each entry carries a
		``level`` so callers can tell them apart.

		Only those two streams are read. An exception raised inside a Script OP
		callback - a ``scriptCHOP``'s ``onCook``, say - reaches neither, so it
		leaves ``errorCount`` 0 and ``incomplete`` False: the shape of a clean
		node. The tool contract in ``toolDefinitions.ts`` says so, because this
		payload has no way to.

		There is no third stream to read. Measured on 099.2025.33230 against a
		``scriptCHOP`` whose ``onCook`` raises - with the callback proven to run,
		by giving it a side effect first - every candidate came back empty:
		``errors()``, ``warnings()``, ``scriptErrors()``, and an ``errorDAT``
		scoped over the operator with ``source``/``severity``/``type`` all at
		``*``, read on a later frame. ``scriptErrors()`` carries what
		``addScriptError()`` puts there, not what the cook threw.

		The traceback goes to stderr and nowhere else - captured with
		``contextlib.redirect_stderr`` around a forced cook, naming the callbacks
		DAT as its source file. Reading it would therefore mean *causing* a cook,
		which would turn this query into a side effect. What does work, and is
		what the tool contract recommends, is catching it in the callback and
		calling ``scriptOp.addError(msg)``: that lands on ``errors()`` in exactly
		the format parsed below, verified live. See #219.
		"""

		node, outcome = _resolve_op(node_path)
		if outcome == _LOOKUP_FAILED:
			return error_result(f"Could not look up node at path: {node_path}")
		if outcome == _MISSING:
			# td.op() takes a glob, so it can answer with an operator whose
			# path is not the one asked for. _resolve_op refuses that but
			# hands the near miss back, so the message can name what actually
			# answered. Looking it up a second time would let the two calls
			# disagree, and the second call's `except` would have to report
			# "not found" — the exact untrue message this branch exists to
			# avoid. Saying "not found" is only true when nothing answered.
			if node is not None:
				return error_result(
					f"Path {node_path} matched {node.path} rather than "
					"naming it; pass the exact operator path."
				)
			return error_result(f"Node not found at path: {node_path}")

		entries = []
		skipped = []
		unresolved = []
		lookup_failures = []
		fallback_owners = []
		for level, getter in (
			(_LEVEL_ERROR, "errors"),
			(_LEVEL_WARNING, "warnings"),
		):
			notes = []
			method = getattr(node, getter, None)
			if not callable(method):
				# An older TouchDesigner build may not expose this stream.
				skipped.append(
					{"stream": getter, "reason": f"OP.{getter} is not available"}
				)
				continue
			try:
				raw = method(recurse=True)
			except Exception as e:
				# Only the read is guarded. A failure here is TouchDesigner
				# declining to answer, which is what skippedStreams means.
				log_message(
					f"Error reading {getter} from node {node_path}: {str(e)}",
					LogLevel.WARNING,
				)
				skipped.append({"stream": getter, "reason": str(e)})
				continue

			if raw is None:
				# Not the same as an empty blob: the stream gave no answer.
				skipped.append(
					{"stream": getter, "reason": f"OP.{getter}() returned None"}
				)
				continue

			if not raw:
				continue

			# Parsing is outside the guard above on purpose. Wrapping it would
			# file our own bug as a TouchDesigner stream failure - including
			# the KeyError below, whose entire point is to be loud about a
			# note kind with no home. It would also leave the entries and
			# notes already appended in the payload beside a claim that the
			# stream was never read.
			entries.extend(_parse_op_messages(raw, level, node, notes))
			targets = {
				_NOTE_LOOKUP_FAILED: lookup_failures,
				_NOTE_MISATTRIBUTED: fallback_owners,
				_NOTE_UNRESOLVED: unresolved,
			}
			for note_path, kind in notes:
				# KeyError rather than a default: a kind with no home would
				# otherwise be filed under whichever list the fallback picked
				# and read as a TouchDesigner fault.
				targets[kind].append({"path": note_path, "stream": getter})

		# Both sides name the level they take. A remainder filter would give a
		# level nobody planned for a silent home in whichever collection was
		# written second.
		errors = [e for e in entries if e["level"] == _LEVEL_ERROR]
		warnings = [e for e in entries if e["level"] == _LEVEL_WARNING]

		# `errors` stays error-only. A released MCP server reads it as errors
		# and renders every element under an "N error(s) found" heading, so
		# mixing warnings in would have it present them as errors to anyone who
		# updated the component without updating the server.
		# `incomplete` answers one question: did a stream go unread, leaving the
		# counts with no ceiling? Declined anchors are reported separately
		# because they are a different situation - the content is present, just
		# folded into a neighbouring entry - and a caller's next move differs.
		# The log only reaches TouchDesigner's textport, so an unread stream has
		# to be said here or a caller branching on hasErrors is told a project
		# nobody finished inspecting is clean.
		return success_result(
			{
				"nodePath": node.path,
				"nodeName": node.name,
				"opType": node.OPType,
				"errorCount": len(errors),
				"warningCount": len(warnings),
				"hasErrors": bool(errors),
				"hasWarnings": bool(warnings),
				"incomplete": bool(skipped),
				"skippedStreams": skipped,
				"unresolvedAnchors": unresolved,
				"lookupFailures": lookup_failures,
				"fallbackAttributions": fallback_owners,
				"errors": errors,
				"warnings": warnings,
			}
		)

	def get_nodes(
		self,
		parent_path: str,
		pattern: Optional[str] = None,
		include_properties: bool = False,
	) -> Result:
		"""Get nodes under the specified parent path, optionally filtered by pattern

		Args:
		    parent_path: Path to the parent node
		    pattern: Pattern to filter nodes by name (e.g. "text*" for all nodes starting with "text")
		    include_properties: Whether to include full node properties (default False for better performance)

		Returns:
		    Result: Success with list of nodes or error
		"""

		parent_node = td.op(parent_path)
		if parent_node is None or not parent_node.valid:
			return error_result(f"Parent node not found at path: {parent_path}")

		if pattern:
			log_message(
				f"Calling parent_node.findChildren(name='{pattern}')",
				LogLevel.DEBUG,
			)
			nodes = parent_node.findChildren(name=pattern)
		else:
			log_message("Calling parent_node.findChildren(depth=1)", LogLevel.DEBUG)
			nodes = parent_node.findChildren(depth=1)

		if include_properties:
			node_summaries = [self._get_node_summary(node) for node in nodes]
		else:
			node_summaries = [self._get_node_summary_light(node) for node in nodes]

		return success_result({"nodes": node_summaries})

	def create_node(
		self,
		parent_path: str,
		node_type: str,
		node_name: Optional[str] = None,
		parameters: Optional[dict[str, Any]] = None,
	) -> Result:
		"""Create a new node under the specified parent path"""

		parent_node = td.op(parent_path)
		if parent_node is None or not parent_node.valid:
			return error_result(
				f"Parent node not found at path: {parent_path}",
			)

		new_node = parent_node.create(node_type, node_name)

		if new_node is None or not new_node.valid:
			return error_result(
				f"Failed to create node of type {node_type} under {parent_path}"
			)

		if parameters and isinstance(parameters, dict):
			for prop_name, prop_value in parameters.items():
				try:
					if hasattr(new_node.par, prop_name):
						par = getattr(new_node.par, prop_name)
						if hasattr(par, "val"):
							par.val = prop_value
					elif hasattr(new_node, prop_name):
						prop = getattr(new_node, prop_name)
						if isinstance(prop, (int, float, str)):
							setattr(new_node, prop_name, prop_value)
				except Exception as e:
					log_message(
						f"Error setting parameter {prop_name} on new node: {str(e)}",
						LogLevel.WARNING,
					)

		self._align_new_node(parent_node, new_node, parameters)

		node_info = self._get_node_summary(new_node)
		return success_result({"result": node_info})

	def _align_new_node(self, parent_node, new_node, parameters=None) -> None:
		"""Position a freshly created node on a non-overlapping grid cell.

		Reads the current children of ``parent_node`` (excluding ``new_node``) and
		places ``new_node`` at the first free grid cell. Existing nodes are never
		moved. Failures here must not fail node creation, so they are logged only.

		If the caller supplied an explicit ``nodeX``/``nodeY`` via ``parameters``,
		that deliberate position is respected and auto-alignment is skipped.
		"""
		if parameters and ("nodeX" in parameters or "nodeY" in parameters):
			return
		try:
			existing = [
				(child.nodeX, child.nodeY, child.nodeWidth, child.nodeHeight)
				for child in parent_node.children
				if child.path != new_node.path
			]
			x, y = first_free_cell(existing, new_node.nodeWidth, new_node.nodeHeight)
			new_node.nodeX = x
			new_node.nodeY = y
		except Exception as e:
			log_message(
				f"Failed to align new node {new_node.path}: {str(e)}",
				LogLevel.WARNING,
			)

	def delete_node(self, node_path: str) -> Result:
		"""Delete the node at the specified path"""

		node = td.op(node_path)
		if node is None or not node.valid:
			return error_result(f"Node not found at path: {node_path}")

		node_info = self._get_node_summary(node)
		node.destroy()

		if td.op(node_path) is None:
			log_message(f"Node deleted successfully: {node_path}", LogLevel.DEBUG)
			return success_result({"deleted": True, "node": node_info})
		else:
			log_message(
				f"Failed to verify node deletion: {node_path}", LogLevel.WARNING
			)
			return error_result(f"Failed to delete node: {node_path}")

	def exec_node_method(
		self, node_path: str, method: str, args: list, kwargs: dict
	) -> Result:
		"""Call method on the specified node"""

		node = td.op(node_path)
		if node is None or not node.valid:
			return error_result(f"Node not found at path: {node_path}")

		if not hasattr(node, method):
			return error_result(f"Method {method} not found on node {node_path}")

		method = getattr(node, method)
		if not callable(method):
			return error_result(f"{method} is not a callable method")

		result = method(*args, **kwargs)

		log_message(
			f"Method: {method}, args: {args}, kwargs: {kwargs}, result: {result}",
			LogLevel.DEBUG,
		)
		log_message(
			f"Method execution complete, result type: {type(result).__name__}",
			LogLevel.DEBUG,
		)

		processed_result = self._process_method_result(result)

		return success_result({"result": processed_result})

	def exec_python_script(self, script: str) -> Result:
		"""Execute a Python script directly in TouchDesigner

		Args:
		    script (str): The Python script to execute

		Returns:
		    Result: Success result with execution output or error result with message
		"""

		no_result_sentinel = object()
		local_vars = {
			"op": td.op,
			"ops": td.ops,
			"me": td.op.me if hasattr(td, "op") and hasattr(td.op, "me") else None,
			"parent": (td.op("..").path if hasattr(td, "op") and td.op("..") else None),
			"project": td.project if hasattr(td, "project") else None,
			"td": td,
			"result": no_result_sentinel,
		}
		# Mirror the Textport/DAT execution environment: TouchDesigner keeps
		# all of its globals (absTime, OP type names such as noiseTOP, ParMode,
		# tdu, ui, ...) in the __main__ module namespace. Merging them makes
		# scripts behave the same as Python written inside a DAT or the
		# Textport, so code can be copy-pasted between both contexts.
		td_globals = {
			name: value
			for name, value in vars(sys.modules["__main__"]).items()
			if not name.startswith("_")
		}
		namespace = dict(globals())
		namespace.update(td_globals)
		namespace.update(local_vars)

		stdout_capture = io.StringIO()
		stderr_capture = io.StringIO()

		with (
			contextlib.redirect_stdout(stdout_capture),
			contextlib.redirect_stderr(stderr_capture),
		):
			if "\n" not in script and ";" not in script:
				try:
					result = eval(script, namespace, namespace)
					namespace["result"] = result
					processed_result = self._process_method_result(result)

					log_message(
						f"Script evaluated. Raw result: {repr(result)}",
						LogLevel.DEBUG,
					)

					stdout_val = stdout_capture.getvalue()
					stderr_val = stderr_capture.getvalue()

					return success_result(
						{
							"result": processed_result,
							"stdout": stdout_val,
							"stderr": stderr_val,
						}
					)
				except SyntaxError:
					pass

			try:
				exec(script, namespace, namespace)

				if namespace.get("result") is no_result_sentinel:
					lines = script.strip().split("\n")
					if lines:
						last_expr = lines[-1].strip()
						if last_expr and not last_expr.startswith(
							(
								"import",
								"from",
								"#",
								"if",
								"def",
								"class",
								"for",
								"while",
							)
						):
							try:
								namespace["result"] = eval(
									last_expr, namespace, namespace
								)
								log_message(
									f"Extracted result from last line: {last_expr}",
									LogLevel.DEBUG,
								)
							except Exception:
								pass

				result = namespace.get("result")
				if result is no_result_sentinel:
					result = None
				processed_result = self._process_method_result(result)

				stdout_val = stdout_capture.getvalue()
				stderr_val = stderr_capture.getvalue()

				return success_result(
					{
						"result": processed_result,
						"stdout": stdout_val,
						"stderr": stderr_val,
					}
				)
			except Exception as exec_error:
				raise Exception(
					f"Script execution failed: {exec_error}\n{traceback.format_exc()}"
				) from exec_error

	def update_node(self, node_path: str, properties: dict[str, Any]) -> Result:
		"""Update properties of the node at the specified path"""

		node = td.op(node_path)

		if node is None or not node.valid:
			return error_result(f"Node not found at path: {node_path}")

		updated_properties = []
		failed_properties = []

		for prop_name, prop_value in properties.items():
			try:
				if hasattr(node.par, prop_name):
					par = getattr(node.par, prop_name)
					if hasattr(par, "val"):
						par.val = prop_value
						updated_properties.append(prop_name)
					else:
						failed_properties.append(
							{
								"name": prop_name,
								"reason": "Not a settable parameter",
							}
						)
				elif hasattr(node, prop_name):
					prop = getattr(node, prop_name)
					if isinstance(prop, (int, float, str)):
						setattr(node, prop_name, prop_value)
						updated_properties.append(prop_name)
					else:
						failed_properties.append(
							{
								"name": prop_name,
								"reason": "Not a settable property",
							}
						)
				else:
					failed_properties.append(
						{"name": prop_name, "reason": "Property not found on node"}
					)
			except Exception as e:
				log_message(
					f"Error updating property {prop_name}: {str(e)}", LogLevel.ERROR
				)
				failed_properties.append({"name": prop_name, "reason": str(e)})

		result = {
			"path": node_path,
			"updated": updated_properties,
			"failed": failed_properties,
			"message": f"Updated {len(updated_properties)} properties",
		}

		if updated_properties:
			log_message(
				f"Successfully updated properties: {updated_properties}",
				LogLevel.DEBUG,
			)
			return success_result(result)
		else:
			log_message(
				f"No properties were updated. Failed: {failed_properties}",
				LogLevel.WARNING,
			)
			if failed_properties:
				return error_result("Failed to update any properties")
			else:
				return error_result("No matching properties to update")

	def _get_node_properties(self, node):
		params_dict = {}
		for par in node.pars("*"):
			try:
				value = par.eval()
				if isinstance(value, td.OP):
					value = value.path
				params_dict[par.name] = value
			except Exception as e:
				log_message(
					f"Error evaluating parameter {par.name}: {str(e)}", LogLevel.DEBUG
				)
				params_dict[par.name] = f"<Error: {str(e)}>"

		return params_dict

	def _get_node_summary_light(self, node) -> dict:
		"""Get lightweight information about a node (without properties for better performance)"""
		try:
			node_info = {
				"id": node.id,
				"name": node.name,
				"path": node.path,
				"opType": node.OPType,
				"properties": {},  # Empty properties for lightweight response
			}

			return node_info
		except Exception as e:
			log_message(
				f"Error collecting node information: {str(e)}", LogLevel.WARNING
			)
			return {"name": node.name if hasattr(node, "name") else "unknown"}

	def _get_node_summary(self, node) -> dict:
		"""Get detailed information about a node"""
		try:
			node_info = {
				"id": node.id,
				"name": node.name,
				"path": node.path,
				"opType": node.OPType,
				"properties": self._get_node_properties(node),
			}

			return node_info
		except Exception as e:
			log_message(
				f"Error collecting node information: {str(e)}", LogLevel.WARNING
			)
			return {"name": node.name if hasattr(node, "name") else "unknown"}

	def _resolve_help_target(self, module_name: str) -> Optional[Any]:
		"""Locate a module/class for help() lookup."""
		if not module_name:
			return None

		target_name = module_name.strip()
		if not target_name:
			return None

		# Handle dotted names like "td.noiseCHOP" or "td.tdu.SomeClass"
		def resolve_dotted_name(name: str) -> Optional[Any]:
			parts = name.split(".")
			# Only allow access starting from td or tdu
			if parts[0] == "td":
				obj: Any = td
			elif parts[0] == "tdu" and hasattr(td, "tdu"):
				obj = td.tdu
			else:
				return None
			for part in parts[1:]:
				# Validate part is non-empty and a valid identifier
				if not part or not part.isidentifier():
					return None
				if not hasattr(obj, part):
					return None
				obj = getattr(obj, part)
			return obj

		# Try resolving as a dotted name
		if "." in target_name:
			resolved = resolve_dotted_name(target_name)
			if resolved is not None:
				return resolved

		# Try direct attribute of td
		if hasattr(td, target_name):
			return getattr(td, target_name)

		# Try importing as a module
		imported = self._import_module_safely(target_name)
		if imported:
			return imported

		# Try importing with td. prefix
		if not target_name.startswith("td."):
			imported = self._import_module_safely(f"td.{target_name}")
			if imported:
				return imported

		return None

	def _import_module_safely(self, target: str) -> Optional[Any]:
		try:
			return importlib.import_module(target)
		except (ImportError, ModuleNotFoundError) as e:
			log_message(f"Failed to import module '{target}': {str(e)}", LogLevel.DEBUG)
			return None
		except Exception as e:
			log_message(
				f"Unexpected error importing module '{target}': {str(e)}",
				LogLevel.WARNING,
			)
			return None

	def _normalize_help_text(self, text: str) -> str:
		"""Normalize help text by removing terminal control sequences.

		The pydoc module uses backspace characters (\b) for text formatting
		(e.g., bold text is written as "c\bc" to print 'c' over 'c').
		This method removes those backspace sequences to produce clean text.
		If a backspace is encountered at the start (empty buffer), it is safely
		ignored as there is no character to remove.
		"""
		if not text:
			return text
		buffer: list[str] = []
		for char in text:
			if char == "\b":
				if buffer:
					buffer.pop()
				continue
			buffer.append(char)
		return "".join(buffer)

	def _process_method_result(self, result: Any) -> Any:
		"""
		Process method result based on its type to make it JSON serializable

		Args:
		    result: Result value to process

		Returns:
		    Processed value that can be serialized to JSON
		"""
		if isinstance(result, (int, float, str, bool)) or result is None:
			return result

		if isinstance(result, (list, tuple)):
			processed_list = []
			for item in result:
				processed_list.append(self._process_item(item))
			return processed_list

		if isinstance(result, dict):
			processed_dict = {}
			for key, value in result.items():
				processed_dict[key] = self._process_item(value)
			return processed_dict

		try:
			result_dict = {}
			for item in result:
				processed = self._process_item(item)
				if hasattr(item, "name"):
					result_dict[item.name] = processed
				else:
					result_dict[f"item_{len(result_dict)}"] = processed
			return result_dict
		except TypeError:
			return self._process_item(result)

	def _process_item(self, item: Any) -> Any:
		"""
		Process individual item from a result for JSON serialization

		Args:
		    item: Item to process

		Returns:
		    Processed item that can be serialized to JSON
		"""
		if isinstance(item, (int, float, str, bool)) or item is None:
			return item

		if hasattr(td, "op") and callable(td.op):
			node = td.op(item)
			if node and hasattr(node, "valid") and node.valid:
				return self._get_node_summary(node)

		if not callable(item) and hasattr(item, "name"):
			return str(item)

		if hasattr(item, "eval") and callable(item.eval):
			try:
				value = item.eval()
				if hasattr(td, "OP") and isinstance(value, td.OP):
					return value.path
				return value
			except Exception as e:
				log_message(
					f"Error evaluating parameter {item.name if hasattr(item, 'name') else 'unknown'}: {str(e)}",
					LogLevel.DEBUG,
				)
				return f"<Error: {str(e)}>"

		try:
			return safe_serialize(item)
		except Exception:
			return str(item)


# TouchDesigner prefixes each message with the owning operator path when
# errors()/warnings() are called with recurse=True. The spacing after the colon
# differs between the two streams ("path:  Error:" vs "path:Warning:"), so the
# pattern stays loose about it.
# A line ending is CRLF, CR or LF, and nothing else. See _parse_op_messages.
_LINE_ENDING = re.compile(r"\r\n|\r|\n")

_MESSAGE_ANCHOR = re.compile(r"^(/\S*?):\s*(Error|Warning):\s*(.*)$")

# TouchDesigner closes a message with the owning operator in parentheses.
_TRAILING_PATH = re.compile(r"\((/[^()\s]*)\)\s*$")


# Characters TouchDesigner rejects in an operator name. Every one of these was
# probed against a live build: create("constantTOP", "a<c>b") raises "Illegal
# node name specified" for all 32, and no printable ASCII outside them is
# refused.
#
# Written as a denial rather than a permission because the two ways this rule
# can be wrong cost very different amounts: calling an operator a file drops a
# real failure silently, while calling a file an operator costs one visible
# entry. For printable ASCII that choice is cosmetic - the set is exactly the
# complement of [A-Za-z0-9_] - and the real gain is everything outside it.
# Non-ASCII names are rejected by TouchDesigner too, but are left to the lookup
# rather than encoded here, so a build that starts accepting them fails
# visibly instead of silently.
#
# A spelling decline says nothing in the payload, as do the out-of-subtree and
# reports-nothing declines; only an unresolvable path is recorded. So adding a
# character here needs the same live evidence these have: get it wrong and a
# real failure folds into its neighbour with nothing to show for it. The
# probe that produced this set is tests/python/test_op_name_rule.py.
_ILLEGAL_IN_OP_NAME = set(". -*?[]{}()/\\:;,'\"`!@#$%^&|<>~=+")


# Outcomes of looking a path up, kept distinct because they call for opposite
# treatment: a lookup that failed says nothing about the path.
class Note(NamedTuple):
	"""Something about a path the caller should hear about.

	Named rather than a bare pair because it crosses four functions, and a
	positional tuple read by index is where the wrong half gets used.
	"""

	path: str
	kind: str


_LEVEL_ERROR = "error"
_LEVEL_WARNING = "warning"

_NOTE_UNRESOLVED = "unresolved"
_NOTE_LOOKUP_FAILED = "lookup_failed"
_NOTE_MISATTRIBUTED = "misattributed"

# Prefixed so a resolve outcome and a note kind cannot alias: both had a
# "lookup_failed" member, which compares equal for that one value and diverges
# for the others - the single case the targets[kind] KeyError cannot catch,
# because that key does have a home.
_FOUND = "resolve:found"
_MISSING = "resolve:missing"
_LOOKUP_FAILED = "resolve:lookup_failed"


def _looks_like_op_path(path: str) -> bool:
	"""Whether path could name an operator at all, by spelling alone"""

	parts = [part for part in path.split("/") if part]
	if not parts:
		return False
	return all(part and not (set(part) & _ILLEGAL_IN_OP_NAME) for part in parts)


def _resolve_op(path: str):
	"""Look the path up, returning (op_or_None, outcome)

	`path` comes out of message text rather than from TouchDesigner, so the
	lookup is treated as fallible. No input has been observed to make td.op()
	raise - malformed globs such as "/project1/[" return None on
	099.2025.33230 - so _LOOKUP_FAILED is defensive rather than a response to
	a known trigger. It earns its place by what it means: a raise would say
	the lookup failed, not that the operator is absent, and reading one as
	the other is the mistake this module keeps having to correct.

	Only an exact match counts. td.op("/project1/probe/*") answers with
	whichever descendant it matched first, so a pattern reaching here would
	otherwise resolve and hand an entry to an operator that never failed. The
	spelling rule keeps metacharacters out, but this holds the property
	without depending on it.
	"""

	try:
		owner = td.op(path)
	except Exception:
		return None, _LOOKUP_FAILED
	if owner is None or not owner.valid:
		return None, _MISSING
	if owner.path == path:
		return owner, _FOUND
	# A near miss: something real is there, it is just not what was named.
	# It is handed back rather than dropped so a caller can say which
	# operator answered without looking the path up a second time. Callers
	# must branch on the outcome, not on the operator being None.
	return owner, _MISSING


def _owner_reports_anything(owner) -> bool:
	"""Whether this operator has a message of its own on either stream

	Evidence separating a real anchor from a path quoted inside somebody's
	traceback: measured on 099.2025.33230, a working operator returns "" from
	errors() and warnings() while a failing one returns its message, and
	TouchDesigner writes a prefixed line only for the latter.

	Both streams are asked, not the one being parsed. The anchor word and the
	blob it arrives in are treated as independent everywhere else here - the
	level comes from the stream, precisely because the word cannot be trusted
	to agree - so probing only the matching stream would decline a genuine
	anchor whose operator failed on the other one, folding its lines into the
	entry above with nothing recorded. That is the failure this module exists
	to remove, and it would have been introduced by the check meant to guard
	against a different one.

	It does not separate them when the quoted operator has a message of its
	own; that residue is accepted.
	"""

	asked = 0
	for name in ("errors", "warnings"):
		getter = getattr(owner, name, None)
		if not callable(getter):
			# An older build may not expose this stream. Skip it rather than
			# abstaining outright: returning here on the first one would make
			# the whole check inoperative on a build with errors() and no
			# warnings(), and nothing downstream would say it had not run.
			continue
		try:
			said = getter(recurse=False) or ""
		except Exception:
			# The lookup failed, which says nothing about the operator, so
			# this evidence is unavailable and the other checks stand alone.
			return True
		asked += 1
		if said.strip():
			return True

	# Only when no stream could be asked at all is the evidence unavailable.
	return asked == 0


def _classify_anchor(path: str, queried_node):
	"""Decide what an anchor-shaped path is, resolving it at most once

	Returns (accepted, owner, note), where note is either None or the Note the
	caller should report. Pairing it here keeps a caller from attaching the
	wrong path to a kind.

	Four things have to hold for an anchor to be accepted, and each rules out
	a different way for message text to be mistaken for the start of a new
	message:

	- inside the queried subtree. Measured on 099.2025.33230, with operators
	  referencing ops outside the queried subtree by parameter and by
	  expression, every anchor recurse=True emitted was the owning operator
	  and referenced ops appeared only in message bodies - so an outside path
	  is quoted text, declined without comment. That is an observation about
	  one build, not a guarantee; if it stops holding, the symptom is a real
	  failure folding into its neighbour silently;
	- spelled like an operator, so "/project1/probe/data.csv" raised from
	  somebody's callback is ruled out before TouchDesigner is asked;
	- known to TouchDesigner, or unknown only because the lookup itself
	  failed;
	- actually carrying a message of its own, on either stream. A traceback
	  that quotes a healthy sibling, "/project1/probe/shared: Error: ...",
	  clears every test above it - the path is in the subtree, spelled like an
	  operator, and resolves - so resolution alone cannot tell a real anchor
	  from quoted text.

	A path that spells like an operator and resolves to nothing is most likely
	one deleted since its message was recorded. Declining it folds its lines
	into the entry above, which under-counts, so it is reported rather than
	dropped.

	A lookup that raised is treated as weaker evidence than one that answered
	"nothing there", which is deliberate rather than an oversight. An answer of
	None is TouchDesigner reporting on the path; a raise is TouchDesigner
	failing to, and says nothing about it. Both outcomes are reported, so
	neither is silent - they differ only in whether the anchor still stands.
	"""

	root = queried_node.path
	if path == root:
		return True, queried_node, None

	prefix = root if root.endswith("/") else f"{root}/"
	if not path.startswith(prefix):
		return False, None, None

	if not _looks_like_op_path(path):
		return False, None, None

	owner, outcome = _resolve_op(path)
	if outcome == _MISSING:
		return False, None, Note(path, _NOTE_UNRESOLVED)
	if outcome == _LOOKUP_FAILED:
		return True, None, Note(path, _NOTE_LOOKUP_FAILED)
	if not _owner_reports_anything(owner):
		# It is a real operator and it is fine, so the line is quoting it.
		# Declining keeps those lines with the entry they belong to, and
		# nothing is under-counted, so there is nothing to report.
		return False, None, None
	return True, owner, None


def _split_anchor(line: str, queried_node):
	"""Classify a line as the start of a new message, or not

	Returns (anchor, note). `anchor` is (path, message, owner) when the line
	starts one, otherwise None. `note` is a Note when there is something worth
	telling the caller.
	"""

	match = _MESSAGE_ANCHOR.match(line)
	if not match:
		return None, None

	path = match.group(1)
	accepted, owner, note = _classify_anchor(path, queried_node)
	if not accepted:
		return None, note
	# The anchor word is deliberately not returned. Which stream produced the
	# line decides the level, and a value that must be ignored is one an
	# unused-variable cleanup would start using.
	return (path, match.group(3), owner), note


def _owner_from_trailing_path(message: str, queried_node):
	"""Recover the owner from a trailing "(<path>)"

	Returns (path_or_None, owner_or_None, note). Output captured with
	recurse=False carries no "<path>:" prefix but still names the owner at the
	end of its last line, and preferring that over the queried node keeps
	attribution right for callers that pass such a blob. A path declined here
	is reported the same way a declined anchor is: falling back to the queried
	node is a misattribution either way.
	"""

	match = _TRAILING_PATH.search(message)
	if not match:
		return None, None, None

	path = match.group(1)
	accepted, owner, note = _classify_anchor(path, queried_node)
	if accepted:
		return path, owner, note

	# Declining here has the opposite consequence to declining an anchor.
	# Nothing folds: the entry stands on its own and is counted once. What
	# goes wrong is the owner, which falls back to the queried node while
	# every field on the entry still looks resolved. Reporting that as an
	# unresolved anchor would send a caller looking for a merged failure that
	# does not exist.
	if note and note.kind == _NOTE_UNRESOLVED:
		note = Note(note.path, _NOTE_MISATTRIBUTED)
	return None, None, note


def _strip_redundant_path_suffix(message: str, path: str) -> str:
	"""Drop a trailing "(<path>)" that merely repeats the owning operator

	A suffix naming a *different* operator is left alone, since that one
	carries information.
	"""

	suffix = f"({path})"
	if message.endswith(suffix):
		return message[: -len(suffix)].rstrip()
	return message


def _parse_op_messages(
	raw: str, level: str, queried_node, notes: Optional[list] = None
) -> list:
	"""Parse one errors()/warnings() blob into structured entries

	A single failure can span several lines - a Python traceback raised from a
	parameter expression, for example. Lines that do not start a new message
	belong to the entry that preceded them, so splitting on newlines alone
	would report one failure as several and attribute most of them wrongly.

	`notes` collects Note entries for paths the caller should hear about: an
	anchor declined because it resolved to nothing, the same on a trailing
	path, or one accepted despite the lookup failing. Each path is listed once
	per call, and get_node_errors calls this once per stream, so a path seen
	on both streams can appear under both.
	"""

	def note(entry):
		"""Record a path once, keeping the first outcome seen for it

		A flaky td.op can answer differently on two lines naming the same
		path. Within one stream the lists are a disjoint categorisation, so a
		path must not turn up in two of them; across streams it can, carrying
		its own stream tag.
		"""

		if entry is None or notes is None:
			return
		if any(seen.path == entry.path for seen in notes):
			return
		notes.append(entry)

	groups = []
	current = None

	# Exactly the three line endings, not str.splitlines(). The endings a blob
	# arrives with are not guaranteed, so a CRLF one must not leave a trailing
	# carriage return on every interior line of a multi-line entry — but
	# splitlines() also breaks on \v, \f, \x1c-\x1e, \x85, U+2028 and U+2029,
	# which are payload characters here, not structure. One inside a message
	# rewrites the text a JSON/YAML client is handed, and if what follows it
	# happens to match the anchor above, one failure is reported as two and the
	# second is attributed to an operator that never failed. That misattribution
	# is the thing this parser exists to prevent, so the split names its
	# separators instead of inheriting Python's list.
	for line in _LINE_ENDING.split(raw):
		if not line.strip():
			continue

		anchor, declined = _split_anchor(line, queried_node)
		note(declined)

		if anchor:
			if current:
				groups.append(current)
			path, message, owner = anchor
			# The anchor word only marks where an entry begins. Which stream
			# produced the line decides the level, so an "errors" blob cannot
			# report itself as warnings and leave hasErrors false.
			current = {
				"anchored": True,
				"level": level,
				"lines": [message],
				"owner": owner,
				"path": path,
			}
		elif current:
			current["lines"].append(line)
		else:
			# No prefix at all: recurse=False style output, or an unexpected
			# shape. Attribute it to the node that was queried.
			current = {
				"anchored": False,
				"level": level,
				"lines": [line.strip()],
				"owner": queried_node,
				"path": queried_node.path,
			}

	if current:
		groups.append(current)

	entries = []
	for group in groups:
		message = "\n".join(group["lines"]).strip()
		path = group["path"]
		owner = group["owner"]

		if not group["anchored"]:
			recovered, recovered_owner, declined = _owner_from_trailing_path(
				message, queried_node
			)
			note(declined)
			if recovered:
				path, owner = recovered, recovered_owner

		message = _strip_redundant_path_suffix(message, path)

		# The name is in the path whether or not the lookup answered, so it is
		# not withheld when only the type is unknown. An empty opType means
		# "not determined"; lookupFailures says when that is why.
		entries.append(
			{
				"nodePath": path,
				"nodeName": owner.name if owner else path.rsplit("/", 1)[-1],
				"opType": owner.OPType if owner else "",
				"level": group["level"],
				"message": message,
			}
		)

	return entries


api_service = TouchDesignerApiService()
