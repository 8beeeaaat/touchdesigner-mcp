# TouchDesigner Recipes Reference

Detailed node lists, wiring order, key parameters, and verification steps for each recipe indexed in `SKILL.md`. Build every recipe with the create → wire → configure → verify loop described there: add one or two nodes, wire them, set their parameters, then check `get_td_node_errors` and (for anything visual) `get_top_image` before moving on. Do not build a whole recipe and check it only at the end.

All paths below assume a container COMP already exists to hold the recipe, e.g. `/project1/audioReactive1`. Substitute the actual parent path used in `parentPath` for every `create_td_node` call.

Parameter and class names below were verified against a live TouchDesigner 2025.33070 instance (note: the classes are `geometryCOMP`/`cameraCOMP` — no `geoCOMP`/`camCOMP` exists). On a significantly older TouchDesigner, re-confirm names with `get_td_node_parameters` before writing.

---

## 1. Basic 3D render network

**Goal.** The minimal network that renders a 3D object to a TOP: geometry, a camera to view it, a light to shade it, a material to shade it with, and a render node to produce the image.

**Node list**

| Node name | nodeType | Purpose |
|---|---|---|
| `geo1` | `geometryCOMP` | Holds the geometry to render; contains a SOP network inside it. |
| `torus1` (inside `geo1`) | `torusPOP` | A default piece of geometry to render (swap for any SOP/POP). |
| `phong1` | `phongMAT` | Shades the geometry — the default, general-purpose material. |
| `cam1` | `cameraCOMP` | The viewpoint the scene is rendered from. |
| `light1` | `lightCOMP` | Illuminates the geometry — without one, a Phong-shaded object renders black or unlit. |
| `render1` | `renderTOP` | Produces the final image from geometry + camera + lights. |
| `null1` | `nullTOP` | Stable output endpoint for the render, per the null-operator convention in `SKILL.md`. |

**Build order**

1. Create `geo1` (`geometryCOMP`) at the container path. A default `geometryCOMP` is created with a `torusPOP` already inside it — verify this with `get_td_nodes` on `geo1`'s path before adding your own SOP; only create `torus1` explicitly if the default geometry is missing or needs to be replaced.
2. Create `cam1` (`cameraCOMP`) and `light1` (`lightCOMP`) as siblings of `geo1`, not inside it.
3. Create `phong1` (`phongMAT`) as a sibling as well — MATs live alongside COMPs, not wired into the node network.
4. Assign the material to the geometry: `update_td_node_parameters({ nodePath: ".../geo1", properties: { material: "../phong1" } })`. `material` is the verified parameter name on the geometry COMP's Render page; the string path format matters (relative path from the geo COMP).
5. Create `render1` (`renderTOP`). Point it at the scene: `update_td_node_parameters({ nodePath: ".../render1", properties: { camera: "../cam1", geometry: "../geo1", lights: "../light1" } })`.
6. Create `null1` (`nullTOP`) and wire it downstream of `render1`:
   ```python
   op('.../null1').inputConnectors[0].connect(op('.../render1'))
   ```

**Key parameters**

- `render1.camera`, `render1.geometry`, `render1.lights` — the three references that make the render TOP actually show something. A render TOP with any of these unset produces a black or empty image with no cook error, so double-check them first if the output looks wrong (see "Silent black output" in `SKILL.md`).
- `cam1.tx` / `ty` / `tz` / `rx` / `ry` / `rz` — standard COMP transform parameters, used to position and aim the camera. Move the camera back along `tz` (e.g. `tz: 5`) if the default position is inside the geometry.
- `light1`'s exact shading parameters (color, dimmer/intensity) vary slightly by light type — confirm names with `get_td_node_parameters` before adjusting brightness or color.

**Verify.** Call `get_td_node_errors` on `geo1`, `render1`, and `null1`. Then call `get_top_image` on `null1` — expect to see a lit, shaded object. If the image is black, check the three render TOP references first, then confirm the camera isn't positioned inside the geometry.

