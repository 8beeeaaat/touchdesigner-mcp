# TouchDesigner MCP — agent contract (asyade fork)

Source of truth for agents using **this fork** (branch `multi-instance` and builds from it — not necessarily `npx touchdesigner-mcp-server@latest`).

## Operate vs Document

| Mode | When | Definition of Done |
|------|------|--------------------|
| **Operate** | Drive live TD, multi-instance, or offline ToeDigest | Identity asserted → tools used correctly → verify (`get_td_node_errors` / `get_top_image` / **FPS Perform CHOP monitor** or ToeDigest recipe). Stop after **3** failed probes with no new evidence. |
| **Document** | Changing tools/schemas/docs/skills, or asked to update agent docs | Diff runtime inventory vs this file → edit **this SoT first** → update README/skills → `npm run build` if schemas changed → restart MCP → scenario checklist green. Do not paraphrase READMEs into skills. |

**Runtime schemas win** for tool names and parameters (`describe_td_tools` / Zod in `dist`). This document must match a built `dist/`.

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

## Ports (local products)

| Port | Role |
|------|------|
| **9981** | Builtin sticky target **`lab`** (TD WebServer) |
| **9982** | Reserved — Stagepad daemon (not a TD sticky target) |
| **9983** | Reserved — 4designer daemon (not a TD sticky target) |
| **≥9984** | MCP-owned TD instances (`create_td_project` / `start_td_project`) |

Allocator skips 9982/9983. Never point TD WebServer tools at Stagepad/4designer ports.

## After changing this package (build + reload)

Cursor/stdio clients execute **`dist/cli.js`**, not `src/`. Source edits are invisible until rebuild + process restart.

```powershell
cd path/to/touchdesigner-mcp   # e.g. tools/touchdesigner-mcp in a monorepo
npm run build
```

Then restart the MCP server in the client:

1. Cursor: Settings → MCP → **touchdesigner** → Restart (or toggle off/on)
2. Fallback: Command Palette → **Developer: Reload Window**

**Order matters:** build, then restart. Restarting without rebuild keeps stale Zod schemas (classic: new `mode` rejected while source has it).

Sanity after reload: `describe_td_tools` / tool descriptor shows new params; or call the new mode once.

Optional monorepo checklist (symptoms table): parent checkout
[`.cursor/skills/touchdesigner-mcp/reference/reload-mcp.md`](../../../.cursor/skills/touchdesigner-mcp/reference/reload-mcp.md).
Fork-alone: this section is enough.

## Tool inventory

Prefer named tools for single operations. Use `execute_python_script` for multi-step work not covered below. Always pass `detailLevel: "summary"` (or `"minimal"`) unless you need a full dump.

### Targets and lifecycle

| Tool | Role |
|------|------|
| `list_td_targets` | In-memory registry (lab + MCP-owned). **No liveness probe.** |
| `select_td_target` | Sticky select by `id`; **probes** identity; fails if unknown or offline |
| `create_td_project` | Copy template → `destDir`; write `.tdmcp/state.json`; upsert owned. **Does not start TD or select.** |
| `start_td_project` | Spawn TD on `toePath` (requires `.tdmcp/state.json`); wait for bridge; auto-dismiss Windows `#32770` dialogs; **selects** owned. Returns `dismissedDialogs[]` |
| `stop_td_project` | Soft quit then kill owned PID. **Refuses `lab`.** |
| `td_ui_dialogs` | **Windows-only.** `action: list\|dismiss` for sticky-target PID: list dialogs + `responding` / `mainWindowTitle`, or dismiss `#32770` by title (omit title = all listed). Does not unstick a hung UI thread |

### Offline ToeDigest / inject (alpha)

| Tool | Role |
|------|------|
| `get_toe_digest` | Offline `.toe` via `toeexpand` (cached). Modes: `stats`, `outline`, `nodes`, `wires`, `refs`, `files`, `brief`, `extensions`. See [`toe-digest.md`](toe-digest.md). |
| `get_toe_node` | Offline node/COMP inspect (`summary` / `deep`); optional `file=` sidecar |
| `inject_td_mcp` | Offline: copy foreign `.toe` → empty `destDir`, graft `tdmcp_port_onstart` only, stage `modules/` + `modules/tdmcp_bridge.tox` (runtime `loadTox` on open — no embedded bridge COMP), write `.tdmcp/state.json`. **Does not start TD or select.** `onConflict`: `abort` (default) \| `skip` \| `replace`. Requires `project1`. See adopt cookbook below. |

