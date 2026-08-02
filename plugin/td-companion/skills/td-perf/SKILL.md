---
name: td-perf
description: This skill should be used when the user runs /td-companion:td-perf, or explicitly requests a guided, measured performance audit of a TouchDesigner project — a cook-time profiling pass across the network producing a ranked optimization report. For general performance questions, advice, or optimization knowledge without a measurement run, the td-performance knowledge skill applies instead.
argument-hint: "[root-path]"
allowed-tools: ["mcp__plugin_td-companion_touchdesigner__get_td_info", "mcp__plugin_td-companion_touchdesigner__get_td_nodes"]
version: 0.1.0
---

# TD Perf

Diagnose TouchDesigner performance bottlenecks by measuring per-operator cook time and correlating the worst offenders with known heavy patterns.

## Workflow

1. Explain up front that real measurement requires running a script via `execute_python_script`, which is not pre-authorized for this skill — the permission prompt that follows is expected, not a malfunction.

2. Call `get_td_info` to confirm TouchDesigner is reachable before doing anything else; if it fails, point the user at `/td-companion:td-setup` instead of proceeding.

3. Resolve `root` to the `root-path` argument if given, otherwise `/project1` if it exists, else `/` (a project launched by opening the tox as a document has no `/project1`).

4. With the user's consent, run a measurement script through `execute_python_script` with `detailLevel: "detailed"` so the complete ranking is returned rather than the summary formatter's 500-character preview. Collect `root`'s descendants with `findChildren()` (the same confirmed-stable traversal the td-performance skill describes), and for each operator record its `path`, `name`, `opType`, and `cookTime` (skipping operators where `cookTime` isn't a meaningful attribute rather than erroring out). Sort the collected results by `cookTime` descending and keep roughly the top 20. For example:

   ```python
   results = []
   for child in op(root).findChildren():
       ct = getattr(child, "cookTime", None)
       if ct is not None:
           results.append({"path": child.path, "name": child.name, "opType": getattr(child, "OPType", ""), "cookTime": ct})
   results.sort(key=lambda r: r["cookTime"], reverse=True)
   result = results[:20]
   ```

   Adjust the traversal to the actual project structure as needed — the shape above is illustrative, not a fixed template.

5. Caveat the numbers before analyzing them: cook time is only meaningful while the project is actually cooking (playing/performing), so if the project was paused or idle when measured, say so and ask to re-measure while it's running. Also flag that TOP `cookTime` is a CPU-side figure and tends to understate real GPU cost, particularly for GPU-heavy TOPs (renders, feedback, blurs) — treat it as a ranking signal for relative cost, not an absolute GPU budget.

6. Correlate the top offenders with known heavy patterns rather than reporting raw numbers alone: very large TOP resolutions, Movie File In TOPs decoding compressed video every frame, per-frame Python (Execute DATs, Script CHOPs/TOPs/SOPs) running non-trivial logic each cook, and SOP/TOP copies used in place of instancing for repeated geometry.

7. Produce a prioritized optimization list: for each of the top handful of offenders, state what it's costing relative to the others, why (which pattern from step 6 applies), and a concrete suggested fix (e.g. lower resolution, switch to hardware-accelerated decode, only run per-frame logic on change, switch a Copy SOP to instancing).

8. Offer to re-run the same measurement script after the user applies changes, to confirm the fix actually moved the numbers rather than assuming it did.

## Failure handling

If the user declines to run the measurement script, don't fabricate numbers — offer static advice based on the known heavy patterns in step 6 and the project's node composition from `get_td_nodes` alone, clearly labeled as unmeasured guesses. If the script errors (invalid root path, `op(root)` resolves to `None`), report the raw error and ask for a corrected path. If `cookTime` is unavailable across the board (e.g. the project was never actually played), say so plainly and ask the user to play the project before re-measuring, rather than presenting a ranking built from all-zero data.
