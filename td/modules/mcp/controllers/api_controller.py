"""
OpenAPI schema based API controller for TouchDesigner MCP Web Server

This controller uses the OpenAPIRouter to route requests based on the OpenAPI schema,
and converts between API models and internal data structures.
"""

import json
import traceback
from typing import Any, Dict, List, Optional, Protocol, Tuple

from mcp.controllers.generated_handlers import *
from mcp.controllers.openapi_router import OpenAPIRouter
from utils.error_handling import ErrorCategory
from utils.logging import log_message
from utils.result import error_result
from utils.serialization import safe_serialize
from utils.types import LogLevel, Result

try:
    from td_server.openapi_server.models.create_node200_response import (
        CreateNode200Response,
    )
    from td_server.openapi_server.models.delete_node200_response import (
        DeleteNode200Response,
    )
    from td_server.openapi_server.models.exec_node_method200_response import (
        ExecNodeMethod200Response,
    )
    from td_server.openapi_server.models.exec_python_script200_response import (
        ExecPythonScript200Response,
    )
    from td_server.openapi_server.models.get_node_detail200_response import (
        GetNodeDetail200Response,
    )
    from td_server.openapi_server.models.get_nodes200_response import (
        GetNodes200Response,
    )
    from td_server.openapi_server.models.get_td_info200_response import (
        GetTdInfo200Response,
    )
    from td_server.openapi_server.models.update_node200_response import (
        UpdateNode200Response,
    )
    from td_server.openapi_server.models.check_node_errors200_response import (
        CheckNodeErrors200Response,
    )

    log_message("OpenAPI response models imported successfully", LogLevel.DEBUG)
except ImportError as e:
    log_message(
        f"OpenAPI models import failed, using raw dictionaries: {e}", LogLevel.WARNING
    )


