---
name: td-snapshot
description: This skill should be used when the user runs /td-companion:td-snapshot or asks to see, preview, capture, or confirm the visual output of a TouchDesigner TOP — trigger phrases include "show me the output", "what does this look like", "capture the render", "snapshot the TOP", "check the visual output", or "is this TOP rendering correctly".
argument-hint: "[top-path]"
allowed-tools: ["mcp__plugin_td-companion_touchdesigner__get_td_nodes", "mcp__plugin_td-companion_touchdesigner__get_top_image"]
version: 0.1.0
---

# TD Snapshot

Capture and visually confirm the current output of a TouchDesigner TOP.

## Workflow

1. Resolve the target TOP. If the user supplied a `top-path` argument, use it directly and skip to step 3.

2. Otherwise, discover candidates: call `get_td_nodes` with `parentPath` set to `/project1` — or `/` when `/project1` doesn't exist (a project launched by opening the tox as a document) — or a path the user mentioned, and inspect the returned nodes' `opType` values for ones ending in `TOP`. Prefer, in order: a node literally named `out1` or `output`, a node named like `null_final` or containing `final`/`out`, or — failing a naming match — the last TOP-family node in the list. State explicitly which node was picked and why (e.g. "picked `/project1/out1` because it's the conventional output name") so the user can correct the guess if it's wrong. If several equally plausible candidates exist and none is a clear "final output," list them and ask the user to pick rather than guessing silently.

   If the target is nested inside a sub-COMP rather than sitting directly under `/project1`, narrow `parentPath` to that COMP first (using whatever path context the user's request implies) instead of scanning the whole project — this keeps the candidate list relevant and avoids surfacing unrelated TOPs from other parts of the network.

3. Call `get_top_image` with `nodePath` set to the resolved path. Omit `maxSize` for native resolution unless the image is likely to be very large, in which case pass a reasonable cap (e.g. `1024`) to keep the response light.

4. Present the returned image to the user (it comes back as an image content block, rendered directly) along with a short description of what's visible: the general composition, dominant colors, and — if the user stated what they expected to see — whether it matches that intent.

5. If the image is black, blank, or otherwise clearly empty, walk likely causes rather than reporting failure outright:
   - **Upstream error** — check with `get_td_node_errors`. This tool is not pre-authorized for this skill, so calling it will trigger a permission prompt; that's expected.
   - **Resolution** — a TOP with a zero or degenerate resolution renders nothing; this can only be confirmed by inspecting parameters (`get_td_node_parameters`) or running a script, both outside this skill's pre-authorized tools, so mention it as a hypothesis if it can't be directly confirmed.
   - **Display/bypass flag** — a wrong pick in step 2 can leave a different node cooking than the one being viewed; reconsider whether a different TOP further down the chain is the actual intended output.

6. Report findings clearly: what was captured, what it shows, and — if empty — which of the above causes look most likely given what could actually be checked with the tools available.

## Failure handling

If `get_top_image` fails (bad path, TouchDesigner unreachable, or the capture script errors), report the raw error rather than presenting a placeholder — a failed capture is not the same as a black render, and conflating them will mislead the user. If no TOP-family nodes are found under the resolved parent path, say so and ask the user for an explicit path instead of guessing outside the discovered set. If the resolved node later turns out to be the wrong pick (the user says "that's not the output"), redo the discovery step with the corrected context instead of insisting on the original guess.