### Project / nodes / scripts

| Tool | Role |
|------|------|
| `get_td_info` | Bridge + identity on the **sticky** target (`projectName`, `projectFolder`, `osPid`, `targetId`, `webServerPort`, …) |
| `get_td_nodes` | List children under a path (`includeProperties: false` unless needed) |
| `get_td_node_parameters` / `update_td_node_parameters` | Read / write parameters |
| `create_td_node` / `delete_td_node` | Create / delete |
| `exec_node_method` | Call a Python method on a node |
| `execute_python_script` | Multi-step Python in TD (last expression side-effect safe when used as return value) |
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

- Editor typing / TDI stubs: out of band (never `import tdi` inside TD at runtime).
- Stagepad / 4designer: separate daemons on **9982** / **9983**; not sticky TD targets.

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
- `create_td_project` / `inject_td_mcp` still work (filesystem only)
- Bring up an owned instance with `create_td_project` → `start_td_project`, **or** `inject_td_mcp` → `start_td_project` for a foreign toe, **or** ask the user to open lab with the bridge on **9981**
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

| Step | Tool | Notes |
|------|------|-------|
| 1 | `create_td_project` | `{ destDir, name?, port? }` — copies [`templates/mcp_project`](../templates/mcp_project/); writes `.tdmcp/state.json`; **does not select** |
| 2 | `start_td_project` | `{ toePath, tdExe?, timeoutMs? }` — requires state file beside the toe; **selects** the owned target; returns `dismissedDialogs` |
| 3 | Work | Node/script tools on sticky owned target |
| 4 | `stop_td_project` | `{ targetId }` — refuses `lab`; if that target was selected, sticky falls back to `lab` |

Exe resolution: optional `tdExe`, else `TDINSTALL_TD_EXE` / `TOUCHDESIGNER_EXE`, else platform default.

### Adopt foreign `.toe` (inject)

Greenfield empty project: `create_td_project`. Foreign/community `.toe` that lacks the bridge: **`inject_td_mcp`** then `start_td_project`. Never `project.load()` a foreign toe into **lab**.

| Step | Tool | Notes |
|------|------|-------|
| 0 | `get_toe_digest` | Optional map of source |
| 1 | `inject_td_mcp` | `{ toePath, destDir, name?, port?, onConflict?, tdExe? }` — empty `destDir` only; copies source; grafts `tdmcp_port_onstart` + `modules/tdmcp_bridge.tox` (runtime `loadTox`); writes state; **does not select** |
| 2 | `start_td_project` | `{ toePath }` from inject result |
| 3 | `get_td_info` | Assert `projectFolder` = `destDir` |
| 4 | Work / `stop_td_project` | Same as owned lifecycle |

**`onConflict`:**

| Value | When bridge stems already present |
|-------|-----------------------------------|
| `abort` (default) | Error `MCP_BRIDGE_EXISTS` or `MCP_BRIDGE_PARTIAL`; wipes the failed `destDir` |
| `skip` | Full bridge only: refresh sidecars + state; no re-collapse; `action: "skipped"` |
| `replace` | Wipe graft-owned ops and reinject current template kit; `action: "replaced"` |

**Replace/upgrade** always uses a **new empty `destDir`**. Point `toePath` at a previously injected toe (or a foreign toe that already has a bridge):

```text
inject_td_mcp({ toePath: destA + "/demo.toe", destDir: destB, onConflict: "replace" })
start_td_project({ toePath: destB + "/demo.toe" })
```

**Runtime-bridge inject:** keep the foreign networks intact (sync `.build` from the MCP kit). Graft only `tdmcp_port_onstart`, which `loadTox`s `modules/tdmcp_bridge.tox` on open. Embedding the full bridge COMP into a community toe, or shell-host merging foreign COMPs into the MCP template, triggers TD “Unexpected node duplication (/project1/…) in file”. Warning `runtimeBridge:loadTox` is expected. Never stage `tdmcp_bridge.tox` at the project root (only under `modules/`). Collapse runs **in place** on the working expand (avoid `*.injecting.*` renames on Windows).

