"""
Result pattern utilities for TouchDesigner MCP Web server
Provides utility functions for handling success and failure results
"""

from typing import Any, Dict, Optional

from .types import Result


def success_result(data: Any) -> Result:
    """
    Create a success result with data

    Args:
        data: The success result data

    Returns:
        Result dictionary with success flag and data
    """
    return {"success": True, "data": data, "error": None}


def error_result(message: str, metadata: Optional[Dict[str, Any]] = None) -> Result:
    """
    Create an error result with message and optional metadata

    Args:
        message: The error message
        metadata: Optional additional error metadata

    Returns:
        Result dictionary with error information
    """
    result = {"success": False,"data": None,  "error": message}

    if metadata:
        result.update(metadata)

    return result
