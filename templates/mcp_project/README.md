# MCP project template

Used by `create_td_project` (copies this folder to a new destination).

## Contents

- `project.toe` — TouchDesigner project with `mcp_webserver_base` imported
- `mcp_webserver_base.tox` + `modules/` + `import_modules.py` — MCP HTTP bridge
- `/project1/tdmcp_port_onstart` — Execute DAT (**onStart**) that sets the WebServer port
- `.tdmcp/state.json` — written by `create_td_project` / `start_td_project` (not in the raw template)

## What `apply_tdmcp_port` means

Lab TouchDesigner already uses port **9981**. If a second project also listens on 9981, it fails or steals the lab.

So when MCP creates/starts an owned project it writes:

```json
{ "port": 9984, "targetId": "owned-…", … }
```

into `.tdmcp/state.json`.

**`apply_tdmcp_port`** reads that file and sets the bridge WebServer DAT (`mpc_webserver`) to that port, then restarts it if needed. If there is no `state.json` (you just opened the raw template), it does nothing and leaves 9981.

You do **not** need to call it by hand — `tdmcp_port_onstart` runs it on project open.

## After editing this template

Save `project.toe` here again. Commit the toe + modules on the fork branch `multi-instance`.
