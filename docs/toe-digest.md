# ToeDigest — offline `.toe` inspect (**alpha**)

Agent-facing contract for `get_toe_digest` (**alpha** — API and IR may change). Does **not** start TouchDesigner.

## Spike findings (Slice 0)

`toeexpand` (beside `TouchDesigner.exe`) writes next to a **copy** of the toe:

| Artifact | Role |
|----------|------|
| `name.toe.dir/` | Expand tree (networks as folders) |
| `name.toe.toc` | Manifest |
| `.build` inside `.dir` | Build / version text |
| `toeexpand -b file.toe` | Prints build to stdout **without** expanding |

Observed layout (template + Gestation):

- Top: `project1/`, `local/`, `project1.n`, meta files (`.build`, `.root`, …)
- Nodes: `foo.n` (+ sidecars `.parm`, `.text`, …). COMP networks often appear as **both** `foo/` and `foo.n`.
- First line of `.n` is a cheap type hint: `COMP:base`, `DAT:execute`, `TOP:…` (**L1**).

**Note:** `toeexpand` often exits with code **1** even on success. Success = `.dir` + `.toc` exist.

Gestation (~12 MB) expanded in &lt;1 s to ~418 files / 11 dirs on lab hardware.

## Modes

| Mode | Use |
|------|-----|
| `stats` | Tiny JSON: build, counts, `topLevel` |
| `outline` (default) | Indented text + optional `# FAMILY:type` hints; capped by `maxNodes` / `maxChars` |
| `nodes` | Flat `{ relPath, kind, opHint? }[]` |

Paths are **expand-relative** (e.g. `project1/mcp_webserver_base`), not guaranteed live `op()` paths.

Defaults: `maxDepth=3`, `maxNodes=80`, `maxChars=6000`.

Cache: `%TEMP%/tdmcp-toe-cache/<sha256>/` (copy + expand). Source / scrape `raw/` never written.

## Agent usage

```text
get_toe_digest({ toePath: "…/Gestation.toe", mode: "stats" })
get_toe_digest({ toePath: "…/Gestation.toe", mode: "outline", path: "project1", maxDepth: 2 })
```

## E2E checklist (Slice A2 — human-gated)

After A1 is built and **MCP client reloaded**:

### Required user steps

1. [ ] Reload Cursor MCP / restart `touchdesigner-mcp` so `get_toe_digest` appears.
2. [ ] Confirm absolute paths for template + Gestation on this machine.
3. [ ] Judgment Case T (template): outline useful? yes / no
4. [ ] Judgment Case G (Gestation): outline useful? yes / no  
   On **no**: note why; agent may re-run A2 at most **twice**.

### Cases (agent)

**T — template** `tools/touchdesigner-mcp/templates/mcp_project/project.toe`

- [ ] `mode: "stats"` → build set, `topLevel` includes `project1`
- [ ] `mode: "outline"` `path: "project1"` → mentions `mcp_webserver_base`
- [ ] Second identical call → `cacheHit: true`
- [ ] Outline ≤ `maxChars`

**G — Gestation**  
`docs/td-technics/raw/derivative.ca/community/asset/75049_…/downloads/Gestation.toe`

- [ ] Completes; `fileCount` &gt; 0
- [ ] Outline under `project1` non-empty
- [ ] No new `.toc` / `.dir` beside the scraped file

**N — negative**

- [ ] Missing path → clear error

### Optional live compare

5. [ ] User opens template toe in TD (or skip: reason ________)
6. [ ] Agent `get_td_nodes` `/project1` overlaps digest names (spot-check)

### Sign-off

- [ ] User signs off A2 → Slice B unblocked  
- Date / notes: ________

## Disk smoke (no MCP)

```bash
npm run build
npm run test:toe-digest-smoke
```

Skips cleanly if `toeexpand` is missing.
