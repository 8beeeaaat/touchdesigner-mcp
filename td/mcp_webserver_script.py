import json
import os
import sys
import traceback
from typing import Any, Callable, Dict, List, Optional, Union

import td

# Import TouchDesigner modules
try:
    # Import utility modules
    common_module = op("utils_common").module if op("utils_common") else None
    router_module = op("utils_router").module if op("utils_router") else None
    json_module = op("utils_json").module if op("utils_json") else None

    # Common module available
    if common_module:
        # Import necessary functions and classes from common module
        Result = common_module.Result
        ILogger = common_module.ILogger
        LogLevel = common_module.LogLevel
        IRequestHandler = common_module.IRequestHandler
        BaseRequestHandler = common_module.BaseRequestHandler
        execute_with_result = common_module.execute_with_result
        create_error_response = common_module.create_error_response
        # Use imported create_error_response if common_module is available
        # Already imported directly above
        safe_serialize = common_module.safe_serialize
        get_request_path = common_module.get_request_path

        # Import logger
        logger = common_module.SimpleLogger()
        common_available = True
        print("[INFO] Common module loaded successfully")
    else:
        common_available = False
        print("[WARNING] Common module not found")

    # JSON module available
    if json_module:
        # Import necessary functions from JSON module
        parse_json_params = json_module.parse_json_params
        json_available = True
        print("[INFO] JSON module loaded successfully")
    else:
        json_available = False
        print("[WARNING] JSON module not found")

    # Router module available
    if router_module:
        # Import necessary functions and classes from router module
        router = router_module.router
        Router = router_module.Router
        FunctionHandlerAdapter = router_module.FunctionHandlerAdapter
        router_available = True
        print("[INFO] Router module loaded successfully")
    else:
        router_available = False
        print("[WARNING] Router module not found")

except ImportError:
    print(f"[ERROR] Failed to load modules")

except Exception as e:
    print(f"[ERROR] Failed to load modules: {e}")
    traceback.print_exc()


# Wrapper class for TouchDesigner OP access
class TDOperations:
    def get_node(self, path):
        return op(path)

    def create_node(self, parent_path, node_class, name):
        parent = self.get_node(parent_path)
        return parent.create(node_class, name)

    def get_parent(self):
        return parent()


# Dependency injection
td_ops = TDOperations()


def log_message(message, level="INFO"):
    if hasattr(logger, "log"):
        if isinstance(level, str):
            level_upper = level.upper()
            if level_upper == "DEBUG":
                logger.debug(message)
            elif level_upper == "WARNING":
                logger.warning(message)
            elif level_upper == "ERROR":
                logger.error(message)
            else:
                logger.info(message)
        else:
            logger.log(message, level)
    else:
        print(f"[{level}] {message}")


# Set up logger if router is available
if router_available:
    router.logger = log_message


# Node type utilities
def get_node_type_class(node_family, node_type):
    type = node_type.lower() + node_family
    # Try to get TouchDesigner op class
    try:
        if node_family:
            op_class = getattr(op, type)
            return op_class
        else:
            raise ValueError(f"Unknown node family: {node_family}")
    except AttributeError:
        # Try eval as fallback
        try:
            op_class = eval(type)
            return op_class
        except:
            raise ValueError(f"Cannot find node type class for: {type}")


# Node management functions


def createNode(nodeName, family, nodeType, parameters):
    try:
        # Get node class and create node
        node_class = get_node_type_class(family, nodeType)
        new_node = op(parent().parent()).create(node_class, nodeName)
        new_node.viewer = True
        # Process parameters
        if parameters:
            # Use common utilities
            result = parse_json_params(parameters)
            if result.success:
                params_dict = result.data
                logger.info(
                    f"Parameters parsed successfully: {len(params_dict)} parameters"
                )

                # Set parameters on node
                for k, v in params_dict.items():
                    try:
                        setattr(new_node.par, k, v)
                        logger.info(f"Set parameter {k} = {v}")
                    except Exception as param_err:
                        logger.error(f"Error setting parameter {k}: {param_err}")
            else:
                logger.error(f"Parameter parsing failed: {result.error}")

        return new_node
    except Exception as e:
        logger.error(f"Error creating node: {e}", exception=e)
        raise


