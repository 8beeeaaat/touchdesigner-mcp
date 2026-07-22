# Offline `.toe` tools (**alpha**)

Agent-facing contract for **read** (`get_toe_digest` / `get_toe_node`) and **write** (`inject_td_mcp`). Digest/node do **not** start TouchDesigner. Inject stages an owned workspace then you call `start_td_project` separately.

Adopt / conflict / failures SoT: [`AGENT_MCP.md`](AGENT_MCP.md) (Adopt foreign `.toe`).

## Full-project report recipe

```text
# 1) Overview + COMP Python Ext summary
get_toe_digest({ toePath, mode: "stats" })

# 2) Immediate children of project1 (maxDepth is *relative to path*)
get_toe_digest({ toePath, mode: "outline", path: "project1", maxDepth: 1 })

# 3) Root wire / select map (COMP hub falls back to children wires)
get_toe_digest({ toePath, mode: "wires", path: "project1", around: "project1" })

# 4) COMP Python Ext inventory (ext0object…; not Preferences packages)
get_toe_digest({ toePath, mode: "extensions" })

# 5) Hotspots
get_toe_digest({ toePath, mode: "brief", path: "project1/atmos_fog", radius: 1 })
get_toe_node({ toePath, path: "project1/stagepad", profile: "deep" })
```

## Canonical 2-call hub recipe

```text
# 1) Map a hub (ego wires + local nodes + sidecar abs paths)
get_toe_digest({ toePath, mode: "brief", path: "project1/comp_all", radius: 1 })

# 2) Deep one node (files + raw bodies + local wires + children + meta)
get_toe_node({ toePath, path: "project1/membrane_frag", profile: "deep" })

# Optional: read a sibling sidecar
get_toe_node({ toePath, path: "project1/glsl1", file: "glsl1_compute.text", profile: "deep" })
```

Every response includes `expand: { cacheKey, expandDir, tocPath, cacheHit }` so you can correlate to disk without guessing temp paths.

## Modes (`get_toe_digest`)

| Mode | Use |
|------|-----|
| **`brief`** | **Prefer for hub investigation** — hub seed required (`path`); ego wires + nodes + file metadata; COMP hubs fall back to children wires |
| `stats` | Tiny JSON + `byFamily` + `extensionsSummary` + expand locator |
| `outline` / `nodes` | Tree / flat list |
| `wires` | Edge list; use `around` + `radius` for ego graph; empty ego on a COMP hub → children (+ select parm) wires |
| `files` | Expand file inventory (abs paths, no bodies) |
| `refs` | Parm refs; default `refKind: "opOnly"` (`"all"` for expr spam) |
| `extensions` | COMP Python Ext inventory (`extNobject` / name / promote), grouped |
| **`validate`** | **Toe build check** — sibling op-name dups, `.toc` dups, project-dir `.tox` stem colliding with an op (detailed `toeBuild.errors`); `ok: false` when unsafe to open |

### Depth semantics

- **Without `path`:** `maxDepth` is absolute from expand root (legacy).
- **With `path`:** `maxDepth` means levels **below** that path (default 3). So `path=project1`, `maxDepth=1` lists immediate children.
- Optional `relativeDepth` overrides the levels-below count when `path` is set.

### COMP Python Exts

“Extension” here means a **COMP Python Ext** (`ext0object` / `ext0name` / `ext0promote` + linked Text DAT), **not** TD Preferences / site-packages / Palette.

Kinds: `local` (`op('./…')`), `shortcut` (`op.TDAnnotate…`), `other`. Identical Exts are grouped with `count` + `sampleHosts`.

## `get_toe_node`

| Profile | Includes |
|---------|----------|
| `summary` (default) | inputs, parms; always adds `extension` when present |
| `deep` | inputs, outputs, parms, files, raw, wires, **children**, **meta** (`cookOff`) |

Also: `suggestedOpPath` (`/` + expand path), optional `file=` for arbitrary sidecar under expandDir (sandboxed).

## Correlation

