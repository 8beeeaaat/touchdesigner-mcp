# TouchDesigner Operator Guide

**Maintenance.** The parameter facts in this file are regenerable from a live TouchDesigner instance — do not hand-edit names from memory. Send `../scripts/dump_operator_pars.py` through the `execute_python_script` MCP tool with `OPS` set to the operators to refresh: the returned JSON carries each parameter's Python `name`, UI `label`, `default`, menu options, and TouchDesigner's official rollover `help` text, straight from the running build. Rewrite the affected entries from that output.

Use this reference to pick a starting `nodeType` and its most relevant parameters when building a network. Parameter names below reflect stable, widely-documented TouchDesigner conventions. Treat them as a strong starting guess, not ground truth — confirm the exact lowercase spelling for any operator with `get_td_node_parameters` (on an existing instance) or `get_td_class_details` (for the full parameter list of a class) before writing a value, since spelling can vary subtly by TouchDesigner version or by operator variant. Where confidence in an exact literal name is lower, that is called out explicitly below rather than stated as fact.

## TOP — Textures and Images

TOPs process image data on the GPU. Almost every visual network ends in a chain of TOPs, whether the destination is a screen, a file, or a render pass.

- **moviefilein TOP** (`moviefileinTOP`) — loads a video, image, or image sequence from disk. Key parameters: `file` (path), `play` (toggle playback), `index` (jump to a specific frame).
- **constant TOP** (`constantTOP`) — a solid, uniform color fill; useful as a base layer, mask, or test pattern. Key parameters: `colorr`, `colorg`, `colorb` (per-channel color), `alpha1` (confirm exact alpha parameter name — it may be `alpha` on some versions).
- **noise TOP** (`noiseTOP`) — GPU-generated procedural noise, a common source of organic motion or texture. Key parameters: `type` (noise algorithm), `period`, `seed`. Confirm additional amplitude/offset parameter names with `get_td_node_parameters` before relying on them, as noise-related operators have historically varied their exact parameter set across versions.
- **text TOP** (`textTOP`) — renders a string as a texture. Key parameters: `text` (the string), `alignx`/`aligny` (text alignment), `wordwrap`. Confirm the exact font-size parameter name before setting it.
- **composite TOP** (`compositeTOP`) — layers and blends multiple TOP inputs (wired directly, not referenced by path). Key parameter: `operand` (the blend/composite mode; confirm exact name and accepted values with `get_td_node_parameters`).
- **level TOP** (`levelTOP`) — adjusts brightness, contrast, gamma, and opacity of an image. Key parameters: `opacity`, `gamma1`; confirm the exact black-point/white-point parameter names before scripting them, as they are commonly mislabeled from memory.
- **transform TOP** (`transformTOP`) — 2D translate/rotate/scale of an image within its frame. Key parameters: `tx`, `ty` (translate), `rotate`, `scale`.
- **resolution TOP** (`resolutionTOP`) — resizes or resamples an image to a specific pixel resolution, optionally changing the fit mode. Key parameters: `resolutionw`, `resolutionh`. This is the operator the MCP `get_top_image` tool creates temporarily when a `maxSize` downscale is requested, so its behavior is directly exercised by this plugin's tooling.
- **blur TOP** (`blurTOP`) — applies a GPU blur. Key parameter: filter size (confirm exact parameter name, commonly along the lines of `size` or a per-axis pair).
- **feedback TOP** (`feedbackTOP`) — accumulates a TOP's own previous-frame output back into the pipeline, the standard mechanism for trails, glow accumulation, and reaction-diffusion-style effects. Key parameter: the source TOP reference (confirm exact parameter name); most feedback networks also need an explicit reset mechanism, which is worth confirming via `get_td_node_parameters` before assuming a default.
- **video device in TOP** (`videodeviceinTOP`) — captures a live camera/webcam feed. Key parameter: `device` (which capture device to use).
- **render TOP** (`renderTOP`) — rasterizes a scene (geometry via `geometryCOMP`, viewpoint via `cameraCOMP`) into an image; the endpoint of the typical 3D render network described below. Key parameter: `camera` (path to the `cameraCOMP` to render from). Confirm how lights are scoped for a given render setup with `get_td_node_parameters`/`get_td_class_details` rather than assuming a wiring requirement — lighting is commonly picked up automatically from lights in the same COMP scope rather than wired explicitly.
- **out TOP** (`outTOP`) — marks a TOP's output as a component's exposed output when the component is used as a `.tox`.

