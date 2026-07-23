"""
tdmcp-hub client for TouchDesigner bridge (register + heartbeat + optional spawn).

See tools/touchdesigner-mcp/docs/hub.md.
"""

from __future__ import annotations

import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Optional

HUB_DEFAULT_URL = "http://127.0.0.1:9980"
HUB_APP = "tdmcp-hub"

# Module state for Pause / heartbeat thread
_paused = False
_heartbeat_stop = threading.Event()
_heartbeat_thread: Optional[threading.Thread] = None
_last_status = ""
_peer_id: Optional[str] = None


def _td() -> Any:
	import td

	return td


def status() -> str:
	return _last_status


def set_status(msg: str) -> None:
	global _last_status
	_last_status = msg
	print(f"tdmcp_hub: {msg}")


def is_paused() -> bool:
	return _paused


def pause() -> None:
	"""Stop heartbeat/retry loop and clear status feedback."""
	global _paused
	_paused = True
	_heartbeat_stop.set()
	set_status("paused")


def resume() -> None:
	global _paused
	_paused = False
	_heartbeat_stop.clear()
	set_status("resumed")


def hub_url_from_state() -> str:
	try:
		folder = _td().project.folder
		path = os.path.join(folder, ".tdmcp", "state.json")
		if os.path.isfile(path):
			with open(path, encoding="utf-8") as f:
				data = json.load(f)
			raw = data.get("hubUrl") or data.get("hub_url")
			if raw:
				return str(raw).rstrip("/")
	except Exception:
		pass
	return os.environ.get("TDMCP_HUB_URL", HUB_DEFAULT_URL).rstrip("/")


def target_id_from_state() -> Optional[str]:
	try:
		folder = _td().project.folder
		path = os.path.join(folder, ".tdmcp", "state.json")
		if os.path.isfile(path):
			with open(path, encoding="utf-8") as f:
				data = json.load(f)
			tid = data.get("targetId")
			return str(tid) if tid else None
	except Exception:
		pass
	return None


def _http_json(method: str, url: str, body: Optional[dict] = None, timeout: float = 2.0) -> Any:
	data = None
	headers = {}
	if body is not None:
		data = json.dumps(body).encode("utf-8")
		headers["Content-Type"] = "application/json"
	req = urllib.request.Request(url, data=data, headers=headers, method=method)
	with urllib.request.urlopen(req, timeout=timeout) as resp:
		raw = resp.read().decode("utf-8")
		return json.loads(raw) if raw else None


def health_ok(base_url: Optional[str] = None) -> bool:
	base = (base_url or hub_url_from_state()).rstrip("/")
	try:
		doc = _http_json("GET", f"{base}/health", timeout=0.8)
		return bool(doc and doc.get("app") == HUB_APP and doc.get("ok"))
	except Exception:
		return False


def ensure_hub(hub_dir: Optional[str] = None, base_url: Optional[str] = None) -> bool:
	"""Health-check hub; if down and hub_dir set, spawn `node dist/hub.js` detached."""
	base = (base_url or hub_url_from_state()).rstrip("/")
	if health_ok(base):
		set_status("hub running")
		return True
	if not hub_dir:
		set_status("hub down (no Hubdir to spawn)")
		return False
	hub_js = os.path.join(hub_dir, "dist", "hub.js")
	if not os.path.isfile(hub_js):
		set_status(f"hub.js missing: {hub_js}")
		return False
	node = os.environ.get("NODE_BINARY") or "node"
	flags = 0
	kwargs: dict[str, Any] = dict(
		args=[node, hub_js],
		cwd=hub_dir,
		stdin=subprocess.DEVNULL,
		stdout=subprocess.DEVNULL,
		stderr=subprocess.DEVNULL,
		close_fds=True,
	)
	if os.name == "nt":
		# DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW
		flags = 0x00000008 | 0x00000200 | 0x08000000
		kwargs["creationflags"] = flags
	else:
		kwargs["start_new_session"] = True
	try:
		subprocess.Popen(**kwargs)
	except Exception as e:
		set_status(f"spawn failed: {e}")
		return False
	deadline = time.time() + 15
	while time.time() < deadline:
		if health_ok(base):
			set_status("hub spawned")
			return True
		time.sleep(0.25)
	set_status("hub spawn timed out")
	return False


