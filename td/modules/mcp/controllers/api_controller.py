"""
OpenAPI schema based API controller for TouchDesigner MCP Web Server

This controller uses the OpenAPIRouter to route requests based on the OpenAPI schema,
and converts between API models and internal data structures.
"""

import json
import traceback
from typing import Any, Optional, Protocol

from mcp.controllers.generated_handlers import *
from mcp.controllers.openapi_router import OpenAPIRouter
from utils.error_handling import ErrorCategory
from utils.logging import log_message
from utils.serialization import safe_serialize
from utils.types import LogLevel, Result


class ApiServiceProtocol(Protocol):
	"""Protocol defining the API service interface"""

	def call_node_method(
		self,
		node_path: str,
		method_name: str,
		args: list[Any] = None,
		kwargs: dict[str, Any] = None,
	) -> Result: ...

	def create_node(
		self,
		parent_path: str,
		node_type: str,
		node_name: Optional[str] = None,
		parameters: Optional[dict[str, Any]] = None,
	) -> Result: ...

	def delete_node(self, node_path: str) -> Result: ...

	def exec_script(self, script: str) -> Result: ...

	def get_td_info(self) -> Result: ...

	def get_nodes(
		self,
		parent_path: str,
		pattern: Optional[str] = None,
		include_properties: bool = False,
	) -> Result: ...

	def get_module_help(self, module_name: str) -> Result: ...

	def get_node_detail(self, node_path: str) -> Result: ...

	def get_node_errors(self, node_path: str) -> Result: ...

	def get_td_python_class_details(self, class_name: str) -> Result: ...

	def get_td_python_classes(self) -> Result: ...

	def update_node(self, node_path: str, properties: dict[str, Any]) -> Result: ...


class RequestProcessor:
	"""
	Responsible for processing and normalizing HTTP requests from different sources

	This class helps achieve separation of concerns by isolating request processing logic
	from the controller class, improving maintainability and testability.
	"""

	@staticmethod
	def normalize_request(
		request: dict[str, Any],
	) -> tuple[str, str, dict[str, Any], str]:
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
	def _extract_method(request: dict[str, Any]) -> str:
		"""Extract HTTP method from request"""
		if "method" in request and isinstance(request["method"], str):
			return request["method"].upper()
		return ""

	@staticmethod
	def _extract_path_and_query(request: dict[str, Any]) -> tuple[str, dict[str, Any]]:
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
	def _extract_body(request: dict[str, Any]) -> str:
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
		self, webServerDAT: Any, request: dict[str, Any], response: dict[str, Any]
	) -> dict[str, Any]:
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
		self, request: dict[str, Any]
	) -> tuple[str, str, dict[str, Any], str]:
		"""
		Normalize request object to handle different request formats

		Args:
		    request: Request object that might be in different formats

		Returns:
		    Tuple containing (method, path, query_params, body)
		"""
		return RequestProcessor.normalize_request(request)

	def onHTTPRequest(
		self, webServerDAT: Any, request: dict[str, Any], response: dict[str, Any]
	) -> dict[str, Any]:
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
		response["headers"]["Access-Control-Allow-Methods"] = (
			"GET, POST, PUT, DELETE, PATCH, OPTIONS"
		)
		response["headers"]["Access-Control-Allow-Headers"] = (
			"Content-Type, Authorization"
		)
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
						"data": None,
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


api_controller_openapi = APIControllerOpenAPI()
