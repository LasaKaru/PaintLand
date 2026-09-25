/**
 * Full-screen shaders for the watercolour pipeline (docs/03 §2).
 * All passes share the same vertex shader (a full-screen triangle from FullScreenQuad).
 */

export const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const noiseLib = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

/** Generalised 4-sector Kuwahara: flat colour becomes brush-like patches. */
export const kuwaharaFragment = /* glsl */ `
uniform sampler2D tColor;
uniform vec2 texel;
uniform int radius;
varying vec2 vUv;

void main() {
  vec3 m[4];
  vec3 s[4];
  for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }
  float n = 0.0;
  for (int j = 0; j <= 6; j++) {
    if (j > radius) break;
    for (int i = 0; i <= 6; i++) {
      if (i > radius) break;
      vec3 c0 = texture2D(tColor, vUv + vec2(-float(i), -float(j)) * texel).rgb;
      vec3 c1 = texture2D(tColor, vUv + vec2( float(i), -float(j)) * texel).rgb;
      vec3 c2 = texture2D(tColor, vUv + vec2( float(i),  float(j)) * texel).rgb;
      vec3 c3 = texture2D(tColor, vUv + vec2(-float(i),  float(j)) * texel).rgb;
      m[0] += c0; s[0] += c0 * c0;
      m[1] += c1; s[1] += c1 * c1;
      m[2] += c2; s[2] += c2 * c2;
      m[3] += c3; s[3] += c3 * c3;
      n += 1.0;
    }
  }
  float best = 1e9;
  vec3 result = texture2D(tColor, vUv).rgb;
  for (int k = 0; k < 4; k++) {
    vec3 mean = m[k] / n;
    vec3 v = abs(s[k] / n - mean * mean);
    float sigma = v.r + v.g + v.b;
    if (sigma < best) { best = sigma; result = mean; }
  }
  gl_FragColor = vec4(result, texture2D(tColor, vUv).a);
}
`;

/** Glow source: emissive pixels (alpha channel) plus, in the realistic look, anything brighter than white. */
export const brightFragment = /* glsl */ `
uniform sampler2D tColor;
uniform float hdrBloom;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  vec3 over = max(c.rgb - vec3(1.0), vec3(0.0));
  gl_FragColor = vec4(c.rgb * c.a + over * hdrBloom, 1.0);
}
`;

const depthLib = /* glsl */ `
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;
float viewDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).r;
  return (cameraNear * cameraFar) / ((cameraFar - cameraNear) * d - cameraFar) * -1.0;
}
`;

/** Screen-space ambient occlusion from depth + view normals (half resolution). */
export const ssaoFragment = /* glsl */ `
uniform sampler2D tNormal;
uniform vec2 projScale;
uniform float radius;
uniform int samples;
uniform float intensity;
varying vec2 vUv;
${depthLib}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 viewPos(vec2 uv, float d) { return vec3((uv * 2.0 - 1.0) / projScale * d, -d); }
void main() {
  vec3 N = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
  float depth = viewDepth(vUv);
  if (length(N) < 0.1 || depth > 320.0) { gl_FragColor = vec4(1.0); return; }
  N = normalize(N);
  vec3 P = viewPos(vUv, depth);
  vec3 T = normalize(cross(abs(N.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), N));
  vec3 B = cross(N, T);
  // 4x4 interleaved rotations: the 4x4 blur that follows cancels the pattern exactly.
  vec2 cell = mod(floor(gl_FragCoord.xy), 4.0);
  float spin = (cell.x * 4.0 + cell.y + hash(floor(gl_FragCoord.xy / 4.0)) * 0.5) * (6.2831 / 16.0) * 5.0;
  float r = radius * (1.0 + depth * 0.012);
  float occ = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= samples) break;
    float fi = (float(i) + 0.5) / float(samples);
    float a = fi * 25.13 + spin;
    float rr = sqrt(fi);
    vec3 h = vec3(cos(a) * rr, sin(a) * rr, sqrt(max(0.0, 1.0 - rr * rr)));
    vec3 sp = P + (T * h.x + B * h.y + N * h.z) * r * mix(0.25, 1.0, fi * fi);
    vec2 suv = (sp.xy / -sp.z * projScale) * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
    float sd = viewDepth(suv);
    float range = smoothstep(0.0, 1.0, r / max(abs(depth - sd), 1e-3));
    occ += step(sd, -sp.z - 0.04 - depth * 0.002) * range;
  }
  float ao = 1.0 - occ / float(samples) * intensity;
  ao = mix(ao, 1.0, smoothstep(180.0, 320.0, depth));
  gl_FragColor = vec4(vec3(clamp(ao, 0.0, 1.0)), 1.0);
}
`;

