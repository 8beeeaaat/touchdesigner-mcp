"""
Apply WebServer DAT port from project.folder/.tdmcp/state.json if present.

Why: create_td_project assigns a free port (9984+) in .tdmcp/state.json so a
secondary TD can run beside lab (:9981). Without this, every toe keeps the
tox default port 9981 and collisions break multi-instance.

Call once on project start (Execute DAT onStart), or it is invoked from
mcp_webserver_script when the bridge loads.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional


def _state_path() -> Optional[str]:
	try:
		folder = project.folder  # type: ignore[name-defined]
	except Exception:
		return None
	path = os.path.join(folder, ".tdmcp", "state.json")
	return path if os.path.isfile(path) else None


def read_port() -> Optional[int]:
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


def find_webserver(hint: Any = None) -> Any:
	if hint is not None:
		return hint
	# Common layout: /project1/mcp_webserver_base/.../webserver*
	try:
		root = op("/project1/mcp_webserver_base")  # type: ignore[name-defined]
	except Exception:
		root = None
	if root is None:
		try:
			root = op("/project1")  # type: ignore[name-defined]
		except Exception:
			return None
	try:
		for child in root.findChildren(type=webserverDAT, maxDepth=4):  # type: ignore[name-defined]
			return child
	except Exception:
		pass
	return None


def apply(webserver: Any = None, restart: bool = True) -> Optional[int]:
	"""
	Set WebServer DAT port from .tdmcp/state.json.
	Returns the applied port, or None if no state file / no WebServer.
	If restart=True and the DAT was active, toggles active to rebind.
	"""
	port = read_port()
	if port is None:
		print("tdmcp: no .tdmcp/state.json port — leaving WebServer port unchanged")
		return None
	ws = find_webserver(webserver)
	if ws is None:
		print(f"tdmcp: port {port} in state.json but no WebServer DAT found")
		return None
	try:
		current = int(ws.par.port.eval())
	except Exception:
		current = None
	if current == port:
		print(f"tdmcp: WebServer already on port {port}")
		return port
	try:
		was_active = bool(ws.par.active.eval()) if hasattr(ws.par, "active") else False
		if was_active and restart:
			ws.par.active = False
		ws.par.port = port
		if was_active and restart:
			ws.par.active = True
		print(f"tdmcp: WebServer port set to {port} (was {current})")
	except Exception as e:
		print(f"tdmcp: failed to set port {port}: {e}")
		return None
	return port
