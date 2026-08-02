---
name: td-fundamentals
description: This skill should be used when working with TouchDesigner through the touchdesigner-mcp tools — for example when asked to "build a network in TouchDesigner", "create a node", "wire operators together", add or configure a TOP/CHOP/SOP/DAT/COMP/MAT, inspect or edit a .toe or .tox file, set node parameters, or otherwise construct or modify a TouchDesigner project. Provides the operator family model, node path conventions, nodeType naming, the cook model, and the inspect-create-verify workflow needed to use the MCP tools correctly.
version: 0.1.0
---

# TouchDesigner Fundamentals

## What TouchDesigner Is

TouchDesigner is a node-based visual programming environment for real-time procedural content: interactive installations, live visuals, data visualization, and control systems. A TouchDesigner project is a network of **operators** — small processing nodes wired together into a directed graph, cooked continuously at the project's frame rate rather than run once and discarded. Projects save as `.toe` files (a full project) or `.tox` files (a reusable component embeddable inside another project). Treat every task here as manipulating that node graph, either through the touchdesigner-mcp tools connected to a live TouchDesigner instance, or by reasoning about `.tox`/`.toe` structure.

The MCP tools substitute for the two things a human normally does with the mouse: browsing the OP Create dialog (its category tabs mirror the six operator families below) and dragging wires between operators in the network editor. Every action described in this skill has a direct tool equivalent — there is no need to open TouchDesigner's UI to inspect, build, or debug a network reachable through these tools.

Work through the bundled MCP tools rather than assuming network contents by memory: `get_td_info`, `get_td_nodes`, `get_td_node_parameters`, `get_td_node_errors`, `create_td_node`, `update_td_node_parameters`, `delete_td_node`, `exec_node_method`, `execute_python_script`, `get_td_classes`, `get_td_class_details`, `get_td_module_help`, `get_top_image`, and `describe_td_tools`. At runtime these are namespaced (e.g. `mcp__plugin_td-companion_touchdesigner__create_td_node`); refer to them by their logical name below and let the runtime prefix resolve automatically. When a tool's exact input shape is unclear, call `describe_td_tools` rather than guessing at parameter names.

## Operator Families

Every operator belongs to exactly one of six families, distinguished by the kind of data flowing through it. Family membership determines which wires are legal and which nodeType suffix to use when creating a node.

- **TOP** (Texture Operator) — images and textures, processed on the GPU: cameras, video files, generative noise, compositing, rendering. Suffix `TOP` (e.g. `noiseTOP`, `moviefileinTOP`, `textTOP`).
- **CHOP** (Channel Operator) — numeric channels over time: audio, control signals, MIDI, OSC, animation curves, sensor data. Suffix `CHOP` (e.g. `noiseCHOP`, `audiodeviceinCHOP`, `lfoCHOP`).
- **SOP** (Surface Operator) — 3D geometry: points, polygons, curves. Suffix `SOP` (e.g. `boxSOP`, `sphereSOP`, `mergeSOP`).
- **DAT** (Data Operator) — text and tables: scripts, JSON, CSV-like tables, web requests. Suffix `DAT` (e.g. `textDAT`, `tableDAT`, `webclientDAT`).
- **COMP** (Component Operator) — containers: 3D objects (geometry, camera, light), UI panels, and organizational containers that hold networks of other operators. Suffix `COMP` (e.g. `geometryCOMP`, `cameraCOMP`, `lightCOMP`, `baseCOMP`).
- **MAT** (Material Operator) — shading definitions applied to SOPs for rendering. Suffix `MAT` (e.g. `phongMAT`, `pbrMAT`).

Wire operators of the **same family** together directly (an output connector into an input connector). Never assume a wire crosses families — a TOP output cannot feed a CHOP input, and vice versa. Crossing families needs an explicit converter operator: `toptoCHOP`/`choptoTOP` (image ↔ channels), `dattoCHOP`/`choptoDAT` (table ↔ channels), `soptoDAT`/`dattoSOP` (geometry ↔ table). Materials attach to SOPs through a render operator's geometry reference rather than a direct wire. CHOP values commonly drive TOP/SOP/COMP parameters through parameter export or an expression rather than a wire at all — see Wiring below.

## Node Paths and Hierarchy

Every node has an absolute path rooted at the project, e.g. `/project1/container1/noise1`. Nodes always live *inside* a COMP — `/project1` itself is a COMP, and any COMP can contain child operators of any family. Before creating anything, call `get_td_nodes` on the intended parent path to see what already exists; never assume a network's contents from a prior turn or from memory of a similar project.

`parentPath` passed to `create_td_node` must be an existing COMP. Creating into the wrong parent is a frequent mistake in deeply nested networks — re-verify the parent path with `get_td_nodes` immediately before creating, rather than trusting an earlier listing.

Node names must be unique among siblings; if a requested `nodeName` collides with an existing child, TouchDesigner silently renames the new node (typically by appending or incrementing a numeric suffix) rather than raising an error. Never assume the requested name is the name that resulted — read the resolved path back from `create_td_node`'s response, and use that path for every subsequent call against the node.

## Creating Nodes: nodeType and Parameter Naming

