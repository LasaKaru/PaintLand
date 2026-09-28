/** WGSL translations of the sky, sea and galaxy shaders in render/SkyWater.ts. Keep them in step. */

export const SKY = /* wgsl */ `
fn ink_sky(dir: vec3f, top: vec3f, horizon: vec3f, sunDirW: vec3f, sunColor: vec3f, cloudLit: vec3f, cloudShade: vec3f,
  night: f32, time: f32, cloudCover: f32, realism: f32, flash: f32) -> vec4f {
  let d = normalize(dir);
  let h = clamp(d.y, -0.2, 1.0);
  let sd = max(dot(d, sunDirW), 0.0);
  var paint = mix(horizon, top, smoothstep(-0.02, 0.32, h));
  paint *= 0.97 + 0.03 * smoothstep(0.4, 0.6, fract(h * 5.0 + ink_fbm5(d.xz * 3.0) * 0.6));
  paint = mix(paint, sunColor, smoothstep(0.9975, 0.999, sd) * (1.0 - night * 0.3));
  paint += sunColor * pow(sd, 18.0) * 0.18;
  let zenith = top * vec3f(0.78, 0.88, 1.0);
  var real = mix(horizon * 1.04, zenith, pow(smoothstep(-0.03, 0.85, h), 0.55));
  real = mix(real, horizon * 0.8 + sunColor * 0.2, (1.0 - smoothstep(0.0, 0.12, abs(h))) * 0.35);
  real += sunColor * (pow(sd, 6.0) * 0.18 + pow(sd, 48.0) * 0.45) * (1.0 - night * 0.7);
  real += sunColor * smoothstep(0.9993, 0.9997, sd) * 5.0 * (1.0 - night * 0.85);
  var col = mix(paint, real, realism);

  let p = d.xz / max(d.y + 0.08, 0.05) * 0.9 + vec2f(time * 0.004, 0.0);
  let c = ink_fbm5(p * 0.8);
  let lo = 0.62 - cloudCover * 0.25;
  let hi = 0.8 - cloudCover * 0.2;
  let cover = smoothstep(lo, mix(hi, hi + 0.12, realism), c);
  let fade = smoothstep(0.0, 0.18, d.y);
  let shade = smoothstep(0.35, 0.9, ink_fbm5(p * 0.8 + vec2f(0.06, 0.09)));
  let cloudPaint = mix(cloudLit, cloudShade, shade * 0.8);
  let toSun = normalize(sunDirW.xz + 1e-4) * 0.08;
  let sunward = ink_fbm5(p * 0.8 + toSun) - c;
  let thick = smoothstep(lo, hi + 0.25, c);
  var cloudReal = mix(cloudLit * 1.08, cloudShade * 0.82, thick * 0.75);
  cloudReal *= 1.0 - clamp(sunward * 2.5, -0.25, 0.35);
  cloudReal += sunColor * pow(sd, 10.0) * (1.0 - thick) * 0.9;
  cloudReal = mix(cloudReal, cloudReal * 0.55, smoothstep(0.6, 1.0, cloudCover) * thick);
  col = mix(col, mix(cloudPaint, cloudReal, realism), cover * fade);
  let rim = ink_ss(0.02, 0.0, abs(c - (0.66 - cloudCover * 0.22))) * fade;
  col = mix(col, cloudShade * 0.8, rim * 0.35 * (1.0 - realism));
  col += vec3f(0.85, 0.9, 1.0) * flash * (0.6 + cover);

  let sp = d.xz / max(d.y, 0.1) * 60.0;
  let star = step(0.996, ink_hash21(floor(sp))) * night * smoothstep(0.1, 0.4, d.y);
  col += vec3f(star);
  return vec4f(col, star * 0.6);
}
`;

export const SEA_LIB = /* wgsl */ `
fn ink_waves(p: vec2f, time: f32) -> f32 {
  return ink_fbm5(p * 0.045 + vec2f(time * 0.05, time * 0.03)) * 1.2 + ink_vnoise(p * 0.35 + vec2f(-time * 0.4, time * 0.25)) * 0.22;
}
`;

