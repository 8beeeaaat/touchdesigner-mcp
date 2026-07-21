# TouchDesigner MCP — agent contract (asyade fork)

Source of truth for agents using **this fork** (branch `multi-instance` and builds from it — not necessarily `npx touchdesigner-mcp-server@latest`).

## Clients

Wire **one** stdio server to a local `dist/cli.js` build:

| Client | Config |
|--------|--------|
| **Cursor** | `.cursor/mcp.json` or `~/.cursor/mcp.json` — see [`mcp.cursor.example.json`](../mcp.cursor.example.json) |
| Claude Desktop | `claude_desktop_config.json` — see [`docs/development.md`](development.md) |
| Claude Code | `~/.claude.json` |
| Codex | `~/.codex/config.toml` |

Do **not** run upstream `npx touchdesigner-mcp-server@latest` alongside this fork — overlapping tool servers confuse agents.

CLI `--host` / `--port` configure the builtin **lab** bridge only (defaults `http://127.0.0.1` / `9981`). They do not select owned targets.

## Tool inventory

Prefer named tools for single operations. Use `execute_python_script` for multi-step work not covered below. Always pass `detailLevel: "summary"` (or `"minimal"`) unless you need a full dump.

### Targets and lifecycle

| Tool | Role |
|------|------|
| `list_td_targets` | In-memory registry (lab + MCP-owned). **No liveness probe.** |
| `select_td_target` | Sticky select by `id`; **probes** identity; fails if bridge offline |
| `create_td_project` | Copy template → `destDir`; write `.tdmcp/state.json`; upsert owned. **Does not start TD or select.** |
| `start_td_project` | Spawn TD on `toePath` (requires `.tdmcp/state.json`); wait for bridge; **selects** owned |
| `stop_td_project` | Soft quit then kill owned PID. **Refuses `lab`.** |

### Project / nodes / scripts

| Tool | Role |
|------|------|
| `get_td_info` | Bridge + identity on the **sticky** target (`projectName`, `projectFolder`, `osPid`, `targetId`, `webServerPort`, …) |
| `get_td_nodes` | List children under a path (`includeProperties: false` unless needed) |
| `get_td_node_parameters` / `update_td_node_parameters` | Read / write parameters |
| `create_td_node` / `delete_td_node` | Create / delete |
| `exec_node_method` | Call a Python method on a node |
| `execute_python_script` | Multi-step Python in TD (last expression should be side-effect safe when used as a return value) |
| `get_td_node_errors` | Errors on a node subtree |
| `get_top_image` | JPEG of a TOP (`maxSize` optional; black frame = failure for visual checks) |

### Runtime API help

| Tool | Role |
|------|------|
| `get_td_classes` | List TouchDesigner Python classes |
| `get_td_class_details` | Details for a class/module |
| `get_td_module_help` | `help()`-style docs for a module/class |
| `describe_td_tools` | Manifest of registered tools (optional `filter`) |

### Related (not this server)

Editor typing for `.py` files outside TouchDesigner (pyright / Cursor language server, `__builtins__.pyi` from TD’s TDI stubs) is **out of band**. This server does not generate editor stubs. Runtime API discovery uses `get_td_classes` / `get_td_class_details` / `get_td_module_help`. Never `import tdi` inside TouchDesigner at runtime — TDI stubs exist for the language server only.

## Sticky targets

- Default selected target: **`lab`** → `http://127.0.0.1:9981`
- Registry = builtin `lab` + **MCP-owned** instances only (no disk-wide discovery of open TD windows)
- All node/script tools use the sticky target (**no per-call `target` argument**)
- `list_td_targets` — metadata only (includes `selected` flag); offline lab still appears
- `select_td_target` — `{ id }` sticky; probes identity; fails if unknown or offline
- Registry is **process-memory only**. After an MCP/Cursor restart, `list_td_targets` typically shows only `lab` even if an owned TD is still running. Re-attach with `start_td_project` on that toe (needs sibling `.tdmcp/state.json`)

## Workflows (0 / 1 / many)

### One TD (usually lab) and the user does not name another

Stay on sticky **`lab`**. Skip `select_td_target` unless you need a fresh identity probe. Assert with `get_td_info` before mutations when unsure.

### No TD / lab bridge down

- `list_td_targets` still returns `lab` (metadata ≠ alive)
- Mutations, `select_td_target`, and `get_td_info` fail with connection errors (`ECONNREFUSED`, …)
- `create_td_project` still works (filesystem only)
- Bring up an owned instance with `create_td_project` → `start_td_project`, **or** ask the user to open lab with the bridge on **9981**
- Do not treat an empty/offline lab as a successful session

### Multiple instances (lab + owned, or several owned)

1. `list_td_targets`
2. `select_td_target` with the intended `id` **before** mutating a non-lab project
3. Re-assert identity after every `select` / successful `start`
4. Remember: wrong sticky target ⇒ wrong project (no per-call override)

### After MCP restart

Expect only `lab` in the list. Owned `.tdmcp/state.json` files remain on disk; call `start_td_project` again to upsert and select, or work on lab if that is the intent.

## Identity

`get_td_info` / successful `select_td_target` include:

- `projectName`, `projectFolder`, `osPid`, `targetId`, `webServerPort`
- plus classic build/version fields from the TD bridge

Always match `projectFolder` + `projectName` prefix to the user’s intent before mutating.

## Lifecycle cookbook

Ports: lab **9981**; reserved **9982** / **9983** (other local products — allocator skips them); owned projects from **9984** upward.

| Step | Tool | Notes |
|------|------|-------|
| 1 | `create_td_project` | `{ destDir, name?, port? }` — copies [`templates/mcp_project`](../templates/mcp_project/); writes `.tdmcp/state.json`; **does not select** |
| 2 | `start_td_project` | `{ toePath, tdExe?, timeoutMs? }` — requires state file beside the toe; **selects** the owned target |
| 3 | Work | Node/script tools on sticky owned target |
| 4 | `stop_td_project` | `{ targetId }` — refuses `lab`; if that target was selected, sticky falls back to `lab` |

Exe resolution: optional `tdExe`, else `TDINSTALL_TD_EXE` / `TOUCHDESIGNER_EXE`, else platform default.

## Agent loop (Definition of Done)

1. `list_td_targets` when more than one target may exist or after MCP restart
2. `select_td_target` when not using lab (or after `start` which already selects)
3. Assert identity (`projectFolder` / `projectName` prefix)
4. Mutate via existing tools
5. Verify: `get_td_node_errors` clean on the touched subtree; for visuals, `get_top_image` shows the expected result (black frame = fail)

Stop after **3** failed calls with no new evidence.

## Template

[`templates/mcp_project`](../templates/mcp_project/) is a real TouchDesigner project with `mcp_webserver_base` imported. On start, `/project1/tdmcp_port_onstart` runs `utils.apply_tdmcp_port.apply()` so owned instances bind the port from `.tdmcp/state.json` instead of stealing lab **9981**. See the [template README](../templates/mcp_project/README.md).
