/**
 * WGSL translations of the screen passes in render/shaders.ts. Keep them in step.
 *
 * Every pass receives the quad's uv (WebGPU: y down) and works in GL-style uv
 * (y up) so the maths match the GLSL; ink_tex / ink_load flip back to sample.
 */

export const POST_LIB = /* wgsl */ `
fn ink_gl(uvIn: vec2f) -> vec2f { return vec2f(uvIn.x, 1.0 - uvIn.y); }
fn ink_tex(t: texture_2d<f32>, s: sampler, uv: vec2f) -> vec4f {
  return textureSampleLevel(t, s, vec2f(uv.x, 1.0 - uv.y), 0.0);
}
fn ink_texel(size: vec2u, uv: vec2f) -> vec2i {
  let d = vec2f(size);
  return clamp(vec2i(floor(vec2f(uv.x, 1.0 - uv.y) * d)), vec2i(0), vec2i(size) - 1);
}
fn ink_load(t: texture_2d<f32>, uv: vec2f) -> vec4f { return textureLoad(t, ink_texel(textureDimensions(t), uv), 0); }
fn ink_viewDepth(t: texture_depth_2d, uv: vec2f, near: f32, far: f32) -> f32 {
  let d = textureLoad(t, ink_texel(textureDimensions(t), uv), 0);
  return (near * far) / ((far - near) * d - far) * -1.0;
}
`;

export const KUWAHARA = /* wgsl */ `
fn ink_kuwahara(tColor: texture_2d<f32>, sColor: sampler, uvIn: vec2f, texel: vec2f, radius: f32) -> vec4f {
  let uv = ink_gl(uvIn);
  var m: array<vec3f, 4>;
  var s: array<vec3f, 4>;
  for (var k = 0; k < 4; k++) { m[k] = vec3f(0.0); s[k] = vec3f(0.0); }
  var n = 0.0;
  let rad = i32(radius + 0.5);
  for (var j = 0; j <= 6; j++) {
    if (j > rad) { break; }
    for (var i = 0; i <= 6; i++) {
      if (i > rad) { break; }
      let fi = f32(i);
      let fj = f32(j);
      let c0 = ink_tex(tColor, sColor, uv + vec2f(-fi, -fj) * texel).rgb;
      let c1 = ink_tex(tColor, sColor, uv + vec2f(fi, -fj) * texel).rgb;
      let c2 = ink_tex(tColor, sColor, uv + vec2f(fi, fj) * texel).rgb;
      let c3 = ink_tex(tColor, sColor, uv + vec2f(-fi, fj) * texel).rgb;
      m[0] += c0; s[0] += c0 * c0;
      m[1] += c1; s[1] += c1 * c1;
      m[2] += c2; s[2] += c2 * c2;
      m[3] += c3; s[3] += c3 * c3;
      n += 1.0;
    }
  }
  var best = 1e9;
  let centre = ink_tex(tColor, sColor, uv);
  var result = centre.rgb;
  for (var k = 0; k < 4; k++) {
    let mean = m[k] / n;
    let v = abs(s[k] / n - mean * mean);
    let sigma = v.r + v.g + v.b;
    if (sigma < best) { best = sigma; result = mean; }
  }
  return vec4f(result, centre.a);
}
`;

export const BRIGHT = /* wgsl */ `
fn ink_bright(tColor: texture_2d<f32>, sColor: sampler, uvIn: vec2f, hdrBloom: f32) -> vec4f {
  let c = ink_tex(tColor, sColor, ink_gl(uvIn));
  let over = max(c.rgb - vec3f(1.0), vec3f(0.0));
  return vec4f(c.rgb * c.a + over * hdrBloom, 1.0);
}
`;

