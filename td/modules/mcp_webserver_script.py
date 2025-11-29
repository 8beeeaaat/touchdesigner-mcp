"""
TouchDesigner MCP Web Server Script
Implements and handles API endpoints

This file serves as the entry point for modularized components in TouchDesigner.
Actual implementations are separated into modules within the mcp package.
"""

import traceback
from typing import Any

try:
	import import_modules

	import_modules.setup()
except Exception as e:
	print(f"[ERROR] Failed to setup modules: {str(e)}")


def onServerStart(webServerDAT):
	print("HTTP server started")
	"""Called when the web server starts"""
	print("======================================================")
	print("=========== HTTP SERVER STARTED ===========")
	print("======================================================")
	return


def onServerStop(webServerDAT):
	"""Called when the web server stops"""
	print("HTTP server stopped")
	return


class ModuleFactory:
	"""
	Factory for importing and providing MCP modules.
	Uses lazy loading and provides fallbacks for unavailable modules.
	"""

	def __init__(self):
		self._modules = {}
		self._import_status = {}

	def get_module(self, module_name: str) -> Any:
		"""Get a module by name with lazy loading"""
		if module_name not in self._modules:
			self._load_module(module_name)
		return self._modules.get(module_name)

	def is_module_available(self, module_name: str) -> bool:
		"""Check if a module is available"""
		if module_name not in self._import_status:
			self._load_module(module_name)
		return self._import_status.get(module_name, False)

	def _load_module(self, module_name: str) -> None:
		"""Load a module and track its import status"""
		try:
			module = __import__(module_name, fromlist=["*"])
			self._modules[module_name] = module
			self._import_status[module_name] = True
			print(f"MCP: Successfully loaded module: {module_name}")
		except ImportError as e:
			self._modules[module_name] = None
			self._import_status[module_name] = False
			print(f"MCP: Failed to import module {module_name}: {str(e)}")


class ControllerManager:
	"""
	Manages API controller with priority-based processing.
	Implements the Composite and Chain of Responsibility patterns.
	"""

	def __init__(self, module_factory: ModuleFactory):
		print("MCP: Initializing ControllerManager")
		from mcp.controllers.api_controller import api_controller_openapi

		self.module_factory = module_factory
		self.controller = api_controller_openapi

	def handle_request(
		self, webServerDAT: Any, request: dict[str, Any], response: dict[str, Any]
	) -> dict[str, Any]:
		"""
		Handle HTTP request with fallback chain
		"""

		try:
			if self.controller is None:
				print("[ERROR] Controller not initialized")
				response["statusCode"] = 500
				response["statusReason"] = "Server Error"
				response["body"] = '{"error": "Controller not initialized"}'
				return response
			return self.controller.onHTTPRequest(webServerDAT, request, response)
		except Exception as e:
			print(f"MCP: Error handling request: {str(e)}")
			traceback.print_exc()

		response["statusCode"] = 500
		response["statusReason"] = "Internal Server Error"
		response["headers"] = {"Content-Type": "application/json"}
		response["body"] = '{"error": "API controller failed to handle the request"}'
		return response


_module_factory = ModuleFactory()
_controller_manager = ControllerManager(_module_factory)


def onHTTPRequest(webServerDAT, request, response):
	"""
	HTTP request handler for TouchDesigner WebServerDAT

	Args:
	    webServerDAT: Reference to the WebServer DAT
	    request: Request object from WebServer DAT
	    response: Response object to be filled and returned

	Returns:
	    Completed response object
	"""
	return _controller_manager.handle_request(webServerDAT, request, response)


log_module = _module_factory.get_module("utils.logging")
if log_module:
	types_module = _module_factory.get_module("utils.types")
	log_level = types_module.LogLevel.INFO if types_module else "INFO"
	log_module.log_message("TouchDesigner MCP WebServer Script initialized", log_level)

print("TouchDesigner MCP WebServer Script (entry point) initialization completed")
