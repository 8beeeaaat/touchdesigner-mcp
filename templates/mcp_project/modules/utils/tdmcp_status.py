"""
tdmcp bridge status face — MAIN-THREAD UI + thread-safe event buffer.

Workers may only call record() / note_request() with plain strings.
OP writes (Table DAT / Text DAT / Text TOP / COMP viewer) happen in flush()
on the main cook thread (tdmcp_port_onstart onFrameStart).
"""

from __future__ import annotations

import collections
import threading
import time
from typing import Any, Optional

MAX_EVENTS = 100
MAX_EVENT_CHARS = 160
FLUSH_INTERVAL_S = 0.5
HUB_OK_MIN_INTERVAL_S = 30.0

_lock = threading.Lock()
_events: collections.deque = collections.deque(maxlen=MAX_EVENTS)
_bridge_path = "/project1/tdmcp_bridge"
_started_at = time.time()
_request_count = 0
_last_op = ""
_last_op_at = 0.0
_tunnel_state = "idle"
_transport = "http"
_target_id = ""
_hub_url = ""
_os_pid = 0
_last_flush_at = 0.0
_last_summary = ""
_last_hub_ok_log_at = 0.0
_pending_to_table: collections.deque = collections.deque(maxlen=MAX_EVENTS)
_ui_ready = False


def _truncate(msg: str) -> str:
	s = str(msg).replace("\n", " ").strip()
	if len(s) <= MAX_EVENT_CHARS:
		return s
	return s[: MAX_EVENT_CHARS - 1] + "…"


def record(level: str, event: str, *, force: bool = False) -> None:
	"""
	Any thread. Append a capped event. Heartbeat-ish hub "ok" lines are
	rate-limited unless force=True or level is error/warn.
	"""
	global _last_hub_ok_log_at, _tunnel_state
	lvl = str(level or "info").lower()
	msg = _truncate(event)
	now = time.time()

	# Derive tunnel state from common tunnel messages
	low = msg.lower()
	if "connected as" in low or low.startswith("connected"):
		_tunnel_state = "connected"
	elif "connecting" in low:
		_tunnel_state = "connecting"
	elif "disconnected" in low or "hello rejected" in low or "recv error" in low:
		_tunnel_state = "error" if ("rejected" in low or "error" in low) else "disconnected"
	elif "paused" in low:
		_tunnel_state = "paused"
	elif "session error" in low or "missing nonce" in low:
		_tunnel_state = "error"

	# Rate-limit noisy hub success lines
	if not force and lvl == "hub" and "fail" not in low and "error" not in low:
		if "registered" in low or "hub spawned" in low or "hub running" in low:
			pass  # always log register / hub lifecycle once
		elif "heartbeat" in low or low.endswith("ok"):
			if now - _last_hub_ok_log_at < HUB_OK_MIN_INTERVAL_S:
				return
			_last_hub_ok_log_at = now

	ts = time.strftime("%H:%M:%S", time.localtime(now))
	row = (ts, lvl, msg)
	with _lock:
		_events.append(row)
		_pending_to_table.append(row)


def note_request(method: str, path: str, status_code: int, elapsed_ms: float) -> None:
	"""Any thread-safe counter update + event for an OpenAPI round-trip."""
	global _request_count, _last_op, _last_op_at
	method_u = str(method or "?").upper()
	path_s = _truncate(str(path or "/"))
	code = int(status_code or 0)
	ms = float(elapsed_ms or 0.0)
	_last_op = f"{method_u} {path_s} → {code} ({ms:.0f}ms)"
	_last_op_at = time.time()
	with _lock:
		_request_count += 1
	record("op", _last_op, force=True)


def set_meta(
	*,
	transport: Optional[str] = None,
	target_id: Optional[str] = None,
	hub_url: Optional[str] = None,
	os_pid: Optional[int] = None,
	bridge_path: Optional[str] = None,
) -> None:
	"""MAIN THREAD preferred; plain strings only."""
	global _transport, _target_id, _hub_url, _os_pid, _bridge_path, _started_at
	if transport is not None:
		_transport = str(transport)
	if target_id is not None:
		_target_id = str(target_id)
	if hub_url is not None:
		_hub_url = str(hub_url).rstrip("/")
	if os_pid is not None:
		_os_pid = int(os_pid)
	if bridge_path is not None:
		_bridge_path = str(bridge_path)
	if _started_at <= 0:
		_started_at = time.time()


def deque_len() -> int:
	with _lock:
		return len(_events)


def request_count() -> int:
	with _lock:
		return _request_count


def _td() -> Any:
	import td

	return td


def _resolve_type(td: Any, name: str) -> Any:
	cls = getattr(td, name, None)
	if cls is not None:
		return cls
	try:
		import sys

		main = sys.modules.get("__main__")
		if main is not None:
			cls = getattr(main, name, None)
			if cls is not None:
				return cls
	except Exception:
		pass
	return None