export const SSAO = /* wgsl */ `
fn ink_ssao(tNormal: texture_2d<f32>, tDepth: texture_depth_2d, uvIn: vec2f, frag: vec2f, projScale: vec2f,
  radius: f32, samples: f32, intensity: f32, near: f32, far: f32) -> vec4f {
  let uv = ink_gl(uvIn);
  var N = ink_load(tNormal, uv).xyz * 2.0 - 1.0;
  let depth = ink_viewDepth(tDepth, uv, near, far);
  if (length(N) < 0.1 || depth > 320.0) { return vec4f(1.0); }
  N = normalize(N);
  let P = vec3f((uv * 2.0 - 1.0) / projScale * depth, -depth);
  let Tn = normalize(cross(select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(N.y) < 0.99), N));
  let B = cross(N, Tn);
  let fc = floor(frag);
  let cell = vec2f(ink_mod(fc.x, 4.0), ink_mod(fc.y, 4.0));
  let spin = (cell.x * 4.0 + cell.y + fract(sin(dot(floor(frag / 4.0), vec2f(12.9898, 78.233))) * 43758.5453) * 0.5) * (6.2831 / 16.0) * 5.0;
  let r = radius * (1.0 + depth * 0.012);
  var occ = 0.0;
  let ns = i32(samples + 0.5);
  for (var i = 0; i < 16; i++) {
    if (i >= ns) { break; }
    let fi = (f32(i) + 0.5) / samples;
    let a = fi * 25.13 + spin;
    let rr = sqrt(fi);
    let h = vec3f(cos(a) * rr, sin(a) * rr, sqrt(max(0.0, 1.0 - rr * rr)));
    let sp = P + (Tn * h.x + B * h.y + N * h.z) * r * mix(0.25, 1.0, fi * fi);
    let suv = (sp.xy / -sp.z * projScale) * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) { continue; }
    let sd = ink_viewDepth(tDepth, suv, near, far);
    let range = smoothstep(0.0, 1.0, r / max(abs(depth - sd), 1e-3));
    occ += step(sd, -sp.z - 0.04 - depth * 0.002) * range;
  }
  var ao = 1.0 - occ / samples * intensity;
  ao = mix(ao, 1.0, smoothstep(180.0, 320.0, depth));
  return vec4f(vec3f(clamp(ao, 0.0, 1.0)), 1.0);
}
`;

export const AO_BLUR = /* wgsl */ `
fn ink_aoBlur(tAO: texture_2d<f32>, sAO: sampler, tDepth: texture_depth_2d, uvIn: vec2f, texel: vec2f, near: f32, far: f32) -> vec4f {
  let uv0 = ink_gl(uvIn);
  let dc = ink_viewDepth(tDepth, uv0, near, far);
  var sum = 0.0;
  var wsum = 0.0;
  for (var y = -2; y < 2; y++) {
    for (var x = -2; x < 2; x++) {
      let uv = uv0 + (vec2f(f32(x), f32(y)) + 0.5) * texel;
      let w = exp(-abs(ink_viewDepth(tDepth, uv, near, far) - dc) / (dc * 0.05 + 0.1));
      sum += ink_tex(tAO, sAO, uv).r * w;
      wsum += w;
    }
  }
  return vec4f(vec3f(sum / max(wsum, 1e-4)), 1.0);
}
`;

export const SHAFTS = /* wgsl */ `
fn ink_shafts(tColor: texture_2d<f32>, sColor: sampler, tNormal: texture_2d<f32>, uvIn: vec2f, sunUv: vec2f, aspect: f32) -> vec4f {
  let uv0 = ink_gl(uvIn);
  let delta = (sunUv - uv0) / 36.0;
  var uv = uv0;
  var decay = 1.0;
  var sum = 0.0;
  for (var i = 0; i < 36; i++) {
    uv += delta;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { break; }
    let n = ink_load(tNormal, uv).xyz * 2.0 - 1.0;
    let sky = step(length(n), 0.1);
    let nearSun = max(0.0, 1.0 - length((uv - sunUv) * vec2f(aspect, 1.0)) * 1.6);
    sum += sky * (0.15 + smoothstep(0.55, 1.0, ink_luma(ink_tex(tColor, sColor, uv).rgb)) + nearSun * nearSun * 1.5) * decay;
    decay *= 0.955;
  }
  return vec4f(vec3f(sum / 36.0), 1.0);
}
`;