`create_td_node` takes a `nodeType` matching TouchDesigner's Python class-name convention: lowercase-first, family-suffixed CamelCase, e.g. `noiseTOP`, `moviefileinTOP`, `constantCHOP`, `audiodeviceinCHOP`, `boxSOP`, `textDAT`, `geometryCOMP`, `phongMAT`. Getting the spelling wrong — an extra or missing letter, wrong case on the suffix — is the single most common tool-call failure. Confirm an unfamiliar or uncertain nodeType with `get_td_classes` or `get_td_class_details` instead of guessing from memory.

```json
{ "parentPath": "/project1", "nodeType": "textTOP", "nodeName": "title" }
```

Set parameters through `update_td_node_parameters`'s `properties` map, keyed by TouchDesigner's **lowercase parameter name**, not the capitalized label shown in the UI — e.g. `tx`, `resolutionw`, `text`, `play`. Do not infer a parameter name from its UI label; confirm the exact lowercase name with `get_td_node_parameters` on the node before writing to it, since the mapping between label and name is not always a literal lowercasing and varies by operator.

## The Cook Model

TouchDesigner is pull-based and lazy: an operator recomputes ("cooks") only when something downstream actually requests its output, and it skips recooking when neither its inputs nor its parameters changed since the last cook. This has two practical consequences. First, a node with no active downstream consumer — no open viewer, no export, not on a rendered path — may never cook, so reading its output or expecting a side effect from it can silently do nothing; ensure a consuming path exists, or force a cook explicitly from `execute_python_script` with `op(path).cook(force=True)` before reading its output. Second, trace errors and stale values back to a node that isn't cooking at all before assuming it is computing the wrong thing — `get_td_node_errors` reports cook errors, but a node that never cooks reports none, so an empty error report is not proof of correctness.

## Wiring Operators Together

No dedicated "connect nodes" MCP tool exists. Wire operators together with `execute_python_script`, using the input/output connector arrays each operator exposes:

```python
op('/project1/noise1').outputConnectors[0].connect(op('/project1/level1').inputConnectors[0])
# equivalently, from the consuming side:
op('/project1/level1').inputConnectors[0].connect(op('/project1/noise1'))
```

Drive a parameter continuously from a CHOP channel through **parameter export** rather than a wire — in the UI this is normally a drag-and-drop action. When scripting an export, confirm the exact Par/Channel API for the running TD version with `get_td_class_details` rather than assuming a call signature, since this is one of the areas most likely to differ subtly between versions. A one-time or formula-based link instead sets the parameter's **expression** string, which re-evaluates on every cook:

```python
op('/project1/noise1').par.tx.expr = "op('lfo1')[0]"
```

Export and expression are not interchangeable — decide which behavior is wanted (continuous binding vs. formula re-evaluated per cook) before choosing between them.

## Canonical Workflow

Treat every network change as a loop, never a single fire-and-forget call:

1. **Inspect** — call `get_td_nodes` on the parent path (and `get_td_node_parameters` on any node being modified) to see the real current state. Never assume a network's contents.
2. **Create** — call `create_td_node` with the verified `nodeType` and `parentPath`.
3. **Configure** — call `update_td_node_parameters` with lowercase parameter names confirmed via `get_td_node_parameters`.
4. **Wire** — call `execute_python_script` to connect `inputConnectors`/`outputConnectors`, or to set an export/expression link.
5. **Verify** — call `get_td_node_errors` on the affected subtree and, for visual chains, `get_top_image` to actually look at the rendered result. Never report a network change as done without this step — a node can be created and wired with no thrown error while still cooking incorrectly, or not cooking at all.

Return to step 1 after any unexpected result — re-inspect the live state rather than guessing at what went wrong from the last known state.

## Common Pitfalls

- **Wrong nodeType spelling.** Confirm with `get_td_classes`/`get_td_class_details` instead of guessing from memory, especially for less common operators.
- **Wrong parameter casing or name.** UI labels are capitalized; `properties` keys are not, and the two don't always match one-to-one. Confirm with `get_td_node_parameters`.
- **Creating into the wrong parent.** Re-check `parentPath` with `get_td_nodes` immediately before creating, especially in deeply nested COMP hierarchies.
- **Forgetting display/render flags.** A TOP/SOP/CHOP can be fully correct but invisible in the network editor or absent from a render because its display or render flag is off. Check flags via `get_td_node_parameters` or `exec_node_method` rather than assuming visibility follows from correct wiring.
- **Confusing expression, export, and literal values.** Setting `par.tx = 5` overwrites any existing expression or export; setting `par.tx.expr = "..."` leaves a live formula; a parameter export binds a continuous channel. Choose deliberately, and confirm the export mechanism's exact API before scripting it.
- **Assuming success without verification.** A tool call returning without an exception is not proof the network behaves as intended. Always close the loop with `get_td_node_errors` and, for visual work, `get_top_image`.
- **Crossing families without a converter.** A TOP output cannot feed a CHOP input (or vice versa) through a plain wire — use the matching `xToY` converter operator, or an export/expression link for parameter-level cross-family driving.

## Additional Resources

- `references/operator-guide.md` — the live-lookup procedure for fetching an operator's parameter names, defaults, menus, and official help text from the running TouchDesigner on demand.
- `scripts/dump_operator_pars.py` — batch utility: send through `execute_python_script` to inspect parameter names, labels, defaults, menus, and official help text for several operators in one call.
- `references/python-patterns.md` — `op()`/`parent()`/`me`, absolute vs. relative paths, reading and setting parameters, export vs. expression, iterating children, creating operators from Python, `run()`/delayed execution, and debugging via `execute_python_script`.
