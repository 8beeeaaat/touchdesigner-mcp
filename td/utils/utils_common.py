"""
Common utility module
Unified interfaces and utility functions based on design pattern principles
"""

import abc
import json
import traceback
from typing import Any, Callable, Dict, Generic, Optional, TypeVar, Union

T = TypeVar("T")
E = TypeVar("E")


class Result(Generic[T, E]):
    @classmethod
    def ok(cls, data: Optional[T] = None) -> "Result[T, E]":
        return cls(True, data=data)

    @classmethod
    def fail(cls, error: E) -> "Result[T, E]":
        return cls(False, error=error)

    def __init__(
        self, success: bool, data: Optional[T] = None, error: Optional[E] = None
    ):
        self.success = success
        self.data = data
        self.error = error

    def __str__(self) -> str:
        if self.success:
            return f"Success: {self.data}"
        else:
            return f"Error: {self.error}"


class LogLevel:
    DEBUG = 0
    INFO = 1
    WARNING = 2
    ERROR = 3


class ILogger:

    def debug(self, message: str, **kwargs) -> None:
        pass

    def info(self, message: str, **kwargs) -> None:
        pass

    def warning(self, message: str, **kwargs) -> None:
        pass

    def error(
        self, message: str, exception: Optional[Exception] = None, **kwargs
    ) -> None:
        pass

    def log(
        self, message: str, level: Union[LogLevel, int] = LogLevel.INFO, **kwargs
    ) -> None:
        if level == LogLevel.DEBUG or level == 0:
            self.debug(message, **kwargs)
        elif level == LogLevel.INFO or level == 1:
            self.info(message, **kwargs)
        elif level == LogLevel.WARNING or level == 2:
            self.warning(message, **kwargs)
        elif level == LogLevel.ERROR or level == 3:
            self.error(message, **kwargs)


class SimpleLogger(ILogger):

    def debug(self, message: str, **kwargs) -> None:
        print(f"[DEBUG] {message}")

    def info(self, message: str, **kwargs) -> None:
        print(f"[INFO] {message}")

    def warning(self, message: str, **kwargs) -> None:
        print(f"[WARNING] {message}")

    def error(
        self, message: str, exception: Optional[Exception] = None, **kwargs
    ) -> None:
        print(f"[ERROR] {message}")
        if exception:
            print(traceback.format_exc())


def execute_with_result(func: Callable, *args, **kwargs) -> Result:
    try:
        result = func(*args, **kwargs)
        return Result.ok(result)
    except Exception as e:
        return Result.fail(str(e))


def create_error_response(status_code: int, message: str) -> Dict[str, Any]:
    reasons = {
        400: "Bad Request",
        404: "Not Found",
        405: "Method Not Allowed",
        500: "Internal Server Error",
    }
    status_reason = reasons.get(status_code, "Unknown")

    return {
        "statusCode": status_code,
        "statusReason": status_reason,
        "data": json.dumps({"error": message}),
    }


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

    if hasattr(obj, "eval") and callable(getattr(obj, "eval")):
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


def get_request_path(request: Dict[str, Any]) -> str:
    if hasattr(request, "get") and callable(getattr(request, "get")):
        return request.get("uri") or request.get("path") or ""
    return request.get("uri", request.get("path", ""))


class IRequestHandler(abc.ABC):

    @abc.abstractmethod
    def handle(
        self,
        request: Dict[str, Any],
        response: Dict[str, Any],
        match: Optional[Any] = None,
    ) -> Any:
        pass


class BaseRequestHandler(IRequestHandler):
    def __init__(self, logger: Optional[Callable] = None):
        self.logger = logger

    def log(self, message: str, level: str = "INFO") -> None:
        if self.logger:
            if hasattr(self.logger, level.lower()):
                getattr(self.logger, level.lower())(message)
            elif callable(self.logger):
                self.logger(f"[{level}] {message}")

    def handle(
        self,
        request: Dict[str, Any],
        response: Dict[str, Any],
        match: Optional[Any] = None,
    ) -> Any:
        try:
            self.pre_process(request, response, match)

            result = self.process(request, response, match)

            self.post_process(request, response, match, result)

            return result
        except Exception as e:
            return self.handle_error(e, request, response, match)

    def pre_process(
        self, request: Dict[str, Any], response: Dict[str, Any], match: Optional[Any]
    ) -> None:
        pass

    @abc.abstractmethod
    def process(
        self, request: Dict[str, Any], response: Dict[str, Any], match: Optional[Any]
    ) -> Any:
        pass

    def post_process(
        self,
        request: Dict[str, Any],
        response: Dict[str, Any],
        match: Optional[Any],
        result: Any,
    ) -> None:
        pass

    def handle_error(
        self,
        error: Exception,
        request: Dict[str, Any],
        response: Dict[str, Any],
        match: Optional[Any],
    ) -> None:
        if self.logger:
            self.log(f"Error in handler: {error}", "ERROR")

        response.update(create_error_response(500, str(error)))
        return None


def init(logger=None):

    global _logger
    if logger:
        if isinstance(logger, ILogger):
            _logger = logger
        elif callable(logger):

            class FunctionLogger(ILogger):
                def debug(self, message, **kwargs):
                    logger(message, level="DEBUG", **kwargs)

                def info(self, message, **kwargs):
                    logger(message, level="INFO", **kwargs)

                def warning(self, message, **kwargs):
                    logger(message, level="WARNING", **kwargs)

                def error(self, message, exception=None, **kwargs):
                    logger(message, level="ERROR", **kwargs)
                    if exception:
                        logger(str(exception), level="ERROR", **kwargs)

                def log(self, message, level=LogLevel.INFO, **kwargs):
                    level_str = "INFO"
                    if level == LogLevel.DEBUG or level == 0:
                        level_str = "DEBUG"
                    elif level == LogLevel.WARNING or level == 2:
                        level_str = "WARNING"
                    elif level == LogLevel.ERROR or level == 3:
                        level_str = "ERROR"
                    logger(message, level=level_str, **kwargs)

            _logger = FunctionLogger()
    else:
        _logger = SimpleLogger()

    return {
        "Result": Result,
        "execute_with_result": execute_with_result,
        "create_error_response": create_error_response,
        "safe_serialize": safe_serialize,
        "get_request_path": get_request_path,
        "logger": _logger,
        "LogLevel": LogLevel,
    }


_logger = SimpleLogger()

__all__ = [
    "Result",
    "ILogger",
    "SimpleLogger",
    "LogLevel",
    "execute_with_result",
    "create_error_response",
    "safe_serialize",
    "get_request_path",
    "init",
]