export const BLUR = /* wgsl */ `
fn ink_blur(tInput: texture_2d<f32>, sInput: sampler, uvIn: vec2f, direction: vec2f) -> vec4f {
  let uv = ink_gl(uvIn);
  var sum = ink_tex(tInput, sInput, uv).rgb * 0.227;
  sum += ink_tex(tInput, sInput, uv + direction * 1.385).rgb * 0.316;
  sum += ink_tex(tInput, sInput, uv - direction * 1.385).rgb * 0.316;
  sum += ink_tex(tInput, sInput, uv + direction * 3.231).rgb * 0.070;
  sum += ink_tex(tInput, sInput, uv - direction * 3.231).rgb * 0.070;
  return vec4f(sum, 1.0);
}
`;

export const FINISH = /* wgsl */ `
fn ink_fxaa(tInput: texture_2d<f32>, sInput: sampler, uv: vec2f, resolution: vec2f) -> vec3f {
  let px = 1.0 / resolution;
  let rgbNW = ink_tex(tInput, sInput, uv + vec2f(-1.0, -1.0) * px).rgb;
  let rgbNE = ink_tex(tInput, sInput, uv + vec2f(1.0, -1.0) * px).rgb;
  let rgbSW = ink_tex(tInput, sInput, uv + vec2f(-1.0, 1.0) * px).rgb;
  let rgbSE = ink_tex(tInput, sInput, uv + vec2f(1.0, 1.0) * px).rgb;
  let rgbM = ink_tex(tInput, sInput, uv).rgb;
  let lNW = ink_luma(rgbNW);
  let lNE = ink_luma(rgbNE);
  let lSW = ink_luma(rgbSW);
  let lSE = ink_luma(rgbSE);
  let lM = ink_luma(rgbM);
  let lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  let lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  var dir = vec2f(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  let reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  let rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir * rcpMin, vec2f(-8.0), vec2f(8.0)) * px;
  let a = 0.5 * (ink_tex(tInput, sInput, uv + dir * (1.0 / 3.0 - 0.5)).rgb + ink_tex(tInput, sInput, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  let b = a * 0.5 + 0.25 * (ink_tex(tInput, sInput, uv - dir * 0.5).rgb + ink_tex(tInput, sInput, uv + dir * 0.5).rgb);
  let lB = ink_luma(b);
  return select(b, a, lB < lMin || lB > lMax);
}
`;

export const FINISH_MAIN = /* wgsl */ `
fn ink_finish(tInput: texture_2d<f32>, sInput: sampler, tBlur: texture_2d<f32>, tDepth: texture_depth_2d, uvIn: vec2f,
  resolution: vec2f, fxaa: f32, dofAmount: f32, focus: f32, near: f32, far: f32) -> vec4f {
  let uv = ink_gl(uvIn);
  var c = ink_tex(tInput, sInput, uv).rgb;
  if (fxaa > 0.5) { c = ink_fxaa(tInput, sInput, uv, resolution); }
  if (dofAmount > 0.001) {
    let d = ink_viewDepth(tDepth, uv, near, far);
    let coc = clamp(abs(d - focus) / (focus * 0.9 + 3.0), 0.0, 1.0) * dofAmount;
    c = mix(c, ink_tex(tBlur, sInput, uv).rgb, smoothstep(0.0, 1.0, coc));
  }
  return vec4f(c, 1.0);
}
`;