def updateNode(node, parameters, connection=None):
    log_message(f"Updating node: {node.name}", "INFO")

    try:
        # Update parameters
        if parameters:
            _update_node_parameters(node, parameters)

        # Update connections
        if connection:
            _handle_node_connection(connection)

        log_message("Node update completed successfully")
        return node
    except Exception as e:
        log_message(f"Error updating node: {e}", "ERROR")
        traceback.print_exc()
        raise


def _update_node_parameters(node, parameters):
    log_message(f"Updating {len(parameters)} parameters...")

    for k, v in parameters.items():
        try:
            log_message(f"Processing parameter: {k} = {v}")

            if hasattr(node.par, k):
                setattr(node.par, k, v)
                log_message(f"Updated parameter {k} = {v}")
            else:
                log_message(f"Parameter {k} not found on node {node.name}", "WARNING")
        except Exception as param_err:
            log_message(f"Error updating parameter {k}: {param_err}", "ERROR")
            traceback.print_exc()


def deleteNode(nodePath):
    log_message(f"Deleting node: {nodePath}")

    try:
        # Check if node exists
        node = op(nodePath)
        if not node:
            raise ValueError(f"Node not found: {nodePath}")

        # Delete node
        node.destroy()
        log_message(f"Node {nodePath} deleted successfully")
        return True
    except Exception as e:
        log_message(f"Error deleting node: {e}", "ERROR")
        raise


def _handle_node_connection(connection):
    if not connection:
        log_message("No connection data provided", "WARNING")
        return

    # Check required parameters
    if not connection.get("fromNodePath"):
        log_message("Missing required parameter: fromNodePath", "ERROR")
        raise ValueError("Missing required parameter: fromNodePath")

    if not connection.get("toNodePath"):
        log_message("Missing required parameter: toNodePath", "ERROR")
        raise ValueError("Missing required parameter: toNodePath")

    from_node_path = connection.get("fromNodePath")
    to_node_path = connection.get("toNodePath")
    to_index = connection.get("toIndex", 0)
    out_index = connection.get("outIndex", 0)
    clear_existing = connection.get("clearExisting", False)

    log_message(
        f"Connecting {from_node_path}[{out_index}] -> {to_node_path}[{to_index}]"
    )

    # Get nodes
    from_node = op(from_node_path)
    if not from_node:
        log_message(f"Source node not found: {from_node_path}", "ERROR")
        raise ValueError(f"Source node not found: {from_node_path}")

    to_node = op(to_node_path)
    if not to_node:
        log_message(f"Target node not found: {to_node_path}", "ERROR")
        raise ValueError(f"Target node not found: {to_node_path}")

    # Clear existing connections
    if clear_existing:
        log_message(f"Clearing existing connections on {to_node_path} input {to_index}")
        to_node.inputConnectors[to_index].disconnect()

    # Connect nodes
    try:
        from_node.outputConnectors[out_index].connect(to_node.inputConnectors[to_index])
        log_message(f"Connection successful")
    except Exception as e:
        log_message(f"Error connecting nodes: {e}", "ERROR")
        traceback.print_exc()
        raise


# Request handler implementations


class ServerInfoHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        response_data = getServerInfo()
        response["statusCode"] = 200
        response["statusReason"] = "OK"
        response["data"] = json.dumps(response_data, default=safe_serialize)
        return response_data


class GetDataHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        response["statusCode"] = 200
        response["statusReason"] = "OK"
        response["data"] = json.dumps({}, default=safe_serialize)
        return {}


class ListNodesHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        project_nodes = getProjectNodes()
        response_data = {"projectNodes": project_nodes}
        response["statusCode"] = 200
        response["statusReason"] = "OK"
        response["data"] = json.dumps(response_data, default=safe_serialize)
        return response_data


class NodeDefaultParametersHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        query_pars = request.get("pars", {})
        nodeFamily = query_pars.get("nodeFamily")
        nodeType = query_pars.get("nodeType")

        # Validate required parameters
        if not nodeFamily:
            response.update(
                create_error_response(
                    400, "Missing required query parameter: nodeFamily"
                )
            )
            return None

        if not nodeType:
            response.update(
                create_error_response(400, "Missing required query parameter: nodeType")
            )
            return None

        # Create temporary node to get default parameters
        try:
            new_node = createNode("tempNode", nodeFamily, nodeType, {})
            parameters = _get_node_parameters(new_node)
            deleteNode(new_node.path)

            response["statusCode"] = 200
            response["statusReason"] = "OK"
            response["data"] = json.dumps(parameters, default=safe_serialize)
            return parameters
        except Exception as e:
            response.update(
                create_error_response(
                    400, f"Error getting default parameters: {str(e)}"
                )
            )
            return None


class GetNodeHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        # Get node path from path or match
        if match and match.groups():
            nodePath = match.groups()[0]
        else:
            # Legacy way to get path parameter (for compatibility)
            path_info = _parse_api_path(get_request_path(request))
            path_params = path_info.get("params", {})
            nodePath = path_params.get("nodePath")

        # Check if node exists
        node = op(nodePath)
        if not node:
            response.update(create_error_response(404, f"Node not found: {nodePath}"))
            return None

        # Get node parameters and properties
        parameters = _get_node_parameters(node)
        node_info = _present_node_summary(node)

        # Add parameters to response
        node_info["parameters"] = parameters

        response["statusCode"] = 200
        response["statusReason"] = "OK"
        response["data"] = json.dumps(node_info, default=safe_serialize)
        return node_info


class CreateNodeHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        # Parse JSON data
        if "data" not in request:
            response.update(create_error_response(400, "No data provided"))
            return None

        try:
            data = json.loads(request["data"])
        except json.JSONDecodeError:
            response.update(create_error_response(400, "Invalid JSON format"))
            return None

        result = handleCreateNode(data)
        response.update(result)
        return data


class UpdateNodeHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        # Extract nodePath from URL
        if match and match.groups():
            nodePath = match.groups()[0]
        else:
            path_parts = get_request_path(request).split("/")
            if (
                len(path_parts) >= 3
                and path_parts[1] == "api"
                and path_parts[2] == "nodes"
            ):
                nodePath = "/" + "/".join(path_parts[3:])
            else:
                response.update(create_error_response(400, "Invalid URL format"))
                return None

        # Get request data
        if "data" not in request:
            response.update(create_error_response(400, "No data provided"))
            return None

        # Parse JSON data
        try:
            data = json.loads(request["data"])
            # Add nodePath to data
            data["nodePath"] = nodePath
        except json.JSONDecodeError:
            response.update(create_error_response(400, "Invalid JSON format"))
            return None

        # Execute node update
        result = handleUpdateNode(data)
        response.update(result)
        return data


class DeleteNodeHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        # Extract nodePath from URL
        if match and match.groups():
            nodePath = match.groups()[0]
        else:
            path_parts = get_request_path(request).split("/")
            if (
                len(path_parts) >= 3
                and path_parts[1] == "api"
                and path_parts[2] == "nodes"
            ):
                nodePath = "/" + "/".join(path_parts[3:])
            else:
                response.update(create_error_response(400, "Invalid URL format"))
                return None

        if not nodePath:
            response.update(create_error_response(400, "Missing node path in URL"))
            return None

        # Execute node deletion
        result = handleDeleteNode({"nodePath": nodePath})
        response.update(result)
        return {"nodePath": nodePath}


class SendDataHandler(BaseRequestHandler):

    def process(self, request, response, match=None):
        # Parse JSON data
        if "data" not in request:
            response.update(create_error_response(400, "No data provided"))
            return None

        try:
            data = json.loads(request["data"])
        except json.JSONDecodeError:
            response.update(create_error_response(400, "Invalid JSON format"))
            return None

        # Handle data sending (implementation returns empty response)
        response["statusCode"] = 200
        response["statusReason"] = "OK"
        response["data"] = json.dumps(
            {"message": "Data received successfully"}, default=safe_serialize
        )
        return {"message": "Data received successfully"}


def onHTTPRequest(webServerDAT, request, response):
    response["content-type"] = "application/json"

    log_message(f"==== HTTP REQUEST: {request['method']} ====")

    try:
        if router_available:
            # Use routing if router is available
            router.route_request(request, response)
        else:
            # Use traditional request handling
            if request["method"] == "GET":
                _handle_get_request(request, response)
            elif request["method"] == "POST":
                _handle_post_request(request, response)
            elif request["method"] == "DELETE":
                _handle_delete_request(request, response)
            elif request["method"] == "PATCH":
                _handle_patch_request(request, response)
            else:
                response.update(
                    create_error_response(
                        405, f"Method {request['method']} not supported"
                    )
                )
    except Exception as e:
        log_message(f"Exception in request handler: {e}", "ERROR")
        traceback.print_exc()
        response.update(create_error_response(500, str(e)))
    finally:
        log_message(f"Response: {response}")
        log_message("==== HTTP REQUEST PROCESSED ====")

    return response


