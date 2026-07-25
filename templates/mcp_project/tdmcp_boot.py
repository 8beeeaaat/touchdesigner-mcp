# Inject-only bootstrap under /local (not visible on project1 canvas).
# loadTox the bridge; real tunnel/status runs from
# /project1/tdmcp_bridge/tdmcp_port_onstart inside the tox.


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
		if bridge is not None:
			print("tdmcp_boot: bridge already present")
			return

		legacy = op("/project1/mcp_webserver_base")
		if legacy is not None:
			print("tdmcp_boot: legacy mcp_webserver_base present — skip loadTox")
			return

		tox = os.path.join(modules, "tdmcp_bridge.tox")
		if not os.path.isfile(tox):
			print("tdmcp_boot: missing", tox)
			return
		loaded = op("/project1").loadTox(tox)
		if loaded is None:
			print("tdmcp_boot: loadTox failed", tox)
			return
		if loaded.name != "tdmcp_bridge":
			try:
				loaded.name = "tdmcp_bridge"
			except Exception:
				pass
		print("tdmcp_boot: loaded", op("/project1/tdmcp_bridge") or loaded)
	except Exception as e:
		print("tdmcp_boot:", e)
