"""
Apply WebServer DAT port from project.folder/.tdmcp/state.json if present.

Why: create_td_project assigns a preferred listen port in .tdmcp/state.json so a
secondary TD can run beside lab (:9981). Identity is the hub peer id (tdmcp-hub
:9980); this module only rebinds the WebServer. Without this, every toe keeps the
tox default port 9981 and collisions break multi-instance.

Call once on project start (Execute DAT onStart), or it is invoked from
mcp_webserver_script when the bridge loads.

Note: this module is imported (not run as a DAT body), so TD names like
`project` / `op` are not in scope — use `td.project` / `td.op` instead.

Important: in mcp_webserver_base, the WebServer DAT `port` / `active` pars are
expression-bound to Parameter DAT → COMP custom Port/Active. Assigning
`webserver.par.port = …` directly can raise TD errors like
"float argument must not be none" when the expression cell is not ready.
Always drive the COMP custom `Port` (and restart via Active/Restart) instead.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional


def _td() -> Any:
	"""TouchDesigner injects project/op into DAT/script scopes, not importable modules."""
	import td

	return td


def _state_path() -> Optional[str]:
	try:
		folder = _td().project.folder
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
		raw = data.get("port")
		if raw is None:
			return None
		port = int(raw)
		return port if port > 0 else None
	except Exception as e:
		print(f"tdmcp: failed to read state.json: {e}")
		return None


def find_webserver(hint: Any = None) -> Any:
	if hint is not None:
		return hint
	td = _td()
	# Owned layout: /project1/tdmcp_bridge/... (legacy: mcp_webserver_base)
	root = None
	for path in ("/project1/tdmcp_bridge", "/project1/mcp_webserver_base"):
		try:
			root = td.op(path)
		except Exception:
			root = None
		if root is not None:
			break
	if root is None:
		try:
			root = td.op("/project1")
		except Exception:
			return None
	try:
		for child in root.findChildren(type=td.webserverDAT, maxDepth=4):
			return child
	except Exception:
		pass
	return None


def _bridge_root(webserver: Any = None) -> Any:
	"""COMP that owns custom Port/Active (parent of WebServer DAT when nested)."""
	td = _td()
	for path in ("/project1/tdmcp_bridge", "/project1/mcp_webserver_base"):
		try:
			root = td.op(path)
			if root is not None:
				return root
		except Exception:
			pass
	if webserver is not None:
		try:
			p = webserver.parent()
			if p is not None:
				return p
		except Exception:
			pass
	return None


def _read_current_port(root: Any, ws: Any) -> Optional[int]:
	for par in (
		getattr(getattr(root, "par", None), "Port", None),
		getattr(getattr(ws, "par", None), "port", None) if ws is not None else None,
	):
		if par is None:
			continue
		try:
			val = par.eval()
			if val is None:
				continue
			return int(val)
		except Exception:
			continue
	return None


def _set_port_on_bridge(root: Any, ws: Any, port: int, restart: bool) -> None:
	"""
	Prefer COMP custom Port (feeds Parameter DAT → WebServer expr).
	Fall back to clearing WebServer port expr only if no custom Port exists.
	"""
	port_par = getattr(getattr(root, "par", None), "Port", None) if root else None
	if port_par is not None:
		port_par.val = port
		active_par = getattr(root.par, "Active", None)
		restart_par = getattr(root.par, "Restart", None)
		# Always force Active on so the WebServer DAT expression becomes True
		if active_par is not None:
			try:
				active_par.val = True
			except Exception as e:
				print(f"tdmcp: failed to set Active: {e}")
		if restart and restart_par is not None and hasattr(restart_par, "pulse"):
			try:
				restart_par.pulse()
				return
			except Exception:
				pass
		if restart and active_par is not None:
			try:
				active_par.val = False
				active_par.val = True
			except Exception as e:
				print(f"tdmcp: Active toggle failed: {e}")
		return

	# Legacy: direct WebServer DAT port (constant mode only)
	if ws is None or not hasattr(ws.par, "port"):
		raise RuntimeError("no Port custom par and no WebServer DAT")
	ws_port = ws.par.port
	# Drop expression binding if present so assignment is a real constant
	try:
		if getattr(ws_port, "mode", None) is not None:
			import td

			ws_port.mode = td.ParMode.CONSTANT
	except Exception:
		try:
			ws_port.expr = ""
		except Exception:
			pass
	was_active = False
	try:
		was_active = bool(ws.par.active.eval()) if hasattr(ws.par, "active") else False
	except Exception:
		was_active = False
	if was_active and restart:
		ws.par.active = False
	ws.par.port.val = port
	if was_active and restart:
		ws.par.active = True


def apply(webserver: Any = None, restart: bool = True) -> Optional[int]:
	"""
	Set bridge port from .tdmcp/state.json.
	Returns the applied port, or None if no state file / no bridge.
	If restart=True, pulses Restart or toggles Active so the WebServer rebinds.
	"""
	port = read_port()
	if port is None:
		print("tdmcp: no .tdmcp/state.json port — leaving WebServer port unchanged")
		return None
	ws = find_webserver(webserver)
	root = _bridge_root(ws)
	if root is None and ws is None:
		print(f"tdmcp: port {port} in state.json but no tdmcp_bridge / WebServer found")
		return None
	current = _read_current_port(root, ws)
	if current == port:
		print(f"tdmcp: WebServer already on port {port}")
		return port
	try:
		_set_port_on_bridge(root, ws, port, restart)
		print(f"tdmcp: WebServer port set to {port} (was {current})")
	except Exception as e:
		print(f"tdmcp: failed to set port {port}: {e}")
		return None
	return port