/** Depth-aware 4x4 blur for the occlusion buffer (no halos around silhouettes). */
export const aoBlurFragment = /* glsl */ `
uniform sampler2D tAO;
uniform vec2 texel;
varying vec2 vUv;
${depthLib}
void main() {
  float dc = viewDepth(vUv);
  float sum = 0.0;
  float wsum = 0.0;
  for (int y = -2; y < 2; y++) {
    for (int x = -2; x < 2; x++) {
      vec2 uv = vUv + (vec2(float(x), float(y)) + 0.5) * texel;
      float w = exp(-abs(viewDepth(uv) - dc) / (dc * 0.05 + 0.1));
      sum += texture2D(tAO, uv).r * w;
      wsum += w;
    }
  }
  gl_FragColor = vec4(vec3(sum / max(wsum, 1e-4)), 1.0);
}
`;

/** Crepuscular rays: march from each pixel toward the sun through the sky mask (quarter resolution). */
export const shaftsFragment = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform vec2 sunUv;
uniform float aspect;
varying vec2 vUv;
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 delta = (sunUv - vUv) / 36.0;
  vec2 uv = vUv;
  float decay = 1.0;
  float sum = 0.0;
  for (int i = 0; i < 36; i++) {
    uv += delta;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
    vec3 n = texture2D(tNormal, uv).xyz * 2.0 - 1.0;
    float sky = step(length(n), 0.1);
    float near = max(0.0, 1.0 - length((uv - sunUv) * vec2(aspect, 1.0)) * 1.6);
    sum += sky * (0.15 + smoothstep(0.55, 1.0, luma(texture2D(tColor, uv).rgb)) + near * near * 1.5) * decay;
    decay *= 0.955;
  }
  gl_FragColor = vec4(vec3(sum / 36.0), 1.0);
}
`;

/** Final pass: FXAA and depth of field. */
export const finishFragment = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform vec2 resolution;
uniform float fxaa;
uniform float dofAmount;
uniform float focus;
varying vec2 vUv;
${depthLib}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 fxaaSample(vec2 uv) {
  vec2 px = 1.0 / resolution;
  vec3 rgbNW = texture2D(tInput, uv + vec2(-1.0, -1.0) * px).rgb;
  vec3 rgbNE = texture2D(tInput, uv + vec2(1.0, -1.0) * px).rgb;
  vec3 rgbSW = texture2D(tInput, uv + vec2(-1.0, 1.0) * px).rgb;
  vec3 rgbSE = texture2D(tInput, uv + vec2(1.0, 1.0) * px).rgb;
  vec3 rgbM = texture2D(tInput, uv).rgb;
  float lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE), lM = luma(rgbM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir * rcpMin, vec2(-8.0), vec2(8.0)) * px;
  vec3 a = 0.5 * (texture2D(tInput, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tInput, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tInput, uv - dir * 0.5).rgb + texture2D(tInput, uv + dir * 0.5).rgb);
  float lB = luma(b);
  return (lB < lMin || lB > lMax) ? a : b;
}
void main() {
  vec3 c = fxaa > 0.5 ? fxaaSample(vUv) : texture2D(tInput, vUv).rgb;
  if (dofAmount > 0.001) {
    float d = viewDepth(vUv);
    float coc = clamp(abs(d - focus) / (focus * 0.9 + 3.0), 0.0, 1.0) * dofAmount;
    c = mix(c, texture2D(tBlur, vUv).rgb, smoothstep(0.0, 1.0, coc));
  }
  gl_FragColor = vec4(c, 1.0);
}
`;