def _present_node_summary(node):
    input_connections = []
    # https://derivative.ca/UserGuide/Connector_Class
    for i, connector in enumerate(node.inputConnectors):
        connections = connector.connections
        if len(connections) > 0:
            try:
                connections_info = []
                for connection in connections:
                    connections_info.append(
                        {
                            "index": connection.index,
                            "from": connection.owner,
                            "outOP": connection.outOP,
                        }
                    )
                if connections_info:
                    input_connections.append(
                        {"index": i, "connections": connections_info}
                    )
            except Exception as e:
                input_connections.append({"index": i, "error": str(e)})

    # Get output connection info
    output_connections = []
    # https://derivative.ca/UserGuide/Connector_Class
    for i, connector in enumerate(node.outputConnectors):
        connections = connector.connections
        if len(connections) > 0:
            try:
                connections_info = []
                for connection in connections:
                    connections_info.append(
                        {
                            "index": connection.index,
                            "to": connection.owner,
                            "inOP": connection.inOP,
                        }
                    )
                if connections_info:
                    output_connections.append(
                        {"index": i, "connections": connections_info}
                    )
            except Exception as e:
                output_connections.append({"index": i, "error": str(e)})
    return {
        "id": node.id,
        "type": node.type,
        "name": node.name,
        "path": node.path,
        "opType": node.opType,
        "family": node.family,
        "nodeCenterX": node.nodeCenterX,
        "nodeCenterY": node.nodeCenterY,
        "nodeHeight": node.nodeHeight,
        "nodeWidth": node.nodeWidth,
        "nodeX": node.nodeX,
        "nodeY": node.nodeY,
        "inputConnectors": input_connections,
        "outputConnectors": output_connections,
    }


def _handle_get_request(request, response):
    # Get request URI (uri, not path)
    request_uri = request.get("uri", "")
    log_message(f"Request URI: '{request_uri}'")

    # Parse URL path to get endpoint type and parameters
    path_info = _parse_api_path(request_uri)
    log_message(f"path_info: {path_info}")
    endpoint_type = path_info["endpoint_type"]
    path_params = path_info["params"]
    query_pars = request.get("pars", {})

    log_message(f"Handling GET request for endpoint: {endpoint_type}")

    try:
        if endpoint_type == "server":
            # /api/server endpoint
            response_data = getServerInfo()
            response["statusCode"] = 200
            response["statusReason"] = "OK"
            response["data"] = json.dumps(response_data, default=safe_serialize)

        elif endpoint_type == "data":
            # /api/data endpoint
            response["statusCode"] = 200
            response["statusReason"] = "OK"
            response["data"] = json.dumps({}, default=safe_serialize)

        elif endpoint_type == "nodes":
            # /api/nodes endpoint - list of project nodes
            project_nodes = getProjectNodes()
            response_data = {"projectNodes": project_nodes}
            response["statusCode"] = 200
            response["statusReason"] = "OK"
            response["data"] = json.dumps(response_data, default=safe_serialize)

        elif endpoint_type == "node_default_parameters":
            # /api/nodes/default-parameters endpoint
            nodeFamily = query_pars.get("nodeFamily")
            nodeType = query_pars.get("nodeType")

            # Validate required parameters
            if not nodeFamily:
                response.update(
                    create_error_response(
                        400, "Missing required query parameter: nodeFamily"
                    )
                )
                return
            if not nodeType:
                response.update(
                    create_error_response(
                        400, "Missing required query parameter: nodeType"
                    )
                )
                return

            # Create temporary node to get default parameters
            try:
                new_node = createNode("tempNode", nodeFamily, nodeType, {})
                parameters = _get_node_parameters(new_node)
                deleteNode(new_node.path)

                response["statusCode"] = 200
                response["statusReason"] = "OK"
                response["data"] = json.dumps(parameters, default=safe_serialize)
            except Exception as e:
                response.update(
                    create_error_response(
                        400, f"Error getting default parameters: {str(e)}"
                    )
                )
                return

        elif endpoint_type == "node":
            # /api/nodes/{nodePath} endpoint - specific node properties
            nodePath = path_params.get("nodePath")

            # Check if node exists
            node = op(nodePath)
            if not node:
                response.update(
                    create_error_response(404, f"Node not found: {nodePath}")
                )
                return

            # Get node parameters and properties
            parameters = _get_node_parameters(node)
            node_info = _present_node_summary(node)

            # Add parameters to response
            node_info["parameters"] = parameters

            response["statusCode"] = 200
            response["statusReason"] = "OK"
            response["data"] = json.dumps(node_info, default=safe_serialize)

        else:
            # Unknown endpoint
            response.update(
                create_error_response(
                    404, f"Unknown endpoint: {request.get('path', '')}"
                )
            )

    except Exception as e:
        log_message(f"Error handling GET request: {e}", "ERROR")
        traceback.print_exc()
        response.update(create_error_response(500, str(e)))