export const SEA = /* wgsl */ `
fn ink_sea(world: vec3f, camPos: vec3f, deep: vec3f, shallow: vec3f, foam: vec3f, sunDirW: vec3f, sunColor: vec3f,
  time: f32, night: f32, rain: f32, realism: f32, top: vec3f, horizon: vec3f) -> vec4f {
  let p = world.xz;
  let dist = length(world - camPos);
  let n = ink_fbm5(p * 0.004 + time * 0.01);
  var col = mix(deep, shallow, smoothstep(0.35, 0.75, n));

  let f = ink_fbm5(p * 0.02 + vec2f(time * 0.03, time * 0.017)) * 7.0;
  let w = max(fwidth(f), 1e-5);
  let dLine = abs(fract(f + 0.5) - 0.5);
  var lines = 1.0 - smoothstep(w * 0.7, w * 1.8, dLine);
  lines *= step(0.42, ink_vnoise(p * 0.06 + 3.0));
  let lineFade = 1.0 - smoothstep(120.0, 700.0, dist);
  col = mix(col, foam, lines * 0.65 * lineFade);

  if (rain > 0.0) {
    let cell = floor(p * 0.25);
    let fp = fract(p * 0.25) - 0.5;
    let t = fract(time * 0.8 + ink_vnoise(cell * 3.1) * 7.0);
    let ring = 1.0 - smoothstep(0.0, 0.04, abs(length(fp) - t * 0.45));
    col = mix(col, foam, ring * (1.0 - t) * rain * 0.6 * lineFade);
  }

  let v = normalize(camPos - world);
  let r = reflect(-sunDirW, vec3f(0.0, 1.0, 0.0));
  let glint = pow(max(dot(r, v), 0.0), 60.0);
  let sparkle = step(0.8, ink_vnoise(p * 0.6 + time * 0.5));
  col += sunColor * glint * sparkle * 0.8 * (1.0 - night);
  col *= mix(1.0, 0.45, night);

  var bright = 0.0;
  if (realism > 0.001) {
    let e = 0.6;
    let h0 = ink_waves(p, time);
    let grad = vec2f(ink_waves(p + vec2f(e, 0.0), time) - h0, ink_waves(p + vec2f(0.0, e), time) - h0) / e;
    let strength = mix(2.2, 0.35, smoothstep(40.0, 900.0, dist)) * (1.0 + rain * 0.8);
    let N = normalize(vec3f(-grad.x * strength, 1.0, -grad.y * strength));
    let V = normalize(camPos - world);
    let fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    let R = reflect(-V, N);
    let sky = mix(horizon, top * vec3f(0.8, 0.9, 1.0), smoothstep(0.0, 0.6, R.y));
    let body = mix(deep * 0.55, shallow * 0.7, smoothstep(0.3, 0.8, n)) * (0.85 + 0.3 * h0);
    var real = mix(body, sky, clamp(fres * 1.15, 0.0, 1.0));
    let sunSpec = pow(max(dot(R, sunDirW), 0.0), 900.0) * 14.0 + pow(max(dot(R, sunDirW), 0.0), 60.0) * 0.35;
    real += sunColor * sunSpec * (1.0 - night * 0.8);
    real = mix(real, foam, smoothstep(0.93, 1.1, h0) * 0.35 * (1.0 - smoothstep(80.0, 500.0, dist)));
    real *= mix(1.0, 0.4, night);
    col = mix(col, real, realism);
    bright = min(1.0, sunSpec * 0.08) * realism;
  }
  return vec4f(col, max(glint * sparkle * 0.3 * (1.0 - realism), bright));
}
`;

export const GALAXY_LIB = /* wgsl */ `
fn ink_hash31(p0: vec3f) -> f32 {
  var p = fract(p0 * vec3f(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
fn ink_fbm3(p: vec3f) -> f32 { return ink_fbm5(p.xy * 1.3 + p.z * 0.7) * 0.6 + ink_fbm5(p.yz * 1.7 - p.x * 0.5) * 0.4; }
fn ink_stars(d: vec3f, scale: f32, thresh: f32, size: f32, time: f32) -> f32 {
  let p = d * scale;
  let cell = floor(p);
  let h = ink_hash31(cell);
  if (h < thresh) { return 0.0; }
  let centre = cell + 0.5 + (vec3f(ink_hash31(cell + 1.3), ink_hash31(cell + 2.7), ink_hash31(cell + 5.1)) - 0.5) * 0.6;
  let dist = length(p - centre);
  let twinkle = 0.7 + 0.3 * sin(time * (1.0 + h * 3.0) + h * 40.0);
  let glow = ink_ss(size, 0.0, dist) * 0.5 + ink_ss(size * 0.35, 0.0, dist);
  return glow * twinkle * (0.4 + 0.6 * (h - thresh) / (1.0 - thresh));
}
`;