def _read_listen_port(webserver: Any = None) -> Optional[int]:
	from utils.apply_tdmcp_port import _bridge_root, _read_current_port, find_webserver

	ws = find_webserver(webserver)
	root = _bridge_root(ws)
	return _read_current_port(root, ws)


def build_register_payload(
	peer_id: Optional[str] = None,
	port: Optional[int] = None,
	webserver: Any = None,
) -> dict[str, Any]:
	td = _td()
	listen = port if port is not None else _read_listen_port(webserver)
	if listen is None:
		listen = 9981
	tid = peer_id or target_id_from_state() or "lab"
	# Monorepo / default lab toe without state → register as lab
	if tid.startswith("owned-") is False and not target_id_from_state():
		# Prefer lab when no state file
		name = ""
		try:
			name = str(td.project.name)
		except Exception:
			pass
		if "expe_baseline" in name or tid == "lab":
			tid = "lab"
	payload: dict[str, Any] = {
		"id": tid,
		"host": "http://127.0.0.1",
		"port": int(listen),
		"label": tid,
		"source": "registered",
	}
	try:
		payload["projectName"] = str(td.project.name)
		payload["projectFolder"] = str(td.project.folder)
		payload["osPid"] = int(os.getpid())
	except Exception:
		pass
	return payload


def register(
	peer_id: Optional[str] = None,
	port: Optional[int] = None,
	webserver: Any = None,
	base_url: Optional[str] = None,
) -> bool:
	global _peer_id
	if _paused:
		return False
	base = (base_url or hub_url_from_state()).rstrip("/")
	payload = build_register_payload(peer_id, port, webserver)
	try:
		_http_json("POST", f"{base}/peers/register", payload, timeout=2.0)
		_peer_id = payload["id"]
		set_status(f"registered {_peer_id} @{payload['port']}")
		return True
	except Exception as e:
		set_status(f"register failed: {e}")
		return False


def heartbeat(base_url: Optional[str] = None) -> bool:
	if _paused or not _peer_id:
		return False
	base = (base_url or hub_url_from_state()).rstrip("/")
	try:
		_http_json("POST", f"{base}/peers/heartbeat", {"id": _peer_id}, timeout=1.5)
		return True
	except Exception as e:
		set_status(f"heartbeat failed: {e}")
		return False


def _heartbeat_loop(interval_s: float = 15.0) -> None:
	while not _heartbeat_stop.wait(interval_s):
		if _paused:
			continue
		if not heartbeat():
			# try re-register
			register()


def start_heartbeat(interval_s: float = 15.0) -> None:
	global _heartbeat_thread
	_heartbeat_stop.clear()
	if _heartbeat_thread and _heartbeat_thread.is_alive():
		return
	_heartbeat_thread = threading.Thread(
		target=_heartbeat_loop, args=(interval_s,), daemon=True, name="tdmcp-hub-hb"
	)
	_heartbeat_thread.start()


def stop_heartbeat() -> None:
	_heartbeat_stop.set()


def on_bridge_ready(
	hub_dir: Optional[str] = None,
	webserver: Any = None,
) -> bool:
	"""
	Ensure hub (optional spawn), register this TD peer, start heartbeat.
	Call from tdmcp_port_onstart after apply_tdmcp_port.
	"""
	if _paused:
		set_status("paused — skip register")
		return False
	base = hub_url_from_state()
	ensure_hub(hub_dir=hub_dir, base_url=base)
	if not health_ok(base):
		set_status("hub unreachable — will retry via heartbeat path")
		# still try register later
	ok = register(webserver=webserver, base_url=base)
	if ok:
		start_heartbeat()
	return ok