---

## 2. Audio-reactive control chain

**Goal.** Convert live or file-based audio into one smoothed, remapped control value suitable for driving any other parameter in the project.

**Node list**

| Node name | nodeType | Purpose |
|---|---|---|
| `audioIn1` | `audiodeviceinCHOP` (live input) or `audiofileinCHOP` (file playback) | Raw audio signal. |
| `analyze1` | `analyzeCHOP` or `audiospectrumCHOP` | Reduces raw audio to a meaningful scalar (e.g. overall loudness) or spectrum. |
| `math1` | `mathCHOP` | Remaps the analyzed value's range to a usable output range. |
| `lag1` | `lagCHOP` | Smooths the signal so it doesn't drive visuals with jittery, frame-to-frame noise. |
| `audioLevel1` | `nullCHOP` | Stable, named endpoint that other parameters reference. |

**Build order**

1. Create `audioIn1`. For a live input device, use `nodeType: "audiodeviceinCHOP"`; for a file, use `nodeType: "audiofileinCHOP"` and set its `file` parameter to the audio file path.
2. Create `analyze1` (`analyzeCHOP`). This CHOP reduces a signal to characteristics like RMS power or peak level via its `function` parameter (verified name) — read the available option values with `get_td_node_parameters` on `analyze1` and set the one corresponding to overall loudness (an RMS-style measure). `audiospectrumCHOP` is the alternative when a frequency-band breakdown is needed instead of a single loudness value.
3. Wire `analyze1` downstream of `audioIn1`:
   ```python
   op('.../analyze1').inputConnectors[0].connect(op('.../audioIn1'))
   ```
4. Create `math1` (`mathCHOP`) and wire it downstream of `analyze1`. Its Range page remaps an input range to an output range via the verified `fromrange1`/`fromrange2` and `torange1`/`torange2` parameters. Set the "from" range to the analyzed signal's actual observed range and the "to" range to whatever scale the destination parameter expects (e.g. `0` to `1`).
5. Create `lag1` (`lagCHOP`) and wire it downstream of `math1`. Set `lag1` (lag-up time) and `lag2` (lag-down time) in seconds — small values (e.g. `0.1`–`0.3`) smooth jitter without making the response feel sluggish; larger values read as a slow fade.
6. Create `audioLevel1` (`nullCHOP`) and wire it downstream of `lag1`.
7. Drive a destination parameter from this chain with a parameter expression rather than a one-off script, so it keeps updating every frame, e.g. on a TOP's brightness parameter: `op('.../audioLevel1')[0]`. Alternatively, use a CHOP Export (set via `execute_python_script` calling the export API, or the Export DAT) if the target parameter should be fully driven and locked to the channel.

**Key parameters**

- `audioIn1.file` (file input only) — path to the audio file.
- `analyze1.function` — the analysis type; read its option values with `get_td_node_parameters` and pick the RMS/loudness-style measure.
- `math1.fromrange1`/`fromrange2` → `torange1`/`torange2` — map the analyzed value's real range onto 0–1 (or whatever the target expects).
- `lag1.lag1` / `lag1.lag2` — smoothing time in seconds, up and down respectively.

**Verify.** After steps 3 and 6, inspect the actual CHOP output through `execute_python_script`, once for `analyze1` and again for `audioLevel1` while audio is playing:

```python
node = op('.../audioLevel1')
limit = min(node.numSamples, 8)
snapshot = {
	channel.name: [float(channel[i]) for i in range(limit)]
	for channel in node.chans()
}
print(snapshot)
```

Expect at least one channel, non-flat values from `analyze1`, and values in the intended remapped range from `audioLevel1`. `get_td_node_parameters` cannot perform this check because it returns operator settings, not CHOP channels or samples.

---

## 3. TOP feedback loop

**Goal.** The classic trails/echo effect, where each frame blends with a decaying copy of previous frames.