def _ensure_child(parent: Any, name: str, type_name: str) -> Any:
	existing = parent.op(name)
	if existing is not None:
		return existing
	td = _td()
	cls = _resolve_type(td, type_name)
	if cls is None:
		raise RuntimeError(f"OP type {type_name} not found")
	return parent.create(cls, name)


def _set_par(op: Any, names: tuple[str, ...], value: Any) -> bool:
	par_group = getattr(op, "par", None)
	if par_group is None:
		return False
	for n in names:
		par = getattr(par_group, n, None)
		if par is None:
			continue
		try:
			par.val = value
			return True
		except Exception:
			try:
				setattr(par_group, n, value)
				return True
			except Exception:
				continue
	return False


def ensure_ui(bridge: Any) -> bool:
	"""
	MAIN THREAD ONLY. Idempotent: create event_log / status_text / status_top
	and bind COMP Operator Viewer.
	"""
	global _ui_ready, _bridge_path, _started_at
	if bridge is None:
		print("tdmcp_status: ensure_ui — no bridge COMP")
		return False
	_bridge_path = str(getattr(bridge, "path", _bridge_path))
	_started_at = time.time()

	try:
		log = _ensure_child(bridge, "event_log", "tableDAT")
		txt = _ensure_child(bridge, "status_text", "textDAT")
		top = _ensure_child(bridge, "status_top", "textTOP")
	except Exception as e:
		print(f"tdmcp_status: ensure_ui create failed: {e}")
		return False

	# Table header
	try:
		if log.numRows == 0:
			log.appendRow(["time", "level", "event"])
		elif log[0, 0].val != "time":
			log.clear()
			log.appendRow(["time", "level", "event"])
	except Exception:
		try:
			log.clear()
			log.appendRow(["time", "level", "event"])
		except Exception as e:
			print(f"tdmcp_status: event_log init failed: {e}")

	# Text TOP → read status_text DAT
	_set_par(top, ("dat", "Dat"), txt.path if hasattr(txt, "path") else "./status_text")
	# Prefer relative dat ref when possible
	try:
		top.par.dat = top.relativePath(txt) if hasattr(top, "relativePath") else "./status_text"
	except Exception:
		_set_par(top, ("dat",), "./status_text")

	_set_par(top, ("fontsizex", "Fontsizex", "size"), 13)
	_set_par(top, ("alignx", "Alignx"), "left")
	_set_par(top, ("aligny", "Aligny"), "top")
	_set_par(top, ("wordwrap", "Wordwrap"), False)
	_set_par(top, ("outputresolution", "Outputresolution"), "custom")
	_set_par(top, ("resolutionw", "Resolutionw"), 640)
	_set_par(top, ("resolutionh", "Resolutionh"), 360)
	# Margins so ASCII isn't clipped on the COMP face
	_set_par(top, ("position1", "Position1", "tx"), 12)
	_set_par(top, ("position2", "Position2", "ty"), -10)
	_set_par(top, ("fontcolorr", "Fontcolorr"), 0.85)
	_set_par(top, ("fontcolorg", "Fontcolorg"), 1.0)
	_set_par(top, ("fontcolorb", "Fontcolorb"), 0.88)
	_set_par(top, ("bgcolorr", "Bgcolorr"), 0.05)
	_set_par(top, ("bgcolorg", "Bgcolorg"), 0.09)
	_set_par(top, ("bgcolorb", "Bgcolorb"), 0.08)
	_set_par(top, ("bgalpha", "Bgalpha"), 1.0)
	# Never leave static text on the TOP — it prepends to DAT content
	_set_par(top, ("text", "Text"), "")
	# Prefer a mono-ish face if the font menu exists
	for fname in ("Consolas", "Courier New", "Cascadia Mono", "Lucida Console"):
		if _set_par(top, ("font", "Font", "fontindex"), fname):
			break

	# COMP face — prefer relative Operator Viewer path
	try:
		bridge.par.opviewer = "./status_top"
	except Exception:
		_set_par(bridge, ("opviewer", "Opviewer"), "./status_top")
	try:
		# Some builds expand; force relative if still absolute
		cur = str(getattr(bridge.par, "opviewer", "") or "")
		if cur.endswith("/status_top") and not cur.startswith("./"):
			bridge.par.opviewer = "./status_top"
	except Exception:
		pass
	try:
		bridge.viewer = True
	except Exception:
		pass

	_ui_ready = True
	record("status", "UI ready", force=True)
	flush(force=True)
	print(f"tdmcp_status: face ready on {_bridge_path}/status_top")
	return True


def _state_color() -> tuple[float, float, float]:
	s = _tunnel_state
	if s == "connected":
		return (0.04, 0.18, 0.12)  # deep green
	if s == "connecting":
		return (0.20, 0.14, 0.04)  # amber
	if s == "error":
		return (0.24, 0.05, 0.06)  # red
	if s == "paused":
		return (0.08, 0.08, 0.16)
	return (0.06, 0.07, 0.09)


