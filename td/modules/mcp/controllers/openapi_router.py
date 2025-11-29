"""
OpenAPI schema based router for TouchDesigner MCP Web Server

This module provides utilities to:
- Load OpenAPI schema
- Extract route definitions
- Match incoming requests to routes
- Call registered handler functions based on operationId
"""

from dataclasses import dataclass, field
import traceback
from typing import Any, NamedTuple, Optional, Protocol

from mcp import openapi_schema
from mcp.__version__ import __version__ as API_VERSION
from utils.error_handling import ErrorCategory, categorize_error, format_error
from utils.logging import log_message
from utils.result import error_result
from utils.types import LogLevel, Result


@dataclass
class RouteDefinition:
	"""Definition of an API route extracted from OpenAPI schema"""

	method: str
	path_pattern: str
	operation_id: str
	parameters: list[dict[str, Any]] = field(default_factory=list)
	has_request_body: bool = False


class RouteMatch(NamedTuple):
	"""Result of matching a request path to a route"""

	route: RouteDefinition
	path_params: dict[str, str]


def load_schema(schema_path: str = None) -> dict[str, Any]:
	"""
	Load OpenAPI schema from preloaded global variable
	"""
	if openapi_schema:
		schema_version = "unknown"
		try:
			if isinstance(openapi_schema, dict):
				schema_version = openapi_schema.get("info", {}).get("version", schema_version)
		except Exception:
			schema_version = "unknown"

		log_message(
			f"Using preloaded OpenAPI schema (Python API version: {API_VERSION}, schema info version: {schema_version})",
			LogLevel.INFO,
		)
		return openapi_schema
	else:
		log_message("OpenAPI schema not available", LogLevel.ERROR)
		return {"paths": {}}


def extract_routes(schema: dict[str, Any] = None) -> list[RouteDefinition]:
	"""
	Extract route definitions from OpenAPI schema

	Args:
	    schema: Parsed OpenAPI schema (optional, loaded from file if None)

	Returns:
	    List of RouteDefinition objects
	"""
	if schema is None:
		schema = load_schema()

	routes = []

	for path, path_item in schema.get("paths", {}).items():
		for method, operation in path_item.items():
			if method.upper() not in [
				"GET",
				"POST",
				"PUT",
				"DELETE",
				"PATCH",
				"OPTIONS",
			]:
				continue

			operation_id = operation.get("operationId")
			if not operation_id:
				log_message(
					f"Operation without operationId at {method.upper()} {path}",
					LogLevel.WARNING,
				)
				continue

			route = RouteDefinition(
				method=method.upper(),
				path_pattern=path,
				operation_id=operation_id,
				parameters=operation.get("parameters", []),
				has_request_body="requestBody" in operation,
			)
			routes.append(route)

	return routes


def match_route(
	method: str, path: str, routes: list[RouteDefinition]
) -> Optional[RouteMatch]:
	"""
	Match request method and path to a route definition

	Args:
	    method: HTTP method of the request (GET, POST, etc.)
	    path: URL path of the request
	    routes: List of route definitions to match against

	Returns:
	    RouteMatch if a matching route is found, None otherwise
	"""
	for route in routes:
		if route.method == method.upper() and route.path_pattern == path:
			return RouteMatch(route=route, path_params={})

	for route in routes:
		if route.method != method.upper():
			continue

		if "{" not in route.path_pattern:
			continue

		path_params = {}

		pattern_parts = route.path_pattern.split("/")
		path_parts = path.split("/")

		if len(pattern_parts) > len(path_parts) and all(
			"{" not in p for p in pattern_parts[len(path_parts) :]
		):
			continue

		match = True

		for i, (pattern_part, path_part) in enumerate(zip(pattern_parts, path_parts)):
			if not pattern_part and not path_part:
				continue

			if "{" in pattern_part and "}" in pattern_part:
				param_name = pattern_part[1:-1]

				if i == len(pattern_parts) - 1 and i < len(path_parts) - 1:
					param_value = "/".join([path_part] + path_parts[i + 1 :])
					path_params[param_name] = param_value
					match = True
					break
				else:
					path_params[param_name] = path_part
			elif pattern_part != path_part:
				match = False
				break

		if match and len(pattern_parts) <= len(path_parts):
			return RouteMatch(route=route, path_params=path_params)

	return None


