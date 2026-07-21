# TouchDesigner MCP — agent contract (asyade fork)

Source of truth for agents using **this fork** (not necessarily `npx touchdesigner-mcp-server@latest`).

## Clients

Wire **one** stdio server to a local `dist/cli.js` build:

| Client | Config |
|--------|--------|
| **Cursor** | `.cursor/mcp.json` or `~/.cursor/mcp.json` — see [`mcp.cursor.example.json`](../mcp.cursor.example.json) |
| Claude Desktop | `claude_desktop_config.json` — see [`docs/development.md`](development.md) |
| Claude Code | `~/.claude.json` |
| Codex | `~/.codex/config.toml` |

Do **not** run upstream `npx touchdesigner-mcp-server@latest` alongside this fork — overlapping tool servers confuse agents.

## Sticky targets

- Default selected target: **`lab`** → `http://127.0.0.1:9981`
- `list_td_targets` — metadata only (no live probe)
- `select_td_target` — `{ id }` sticky; **probes** identity; fails if offline
- All node/script tools use the sticky target (no per-call `target` arg)

## Identity

`get_td_info` / successful `select_td_target` include composite fields:

- `projectName`, `projectFolder`, `osPid`, `targetId`, `webServerPort`
- plus classic build/version fields from the TD bridge

## Lifecycle tools

| Tool | Behavior |
|------|----------|
| `create_td_project` | Copy `templates/mcp_project` → `destDir`; write `.tdmcp/state.json` with free port (≥9984, skip 9982/9983). **Does not start TD.** |
| `start_td_project` | Spawn `TouchDesigner.exe` on `toePath`; wait for bridge; select owned target |
| `stop_td_project` | Soft `project.quit(force=True)` then kill owned PID. **Refuses `lab`.** |

Ports: lab **9981**; Stagepad **9982**; 4designer **9983**; owned projects from **9984** upward.

## Agent loop (Definition of Done)

1. `list_td_targets` (optional)
2. `select_td_target` when not using lab
3. Assert identity (`projectFolder` / `projectName` prefix)
4. Mutate via existing tools
5. Verify (`get_td_node_errors`, `get_top_image` when visual)

Stop after 3 failed calls with no new evidence.

## Template note

`templates/mcp_project/project.toe` must be a real TouchDesigner project with `mcp_webserver_base` imported and `utils.apply_tdmcp_port.apply()` on start. Replace the placeholder before relying on `start_td_project` in live smoke.
