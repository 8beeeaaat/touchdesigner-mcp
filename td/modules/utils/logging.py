"""
Logging module for TouchDesigner MCP Web server
"""

from datetime import datetime
import sys
from typing import TextIO

from utils.types import LogLevel

from .config import DEBUG


def _safe_write(stream: TextIO | None, message: str) -> bool:
	"""Attempt to write to the provided stream while swallowing blocking errors."""

	if stream is None:
		return False

	try:
		if not message.endswith("\n"):
			stream.write(f"{message}\n")
		else:
			stream.write(message)
		stream.flush()
		return True
	except BlockingIOError:
		return False
	except Exception:
		return False


def log_message(message: str, level: LogLevel = LogLevel.INFO) -> None:
	"""Log a message using the appropriate logging mechanism"""

	if not DEBUG and level == LogLevel.DEBUG:
		return

	time_stamp = datetime.now().strftime("%Y%m%d_%H:%M:%S.%f")[
		:-3
	] + datetime.now().strftime("%z")
	prefix = f"{time_stamp} [{level}]"
	full_message = f"{prefix}\t{message}"

	# TouchDesigner replaces stdout/stderr with a catcher that can raise BlockingIOError
	# when its pipe is saturated. Try stdout first, then fall back to the original streams.
	if _safe_write(sys.stdout, full_message):
		return

	# Attempt fallbacks captured by the TD runtime if available.
	if _safe_write(getattr(sys, "__stdout__", None), full_message):
		return
	_safe_write(getattr(sys, "__stderr__", None), full_message)