## CHOP — Channels and Signals

CHOPs carry numeric data over time: audio, control values, MIDI, OSC, and animation. CHOPs are the usual way to drive TOP/SOP/COMP parameters continuously (see the export mechanism described in `SKILL.md`).

- **noise CHOP** (`noiseCHOP`) — generates channel noise for organic motion or jitter. Key parameters: `type`, `period`, `seed`.
- **lfo CHOP** (`lfoCHOP`) — a periodic waveform generator (sine, square, etc.), commonly used for cyclic motion. Key parameter: `period`. Confirm the exact amplitude/phase parameter names before scripting them.
- **constant CHOP** (`constantCHOP`) — fixed, manually specified numeric channel values; useful for testing a downstream network before wiring a real signal source. Key parameters: `name0`, `value0` (channel name/value pairs; additional pairs increment the index).
- **audiodevicein CHOP** (`audiodeviceinCHOP`) — captures live audio input as channels. Key parameter: `device`.
- **math CHOP** (`mathCHOP`) — performs arithmetic across channels: scale, offset, clamp, or remap a signal's range. Key parameter: `gain`. Confirm the exact pre-offset/post-offset/range parameter names before relying on them.
- **select CHOP** (`selectCHOP`) — selects and optionally renames channels from another CHOP by pattern match, without needing a direct wire. Key parameters: `chop` (source path), `channames` (pattern).
- **filter CHOP** (`filterCHOP`) — smooths channels over time, commonly used to damp a noisy or stepped signal before it drives a parameter.
- **trigger CHOP** (`triggerCHOP`) — reshapes an impulse into an attack/hold/decay/release envelope; a standard building block for one-shot animations triggered from an event.
- **logic CHOP** (`logicCHOP`) — applies boolean/threshold logic to channels, converting continuous signals into on/off states.
- **midi in CHOP** (`midiinCHOP`) — receives MIDI input as channels, for controller-driven networks.
- **osc in CHOP** (`oscinCHOP`) — receives OSC (Open Sound Control) network messages as channels. Key parameter: the listening network port (confirm exact parameter name).
- **timer CHOP** (`timerCHOP`) — produces timing/sequencing pulses and progress channels, the standard building block for scripted sequences.
- **speed CHOP** (`speedCHOP`) — integrates a rate value into a continuously ramping value, the standard way to drive continuous rotation or accumulation from a rate rather than an absolute value.
- **out CHOP** (`outCHOP`) — marks a CHOP's output as a component's exposed output when the component is used as a `.tox`.

## SOP — 3D Geometry

SOPs generate and process 3D geometry: points, polygons, and curves. A render network needs at least one SOP living inside a `geometryCOMP`.