export const COMPOSITE_LIB = /* wgsl */ `
fn ink_daltonize(c: vec3f, mode: f32) -> vec3f {
  let toLms = mat3x3f(17.8824, 3.45565, 0.0299566, 43.5161, 27.1554, 0.184309, 4.11935, 3.86714, 1.46709);
  let toRgb = mat3x3f(0.0809444479, -0.0102485335, -0.000365296938, -0.130504409, 0.0540193266, -0.00412161469, 0.116721066, -0.113614708, 0.693511405);
  let lms = toLms * c;
  var sim = lms;
  if (mode < 1.5) { sim = vec3f(2.02344 * lms.y - 2.52581 * lms.z, lms.y, lms.z); }
  else if (mode < 2.5) { sim = vec3f(lms.x, 0.494207 * lms.x + 1.24827 * lms.z, lms.z); }
  else { sim = vec3f(lms.x, lms.y, -0.395913 * lms.x + 0.801109 * lms.y); }
  let err = c - toRgb * sim;
  let shift = vec3f(0.0, err.r * 0.7 + err.g, err.r * 0.7 + err.b);
  return clamp(c + shift, vec3f(0.0), vec3f(1.0));
}
// A LUT stored as a strip of blue slices (render/gpu/PipelineGPU.ts lutStrip); rows are data rows (no flip).
fn ink_lut(t: texture_2d<f32>, s: sampler, c: vec3f, n: f32) -> vec3f {
  let b = c.b * (n - 1.0);
  let z0 = floor(b);
  let z1 = min(z0 + 1.0, n - 1.0);
  let x = c.r * (n - 1.0) + 0.5;
  let v = (c.g * (n - 1.0) + 0.5) / n;
  let a = textureSampleLevel(t, s, vec2f((x + z0 * n) / (n * n), v), 0.0).rgb;
  let d = textureSampleLevel(t, s, vec2f((x + z1 * n) / (n * n), v), 0.0).rgb;
  return mix(a, d, b - z0);
}
fn ink_aces(x: vec3f) -> vec3f {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
}
fn ink_heightFog(ro: vec3f, rd: vec3f, dist: f32, density: f32) -> f32 {
  let falloff = 0.011;
  let a = density * exp(-falloff * max(ro.y, -20.0));
  let b = falloff * rd.y;
  var f = a * dist;
  if (abs(b) > 1e-4) { f = a * (1.0 - exp(-b * dist)) / b; }
  return 1.0 - exp(-max(f, 0.0));
}
// Edge strength at uv from depth, normals and object ids (see render/shaders.ts).
fn ink_edgeAt(tNormal: texture_2d<f32>, tDepth: texture_depth_2d, uv: vec2f, w: f32, resolution: vec2f, near: f32, far: f32) -> f32 {
  let px = w / resolution;
  let ox = vec2f(px.x, 0.0);
  let oy = vec2f(0.0, px.y);
  let dc = ink_viewDepth(tDepth, uv, near, far);
  let ic = 1.0 / dc;
  let il = 1.0 / ink_viewDepth(tDepth, uv - ox, near, far);
  let ir = 1.0 / ink_viewDepth(tDepth, uv + ox, near, far);
  let idn = 1.0 / ink_viewDepth(tDepth, uv - oy, near, far);
  let iu = 1.0 / ink_viewDepth(tDepth, uv + oy, near, far);
  let lap = (abs(il + ir - 2.0 * ic) + abs(idn + iu - 2.0 * ic)) / ic;
  var depthEdge = smoothstep(0.015, 0.05, lap);
  depthEdge *= 1.0 - smoothstep(350.0, 1100.0, dc);

  let nc = ink_load(tNormal, uv);
  let nl = ink_load(tNormal, uv - ox);
  let nr = ink_load(tNormal, uv + ox);
  let nd = ink_load(tNormal, uv - oy);
  let nu = ink_load(tNormal, uv + oy);
  let c = nc.xyz * 2.0 - 1.0;
  var normalEdge = max(max(1.0 - dot(c, nl.xyz * 2.0 - 1.0), 1.0 - dot(c, nr.xyz * 2.0 - 1.0)), max(1.0 - dot(c, nd.xyz * 2.0 - 1.0), 1.0 - dot(c, nu.xyz * 2.0 - 1.0)));
  normalEdge = smoothstep(0.25, 0.6, normalEdge);
  let skyNear = step(length(c), 0.1) + step(length(nl.xyz * 2.0 - 1.0), 0.1) + step(length(nr.xyz * 2.0 - 1.0), 0.1) + step(length(nd.xyz * 2.0 - 1.0), 0.1) + step(length(nu.xyz * 2.0 - 1.0), 0.1);
  if (skyNear > 0.0) { normalEdge = 0.0; }

  var idEdge = step(0.002, abs(nc.a - nl.a)) + step(0.002, abs(nc.a - nr.a)) + step(0.002, abs(nc.a - nd.a)) + step(0.002, abs(nc.a - nu.a));
  idEdge = clamp(idEdge, 0.0, 1.0);

  var e = max(depthEdge, max(normalEdge, idEdge));
  let dmin = min(dc, min(min(1.0 / il, 1.0 / ir), min(1.0 / idn, 1.0 / iu)));
  e *= mix(1.0, 0.25, smoothstep(80.0, 1200.0, dmin));
  return e;
}
`;

