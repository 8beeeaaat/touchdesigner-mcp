"""
TouchDesigner MCP Web Server API Service Implementation
Provides API functionality related to TouchDesigner
"""

import contextlib
import inspect
import io
from typing import Any, Dict, List, Optional, Protocol

from utils.logging import log_message
from utils.result import error_result, success_result
from utils.serialization import safe_serialize
from utils.types import LogLevel, Result

import td


class IApiService(Protocol):
    """API service interface"""

    def get_td_info(self) -> Result: ...
    def get_td_python_classes(self) -> Result: ...
    def get_td_python_class_details(self, class_name: str) -> Result: ...
    def get_node_detail(self, node_path: str) -> Result: ...
    def update_node(self, node_path: str, properties: Dict[str, Any]) -> Result: ...
    def exec_node_method(
        self, node_path: str, method: str, args: List, kwargs: Dict
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

    def get_nodes(self, parent_path: str, pattern: Optional[str] = None, include_properties: bool = False) -> Result:
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
        parameters: Optional[Dict[str, Any]] = None,
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

        node_info = self._get_node_summary(new_node)
        return success_result({"result": node_info})

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
        self, node_path: str, method: str, args: List, kwargs: Dict
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

        local_vars = {
            "op": td.op,
            "ops": td.ops,
            "me": td.op.me if hasattr(td, "op") and hasattr(td.op, "me") else None,
            "parent": (td.op("..").path if hasattr(td, "op") and td.op("..") else None),
            "project": td.project if hasattr(td, "project") else None,
            "td": td,
            "result": None,
        }

        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(
            stderr_capture
        ):
            if "\n" not in script and ";" not in script:
                try:
                    result = eval(script, globals(), local_vars)
                    local_vars["result"] = result
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
                exec(script, globals(), local_vars)

                if "result" not in local_vars:
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
                                local_vars["result"] = eval(
                                    last_expr, globals(), local_vars
                                )
                                log_message(
                                    f"Extracted result from last line: {last_expr}",
                                    LogLevel.DEBUG,
                                )
                            except Exception:
                                pass

                result = local_vars.get("result", None)
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
                raise Exception(f"Script execution failed: {str(exec_error)}")

    def update_node(self, node_path: str, properties: Dict[str, Any]) -> Result:
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

    def _get_node_summary_light(self, node) -> Dict:
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

    def _get_node_summary(self, node) -> Dict:
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


api_service = TouchDesignerApiService()
