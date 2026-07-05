---
name: touchdesigner-self-debug
description: >
  A generic workflow for self-starting TouchDesigner via computer-use (or an
  already-running instance), loading mcp_webserver_base.tox, and verifying any
  TD-side Python change (td/modules/**) directly from the Textport — reading
  back real TD runtime values and reconciling them. Use after changing TD-side
  code in the touchdesigner-mcp repo when E2E verification on a real TD is
  needed, or when told to "start TD and check," "verify on the actual machine,"
  or "import and run the .tox." Includes the shortcut of calling api_service
  directly, bypassing the HTTP WebServer / OpenAPI schema.
---

# TouchDesigner Startup + Functional Self-Debugging

A **general technique** for verifying any TD-side Python change (e.g. anything in
`td/modules/**`) inside **real TouchDesigner**. Calling functions directly from
the Textport, without standing up the HTTP WebServer, is the shortest path.

> **This skill is feature-agnostic.** The worked example in Steps 4–5 happens to
> verify *node auto-alignment* (the PR that produced this skill), but that is
> **illustration only**. The reusable shape is: **create/modify via the real code
> path → read back the TD runtime value you actually care about → reconcile
> against an invariant.** Swap the alignment-specific bits (grid, overlap area,
> `node_layout.py`) for whatever your change touches. Do **not** assume alignment,
> grids, or overlap have anything to do with your task.

## When to Execute

- You modified TD-side logic (e.g. `td/modules/mcp/services/*.py`) and want to check behavior on the real machine.
- Unit/offline verification is insufficient and you need to reconcile against TD runtime data (any node attribute, cook result, error state, etc.).
- You are in a fresh worktree that cannot rely on CI or the 9981-dependent integration suite.

## Prerequisites and Pitfalls (read first — these are general)

1. **The `.tox` reads `td/modules/` from disk at runtime.** Re-authoring the `.tox` is **not** required for `.py` changes; reload modules or restart TD.
2. **`loadTox()` leaves `externaltox` empty** → `import_modules.setup()` fails with `No module named 'mcp'`. Replicate setup manually (Step 3).
3. **A fresh worktree lacks generated artifacts** → empty OpenAPI schema / missing `node_modules` breaks HTTP routing. Bypass it by **calling the Textport directly** (Step 4). Only run `npm install && npm run gen` if you specifically need the HTTP path (e.g. running the vitest integration suite).
4. **Computer-use screenshots go black** when TD loses frontmost focus → recover with `open_application("TouchDesigner")` + `switch_display`.
5. **Multi-line pastes into the REPL break on line boundaries** → always wrap in `exec("""...""")` to submit as one statement.
6. **To pick up a later `.py` edit** in an already-running TD, drop the module from `sys.modules` so the next import reloads from disk (Step 3c). If the WebServer is already up you can do this via `execute_python_script` — no computer-use needed.

## Step 1: Start TD (skip if already running)

```
computer-use: request_access(["TouchDesigner"])
computer-use: open_application("TouchDesigner")   # wait a few seconds
computer-use: screenshot                           # confirm
```

If a WebServer is already listening on 9981 (`lsof -nP -iTCP:9981 -sTCP:LISTEN`) and `get_td_info` succeeds, you can drive everything via `execute_python_script` and skip the computer-use / Textport steps entirely.

## Step 2: Open the Textport

Menu bar **Dialogs → "Textport and DATs"**. (`Alt+T` toggles the Palette and is unreliable; use the menu.)

## Step 3: Load .tox + manually replicate module setup

```python
# 3a. Load
p = op('/project1').loadTox('<ABS_REPO>/td/mcp_webserver_base.tox'); print('LOADED', p)

# 3b. externaltox is empty after loadTox — replicate import_modules.setup()
exec("""
import sys, os, yaml
b = op('/project1/mcp_webserver_base')
b.par.externaltox = '<ABS_REPO>/td/mcp_webserver_base.tox'
mp = '<ABS_REPO>/td/modules'; tsp = os.path.join(mp, 'td_server')
[sys.modules.pop(m) for m in list(sys.modules) if m.split('.',1)[0] in ('mcp','utils')]
[sys.path.remove(x) for x in (tsp, mp) if x in sys.path]
sys.path.insert(0, mp); sys.path.insert(0, tsp)
import mcp
sp = os.path.join(mp, 'td_server', 'openapi_server', 'openapi', 'openapi.yaml')
mcp.openapi_schema = yaml.safe_load(open(sp)) if os.path.exists(sp) else {}
print('SETUP_OK', mcp.__file__, 'schema', bool(mcp.openapi_schema))
""")

# 3c. Reload just your edited modules to pick up later .py edits (targeted, safe)
import sys
for m in ('mcp.services.api_service',):   # list the modules you changed
    sys.modules.pop(m, None)
```

`SETUP_OK .../td/modules/mcp/__init__.py` means `mcp` imported from the local tree. (`schema False` is fine for the Textport-direct path.)

## Step 4: Verify your change from the Textport (no HTTP required)

**Generic template — this is the part to reuse.** Drive the code you changed
through its real entry point, then read back the runtime value and reconcile:

```python
exec("""
from mcp.services.<your_module> import <entry_point>   # the code you changed
# 1. exercise it via the real call path
<result> = <entry_point>(<args>)
# 2. read back the ACTUAL TD runtime value(s) you care about
<observed> = <read from op(...), node attrs, cook state, errors, ...>
# 3. reconcile against an invariant (prefer a numeric/boolean check over "looks right")
print('JUDGE', 'PASS' if <invariant holds> else 'FAIL', <observed>)
""")
```

Notes that generalize:
- Pass `node_type` as a **string** (e.g. `'circleTOP'`) to `api_service.create_node`; TD resolves it.
- Prefer **reconciliation** (compute a value and compare) over assertions that can be gamed.
- To test cumulative behavior, apply the change repeatedly and check an invariant like `after == before + N`.

<details>
<summary><b>Worked example (align-nodes PR — illustration, not the procedure)</b></summary>

Verifying that `create_node` places nodes on a non-overlapping grid. The
alignment/overlap specifics here are the *feature under test*, not part of the
generic workflow:

```python
exec("""
import td
from mcp.services.api_service import api_service
_t = op('/project1/_selfdebug'); 
if _t: _t.destroy()
test = op('/project1').create(td.baseCOMP, '_selfdebug')
[api_service.create_node(test.path, 'circleTOP', 'c%02d'%i, None) for i in range(12)]
boxes = [(c.nodeX, c.nodeY, c.nodeWidth, c.nodeHeight) for c in test.children]
ov = lambda a,b: max(0, min(a[0]+a[2],b[0]+b[2])-max(a[0],b[0]))*max(0, min(a[1]+a[3],b[1]+b[3])-max(a[1],b[1]))
tot = sum(ov(boxes[i],boxes[j]) for i in range(len(boxes)) for j in range(i+1,len(boxes)))
print('JUDGE', 'PASS' if tot==0 and len(boxes)==12 else 'FAIL', 'overlap=%s' % tot)
""")
```

Here the invariant is "total overlap area == 0". *Your* feature will have a
different invariant entirely.
</details>

## Step 5: Optional — a concurrent "offline judge" (no TD, deterministic)

If the change has a **pure logic kernel** that does not need the TD runtime,
extract it into a module that does **not** `import td`, then verify it with
system `python3` by loading the file directly via `importlib` (zero extra deps):

```python
# generic: load a td-free helper by path, bypassing the mcp package __init__
import importlib.util, os, sys
spec = importlib.util.spec_from_file_location(
    "mod", os.path.join(sys.argv[1], "td/modules/mcp/services/<your_pure_module>.py"))
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
# ... call the pure functions, reconcile numerically, set exit code on PASS/FAIL
```

(In the align-nodes PR the pure module was `node_layout.py`; yours may not exist
or may be named anything.) TD-side judging confirms integration; the offline
judge proves invariants. Use both when the kernel is separable.

## Cleanup

- Any scratch container you create (e.g. `/project1/_selfdebug`) is discarded if you close an **unsaved** project. Delete explicitly with `op('/project1/_selfdebug').destroy()`.
- You may leave TD open for reuse.

## Related

- Global memory: `loadtox-externaltox-gotcha`, `fresh-worktree-needs-gen-for-schema`, `tox-embeds-import-modules-dat`
- HTTP path (only when needed): `npm install && npm run gen`, then the vitest integration suite hits the live WebServer on 9981.