def _state_glyph() -> str:
	"""Fixed-width ASCII state tags (no wide Unicode)."""
	s = _tunnel_state
	if s == "connected":
		return "[LIVE]"
	if s == "connecting":
		return "[....]"
	if s == "error":
		return "[ERR ]"
	if s == "paused":
		return "[PAUS]"
	if s == "disconnected":
		return "[OFF ]"
	return "[idle]"


def _bar(filled: int, total: int, width: int = 14) -> str:
	total = max(1, int(total))
	filled = max(0, min(int(filled), total))
	n = int(round(width * filled / total))
	return "#" * n + "-" * (width - n)


def _short(s: str, n: int) -> str:
	s = str(s or "")
	# ASCII-only truncation marker
	if len(s) <= n:
		return s
	return s[: n - 1] + "~"


def _fmt_uptime(secs: int) -> str:
	secs = max(0, int(secs))
	if secs < 60:
		return f"{secs}s"
	m, s = divmod(secs, 60)
	if m < 60:
		return f"{m}m{s:02d}s"
	h, m = divmod(m, 60)
	return f"{h}h{m:02d}m"


def _line(inner: str, width: int = 46) -> str:
	"""Pad/truncate inner content to fixed width inside '| ... |'."""
	body = (inner or "")[:width]
	return "| " + body.ljust(width) + " |"


def _build_summary() -> str:
	"""Fixed-width pure ASCII face for Text TOP (no wide Unicode)."""
	W = 46
	uptime = max(0, int(time.time() - _started_at))
	ago = ""
	if _last_op_at > 0:
		ago = f" ({max(0, int(time.time() - _last_op_at))}s ago)"
	ev = deque_len()
	req = request_count()
	tid = _short(_target_id or "?", 36)
	hub = _short((_hub_url or "?").replace("http://", ""), 36)
	lop = _short((_last_op or "waiting for first call") + ago, 36)
	glyph = _state_glyph()
	bar = _bar(ev, MAX_EVENTS, 16)
	rule = "+" + "-" * (W + 2) + "+"
	lines = [
		rule,
		_line("* tdmcp  reverse-tunnel bridge", W),
		rule,
		_line(f"{glyph} {_tunnel_state:<12} {_transport}", W),
		_line(f"target  {tid}", W),
		_line(f"hub     {hub}", W),
		_line(f"pid     {_os_pid or '?':<8} up {_fmt_uptime(uptime)}", W),
		_line(f"reqs    {req:<6} events {ev}/{MAX_EVENTS}", W),
		_line(f"[{bar}]", W),
		_line(f"last    {lop}", W),
		_line("face ticks while MCP cooks", W),
		rule,
	]
	return "\n".join(lines)


def _trim_table(log: Any) -> None:
	"""Keep header + at most MAX_EVENTS data rows."""
	try:
		# numRows includes header
		while log.numRows > MAX_EVENTS + 1:
			log.deleteRow(1)
	except Exception:
		pass


def flush(*, force: bool = False) -> int:
	"""MAIN THREAD ONLY. Drain pending events into Table DAT + refresh face."""
	global _last_flush_at, _last_summary, _ui_ready
	now = time.time()
	if not force and (now - _last_flush_at) < FLUSH_INTERVAL_S:
		return 0
	_last_flush_at = now

	td = _td()
	try:
		bridge = td.op(_bridge_path)
	except Exception:
		bridge = None
	if bridge is None:
		return 0

	if not _ui_ready:
		ensure_ui(bridge)

	log = bridge.op("event_log")
	txt = bridge.op("status_text")
	top = bridge.op("status_top")
	if log is None or txt is None or top is None:
		ensure_ui(bridge)
		log = bridge.op("event_log")
		txt = bridge.op("status_text")
		top = bridge.op("status_top")
	if log is None or txt is None:
		return 0

	n = 0
	with _lock:
		batch = list(_pending_to_table)
		_pending_to_table.clear()

	for ts, lvl, msg in batch:
		try:
			log.appendRow([ts, lvl, msg])
			n += 1
		except Exception:
			pass
	_trim_table(log)

	summary = _build_summary()
	if force or summary != _last_summary:
		_last_summary = summary
		try:
			txt.text = summary
		except Exception:
			try:
				txt.clear()
				txt.write(summary)
			except Exception:
				pass
		# Text TOP must read ONLY the DAT — a leftover par.text (e.g. font
		# name / "derivative") prepends and shifts the ASCII card.
		_set_par(top, ("text", "Text"), "")
		br, bg, bb = _state_color()
		_set_par(top, ("bgcolorr", "Bgcolorr"), br)
		_set_par(top, ("bgcolorg", "Bgcolorg"), bg)
		_set_par(top, ("bgcolorb", "Bgcolorb"), bb)
		try:
			top.cook(force=True)
		except Exception:
			pass
	return n


def flood_for_test(n: int) -> int:
	"""Test helper: enqueue many events (any thread)."""
	for i in range(int(n)):
		record("test", f"flood-{i}", force=True)
	return deque_len()
