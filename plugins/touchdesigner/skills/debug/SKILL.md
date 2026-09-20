---
description: This skill should be used when the user runs /touchdesigner:debug
  or asks to debug, investigate, or find TouchDesigner node errors — trigger
  phrases include "debug my TouchDesigner project", "why is this node broken",
  "find errors in TD", "investigate node errors", "what's wrong with
  /project1/geo1", or "fix this TouchDesigner error".
name: debug
---

## Client integration

Use the connected TouchDesigner server's tools by logical name; discover the actual client namespace instead of constructing a Claude tool prefix. Slash-command examples also work as natural-language requests for the named skill. After any network mutation, read back affected parameters, check `get_td_node_errors`, and inspect `get_top_image` for TOP output when relevant. Do not rely on a post-tool hook to remind you.

# TD Debug

Systematically investigate TouchDesigner node errors within a scope, classify each one, and propose fixes.

## Workflow

1. Resolve the scope to inspect: use the `node-path` argument if the user supplied one; otherwise default to `/project1` if it exists, else `/` (a project launched by opening the tox as a document has no `/project1` — the component sits at the root). If neither is available and the default seems wrong for the user's project (e.g. they referenced a specific component earlier), ask which path to scope to before continuing.

2. Optionally call `get_td_info` first if connectivity hasn't been confirmed this session — if it fails, stop and point the user at `/touchdesigner:setup` rather than proceeding against a dead connection.

3. Call `get_td_node_errors` with `nodePath` set to the resolved scope. This tool requires a `nodePath` but aggregates errors from that node **and all of its descendants**, so one call against `/project1` (or whatever scope was resolved) covers the whole subtree — there's no need to call it once per node.

4. Read the report as it is actually rendered, and decide what it licenses you to say. By default it comes back as markdown rather than the raw schema: a `## Node <path>` heading, an `- Errors: N · Warnings: M` line, and — when there is anything to list — a table whose rows are `| Level | Node | Type | Message |`, warnings included. Three things follow from that shape:

   - **Warnings are findings, not noise.** A missing file, a dangling operator reference and a shader that will not compile are all reported as warnings rather than errors, so a `warning` row is usually the answer rather than a footnote to it.
   - **`_No errors or warnings reported._` is the only all-clear.** That sentence is withheld whenever a message stream could not be read, the warning stream was never inspected (an older `mcp_webserver_base.tox`, predating warning collection), or the reported counts disagree with the rows returned — those cases print a `> ⚠️` blockquote instead. An empty table *without* that sentence is a scope that could not be fully seen, not a clean one. Say which of the two it was rather than reporting both as "no errors".
   - **Even a genuine all-clear is not proof the node cooked.** This tool reads the operator error and warning streams only. An exception raised inside a Script OP callback — a `scriptCHOP`'s `onCook`, an Execute DAT's callback — lands on neither stream and is reported nowhere here, producing exactly the same empty report as a healthy node.

   So: if the report is clean and the user described no specific symptom, say so, and suggest widening or narrowing the scope. If the report is clean but the user pointed at a concrete misbehaviour, do **not** stop there — carry on from step 6 against the operator they named, and when it is a Script OP or an Execute DAT, probe the callback directly with `execute_python_script` (read the DAT's text, then `op(path).cook(force=True)` and print what comes back) rather than trusting the empty report.

   Pass `responseFormat: "json"` when the raw `hasErrors` / `errors[]` / `hasWarnings` / `warnings[]` fields are actually needed; `detailLevel: "detailed"` returns YAML rather than markdown.

5. Otherwise iterate the reported entries. Each table row carries `level` (`error` or `warning`), `nodePath`, `opType`, and `message`; `nodeName` appears only in the JSON form. For a large error set, triage rather than processing every entry one by one: group by `opType` and by similar `message` text, and prioritize distinct root causes over duplicate symptoms.

6. For each distinct errored node (or a representative of a group), call `get_td_node_parameters` with that node's `nodePath` to inspect its current parameter values.

7. Inspect upstream context with `get_td_nodes` (`parentPath` set to the errored node's parent, plus `pattern: ""` — the default `"*"` returns that parent's entire subtree rather than just its direct children) to see sibling/input nodes feeding it, using naming and `opType` as a proxy for likely wiring since this tool does not report connections directly. When the error message or parameter values don't make the root cause clear enough this way, use `execute_python_script` for deeper probing (e.g. reading `op(path).inputs` or a DAT's script text) — this call may prompt for permission; that's expected, not a bug.

8. Classify each distinct error using the message text and the context gathered so far, into one of: **missing input** (message references no/disconnected input), **bad parameter or expression** (parameter or expression syntax/evaluation failure), **file not found** (a file-based TOP/DAT/SOP path doesn't resolve), **script error** (a DAT's Python/GLSL raised an exception), **callback exception** (a Script OP or Execute DAT callback failed — reached through the probe in step 4, never through the error report, which cannot see it), or **other/unclassified** when none fit.

9. Propose a concrete fix per classified error (e.g. connect the missing input, correct the parameter value or expression, fix the file path, fix the script). Present these as a list before touching anything.

10. Apply fixes only with explicit user consent, one at a time, using whichever tool fits (`update_td_node_parameters`, `create_td_node`, `exec_node_method`, or `execute_python_script`) — each of these may prompt for permission. Do not batch-apply without confirming each change.

11. After applying any fix, re-run `get_td_node_errors` on the same scope to verify the error is actually gone rather than assuming the fix worked — except for a **callback exception**, which never appeared in that report and so cannot disappear from it. Verify that one the way it was found: re-run the `execute_python_script` probe and check the callback now returns what it should.

## Failure handling

If `get_td_node_errors` itself fails (connection lost, invalid path), report the raw error and suggest `/touchdesigner:setup` or ask for a corrected path — don't fabricate an error report. If the user declines to apply a proposed fix, leave the node untouched and report the diagnosis as the final output. If a fix is applied but the re-check still shows the same error, say so plainly and reconsider the classification rather than repeating the same fix.
