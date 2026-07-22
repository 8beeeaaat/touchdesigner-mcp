# MCP project template

Used by `create_td_project` (copies this folder to a new destination) and as the
**graft kit source** for `inject_td_mcp`:

- **create** — copies template `project.toe` with embedded `/project1/tdmcp_bridge`
- **inject** — expands this toe only to copy `tdmcp_port_onstart*` into the foreign
  working copy; stages `modules/tdmcp_bridge.tox` for runtime `loadTox` on open
  (does not embed the bridge COMP into community toes)

## Contents

- `project.toe` — TouchDesigner project with `/project1/tdmcp_bridge` embedded (`externaltox` cleared)
- `modules/` + `import_modules.py` — MCP HTTP bridge Python (resolved via `project.folder`)
- `tdmcp_bridge.tox` — kit for manual import **and** inject runtime `loadTox` (staged as `modules/tdmcp_bridge.tox`, never beside the `.toe` at project root)
- `tdmcp_port_onstart.py` — source for the Execute DAT body (sync into the toe via `scripts/_sync_template_onstart.mjs`)
- `/project1/tdmcp_port_onstart` — Execute DAT (**onStart**): `loadTox` bridge if missing, then apply owned port
- `.tdmcp/state.json` — written by `create_td_project` / `inject_td_mcp` / `start_td_project` (not in the raw template)

**Do not rename** `tdmcp_bridge` or `tdmcp_port_onstart` without updating inject graft discovery. Legacy name `mcp_webserver_base` is wiped on `onConflict: "replace"` only.

**Why not embed the bridge into foreign toes:** collapsing a grafted bridge COMP (or shell-host merging foreign COMPs into this template) triggers TD’s “Unexpected node duplication (/project1/…) in file.” Inject uses runtime `loadTox` instead. Create/inject also delete project-root bridge `.tox` sidecars and resolve modules via `project.folder + '/modules'`.

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

Save `project.toe` here again. If you change `tdmcp_port_onstart.py`, run
`node scripts/_sync_template_onstart.mjs` from the fork root. Commit the toe +
modules on the fork branch `multi-instance`. Clear `%TEMP%/tdmcp-inject-graft/`
if inject seems to use a stale graft kit.
