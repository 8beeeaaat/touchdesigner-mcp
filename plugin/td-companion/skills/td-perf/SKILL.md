---
name: td-perf
description: This skill should be used when the user runs /td-companion:td-perf, or asks to measure where frame time is going in a TouchDesigner project — a cook-time profiling pass across the network producing a ranked list of the slowest operators. Trigger phrases include "measure cook times", "profile my TD project", "which operator is slowest", "fps dropped", and "why is this project slow". It measures and reports the numbers; it does not carry general TouchDesigner optimization advice.
argument-hint: "[root-path]"
version: 0.1.0
---

# TD Perf

Diagnose TouchDesigner performance bottlenecks by measuring per-operator cook time and correlating the worst offenders with known heavy patterns.

## Workflow

1. Explain up front that real measurement requires running a script via `execute_python_script`, which is not pre-authorized for this skill — the permission prompt that follows is expected, not a malfunction.

2. Call `get_td_info` to confirm TouchDesigner is reachable before doing anything else; if it fails, point the user at `/td-companion:td-setup` instead of proceeding.

3. Resolve `root` to the `root-path` argument if given, otherwise `/project1` if it exists, else `/` (a project launched by opening the tox as a document has no `/project1`).

4. With the user's consent, run a measurement script through `execute_python_script` with `detailLevel: "detailed"` so the complete ranking is returned rather than the summary formatter's 500-character preview. Collect `root`'s descendants with `findChildren()` (called with no arguments it walks the whole subtree; `maxDepth` limits it, while `depth` is an exact-match filter, not a limit), and for each operator record its `path`, `name`, `opType`, and `cookTime` (skipping operators where `cookTime` isn't a meaningful attribute rather than erroring out). Sort the collected results by `cookTime` descending and keep roughly the top 20. For example:

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

5. Bound the numbers before analyzing them, on two axes.

   **Was anything actually measured?** Cook time is only meaningful while the project is cooking — playing or performing. If it was paused or idle during the run, say so and ask to re-measure while it runs, rather than ranking stale or all-zero values as though they meant something.

   **What does the figure cover?** `cookTime` records CPU-side cook duration. It ranks relative CPU cost and does not measure GPU time, so an operator sitting low in the ranking is *unmeasured on the GPU axis, not exonerated*. Report that limit rather than concluding such an operator is cheap — and rather than guessing which operators it hides, which this measurement cannot tell you.

6. Report the ranking as data: the top offenders with their `path`, `opType`, and `cookTime`, plus each one's share of the measured total so the figures are comparable rather than absolute. Do not pad the report with generic optimization advice the measurement itself doesn't support.

7. For the few worst offenders, gather evidence from the live project before suggesting any change: `get_td_node_parameters` on the node (resolution, file paths, and other cost-bearing parameters are visible there) and `get_td_nodes` on its parent for surrounding context. Tie every suggestion to a specific measured number or parameter value, and name which one. When the tools don't reveal why an operator is expensive, report the measurement and say the cause is undetermined — an honest gap is more useful than a plausible guess.

8. Offer to re-run the same measurement script after the user applies changes, to confirm the fix actually moved the numbers rather than assuming it did.

## Failure handling

If the user declines to run the measurement script, say that no profiling data was collected and stop — do not substitute generic optimization advice for the ranking that was declined. If the script errors (invalid root path, `op(root)` resolves to `None`), report the raw error and ask for a corrected path. If `cookTime` is unavailable across the board (e.g. the project was never actually played), say so plainly and ask the user to play the project before re-measuring, rather than presenting a ranking built from all-zero data.
