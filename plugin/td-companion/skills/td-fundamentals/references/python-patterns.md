# TouchDesigner Python Patterns

Use this reference when writing Python for `execute_python_script` or for scripts embedded in Text DATs, Execute DATs, and parameter expressions inside a TouchDesigner network. Treat the patterns below as the stable, well-documented core of TD's Python API. For any method signature or parameter name not covered here, confirm it with `get_td_class_details` (full class introspection) or `get_td_module_help` (module-level Python API help) rather than guessing — TD's Python surface has evolved across versions, and an assumed signature that is close but wrong is harder to debug than one confirmed up front.

## `op()`, `parent()`, and `me`

`op(path)` is the universal way to get a reference to an operator. Accept both absolute and relative paths:

```python
op('/project1/geo1')          # absolute path
op('geo1')                    # relative to the calling operator's parent, when used inside network-scoped scripting
op('../sibling1')              # relative, one level up then into a sibling
```

`op()` returns `None` if no operator exists at the given path — check for `None` before chaining a `.par` or method access onto the result, since chaining directly onto `None` raises an `AttributeError` that is otherwise easy to misread as an unrelated failure:

```python
target = op('/project1/geo1')
if target is None:
    print('ERROR: no operator at /project1/geo1')
else:
    target.par.tx = 5
```

`me` refers to the operator whose script or expression is currently executing — the Text/Script/Execute DAT the code lives in, or the operator whose parameter expression is being evaluated. Use `me` instead of hardcoding an operator's own path, so the same script keeps working if the operator is renamed, moved, or copied elsewhere in the network.

`parent()` returns the immediate parent COMP of `me`. `parent(n)` walks `n` levels up the hierarchy (e.g. `parent(2)` is the grandparent COMP). Prefer `parent()`-relative references over hardcoded absolute paths for logic meant to be portable — a script that reaches `parent().op('geo1')` keeps working if the whole subnetwork is moved or embedded as a `.tox` elsewhere, whereas a hardcoded `/project1/container1/geo1` breaks.

