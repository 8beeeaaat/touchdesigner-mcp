import traceback
from enum import Enum
from typing import Optional, Union


class LogLevel(Enum):

    DEBUG = 0
    INFO = 1
    WARNING = 2
    ERROR = 3

    @classmethod
    def from_string(cls, level_str: str) -> "LogLevel":
        level_map = {
            "DEBUG": cls.DEBUG,
            "INFO": cls.INFO,
            "WARNING": cls.WARNING,
            "ERROR": cls.ERROR,
        }
        return level_map.get(level_str.upper(), cls.INFO)


class Logger:

    def __init__(self, min_level: LogLevel = LogLevel.INFO):
        self.min_level = min_level

    def log(
        self,
        message: str,
        level: Union[LogLevel, str] = LogLevel.INFO,
        exception: Optional[Exception] = None,
    ):
        if isinstance(level, str):
            level = LogLevel.from_string(level)

        if level.value < self.min_level.value:
            return

        prefix = f"[{level.name}]"
        print(f"{prefix} {message}")

        if exception and level.value >= LogLevel.ERROR.value:
            print(traceback.format_exc())

    def debug(self, message: str):
        self.log(message, LogLevel.DEBUG)

    def info(self, message: str):
        self.log(message, LogLevel.INFO)

    def warning(self, message: str):
        self.log(message, LogLevel.WARNING)

    def error(self, message: str, exception: Optional[Exception] = None):
        self.log(message, LogLevel.ERROR, exception)


logger = Logger()
