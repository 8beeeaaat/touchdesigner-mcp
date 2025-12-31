"""
Version utilities shared across TouchDesigner MCP Python modules.
"""

MCP_API_VERSION = "1.4.3"


def get_mcp_api_version() -> str:
	"""Return the current TouchDesigner MCP API version."""
	return MCP_API_VERSION
