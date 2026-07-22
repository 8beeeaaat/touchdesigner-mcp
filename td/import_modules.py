import os
import sys

import yaml


def setup():
	# Prefer dirname(externaltox) when set (classic tox layout). Fall back to
	# project.folder so inject/owned projects still resolve modules/ even if
	# externaltox is cleared to avoid TD tox↔COMP name collisions on upgrade.
	tox_dir_path = ""
	try:
		externaltox = parent().par.externaltox.eval()
		if externaltox:
			tox_dir_path = os.path.dirname(externaltox)
	except Exception:
		tox_dir_path = ""
	if not tox_dir_path:
		tox_dir_path = project.folder
	modules_path = os.path.join(tox_dir_path, "modules")
	td_server_path = os.path.join(modules_path, "td_server")

	# If a same-named package is present in TouchDesigner's Python (e.g. the
	# Anthropic MCP SDK, PyPI name `mcp`, pip-installed into the bundled
	# interpreter, or any generic `utils` package), it shadows this project's
	# local `modules/mcp` / `modules/utils` packages and imports such as
	# `import mcp.controllers` or `from utils.error_handling import ...` fail
	# with ModuleNotFoundError. sys.modules caching takes precedence over
	# sys.path, so inserting the project paths below is not enough on its own:
	# drop any already-imported `mcp*` / `utils*` modules so those imports
	# re-resolve against the project paths inserted at the front of sys.path.
	shadowed_roots = ("mcp", "utils")
	for mod_name in list(sys.modules.keys()):
		if mod_name.split(".", 1)[0] in shadowed_roots:
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