**Sidecars:** inject copies `modules/` + `import_modules.py` + `modules/tdmcp_bridge.tox`. Project-root bridge `.tox` files are deleted. After `loadTox`, modules resolve via `project.folder + '/modules'`.

DoD includes at least one live `inject → start_td_project → get_td_info` with **no** duplication dialog after shipping changes.

#### Unknown / downloaded / archive `.toe`

When the `.toe` is not already MCP-owned (community download, L1 raw archive, library file):

| Need | Path |
|------|------|
| Structure / scripts only (no live cook) | ToeDigest only — do not inject |
| Live open / mutate / TOP verify | **`inject_td_mcp` first** into an empty `destDir`, then `start_td_project` on the **copy** |
| Inject/start still fails after retries | Last resort: `create_td_project` → recreate technique from digest under `_agent_scratch` |

**Rules:** source `toePath` is never mutated (inject copies). Do not `start_td_project` on the raw archive path or `project.load()` into **lab**. On consecutive failure: new empty `destDir` + `onConflict: "replace"`, then `get_toe_digest({ mode: "validate" })` / toe_build details; if still unusable (`NO_PROJECT1`, verify fail, bridge timeout), stop grinding inject and recreate. `project.save()` only if the user asks — save only the **working copy** under `destDir`; before overwrite, copy a sibling backup inside `destDir` (never beside the archive original). Failed inject may wipe the failed `destDir` only.

Agent playbook (Cursor): monorepo [`.cursor/skills/touchdesigner-mcp/reference/foreign-toe.md`](../../../.cursor/skills/touchdesigner-mcp/reference/foreign-toe.md).

## Live vs offline

| Need | Use |
|------|-----|
| Live cook state, errors, TOP pixels, mutate network | Live tools on sticky target (`get_td_*`, `execute_python_script`, …) |
| Inspect a `.toe` on disk without TD open | `get_toe_digest` / `get_toe_node` (ToeDigest) |
| Adopt foreign `.toe` for live Operate | `inject_td_mcp` → `start_td_project` |
| Both | Digest for map → inject/start → live tools |

**Expand paths are not guaranteed `op()` paths.** Prefer digest for structure/refs; confirm live with `get_td_nodes` / `execute_python_script` before mutating from digest alone.

## Offline ToeDigest (alpha)

Inspect a `.toe` on disk without opening TouchDesigner. **Alpha:** shapes/caps may change; not a stable public API. Full contract: [`toe-digest.md`](toe-digest.md).

Full-project map:

```text
get_toe_digest({ toePath, mode: "stats" })
get_toe_digest({ toePath, mode: "outline", path: "project1", maxDepth: 1 })
get_toe_digest({ toePath, mode: "wires", path: "project1", around: "project1" })
get_toe_digest({ toePath, mode: "extensions" })
```

Hub 2-call loop:

```text
get_toe_digest({ toePath, mode: "brief", path: "project1/comp_all", radius: 1 })
get_toe_node({ toePath, path: "project1/membrane_frag", profile: "deep" })
```

`maxDepth` with `path` set = levels **below** that path. COMP hubs with empty ego wires fall back to children (+ select parm) edges. “Extensions” = COMP Python Ext (`ext0…`), not Preferences packages.