- **box SOP** (`boxSOP`) — a primitive cuboid. Key parameters: `sizex`, `sizey`, `sizez`.
- **sphere SOP** (`sphereSOP`) — a primitive sphere. Key parameter: radius (confirm exact parameter name — implementations commonly expose per-axis radius parameters rather than a single uniform one).
- **grid SOP** (`gridSOP`) — a flat or UV-mapped grid mesh, a common base for terrain, displacement, or particle-placement networks. Key parameters: `sizex`, `sizey`, `rows`, `columns`.
- **circle SOP** (`circleSOP`) — a 2D circle or arc, as an outline or a filled surface. Key parameter: `radius`.
- **merge SOP** (`mergeSOP`) — combines multiple SOP inputs into a single geometry stream.
- **transform SOP** (`transformSOP`) — translates/rotates/scales geometry. Key parameters: `tx`/`ty`/`tz`, `rx`/`ry`/`rz`, `sx`/`sy`/`sz`.
- **noise SOP** (`noiseSOP`) — displaces points using noise, for organic surface deformation. Key parameters: `type`, and amplitude/period parameters that are worth confirming with `get_td_node_parameters` before scripting.
- **copy SOP** (`copySOP`) — instances or duplicates geometry a number of times, frequently driven by a CHOP for per-instance placement. Confirm the exact copy-count parameter name via `get_td_node_parameters` before scripting it.
- **text SOP** (`textSOP`) — extrudes 3D geometry from a text string. Key parameters: `text`, and an extrusion-depth parameter worth confirming exactly.
- **facet SOP** (`facetSOP`) — a cleanup/utility operator that computes normals and consolidates points; commonly placed right before a render-bound geometry chain to ensure correct shading.
- **boolean SOP** (`booleanSOP`) — performs CSG union/intersect/subtract between two input geometries.
- **line SOP** (`lineSOP`) — generates simple line or curve geometry, often as a starting primitive for procedural chains.

## DAT — Tables, Text, and Scripts

DATs hold and process text and tabular data. They are also where Python scripting logic itself lives inside a network (as opposed to code sent externally through `execute_python_script`).

