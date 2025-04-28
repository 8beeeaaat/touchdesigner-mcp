"""
Error handling utilities for TouchDesigner MCP Web server
Provides standardized error categorization, formatting, and handling
"""

import functools
import traceback
from enum import Enum
from typing import Callable, Optional, TypeVar

from utils.logging import log_message
from utils.result import Result, error_result
from utils.types import LogLevel

T = TypeVar("T")


class ErrorCategory(Enum):
    """
    Error categories for better classification and handling
    """

    INTERNAL = "INTERNAL"
    VALIDATION = "VALIDATION"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION = "PERMISSION"
    NETWORK = "NETWORK"
    EXTERNAL = "EXTERNAL"

    def __str__(self) -> str:
        return self.value


def categorize_error(exception: Exception) -> ErrorCategory:
    """
    Categorize an exception based on its type and message

    Args:
        exception: The exception to categorize

    Returns:
        Appropriate ErrorCategory
    """
    error_message = str(exception).lower()

    if isinstance(exception, ValueError):
        return ErrorCategory.VALIDATION
    elif isinstance(exception, FileNotFoundError):
        return ErrorCategory.NOT_FOUND
    elif "not found" in error_message or "doesn't exist" in error_message:
        return ErrorCategory.NOT_FOUND
    elif "permission" in error_message or "access denied" in error_message:
        return ErrorCategory.PERMISSION
    elif "network" in error_message or "connection" in error_message:
        return ErrorCategory.NETWORK
    elif "external" in error_message or "service unavailable" in error_message:
        return ErrorCategory.EXTERNAL

    return ErrorCategory.INTERNAL


def format_error(message: str, category: Optional[ErrorCategory] = None) -> str:
    """
    Format an error message with its category

    Args:
        message: The error message
        category: Error category (defaults to INTERNAL)

    Returns:
        Formatted error message
    """
    if category is None:
        category = ErrorCategory.INTERNAL

    return f"{category}: {message}"


def handle_service_errors(func: Callable[..., Result]) -> Callable[..., Result]:
    """
    Decorator to handle errors in service methods and convert them to Result type

    Args:
        func: The service method to decorate

    Returns:
        Wrapped function that catches exceptions and returns Result
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Result:
        try:
            return func(*args, **kwargs)
        except Exception as e:
            category = categorize_error(e)

            func_name = func.__name__
            log_message(f"Error in {func_name}: {str(e)}", LogLevel.ERROR)
            log_message(traceback.format_exc(), LogLevel.DEBUG)

            error_message = format_error(str(e), category)
            return error_result(error_message, {"errorCategory": category})

    return wrapper
