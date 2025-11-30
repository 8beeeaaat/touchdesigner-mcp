"""
Type definitions module for TouchDesigner MCP Web server
Defines Result and APIResponse types
"""

from typing import Any, TypedDict


class Result(TypedDict, total=False):
	"""Type representing operation results (equivalent to TypeScript Result pattern)"""

	success: bool
	data: Any  # Data when successful
	error: Any  # Error information when failed


class APIResponse(TypedDict, total=False):
	"""Type representing API responses"""

	statusCode: int
	statusReason: str
	data: str  # JSON string
	content_type: str
	headers: dict[str, str]


class LogLevel:
	"""Log level definitions"""

	DEBUG = "DEBUG"
	INFO = "INFO"
	WARNING = "WARNING"
	ERROR = "ERROR"