Many COMPs additionally expose a **Parent Shortcut** (set on the COMP's Common parameter page), which lets any script nested arbitrarily deep beneath it reach it via a fixed alias — e.g. `parent.Main` — regardless of how many levels of nesting sit between the script and that ancestor. Confirm a Parent Shortcut is actually configured for the COMP in question (via `get_td_node_parameters`) before relying on the alias; it is opt-in, not automatic.

## Absolute vs. Relative Paths

Prefer absolute paths (`/project1/...`) when a script's identity depends on a fixed, known location — e.g. code driven by `execute_python_script`, which runs with no implicit "current operator" context the way an in-network DAT script does. Prefer relative paths (`parent()`, `op('../x')`, `me`) for logic embedded inside a component that is meant to be reusable or relocatable, such as a `.tox` intended to be dropped into multiple projects. Mixing the two without care is a common source of scripts that work in one project and silently resolve to the wrong node (or `None`) in another — when writing a script meant to be reused, decide explicitly which addressing style it depends on rather than blending both without a reason.

## Reading and Setting Parameters

Every operator exposes its parameters through `.par`, followed by the parameter's lowercase name:

```python
op('/project1/geo1').par.tx          # returns a Par object, not a plain number
op('/project1/geo1').par.tx.val      # the currently evaluated value
op('/project1/geo1').par.tx = 5      # sets a constant value, overwriting any expression
```

A bare `op(...).par.tx` is a `Par` object, not the value itself — printing it or comparing it directly to a number will not behave as expected. Call `.eval()` to get the evaluated current value regardless of mode (`.val` reads/writes the raw value of the current mode; `.expr` the expression string):

```python
tx_value = op('/project1/geo1').par.tx.val
```

Set a live formula instead of a constant by writing to `.expr`, a Python expression string re-evaluated on every cook:

```python
op('/project1/geo1').par.tx.expr = "op('lfo1')[0]"
```

Assigning a plain value to the parameter directly (`par.tx = 5`) clears any existing expression and switches the parameter back to a constant. These are mutually exclusive states for a given parameter — decide which one is wanted before writing to it, and confirm the parameter's current mode with `get_td_node_parameters` if the prior state is unknown, rather than assuming it was already a constant.

Fetch several related parameters at once with `.pars(pattern)`, which returns a list of `Par` objects matching a name pattern rather than a single named lookup:

```python
for p in op('/project1/geo1').pars('t?'):   # tx, ty, tz
    print(p.name, p.eval())
```

Confirm the exact pattern syntax `.pars()` accepts (glob-style vs. TD's own pattern-matching conventions) with `get_td_class_details` before relying on anything beyond a simple prefix/wildcard match, since pattern matching conventions are one of the areas that differ from plain Python string matching.

## Export vs. Expression Referencing

Two distinct mechanisms make one operator's value drive another's parameter, and they behave differently:

- **Expression** (`.expr`) — a Python formula string evaluated fresh on every cook of the *parameter's own* operator. Cheap to reason about and easy to set from a script, but only as current as the last time that operator cooked.
- **Export** — a continuous binding from a CHOP channel directly onto a parameter, updated every frame regardless of whether the target operator would otherwise have cooked. This is normally set up in the UI by dragging a channel to a parameter, and it changes the parameter's mode to reflect that it is now driven externally rather than by a formula or constant.

Do not treat these as interchangeable. An expression re-evaluates only when its own operator cooks (see the cook model in `SKILL.md`), so a parameter expression referencing a fast-changing CHOP can appear to lag if the parameter's operator itself only cooks infrequently — an export does not have this limitation. When scripting an export programmatically (rather than dragging in the UI), confirm the exact Python call and the parameter mode it results in via `get_td_class_details` on the `Par` class before writing it; this is one of the areas of the API most worth verifying rather than assuming from memory, since the scripted path is used far less often than the UI drag-and-drop path and is correspondingly less commonly memorized correctly.

## Iterating Children

Every operator exposes its direct children as a list:

```python
for child in op('/project1/container1').children:
    print(child.path, child.type)
```

`.children` returns only direct children, one level deep. To search recursively or filter by type, use `findChildren`:

```python
import td
all_tops = op('/project1').findChildren(type=td.TOP)
```

`findChildren()` with no depth argument searches the entire subtree. `depth` is an **exact-match filter, not a limit** — direct children are depth 1, their children depth 2, and so on, so `findChildren(depth=1)` returns only direct children and `findChildren(depth=0)` returns an empty list. Use `maxDepth` to cap how far down the search goes. Verified against TD 2025.33070 on a project root: `findChildren()` → 72, `depth=0` → 0, `depth=1` → 13, `depth=2` → 12, `maxDepth=1` → 13. The full set of accepted filter keyword arguments (by name, by path pattern, by tag) is worth confirming with `get_td_class_details` rather than assumed from a single remembered example.

## Creating Operators from Python

Prefer the `create_td_node` MCP tool for creating operators — it is the verified, stable entry point this plugin exercises directly, with `nodeType`/`parentPath`/`nodeName` as plain strings and no dependency on Python-side imports.

Raw Python scripting also supports operator creation via a COMP's `.create()` method, for cases where creation must happen as part of a larger script (e.g. inside a Script DAT or Execute DAT callback) rather than as a standalone tool call. The verified minimal pattern:

```python
import td
new_op = op('/project1').create(td.baseCOMP, 'my_container')
```

This creates a `baseCOMP` named `my_container` under `/project1`, referencing the class via the `td` module rather than passing a bare string. Confirm the full `.create()` signature — additional positional or keyword arguments beyond the class and name, and its exact return value and error behavior on a name collision — with `get_td_class_details` before relying on anything beyond this minimal two-argument form, rather than assuming parity with `create_td_node`'s richer parameter set.

## `run()` and Delayed Execution

`run()` schedules a piece of Python code (as a string, or a callable with arguments) to execute later rather than immediately, without blocking the calling script:

```python
run("op('text1').par.text = 'hi'", delayFrames=30)
```

Common delay keyword arguments include `delayFrames` (wait N frames of the project's cook rate) and `delayMilliSeconds` (wait a wall-clock duration); confirm the exact set of accepted keyword arguments for the current TD version via `get_td_module_help` before relying on a less common variant. `run()` returns a handle representing the pending execution, which typically exposes a way to cancel it before it fires — confirm the exact cancellation call before depending on it in a script that might need to abort a scheduled action.

Use `run()` for anything that must happen after a delay measured in frames or wall-clock time relative to *now* — e.g. staging a multi-step sequence, or deferring a side effect until after the current cook finishes. Do not use it as a substitute for a CHOP-driven animation; a `timerCHOP` or `lfoCHOP` feeding an export is the more idiomatic TD way to drive continuous or repeating behavior, reserving `run()` for one-shot, script-level sequencing.

Chaining several `run()` calls with increasing delays is a common way to script a short sequence (e.g. fade in, wait, then trigger a follow-up action) without building a dedicated CHOP-based timeline for something that only needs to happen once. Keep such chains short and readable — for anything beyond a handful of steps, a `timerCHOP` with callback DATs, or a small state machine driven from an Execute DAT, scales better than a long chain of nested delayed calls.

## Common Exceptions and How to Debug Them

Most Python errors encountered while scripting a TouchDesigner network fall into a small number of recurring shapes:

- **`AttributeError` on `None`** — almost always `op(path)` returning `None` because the path was wrong (a typo, a name TouchDesigner silently changed on creation due to a collision, or a node that was never actually created). Debug by printing `op(path)` on its own line before chaining anything onto it, and cross-check the path with a fresh `get_td_nodes` call rather than trusting a path remembered from earlier in the conversation.
- **`AttributeError` on `.par.<name>`** — the parameter name is wrong: either misspelled, or written in its capitalized UI-label form (`Tx`) instead of the lowercase Python form (`tx`). Confirm the exact name with `get_td_node_parameters` on the specific node rather than assuming it matches a similar operator's parameter naming.
- **`TypeError` when setting a parameter** — the value's type doesn't match what the parameter expects (e.g. a string passed where a float is required, or vice versa). Confirm the parameter's expected type via `get_td_node_parameters` before retrying with a converted value.
- **Errors that appear only in `get_td_node_errors`, not as a raised Python exception** — a TD-internal cook error (e.g. a malformed expression, a missing input) surfaces as a node-level error state rather than propagating as a Python exception back through `execute_python_script`. After any script that modifies a network, check `get_td_node_errors` on the affected subtree even when the script itself returned without raising — a clean script return is not proof the network itself is error-free.
- **`IndexError` on a channel index** — indexing a CHOP like `op('noise1')[0]` fails when the operator has fewer channels than expected, or none at all (for instance because an upstream node isn't cooking, or produced zero channels due to a misconfigured parameter). Debug with `execute_python_script`, for example `print([channel.name for channel in op('noise1').chans()])`, rather than assuming the channel layout from the operator's typical default configuration. `get_td_node_parameters` reports settings, not output channels.
- **Silent no-ops** — a script runs without error but nothing observable changes, most often because the target node isn't cooking (see the cook model in `SKILL.md`) or because the change was applied to the wrong path (see the `None`-path case above). Debug by reading the target's current parameter or output value back immediately after the change, from the same `execute_python_script` call, rather than assuming the write succeeded and moving on. Forcing a cook with `op(path).cook(force=True)` before the read-back rules out "not cooking" as the explanation.

As a general debugging discipline, prefer writing scripts that read back and print an observed value after making a change, over scripts that only make the change and trust it worked. A script that ends with `print('RESULT', op(path).par.tx.val)` gives a concrete value to check against the intended one, and turns "did this work?" into a comparison instead of an assumption.
