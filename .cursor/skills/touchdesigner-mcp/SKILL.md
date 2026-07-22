---
name: touchdesigner-mcp
description: >-
  Drive TouchDesigner via this asyade fork MCP (multi-instance sticky targets,
  lifecycle, ToeDigest, foreign/unknown .toe adopt). Use when mutating/inspecting
  live TD, creating/starting owned projects, offline .toe digest, inject_td_mcp,
  or after changing this package's src (build + reload). Self-contained for
  fork-alone checkouts; in the touchdesigner-mcp-td monorepo prefer the Cursor
  skill under .cursor/skills/touchdesigner-mcp/ (incl. reference/foreign-toe.md).
---

# TouchDesigner MCP (fork)

**SoT:** [docs/AGENT_MCP.md](../../../docs/AGENT_MCP.md). Offline: [docs/toe-digest.md](../../../docs/toe-digest.md).

**Monorepo Cursor harness:** when this package is a submodule of `touchdesigner-mcp-td`, use the parent [`.cursor/skills/touchdesigner-mcp/`](../../../../.cursor/skills/touchdesigner-mcp/SKILL.md) — unknown/downloaded toes: [foreign-toe.md](../../../../.cursor/skills/touchdesigner-mcp/reference/foreign-toe.md).

## Operate vs Document

- **Operate:** assert identity → tools → verify (`get_td_node_errors` / `get_top_image` or ToeDigest recipe). Stop after 3 failed probes.
- **Document:** update `docs/AGENT_MCP.md` first → README/skills → `npm run build` if schemas changed → restart MCP → probe.

## Sticky targets (quick)

| Situation | Action |
|-----------|--------|
| One TD / user silent | Stay **`lab`** (`:9981`) |
| Lab down | `create`→`start` owned, or ask user to open lab |
| Foreign / unknown `.toe` | `inject_td_mcp` → `start` (copy in empty `destDir`; runtime `loadTox` via `modules/tdmcp_bridge.tox`); see AGENT_MCP Unknown toe + monorepo foreign-toe.md |
| Many / non-lab | `list_td_targets` → `select_td_target` → assert identity |
| After MCP restart | Expect only `lab`; `start_td_project` to reattach owned |

Ports: lab **9981**; reserved **9982** Stagepad / **9983** 4designer; owned **≥9984**.

## Build + reload

```text
npm run build
# then restart MCP in the client (Cursor: MCP → touchdesigner → Restart)
```

Clients load `dist/cli.js`, not `src/`.

## ToeDigest (offline)

```text
stats → outline(path=project1, maxDepth=1) → wires(around=project1) → extensions
→ brief / get_toe_node deep on hubs
→ validate (toe_build: sibling dups / toc / tox↔op)
```

Expand paths ≠ guaranteed live `op()` paths. Details: `docs/toe-digest.md`.

## DoD (live)

1. Correct sticky target; identity matches intent
2. `get_td_node_errors` clean on touched subtree
3. Visuals: `get_top_image` not black
4. If source changed: rebuilt + MCP restarted + schema probe OK
5. Foreign toes: original archive path never overwritten; save only working `destDir` copy if user asks
