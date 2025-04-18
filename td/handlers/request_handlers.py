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
