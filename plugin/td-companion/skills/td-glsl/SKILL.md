---
name: td-glsl
description: This skill should be used when the user wants to write a shader, work with a GLSL TOP, build a pixel shader or compute shader in TouchDesigner, port GLSL code into a TD project, or diagnose shader compile errors in TD. Concrete triggers include "write a shader", "GLSL TOP", "pixel shader", "compute shader", "fragment shader in TouchDesigner", and shader compile errors reported by a GLSL TOP's Info DAT.
version: 0.1.0
---

# TouchDesigner GLSL

Write GLSL that compiles inside TouchDesigner's GLSL TOP on the first or second try, instead of guessing at desktop-GLSL conventions that TD doesn't use. TD wraps every pixel and compute shader in its own scaffolding, injects a specific set of uniforms and samplers, and rejects the boilerplate a general-purpose GLSL tutorial recommends. Most compile failures in TD shaders come from importing habits from Shadertoy or raw OpenGL rather than from GLSL itself.

## The TD GLSL Dialect

### Pixel shader skeleton

A GLSL TOP pixel shader is a fragment shader body, not a full shader source file. Write only this:

```glsl
out vec4 fragColor;

void main()
{
    vec4 color = texture(sTD2DInputs[0], vUV.st);
    fragColor = TDOutputSwizzle(color);
}
```

Do not write:

- `#version` — TD prepends its own version directive and extension pragmas before compiling.
- `in vec3 vUV;` or any other input/varying declaration for `vUV` — TD injects these automatically based on the TOP's inputs.

Declaring either of the above yourself collides with TD's injected code. The compile log reports these as `'#version' : must occur first in shader` and `'vUV' : redefinition`; the fix is almost always to delete a declaration you added rather than to add one.

A custom output variable name in place of `fragColor` *does* compile — verified in TD 2025.33070, `out vec4 myColor;` with `myColor = TDOutputSwizzle(...)` reports `Compiled Successfully`. Prefer `fragColor` because it is what TD's own examples use, not because the wrapper requires it; do not "fix" a working shader that uses another name.

Pass every final pixel color through `TDOutputSwizzle` before assigning it to `fragColor`. TouchDesigner uses this helper to map channels correctly for the destination texture format across Windows and macOS. Omitting it still compiles, so treat it as a correctness requirement rather than a compile-time one; TouchDesigner's compute-output helpers apply the equivalent conversion internally.

### Sampling inputs

Each TOP connected to the GLSL TOP's inputs becomes an entry in the `sTD2DInputs` sampler array, indexed in input order starting at 0. Sample with the built-in `vUV` varying, using its `.st` swizzle:

```glsl
vec4 a = texture(sTD2DInputs[0], vUV.st);
vec4 b = texture(sTD2DInputs[1], vUV.st);
```

`vUV` carries texture coordinates in the `[0, 1]` range for the current pixel; `.st` is the conventional swizzle for 2D texture lookups and is what TD's own example shaders use. Forgetting `.st` and passing `vUV` directly to `texture()` for a 2D sampler is a common type-mismatch error to watch for.

### Built-in uniforms

TD exposes rendering context through built-in uniform structs, the most commonly used being `uTDOutputInfo`, which carries information about the output resolution and related render state (for example a resolution-style member accessed as `uTDOutputInfo.res` in many TD versions). The exact member names and layout of these built-in structs have changed across TouchDesigner releases and are not something to assert from memory. Before relying on a specific member name, verify it directly against the current build: create a minimal test GLSL TOP referencing the guessed member and read its Info DAT (see the workflow below). Note the error only confirms the guess was wrong — it does *not* enumerate the valid fields. TD 2025.33070 reports exactly `'zzzNope' : no such field in structure 'anon@0'` and nothing more, so use it to reject a name, not to discover one. Derivative's own documentation for the GLSL TOP is the authoritative reference when compile errors alone aren't enough context.

### Custom uniforms

Do not declare a `uniform` and expect a value to appear from nowhere. Custom uniforms in TD must be declared two places in sync:

1. On the GLSL TOP node itself, on its Vectors/Uniforms parameter pages — add a uniform entry with a name and a value (or a CHOP/DAT reference driving that value).
2. In the shader source, as a matching `uniform` declaration, e.g. `uniform float uTime;`.

The uniform name in the shader must match the name configured on the parameter page exactly. A mismatch does not always produce a compile error — it can silently leave the uniform at its default (commonly zero), which is harder to debug than a compile failure. Use `get_td_node_parameters` on the GLSL TOP to confirm the uniform's configured name and current value when a uniform seems to have no effect.

## Workflow With MCP Tools

Building a GLSL effect in a live TD project is an edit-compile-check loop, not a one-shot write. Structure it as follows:

