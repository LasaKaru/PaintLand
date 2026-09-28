import * as TSL from 'three/tsl';

/**
 * TSL, loosely typed. The node typings are stricter than the node system
 * (swizzles on array elements, chaining on reference nodes), so the WebGPU
 * files build nodes through this handle.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const T: any = TSL;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type N = any;
const { wgsl, wgslFn } = TSL;

/**
 * WGSL helpers for the WebGPU renderer. The shaders are hand translations of
 * the GLSL in render/PaintMaterial.ts, render/SkyWater.ts, render/Particles.ts
 * and render/shaders.ts: change a look in both places.
 *
 * Differences from the GLSL that the translations take care of:
 * - Render targets are stored top row first (WebGPU's framebuffer y points
 *   down). Screen passes work in GL-style uv (y up) and sample through
 *   ink_tex / ink_load. (TSL's dFdy already has GLSL's sign.)
 * - GLSL mod() floors; WGSL % truncates. ink_mod() is GLSL's mod.
 * - Samples use textureSampleLevel(…, 0.0) (the targets have no mipmaps), which
 *   WGSL allows in any control flow.
 */

/** A tiny preprocessor: `#if NAME`, `#if !NAME`, `#else`, `#endif` on their own lines. */
export function preprocess(src: string, flags: Record<string, boolean>): string {
  const out: string[] = [];
  const stack: { on: boolean; taken: boolean }[] = [];
  const active = (): boolean => stack.every((s) => s.on);
  for (const line of src.split('\n')) {
    const t = line.trim();
    const m = /^#if\s+(!?)(\w+)$/.exec(t);
    if (m) {
      const v = !!flags[m[2]] !== (m[1] === '!');
      stack.push({ on: v, taken: v });
      continue;
    }
    if (t === '#else') {
      const top = stack[stack.length - 1];
      if (!top) throw new Error('#else without #if');
      top.on = !top.taken;
      continue;
    }
    if (t === '#endif') {
      if (!stack.pop()) throw new Error('#endif without #if');
      continue;
    }
    if (active()) out.push(line);
  }
  if (stack.length) throw new Error('unclosed #if');
  return out.join('\n');
}

export const NOISE = /* wgsl */ `
fn ink_mod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn ink_hash21(p0: vec2f) -> f32 {
  var p = fract(p0 * vec2f(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
fn ink_vnoise(p: vec2f) -> f32 {
  let i = floor(p);
  var f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  let a = ink_hash21(i);
  let b = ink_hash21(i + vec2f(1.0, 0.0));
  let c = ink_hash21(i + vec2f(0.0, 1.0));
  let d = ink_hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
fn ink_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }
// smoothstep with the edges in either order (GLSL code here uses falling edges).
fn ink_ss(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
`;

/** fbm with the sky/water's five octaves (render/SkyWater.ts). */
export const FBM5 = /* wgsl */ `
fn ink_fbm5(p0: vec2f) -> f32 {
  var p = p0;
  var v = 0.0;
  var a = 0.5;
  for (var i = 0; i < 5; i++) { v += a * ink_vnoise(p); p = p * 2.07 + 11.3; a *= 0.5; }
  return v;
}
`;

/** fbm with the post passes' four octaves (render/shaders.ts). */
export const FBM4 = /* wgsl */ `
fn ink_fbm4(p0: vec2f) -> f32 {
  var p = p0;
  var v = 0.0;
  var a = 0.5;
  for (var i = 0; i < 4; i++) { v += a * ink_vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
`;

const cache = new Map<string, N>();
/** One shared code node per snippet, so each helper is emitted once per shader. */
export function lib(src: string): N {
  let n = cache.get(src);
  if (!n) {
    n = wgsl(src);
    cache.set(src, n);
  }
  return n;
}

/** A WGSL function node with the given helper snippets available to it. */
export function fn(src: string, helpers: string[] = []): N {
  return wgslFn(src, helpers.map(lib));
}

/** MRT only into the G-buffer (textures named output + gnormal); anything else gets plain colour. */
export function gbufferMrt(builder: unknown, outputs: Record<string, unknown>): N {
  const rt = (builder as { renderer: { getRenderTarget(): { textures?: { name: string }[] } | null } }).renderer.getRenderTarget();
  return rt?.textures?.some((t) => t.name === 'gnormal') ? T.mrt(outputs) : null;
}

/**
 * Frame-wide uniforms (sun, time of day, weather…) live in one shared buffer.
 * Per-object uniform buffers aren't safe for them: three clones those
 * shallowly, so a value that is the same on every object and then changes is
 * only re-uploaded for the first object drawn. The pipeline marks this group
 * changed once per frame (markFrameUniforms).
 */
export const frameGroup: N = T.sharedUniformGroup('inkFrame');
export function markFrameUniforms(): void {
  frameGroup.needsUpdate = true;
}
/** A frame-wide uniform: vectors and colours by reference, numbers read from `{ value }` each render. */
export function frameUniform(holder: { value: unknown }, type?: string): N {
  const v = holder.value;
  if (typeof v === 'number') return T.uniform(v).setGroup(frameGroup).onRenderUpdate(() => holder.value);
  return T.uniform(v, type).setGroup(frameGroup);
}
