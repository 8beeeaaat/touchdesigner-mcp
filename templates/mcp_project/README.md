# MCP project template

![Gossiping bridge face](../../docs/assets/bridge-status/status-connected.png)

**Before:** blank `tdmcp_bridge` face — “is MCP even on?”  
**After:** the COMP **gossiping status face** — tunnel state, last op, event budget `N/100`.

Used by `create_td_project` (copies this folder to a new destination) and as the
**graft kit source** for `inject_td_mcp`:

- **create** — copies template `project.toe` with embedded `/project1/tdmcp_bridge`
  (nested `/project1/tdmcp_bridge/tdmcp_port_onstart` — not a sibling on the canvas)
- **inject** — stages `/local/tdmcp_boot` into the foreign working copy (off `project1`
  canvas) + `modules/tdmcp_bridge.tox` for runtime `loadTox` on open (does not embed
  the bridge COMP into community toes; real onstart lives inside the tox)

## Contents

- `project.toe` — TouchDesigner project with `/project1/tdmcp_bridge` embedded (`externaltox` cleared)
- `modules/` + `import_modules.py` — MCP bridge Python (resolved via `project.folder`), including
  `utils/tdmcp_hub.py`, `utils/tdmcp_tunnel.py`, `utils/tdmcp_status.py`
- `modules/tdmcp_bridge.tox` — kit for inject runtime `loadTox` (never beside the `.toe` at project root); carries nested `tdmcp_port_onstart`
- `tdmcp_port_onstart.py` — source for the in-bridge Execute DAT (sync via `scripts/_sync_template_onstart.mjs`)
- `tdmcp_boot.py` — inject-only `/local/tdmcp_boot` source (`loadTox` only)
- `/project1/tdmcp_bridge/tdmcp_port_onstart` — Execute DAT (**onStart** + **Frame Start**): tunnel/HTTP register → status face flush
- `.tdmcp/state.json` — written by `create_td_project` / `inject_td_mcp` / `start_td_project` (not in the raw template)

### Status ops (runtime / graft-owned names)

| Name | Kind | Purpose |
|------|------|---------|
| `status_top` | Text TOP | COMP Operator Viewer face |
| `status_text` | Text DAT | Fixed-size curated summary |
| `event_log` | Table DAT | Capped event history (100 rows) |

Created idempotently by `tdmcp_status.ensure_ui` on start. To **ship** an updated tox with the face baked in: HITL **Save Component…** → `modules/tdmcp_bridge.tox` (see [docs/hub.md](../../docs/hub.md) Bridge face).

**Do not rename** `tdmcp_bridge` or `tdmcp_port_onstart` without updating inject graft discovery. Legacy name `mcp_webserver_base` is wiped on `onConflict: "replace"` only.

**Why not embed the bridge into foreign toes:** collapsing a grafted bridge COMP (or shell-host merging foreign COMPs into this template) triggers TD’s “Unexpected node duplication (/project1/…) in file.” Inject uses runtime `loadTox` instead. Create/inject also delete project-root bridge `.tox` sidecars and resolve modules via `project.folder + '/modules'`.

## Hub + preferred listen port

Durable multi-instance identity lives on **tdmcp-hub** (`http://127.0.0.1:9980`). See [docs/hub.md](../../docs/hub.md).

When MCP creates/starts an owned project it writes:

```json
{ "port": 0, "targetId": "owned-…", "nonce": "…", "transport": "tunnel", "hubUrl": "http://127.0.0.1:9980", … }
```

into `.tdmcp/state.json`.

- **Default `transport: tunnel`** — TD dials hub `/tunnel`; no WebServer listen port.
- **Legacy HTTP** — `apply_tdmcp_port` + hub register/heartbeat (lab migration).

Pause registration from Textport: `from utils import tdmcp_hub; tdmcp_hub.pause()` / `tdmcp_hub.resume()`.

## After editing this template

Save `project.toe` here again (HITL). If you change `tdmcp_port_onstart.py`, run
`node scripts/_sync_template_onstart.mjs` from the fork root. After **Save Component**
to `modules/tdmcp_bridge.tox`, also copy that file to the template-root
`tdmcp_bridge.tox` sidecar (or rely on inject preferring `modules/…`). Commit the
toe + modules on the fork branch `multi-instance`. Clear `%TEMP%/tdmcp-inject-graft/`
if inject seems to use a stale graft kit.
