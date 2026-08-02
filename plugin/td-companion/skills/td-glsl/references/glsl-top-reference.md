# GLSL TOP Reference

Deeper patterns for TouchDesigner's GLSL TOP beyond the core dialect covered in SKILL.md. Read SKILL.md first for the pixel shader skeleton, sampling rules, uniform setup, and the create-compile-check MCP workflow — this file assumes that foundation and does not repeat it.

## Multi-Input Sampling

A GLSL TOP samples each connected input through `sTD2DInputs[n]`, where `n` matches the input's connection order (0-indexed). When an effect needs to blend or compare multiple sources, sample each explicitly:

```glsl
out vec4 fragColor;

void main()
{
    vec4 base = texture(sTD2DInputs[0], vUV.st);
    vec4 overlay = texture(sTD2DInputs[1], vUV.st);
    vec4 mask = texture(sTD2DInputs[2], vUV.st);

    fragColor = mix(base, overlay, mask.r);
}
```

Reconnecting or reordering inputs on the GLSL TOP shifts every subsequent index. After any rewiring, re-verify indices with `get_td_node_parameters` or by inspecting the node's connections rather than trusting the shader's existing index assumptions.

## Resolution-Independent Coordinates

`vUV.st` gives normalized `[0, 1]` coordinates regardless of the TOP's resolution, which is what most effects should use — it keeps the shader's visual behavior consistent if the TOP's resolution changes. Use `vUV` directly for:

- Cross-fades, masks, and color grading that should scale with the frame.
- UV-space distortion (the distortion itself is defined in normalized space).

Pixel-space coordinates matter when an effect needs to reason in absolute texel units — a blur radius specified in pixels, a dot pattern with a fixed on-screen spacing, or anything meant to look the same size regardless of TOP resolution. Derive them from `vUV` and the output resolution rather than assuming a fixed size:

```glsl
// pixelCoord is in absolute pixel units, not normalized space
vec2 pixelCoord = vUV.st * uTDOutputInfo.res.zw;
```

The exact swizzle and member layout of `uTDOutputInfo.res` (which components hold resolution vs. inverse resolution) varies across TD versions. Confirm the current layout by referencing it in a scratch shader and reading the compile result, or reading TD's own built-in-uniform documentation, before depending on a specific swizzle in production code. An alternative that avoids the built-in struct entirely is `textureSize(sTD2DInputs[0], 0)`, which returns the sampled texture's dimensions in texels directly from the sampler and does not depend on TD's output-info layout.

## Common Effect Patterns

### Color adjustment

```glsl
out vec4 fragColor;

uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;

void main()
{
    vec4 c = texture(sTD2DInputs[0], vUV.st);
    c.rgb += uBrightness;
    c.rgb = (c.rgb - 0.5) * uContrast + 0.5;
    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.rgb = mix(vec3(gray), c.rgb, uSaturation);
    fragColor = c;
}
```

Each `uniform` here needs a matching entry on the GLSL TOP's Vectors/Uniforms parameter page with the same name — see SKILL.md's custom uniform section for the two-place sync this requires.

### UV displacement / distortion

Use a second input as a displacement map, offsetting the sampled coordinate of the first input:

```glsl
out vec4 fragColor;

uniform float uStrength;

void main()
{
    vec2 disp = (texture(sTD2DInputs[1], vUV.st).rg - 0.5) * uStrength;
    fragColor = texture(sTD2DInputs[0], vUV.st + disp);
}
```

Watch the edges: an offset coordinate that leaves `[0, 1]` samples outside the texture, which behaves according to the input TOP's wrap/extend settings. If an effect shows unexpected edge artifacts, check the source TOP's extend mode before assuming the shader math is wrong.

### Mixing two inputs

A plain cross-fade driven by a uniform float (e.g. animated from a CHOP, see below):

```glsl
out vec4 fragColor;

uniform float uMix;

void main()
{
    vec4 a = texture(sTD2DInputs[0], vUV.st);
    vec4 b = texture(sTD2DInputs[1], vUV.st);
    fragColor = mix(a, b, clamp(uMix, 0.0, 1.0));
}
```

### Simple generative patterns

`fract` and `sin` are the two workhorses for cheap procedural patterns with no input textures at all:

```glsl
out vec4 fragColor;

uniform float uTime;

void main()
{
    vec2 uv = vUV.st;
    float stripes = fract(uv.x * 20.0 + uTime);
    float pulse = sin(uv.y * 40.0 - uTime * 3.0) * 0.5 + 0.5;
    fragColor = vec4(vec3(stripes * pulse), 1.0);
}
```

`uTime` here is a custom uniform (not a TD built-in) — drive it from a CHOP or animate it externally and feed it in through the parameter page, since GLSL itself has no notion of elapsed time.

### SDF circle

A signed-distance-field circle is a common building block for generative shapes and masks:

```glsl
out vec4 fragColor;

uniform vec2 uCenter;
uniform float uRadius;

void main()
{
    vec2 uv = vUV.st - uCenter;
    // Correct for non-square aspect ratio so the circle isn't stretched.
    uv.x *= uTDOutputInfo.res.z / uTDOutputInfo.res.w;

    float dist = length(uv) - uRadius;
    float shape = smoothstep(0.01, 0.0, dist);
    fragColor = vec4(vec3(shape), 1.0);
}
```

As above, verify the exact `uTDOutputInfo.res` swizzle for the installed TD version before relying on the aspect-correction line; `textureSize` on an existing input sampler is a safer fallback if the built-in struct layout is in doubt.

