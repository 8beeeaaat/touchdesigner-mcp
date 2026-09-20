---
description: This skill should be used when the user runs /touchdesigner:perf,
  or asks to measure where frame time is going in a TouchDesigner project — a
  cook-time profiling pass across the network producing a ranked list of the
  slowest operators. Trigger phrases include "measure cook times", "profile my
  TD project", "which operator is slowest", "fps dropped", and "why is this
  project slow". It measures and reports the numbers; it does not carry general
  TouchDesigner optimization advice.
name: perf
---

## Client integration

Use the connected TouchDesigner server's tools by logical name; discover the actual client namespace instead of constructing a Claude tool prefix. Slash-command examples also work as natural-language requests for the named skill. After any network mutation, read back affected parameters, check `get_td_node_errors`, and inspect `get_top_image` for TOP output when relevant. Do not rely on a post-tool hook to remind you.

# TD Perf

Diagnose TouchDesigner performance bottlenecks by measuring per-operator cook time and correlating the worst offenders with known heavy patterns.

## Workflow

1. Explain up front that real measurement requires running a script via `execute_python_script` — the permission prompt that may follow is expected, not a malfunction.

2. Call `get_td_info` to confirm TouchDesigner is reachable before doing anything else; if it fails, point the user at `/touchdesigner:setup` instead of proceeding.

3. Resolve `root` to the `root-path` argument if given, otherwise `/project1` if it exists, else `/` (a project launched by opening the tox as a document has no `/project1`).

4. With the user's consent, run a measurement script through `execute_python_script` with `detailLevel: "detailed"` so the complete ranking is returned rather than the summary formatter's 500-character preview. Collect the resolved root **and** its descendants: `findChildren()` walks the whole subtree when called with no arguments (`maxDepth` limits it, while `depth` is an exact-match filter, not a limit), but it never returns the operator it was called on — that operator is depth 0, and `findChildren(depth=0)` is empty. Leave the root out and a `root-path` naming a single TOP measures nothing at all, while a COMP's own cook time goes missing from `totalCookTime`, and for each operator record its `path`, `name`, `opType`, and `cookTime` (skipping operators where `cookTime` isn't a meaningful attribute rather than erroring out). Sort the collected results by `cookTime` descending and keep roughly the top 20 — but return the number of operators measured and the sum of *all* their cook times alongside that slice. The slice is the only thing that survives the call, so a denominator left behind cannot be recovered afterwards. For example:

   ```python
   root = "/project1"  # the path resolved in step 3
   root_op = op(root)
   results = []
   for child in [root_op, *root_op.findChildren()]:
   	ct = getattr(child, "cookTime", None)
   	if ct is not None:
   		results.append(
   			{
   				"path": child.path,
   				"name": child.name,
   				"opType": getattr(child, "OPType", ""),
   				"cookTime": ct,
   			}
   		)
   results.sort(key=lambda r: r["cookTime"], reverse=True)
   result = {
   	"measuredCount": len(results),
   	"totalCookTime": sum(r["cookTime"] for r in results),
   	"top": results[:20],
   }
   ```

   Adjust the traversal to the actual project structure as needed — the shape above is illustrative, not a fixed template.

5. Bound the numbers before analyzing them, on two axes.

   **Was anything actually measured?** Cook time is only meaningful while the project is cooking — playing or performing. If it was paused or idle during the run, say so and ask to re-measure while it runs, rather than ranking stale or all-zero values as though they meant something.

   **What does the figure cover?** `cookTime` records CPU-side cook duration. It ranks relative CPU cost and does not measure GPU time, so an operator sitting low in the ranking is *unmeasured on the GPU axis, not exonerated*. Report that limit rather than concluding such an operator is cheap — and rather than guessing which operators it hides, which this measurement cannot tell you.

6. Report the ranking as data: the top offenders with their `path`, `opType`, and `cookTime`, plus each one's share of `totalCookTime` — the total across every operator measured, not the sum of the rows shown. Dividing by the visible rows alone inflates every share and presents a slice of the network as the whole of it. State `measuredCount` and what fraction of `totalCookTime` the listed rows account for, so a long tail reads as a long tail rather than disappearing. Do not pad the report with generic optimization advice the measurement itself doesn't support.

7. For the few worst offenders, gather evidence from the live project before suggesting any change: `get_td_node_parameters` on the node (resolution, file paths, and other cost-bearing parameters are visible there) and `get_td_nodes` on its parent for surrounding context. Tie every suggestion to a specific measured number or parameter value, and name which one. When the tools don't reveal why an operator is expensive, report the measurement and say the cause is undetermined — an honest gap is more useful than a plausible guess.

8. Offer to re-run the same measurement script after the user applies changes, to confirm the fix actually moved the numbers rather than assuming it did.

## Failure handling

If the user declines to run the measurement script, say that no profiling data was collected and stop — do not substitute generic optimization advice for the ranking that was declined. If the script errors (invalid root path, `op(root)` resolves to `None`), report the raw error and ask for a corrected path. If `cookTime` is unavailable across the board (e.g. the project was never actually played), say so plainly and ask the user to play the project before re-measuring, rather than presenting a ranking built from all-zero data.
