import os
import sys

import yaml


def setup():
	externaltox = parent().par.externaltox.eval()
	tox_dir_path = os.path.dirname(externaltox)
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

	# Not guarded. Every route is defined in this schema, so a component that
	# starts without it answers nothing while looking healthy - and the
	# endpoint that would let you diagnose it from outside is one of the
	# routes that is missing. Recovery means re-importing the component
	# either way, so a degraded start buys nothing and costs the diagnosis.
	# A traceback here, with the component visibly failing to initialise, is
	# the accurate signal.
	schema_path = find_openapi_schema_path(modules_path)
	if schema_path is None:
		raise FileNotFoundError("OpenAPI schema file not found in any known location.")

	# UTF-8 explicitly: the schema is UTF-8 by specification and
	# TouchDesigner's Python defaults to ASCII, so one non-ASCII character
	# anywhere in it would otherwise take down every route.
	with open(schema_path, encoding="utf-8") as f:
		openapi_schema = yaml.safe_load(f)

	if not openapi_schema or not openapi_schema.get("paths"):
		raise ValueError(
			f"OpenAPI schema at {schema_path} defines no paths; "
			"the component would start and answer nothing."
		)

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
