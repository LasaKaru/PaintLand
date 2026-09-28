# The WebGPU renderer (beta)

Inkroads draws with **WebGL 2** by default. A second renderer, **WebGPU**, is
in the game as a beta. It draws the same watercolour picture with the newer
graphics API that Chrome, Edge and the Windows app support. WebGPU is also the
API mobile browsers are moving to.

## For players

**Settings → Graphics → Renderer → WebGPU (beta)**, then **Restart now**.

- If the browser has no WebGPU, the option is greyed out.
- If WebGPU fails to start, loses the GPU, or hits a shader error in the first
  minute, the game saves, notes why, and restarts with WebGL. The Settings
  screen then says why WebGPU was switched off. Choosing WebGPU again clears
  the note.
- For testing, add `?renderer=webgpu` or `?renderer=webgl` to the address.

## Is it faster?

**Not measured yet on real hardware.** WebGPU usually costs the CPU less per
draw call and can be faster on some graphics cards, but it can be slower on
others, and some drivers still have bugs. That's why it's opt-in.

The way to find out is the admin dashboard: **🩺 Crashes & speed → Renderer**
shows the average frame rate and slow minutes for WebGL and for WebGPU, from
real players. Errors from WebGPU players show `/webgpu` in the device list.
Make WebGPU the default only where it wins.

## What's the same

Everything that shows on screen:
- the painted materials (road paving, surface patterns, fabric prints, seasons,
  Colour the City wash, ghosts, livery pictures, headlights, lightning);
- toon and realistic lighting, and shadows;
- sky, clouds, stars, the sea, the World's End galaxy and particles;
- every screen pass: Kuwahara paint, ambient occlusion, glow, sun shafts, ink
  lines, paper, fog, grading and LUT looks, rain, speed lines, the torn border,
  colour-blind assist, FXAA and depth of field;
- adaptive resolution and the graphics tiers.

It was checked side by side against WebGL (in Chromium's software WebGPU):
- a Sketch street at noon, at night and in fog;
- night rain;
- a Serendib sunset;
- the realistic art style;
- Harbour Town;
- the World's End;
- particle puffs.

The pictures match.

## How it works (for developers)

- `src/render/Backend.ts`: the player's choice and the fallback. `src/main.ts`
  loads `src/render/gpu` with a dynamic `import()` only when WebGPU is chosen.
  WebGL players never download it (it's a separate ~220 KB gzipped chunk).
- The game keeps its materials. `PaintMaterial` and the sky, sea, galaxy and
  particle materials say which node material draws them (`material.type`).
  `renderer.library.addMaterial` maps each type to a node twin in
  `src/render/gpu/`. Per-material values are read from the original each draw
  (`materialReference`).
- The shaders are hand translations of the GLSL into WGSL:
  - `paintWgsl.ts`, `skyWgsl.ts` and `postWgsl.ts`;
  - the pipeline is in `PipelineGPU.ts`.

  **When you change a GLSL shader, change its WGSL twin too.**
  `tests/webgpu.test.ts` catches leftover GLSL and missing functions, but not
  a look that has drifted apart.
- Frame-wide uniforms (sun, time of day, weather) share one buffer that the
  pipeline marks changed each frame. Per-object uniform buffers go stale for
  values shared by every object (see `frameUniform` in `gpu/wgsl.ts`).
- The colour-grading LUT is a 2D strip on WebGPU (`gpu/lutStrip.ts`).
- Particles are instanced quads on WebGPU (it draws points one pixel wide).
- A compatibility shim drops three's `swizzle: 'rgba'` texture-view option,
  which some Chromium builds (141 among them) reject.

### Testing without a GPU

Chromium's software WebGPU (`--enable-unsafe-webgpu
--use-webgpu-adapter=swiftshader`) renders the game offscreen. In headless
containers it can't present to a canvas, so add `?gpuOffscreen` to the
address: the pipeline then draws into a render target, and
`window.__gpuSnapshot()` returns the frame as a PNG data URL. On a real
machine WebGPU draws to the canvas as normal.

**Not yet checked on a real GPU:**
- drawing to the canvas;
- photo mode saving and postcards (they read the canvas right after drawing,
  which WebGPU allows);
- the Windows app.

Try these on a real PC before telling players about the beta.