1. **Create the nodes.** Use `create_td_node` to add a `glslTOP` under the target parent, and a separate `textDAT` to hold the shader source (e.g. `{parentPath: "/project1", nodeType: "glslTOP", nodeName: "shader1"}` and `{parentPath: "/project1", nodeType: "textDAT", nodeName: "shader1_pixel"}`).
2. **Wire the DAT into the GLSL TOP.** Point the GLSL TOP's `pixeldat` parameter (verified in TD 2025.33070) at the text DAT's path via `update_td_node_parameters`. Related verified parameters on the same page: `glslversion`, `mode` (pixel vs. compute), `computedat` (compute-shader DAT), and `errorbehavior`.
3. **Write the shader source into the DAT.** Either call `update_td_node_parameters` on the text DAT's `text` property with the full shader body, or use `execute_python_script` to assign it directly, e.g. `op('/project1/shader1_pixel').text = '''...shader source...'''`. The `execute_python_script` route is convenient for multi-line shader text with embedded quotes.
4. **Attach an Info DAT — this is the only place compile errors are readable.** `get_td_node_errors` does **not** surface GLSL compile failures. Verified in TD 2025.33070: a glslTOP with a broken shader returns `""` from `op.errors()` (which is all `get_td_node_errors` reads, including a recursive check from the parent), and reports the failure through `op.warnings()` instead, as the single line `Warning: The GLSL Shader has compile errors (Use Info DAT to see details.)`. The `errorbehavior` parameter does not change this — its menu values (`showcheckerboard` / `showblack` / `showprevious`) only affect what the TOP displays.

   Create an `infoDAT` once and point it at the glslTOP, then read its text for the actual compile log:

   ```
   create_td_node({parentPath: "/project1", nodeType: "infoDAT", nodeName: "shader1_info"})
   update_td_node_parameters({nodePath: "/project1/shader1_info", properties: {op: "/project1/shader1"}})
   execute_python_script({script: "result = op('/project1/shader1_info').text"})
   ```

   A successful compile reports `Compiled Successfully`; a failure looks like:

   ```
   Pixel Shader Compile Results:
   ERROR: /project1/shader1_pixel:2: 'zzzNope' : no such field in structure 'anon@0'
   ```

   A failed compile leaves the TOP showing stale or black output, so calling `get_top_image` first is actively misleading — always read the Info DAT first, image second.
5. **Read the error line number directly against the DAT source — it maps 1:1.** The compile log cites `/<DAT path>:<line>`, and that line number is the DAT's own source line (verified: a bad token placed on line 5 of the DAT reports `:5`). Go straight to that line; there is no injected-declaration offset to compensate for.
6. **Fix and repeat.** Re-write the DAT text, re-read the Info DAT, and only call `get_top_image` for a visual check once the log says `Compiled Successfully`. Iterate this loop rather than writing a large shader in one pass — TD's dialect differences mean even experienced GLSL authors trip on the `#version`/`in` rules on a first draft.
7. **Confirm visually.** Once errors are clear, use `get_top_image` on the glslTOP (or a downstream node) to inspect the actual rendered result at a reasonable `maxSize`, and compare it against what the effect was meant to produce.

If uncertain what a given node type or family exposes beyond its parameters, `get_td_class_details` on the relevant class (e.g. `glslTOP`) surfaces its documented members and can shortcut trial-and-error before writing Python that touches the node programmatically.

## Common Mistakes

- **Using `gl_FragColor`.** This is a deprecated GLSL built-in and is not available in TD's GLSL TOP pipeline. Declare and write to `out vec4 fragColor;` instead.
- **Omitting `TDOutputSwizzle`.** Assign pixel-shader output as `fragColor = TDOutputSwizzle(color);`; direct assignment can put values in the wrong destination channels on another platform or texture format.
- **Writing a `#version` header.** TD injects its own; a second one causes a syntax error, since a `#version` directive is only valid on the very first line.
- **Forgetting `.st` on `vUV`.** `texture(sampler2D, vec2)` expects a 2-component vector; passing the raw `vUV` (which may carry more components) without swizzling can produce a type error or, worse, silently sample incorrectly.
- **Wrong sampler array indexing.** `sTD2DInputs` indices correspond to the GLSL TOP's input connections in order; reordering or removing an input connection shifts every subsequent index, so re-check indices after rewiring inputs.
- **Declaring uniforms that don't exist on the parameter page.** A `uniform` in the shader with no matching entry on the GLSL TOP's parameter pages does not error reliably — it can just read as zero. Always cross-check with `get_td_node_parameters`.
- **Assuming built-in struct members from memory or from other engines.** `uTDOutputInfo` and similar built-ins are TD-specific and version-dependent; verify member names against the Info DAT compile log or official docs rather than guessing from Unity/Unreal/Shadertoy conventions.

## Compute Shaders

The GLSL TOP also supports compute shader mode, used for workgroup-based parallel operations (e.g., particle simulation, custom filters operating over arbitrary buffer layouts) rather than per-pixel fragment output. Compute mode shifts the entry point, output mechanism, and workgroup declarations away from the pixel shader skeleton above, and its exact output-image binding syntax is version-sensitive enough to be worth verifying live rather than assuming. See the reference file for a starting skeleton and the verification approach for compute-specific details.

## Additional Resources

For multi-input sampling patterns, resolution-independent coordinate math, common effect recipes (color grading, UV displacement, cross-fades, generative noise, SDF shapes), passing CHOP data through uniforms, GLSL feedback loops, the compute shader skeleton, debugging-by-visualizing-intermediates, and performance guidance, see `references/glsl-top-reference.md`.
