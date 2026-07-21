"""
Apply WebServer DAT port from project.folder/.tdmcp/state.json if present.
Attach as an Execute DAT onStart (or call from mcp_webserver_base startup).

Usage inside TD (relative to the bridge COMP):
  import apply_tdmcp_port
  apply_tdmcp_port.apply(op('webserver_dat'))  # or discover sibling WebServer DAT
"""

from __future__ import annotations

import json
import os
from typing import Any


def _state_path() -> str | None:
	try:
		folder = project.folder  # type: ignore[name-defined]
	except Exception:
		return None
	path = os.path.join(folder, ".tdmcp", "state.json")
	return path if os.path.isfile(path) else None


def read_port() -> int | None:
	path = _state_path()
	if not path:
		return None
	try:
		with open(path, encoding="utf-8") as f:
			data = json.load(f)
		port = int(data.get("port"))
		return port if port > 0 else None
	except Exception as e:
		print(f"tdmcp: failed to read state.json: {e}")
		return None


def apply(webserver: Any | None = None) -> int | None:
	"""Set webserver.par.port from .tdmcp/state.json. Returns applied port or None."""
	port = read_port()
	if port is None:
		return None
	ws = webserver
	if ws is None:
		# Prefer a WebServer DAT named webserver_dat under the calling COMP's parent
		try:
			me = op(".").parent()  # type: ignore[name-defined]
			ws = me.op("webserver_dat") or me.findChildren(type=webserverDAT, maxDepth=2)  # type: ignore[name-defined]
			if isinstance(ws, list):
				ws = ws[0] if ws else None
		except Exception:
			ws = None
	if ws is None:
		print(f"tdmcp: port {port} in state.json but no WebServer DAT found")
		return None
	try:
		ws.par.port = port
		print(f"tdmcp: WebServer port set to {port}")
	except Exception as e:
		print(f"tdmcp: failed to set port {port}: {e}")
		return None
	return port
