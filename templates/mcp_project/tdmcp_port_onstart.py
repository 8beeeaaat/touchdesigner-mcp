# Ensures /project1/tdmcp_bridge exists (loadTox from modules/ if needed),
# applies preferred WebServer port from .tdmcp/state.json, then registers
# with tdmcp-hub (ensure/upsert hub when Hubdir is available).
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

		from utils.apply_tdmcp_port import apply

		ws = None
		try:
			ws = bridge.op("mpc_webserver")
		except Exception:
			ws = None
		apply(ws)

		# Optional Hubdir: sibling state or env / conventional package path
		hub_dir = os.environ.get("TDMCP_HUB_DIR")
		if not hub_dir:
			# Prefer package next to project when developing the fork
			candidate = os.path.join(folder, "..", "tools", "touchdesigner-mcp")
			candidate = os.path.normpath(candidate)
			if os.path.isfile(os.path.join(candidate, "dist", "hub.js")):
				hub_dir = candidate
		try:
			from utils import tdmcp_hub

			tdmcp_hub.on_bridge_ready(hub_dir=hub_dir, webserver=ws)
		except Exception as e:
			print("tdmcp_port_onstart hub:", e)
	except Exception as e:
		print("tdmcp_port_onstart:", e)