def _handle_post_request(request, response):
    # Parse URL path to get endpoint type and parameters
    path_info = _parse_api_path(request.get("path", ""))
    endpoint_type = path_info["endpoint_type"]

    log_message(f"Handling POST request for endpoint: {endpoint_type}")

    try:
        if endpoint_type == "data":
            # /api/data endpoint - data sending
            response["statusCode"] = 200
            response["statusReason"] = "OK"
            response["data"] = json.dumps(
                {"message": "Data received successfully"}, default=safe_serialize
            )

        elif endpoint_type == "nodes":
            # /api/nodes endpoint - node creation
            # Parse JSON data
            if "data" not in request:
                response.update(create_error_response(400, "No data provided"))
                return

            try:
                data = json.loads(request["data"])
            except json.JSONDecodeError:
                response.update(create_error_response(400, "Invalid JSON format"))
                return

            result = handleCreateNode(data)
            response.update(result)

        else:
            # Unknown or unsupported POST endpoint
            response.update(
                create_error_response(
                    404,
                    f"Unknown or unsupported POST endpoint: {request.get('path', '')}",
                )
            )

    except Exception as e:
        log_message(f"Error handling POST request: {e}", "ERROR")
        traceback.print_exc()
        response.update(create_error_response(500, str(e)))


def _handle_delete_request(request, response):
    try:
        # Extract nodePath from URL
        path_parts = request.get("path", "").split("/")
        if len(path_parts) >= 3 and path_parts[1] == "api" and path_parts[2] == "nodes":
            # Extract nodePath from /api/nodes/{nodePath} format
            nodePath = "/".join(path_parts[3:])
            if not nodePath:
                response.update(create_error_response(400, "Missing node path in URL"))
                return

            # Execute node deletion
            result = handleDeleteNode({"nodePath": nodePath})
            response.update(result)
        else:
            response.update(create_error_response(400, "Invalid DELETE endpoint"))
    except Exception as e:
        log_message(f"Error handling DELETE request: {e}", "ERROR")
        response.update(create_error_response(500, str(e)))


def _handle_patch_request(request, response):
    try:
        # Extract nodePath from URL
        path_parts = request.get("path", "").split("/")
        if len(path_parts) >= 3 and path_parts[1] == "api" and path_parts[2] == "nodes":
            # Extract nodePath from /api/nodes/{nodePath} format
            nodePath = "/".join(path_parts[3:])
            if not nodePath:
                response.update(create_error_response(400, "Missing node path in URL"))
                return

            # Get request data
            if "data" not in request:
                response.update(create_error_response(400, "No data provided"))
                return

            # Parse JSON data
            try:
                data = json.loads(request["data"])
                # Add nodePath to data
                data["nodePath"] = nodePath
            except json.JSONDecodeError:
                response.update(create_error_response(400, "Invalid JSON format"))
                return

            # Execute node update
            result = handleUpdateNode(data)
            response.update(result)
        else:
            response.update(create_error_response(400, "Invalid PATCH endpoint"))
    except Exception as e:
        log_message(f"Error handling PATCH request: {e}", "ERROR")
        response.update(create_error_response(500, str(e)))