| Logical path | Typical expand files |
|--------------|----------------------|
| `project1/foo` (node) | `foo.n`, `foo.parm`, maybe `foo.text` |
| `project1/foo` (COMP) | `foo/`, `foo.n`, `foo.network`, children |
| Stem siblings | `glsl1` → `glsl1_compute.text`, `glsl1_info` |
| Live hint | `suggestedOpPath` ≈ `/project1/foo` (best-effort) |

Cache: `%TEMP%/tdmcp-toe-cache/<sha256>/`. **Never** writes beside the source toe. Concurrent expands share an in-process Promise and a `.tdmcp-expand.lock` file.

## Live vs offline correlation

| Digest / expand | Live |
|-----------------|------|
| Expand-relative path `project1/foo` | Best-effort `suggestedOpPath` ≈ `/project1/foo` — **not guaranteed** |
| `.n` inputs / `.network` compinputs | Operator wires / COMP inputs — exports/binds incomplete in W0 |
| `extensions` / `ext0object` | COMP Python Exts; confirm live with `get_td_node_parameters` if mutating |
| Cook / TOP pixels | **Not** in ToeDigest — use live `get_td_node_errors` / `get_top_image` |

When both matter: digest for map → open project → verify live before mutate.

## `inject_td_mcp` (alpha write)

Stages a **copy** of a foreign `.toe` into an empty `destDir`, grafts only `project1/tdmcp_port_onstart` (via `toeexpand` / `toecollapse`), syncs `.build` from the MCP kit, copies `modules/` + `import_modules.py` + **`modules/tdmcp_bridge.tox`**, writes `.tdmcp/state.json`. On open, `tdmcp_port_onstart` `loadTox`s the bridge (warning `runtimeBridge:loadTox`). Does **not** embed `/project1/tdmcp_bridge` in the foreign toe — that path (and shell-host merges) trigger TD “Unexpected node duplication … in file”.

| Rule | Detail |
|------|--------|
| Source | Never mutated |
| `destDir` | Must be empty/new; not the source folder |
| Host COMP | v1 requires `project1` |
| Expand cache | Inject expands the **working copy under `destDir`**, not `%TEMP%/tdmcp-toe-cache` |
| Bridge tox | Under `modules/tdmcp_bridge.tox` only — **never** project-root `tdmcp_bridge.tox` / `mcp_webserver_base.tox` (tox↔COMP name collision) |
| `onConflict` | `abort` (default) / `skip` (full = onStart + modules tox or embedded bridge) / `replace` |
| Verify | Pre/post collapse **toe_build**; collapse in place (no `*.injecting.*` rename); re-expand asserts onStart paths + modules tox, no embedded bridge COMP; hard fail wipes `destDir` |
| After inject | `start_td_project({ toePath })` — inject does **not** start or select; first open should have no duplication dialog |

```text
inject_td_mcp({ toePath: "C:/dl/demo.toe", destDir: "C:/tmp/demo_mcp" })
start_td_project({ toePath: "C:/tmp/demo_mcp/demo.toe" })
```

Replace/upgrade: new empty `destDir`, `toePath` = previously injected toe, `onConflict: "replace"`. Full cookbooks: [`AGENT_MCP.md`](AGENT_MCP.md).

Unknown / downloaded toes (open vs digest-only, inject failure ladder, recreate last resort, immutable source): [`AGENT_MCP.md`](AGENT_MCP.md) *Unknown / downloaded / archive `.toe`* and Cursor playbook [foreign-toe.md](../../../.cursor/skills/touchdesigner-mcp/reference/foreign-toe.md).

## Tests

```bash
npm run test:unit
npm run test:toe-digest-replay   # Gestation ≤3-call budget (needs toeexpand)
```

## E2E / human gate

1. Reload MCP so tools pick up new schemas.
2. Run replay or live brief→deep on Gestation.
3. User yes/no: can you follow membrane → comp without guessing temp paths?
4. Inject gate: `inject_td_mcp` on a foreign toe → `start_td_project` → `get_td_info` matches `destDir`.
