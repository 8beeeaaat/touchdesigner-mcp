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
from typing import Any, Optional, Protocol

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
			raise error_result(f"Class or module not found: {class_name}")

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
			raise error_result(f"Node not found at path: {node_path}")

		node_info = self._get_node_summary(node)
		return success_result(node_info)

	def get_node_errors(self, node_path: str) -> Result:
		"""Collect error and warning messages for the specified node and its children

		TouchDesigner reports many of the most common failures (missing files,
		dangling operator references, shader compile failures) as warnings
		rather than errors, so both streams are collected. Each entry carries a
		``level`` so callers can tell them apart.
		"""

		node = td.op(node_path)

		if node is None or not node.valid:
			return error_result(f"Node not found at path: {node_path}")

		entries = []
		skipped = []
		unresolved = []
		for level, getter in (("error", "errors"), ("warning", "warnings")):
			method = getattr(node, getter, None)
			if not callable(method):
				# An older TouchDesigner build may not expose this stream.
				skipped.append(
					{"stream": getter, "reason": f"OP.{getter} is not available"}
				)
				continue
			try:
				raw = method(recurse=True)
				if raw is None:
					# Not the same as an empty blob: the stream gave no answer.
					skipped.append(
						{
							"stream": getter,
							"reason": f"OP.{getter}() returned None",
						}
					)
					continue
				if raw:
					# Parsing stays inside the try. A stream we cannot read is
					# a stream to record, not a reason to lose the other one.
					entries.extend(
						_parse_op_messages(raw, level, node, unresolved)
					)
			except Exception as e:
				log_message(
					f"Error reading {getter} from node {node_path}: {str(e)}",
					LogLevel.WARNING,
				)
				skipped.append({"stream": getter, "reason": str(e)})
				continue

		error_count = sum(1 for entry in entries if entry["level"] == "error")

		# A stream we could not read is not a stream with nothing in it. Say so
		# in the payload: the log only reaches TouchDesigner's textport, and a
		# caller branching on hasErrors would otherwise be told a project it
		# never finished inspecting is clean.
		return success_result(
			{
				"nodePath": node.path,
				"nodeName": node.name,
				"opType": node.OPType,
				"errorCount": error_count,
				"warningCount": len(entries) - error_count,
				"hasErrors": error_count > 0,
				"hasWarnings": len(entries) > error_count,
				"incomplete": bool(skipped or unresolved),
				"skippedStreams": skipped,
				"unresolvedAnchors": unresolved,
				"errors": entries,
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
			raise error_result(f"Parent node not found at path: {parent_path}")

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
			raise error_result(f"Node not found at path: {node_path}")

		if not hasattr(node, method):
			raise error_result(f"Method {method} not found on node {node_path}")

		method = getattr(node, method)
		if not callable(method):
			raise error_result(f"{method} is not a callable method")

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
			raise error_result(f"Node not found at path: {node_path}")

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
				raise error_result("Failed to update any properties")
			else:
				raise error_result("No matching properties to update")

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
_MESSAGE_ANCHOR = re.compile(r"^(/\S*?):\s*(Error|Warning):\s*(.*)$")

# TouchDesigner closes a message with the owning operator in parentheses.
_TRAILING_PATH = re.compile(r"\((/[^()\s]*)\)\s*$")


def _resolve_op(path: str):
	"""Look up path, returning None instead of raising

	`path` comes out of message text, and td.op() does glob matching, so a
	stray bracket can raise rather than return None. One odd line must not
	discard every entry parsed before it.
	"""

	try:
		owner = td.op(path)
	except Exception:
		return None
	return owner if owner is not None and owner.valid else None


def _is_owner_path(path: str, queried_node) -> bool:
	"""Whether path names a real operator inside the inspected subtree

	Both halves are load-bearing. Message text can quote a path that resolves
	to a real operator elsewhere in the project, and it can quote one that
	sits under the queried node but is a file rather than an operator - a
	callback raising ValueError("/project1/probe/data.csv: Error: bad row")
	produces exactly that. Either alone lets a line of someone's traceback
	become an entry for an operator that never failed, which inflates the
	counts and tears the rest of the traceback off the error it belongs to.

	The cost is an operator destroyed between the message being recorded and
	the report being read: its lines merge into the preceding entry rather
	than standing alone. That is the better trade against inventing one.
	"""

	root = queried_node.path
	if path == root:
		return True

	prefix = root if root.endswith("/") else f"{root}/"
	if not path.startswith(prefix):
		return False

	return _resolve_op(path) is not None


def _owner_from_trailing_path(message: str, queried_node):
	"""Recover the owning operator from a trailing "(<path>)", or None

	Output captured with recurse=False carries no "<path>:" prefix but still
	names the owner at the end of its last line. Preferring that over the
	queried node keeps attribution right for callers that pass such a blob.
	"""

	match = _TRAILING_PATH.search(message)
	if match and _is_owner_path(match.group(1), queried_node):
		return match.group(1)
	return None


def _split_anchor(line: str, queried_node):
	"""Return (path, level, message) if line starts a new message, else None"""

	match = _MESSAGE_ANCHOR.match(line)
	if match and _is_owner_path(match.group(1), queried_node):
		return match.group(1), match.group(2).lower(), match.group(3)

	return None


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
	raw: str, level: str, queried_node, unresolved: Optional[list] = None
) -> list:
	"""Parse one errors()/warnings() blob into structured entries

	A single failure can span several lines - a Python traceback raised from a
	parameter expression, for example. Lines that do not start a new message
	belong to the entry that preceded them, so splitting on newlines alone
	would report one failure as several and attribute most of them wrongly.
	"""

	groups = []
	current = None

	for line in raw.split("\n"):
		if not line.strip():
			continue

		anchor = _split_anchor(line, queried_node)
		if anchor is None and unresolved is not None:
			# The line is shaped like a new message but its path does not name
			# an operator we can see - a deleted one, or a file path quoted in
			# someone's traceback. We cannot tell which from the string, so the
			# line is kept with the entry above it and the ambiguity is
			# reported rather than silently decided.
			declined = _MESSAGE_ANCHOR.match(line)
			if declined and declined.group(1) not in unresolved:
				unresolved.append(declined.group(1))

		if anchor:
			if current:
				groups.append(current)
			path, _anchor_level, message = anchor
			# The anchor word only marks where an entry begins. Which stream
			# produced the line decides the level, so an "errors" blob cannot
			# report itself as warnings and leave hasErrors false.
			current = {
				"anchored": True,
				"level": level,
				"lines": [message],
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
				"path": queried_node.path,
			}

	if current:
		groups.append(current)

	entries = []
	for group in groups:
		message = "\n".join(group["lines"]).strip()
		path = group["path"]
		if not group["anchored"]:
			path = _owner_from_trailing_path(message, queried_node) or path
		message = _strip_redundant_path_suffix(message, path)

		owner = _resolve_op(path)
		entries.append(
			{
				"nodePath": owner.path if owner else path,
				"nodeName": owner.name if owner else "",
				"opType": owner.OPType if owner else "",
				"level": group["level"],
				"message": message,
			}
		)

	return entries


api_service = TouchDesignerApiService()