/**
 * The composite. Settings are packed in vec4s (the order is the pipeline's):
 * p0 ink, line weight, crispness, boil · p1 pencil, bleed mix, edge darkening, wet edges
 * p2 granulation, paper grain, border, border pulse · p3 glow, saturation, warmth, atmosphere
 * p4 rain, speed lines, splash, realism · p5 exposure, contrast, vignette, AO strength
 * p6 shaft strength, fog density, flash, colour-blind mode · p7 LUT mix, LUT size, time, boil seed
 * p8 resolution x, y, camera near, far
 */
export const COMPOSITE = /* wgsl */ `
fn ink_composite(
  tColor: texture_2d<f32>, sLin: sampler, tNormal: texture_2d<f32>, tDepth: texture_depth_2d, tPaint: texture_2d<f32>,
  tBloom: texture_2d<f32>, tPaper: texture_2d<f32>, sPaper: sampler, tAO: texture_2d<f32>, tShafts: texture_2d<f32>, tLut: texture_2d<f32>,
  uvIn: vec2f, p0: vec4f, p1: vec4f, p2: vec4f, p3: vec4f, p4: vec4f, p5: vec4f, p6: vec4f, p7: vec4f, p8: vec4f,
  fogColor: vec3f, inkColor: vec3f, pageColor: vec3f, sunColor: vec3f, sunDir: vec3f, projInv: mat4x4f, camWorld: mat4x4f
) -> vec4f {
  let inkStrength = p0.x; let lineWeight = p0.y; let lineCrispness = p0.z; let boilAmount = p0.w;
  let pencilLines = p1.x; let bleedMix = p1.y; let edgeDarkening = p1.z; let wetEdges = p1.w;
  let granulation = p2.x; let paperGrain = p2.y; let border = p2.z; let borderPulse = p2.w;
  let glow = p3.x; let saturation = p3.y; let warmth = p3.z; let atmosphere = p3.w;
  let rain = p4.x; let speedLines = p4.y; let splash = p4.z; let realism = p4.w;
  let exposure = p5.x; let contrast = p5.y; let vignette = p5.z; let aoStrength = p5.w;
  let shaftStrength = p6.x; let fogDensity = p6.y; let flash = p6.z; let cbMode = p6.w;
  let lutMix = p7.x; let lutSize = p7.y; let time = p7.z; let boilSeed = p7.w;
  let resolution = p8.xy; let near = p8.z; let far = p8.w;

  let uv = ink_gl(uvIn);
  let fragPx = uv * resolution;

  let boil = vec2f(ink_vnoise(fragPx / 38.0 + boilSeed * 7.1), ink_vnoise(fragPx / 38.0 + 13.7 + boilSeed * 3.3)) - 0.5;
  let inkUv = uv + boil * boilAmount * 2.2 / resolution;

  let wet = vec2f(ink_fbm4(uv * 6.0 + 3.1), ink_fbm4(uv * 6.0 + 9.4)) - 0.5;
  let paintUv = uv + wet * wetEdges * 5.0 / resolution;

  let wc = 1.0 - realism;
  let sharp = ink_tex(tColor, sLin, uv).rgb;
  let paint = ink_tex(tPaint, sLin, paintUv).rgb;
  var col = mix(sharp, paint, bleedMix * wc);

  let nrm = ink_load(tNormal, uv);
  let isSky = length(nrm.xyz * 2.0 - 1.0) < 0.1;
  let depth = ink_viewDepth(tDepth, uv, near, far);

  if (!isSky) { col *= mix(1.0, ink_tex(tAO, sLin, uv).r, aoStrength * mix(0.55, 1.0, realism)); }

  let t2 = 2.0 / resolution;
  let gx = ink_luma(ink_tex(tPaint, sLin, paintUv + vec2f(t2.x, 0.0)).rgb) - ink_luma(ink_tex(tPaint, sLin, paintUv - vec2f(t2.x, 0.0)).rgb);
  let gy = ink_luma(ink_tex(tPaint, sLin, paintUv + vec2f(0.0, t2.y)).rgb) - ink_luma(ink_tex(tPaint, sLin, paintUv - vec2f(0.0, t2.y)).rgb);
  let grad = length(vec2f(gx, gy));
  col *= 1.0 - edgeDarkening * wc * smoothstep(0.02, 0.18, grad) * 0.35;

  let paper = textureSampleLevel(tPaper, sPaper, fragPx / 512.0, 0.0).rgb;
  let grain = paper.r - 0.5;
  let pigment = 1.0 - ink_luma(col);
  col *= 1.0 - granulation * wc * grain * (0.35 + pigment) * 0.55;
  col *= 1.0 - granulation * wc * (ink_fbm4(uv * vec2f(3.0, 2.2) + 5.0) - 0.5) * 0.18;

  let vr = projInv * vec4f(uv * 2.0 - 1.0, 1.0, 1.0);
  let dirView = normalize(vr.xyz / vr.w);
  let ray = normalize(mat3x3f(camWorld[0].xyz, camWorld[1].xyz, camWorld[2].xyz) * dirView);
  let camPos = camWorld[3].xyz;
  let sunAmt = pow(max(dot(ray, sunDir), 0.0), 8.0);
  let inscatter = mix(fogColor, fogColor * 0.6 + sunColor * 0.5, sunAmt * 0.7);
  if (!isSky) {
    let fogW = clamp(1.0 - exp(-max(depth - 40.0, 0.0) * 0.0016 * atmosphere * fogDensity), 0.0, 0.85);
    let dist = depth / max(-dirView.z, 1e-3);
    let fogR = ink_heightFog(camPos, ray, dist, 0.0011 * atmosphere * fogDensity) * 0.92;
    col = mix(col, mix(fogColor, inscatter, realism), mix(fogW, fogR, realism));
  } else if (fogDensity > 1.5) {
    col = mix(col, inscatter, clamp((fogDensity - 1.5) * 0.25, 0.0, 0.8) * (1.0 - smoothstep(0.0, 0.35, ray.y)));
  }

  let crisp = mix(0.25, 1.0, lineCrispness);
  var ink = ink_edgeAt(tNormal, tDepth, inkUv, lineWeight, resolution, near, far);
  ink = smoothstep(0.5 - 0.5 * crisp, 0.5 + 0.5 * crisp, ink);
  let pencil = ink_edgeAt(tNormal, tDepth, uv + vec2f(1.6, -1.1) * lineWeight / resolution + boil * 3.0 / resolution, lineWeight * 0.7, resolution, near, far);
  col = mix(col, col * 0.62 + inkColor * 0.25, pencil * pencilLines * 0.6 * wc);
  col = mix(col, mix(inkColor, col * 0.35, realism), ink * inkStrength);

  col += ink_tex(tBloom, sLin, uv).rgb * glow * 0.9;
  col += ink_tex(tShafts, sLin, uv).r * shaftStrength * sunColor * mix(0.5, 1.0, realism);

  let l = ink_luma(col);
  col = mix(col, pageColor, smoothstep(0.82, 1.02, l) * 0.35 * wc);
  col *= mix(vec3f(1.0), paper * 1.08, paperGrain * 0.45 * wc);

  let tm = pow(ink_aces(pow(max(col, vec3f(0.0)), vec3f(2.2)) * exposure), vec3f(1.0 / 2.2));
  col = mix(col * exposure, tm, realism);

  col = mix(vec3f(ink_luma(col)), col, saturation);
  col += vec3f(0.06, 0.02, -0.05) * warmth;
  col = (col - 0.5) * contrast + 0.5;
  let vc = (uv - 0.5) * vec2f(resolution.x / resolution.y, 1.0);
  col *= 1.0 - vignette * mix(0.4, 1.0, realism) * smoothstep(0.35, 1.1, length(vc));

  if (rain > 0.0) {
    let rp = vec2f(uv.x * resolution.x / resolution.y + uv.y * 0.18, uv.y);
    let cell = vec2f(rp.x * 90.0, rp.y * 5.0 + time * 7.0);
    let h = ink_hash21(floor(cell));
    var streak = step(0.93, h) * smoothstep(0.0, 0.25, fract(cell.y)) * (1.0 - smoothstep(0.5, 1.0, fract(cell.y)));
    streak *= 1.0 - smoothstep(0.06, 0.2, abs(fract(cell.x) - 0.5));
    col = mix(col, vec3f(0.93, 0.95, 1.0), streak * mix(0.45, 0.22, realism) * rain);
    col *= 1.0 - 0.07 * rain;
  }

  if (speedLines > 0.0) {
    let c = (uv - 0.5) * vec2f(resolution.x / resolution.y, 1.0);
    let ang = atan2(c.y, c.x);
    let rad = length(c);
    let band = ink_hash21(vec2f(floor(ang * 70.0), floor(time * 14.0)));
    let line = step(0.82, band) * smoothstep(0.42, 0.78, rad);
    col = mix(col, vec3f(1.0), line * speedLines * 0.55 * (1.0 - 0.6 * realism));
  }

  col += vec3f(0.8, 0.85, 1.0) * flash * 0.35;

  if (lutMix > 0.001) {
    col = mix(col, ink_lut(tLut, sLin, clamp(col, vec3f(0.0), vec3f(1.0)), lutSize), lutMix);
  }

  col = mix(col, vec3f(0.62, 0.86, 0.88), splash * (0.6 + 0.4 * ink_fbm4(uv * 5.0 + time)));

  let fromEdge = min(uv, 1.0 - uv) * resolution / min(resolution.x, resolution.y);
  let d = min(fromEdge.x, fromEdge.y);
  let along = select(uv.x * 13.0, uv.y * 9.0, fromEdge.x < fromEdge.y);
  let tear = ink_fbm4(vec2f(along, d * 30.0) + 2.0) * 0.035;
  let bw = border * wc;
  let edge = bw * 0.035 + borderPulse * 0.08 * wc + tear * bw;
  let inside = smoothstep(edge, edge + 0.004, d);
  let rim = 1.0 - smoothstep(edge, edge + 0.03, d);
  col *= 1.0 - rim * 0.18 * bw;
  col = mix(pageColor * (0.97 + 0.06 * paper.r), col, inside);

  col = clamp(col, vec3f(0.0), vec3f(1.0));
  if (cbMode > 0.5) { col = ink_daltonize(col, cbMode); }
  return vec4f(col, 1.0);
}
`;