**Node list**

| Node name | nodeType | Purpose |
|---|---|---|
| `noise1` (or any live source) | `noiseTOP` | Example new input feeding the loop each frame — replace with whatever is actually meant to leave trails. |
| `composite1` | `compositeTOP` | Blends the new input with the fed-back previous frame. |
| `level1` | `levelTOP` | Decays the feedback slightly each frame (opacity/brightness < 1) so trails fade instead of accumulating forever. |
| `transform1` | `transformTOP` | Optional — adds motion to the feedback each frame (slow rotation, scale, or offset) for a more dynamic trail. |
| `feedback1` | `feedbackTOP` | Holds and re-supplies the previous frame's output. |
| `null1` | `nullTOP` | Stable output endpoint. |

**Build order**

1. Create the new-input source (`noise1` or equivalent) — this is whatever content should leave a trail.
2. Create `composite1` (`compositeTOP`). This needs two inputs: the new source and the fed-back previous frame.
3. Create `feedback1` (`feedbackTOP`).
4. Create `level1` (`levelTOP`) and, optionally, `transform1` (`transformTOP`) to process the feedback signal before it re-enters the composite.
5. Wire the loop:
   ```python
   op('.../composite1').inputConnectors[0].connect(op('.../noise1'))
   op('.../level1').inputConnectors[0].connect(op('.../feedback1'))
   op('.../transform1').inputConnectors[0].connect(op('.../level1'))
   op('.../composite1').inputConnectors[1].connect(op('.../transform1'))
   ```
   (Omit the `transform1` hop and connect `level1` straight into `composite1`'s second input if no extra motion is wanted.)
6. Point `feedback1` at the node whose output should be captured and re-supplied — typically the composite itself, so the blended result (new input + decayed trail) is what feeds back next frame:
   ```
   update_td_node_parameters({ nodePath: ".../feedback1", properties: { top: "../composite1" } })
   ```
   `top` is the verified parameter name — the single parameter naming which TOP's output the Feedback TOP captures each frame. `resetpulse` re-primes the loop if it saturates or locks up.
7. Set the decay: `update_td_node_parameters({ nodePath: ".../level1", properties: { opacity: 0.9 } })` (`opacity` is verified; `brightness1` is the multiplicative alternative). A value near `1` gives long-lived trails; a value near `0.7`–`0.8` gives short, fast-fading ones.
8. Create `null1` and wire it downstream of `composite1` (or of `feedback1`, depending on which point in the loop should be the externally-visible output — composite1 typically looks more "live," feedback1's own output looks one frame delayed).

**Key parameters**

- `feedback1.top` — which TOP's output is captured and re-supplied as feedback.
- `level1.opacity` — the decay factor; this is what makes trails fade rather than saturate to white/solid over time.
- `composite1`'s blend-mode parameter (`operand`) — set to an "over" or "add" style blend depending on whether trails should occlude or accumulate with new input.

**Verify.** Watch for the most common feedback mistake: nothing decaying (trails never fade, image washes out) means the level/decay value is too close to 1 or missing entirely; nothing appearing at all (permanently black) means the composite chain isn't actually receiving new input each frame, only the loop — see "Feedback loops that never start" in `SKILL.md`. Use `get_top_image` on `null1` across a couple of calls to visually confirm trails both appear and fade.

---

## 4. Geometry instancing

**Goal.** Render many copies of one piece of geometry, each positioned (and optionally rotated/scaled) according to per-instance data from a CHOP, SOP, or DAT.

**Node list**

| Node name | nodeType | Purpose |
|---|---|---|
| `geo1` | `geometryCOMP` | The instanced geometry — one shape, drawn many times. |
| `positions1` | `noiseCHOP` (or any SOP/DAT with per-point/per-row data) | Supplies one position (and optionally rotation/scale) per instance. |

**Build order**

1. Create `geo1` (`geometryCOMP`) with whatever geometry should be repeated inside it (a default `torusPOP`, or a custom one).
2. Create the instance-data source. For a CHOP-driven layout, `noiseCHOP` with enough samples to cover the desired instance count works well as a starting point (each sample becomes one instance's transform data); for point-based placement, a SOP's points can be used directly instead.
3. Turn on instancing on `geo1` and point it at the data source. TouchDesigner's Geometry COMP exposes an Instance page whose parameter names are verified: the `instancing` toggle, the `instanceop` source reference, and per-component channel-name parameters — `instancetx`/`instancety`/`instancetz` (position), `instancerx`/`instancery`/`instancerz` (rotation), `instancesx`/`instancesy`/`instancesz` (scale), `instancer`/`instanceg`/`instanceb`/`instancea` (color).
   ```
   update_td_node_parameters({ nodePath: ".../geo1", properties: { instancing: 1, instanceop: "../positions1" } })
   ```
4. Once instancing is on and pointed at the source, set the per-axis channel-name parameters (`instancetx`/`instancety`/`instancetz` at minimum) to match the channel names actually present in `positions1`. Inspect them through `execute_python_script` before configuring the Geometry COMP: `print([channel.name for channel in op('.../positions1').chans()])`. A default `noiseCHOP` exposes a single channel named `chan1` (verified in TD 2025.33070); channel count and names change with its parameters; use only the names returned by the live node.
5. Add a camera, light, and render TOP per the basic 3D render network recipe above if none already exist in the project, so the instanced result is actually visible.

**Key parameters**

- `geo1.instancing` / `geo1.instanceop` — the toggle and the instance-data source path.
- `geo1`'s per-axis instance channel-name parameters (position at minimum; rotation and scale optional) — must match real channel names in the source CHOP/SOP/DAT.
- `positions1`'s own parameters (e.g. `noiseCHOP`'s `period`, `tx`/`ty`/`tz`) if using noise to drive layout — animating these moves the whole instance field over time.

**Verify.** After enabling instancing, call `get_td_node_errors` on `geo1` first — a mismatched channel name or a bad `instanceop` reference typically surfaces there as a clear error rather than a silent single-instance render. Then call `get_top_image` on the render chain's output to confirm multiple copies of the geometry actually appear, not just one instance at the origin (which usually means the instance source path or channel names didn't take).

---

## 5. Noise-driven animation

**Goal.** Continuous, non-repeating motion without keyframes, using noise evaluated against running time.

**Node list**

| Node name | nodeType | Purpose |
|---|---|---|
| `noise1` | `noiseCHOP` or `noiseTOP` | Produces the animated value(s). |
| `target1` | Whatever node should move (a `geometryCOMP`, `transformTOP`, etc.) | The thing being animated. |

**Build order**

1. Create `noise1`. Use `noiseCHOP` when the output will drive a parameter via a channel reference or export; use `noiseTOP` when the noise itself is the visual content (e.g. feeding a displace or as a texture).
2. TouchDesigner's noise operators are already time-based by default — a `noiseCHOP`/`noiseTOP` left at its defaults evolves continuously because its internal time reference advances every frame. For a `noiseCHOP`, confirm this by using `execute_python_script` to read channel samples twice at different moments, as shown in the audio recipe above. For a `noiseTOP`, capture two images with `get_top_image`. If the output is static, inspect its time-related settings with `get_td_node_parameters` before adding a manual time expression.
3. Where explicit time control is wanted (e.g. changing the rate of evolution independent of playback), set the parameter's expression through `execute_python_script`, because `update_td_node_parameters` writes literal values through `par.val` and cannot switch a parameter to expression mode:
   ```python
   op('.../noise1').par.tx.expr = "absTime.seconds * 0.1"
   ```
   Use `me.time.frame` instead when the animation should be tied to frame count rather than wall-clock time (e.g. for frame-accurate export/render).
4. Connect the noise output to `target1`'s transform. For a CHOP driving a COMP's transform parameters, set an expression on the destination parameter through `execute_python_script`, since COMP transform parameters are not CHOP inputs:
   ```python
   op('.../target1').par.tx.expr = "op('../noise1')[0]"
   ```
   For a `transformTOP`, use the same `.expr` approach on its translate, rotate, or scale parameter.

**Key parameters**

- `noise1.period` — controls how quickly the noise pattern changes; larger values = slower, smoother evolution.
- `noise1.tx` (or `ty`/`tz`) — scrolling the noise field over time is what produces continuous, non-looping motion; this is the parameter to drive with an `absTime.seconds`-based expression when explicit rate control is needed.
- `noise1.type` — selects the noise algorithm; the default is usually adequate for organic motion, but sparser or blockier variants exist for more angular results.

**Verify.** Inspect a `noiseCHOP`'s channel samples twice through `execute_python_script`, or capture a `noiseTOP` twice with `get_top_image`, and confirm the output changes. Then call `get_top_image` for a visual target or `get_td_node_parameters` on `target1` to confirm the destination parameter's evaluated value changes with the noise.

---

## 6. Video playback + effect chain

**Goal.** Load a video file and process it through a chain of effect TOPs before display or export.

**Node list**

| Node name | nodeType | Purpose |
|---|---|---|
| `moviefilein1` | `moviefileinTOP` | Loads and plays back the video file. |
| `blur1` | `blurTOP` | Softens the image. |
| `level1` | `levelTOP` | Adjusts brightness/contrast/opacity. |
| `displace1` | `displaceTOP` | Distorts the image using a second TOP as a displacement map (optional). |
| `edge1` | `edgeTOP` | Extracts edges (optional, often used as an alternative look rather than chained with the above). |
| `null1` | `nullTOP` | Stable output endpoint. |

**Build order**

1. Create `moviefilein1` (`moviefileinTOP`). Set its `file` parameter to the path of the video file:
   ```
   update_td_node_parameters({ nodePath: ".../moviefilein1", properties: { file: "/path/to/video.mov" } })
   ```
2. Confirm playback state with `get_td_node_parameters` — `moviefileinTOP` exposes a `play` toggle (playing vs. paused) and a `speed` parameter (playback rate multiplier, `1` = normal, negative values reverse). Set `play: 1` to start playback if it isn't already running by default.
3. Chain effect TOPs downstream, one at a time, verifying with `get_top_image` after each:
   ```python
   op('.../blur1').inputConnectors[0].connect(op('.../moviefilein1'))
   op('.../level1').inputConnectors[0].connect(op('.../blur1'))
   ```
4. For `displace1`, two inputs are needed — the image to distort and a second TOP supplying the displacement pattern (e.g. a `noiseTOP`, per the noise-driven animation recipe):
   ```python
   op('.../displace1').inputConnectors[0].connect(op('.../level1'))
   op('.../displace1').inputConnectors[1].connect(op('.../noise1'))
   ```
5. Wire the final effect in the chain into `null1` as the stable output.

**Key parameters**

- `moviefilein1.file` — path to the video file.
- `moviefilein1.play` — playback on/off.
- `moviefilein1.speed` — playback rate; cueing to a specific position uses the verified `cue` toggle, `cuepoint` position, and `index` parameters.
- `blur1.size` — blur radius (verified; `filtertype` selects the kernel).
- `level1.brightness1` / `contrast` / `opacity` / `gamma1` — verified names; these scale and offset the image's color values.
- `displace1.displaceweightx` / `displaceweighty` (with `horzsource`/`vertsource` selecting the driving channels) — how far pixels are displaced by the second input's values.

**Verify.** Call `get_td_node_errors` on `moviefilein1` first — a bad file path is the most common failure and surfaces there clearly rather than as a blank image with no explanation. Then call `get_top_image` after each effect stage is wired in, confirming the expected visual change (softer image after `blur1`, adjusted brightness after `level1`, distortion after `displace1`) before adding the next stage.
