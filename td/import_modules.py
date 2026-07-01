import os
import sys

import yaml


def setup():
	externaltox = parent().par.externaltox.eval()
	tox_dir_path = os.path.dirname(externaltox)
	modules_path = os.path.join(tox_dir_path, "modules")
	td_server_path = os.path.join(modules_path, "td_server")

	# If a same-named `mcp` package is present in TouchDesigner's Python
	# (e.g. the Anthropic MCP SDK, PyPI name `mcp`, pip-installed into the
	# bundled interpreter), it shadows this project's local `modules/mcp`
	# package and `import mcp.controllers` fails with ModuleNotFoundError.
	# Drop any already-imported `mcp` modules so the `import mcp` below
	# re-resolves against the project paths inserted at the front of sys.path.
	for mod_name in list(sys.modules.keys()):
		if mod_name == "mcp" or mod_name.startswith("mcp."):
			del sys.modules[mod_name]

	# Insert project paths at the START of sys.path so the local packages win
	# over any same-named package in site-packages.
	for path in [td_server_path, modules_path]:
		while path in sys.path:
			sys.path.remove(path)
		sys.path.insert(0, path)

	schema_path = find_openapi_schema_path(modules_path)
	try:
		if schema_path is None:
			raise FileNotFoundError(
				"OpenAPI schema file not found in any known location."
			)
		with open(schema_path) as f:
			openapi_schema = yaml.safe_load(f)
	except Exception as e:
		openapi_schema = {}
		print("Failed to load OpenAPI schema:", e)

	import mcp

	mcp.openapi_schema = openapi_schema


def find_openapi_schema_path(modules_path):
	candidates = [
		os.path.join(
			modules_path, "td_server", "openapi_server", "openapi", "openapi.yaml"
		),
		os.path.join(
			os.path.dirname(os.path.dirname(modules_path)),
			"td_server",
			"openapi_server",
			"openapi",
			"openapi.yaml",
		),
	]
	for path in candidates:
		if os.path.exists(path):
			return path
	return None
