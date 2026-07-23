# MCP project template

Used by `create_td_project` (copies this folder to a new destination) and as the
**graft kit source** for `inject_td_mcp`:

- **create** — copies template `project.toe` with embedded `/project1/tdmcp_bridge`
- **inject** — expands this toe only to copy `tdmcp_port_onstart*` into the foreign
  working copy; stages `modules/tdmcp_bridge.tox` for runtime `loadTox` on open
  (does not embed the bridge COMP into community toes)

## Contents

- `project.toe` — TouchDesigner project with `/project1/tdmcp_bridge` embedded (`externaltox` cleared)
- `modules/` + `import_modules.py` — MCP HTTP bridge Python (resolved via `project.folder`), including `utils/tdmcp_hub.py`
- `tdmcp_bridge.tox` — kit for manual import **and** inject runtime `loadTox` (staged as `modules/tdmcp_bridge.tox`, never beside the `.toe` at project root)
- `tdmcp_port_onstart.py` — source for the Execute DAT body (sync into the toe via `scripts/_sync_template_onstart.mjs`)
- `/project1/tdmcp_port_onstart` — Execute DAT (**onStart**): `loadTox` bridge if missing → apply preferred listen port → **register with tdmcp-hub** (`ensureHub` when `TDMCP_HUB_DIR` / package path is found)
- `.tdmcp/state.json` — written by `create_td_project` / `inject_td_mcp` / `start_td_project` (not in the raw template)

**Do not rename** `tdmcp_bridge` or `tdmcp_port_onstart` without updating inject graft discovery. Legacy name `mcp_webserver_base` is wiped on `onConflict: "replace"` only.

**Why not embed the bridge into foreign toes:** collapsing a grafted bridge COMP (or shell-host merging foreign COMPs into this template) triggers TD’s “Unexpected node duplication (/project1/…) in file.” Inject uses runtime `loadTox` instead. Create/inject also delete project-root bridge `.tox` sidecars and resolve modules via `project.folder + '/modules'`.

## Hub + preferred listen port

Durable multi-instance identity lives on **tdmcp-hub** (`http://127.0.0.1:9980`). See [docs/hub.md](../../docs/hub.md).

When MCP creates/starts an owned project it writes:

```json
{ "port": 9984, "targetId": "owned-…", "hubUrl": "http://127.0.0.1:9980", … }
```

into `.tdmcp/state.json`.

- **`apply_tdmcp_port`** sets the bridge WebServer to the preferred `port` (avoids stealing lab **9981**).
- **`tdmcp_hub.on_bridge_ready`** registers `{ id: targetId, port, … }` with the hub and heartbeats. Cursor MCP `ensureHub()` also upserts the hub process.

Pause registration from Textport: `from utils import tdmcp_hub; tdmcp_hub.pause()` / `tdmcp_hub.resume()`.

## After editing this template

Save `project.toe` here again. If you change `tdmcp_port_onstart.py`, run
`node scripts/_sync_template_onstart.mjs` from the fork root. Commit the toe +
modules on the fork branch `multi-instance`. Clear `%TEMP%/tdmcp-inject-graft/`
if inject seems to use a stale graft kit.
