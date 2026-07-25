"""
tdmcp reverse-tunnel client (stdlib WebSocket) — MAIN-THREAD SAFE.

Hard rule (TD): never touch `op`, `td.project`, `OPShortcut`, or any OP from a
`threading.Thread`. The socket loop is a daemon thread and may only use:
  - plain Python / sockets / files via an absolute path snapshotted on main
  - enqueue request dicts for the main-thread Execute DAT drain

Do **not** call `process_pending()` via `td.run` from the worker: in current TD
builds that runs in a context that can read `td.app` but cannot touch `op` /
`project` (get_td_info works, exec_python_script fails).

All identity (`project.folder` / `project.name`) is snapshotted in
`on_bridge_ready` / `start` on the main thread before the worker starts.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import queue
import random
import socket
import struct
import threading
import traceback
from typing import Any, Optional
from urllib.parse import urlparse

_paused = False
_stop = threading.Event()
_thread: Optional[threading.Thread] = None
_last_status = ""
_send_lock = threading.Lock()
_ws_sock: Optional[socket.socket] = None
# (request_msg dict, sock) — drained only on main thread
_pending_main: "queue.Queue[tuple[dict, Any]]" = queue.Queue()

# Frozen on main thread before worker starts — NEVER holds OP references
_snapshot: dict[str, Any] = {}
_snapshot_lock = threading.Lock()


def _td() -> Any:
	"""Main-thread only."""
	import td

	return td


def status() -> str:
	return _last_status


def set_status(msg: str) -> None:
	global _last_status
	_last_status = msg
	print(f"tdmcp_tunnel: {msg}")
	try:
		from utils import tdmcp_status

		tdmcp_status.record("tunnel", msg)
	except Exception:
		pass


def is_paused() -> bool:
	return _paused


def pause() -> None:
	global _paused
	_paused = True
	_stop.set()
	_close_sock()
	set_status("paused")


def resume() -> None:
	global _paused
	_paused = False
	_stop.clear()
	set_status("resumed")


def _read_json_file(path: str) -> dict[str, Any]:
	try:
		with open(path, encoding="utf-8") as f:
			data = json.load(f)
		return data if isinstance(data, dict) else {}
	except Exception as e:
		print(f"tdmcp_tunnel: state read failed: {e}")
		return {}


def capture_snapshot_on_main() -> dict[str, Any]:
	"""
	MAIN THREAD ONLY. Capture plain strings from TD + state.json.
	Must be called before starting the worker thread.
	"""
	td = _td()
	folder = str(td.project.folder)
	name = str(td.project.name)
	state_path = os.path.join(folder, ".tdmcp", "state.json")
	state = _read_json_file(state_path) if os.path.isfile(state_path) else {}
	hub_url = str(
		state.get("hubUrl")
		or state.get("hub_url")
		or os.environ.get("TDMCP_HUB_URL")
		or "http://127.0.0.1:9980"
	).rstrip("/")
	transport = str(state.get("transport") or "http").lower()
	snap = {
		"projectFolder": folder,
		"projectName": name,
		"statePath": state_path,
		"hubUrl": hub_url,
		"transport": "tunnel" if transport == "tunnel" else "http",
		"targetId": str(state.get("targetId") or "lab"),
		"nonce": str(state.get("nonce") or ""),
		"toePath": str(state.get("toe_launched") or state.get("toePath") or ""),
		"osPid": int(os.getpid()),
	}
	with _snapshot_lock:
		_snapshot.clear()
		_snapshot.update(snap)
	try:
		from utils import tdmcp_status

		tdmcp_status.set_meta(
			transport=str(snap.get("transport") or "http"),
			target_id=str(snap.get("targetId") or ""),
			hub_url=str(snap.get("hubUrl") or ""),
			os_pid=int(snap.get("osPid") or 0),
		)
	except Exception:
		pass
	# Also seed hub module cache so its heartbeat thread never needs project.folder
	try:
		from utils import tdmcp_hub

		tdmcp_hub.cache_state_path(
			state_path,
			hub_url=hub_url,
			target_id=snap["targetId"],
			project_name=name,
			project_folder=folder,
		)
	except Exception:
		pass
	return dict(snap)


def get_snapshot() -> dict[str, Any]:
	with _snapshot_lock:
		return dict(_snapshot)


def read_state_file() -> dict[str, Any]:
	"""Worker-safe: reads state.json via snapshotted absolute path only."""
	snap = get_snapshot()
	path = snap.get("statePath")
	if not path or not os.path.isfile(path):
		return {}
	return _read_json_file(str(path))


def transport_from_snapshot() -> str:
	snap = get_snapshot()
	# Prefer live state.json if present (still path-only)
	state = read_state_file()
	if state:
		raw = str(state.get("transport") or snap.get("transport") or "http").lower()
		return "tunnel" if raw == "tunnel" else "http"
	return str(snap.get("transport") or "http")


def hub_ws_url_from_snapshot() -> str:
	snap = get_snapshot()
	state = read_state_file()
	base = str(
		(state.get("hubUrl") if state else None)
		or snap.get("hubUrl")
		or "http://127.0.0.1:9980"
	).rstrip("/")
	if base.startswith("https://"):
		base = "ws" + base[5:]
	elif base.startswith("http://"):
		base = "ws" + base[4:]
	elif not base.startswith("ws"):
		base = "ws://" + base
	return f"{base}/tunnel"


def _close_sock() -> None:
	global _ws_sock
	sock = _ws_sock
	_ws_sock = None
	if sock is not None:
		try:
			sock.shutdown(socket.SHUT_RDWR)
		except Exception:
			pass
		try:
			sock.close()
		except Exception:
			pass


def _ws_connect(url: str, timeout: float = 5.0) -> socket.socket:
	parsed = urlparse(url)
	host = parsed.hostname or "127.0.0.1"
	port = parsed.port or (443 if parsed.scheme == "wss" else 80)
	path = parsed.path or "/"
	if parsed.query:
		path = f"{path}?{parsed.query}"

	sock = socket.create_connection((host, port), timeout=timeout)
	sock.settimeout(timeout)
	key = base64.b64encode(os.urandom(16)).decode("ascii")
	req = (
		f"GET {path} HTTP/1.1\r\n"
		f"Host: {host}:{port}\r\n"
		"Upgrade: websocket\r\n"
		"Connection: Upgrade\r\n"
		f"Sec-WebSocket-Key: {key}\r\n"
		"Sec-WebSocket-Version: 13\r\n"
		"\r\n"
	)
	sock.sendall(req.encode("ascii"))
	buf = b""
	while b"\r\n\r\n" not in buf:
		chunk = sock.recv(4096)
		if not chunk:
			raise OSError("websocket handshake closed")
		buf += chunk
	header, _, _rest = buf.partition(b"\r\n\r\n")
	status_line = header.split(b"\r\n", 1)[0].decode("ascii", errors="replace")
	if "101" not in status_line:
		raise OSError(f"websocket handshake failed: {status_line}")
	sock.settimeout(None)
	return sock


def _ws_send_text(sock: socket.socket, text: str) -> None:
	payload = text.encode("utf-8")
	header = bytearray([0x81])  # text, FIN
	n = len(payload)
	mask_bit = 0x80  # client must mask
	if n < 126:
		header.append(mask_bit | n)
	elif n < 65536:
		header.append(mask_bit | 126)
		header.extend(struct.pack("!H", n))
	else:
		header.append(mask_bit | 127)
		header.extend(struct.pack("!Q", n))
	mask = os.urandom(4)
	header.extend(mask)
	masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
	with _send_lock:
		sock.sendall(header + masked)


def _recv_exact(sock: socket.socket, n: int) -> bytes:
	buf = b""
	while len(buf) < n:
		chunk = sock.recv(n - len(buf))
		if not chunk:
			raise OSError("socket closed")
		buf += chunk
	return buf


def _ws_recv_text(sock: socket.socket) -> Optional[str]:
	"""Return text payload, None on close frame."""
	while True:
		hdr = _recv_exact(sock, 2)
		opcode = hdr[0] & 0x0F
		masked = (hdr[1] & 0x80) != 0
		length = hdr[1] & 0x7F
		if length == 126:
			length = struct.unpack("!H", _recv_exact(sock, 2))[0]
		elif length == 127:
			length = struct.unpack("!Q", _recv_exact(sock, 8))[0]
		mask = _recv_exact(sock, 4) if masked else b""
		payload = _recv_exact(sock, length) if length else b""
		if masked:
			payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
		if opcode == 0x8:  # close
			return None
		if opcode == 0x9:  # ping → pong
			header = bytearray([0x8A])
			n = len(payload)
			mask_bit = 0x80
			if n < 126:
				header.append(mask_bit | n)
			else:
				header.append(mask_bit | 126)
				header.extend(struct.pack("!H", n))
			m = os.urandom(4)
			header.extend(m)
			masked_payload = bytes(b ^ m[i % 4] for i, b in enumerate(payload))
			with _send_lock:
				sock.sendall(header + masked_payload)
			continue
		if opcode == 0xA:  # pong
			continue
		if opcode == 0x1:  # text
			return payload.decode("utf-8")
		if opcode == 0x2:  # binary — ignore
			continue
		continue


def _build_hello_from_snapshot() -> dict[str, Any]:
	"""Worker-safe: plain dicts only (no td / op)."""
	snap = get_snapshot()
	state = read_state_file()
	hello: dict[str, Any] = {
		"type": "hello",
		"targetId": str(
			(state.get("targetId") if state else None) or snap.get("targetId") or "lab"
		),
		"nonce": str((state.get("nonce") if state else None) or snap.get("nonce") or ""),
		"projectName": str(snap.get("projectName") or ""),
		"projectFolder": str(snap.get("projectFolder") or ""),
		"osPid": int(os.getpid()),
	}
	toe = (state.get("toe_launched") if state else None) or snap.get("toePath")
	if toe:
		hello["toePath"] = str(toe)
	return hello


def _dispatch_request(msg: dict[str, Any]) -> dict[str, Any]:
	"""MAIN THREAD ONLY — OpenAPI controller may touch ops."""
	from mcp_webserver_script import _controller_manager

	method = str(msg.get("method") or "GET").upper()
	path = str(msg.get("path") or "/")
	query = msg.get("query") or {}
	headers = msg.get("headers") or {}
	body = msg.get("body")
	if isinstance(body, dict):
		body_str = json.dumps(body)
	elif body is None:
		body_str = ""
	else:
		body_str = str(body)

	request = {
		"method": method,
		"uri": path,
		"pars": query if isinstance(query, dict) else {},
		"headers": headers if isinstance(headers, dict) else {},
		"body": body_str,
	}
	response: dict[str, Any] = {
		"headers": {},
		"statusCode": 500,
		"statusReason": "Error",
	}
	try:
		_controller_manager.handle_request(None, request, response)
	except Exception as e:
		traceback.print_exc()
		response["statusCode"] = 500
		response["data"] = json.dumps({"success": False, "error": str(e)})

	body_out = response.get("data")
	if body_out is None:
		body_out = response.get("body")
	if body_out is None:
		body_out = ""
	if not isinstance(body_out, str):
		body_out = json.dumps(body_out)

	return {
		"type": "response",
		"id": msg["id"],
		"statusCode": int(response.get("statusCode") or 500),
		"statusReason": str(response.get("statusReason") or ""),
		"headers": response.get("headers")
		if isinstance(response.get("headers"), dict)
		else {"Content-Type": "application/json"},
		"body": body_out,
	}


def _handle_request_on_main(msg: dict[str, Any], sock: socket.socket) -> None:
	"""MAIN THREAD ONLY."""
	import time

	t0 = time.perf_counter()
	method = str(msg.get("method") or "GET")
	path = str(msg.get("path") or "/")
	try:
		resp = _dispatch_request(msg)
		_ws_send_text(sock, json.dumps(resp))
		elapsed_ms = (time.perf_counter() - t0) * 1000.0
		try:
			from utils import tdmcp_status

			tdmcp_status.note_request(
				method, path, int(resp.get("statusCode") or 0), elapsed_ms
			)
		except Exception:
			pass
	except Exception as e:
		traceback.print_exc()
		elapsed_ms = (time.perf_counter() - t0) * 1000.0
		try:
			from utils import tdmcp_status

			tdmcp_status.note_request(method, path, 500, elapsed_ms)
		except Exception:
			pass
		try:
			_ws_send_text(
				sock,
				json.dumps(
					{
						"type": "response",
						"id": msg.get("id"),
						"statusCode": 500,
						"body": json.dumps({"success": False, "error": str(e)}),
					}
				),
			)
		except Exception:
			pass


def process_pending() -> int:
	"""Drain main-thread queue. Call only from Execute DAT onFrameStart (main cook)."""
	n = 0
	while True:
		try:
			msg, sock = _pending_main.get_nowait()
		except queue.Empty:
			break
		_handle_request_on_main(msg, sock)
		n += 1
	return n


def enable_frame_drain_on(execute_dat: Any) -> None:
	"""
	MAIN THREAD: turn on Frame Start on the given Execute DAT (`me` from
	tdmcp_port_onstart). Prefer this over creating a sibling DAT — the onStart
	DAT is already known to cook on the real main thread.
	"""
	if execute_dat is None:
		set_status("enable_frame_drain_on: no Execute DAT")
		return
	enabled = False
	for attr in ("framestart", "frameStart", "FrameStart"):
		par = getattr(getattr(execute_dat, "par", None), attr, None)
		if par is not None:
			try:
				par.val = True
				enabled = True
				break
			except Exception:
				try:
					setattr(execute_dat.par, attr, True)
					enabled = True
					break
				except Exception:
					pass
	path = getattr(execute_dat, "path", "?")
	set_status(f"frame drain on {path} framestart={'on' if enabled else 'FAILED'}")


def _schedule_request(msg: dict[str, Any], sock: socket.socket) -> None:
	"""Worker-safe: enqueue plain dict only. onFrameStart drains on main cook."""
	_pending_main.put((msg, sock))


def _session_loop() -> None:
	global _ws_sock
	url = hub_ws_url_from_snapshot()
	hello = _build_hello_from_snapshot()
	if not hello.get("nonce"):
		set_status("missing nonce in state.json — cannot hello")
		return
	set_status(f"connecting {url}")
	sock = _ws_connect(url)
	_ws_sock = sock
	_ws_send_text(sock, json.dumps(hello))
	ack_raw = _ws_recv_text(sock)
	if ack_raw is None:
		set_status("closed before hello_ack")
		_close_sock()
		return
	ack = json.loads(ack_raw)
	if not ack.get("ok"):
		set_status(f"hello rejected: {ack.get('error')}")
		_close_sock()
		return
	set_status(f"connected as {hello['targetId']}")

	while not _stop.is_set() and not _paused:
		try:
			sock.settimeout(30.0)
			raw = _ws_recv_text(sock)
		except socket.timeout:
			continue
		except OSError as e:
			set_status(f"recv error: {e}")
			break
		if raw is None:
			set_status("server closed")
			break
		try:
			msg = json.loads(raw)
		except Exception:
			continue
		if msg.get("type") == "request":
			_schedule_request(msg, sock)
	_close_sock()
	set_status("disconnected")


def _reconnect_loop(hub_dir: Optional[str] = None) -> None:
	backoff = 0.5
	while not _stop.is_set():
		if _paused:
			_stop.wait(0.5)
			continue
		if transport_from_snapshot() != "tunnel":
			set_status("transport!=tunnel — idle")
			_stop.wait(2.0)
			continue
		# ensure_hub uses cached hub URL / path — never project.folder
		try:
			from utils import tdmcp_hub

			snap = get_snapshot()
			tdmcp_hub.ensure_hub(
				hub_dir=hub_dir,
				base_url=str(snap.get("hubUrl") or None),
			)
		except Exception:
			pass
		try:
			_session_loop()
			backoff = 0.5
		except Exception as e:
			set_status(f"session error: {e}")
			traceback.print_exc()
		if _stop.is_set() or _paused:
			break
		jitter = random.uniform(0, 0.25)
		_stop.wait(backoff + jitter)
		backoff = min(backoff * 2, 15.0)


def start(hub_dir: Optional[str] = None) -> bool:
	"""
	MAIN THREAD ONLY entry (after capture_snapshot_on_main).
	Starts reconnect loop — always retries (never silent-death).
	"""
	global _thread
	if not get_snapshot().get("statePath"):
		capture_snapshot_on_main()
	_stop.clear()
	if _thread and _thread.is_alive():
		return True
	_thread = threading.Thread(
		target=_reconnect_loop,
		args=(hub_dir,),
		daemon=True,
		name="tdmcp-tunnel",
	)
	_thread.start()
	set_status("tunnel thread started")
	return True


def stop() -> None:
	_stop.set()
	_close_sock()


def on_bridge_ready(hub_dir: Optional[str] = None) -> bool:
	"""
	Entry from tdmcp_port_onstart when transport=tunnel (MAIN THREAD).
	Snapshots TD identity, then starts the reconnect loop.
	Caller should already have called enable_frame_drain_on(me).
	"""
	if _paused:
		set_status("paused — skip tunnel")
		return False
	capture_snapshot_on_main()
	return start(hub_dir=hub_dir)
