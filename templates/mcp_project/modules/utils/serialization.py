"""
TouchDesigner MCP Web Server Serialization Utilities
Provides JSON serialization functionality for objects
"""

from typing import Any


def safe_serialize(obj: Any) -> Any:
	if obj is None:
		return None

	if hasattr(obj, "__class__") and obj.__class__.__name__ == "Result":
		if hasattr(obj, "success") and hasattr(obj, "data") and hasattr(obj, "error"):
			result_dict = {"success": obj.success}
			if obj.success and obj.data is not None:
				result_dict["data"] = safe_serialize(obj.data)
			elif not obj.success and obj.error is not None:
				result_dict["error"] = str(obj.error)
			return result_dict
		else:
			return str(obj)

	if isinstance(obj, (int, float, bool, str)):
		return obj

	if isinstance(obj, (list, tuple)):
		return [safe_serialize(item) for item in obj]

	if isinstance(obj, dict):
		return {str(k): safe_serialize(v) for k, v in obj.items()}

	if hasattr(obj, "eval") and callable(obj.eval):
		try:
			val = obj.eval()
			if hasattr(val, "path") and callable(getattr(val, "path", None)):
				return val.path
			return val
		except:
			return str(obj)

	if hasattr(obj, "path") and callable(getattr(obj, "path", None)):
		return obj.path

	if hasattr(obj, "__class__") and obj.__class__.__name__ == "Page":
		return f"Page:{obj.name}" if hasattr(obj, "name") else str(obj)

	if hasattr(obj, "__dict__"):
		try:
			serialized_dict = {}
			for k, v in obj.__dict__.items():
				serialized_dict[k] = safe_serialize(v)
			return serialized_dict
		except:
			return str(obj)

	return str(obj)
