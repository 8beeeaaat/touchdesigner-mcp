import os
import sys

import yaml


def setup():
	externaltox = parent().par.externaltox.eval()
	tox_dir_path = os.path.dirname(externaltox)
	modules_path = os.path.join(tox_dir_path, "modules")

	if modules_path not in sys.path:
		sys.path.append(modules_path)

	td_server_path = os.path.join(modules_path, "td_server")
	if td_server_path not in sys.path:
		sys.path.append(td_server_path)

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