def _parse_api_path(path):

    # Split into path segments
    if not path:
        return {"endpoint_type": "unknown", "params": {}}

    segments = path.strip("/").split("/")

    # Only process API endpoints
    if len(segments) < 2 or segments[0] != "api":
        return {"endpoint_type": "unknown", "params": {}}

    # Second segment is resource type
    resource_type = segments[1]

    # Determine endpoint based on resource type
    if resource_type == "data":
        return {"endpoint_type": "data", "params": {}}
    elif resource_type == "server":
        return {"endpoint_type": "server", "params": {}}
    elif resource_type == "nodes":
        # Check if there's a sub-resource
        if len(segments) == 2:  # /api/nodes
            return {"endpoint_type": "nodes", "params": {}}
        elif len(segments) >= 3:
            if segments[2] == "default-parameters":  # /api/nodes/default-parameters
                return {"endpoint_type": "node_default_parameters", "params": {}}
            else:  # /api/nodes/{nodePath}
                # Join segments from third onwards as nodePath
                node_path = "/" + "/".join(segments[2:])
                return {"endpoint_type": "node", "params": {"nodePath": node_path}}

    # Unknown endpoint
    return {"endpoint_type": "unknown", "params": {}}


def getProjectNodes():
    try:
        log_message("Collecting project nodes...")

        # Get project root
        project_root = op(parent().parent())
        if not project_root:
            log_message("Warning: project not found, falling back to root", "WARNING")
            project_root = op("/")

        # Collect nodes recursively
        nodes = []
        project_path = project_root.path
        # Introduce a set to track processed nodes
        processed_nodes = set()
        _collect_nodes_recursive(project_root, nodes, project_path, processed_nodes)

        log_message(f"Collected {len(nodes)} nodes in total")
        return nodes
    except Exception as e:
        log_message(f"Error getting project nodes: {e}", "ERROR")
        traceback.print_exc()
        return []


def _collect_nodes_recursive(parent, nodes_list, path="", processed_nodes=None):
    if processed_nodes is None:
        processed_nodes = set()

    # Skip already processed nodes (prevent circular references)
    if parent.path in processed_nodes:
        log_message(f"Skipping already processed node: {parent.path}", "DEBUG")
        return

    # Mark current node as processed
    processed_nodes.add(parent.path)

    for child in parent.children:
        # Skip already processed nodes
        if child.path in processed_nodes:
            log_message(f"Skipping already processed child: {child.path}", "DEBUG")
            continue

        # Mark current child as processed
        processed_nodes.add(child.path)

        # Process path structure appropriately
        if path:
            node_path = path + "/" + child.name
        else:
            node_path = child.path

        params = _get_node_parameters(child)
        children = []

        # Process children recursively (if any)
        if child.children:
            _collect_nodes_recursive(child, children, node_path, processed_nodes)
        node_info = _present_node_summary(child)
        node_info["parameters"] = params
        node_info["children"] = children

        nodes_list.append(node_info)


def _get_node_parameters(node):
    params_dict = {}
    for par in node.pars("*"):
        try:
            log_message(f"Getting parameter: {par.name} of type {type(par)}", "DEBUG")
            value = par.eval()
            log_message(
                f"Parameter {par.name} evaluated to value of type {type(value)}",
                "DEBUG",
            )

            # For OP values (e.g., operator reference parameters), use path
            if isinstance(value, td.OP):
                value = value.path
                log_message(f"Converted OP to path: {value}", "DEBUG")

            params_dict[par.name] = value
        except Exception as param_err:
            log_message(f"Error processing parameter {par.name}: {param_err}", "ERROR")
            traceback.print_exc()
            # Continue with next parameter instead of failing completely
            params_dict[par.name] = f"ERROR: {str(param_err)}"

    return params_dict


def getServerInfo():
    try:
        # Get server information
        logger.info("Getting server information...")
        server_info = {}

        # Get server name
        try:
            server_name = (
                op("mcp_webserver").name if op("mcp_webserver") else "TouchDesigner"
            )
            server_info["server"] = server_name
        except Exception as server_name_error:
            logger.error(f"Error getting server name: {server_name_error}")
            server_info["server"] = "TouchDesigner"

        # Additional information like TouchDesigner version
        try:
            server_info["version"] = "0.1.0"
            server_info["status"] = "running"
        except Exception as version_error:
            logger.error(f"Error getting additional info: {version_error}")

        logger.info(f"Server info collected successfully: {server_info}")
        return server_info
    except Exception as e:
        logger.error(f"Error in getServerInfo: {e}", exception=e)
        # Return minimal information even if error occurs
        return {"server": "unknown", "status": "error", "error": str(e)}


