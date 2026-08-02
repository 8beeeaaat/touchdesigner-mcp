---
name: td-recipes
description: This skill should be used when the user asks to build a specific visual effect or network in TouchDesigner using the touchdesigner-mcp tools — for example requests mentioning "audio reactive", "feedback loop", "instancing", "particles", "VJ visuals", "generative visuals", or any "build X in TouchDesigner" request. Provides step-by-step recipes (node lists, wiring order, key parameters, verification steps) for common TouchDesigner patterns, plus the create-wire-configure-verify workflow for building networks incrementally against a live TouchDesigner instance.
version: 0.1.0
---

# TouchDesigner Recipes

Build TouchDesigner networks against a live instance through the touchdesigner-mcp tools, one verified stage at a time. This skill packages proven node combinations for common creative-coding patterns — audio reactivity, feedback loops, instancing, 3D rendering, noise animation, and video effects — so a network can be assembled correctly on the first pass instead of through trial and error.

## When to use this skill

Reach for this skill whenever a request describes an effect or behavior rather than a single node — "make this audio reactive," "give me a feedback trail effect," "instance this geometry across points," "set up a basic 3D scene," "animate this with noise," "build a video playback chain with effects." Each of these maps to one of the recipes indexed below. If the request is instead about a single operator's parameters or a Python API question, this skill is the wrong starting point — go straight to `create_td_node` / `update_td_node_parameters` / `execute_python_script` for the specific node in question.

## The recipe method

Every recipe in this skill follows the same four-stage loop. Never build an entire network blind and check it at the end — verify after each stage so a failure is caught where it happened, not three nodes downstream.

**1. Create.** Add each node with `create_td_node`, specifying `parentPath`, `nodeType` (the exact TouchDesigner operator type string, e.g. `noiseTOP`, `audiodeviceinCHOP`), and a descriptive `nodeName`. Create nodes in the order they will be wired — source first, then each stage of processing, ending at the output. For example:

```
create_td_node({ parentPath: "/project1", nodeType: "noiseTOP", nodeName: "noise1" })
```

**2. Wire.** Connect nodes with `execute_python_script`, using TouchDesigner's `inputConnectors` API:

```python
op('/project1/noise2').inputConnectors[0].connect(op('/project1/noise1'))
```

Wire one connection (or one short logical group of connections) at a time rather than scripting the entire chain in a single call. If a connection fails — wrong family (TOP into CHOP), wrong index, or a typo'd path — the error surfaces immediately and points at the exact line, instead of being buried in a longer script.

**3. Configure.** Set parameters with `update_td_node_parameters`, passing `nodePath` and a `properties` object of parameter-name to value pairs:

```
update_td_node_parameters({ nodePath: "/project1/noise1", properties: { period: 2 } })
```

Where a parameter's exact name is not certain, do not guess — call `get_td_node_parameters` on that node first to read the real parameter names and current values, then set the confirmed name. Guessing a plausible-sounding name that turns out to be wrong wastes a round trip and can silently set nothing.

**4. Verify.** After creating and wiring a stage, confirm it actually works before moving to the next one:

- `get_td_node_errors` on each new node — TouchDesigner surfaces cook errors, missing inputs, and bad expressions here immediately.
- `get_top_image` on the nearest TOP downstream of the change — for anything visual, look at the actual pixels rather than trusting that "no error" means "looks right." A network can cook without errors and still be black, blown out, or wired to the wrong input.
- For CHOP chains with no visual output yet, use `execute_python_script` to inspect the terminal CHOP's actual channel names and sample values. `get_td_node_parameters` only reports operator settings; it does not expose CHOP output data.

Repeat create → wire → configure → verify per stage. A recipe with six nodes is six short loops, not one long one.

## Recipe index

Full node lists, wiring order, and parameter details for each of these live in `references/recipes.md`. This index is only for picking the right recipe — read the matching section there before building.