export const GALAXY = /* wgsl */ `
fn ink_galaxy(dir: vec3f, time: f32) -> vec4f {
  let d = normalize(dir);
  var col = mix(vec3f(0.05, 0.04, 0.13), vec3f(0.16, 0.09, 0.26), ink_ss(0.6, -0.1, d.y));
  col = mix(col, vec3f(0.03, 0.03, 0.09), ink_ss(-0.1, -0.8, d.y));
  let nb = normalize(vec3f(0.35, 0.55, 0.76));
  let b = dot(d, nb);
  let band = exp(-b * b / 0.018);
  let core = exp(-pow(length(d - normalize(vec3f(-0.6, 0.35, -0.72))), 2.0) / 0.35);
  let clouds = ink_fbm3(d * 3.0);
  let dust = smoothstep(0.45, 0.75, ink_fbm3(d * 7.0 + 3.0)) * exp(-b * b / 0.004);
  let glow = mix(vec3f(0.55, 0.45, 0.85), vec3f(1.0, 0.82, 0.62), core);
  col += glow * band * (0.35 + 0.8 * clouds) * (0.7 + core * 1.1);
  col *= 1.0 - dust * 0.55 * band;
  let neb = ink_fbm3(d * 2.2 + 7.0);
  col += vec3f(0.85, 0.3, 0.55) * smoothstep(0.55, 0.85, neb) * 0.22 * (0.4 + band);
  col += vec3f(0.2, 0.7, 0.75) * smoothstep(0.6, 0.9, ink_fbm3(d * 2.6 - 4.0)) * 0.16 * (0.3 + band);
  var s = ink_stars(d, 80.0, 0.9, 0.42, time) * 0.9 + ink_stars(d, 45.0, 0.94, 0.4, time) * 1.3 + ink_stars(d, 22.0, 0.975, 0.3, time) * 2.0;
  s += ink_stars(d, 120.0, 0.8, 0.45, time) * band * 1.2;
  let starCol = mix(vec3f(0.8, 0.88, 1.0), vec3f(1.0, 0.9, 0.75), ink_hash31(floor(d * 90.0)));
  col += starCol * s;
  let pd = normalize(vec3f(0.55, 0.12, 0.83));
  let pa = acos(clamp(dot(d, pd), -1.0, 1.0));
  let planet = ink_ss(0.075, 0.072, pa);
  let litDir = normalize(vec3f(-0.6, 0.5, 0.2));
  let local = normalize(d - pd * dot(d, pd) + 1e-5);
  let shade = clamp(0.55 + dot(local, litDir) * 0.6 * (pa / 0.075), 0.3, 1.1);
  let planetCol = mix(vec3f(0.93, 0.7, 0.55), vec3f(0.8, 0.5, 0.6), 0.5 + 0.5 * sin(dot(d, vec3f(0.0, 60.0, 10.0))));
  col = mix(col, planetCol * shade, planet);
  let ringN = normalize(vec3f(0.15, 0.95, -0.25));
  let ringR = pa / 0.075;
  let onRing = ink_ss(0.012, 0.0, abs(dot(d - pd, ringN))) * step(1.25, ringR) * step(ringR, 2.1);
  col = mix(col, vec3f(0.95, 0.85, 0.7) * (0.6 + 0.4 * sin(ringR * 40.0)), onRing * (1.0 - planet * step(dot(d - pd, ringN), 0.0)) * 0.8);
  let period = 9.0;
  let k = floor(time / period);
  let ft = fract(time / period);
  let a0 = normalize(vec3f(ink_hash21(vec2f(k, 1.0)) - 0.5, 0.35 + ink_hash21(vec2f(k, 2.0)) * 0.4, ink_hash21(vec2f(k, 3.0)) - 0.5));
  let dirS = normalize(cross(a0, vec3f(0.0, 1.0, 0.0)));
  let head = normalize(a0 + dirS * ft * 0.5);
  let toD = d - head;
  let along = dot(toD, -dirS);
  let across = length(toD + dirS * along);
  let trail = ink_ss(0.004, 0.0, across) * ink_ss(0.18, 0.0, along) * step(0.0, along) * ink_ss(0.35, 0.0, ft) * step(ft, 0.35);
  col += vec3f(1.0, 0.95, 0.85) * trail;
  return vec4f(col, clamp(s * 0.8 + trail + band * core * 0.3, 0.0, 1.0));
}
`;

/** Particles (render/Particles.ts): a lit, round puff with a screen-door fade. */
export const PARTICLE_LIB = /* wgsl */ `
fn ink_particleHash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453); }
fn ink_particleNormal(corner: vec2f) -> vec3f {
  let r = dot(corner, corner);
  return normalize(vec3f(corner.x, corner.y, sqrt(max(0.0, 1.0 - r))));
}
`;

export const PARTICLE = /* wgsl */ `
fn ink_particle(corner: vec2f, colour: vec4f, fade: f32, frag: vec2f, sunDir: vec3f, sunColor: vec3f, skyTint: vec3f, realism: f32) -> vec4f {
  let r = dot(corner, corner);
  if (r > 1.0) { discard; }
  if (ink_particleHash(frag) > fade * (1.0 - r * 0.55)) { discard; }
  let lit = 0.6 + 0.4 * max(dot(ink_particleNormal(corner), sunDir), 0.0);
  var col = colour.rgb * mix(skyTint * 0.35 + 0.7, sunColor, lit * 0.5) * mix(1.0, lit + 0.2, realism);
  col = mix(col, colour.rgb * 1.6, colour.a);
  return vec4f(col, colour.a);
}
`;