class RequestHandler(Protocol):
	"""Protocol for request handlers"""

	def __call__(self, **kwargs) -> Result: ...


class OpenAPIRouter:
	"""
	Router that uses OpenAPI schema to route requests to appropriate handlers
	"""

	def __init__(self, load_schema: bool = True):
		"""
		Initialize the router

		Args:
		    load_schema: Whether to load routes from schema on initialization
		"""
		self.routes: list[RouteDefinition] = []
		self._handlers: dict[str, RequestHandler] = {}

		if load_schema:
			self.routes = extract_routes()
			log_message(
				f"Router initialized with {len(self.routes)} routes:", LogLevel.INFO
			)
			for route in self.routes:
				log_message(
					f"  {route.method} {route.path_pattern} -> {route.operation_id}",
					LogLevel.INFO,
				)
			self._routes_by_operation_id: dict[str, RouteDefinition] = {
				r.operation_id: r for r in self.routes
			}
		else:
			self._routes_by_operation_id: dict[str, RouteDefinition] = {}

	def register_handler(self, operation_id: str, handler: RequestHandler) -> None:
		"""
		Register a handler for an operation

		Args:
		    operation_id: Operation ID from OpenAPI schema
		    handler: Function to handle requests for this operation
		"""
		if operation_id not in self._routes_by_operation_id:
			log_message(
				f"Warning: operationId '{operation_id}' not found in schema",
				LogLevel.WARNING,
			)
		self._handlers[operation_id] = handler

	def route_request(
		self, method: str, path: str, query_params: dict[str, Any], body: Optional[str]
	) -> Result:
		"""
		Route a request to the appropriate handler based on method and path

		Args:
		    method: HTTP method of the request
		    path: URL path of the request
		    query_params: Dictionary of query parameters
		    body: Request body as string (if present)

		Returns:
		    Result of the handler execution
		"""
		try:
			match = match_route(method, path, self.routes)
			if not match:
				error_msg = f"No route matched for {method} {path}"
				log_message(error_msg, LogLevel.WARNING)
				return error_result(
					format_error(error_msg, ErrorCategory.NOT_FOUND),
					{"errorCategory": ErrorCategory.NOT_FOUND},
				)

			handler = self._handlers.get(match.route.operation_id)
			if not handler:
				error_msg = f"No handler registered for {method} {path} (operation: {match.route.operation_id})"
				log_message(error_msg, LogLevel.ERROR)
				return error_result(
					format_error(error_msg, ErrorCategory.INTERNAL),
					{"errorCategory": ErrorCategory.INTERNAL},
				)

			params = {**match.path_params, **query_params}

			if method.upper() in ["POST", "PUT", "PATCH"] and body:
				params["body"] = body

			return handler(**params)

		except TypeError as e:
			error_msg = f"Handler argument mismatch: {str(e)}"
			log_message(error_msg, LogLevel.ERROR)
			log_message(traceback.format_exc(), LogLevel.DEBUG)
			return error_result(
				format_error(error_msg, ErrorCategory.VALIDATION),
				{"errorCategory": ErrorCategory.VALIDATION},
			)
		except Exception as e:
			error_msg = f"Handler execution error: {str(e)}"
			error_category = categorize_error(e)
			log_message(error_msg, LogLevel.ERROR)
			log_message(traceback.format_exc(), LogLevel.DEBUG)
			return error_result(
				format_error(error_msg, error_category),
				{"errorCategory": error_category},
			)
