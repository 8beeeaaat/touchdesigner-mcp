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
# Cached on main thread — heartbeat must NEVER call td.project / op
_cached_state_path: Optional[str] = None
_cached_hub_url: Optional[str] = None
_cached_target_id: Optional[str] = None
_cached_project_name: Optional[str] = None
_cached_project_folder: Optional[str] = None
_cached_listen_port: Optional[int] = None
_cached_register_payload: Optional[dict[str, Any]] = None


def _td() -> Any:
	import td

	return td


def status() -> str:
	return _last_status


def set_status(msg: str) -> None:
	global _last_status
	_last_status = msg
	print(f"tdmcp_hub: {msg}")
	try:
		from utils import tdmcp_status

		tdmcp_status.record("hub", msg)
	except Exception:
		pass


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


def cache_state_path(
	state_path: str,
	hub_url: Optional[str] = None,
	target_id: Optional[str] = None,
	project_name: Optional[str] = None,
	project_folder: Optional[str] = None,
	listen_port: Optional[int] = None,
) -> None:
	"""MAIN THREAD: freeze paths/ids so worker threads never touch OPShortcut."""
	global _cached_state_path, _cached_hub_url, _cached_target_id
	global _cached_project_name, _cached_project_folder, _cached_listen_port
	_cached_state_path = state_path
	if hub_url:
		_cached_hub_url = str(hub_url).rstrip("/")
	if target_id:
		_cached_target_id = str(target_id)
	if project_name is not None:
		_cached_project_name = str(project_name)
	if project_folder is not None:
		_cached_project_folder = str(project_folder)
	if listen_port is not None:
		_cached_listen_port = int(listen_port)


def _read_state_dict() -> dict:
	"""Worker-safe when `_cached_state_path` is set. Never calls td.project."""
	path = _cached_state_path
	if not path or not os.path.isfile(path):
		return {}
	try:
		with open(path, encoding="utf-8") as f:
			data = json.load(f)
		return data if isinstance(data, dict) else {}
	except Exception:
		return {}


def hub_url_from_state() -> str:
	if _cached_hub_url:
		return _cached_hub_url
	data = _read_state_dict()
	raw = data.get("hubUrl") or data.get("hub_url")
	if raw:
		return str(raw).rstrip("/")
	return os.environ.get("TDMCP_HUB_URL", HUB_DEFAULT_URL).rstrip("/")


def target_id_from_state() -> Optional[str]:
	if _cached_target_id:
		return _cached_target_id
	data = _read_state_dict()
	tid = data.get("targetId")
	return str(tid) if tid else None


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
	"""
	Prefer cached plain strings (worker-safe). Touching td.project / WebServer
	ops is MAIN THREAD only and only when caches are empty.
	"""
	global _cached_register_payload
	if (
		_cached_register_payload is not None
		and peer_id is None
		and port is None
		and webserver is None
	):
		# Refresh pid only (pure Python)
		payload = dict(_cached_register_payload)
		payload["osPid"] = int(os.getpid())
		return payload

	listen = port if port is not None else _cached_listen_port
	if listen is None and webserver is not None:
		# Main-thread path with explicit webserver
		listen = _read_listen_port(webserver)
	if listen is None:
		listen = 9981

	tid = peer_id or target_id_from_state() or "lab"
	name = _cached_project_name or ""
	folder = _cached_project_folder or ""

	if not name or not folder:
		# MAIN THREAD fallback — do not call from heartbeat thread
		try:
			td = _td()
			name = name or str(td.project.name)
			folder = folder or str(td.project.folder)
		except Exception:
			pass

	if tid.startswith("owned-") is False and not target_id_from_state():
		if "expe_baseline" in name or tid == "lab":
			tid = "lab"

	payload: dict[str, Any] = {
		"id": tid,
		"host": "http://127.0.0.1",
		"port": int(listen),
		"label": tid,
		"source": "registered",
		"osPid": int(os.getpid()),
	}
	if name:
		payload["projectName"] = name
	if folder:
		payload["projectFolder"] = folder
	_cached_register_payload = dict(payload)
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
		# Rate-limited inside tdmcp_status.record — keeps long sessions quiet
		try:
			from utils import tdmcp_status

			tdmcp_status.record("hub", "heartbeat ok")
		except Exception:
			pass
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
	Call from tdmcp_port_onstart after apply_tdmcp_port (MAIN THREAD).
	Always starts heartbeat so a failed first register still retries.
	"""
	if _paused:
		set_status("paused — skip register")
		return False

	# Freeze identity on main before any worker starts
	try:
		td = _td()
		folder = str(td.project.folder)
		name = str(td.project.name)
		state_path = os.path.join(folder, ".tdmcp", "state.json")
		listen = _read_listen_port(webserver)
		data = {}
		if os.path.isfile(state_path):
			try:
				with open(state_path, encoding="utf-8") as f:
					raw = json.load(f)
				if isinstance(raw, dict):
					data = raw
			except Exception:
				pass
		cache_state_path(
			state_path,
			hub_url=str(data.get("hubUrl") or data.get("hub_url") or HUB_DEFAULT_URL),
			target_id=str(data.get("targetId") or "") or None,
			project_name=name,
			project_folder=folder,
			listen_port=listen if listen is not None else 9981,
		)
		# Pre-build payload so heartbeat re-register never touches ops
		build_register_payload(webserver=webserver)
	except Exception as e:
		set_status(f"cache snapshot failed: {e}")

	base = hub_url_from_state()
	ensure_hub(hub_dir=hub_dir, base_url=base)
	if not health_ok(base):
		set_status("hub unreachable — will retry via heartbeat path")
	ok = register(webserver=webserver, base_url=base)
	# Always start heartbeat so register failures are not silent-death
	start_heartbeat()
	return ok