- **text DAT** (`textDAT`) — holds arbitrary text, most commonly a Python script or a GLSL shader body. Key parameter: `file` (optional path to sync the DAT's content to/from an external file on disk).
- **table DAT** (`tableDAT`) — holds simple row/column tabular data, editable directly or via script. Rows and columns are normally addressed and mutated through Python (`op(path)[row, col]`) rather than through named parameters.
- **script DAT** (`scriptDAT`) — produces its table output procedurally via a Python `onCook` callback, the standard way to compute a DAT's content programmatically rather than by hand-editing.
- **execute DAT** (`executeDAT`) — runs Python callbacks bound to project-level events such as start, frame start, and frame end; the standard place for project-wide lifecycle logic.
- **parameter execute DAT** (`parameterexecuteDAT`) — runs Python callbacks when specific parameters on watched operators change; useful for reacting to a parameter edit without polling.
- **webclient DAT** (`webclientDAT`) — issues outbound HTTP requests. Request construction and dispatch are typically driven through Python method calls on the operator rather than through parameters alone — confirm the exact call pattern with `get_td_class_details` before scripting it.
- **webserver DAT** (`webserverDAT`) — hosts an HTTP server inside the running TouchDesigner process. This is the underlying mechanism the touchdesigner-mcp Python side (`td/modules/`) uses to expose the API this plugin's tools call. Key parameters: `active`, `port`.
- **oscin DAT** (`oscinDAT`) — receives OSC messages as text/table rows, the DAT-side counterpart to `oscinCHOP` for cases where the message content is not purely numeric.
- **merge DAT** (`mergeDAT`) — combines rows and/or columns from multiple DAT inputs into one table.
- **select DAT** (`selectDAT`) — extracts a sub-range of rows/columns from another DAT by pattern, without a direct wire.
- **info DAT** (`infoDAT`) — surfaces read-only diagnostic metadata about another operator; a useful first stop when debugging an operator's internal state beyond what `get_td_node_parameters`/`get_td_node_errors` expose.

## COMP — Containers and Objects

COMPs are containers: 3D scene objects (geometry, camera, light), UI panels, and plain organizational groupings. Every node in a project lives inside some COMP.

- **geo COMP** (`geometryCOMP`) — a 3D object that contains SOP geometry and references a MAT for shading; placed directly into a scene for rendering. Key parameters: `tx`/`ty`/`tz`, `rx`/`ry`/`rz`, `sx`/`sy`/`sz` (object-space transform), and a material-reference parameter (confirm the exact name with `get_td_node_parameters`).
- **cam COMP** (`cameraCOMP`) — a camera object defining a render viewpoint. Key parameters: `tx`/`ty`/`tz` (position), and near/far clipping and field-of-view parameters worth confirming exactly before scripting.
- **light COMP** (`lightCOMP`) — a light source for rendering. Key parameters: `dimmer` (intensity), and color parameters (confirm exact names — commonly along the lines of per-channel light color).
- **base COMP** (`baseCOMP`) — a general-purpose organizational container with no special built-in behavior; the default choice for grouping a subnetwork that is not itself a UI panel or 3D object.
- **container COMP** (`containerCOMP`) — a 2D panel container used for UI layout and compositing panel-family operators together.
- **button COMP** (`buttonCOMP`) — a clickable UI control panel component. Key parameter: a value/state parameter reflecting the button's current state (confirm exact name).
- **slider COMP** (`sliderCOMP`) — a draggable UI control panel component. Key parameter: a value parameter reflecting the current slider position (confirm exact name).
- **window COMP** (`windowCOMP`) — opens an external display window, the standard way to present a panel or TOP full-screen or on a secondary display. Confirm sizing/placement parameter names before scripting them.
- **null COMP** (`nullCOMP`) — a pass-through reference point in a 3D object hierarchy, mirroring the same "insert a stable reference" role that null operators play in other families.
- **actor COMP** (`actorCOMP`) — a specialized 3D object COMP with built-in support for common game/interactive-object patterns (collision, instancing-adjacent behavior). Confirm current capabilities with `get_td_class_details` before relying on specific features, as this operator has evolved across versions.

## MAT — Materials

MATs define how a SOP's surface is shaded when rendered. There are fewer distinct commonly-used material types than in the other families; pick from these rather than assuming an exhaustive list exists.

- **phong MAT** (`phongMAT`) — the classic Blinn-Phong shading model (diffuse, specular, ambient). Key parameters: diffuse-color and specular-color parameter sets (confirm exact lowercase names with `get_td_node_parameters`, as they are commonly mis-typed from memory).
- **pbr MAT** (`pbrMAT`) — a physically-based rendering material driven by base color, roughness, and metallic inputs (as constants or texture maps). Confirm exact parameter names before scripting, since PBR parameter sets are more elaborate than Phong's.
- **constant MAT** (`constantMAT`) — a flat, unlit color or texture material; useful when lighting response is not wanted, e.g. for UI geometry or an unlit debug pass.
- **wireframe MAT** (`wireframeMAT`) — renders only geometry edges; useful for debugging topology or overlaying structure on a shaded render.
- **depth MAT** (`depthMAT`) — outputs per-pixel depth values instead of color; the standard material for generating a depth pass or feeding a shadow-map render.
- **glsl MAT** (`glslMAT`) — a fully custom shader material written in GLSL, for effects the built-in materials cannot express. Confirm the expected shader DAT wiring (vertex/pixel/geometry stage inputs) with `get_td_class_details` before authoring one from scratch.

## Typical Render Network

A minimal but complete 3D render chain combines one operator from four different families plus a material:

1. A **geo COMP** (`geometryCOMP`) containing a SOP (e.g. `sphereSOP`) as its geometry, with its material-reference parameter pointing at a MAT.
2. A **cam COMP** (`cameraCOMP`) positioned to view the geo COMP, via its `tx`/`ty`/`tz` parameters.
3. A **light COMP** (`lightCOMP`) placed in the same scope as the geo COMP so the render can pick it up.
4. A **phong MAT** (`phongMAT`) or other MAT referenced by the geo COMP's material parameter, giving the geometry its shading response.
5. A **render TOP** (`renderTOP`) with its `camera` parameter set to the `cam COMP`'s path, producing the final rasterized image.

Note that the camera and (typically) the light are referenced by **path parameter**, not by a same-family wire — a `renderTOP` does not have a same-family input connector to a `cameraCOMP`. Verify this reference-vs-wire distinction with `get_td_node_parameters` on the `renderTOP` before assuming a wiring step is missing when a render appears blank; a blank render is at least as often a missing or mis-set camera/light path reference as a missing wire. After building the chain, use `get_top_image` on the `renderTOP` to confirm the network actually produces the expected image rather than trusting that a correctly configured chain implies a correct render.