export const blurFragment = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 direction;
varying vec2 vUv;
void main() {
  vec3 sum = texture2D(tInput, vUv).rgb * 0.227;
  sum += texture2D(tInput, vUv + direction * 1.385).rgb * 0.316;
  sum += texture2D(tInput, vUv - direction * 1.385).rgb * 0.316;
  sum += texture2D(tInput, vUv + direction * 3.231).rgb * 0.070;
  sum += texture2D(tInput, vUv - direction * 3.231).rgb * 0.070;
  gl_FragColor = vec4(sum, 1.0);
}
`;

/** Ink over paint, paper, grade, weather, speed lines and the torn sketchbook border. */
export const compositeFragment = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tPaint;
uniform sampler2D tBloom;
uniform sampler2D tPaper;
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;
uniform float time;
uniform float boilSeed;

uniform float inkStrength;
uniform float lineWeight;
uniform float lineCrispness;
uniform float boilAmount;
uniform float pencilLines;
uniform float bleedMix;
uniform float edgeDarkening;
uniform float wetEdges;
uniform float granulation;
uniform float paperGrain;
uniform float border;
uniform float borderPulse;
uniform float glow;
uniform float saturation;
uniform float warmth;
uniform float atmosphere;
uniform vec3 fogColor;
uniform vec3 inkColor;
uniform vec3 pageColor;
uniform float rain;
uniform float speedLines;
uniform float splash;

uniform sampler2D tAO;
uniform sampler2D tShafts;
uniform float realism;
uniform float exposure;
uniform float contrast;
uniform float vignette;
uniform float aoStrength;
uniform float shaftStrength;
uniform vec3 sunColor;
uniform vec3 sunDir;
uniform float fogDensity;
uniform float flash;
uniform mat4 projInv;
uniform mat4 camWorld;
uniform int cbMode;

varying vec2 vUv;

// Colour-vision assist (daltonisation): simulate the deficiency in LMS space,
// then push the lost difference into channels the viewer can still tell apart.
vec3 daltonize(vec3 c, int mode) {
  mat3 toLms = mat3(17.8824, 3.45565, 0.0299566, 43.5161, 27.1554, 0.184309, 4.11935, 3.86714, 1.46709);
  mat3 toRgb = mat3(0.0809444479, -0.0102485335, -0.000365296938, -0.130504409, 0.0540193266, -0.00412161469, 0.116721066, -0.113614708, 0.693511405);
  vec3 lms = toLms * c;
  vec3 sim = lms;
  if (mode == 1) sim = vec3(2.02344 * lms.y - 2.52581 * lms.z, lms.y, lms.z);
  else if (mode == 2) sim = vec3(lms.x, 0.494207 * lms.x + 1.24827 * lms.z, lms.z);
  else sim = vec3(lms.x, lms.y, -0.395913 * lms.x + 0.801109 * lms.y);
  vec3 err = c - toRgb * sim;
  vec3 shift = vec3(0.0, err.r * 0.7 + err.g, err.r * 0.7 + err.b);
  return clamp(c + shift, 0.0, 1.0);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Analytic exponential height fog along a ray.
float heightFog(vec3 ro, vec3 rd, float dist, float density) {
  float falloff = 0.011;
  float a = density * exp(-falloff * max(ro.y, -20.0));
  float b = falloff * rd.y;
  float f = abs(b) > 1e-4 ? a * (1.0 - exp(-b * dist)) / b : a * dist;
  return 1.0 - exp(-max(f, 0.0));
}

${noiseLib}

float viewDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).r;
  return (cameraNear * cameraFar) / ((cameraFar - cameraNear) * d - cameraFar) * -1.0;
}

// Edge strength at uv from depth, normals and object ids.
// Depth uses the second difference of *inverse* depth, which is ~0 across any
// flat surface (1/z is linear in screen space), so grazing planes like the sea
// never light up — only real creases and silhouettes do.
float edgeAt(vec2 uv, float w) {
  vec2 px = w / resolution;
  vec2 ox = vec2(px.x, 0.0);
  vec2 oy = vec2(0.0, px.y);
  float dc = viewDepth(uv);
  float ic = 1.0 / dc;
  float il = 1.0 / viewDepth(uv - ox);
  float ir = 1.0 / viewDepth(uv + ox);
  float id = 1.0 / viewDepth(uv - oy);
  float iu = 1.0 / viewDepth(uv + oy);
  float lap = (abs(il + ir - 2.0 * ic) + abs(id + iu - 2.0 * ic)) / ic;
  float depthEdge = smoothstep(0.015, 0.05, lap);
  // Depth precision falls apart far away: trust only normals/ids there.
  depthEdge *= 1.0 - smoothstep(350.0, 1100.0, dc);

  vec4 nc = texture2D(tNormal, uv);
  vec4 nl = texture2D(tNormal, uv - ox);
  vec4 nr = texture2D(tNormal, uv + ox);
  vec4 nd = texture2D(tNormal, uv - oy);
  vec4 nu = texture2D(tNormal, uv + oy);
  vec3 c = nc.xyz * 2.0 - 1.0;
  float normalEdge = max(max(1.0 - dot(c, nl.xyz * 2.0 - 1.0), 1.0 - dot(c, nr.xyz * 2.0 - 1.0)), max(1.0 - dot(c, nd.xyz * 2.0 - 1.0), 1.0 - dot(c, nu.xyz * 2.0 - 1.0)));
  normalEdge = smoothstep(0.25, 0.6, normalEdge);
  // The sky has no normal: never draw a normal crease against it (the horizon stays soft).
  float skyNear = step(length(c), 0.1) + step(length(nl.xyz * 2.0 - 1.0), 0.1) + step(length(nr.xyz * 2.0 - 1.0), 0.1) + step(length(nd.xyz * 2.0 - 1.0), 0.1) + step(length(nu.xyz * 2.0 - 1.0), 0.1);
  if (skyNear > 0.0) normalEdge = 0.0;

  float idEdge = step(0.002, abs(nc.a - nl.a)) + step(0.002, abs(nc.a - nr.a)) + step(0.002, abs(nc.a - nd.a)) + step(0.002, abs(nc.a - nu.a));
  idEdge = clamp(idEdge, 0.0, 1.0);

  float e = max(depthEdge, max(normalEdge, idEdge));
  // Thin the far city so it does not turn black.
  float dmin = min(dc, min(min(1.0 / il, 1.0 / ir), min(1.0 / id, 1.0 / iu)));
  e *= mix(1.0, 0.25, smoothstep(80.0, 1200.0, dmin));
  return e;
}

void main() {
  vec2 uv = vUv;
  vec2 fragPx = uv * resolution;

  // Line boil: a low-frequency jitter field that is re-seeded on a timer.
  vec2 boil = vec2(vnoise(fragPx / 38.0 + boilSeed * 7.1), vnoise(fragPx / 38.0 + 13.7 + boilSeed * 3.3)) - 0.5;
  vec2 inkUv = uv + boil * boilAmount * 2.2 / resolution;

  // Wet edges: the paint slightly overruns the ink.
  vec2 wet = vec2(fbm(uv * 6.0 + 3.1), fbm(uv * 6.0 + 9.4)) - 0.5;
  vec2 paintUv = uv + wet * wetEdges * 5.0 / resolution;

  float wc = 1.0 - realism; // how much of the watercolour treatment survives
  vec3 sharp = texture2D(tColor, uv).rgb;
  vec3 paint = texture2D(tPaint, paintUv).rgb;
  vec3 col = mix(sharp, paint, bleedMix * wc);

  vec4 nrm = texture2D(tNormal, uv);
  bool isSky = length(nrm.xyz * 2.0 - 1.0) < 0.1;
  float depth = viewDepth(uv);

  // Ambient occlusion in creases and under things.
  if (!isSky) col *= mix(1.0, texture2D(tAO, uv).r, aoStrength * mix(0.55, 1.0, realism));

  // Pigment pooling at the edges of each wash.
  vec2 t2 = 2.0 / resolution;
  float gx = luma(texture2D(tPaint, paintUv + vec2(t2.x, 0.0)).rgb) - luma(texture2D(tPaint, paintUv - vec2(t2.x, 0.0)).rgb);
  float gy = luma(texture2D(tPaint, paintUv + vec2(0.0, t2.y)).rgb) - luma(texture2D(tPaint, paintUv - vec2(0.0, t2.y)).rgb);
  float grad = length(vec2(gx, gy));
  col *= 1.0 - edgeDarkening * wc * smoothstep(0.02, 0.18, grad) * 0.35;

  // Granulation: pigment settles into the paper grain, more in dark washes.
  vec3 paper = texture2D(tPaper, fragPx / 512.0).rgb;
  float grain = paper.r - 0.5;
  float pigment = 1.0 - luma(col);
  col *= 1.0 - granulation * wc * grain * (0.35 + pigment) * 0.55;
  // Low-frequency pigment density variation (blotches).
  col *= 1.0 - granulation * wc * (fbm(uv * vec2(3.0, 2.2) + 5.0) - 0.5) * 0.18;

  // Atmosphere. Painted: a flat wash toward the horizon colour.
  // Realistic: height fog along the view ray, warmer toward the sun (aerial perspective).
  vec4 vr = projInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dirView = normalize(vr.xyz / vr.w);
  vec3 ray = normalize(mat3(camWorld) * dirView);
  vec3 camPos = camWorld[3].xyz;
  float sunAmt = pow(max(dot(ray, sunDir), 0.0), 8.0);
  vec3 inscatter = mix(fogColor, fogColor * 0.6 + sunColor * 0.5, sunAmt * 0.7);
  if (!isSky) {
    float fogW = clamp(1.0 - exp(-max(depth - 40.0, 0.0) * 0.0016 * atmosphere * fogDensity), 0.0, 0.85);
    float dist = depth / max(-dirView.z, 1e-3);
    float fogR = heightFog(camPos, ray, dist, 0.0011 * atmosphere * fogDensity) * 0.92;
    col = mix(col, mix(fogColor, inscatter, realism), mix(fogW, fogR, realism));
  } else if (fogDensity > 1.5) {
    // Thick fog swallows the horizon too.
    col = mix(col, inscatter, clamp((fogDensity - 1.5) * 0.25, 0.0, 0.8) * (1.0 - smoothstep(0.0, 0.35, ray.y)));
  }

  // Ink lines and pencil under-drawing.
  float crisp = mix(0.25, 1.0, lineCrispness);
  float ink = edgeAt(inkUv, lineWeight);
  ink = smoothstep(0.5 - 0.5 * crisp, 0.5 + 0.5 * crisp, ink);
  float pencil = edgeAt(uv + vec2(1.6, -1.1) * lineWeight / resolution + boil * 3.0 / resolution, lineWeight * 0.7);
  col = mix(col, col * 0.62 + inkColor * 0.25, pencil * pencilLines * 0.6 * wc);
  col = mix(col, mix(inkColor, col * 0.35, realism), ink * inkStrength);

  // Glow from lamps, notes and speed pads (and HDR highlights in the realistic look).
  col += texture2D(tBloom, uv).rgb * glow * 0.9;
  // Sun shafts.
  col += texture2D(tShafts, uv).r * shaftStrength * sunColor * mix(0.5, 1.0, realism);

  // Paper shows through highlights; the whole page gets its tooth.
  float l = luma(col);
  col = mix(col, pageColor, smoothstep(0.82, 1.02, l) * 0.35 * wc);
  col *= mix(vec3(1.0), paper * 1.08, paperGrain * 0.45 * wc);

  // Exposure and filmic tone mapping (realistic), plain exposure (painted).
  vec3 tm = pow(aces(pow(max(col, vec3(0.0)), vec3(2.2)) * exposure), vec3(1.0 / 2.2));
  col = mix(col * exposure, tm, realism);

  // Grade: saturation, warmth, contrast, vignette.
  col = mix(vec3(luma(col)), col, saturation);
  col += vec3(0.06, 0.02, -0.05) * warmth;
  col = (col - 0.5) * contrast + 0.5;
  vec2 vc = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  col *= 1.0 - vignette * mix(0.4, 1.0, realism) * smoothstep(0.35, 1.1, length(vc));

  // Rain: diagonal ink streaks.
  if (rain > 0.0) {
    vec2 rp = vec2(uv.x * resolution.x / resolution.y + uv.y * 0.18, uv.y);
    vec2 cell = vec2(rp.x * 90.0, rp.y * 5.0 + time * 7.0);
    float h = hash21(floor(cell));
    float streak = step(0.93, h) * smoothstep(0.0, 0.25, fract(cell.y)) * (1.0 - smoothstep(0.5, 1.0, fract(cell.y)));
    streak *= 1.0 - smoothstep(0.06, 0.2, abs(fract(cell.x) - 0.5));
    col = mix(col, vec3(0.93, 0.95, 1.0), streak * mix(0.45, 0.22, realism) * rain);
    col *= 1.0 - 0.07 * rain;
  }

  // Manga speed lines at the edge of the frame.
  if (speedLines > 0.0) {
    vec2 c = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
    float ang = atan(c.y, c.x);
    float rad = length(c);
    float band = hash21(vec2(floor(ang * 70.0), floor(time * 14.0)));
    float line = step(0.82, band) * smoothstep(0.42, 0.78, rad);
    col = mix(col, vec3(1.0), line * speedLines * 0.55 * (1.0 - 0.6 * realism));
  }

  // Lightning.
  col += vec3(0.8, 0.85, 1.0) * flash * 0.35;

  // Splash doodle when respawning (teal wash that clears).
  col = mix(col, vec3(0.62, 0.86, 0.88), splash * (0.6 + 0.4 * fbm(uv * 5.0 + time)));

  // Torn sketchbook border.
  vec2 fromEdge = min(uv, 1.0 - uv) * resolution / min(resolution.x, resolution.y);
  float d = min(fromEdge.x, fromEdge.y);
  float along = fromEdge.x < fromEdge.y ? uv.y * 9.0 : uv.x * 13.0;
  float tear = fbm(vec2(along, d * 30.0) + 2.0) * 0.035;
  float bw = border * wc;
  float edge = bw * 0.035 + borderPulse * 0.08 * wc + tear * bw;
  float inside = smoothstep(edge, edge + 0.004, d);
  float rim = 1.0 - smoothstep(edge, edge + 0.03, d);
  col *= 1.0 - rim * 0.18 * bw;
  col = mix(pageColor * (0.97 + 0.06 * paper.r), col, inside);

  col = clamp(col, 0.0, 1.0);
  if (cbMode > 0) col = daltonize(col, cbMode);
  gl_FragColor = vec4(col, 1.0);
}
`;
