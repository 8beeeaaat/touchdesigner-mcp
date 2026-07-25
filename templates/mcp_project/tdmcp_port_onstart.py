# Ensures /project1/tdmcp_bridge exists (loadTox from modules/ if needed),
# then either (tunnel) dials out to tdmcp-hub or (http) applies WebServer port
# and registers with the hub.
#
# THREAD SAFETY: all op()/project access stays on the main thread here.
# Tunnel/hub workers only see plain-string snapshots.
# Tunnel OpenAPI drain runs in onFrameStart (this Execute DAT) — never via
# td.run from the WS worker (that path cannot touch op/project).
# Status face flush also runs here every frame (both transports).


def onStart():
	try:
		import os
		import sys

		folder = project.folder
		modules = os.path.join(folder, "modules")
		td_server = os.path.join(modules, "td_server")
		for p in (td_server, modules):
			if p in sys.path:
				sys.path.remove(p)
			sys.path.insert(0, p)

		bridge = op("/project1/tdmcp_bridge")
		if bridge is None:
			legacy = op("/project1/mcp_webserver_base")
			if legacy is not None:
				bridge = legacy
			else:
				tox = os.path.join(modules, "tdmcp_bridge.tox")
				if not os.path.isfile(tox):
					print("tdmcp_port_onstart: missing", tox)
					return
				loaded = op("/project1").loadTox(tox)
				if loaded is None:
					print("tdmcp_port_onstart: loadTox failed", tox)
					return
				if loaded.name != "tdmcp_bridge":
					try:
						loaded.name = "tdmcp_bridge"
					except Exception:
						pass
				bridge = op("/project1/tdmcp_bridge") or loaded

		hub_dir = os.environ.get("TDMCP_HUB_DIR")
		if not hub_dir:
			candidate = os.path.join(folder, "..", "tools", "touchdesigner-mcp")
			candidate = os.path.normpath(candidate)
			if os.path.isfile(os.path.join(candidate, "dist", "hub.js")):
				hub_dir = candidate

		from utils import tdmcp_status, tdmcp_tunnel

		# Snapshot on main BEFORE any worker thread
		snap = tdmcp_tunnel.capture_snapshot_on_main()
		transport = snap.get("transport") or tdmcp_tunnel.transport_from_snapshot()

		# Visible COMP face for both transports
		try:
			tdmcp_status.ensure_ui(bridge)
		except Exception as e:
			print("tdmcp_port_onstart status UI:", e)

		if transport == "tunnel":
			try:
				# Drain tunnel requests every frame on THIS Execute DAT (main cook).
				tdmcp_tunnel.enable_frame_drain_on(me)
				tdmcp_tunnel.on_bridge_ready(hub_dir=hub_dir)
			except Exception as e:
				print("tdmcp_port_onstart tunnel:", e)
			return

		from utils.apply_tdmcp_port import apply

		ws = None
		try:
			ws = bridge.op("mpc_webserver")
		except Exception:
			ws = None
		apply(ws)

		try:
			from utils import tdmcp_hub

			tdmcp_hub.on_bridge_ready(hub_dir=hub_dir, webserver=ws)
		except Exception as e:
			print("tdmcp_port_onstart hub:", e)
	except Exception as e:
		print("tdmcp_port_onstart:", e)


def onFrameStart(frame):
	try:
		from utils import tdmcp_status, tdmcp_tunnel

		if tdmcp_tunnel.transport_from_snapshot() == "tunnel":
			tdmcp_tunnel.process_pending()
		tdmcp_status.flush()
	except Exception as e:
		print("tdmcp_port_onstart frame:", e)