## Passing CHOP Data via Uniforms

CHOP channels are a common way to drive a shader's custom uniforms in real time (audio-reactive effects, animated parameters, hand-authored envelopes). The mechanism is the same two-place sync as any custom uniform, with the value on the GLSL TOP's uniform parameter page referencing a CHOP channel export or a parameter expression that reads a CHOP, rather than a static number. From the shader's side nothing changes — it is still a plain `uniform float` (or `vec2`/`vec3`/`vec4` for multi-channel data) declaration; the live-updating behavior comes entirely from how the parameter page's value is wired, not from anything in the GLSL source. Confirm the wiring is live by reading the uniform's current value with `get_td_node_parameters` at two different times and checking it changed.

## Feedback With GLSL

A feedback loop (self-referencing accumulation — trails, cumulative displacement, cellular-automaton-style rules) is built by routing a Feedback TOP's output into the GLSL TOP as one of its inputs, and the GLSL TOP's output back into the Feedback TOP. The GLSL shader itself just samples the feedback input like any other:

```glsl
out vec4 fragColor;

void main()
{
    vec4 prev = texture(sTD2DInputs[0], vUV.st);  // feedback input
    vec4 fresh = texture(sTD2DInputs[1], vUV.st);  // new frame

    fragColor = max(prev * 0.95, fresh);  // decay + accumulate
}
```

The decay/accumulate logic (the `0.95` factor and the `max` above) is where the visual character of the feedback effect lives — treat those as the primary parameters to expose as uniforms once the loop itself is wired and confirmed stable. An unstable feedback loop (runaway brightness, never decaying) is a shader logic issue, not a wiring issue, if the loop's topology (Feedback TOP → GLSL TOP → Feedback TOP) is correct.

## Compute Shaders

Compute mode on the GLSL TOP is for workgroup-parallel operations that don't map cleanly onto a per-pixel fragment pass — particle updates, arbitrary buffer scatter/gather, multi-pass algorithms that need explicit control over which invocations touch which data. A minimal compute shader skeleton looks conceptually like:

```glsl
layout(local_size_x = 16, local_size_y = 16) in;

void main()
{
    ivec2 texel = ivec2(gl_GlobalInvocationID.xy);
    // read, compute, write via TD's compute-mode output image binding
}
```

The `local_size_x`/`local_size_y` workgroup dimensions are a genuine design choice (matched to the problem's data shape, commonly a power of two like 8, 16, or 32) rather than a fixed constant to copy — an image-processing pass over a 2D texture typically uses a 2D workgroup shape that divides the texture dimensions reasonably evenly, while a 1D particle buffer typically uses a 1D workgroup.

The output image binding name and the exact declaration syntax for writing results in compute mode (as opposed to the pixel shader's `fragColor` output) are more version-sensitive than the pixel shader dialect above, since compute support was added to the GLSL TOP later and its conventions have moved. Do not assume a specific binding name from memory. Verify it by creating a glslTOP, switching it to compute mode, and reading either its default template shader text (via `execute_python_script`, e.g. `op('...').text`) or the compile error produced by an intentionally wrong binding name — either will reveal the actual expected declaration for the installed TD build. Official Derivative documentation for the GLSL TOP's compute mode is the fallback when the compile error alone doesn't resolve it.

## Debugging Techniques

The fastest way to debug GLSL logic inside TD is to output intermediate values as color rather than reasoning about them abstractly:

```glsl
// Temporarily replace the real output to inspect a value in isolation.
fragColor = vec4(vec3(someScalarValue), 1.0);      // visualize a scalar as grayscale
fragColor = vec4(someVec2Value, 0.0, 1.0);          // visualize a vec2 as red/green
fragColor = vec4(abs(someSignedValue) * vec3(1.0, 0.0, 0.0), 1.0);  // visualize sign via color
```

Swap the real `fragColor` assignment for one of these, check the result with `get_top_image`, then swap back once the value under inspection looks correct. This is far faster than trying to mentally trace vector math, especially for coordinate transforms, displacement vectors, and mask thresholds. Combine this with the SKILL.md compile-check loop: fix compile errors first (via `get_td_node_errors`), then use color-visualization to debug logic errors that compile cleanly but produce the wrong image.

Reported error line numbers are offset from the DAT's own line numbers because TD prepends injected declarations before the shader body — always match the reported error to its actual source line by content (a variable or function name), not by counting lines from the top of the DAT.

## Performance Notes

- **Texture fetch count matters more than arithmetic.** A `texture()` call is typically far more expensive than a handful of extra multiply/add operations. Prefer recomputing a value from data already sampled over issuing another `texture()` call, especially inside a loop.
- **Avoid data-dependent branching where possible.** Divergent branches (an `if` whose condition varies per-pixel) can cost more than they seem to on some GPU architectures, because neighboring pixels may execute both branches. For simple two-way blends, prefer `mix()` or `step()`/`smoothstep()` over an `if`/`else`, since these are typically branchless.
- **Avoid unbounded or large fixed loops in a per-pixel shader.** A loop that samples many times per pixel (a wide blur, a many-tap convolution) scales its cost with the tap count multiplied by every pixel in the output — consider a multi-pass approach (e.g. a separable blur, horizontal pass then vertical pass) instead of a single dense loop.
- **Resolution matters more than shader complexity for overall cost.** Since the shader runs once per pixel, halving a TOP's resolution roughly quarters the shader's total cost. When performance is tight, check whether the effect needs to run at full output resolution before optimizing shader math.