- **Basic 3D render network** — the minimal scene needed to render anything in TouchDesigner: a `geometryCOMP` with geometry inside, a `cameraCOMP`, a `lightCOMP`, and a `renderTOP` that ties them together through a `phongMAT`. Start here for any "render a 3D object" request.
- **Audio-reactive control chain** — turn live or file-based audio into a smoothed, remapped control signal that can drive any parameter: an audio input CHOP into an analysis stage, through range remapping and lag smoothing, ending at a stable `nullCHOP` that other parameters reference.
- **TOP feedback loop** — the classic trails/echo effect: a `feedbackTOP` wired into a small compositing chain that continuously blends the previous frame with new input.
- **Geometry instancing** — repeat one piece of geometry many times with per-instance position (and optionally rotation/scale) driven by a CHOP, SOP, or DAT source, using a `geometryCOMP`'s instancing page.
- **Noise-driven animation** — use `noiseCHOP` or `noiseTOP` with time-based expressions (`absTime.seconds`) to produce continuous, non-repeating motion without keyframes, then map that into transforms.
- **Video playback + effect chain** — load a movie file and run it through a chain of effect TOPs (blur, level, displace, edge) into a stable output, with the basics of cueing and playback control.

## General wiring and layout tips

**Use null operators as stable endpoints.** Place a `nullTOP` (or `nullCHOP`) right before any point another part of the network, an export, or an output will reference — never point external references directly at a working node inside a chain. If the chain upstream of the null is later rebuilt, reordered, or swapped out, everything downstream keeps working because it only ever pointed at the null. This applies to both the very end of a network and to any internal "handle" other chains tap into (e.g. the smoothed audio signal in the audio-reactive recipe).

**Name nodes descriptively as they're created.** Pass a meaningful `nodeName` to `create_td_node` at creation time rather than the operator's default numbered name — `audioLevel1` and `feedbackOut1` are far easier to reason about (and to reference correctly from `execute_python_script`) than `math3` and `null7`, especially once several recipes are combined in the same project.

**Keep chains inside container COMPs.** For anything beyond a handful of nodes, create a `containerCOMP` (or `baseCOMP`) to hold each logical recipe, and build inside it rather than directly under `/project1`. This keeps `/project1` readable as a project grows, makes a recipe easy to move, duplicate, or delete as a unit, and avoids name collisions between recipes that both want a node called `null1`.

**Match operator families when wiring.** TOPs connect to TOPs, CHOPs to CHOPs, SOPs to SOPs, and so on — `inputConnectors[0].connect(...)` will fail (or silently do nothing useful) if the source and target are different families. When a recipe crosses families — for example, a CHOP value driving a TOP's parameter — that connection is made through a parameter expression or export, not through `inputConnectors`; see the audio-reactive recipe for the concrete pattern.

**Prefer parameter expressions over one-off Python pokes for anything ongoing.** A parameter expression such as `op('../audioLevel1')[0]` re-evaluates every frame; a one-time `execute_python_script` assignment does not. Use `execute_python_script` for wiring connections and for actions that happen once (loading a file, triggering a pulse); use expressions or CHOP exports for values that need to keep updating.

## Common pitfalls

**Silent black output.** A `renderTOP` (or any TOP) that cooks with no errors but shows a black image usually means a reference is missing rather than broken — no camera assigned, no light in the scene, or geometry facing away from the camera. Check the render TOP's `camera`, `geometry`, and `light` parameters with `get_td_node_parameters` before assuming the network itself is wrong.

**Feedback loops that never start.** A `feedbackTOP` with nothing upstream yet composited in will just hold whatever its initial state was — usually black — forever, because there is nothing new for it to blend with. Confirm the compositing chain actually feeds new input into the loop, not only the previous frame, before concluding the feedback parameter is misconfigured.

**Expressions that reference a node before it exists.** Writing a parameter expression like `op('../audioLevel1')[0]` before `audioLevel1` has been created will leave the parameter in an error state that looks identical to a typo. Build source nodes before the nodes that reference them, and re-check `get_td_node_errors` after adding the later node, not just the earlier one.

## Additional Resources

For exact node lists, wiring order, and parameter names for each recipe, see `references/recipes.md`.
