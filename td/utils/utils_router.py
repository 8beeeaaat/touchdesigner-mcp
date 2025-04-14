import re
import traceback
from typing import Any, Callable, Dict, List, Optional, Pattern, Tuple, Union

try:
    common_module = op("utils_common").module if op("utils_common") else None
    if common_module:
        Result = common_module.Result
        ILogger = common_module.ILogger
        LogLevel = common_module.LogLevel
        IRequestHandler = common_module.IRequestHandler
        create_error_response = common_module.create_error_response
        safe_serialize = common_module.safe_serialize
        get_request_path = common_module.get_request_path

except ImportError:
    print(f"[ERROR] Failed to load modules")

except Exception as e:
    print(f"[ERROR] Failed to load modules: {e}")
    traceback.print_exc()


class FunctionHandlerAdapter(IRequestHandler):

    def __init__(
        self, handler_func: Callable, logger: Optional[Union[ILogger, Callable]] = None
    ):
        self.handler_func = handler_func
        self.logger = logger

    def log(self, message: str, level: str = "INFO") -> None:
        if self.logger:
            if isinstance(self.logger, ILogger):
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
            from inspect import signature

            sig = signature(self.handler_func)
            param_count = len(sig.parameters)

            if param_count == 2:
                return self.handler_func(request, response)
            else:
                return self.handler_func(request, response, match)
        except Exception as e:
            if self.logger:
                self.log(f"Error in handler {self.handler_func.__name__}: {e}", "ERROR")
                self.log(traceback.format_exc(), "ERROR")
            response.update(create_error_response(500, str(e)))
            return None


class Router:

    def __init__(
        self,
        logger: Optional[Union[ILogger, Callable]] = None,
    ):

        self.routes = {
            "GET": [],
            "POST": [],
            "PATCH": [],
            "DELETE": [],
        }
        self.logger = logger or print

    def log(self, message: str, level: str = "INFO") -> None:
        if isinstance(self.logger, ILogger):
            if level == "DEBUG":
                self.logger.debug(message)
            elif level == "WARNING":
                self.logger.warning(message)
            elif level == "ERROR":
                self.logger.error(message)
            else:
                self.logger.info(message)
        elif callable(self.logger):
            self.logger(f"[{level}] {message}")

    def add_route(
        self,
        method: str,
        pattern: Union[str, Pattern],
        handler: Union[IRequestHandler, Callable],
    ) -> None:
        if method not in self.routes:
            self.routes[method] = []

        if isinstance(pattern, str):
            pattern = re.compile(pattern)

        if not isinstance(handler, IRequestHandler) and callable(handler):
            handler = FunctionHandlerAdapter(handler, self.logger)

        self.routes[method].append((pattern, handler))
        handler_name = (
            handler.__class__.__name__
            if isinstance(handler, IRequestHandler)
            else handler.__name__
        )
        self.log(f"Route added: {method} {pattern.pattern} -> {handler_name}")

    def match_route(
        self, method: str, path: str
    ) -> Optional[Tuple[IRequestHandler, Any]]:
        if method not in self.routes:
            return None

        for pattern, handler in self.routes[method]:
            match = pattern.match(path)
            if match:
                return handler, match

        return None

    def route_request(
        self, request: Dict[str, Any], response: Dict[str, Any]
    ) -> Result:
        try:
            method = request.get("method", "GET")

            path = get_request_path(request)
            self.log(f"Routing {method} request for path: '{path}'")

            response["content-type"] = "application/json"

            route_match = self.match_route(method, path)

            if route_match:
                handler, match = route_match

                try:
                    if isinstance(handler, IRequestHandler):
                        handler_name = handler.__class__.__name__
                        self.log(f"Matched handler: {handler_name}")
                        result = handler.handle(request, response, match)
                    else:
                        handler_name = handler.__name__
                        self.log(f"Matched handler function: {handler_name}")
                        result = handler(request, response, match)
                    return Result.ok(result)
                except Exception as e:
                    handler_name = (
                        handler.__class__.__name__
                        if isinstance(handler, IRequestHandler)
                        else handler.__name__
                    )
                    self.log(f"Error in handler {handler_name}: {e}", "ERROR")
                    self.log(traceback.format_exc(), "ERROR")
                    response.update(create_error_response(500, str(e)))
                    return Result.fail(str(e))
            else:
                self.log(f"No route found for {method} {path}")
                response.update(create_error_response(404, f"Unknown endpoint: {path}"))
                return Result.fail(f"Unknown endpoint: {path}")
        except Exception as e:
            self.log(f"Unexpected error in router: {e}", "ERROR")
            self.log(traceback.format_exc(), "ERROR")
            response.update(create_error_response(500, str(e)))
            return Result.fail(str(e))


router = Router()


def init(logger_function: Optional[Callable] = None) -> Dict[str, Any]:

    global router
    if logger_function:
        router.logger = logger_function

    return {
        "router": router,
        "Router": Router,
        "Result": Result,
        "FunctionHandlerAdapter": FunctionHandlerAdapter,
    }


__all__ = [
    "router",
    "Router",
    "Result",
    "init",
    "FunctionHandlerAdapter",
]
