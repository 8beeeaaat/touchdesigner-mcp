---
name: touchdesigner-self-debug
description: >
  A workflow for self-starting TouchDesigner via computer-use, loading mcp_webserver_base.tox, 
  and directly verifying TD-side Python functions (such as api_service node operations) via the Textport. 
  Used when changes are made to TD-side code (td/modules/**) in the touchdesigner-mcp repository 
  and E2E verification/self-debugging in an actual TD environment is required—specifically when 
  instructed to "start TD and check," "verify on actual machine," or "import and run the .tox." 
  Includes a shortcut for verification by calling the textport directly without going through 
  HTTP/WebServer/OpenAPI schemas.
---

# TouchDesigner Startup + Functional Self-Debugging

Reproduction steps for verifying changes to TD-side Python (e.g., `api_service` in `td/modules/**`) 
within **actual TouchDesigner**. Calling functions directly from the Textport without setting 
up an HTTP WebServer is the shortest path.

## When to Execute

- You have modified TD-side logic, such as `td/modules/mcp/services/*.py`, and want to check behavior on the actual machine.
- Unit/offline verification is insufficient, and you need to reconcile values against TD runtime data (node coordinates, dimensions, etc.).
- You are working in a new worktree that cannot rely on CI or integration tests (which assume a 9981 connection).

## Prerequisites and Pitfalls (Read First)

1. **The `.tox` reads `td/modules/` from disk at runtime**. 
   Therefore, **re-authoring the `.tox` is not required** for `.py` changes. Reflect changes by reloading modules or restarting TD.
2. **`loadTox()` clears the `externaltox` parameter** → This causes `import_modules.setup()` to fail with `No module named 'mcp'`. → Replicate the setup manually (see Step 3 below).
3. **New worktrees lack generated artifacts** → HTTP routing will not work if the OpenAPI schema is empty or `node_modules` is missing. → Bypass this by **calling the textport directly** instead of using HTTP (see Step 4 below).
4. **Computer-use screenshots may turn black** if TD loses focus. 
   → Recover using `open_application("TouchDesigner")` + `switch_display`.
5. **Multi-line pastes into the REPL fail due to line breaks** → Always wrap code in `exec("""...""")` to execute as a single statement.

## Step 1: Start TD

```
computer-use: request_access(["TouchDesigner"])
computer-use: open_application("TouchDesigner")   # Wait a few seconds
computer-use: screenshot                           # Confirm startup
```

## Step 2: Open Textport

Click **Dialogs -> "Textport and DATs"** in the menu bar.
(Avoid `Alt+T` as it toggles the Palette and is unreliable; the menu path is certain.)

## Step 3: Load .tox + Manually Replicate Module Setup

Focus the Textport and execute as a single block using `exec("""...""")`:

```python
# 3a. Load
p = op('/project1').loadTox('<ABS_REPO>/td/mcp_webserver_base.tox'); print('LOADED', p)

# 3b. Manually setup since externaltox is empty (replicates import_modules.setup())
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
```

If `SETUP_OK .../td/modules/mcp/__init__.py` appears, `mcp` has been successfully imported from the local path. 
(Verification via direct textport calls works even if `schema` is `False`.)

## Step 4: Direct Verification via Textport (No HTTP required)

Call `api_service` directly and reconcile by reading back **TD runtime values** from actual nodes:

```python
exec("""
import td
from mcp.services.api_service import api_service
_t = op('/project1/align_test')
if _t: _t.destroy()
test = op('/project1').create(td.baseCOMP, 'align_test')
res = [api_service.create_node(test.path, 'circleTOP', 'c%02d'%i, None) for i in range(12)]
boxes = [(c.nodeX, c.nodeY, c.nodeWidth, c.nodeHeight) for c in test.children]
ov = lambda a,b: max(0, min(a[0]+a[2],b[0]+b[2])-max(a[0],b[0]))*max(0, min(a[1]+a[3],b[1]+b[3])-max(a[1],b[1]))
tot = sum(ov(boxes[i],boxes[j]) for i in range(len(boxes)) for j in range(i+1,len(boxes)))
print('E2E children=%d overlap=%s' % (len(boxes), tot))
print('E2E_JUDGE', 'PASS' if tot==0 and len(boxes)==12 else 'FAIL')
""")
```

- TD resolves the `node_type` if you pass a **string** (e.g., `'circleTOP'`) to `create_node`.
- Write logic as **reconciliation** rather than pure assertions: calculate overlap area from actual coordinates and check if it is `==0`.
- For additional behaviors like collision avoidance, append to the same container and verify with `after == before + N`.

## Step 5: Concurrent "Offline Judge" (No TD required, deterministic)

For logic kernels that do not depend on the TD runtime, extract them into **pure modules that do not import `td`**. 
Verify using system python3 by loading the file directly via `importlib` (zero extra dependencies):

```python
# judge.py — Load node_layout.py directly via importlib to bypass mcp package __init__
import importlib.util, os, sys
spec = importlib.util.spec_from_file_location(
    "mod", os.path.join(sys.argv[1], "td/modules/mcp/services/node_layout.py"))
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
# ... Call pure functions, reconcile overlaps numerically, and set exit code based on PASS/FAIL
```

TD-side judging confirms integration; offline judging proves invariants. Use both.

## Cleanup

- Verification containers (e.g., `/project1/align_test`) will be discarded if you close TD without saving the **unsaved NewProject.toe**. Use `op('/project1/align_test').destroy()` for explicit deletion.
- You may leave TD open for reuse in the next verification.

## Related

- Global memory: `loadtox-externaltox-gotcha` / `fresh-worktree-needs-gen-for-schema` / `tox-embeds-import-modules-dat`
- Generation pipeline: `npm run gen` (Only when verification via HTTP is necessary)