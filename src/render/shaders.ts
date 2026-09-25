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

/** Glow source: only emissive pixels (alpha channel of the colour buffer). */
export const brightFragment = /* glsl */ `
uniform sampler2D tColor;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  gl_FragColor = vec4(c.rgb * c.a, 1.0);
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

varying vec2 vUv;

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

  vec3 sharp = texture2D(tColor, uv).rgb;
  vec3 paint = texture2D(tPaint, paintUv).rgb;
  vec3 col = mix(sharp, paint, bleedMix);

  vec4 nrm = texture2D(tNormal, uv);
  bool isSky = length(nrm.xyz * 2.0 - 1.0) < 0.1;
  float depth = viewDepth(uv);

  // Pigment pooling at the edges of each wash.
  vec2 t2 = 2.0 / resolution;
  float gx = luma(texture2D(tPaint, paintUv + vec2(t2.x, 0.0)).rgb) - luma(texture2D(tPaint, paintUv - vec2(t2.x, 0.0)).rgb);
  float gy = luma(texture2D(tPaint, paintUv + vec2(0.0, t2.y)).rgb) - luma(texture2D(tPaint, paintUv - vec2(0.0, t2.y)).rgb);
  float grad = length(vec2(gx, gy));
  col *= 1.0 - edgeDarkening * smoothstep(0.02, 0.18, grad) * 0.35;

  // Granulation: pigment settles into the paper grain, more in dark washes.
  vec3 paper = texture2D(tPaper, fragPx / 512.0).rgb;
  float grain = paper.r - 0.5;
  float pigment = 1.0 - luma(col);
  col *= 1.0 - granulation * grain * (0.35 + pigment) * 0.55;
  // Low-frequency pigment density variation (blotches).
  col *= 1.0 - granulation * (fbm(uv * vec2(3.0, 2.2) + 5.0) - 0.5) * 0.18;

  // Atmospheric wash toward the horizon colour.
  if (!isSky) {
    float fog = 1.0 - exp(-max(depth - 40.0, 0.0) * 0.0016 * atmosphere);
    col = mix(col, fogColor, clamp(fog, 0.0, 0.85));
  }

  // Ink lines and pencil under-drawing.
  float crisp = mix(0.25, 1.0, lineCrispness);
  float ink = edgeAt(inkUv, lineWeight);
  ink = smoothstep(0.5 - 0.5 * crisp, 0.5 + 0.5 * crisp, ink);
  float pencil = edgeAt(uv + vec2(1.6, -1.1) * lineWeight / resolution + boil * 3.0 / resolution, lineWeight * 0.7);
  col = mix(col, col * 0.62 + inkColor * 0.25, pencil * pencilLines * 0.6);
  col = mix(col, inkColor, ink * inkStrength);

  // Glow from lamps, notes and speed pads.
  col += texture2D(tBloom, uv).rgb * glow * 0.9;

  // Paper shows through highlights; the whole page gets its tooth.
  float l = luma(col);
  col = mix(col, pageColor, smoothstep(0.82, 1.02, l) * 0.35);
  col *= mix(vec3(1.0), paper * 1.08, paperGrain * 0.45);

  // Grade: saturation and warmth.
  col = mix(vec3(luma(col)), col, saturation);
  col += vec3(0.06, 0.02, -0.05) * warmth;

  // Rain: diagonal ink streaks.
  if (rain > 0.0) {
    vec2 rp = vec2(uv.x * resolution.x / resolution.y + uv.y * 0.18, uv.y);
    vec2 cell = vec2(rp.x * 90.0, rp.y * 5.0 + time * 7.0);
    float h = hash21(floor(cell));
    float streak = step(0.93, h) * smoothstep(0.0, 0.25, fract(cell.y)) * (1.0 - smoothstep(0.5, 1.0, fract(cell.y)));
    streak *= 1.0 - smoothstep(0.06, 0.2, abs(fract(cell.x) - 0.5));
    col = mix(col, vec3(0.93, 0.95, 1.0), streak * 0.45 * rain);
    col *= 1.0 - 0.07 * rain;
  }

  // Manga speed lines at the edge of the frame.
  if (speedLines > 0.0) {
    vec2 c = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
    float ang = atan(c.y, c.x);
    float rad = length(c);
    float band = hash21(vec2(floor(ang * 70.0), floor(time * 14.0)));
    float line = step(0.82, band) * smoothstep(0.42, 0.78, rad);
    col = mix(col, vec3(1.0), line * speedLines * 0.55);
  }

  // Splash doodle when respawning (teal wash that clears).
  col = mix(col, vec3(0.62, 0.86, 0.88), splash * (0.6 + 0.4 * fbm(uv * 5.0 + time)));

  // Torn sketchbook border.
  vec2 fromEdge = min(uv, 1.0 - uv) * resolution / min(resolution.x, resolution.y);
  float d = min(fromEdge.x, fromEdge.y);
  float along = fromEdge.x < fromEdge.y ? uv.y * 9.0 : uv.x * 13.0;
  float tear = fbm(vec2(along, d * 30.0) + 2.0) * 0.035;
  float edge = border * 0.035 + borderPulse * 0.08 + tear * border;
  float inside = smoothstep(edge, edge + 0.004, d);
  float rim = 1.0 - smoothstep(edge, edge + 0.03, d);
  col *= 1.0 - rim * 0.18 * border;
  col = mix(pageColor * (0.97 + 0.06 * paper.r), col, inside);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
