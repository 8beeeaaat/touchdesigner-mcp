# TouchDesigner Operator Index & Live Lookup

This file deliberately stores **no parameter details**. Parameter names, defaults, menu options, and documentation are fetched live from the running TouchDesigner instance at the moment they are needed — that data can never go stale, and TouchDesigner's own build is always the ground truth. What this file curates is the judgment call a live instance cannot make: **which operators are the usual right choice** for a job, per family.

## Live lookup procedure

Fetch parameter facts on demand, in this order:

1. **An existing node's parameters and current values** — call `get_td_node_parameters` with the node's path. Fastest path when the node is already in the network.

2. **Full metadata + official docs for any operator type** — run this through `execute_python_script` (works whether or not an instance exists yet; creates a throwaway node and destroys it):

   ```python
   import json, td
   CLS = 'noiseTOP'          # operator type to inspect
   parent = op('/project1') or op('/')
   n = parent.create(getattr(td, CLS), 'zztmp_lookup')
   try:
       result = json.dumps([
           {'name': p.name, 'label': p.label, 'style': p.style,
            'default': str(p.default),
            'page': p.page.name if p.page else '',
            'menu': list(p.menuNames) if p.isMenu else None,
            'help': p.help}
           for p in n.pars()
           if (p.page.name if p.page else '') not in ('Common',)])
   finally:
       n.destroy()
   ```

   `help` is TouchDesigner's official rollover documentation for the parameter; `name` is the exact lowercase key to pass to `update_td_node_parameters`; `menu` lists the legal values for menu-style parameters. To inspect an existing node instead, run the same loop over `op(path).pars()` without creating anything. For dumping several operators in one pass, use the batch variant at `../scripts/dump_operator_pars.py`.

3. **Methods and properties of the operator's Python class** — `get_td_class_details` (and `get_td_module_help` for module-level docs). These cover the scripting surface, not parameters.

Never write a parameter value from a name recalled from memory — look the name up first via step 1 or 2. Class-name existence is also checkable cheaply: `getattr(td, 'someTOP', None)` (e.g. `geometryCOMP` and `cameraCOMP` exist; `geoCOMP`/`camCOMP` do not).

## Operator index

Names below are the exact `nodeType` strings for `create_td_node`, verified against a live instance. One line each — fetch everything deeper via the lookup procedure above.

### TOP — textures and images (GPU)

- `moviefileinTOP` — video/image/sequence playback from disk
- `constantTOP` — solid uniform color fill; base layer, mask, test pattern
- `noiseTOP` — procedural noise texture; organic motion and texture source
- `textTOP` — renders a string as a texture
- `compositeTOP` — layers and blends multiple wired TOP inputs
- `levelTOP` — brightness / contrast / gamma / opacity adjustment
- `transformTOP` — 2D translate / rotate / scale within the frame
- `resolutionTOP` — resample to a specific pixel resolution
- `blurTOP` — GPU blur
- `feedbackTOP` — previous-frame accumulation; trails and glow build-up
- `videodeviceinTOP` — live camera / webcam capture
- `renderTOP` — rasterizes a 3D scene (geometry + camera + lights) to an image
- `outTOP` — exposes a TOP output when the component is used as a `.tox`

### CHOP — channels and signals

- `noiseCHOP` — channel noise for organic motion / jitter
- `lfoCHOP` — periodic waveform generator for cyclic motion
- `constantCHOP` — fixed hand-set channel values; good for testing downstream wiring
- `audiodeviceinCHOP` — live audio input as channels
- `mathCHOP` — arithmetic: scale, offset, clamp, range remap
- `selectCHOP` — pick/rename channels from another CHOP by pattern, wireless
- `filterCHOP` — smooths channels over time
- `triggerCHOP` — impulse → attack/hold/decay/release envelope
- `logicCHOP` — boolean/threshold logic; continuous → on/off
- `midiinCHOP` / `oscinCHOP` — MIDI / OSC input as channels
- `timerCHOP` — timing, sequencing pulses, progress channels
- `speedCHOP` — integrates a rate into a continuously ramping value
- `outCHOP` — exposes a CHOP output when the component is used as a `.tox`

### SOP — 3D geometry

- `boxSOP` / `sphereSOP` / `gridSOP` / `circleSOP` / `lineSOP` — primitive generators
- `mergeSOP` — combines multiple SOP streams
- `transformSOP` — translate / rotate / scale geometry
- `noiseSOP` — noise-displaces points for organic deformation
- `copySOP` — duplicates geometry N times (prefer instancing for large N — see td-performance)
- `textSOP` — extrudes 3D geometry from a string
- `facetSOP` — recomputes normals / consolidates points before rendering
- `booleanSOP` — CSG union / intersect / subtract

### DAT — text, tables, and scripts

- `textDAT` — arbitrary text: Python scripts, GLSL shader bodies
- `tableDAT` — row/column data, addressed via Python `op(path)[row, col]`
- `scriptDAT` — table computed procedurally in an `onCook` callback
- `executeDAT` — Python callbacks on project lifecycle events (start, frame)
- `parameterexecuteDAT` — Python callbacks when watched parameters change
- `webclientDAT` — outbound HTTP requests (driven via Python methods)
- `webserverDAT` — in-process HTTP server (the mechanism behind this plugin's bridge)
- `oscinDAT` — OSC messages as rows, when content isn't purely numeric
- `mergeDAT` / `selectDAT` — combine / extract table data, wireless
- `infoDAT` — read-only diagnostic metadata about another operator

### COMP — containers and scene objects

- `geometryCOMP` — 3D object holding SOPs, references a MAT; the render subject
- `cameraCOMP` — render viewpoint
- `lightCOMP` — light source
- `baseCOMP` — plain organizational container
- `containerCOMP` — 2D UI panel container
- `buttonCOMP` / `sliderCOMP` — clickable / draggable UI controls
- `windowCOMP` — external display window (fullscreen / secondary output)
- `nullCOMP` — stable pass-through point in a 3D hierarchy
- `actorCOMP` — specialized interactive/simulation 3D object

### MAT — materials

- `phongMAT` — classic Blinn-Phong shading; the default choice
- `pbrMAT` — physically-based: base color / roughness / metallic
- `constantMAT` — flat unlit color/texture
- `wireframeMAT` — edges only; topology debugging
- `depthMAT` — outputs depth instead of color; depth/shadow passes
- `glslMAT` — fully custom GLSL shader material (see the td-glsl skill)

## Typical render network

One operator from four families plus a material: a `geometryCOMP` (with a SOP inside, `material` parameter pointing at a MAT), a `cameraCOMP`, a `lightCOMP` in the same scope, a `phongMAT`, and a `renderTOP` whose `camera` parameter holds the camera's path. The camera (and typically lighting) is connected by **path-reference parameter, not a wire** — a blank render is at least as often a missing/mis-set camera or light reference as a missing wire. After building, confirm with `get_top_image` on the `renderTOP` rather than trusting the configuration.