## Failure cookbook

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| `ECONNREFUSED` / connection failed | TD closed or WebServer off on sticky port | Start lab on **9981**, or `start_td_project` for owned |
| `list_td_targets` shows lab but mutate fails | List ≠ alive | Probe with `get_td_info` / `select_td_target` |
| Mutations hit wrong project | Wrong sticky target | `list` → `select` → assert `projectFolder`/`projectName` |
| After Cursor/MCP restart, owned gone from list | Registry is memory-only | `start_td_project` on toe with `.tdmcp/state.json` |
| `stop_td_project` refuses | Target is `lab` | Never stop lab; stop owned `id` only |
| `start_td_project` fails missing state | No `.tdmcp/state.json` beside toe | `create_td_project` or `inject_td_mcp` first, or restore state file |
| Dual/weird tool sets | Upstream `npx` + fork both enabled | Disable user-level upstream; one `dist/cli.js` |
| New tool `mode`/param rejected by Zod | Stale `dist` or MCP not restarted | `npm run build` then restart MCP |
| ToeDigest / expand fails | `toeexpand` not found or bad `toePath` | Install/path TD so sibling `toeexpand` exists; absolute `.toe` path |
| `MCP_BRIDGE_EXISTS` / `PARTIAL` | Source already has bridge stems | Retry with `onConflict: "replace"` (new empty `destDir`) or `"skip"` if full |
| `NODE_NAME_DUPLICATE` / `TOC_DUPLICATE` | Duplicate op names or `.toc` lines (case variants) | `onConflict: "replace"`; inject always wipes reserved stems before graft; use `get_toe_digest({ mode: "validate" })` for details |
| `TOX_NAME_COLLISION` | Project-root `.tox` stem matches an op | Delete root `tdmcp_bridge.tox` / `mcp_webserver_base.tox`; keep tox only under `modules/`; re-inject |
| `mcp_webserver_base` / `…base1` / “Unexpected node duplication … in file” | Embedded bridge / project-root `.tox` / old shell-host merge | Re-inject with current MCP (`runtimeBridge:loadTox`, tox only under `modules/`); delete leftover root bridge `.tox` |
| Non-empty `dismissedDialogs` with `severity: hard` or `unknown` after `start_td_project` | Load/UI modal (e.g. duplication) was shown (may have been auto-dismissed) | **Stop mutate.** `stop_td_project` if owned; remove root `.tox` / re-inject / `validate`; do not continue as if healthy |
| `dismissedDialogs` only `severity: soft` (e.g. Backwards Compatiblity Issue) | TD runtime advisory | Safe to continue; optional user re-save later clears warning |
| `start_td_project` timeout with `uiSnapshot` `responding: false` | TD UI stuck / hung during open | Stop grinding; `stop_td_project` or kill orphan PID; new `destDir` / foreign-toe ladder |
| Mid-session modal still open | Bridge up while `#32770` remains | `td_ui_dialogs({ action: "list" })` then `dismiss`; re-check |
| `NO_PROJECT1` | Foreign toe has no `project1` | v1 unsupported; recreate under template or ask user |
| `SOURCE_LOCKED` | Source `.toe` open in TD | Close TD or copy file first |
| `INJECT_VERIFY_FAILED` / 0-byte toe | Collapse/toc corruption or expand rename | Prefer in-place collapse; check `toecollapse`; retry; never hand-edit `.toc` with BOM/lossy tools |
| `ModuleNotFoundError: mcp` after start | Missing `modules/` or failed `loadTox` | Re-`inject` with `replace`; ensure `modules/` + `modules/tdmcp_bridge.tox` |
| Black `get_top_image` | Visual failure, not success | Fix network; do not claim pass |
| Low viewer FPS / hitching | `cookRate` is target only; heavy TOP (e.g. HD sparse Noise) can tank FPS while image is non-black | Sample Perform CHOP `fps` + rank `cookTime` on the touched TOP chain; fix hotspots before claiming realtime |

## Agent loop (Operate DoD)

1. `list_td_targets` when more than one target may exist or after MCP restart
2. `select_td_target` when not using lab (or after `start` which already selects)
3. Assert identity (`projectFolder` / `projectName` prefix)
4. Mutate via existing tools
5. Verify: `get_td_node_errors` clean on the touched subtree; for visuals, `get_top_image` shows the expected result (black frame = fail); sample achieved FPS via Perform CHOP monitor + `cookTime` hotspots (`cookRate` is not a pass)

Stop after **3** failed calls with no new evidence.

## Document mode checklist

1. Diff tools in `src/core/constants.ts` + Zod vs this inventory and README tools table
2. Edit this file and [`toe-digest.md`](toe-digest.md) first
3. Update Cursor/Claude skills that cite tools
4. If schemas/code changed: `npm run build` → restart MCP → probe
5. Run scenario cold-read from [`.cursor/skills/touchdesigner-mcp/SKILL.md`](../.cursor/skills/touchdesigner-mcp/SKILL.md) (fork) or monorepo skill

## Template

[`templates/mcp_project`](../templates/mcp_project/) is a real TouchDesigner project with `mcp_webserver_base` imported. On start, `/project1/tdmcp_port_onstart` runs `utils.apply_tdmcp_port.apply()` so owned instances bind the port from `.tdmcp/state.json` instead of stealing lab **9981**. See the [template README](../templates/mcp_project/README.md).

## Architecture pointer

Internals (registry, ALS, queues): [architecture.md — Multi-target sticky routing](architecture.md#multi-target-sticky-routing).
