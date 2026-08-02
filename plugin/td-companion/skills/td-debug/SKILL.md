---
name: td-debug
description: This skill should be used when the user runs /td-companion:td-debug or asks to debug, investigate, or find TouchDesigner node errors — trigger phrases include "debug my TouchDesigner project", "why is this node broken", "find errors in TD", "investigate node errors", "what's wrong with /project1/geo1", or "fix this TouchDesigner error".
argument-hint: "[node-path]"
allowed-tools: ["mcp__plugin_td-companion_touchdesigner__get_td_info", "mcp__plugin_td-companion_touchdesigner__get_td_nodes", "mcp__plugin_td-companion_touchdesigner__get_td_node_errors", "mcp__plugin_td-companion_touchdesigner__get_td_node_parameters"]
version: 0.1.0
---

# TD Debug

Systematically investigate TouchDesigner node errors within a scope, classify each one, and propose fixes.

## Workflow

1. Resolve the scope to inspect: use the `node-path` argument if the user supplied one; otherwise default to `/project1` if it exists, else `/` (a project launched by opening the tox as a document has no `/project1` — the component sits at the root). If neither is available and the default seems wrong for the user's project (e.g. they referenced a specific component earlier), ask which path to scope to before continuing.

2. Optionally call `get_td_info` first if connectivity hasn't been confirmed this session — if it fails, stop and point the user at `/td-companion:td-setup` rather than proceeding against a dead connection.

3. Call `get_td_node_errors` with `nodePath` set to the resolved scope. This tool requires a `nodePath` but aggregates errors from that node **and all of its descendants**, so one call against `/project1` (or whatever scope was resolved) covers the whole subtree — there's no need to call it once per node.

4. If the response's `hasErrors` is false, report that no errors were found in scope and stop. Suggest widening or narrowing the scope if the user expected to find something.

5. If `hasErrors` is true, iterate the `errors` array. Each entry carries `nodePath`, `nodeName`, `opType`, and `message`. For a large error set, triage rather than processing every entry one by one: group by `opType` and by similar `message` text, and prioritize distinct root causes over duplicate symptoms.

6. For each distinct errored node (or a representative of a group), call `get_td_node_parameters` with that node's `nodePath` to inspect its current parameter values.

7. Inspect upstream context with `get_td_nodes` (`parentPath` set to the errored node's parent) to see sibling/input nodes feeding it, using naming and `opType` as a proxy for likely wiring since this tool does not report connections directly. When the error message or parameter values don't make the root cause clear enough this way, use `execute_python_script` for deeper probing (e.g. reading `op(path).inputs` or a DAT's script text) — this tool is not pre-authorized for this skill, so calling it will trigger a permission prompt; that's expected, not a bug.

8. Classify each distinct error using the message text and the context gathered so far, into one of: **missing input** (message references no/disconnected input), **bad parameter or expression** (parameter or expression syntax/evaluation failure), **file not found** (a file-based TOP/DAT/SOP path doesn't resolve), **script error** (a DAT's Python/GLSL raised an exception), or **other/unclassified** when none fit.

9. Propose a concrete fix per classified error (e.g. connect the missing input, correct the parameter value or expression, fix the file path, fix the script). Present these as a list before touching anything.

10. Apply fixes only with explicit user consent, one at a time, using whichever tool fits (`update_td_node_parameters`, `create_td_node`, `exec_node_method`, or `execute_python_script`) — none of these are pre-authorized for this skill, so each will prompt for permission. Do not batch-apply without confirming each change.

11. After applying any fix, re-run `get_td_node_errors` on the same scope to verify the error is actually gone rather than assuming the fix worked.

## Failure handling

If `get_td_node_errors` itself fails (connection lost, invalid path), report the raw error and suggest `/td-companion:td-setup` or ask for a corrected path — don't fabricate an error report. If the user declines to apply a proposed fix, leave the node untouched and report the diagnosis as the final output. If a fix is applied but the re-check still shows the same error, say so plainly and reconsider the classification rather than repeating the same fix.
