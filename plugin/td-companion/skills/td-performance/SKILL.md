---
name: td-performance
description: This skill should be used when a TouchDesigner project is running slow, dropping frames, or needs optimization — trigger phrases include "slow", "fps dropped", "optimize my project", "cook time", "performance", "frame drops", or any request to diagnose or improve TouchDesigner runtime performance. For a guided, measured cook-time audit run end to end, the td-perf skill applies instead.
version: 0.1.0
---

# TD Performance Diagnosis

## TD's cook model in brief

TouchDesigner uses a pull-based cook model: an operator only spends time "cooking" when something actually demands its output — a viewer window, an export, a downstream operator that itself needs to cook. An operator sitting in the network with nothing pulling on it does not cost frame time even if it looks complex.

What makes an operator cook every frame is either time-dependence (it reads `absTime`, uses a Timer CHOP, plays back a movie, or otherwise depends on the clock) or downstream demand from something that is itself time-dependent (an active viewer, a Movie File Out TOP, an Out CHOP feeding hardware). A large, expensive network that nothing is currently pulling from is nearly free; a small operator with heavy per-frame Python logic that a live viewer depends on can dominate the frame budget. Diagnosis should always start from "what is actually cooking," not from "what looks complicated in the network editor."

## Measurement first

Do not guess which operator is slow — measure. Use `execute_python_script` to walk the network and read each operator's `.cookTime` (milliseconds taken by its most recent cook), then rank the results.

A representative measurement snippet:

```python
results = []
for o in op('/project1').findChildren():
    if hasattr(o, 'cookTime'):
        results.append((o.path, o.cookTime))

results.sort(key=lambda r: r[1], reverse=True)
top = results[:20]
for path, ct in top:
    print(f"{ct:8.3f} ms  {path}")
```

(`findChildren()` with no arguments walks the whole subtree; `findChildren(depth=1)` restricts to direct children only.)

The pattern to reuse: recurse from a root path with `findChildren()`, collect `.cookTime` per operator, sort descending, and look at the top N. This surfaces the actual offenders instead of relying on intuition about which part of the network "seems heavy." `cookTime` and `findChildren` are confirmed-stable across this API; anything else pulled into a diagnostic script — a node's specific methods, less common properties — should go through the `td-python-api` skill's lookup ladder rather than being assumed.

**A paused or idle network gives misleading numbers.** `cookTime` reflects the most recent cook, and an operator that hasn't cooked recently (because the project is paused, or because the relevant viewer/export isn't active) will show a stale or zero value that has nothing to do with real playback cost. Always take measurements while the project is actively playing the content that reproduces the slowdown — scrubbing the timeline, running the live show, or triggering whatever downstream demand is normally present. A snapshot taken on a frozen network answers a different question than "why is this slow during actual use."

## Common culprits and fixes

- **Oversized TOP resolutions.** A TOP chain running at 4K when the final output is 1080p (or smaller) wastes GPU bandwidth at every step downstream. Fix at the source — set resolution deliberately on the operators that first generate or load the image (Movie File In, Constant, Render TOP) rather than downscaling late with an extra Resolution/Fit TOP bolted on after the fact. When a Resolution or Fit TOP is the right tool, place it as early as possible in the chain so everything downstream benefits.
- **Movie decoding cost.** Video playback cost depends heavily on codec choice and container. Codecs that are cheap to decode (or formats pre-converted into a TD-friendly cached format) cost far less per frame than a heavy delivery codec played back directly. When movie playback is a suspect, check the codec and consider pre-transcoding to a decode-cheap format rather than assuming the Movie File In TOP itself is the problem.
- **Python running every frame.** DAT Execute callbacks, Parameter Execute DATs, and expressions attached to many parameters all re-run on whatever cadence is configured, and Python is comparatively expensive per call. Check for DAT executes wired to `onFrameStart`/`onFrameEnd` style callbacks and for parameter expressions evaluated on operators that cook every frame — these show up as CPU-side cook time, not GPU time, and are a common hidden cost.
- **Copies instead of instancing for repeated geometry.** Duplicating a SOP network N times to draw N copies of the same geometry multiplies cook cost by N; TouchDesigner's instancing (via the Geometry COMP's instancing parameters, fed by per-instance attributes supplied from a CHOP, SOP, or DAT) draws many copies from one cooked source. When a network has many structurally identical branches, that is a strong signal instancing was skipped.
- **Unnecessary time-dependence.** An operator that could be locked or cached (its output doesn't actually need to change every frame) but isn't, keeps re-cooking for no benefit. Check for Null TOPs/CHOPs left in "cook every frame" mode when their upstream content is actually static, and consider locking or caching operators whose output is known to be constant for the current use case.

## GPU vs CPU distinction

TOPs (and other GPU-resident operator families) execute on the GPU, and `.cookTime` may understate their true cost — a TOP chain can rank low in a `.cookTime` sort while still being the actual bottleneck if the GPU itself is saturated (e.g., from an oversized resolution or an expensive shader). Be honest about this limitation: treat a low `.cookTime` on a TOP as inconclusive rather than as proof it isn't the bottleneck, and corroborate suspected GPU-side cost with TouchDesigner's built-in Performance Monitor / palette perf tools rather than relying on `.cookTime` alone to rule GPU cost in or out.

## Optimization checklist, ordered by typical payoff

1. Measure with the `.cookTime` ranking snippet above while the project is actively playing its real content — identify the actual top offenders before changing anything.
2. Check TOP resolutions against what the final output actually needs; fix oversized resolutions at the source.
3. Check for time-dependence that shouldn't exist — operators re-cooking every frame that could be locked, cached, or made non-time-dependent.
4. Look for Python running every frame (DAT executes, per-parameter expressions) on operators identified as hot in the measurement step.
5. Check movie/video playback codec and format if media playback ranks high.
6. Look for duplicated geometry networks that should be instanced instead.
7. Re-measure after each change to confirm the fix actually moved the ranking, rather than assuming a plausible-sounding fix worked.

The `/td-companion:td-perf` command runs a structured version of this same analysis end-to-end when a fuller, guided pass is wanted instead of doing each step manually.
