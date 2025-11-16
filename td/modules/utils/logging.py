"""
Logging module for TouchDesigner MCP Web server
"""

from datetime import datetime

from utils.types import LogLevel

from .config import DEBUG


def log_message(message: str, level: LogLevel = LogLevel.INFO) -> None:
    """Log a message using the appropriate logging mechanism"""

    if not DEBUG and level == LogLevel.DEBUG:
        return

    time_stamp = datetime.now().strftime("%Y%m%d_%H:%M:%S.%f")[
        :-3
    ] + datetime.now().strftime("%z")
    prefix = f"{time_stamp} [{level}]"
    full_message = f"{prefix}\t{message}"
    print(full_message)
