---
name: td-overview
description: This skill should be used when the user runs /td-companion:td-overview or asks for a project structure report, hierarchy summary, or health check of a TouchDesigner project — trigger phrases include "give me an overview of this TD project", "summarize the project structure", "what's in this TouchDesigner file", "map out the node hierarchy", or "audit this TouchDesigner project".
argument-hint: "[root-path]"
allowed-tools: ["mcp__plugin_td-companion_touchdesigner__get_td_info", "mcp__plugin_td-companion_touchdesigner__get_td_nodes", "mcp__plugin_td-companion_touchdesigner__get_td_node_errors", "mcp__plugin_td-companion_touchdesigner__get_td_node_parameters"]
version: 0.1.0
---

# TD Overview

Produce a structured report of a TouchDesigner project's component hierarchy, node composition, and health.

## Workflow

1. Resolve `root` to the `root-path` argument if given, otherwise `/project1` if it exists, else `/` (a project launched by opening the tox as a document has no `/project1`).

2. Call `get_td_info` once for context (TouchDesigner version, OS) to include in the report header.

3. Fetch the tree with a **single** `get_td_nodes` call on `root` (`includeProperties: false` for speed). `pattern` defaults to `"*"`, and that default makes the tool return the whole subtree recursively — not just direct children — so do not loop per COMP re-fetching paths already returned. Pass `pattern: ""` explicitly when only the direct children of a path are wanted. Reconstruct the hierarchy from the returned `path` strings. If the result is too large to report in full, say so explicitly and summarize rather than silently dropping nodes.

4. While traversing, tally node counts per operator family by matching each `opType` string's suffix (`TOP`, `CHOP`, `SOP`, `POP`, `DAT`, `MAT`, `COMP`) — this is a naming convention, not a separate field, so classify accordingly.

5. Identify notable chains on a best-effort basis using naming and `opType`, since `get_td_nodes` doesn't report wiring/connections directly: clusters of TOPs suggesting a render network (e.g. `render`, `camera`, `light`, `geo` family nodes co-located under one COMP), or CHOP/DAT nodes suggesting an audio chain (`audiofilein`, `audiodevicein`/`out`, `audiomovie*`). Also flag COMPs whose children are almost entirely one family (a pure-TOP compositing COMP, a pure-CHOP control-rig COMP) as likely functional units worth naming in the report even without an obvious chain label. State plainly that these groupings are inferred from names and types, not verified wiring — a caveat the report should carry, not hide.

6. Call `get_td_node_errors` with `nodePath` set to `root` to collect every error in the whole scope in one call (it covers descendants automatically).

7. Note observations that don't fit elsewhere: orphan-looking nodes still bearing TouchDesigner's auto-generated default name (e.g. `text1`, `null3`), which may mean they were never customized; COMPs with an unusually high child count relative to siblings, which may indicate an under-organized network worth splitting; and any obviously duplicated or inconsistent naming across siblings (e.g. `geo1` next to `geo_final` next to `Geo2`). Keep these as soft observations, not confirmed problems — call `get_td_node_parameters` on a suspect node only if it's worth the extra call to substantiate an observation.

8. Assemble the report as structured markdown with these sections: a hierarchy tree (indented by depth, noting truncation points), a node-count table per operator family, a "Notable chains" section with the inferred groupings and their caveat, an "Errors" section listing every entry from `get_td_node_errors` (or "no errors found"), and an "Observations" section for the orphan/naming notes. Keep the tone descriptive rather than judgmental — this is a map of what exists, not a code review.

## Failure handling

If `get_td_nodes` fails on the resolved root (invalid path, TouchDesigner unreachable), report the raw error and ask for a corrected path rather than silently defaulting to something else. If the hierarchy is far larger than the depth/count bounds allow, still deliver the report — clearly marked as partial — rather than exceeding the bounds to appear "complete." If `get_td_node_errors` fails, deliver the rest of the report and mark the Errors section as unavailable rather than omitting it silently.
