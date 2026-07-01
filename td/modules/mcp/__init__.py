"""
MCP package initialization

Marks `modules/mcp` as a regular package so it is not treated as an implicit
namespace package. Without this file a same-named `mcp` package elsewhere on
sys.path (e.g. the Anthropic MCP SDK in TouchDesigner's site-packages) can
shadow this local package.

`openapi_schema` is populated by `import_modules.setup()` at startup; the
default keeps `from mcp import openapi_schema` safe if setup has not run yet.
Submodules are intentionally NOT imported here to avoid triggering
`mcp.controllers` (which reads `openapi_schema`) before setup assigns it.
"""

openapi_schema: dict = {}