# Node API handler functions


def handleCreateNode(data):
    try:
        # Validate required parameters
        if "nodeFamily" not in data:
            return create_error_response(400, "Missing required parameter: nodeFamily")
        if "nodeType" not in data:
            return create_error_response(400, "Missing required parameter: nodeType")

        # Get optional parameters
        node_family = data["nodeFamily"]
        node_type = data["nodeType"]
        node_name = data.get("nodeName", "")
        parameters = data.get("parameters", {})

        # Create node
        new_node = createNode(node_name, node_family, node_type, parameters)

        # Create success response
        node_info = _present_node_summary(new_node)
        response_data = {
            "statusCode": 201,
            "statusReason": "Created",
            "data": json.dumps(
                {"message": "Node created successfully", "node": node_info},
                default=safe_serialize,
            ),
        }

        return response_data
    except Exception as e:
        # Create error response
        log_message(f"Error creating node: {e}", "ERROR")
        traceback.print_exc()
        return create_error_response(500, f"Error creating node: {str(e)}")


def handleUpdateNode(data):
    try:
        # Validate required parameters
        if "nodePath" not in data:
            return create_error_response(400, "Missing required parameter: nodePath")

        node_path = data["nodePath"]
        parameters = data.get("parameters", {})
        connection = data.get("connection", None)

        # Check if node exists
        node = op(node_path)
        if not node:
            return create_error_response(404, f"Node not found: {node_path}")

        # Update node
        updateNode(node, parameters, connection)

        # Create success response
        node_info = _present_node_summary(node)
        return {
            "statusCode": 200,
            "statusReason": "OK",
            "data": json.dumps(
                {"message": "Node updated successfully", "nodeInfo": node_info},
                default=safe_serialize,
            ),
        }
    except Exception as e:
        # Create error response
        log_message(f"Error updating node: {e}", "ERROR")
        traceback.print_exc()
        return create_error_response(500, f"Error updating node: {str(e)}")


def handleDeleteNode(data):
    try:
        # Validate required parameters
        if "nodePath" not in data:
            return create_error_response(400, "Missing required parameter: nodePath")

        node_path = data["nodePath"]

        # Delete node
        deleteNode(node_path)

        # Create success response
        return {
            "statusCode": 200,
            "statusReason": "OK",
            "data": json.dumps({"message": f"Node {node_path} deleted successfully"}),
        }
    except ValueError as e:
        # Node not found
        return create_error_response(404, str(e))
    except Exception as e:
        # Other errors
        log_message(f"Error deleting node: {e}", "ERROR")
        traceback.print_exc()
        return create_error_response(500, f"Error deleting node: {str(e)}")


# Initialize routes
if router_available:
    # Create handler instances
    server_info_handler = ServerInfoHandler(logger)
    get_data_handler = GetDataHandler(logger)
    list_nodes_handler = ListNodesHandler(logger)
    node_default_parameters_handler = NodeDefaultParametersHandler(logger)
    get_node_handler = GetNodeHandler(logger)
    create_node_handler = CreateNodeHandler(logger)
    update_node_handler = UpdateNodeHandler(logger)
    delete_node_handler = DeleteNodeHandler(logger)
    send_data_handler = SendDataHandler(logger)

    # GET routes
    router.add_route("GET", r"^/api/server$", server_info_handler)
    router.add_route("GET", r"^/api/data$", get_data_handler)
    router.add_route("GET", r"^/api/nodes$", list_nodes_handler)
    router.add_route(
        "GET", r"^/api/nodes/default-parameters$", node_default_parameters_handler
    )
    router.add_route("GET", r"^/api/nodes(/.*)?$", get_node_handler)

    # POST routes
    router.add_route("POST", r"^/api/data$", send_data_handler)
    router.add_route("POST", r"^/api/nodes$", create_node_handler)

    # PATCH routes
    router.add_route("PATCH", r"^/api/nodes(/.*)?$", update_node_handler)

    # DELETE routes
    router.add_route("DELETE", r"^/api/nodes(/.*)?$", delete_node_handler)

    log_message("API routes initialized successfully")