class ApiServiceProtocol(Protocol):
    """Protocol defining the API service interface"""

    def get_td_info(self) -> Result: ...

    def get_nodes(self, parent_path: str, pattern: Optional[str] = None, include_properties: bool = False) -> Result: ...

    def create_node(
        self,
        parent_path: str,
        node_type: str,
        node_name: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Result: ...

    def delete_node(self, node_path: str) -> Result: ...

    def get_node_detail(self, node_path: str) -> Result: ...

    def update_node(self, node_path: str, properties: Dict[str, Any]) -> Result: ...

    def exec_script(self, script: str) -> Result: ...

    def get_td_python_classes(self) -> Result: ...

    def get_td_python_class_details(self, class_name: str) -> Result: ...

    def call_node_method(
        self,
        node_path: str,
        method_name: str,
        args: List[Any] = None,
        kwargs: Dict[str, Any] = None,
    ) -> Result: ...


class RequestProcessor:
    """
    Responsible for processing and normalizing HTTP requests from different sources

    This class helps achieve separation of concerns by isolating request processing logic
    from the controller class, improving maintainability and testability.
    """

    @staticmethod
    def normalize_request(
        request: Dict[str, Any],
    ) -> Tuple[str, str, Dict[str, Any], str]:
        """
        Normalize request object to handle different request formats

        Args:
            request: Request object that might be in different formats

        Returns:
            Tuple containing (method, path, query_params, body)
        """
        method = ""
        path = ""
        query_params = {}
        body = ""

        try:
            method = RequestProcessor._extract_method(request)

            path, uri_query_params = RequestProcessor._extract_path_and_query(request)
            query_params.update(uri_query_params)

            if "query" in request and isinstance(request["query"], dict):
                query_params.update(request["query"])

            if "pars" in request and isinstance(request["pars"], dict):
                log_message(
                    f"Found 'pars' in request: {request['pars']}", LogLevel.DEBUG
                )
                query_params.update(request["pars"])

            body = RequestProcessor._extract_body(request)

        except Exception as e:
            log_message(f"Error during request normalization: {str(e)}", LogLevel.ERROR)
            log_message(traceback.format_exc(), LogLevel.DEBUG)

        return method, path, query_params, body

    @staticmethod
    def _extract_method(request: Dict[str, Any]) -> str:
        """Extract HTTP method from request"""
        if "method" in request:
            if isinstance(request["method"], str):
                return request["method"].upper()
        return ""

    @staticmethod
    def _extract_path_and_query(request: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Extract path and query parameters from request"""
        path = ""
        query_params = {}

        uri = request.get("uri", {})

        if isinstance(uri, dict):
            path = uri.get("path", "")
            uri_query = uri.get("query", {})
            if isinstance(uri_query, dict):
                query_params.update(uri_query)
        elif isinstance(uri, str):
            path = uri

        return path, query_params

    @staticmethod
    def _extract_body(request: Dict[str, Any]) -> str:
        """Extract body content from request"""
        body = ""

        body_content = request.get("body", "")

        if isinstance(body_content, (str, bytes)):
            body = (
                body_content
                if isinstance(body_content, str)
                else body_content.decode("utf-8", errors="replace")
            )
        elif isinstance(body_content, dict):
            body = json.dumps(body_content)

        if not body and "data" in request:
            data = request.get("data", "")
            if isinstance(data, bytes):
                body = data.decode("utf-8", errors="replace") if data else ""
            elif isinstance(data, str):
                body = data
            elif isinstance(data, dict):
                body = json.dumps(data)

        return body


class IController(Protocol):
    """
    Controller interface for handling HTTP requests

    All controllers should implement this interface to ensure consistency across
    different controller implementations. This enforces a unified approach to
    request handling throughout the application.
    """

    def onHTTPRequest(
        self, webServerDAT: Any, request: Dict[str, Any], response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process an HTTP request from TouchDesigner WebServerDAT

        Args:
            webServerDAT: Reference to the WebServerDAT object
            request: Dictionary containing request information
            response: Dictionary for storing response information

        Returns:
            Updated response dictionary
        """
        ...


class APIControllerOpenAPI(IController):
    """
    API controller that uses OpenAPI schema for routing and model conversion

    Implements the IController interface for consistency with other controllers.
    """

    def __init__(self, service: Optional[ApiServiceProtocol] = None):
        """
        Initialize the controller with a service implementation

        Args:
            service: Service implementation (uses default if None)
        """
        if service is None:
            from mcp.services.api_service import api_service

            self._service = api_service
        else:
            self._service = service

        self.router = OpenAPIRouter()
        self.register_handlers()

    def _normalize_request(
        self, request: Dict[str, Any]
    ) -> Tuple[str, str, Dict[str, Any], str]:
        """
        Normalize request object to handle different request formats

        Args:
            request: Request object that might be in different formats

        Returns:
            Tuple containing (method, path, query_params, body)
        """
        return RequestProcessor.normalize_request(request)

    def onHTTPRequest(
        self, webServerDAT: Any, request: Dict[str, Any], response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle HTTP request from TouchDesigner WebServer DAT

        Implements IController interface for consistent handling across controllers.

        Args:
            webServerDAT: Reference to the WebServerDAT object
            request: Dictionary containing request information
            response: Dictionary for storing response information

        Returns:
            Updated response dictionary
        """

        if "headers" not in response:
            response["headers"] = {}

        response["headers"]["Access-Control-Allow-Origin"] = "*"
        response["headers"][
            "Access-Control-Allow-Methods"
        ] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response["headers"][
            "Access-Control-Allow-Headers"
        ] = "Content-Type, Authorization"
        response["headers"]["Content-Type"] = "application/json"

        try:
            method, path, query_params, body = self._normalize_request(request)
        except Exception as e:

            response["statusCode"] = 500
            response["statusReason"] = "Internal Server Error"
            response["data"] = json.dumps(
                {
                    "success": False,
                    "error": f"Request normalization error: {str(e)}",
                    "errorCategory": str(ErrorCategory.INTERNAL),
                }
            )
            return response

        try:
            if method == "OPTIONS":
                response["statusCode"] = 200
                response["statusReason"] = "OK"
                response["data"] = "{}"
                return response

            result = self.router.route_request(method, path, query_params, body)

            if result["success"]:
                response["statusCode"] = 200
                response["statusReason"] = "OK"
                response["data"] = json.dumps(safe_serialize(result))
            else:
                error_category = result.get("errorCategory", ErrorCategory.VALIDATION)
                response["statusCode"] = 200
                response["statusReason"] = self._get_status_reason_for_error(
                    error_category
                )
                response["data"] = json.dumps(
                    {
                        "success": False,
                        "data" : None,
                        "error": result["error"],
                        "errorCategory": (
                            str(error_category)
                            if hasattr(error_category, "__str__")
                            else None
                        ),
                    }
                )

        except Exception as e:
            log_message(f"Error handling request: {e}", LogLevel.ERROR)
            log_message(traceback.format_exc(), LogLevel.DEBUG)

            response["statusCode"] = 500
            response["statusReason"] = "Internal Server Error"
            response["data"] = json.dumps(
                {
                    "success": False,
                    "error": f"Internal server error: {str(e)}",
                    "errorCategory": str(ErrorCategory.INTERNAL),
                }
            )

        log_message(
            f"Response status: {response['statusCode']}, {response['data']}",
            LogLevel.DEBUG,
        )
        return response

    def _get_status_code_for_error(self, error_category) -> int:
        """
        Map error category to HTTP status code

        Args:
            error_category: The error category

        Returns:
            Appropriate HTTP status code
        """
        if error_category == ErrorCategory.NOT_FOUND:
            return 404
        elif error_category == ErrorCategory.PERMISSION:
            return 403
        elif error_category == ErrorCategory.VALIDATION:
            return 400
        elif error_category == ErrorCategory.EXTERNAL:
            return 502
        else:
            return 500

    def _get_status_reason_for_error(self, error_category) -> str:
        """
        Map error category to HTTP status reason

        Args:
            error_category: The error category

        Returns:
            Status reason text
        """
        if error_category == ErrorCategory.NOT_FOUND:
            return "Not Found"
        elif error_category == ErrorCategory.PERMISSION:
            return "Forbidden"
        elif error_category == ErrorCategory.VALIDATION:
            return "Bad Request"
        elif error_category == ErrorCategory.EXTERNAL:
            return "Bad Gateway"
        else:
            return "Internal Server Error"

    def register_handlers(self) -> None:
        """Register all generated handlers automatically"""
        import mcp.controllers.generated_handlers as handlers

        for operation_id in handlers.__all__:
            handler = getattr(handlers, operation_id, None)
            if callable(handler):
                self.router.register_handler(operation_id, handler)
            else:
                log_message(f"Handler for {operation_id} not found.", LogLevel.WARNING)

        # Override with controller-specific implementation where necessary
        self.router.register_handler(
            "check_node_errors", self._handle_check_node_errors
        )

    def _handle_get_td_info(self, body: Optional[str] = None, **kwargs) -> Result:
        """
        Handle get_td_info operation

        Returns server information such as version and platform.
        """
        service_result = self._service.get_td_info()

        response_data = GetTdInfo200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_get_nodes(
        self,
        parentPath: str,
        pattern: Optional[str] = None,
        includeProperties: Optional[bool] = None,
        body: Optional[str] = None,
        **kwargs,
    ) -> Result:
        """
        Handle get_nodes operation

        Args:
            parentPath: Path of the parent node to get children from
            pattern: Optional pattern to filter nodes by
            includeProperties: Whether to include full node properties (default: False)

        Returns:
            List of nodes under the specified parent path
        """
        # Convert camelCase to snake_case and provide default value
        include_properties = includeProperties if includeProperties is not None else False

        service_result = self._service.get_nodes(parentPath, pattern, include_properties)
        response_data = GetNodes200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_create_node(self, body: str, **kwargs) -> Result:
        """
        Handle create_node operation

        Args:
            body: Request body containing node creation parameters

        Returns:
            Information about the created node
        """
        if not body:
            return error_result("Request body is required")

        try:
            request_data = json.loads(body)
        except json.JSONDecodeError as e:
            return error_result(f"Invalid JSON in request body: {str(e)}")

        parent_path = request_data.get("parentPath")
        node_type = request_data.get("nodeType")
        node_name = request_data.get("nodeName")
        parameters = request_data.get("parameters", {})

        if not parent_path:
            return error_result("parentPath is required")

        if not node_type:
            return error_result("nodeType is required")

        service_result = self._service.create_node(
            parent_path, node_type, node_name, parameters
        )

        response_data = CreateNode200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_delete_node(
        self, nodePath: str, body: Optional[str] = None, **kwargs
    ) -> Result:
        """
        Handle delete_node operation

        Args:
            nodePath: Path of the node to delete

        Returns:
            Result of the deletion operation
        """
        service_result = self._service.delete_node(nodePath)

        response_data = DeleteNode200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_get_node_detail(
        self, nodePath: str, body: Optional[str] = None, **kwargs
    ) -> Result:
        """
        Handle get_node_detail operation

        Args:
            nodePath: Path of the node to get properties for

        Returns:
            Node properties
        """
        service_result = self._service.get_node_detail(nodePath)
        response_data = GetNodeDetail200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_update_node(self, body: str, **kwargs) -> Result:
        """
        Handle update_node operation

        Args:
            nodePath: Path of the node to update
            body: Request body containing properties to update

        Returns:
            Result of the update operation
        """
        if not body:
            return error_result("Request body is required")

        try:
            request_data = json.loads(body)
        except json.JSONDecodeError as e:
            return error_result(f"Invalid JSON in request body: {str(e)}")

        nodePath = request_data.get("nodePath", "")
        if not nodePath:
            return error_result("nodePath is required")

        properties = request_data.get("properties", {})

        if not properties or not isinstance(properties, dict):
            return error_result("properties object is required")

        service_result = self._service.update_node(nodePath, properties)
        response_data = UpdateNode200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_exec_node_method(self, body: str, **kwargs) -> Result:
        """
        Handle exec_node_method operation

        Args:
            body: Request body containing node path, method name, and arguments

        Returns:
            Result of the method execution
        """
        if not body:
            return error_result("Request body is required")

        try:
            request_data = json.loads(body)
        except json.JSONDecodeError as e:
            return error_result(f"Invalid JSON in request body: {str(e)}")

        node_path = request_data.get("nodePath")
        method = request_data.get("method")
        args = request_data.get("args", [])
        kwargs = request_data.get("kwargs", {})

        if not node_path:
            return error_result("nodePath is required")

        if not method:
            return error_result("method is required")

        service_result = self._service.call_node_method(node_path, method, args, kwargs)

        if not service_result["success"]:
            return service_result

        response_data = ExecNodeMethod200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_exec_python_script(self, body: str, **kwargs) -> Result:
        """
        Handle exec_python_script operation

        Args:
            body: Request body containing Python script to execute

        Returns:
            Result of the script execution
        """
        if not body:
            return error_result("Request body is required")

        try:
            request_data = json.loads(body)
        except json.JSONDecodeError as e:
            return error_result(f"Invalid JSON in request body: {str(e)}")

        script = request_data.get("script")

        if not script:
            return error_result("script is required")

        service_result = self._service.exec_script(script)

        if not service_result["success"]:
            return service_result

        response_data = ExecPythonScript200Response().from_dict(service_result)
        return response_data.to_dict()

    def _handle_get_td_python_classes(
        self, body: Optional[str] = None, **kwargs
    ) -> Result:
        """
        Handle get_td_python_classes operation

        Returns:
            List of Python classes available in TouchDesigner
        """
        return self._service.get_td_python_classes()

    def _handle_get_td_python_class_details(
        self, className: str, body: Optional[str] = None, **kwargs
    ) -> Result:
        """
        Handle get_td_python_class_details operation

        Args:
            className: Name of the Python class to get details for

        Returns:
            Details of the specified Python class
        """
        return self._service.get_td_python_class_details(className)

    def _handle_check_node_errors(self, body: str, **kwargs) -> Result:
        """
        Handle check_node_errors operation

        Args:
            body: Request body containing nodePath and optional checkChildren flag

        Returns:
            Result of the error check operation
        """
        if not body:
            return error_result("Request body is required")

        try:
            request_data = json.loads(body)
        except json.JSONDecodeError as e:
            return error_result(f"Invalid JSON in request body: {str(e)}")

        node_path = request_data.get("nodePath")
        if not node_path:
            return error_result("nodePath is required")

        check_children_raw = request_data.get("checkChildren", False)
        if isinstance(check_children_raw, str):
            check_children = check_children_raw.strip().lower() in (
                "true",
                "1",
                "yes",
                "on",
            )
        else:
            check_children = bool(check_children_raw)

        service_result = self._service.check_node_errors(
            node_path, check_children=check_children
        )

        try:
            response_data = CheckNodeErrors200Response().from_dict(service_result)
            return response_data.to_dict()
        except Exception:
            return service_result


api_controller_openapi = APIControllerOpenAPI()
