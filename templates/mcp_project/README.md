# MCP project template

Copied by `create_td_project`. Contains:
- `mcp_webserver_base.tox` + `modules/` + `import_modules.py`
- Place/import the tox into a `.toe` saved as `project.toe` in this folder (one-time human/agent bootstrap if missing).
- `.tdmcp/state.json` is written by create/start (see `state.example.json`).

On project open, ensure an Execute DAT calls:

```python
from utils.apply_tdmcp_port import apply
apply()
```

so the WebServer listens on the allocated port (not only 9981).
