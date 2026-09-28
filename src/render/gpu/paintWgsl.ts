/**
 * WGSL translation of the PaintMaterial fragment shader (render/PaintMaterial.ts).
 * Keep the two in step. Flags (preprocess): ROAD, FLAT, GHOST, WASHABLE, MAP.
 */

export const ROAD = /* wgsl */ `
fn ink_jointDist(uv: vec2f, cell: vec2f, stagger: f32, id: ptr<function, vec2f>) -> f32 {
  var p = uv / cell;
  p.x += step(1.0, ink_mod(floor(p.y), 2.0)) * stagger;
  *id = floor(p);
  let f = fract(p);
  return min(min(f.x, 1.0 - f.x) * cell.x, min(f.y, 1.0 - f.y) * cell.y);
}

// Surface ids: 0 road, 1 kerb, 2 pavement, 3 side wall, 4 underside. info.w = paving style.
fn ink_roadPattern(base: vec3f, uv: vec2f, info: vec4f) -> vec3f {
  let surface = info.x;
  let rails = info.y;
  let halfW = info.z;
  let paving = info.w;
  var id = vec2f(0.0);
  if (surface < 0.5) {
    var col = base;
    var dashes = true;
    if (paving < 0.5) {
      let d = ink_jointDist(uv, vec2f(1.6, 2.4), 0.5, &id);
      col = base * (0.94 + 0.12 * ink_hash21(id));
      col = mix(col, base * 0.72, (1.0 - smoothstep(0.03, 0.07, d)) * 0.85);
    } else if (paving < 1.5) {
      let d = ink_jointDist(uv, vec2f(0.42, 0.34), 0.5, &id);
      col = base * (0.86 + 0.24 * ink_hash21(id));
      col *= 0.9 + 0.12 * smoothstep(0.0, 0.12, d);
      col = mix(col, base * 0.55, 1.0 - smoothstep(0.015, 0.04, d));
      dashes = false;
    } else if (paving < 2.5) {
      col = base * (0.93 + 0.1 * ink_vnoise(uv * 9.0) + 0.05 * ink_vnoise(uv * 0.4));
      let centre = min(abs(uv.x - 0.14), abs(uv.x + 0.14));
      col = mix(col, vec3f(0.95, 0.8, 0.22), 1.0 - smoothstep(0.05, 0.08, centre));
      let lane = abs(abs(uv.x) - halfW * 0.5);
      col = mix(col, vec3f(0.95), (1.0 - smoothstep(0.06, 0.1, lane)) * step(fract(uv.y / 9.0), 0.4));
      dashes = false;
    } else if (paving < 3.5) {
      let d = ink_jointDist(uv, vec2f(1.3, 0.85), 0.5, &id);
      col = base * (0.85 + 0.25 * ink_hash21(id)) * (0.95 + 0.08 * ink_vnoise(uv * 3.0));
      col = mix(col, base * 0.6, 1.0 - smoothstep(0.02, 0.05, d));
      dashes = false;
    } else if (paving < 4.5) {
      let f = fract(uv.y / 0.34);
      let row = floor(uv.y / 0.34);
      col = base * (0.88 + 0.2 * ink_hash21(vec2f(row, 3.0))) * (0.94 + 0.08 * ink_vnoise(vec2f(uv.x * 0.6, row * 7.0)));
      col = mix(col, base * 0.5, 1.0 - smoothstep(0.03, 0.1, min(f, 1.0 - f)));
      dashes = false;
    } else {
      col = base * (0.9 + 0.15 * ink_vnoise(uv * 1.3) + 0.08 * ink_vnoise(uv * 7.0));
      let rut = min(abs(abs(uv.x) - 1.9), abs(abs(uv.x) - 3.4));
      col *= 1.0 - 0.12 * (1.0 - smoothstep(0.2, 0.45, rut));
      dashes = false;
    }
    let edge = abs(abs(uv.x) - (halfW - 0.45));
    if (paving < 2.5) { col = mix(col, vec3f(0.96, 0.95, 0.92), 1.0 - smoothstep(0.08, 0.13, edge)); }
    let dash = step(fract(uv.y / 7.0), 0.45) * (1.0 - smoothstep(0.1, 0.16, abs(uv.x)));
    if (dashes) { col = mix(col, vec3f(0.95, 0.83, 0.23), dash * (1.0 - rails)); }
    let cell = floor(uv / vec2f(6.0, 23.0));
    let r = ink_hash21(cell + 7.0);
    let c = (cell + vec2f(0.5)) * vec2f(6.0, 23.0) + (vec2f(ink_hash21(cell), ink_hash21(cell + 3.0)) - 0.5) * vec2f(3.0, 12.0);
    let dm = length(uv - c);
    if (r > 0.9 && paving < 2.5) {
      col = mix(col, base * 0.6, 1.0 - smoothstep(0.42, 0.47, dm));
      col = mix(col, base * 0.8, (1.0 - smoothstep(0.02, 0.05, abs(dm - 0.3))) * step(dm, 0.47));
    } else if (r < 0.04 && paving < 0.5) {
      let ring = 1.0 - smoothstep(0.03, 0.08, abs(dm - 0.55 - 0.1 * sin(atan2(uv.y - c.y, uv.x - c.x) * 5.0)));
      col = mix(col, vec3f(0.98, 0.96, 0.9), ring * 0.8);
    }
    if (rails > 0.5) {
      let rr = min(abs(abs(uv.x) - 1.0), abs(abs(uv.x) - 2.45));
      col = mix(col, vec3f(0.17, 0.15, 0.14), 1.0 - smoothstep(0.045, 0.08, rr));
    }
    return col;
  } else if (surface > 1.5 && surface < 2.5) {
    if (paving > 4.5) {
      return base * (0.85 + 0.25 * ink_vnoise(uv * 4.0)) * (0.95 + 0.1 * step(0.7, ink_vnoise(uv * 18.0)));
    }
    let d = ink_jointDist(uv, vec2f(1.1, 1.1), 0.0, &id);
    return mix(base * (0.95 + 0.08 * ink_hash21(id)), base * 0.8, (1.0 - smoothstep(0.02, 0.06, d)) * 0.7);
  } else if (surface > 2.5 && surface < 3.5) {
    let d = ink_jointDist(uv, vec2f(0.9, 0.3), 0.5, &id);
    return mix(base * (0.94 + 0.1 * ink_hash21(id)), base * 0.78, (1.0 - smoothstep(0.015, 0.035, d)) * 0.6);
  } else if (surface > 3.5) {
    return base * (0.92 + 0.08 * step(0.5, fract(uv.y / 3.0)));
  }
  return base;
}
`;

export const PATTERNS = /* wgsl */ `
// 15 stripes · 16 dots · 17 gingham · 18 flowers · 19 batik · 20 zigzag
// 21 stars · 22 camo · 23 tartan · 24 waves. 25–34 are the same prints at car size.
fn ink_fabricPrint(base: vec3f, kind0: f32, nW: vec3f, localPos: vec3f) -> vec3f {
  var kind = kind0;
  var size = 1.0;
  if (kind > 24.5) { kind -= 10.0; size = 4.0; }
  let lp = localPos / size;
  let an = abs(nW);
  let uv = select(select(lp.xy, lp.zy, an.x > an.z), lp.xz, an.y > 0.72);
  let lum = dot(base, vec3f(0.3, 0.55, 0.15));
  let ink = select(base * 0.42, mix(base, vec3f(1.0, 0.97, 0.9), 0.72), lum < 0.45);
  var m = 0.0;
  if (kind < 15.5) {
    m = step(0.5, fract(lp.y * 11.0));
  } else if (kind < 16.5) {
    var q = uv * 16.0;
    q.x += step(1.0, ink_mod(floor(q.y), 2.0)) * 0.5;
    m = 1.0 - smoothstep(0.2, 0.27, length(fract(q) - 0.5));
  } else if (kind < 17.5) {
    let f = step(vec2f(0.5), fract(uv * 9.0));
    m = (f.x + f.y) * 0.5;
  } else if (kind < 18.5) {
    var q = uv * 7.0;
    q.x += step(1.0, ink_mod(floor(q.y), 2.0)) * 0.5;
    let c = fract(q) - 0.5;
    let a = atan2(c.y, c.x);
    let r = length(c);
    let petal = 0.2 + 0.1 * cos(a * 5.0);
    m = 1.0 - smoothstep(petal, petal + 0.03, r);
    if (r < 0.08) { return mix(base, vec3f(0.96, 0.82, 0.25), 0.9); }
  } else if (kind < 19.5) {
    let n = ink_vnoise(uv * 5.0) + 0.5 * ink_vnoise(uv * 11.0);
    m = 1.0 - smoothstep(0.02, 0.07, abs(fract(n * 3.0) - 0.5));
    m = max(m * 0.9, 0.0);
  } else if (kind < 20.5) {
    let zz = abs(fract(uv.x * 6.0) - 0.5) * 0.35;
    m = step(0.5, fract(lp.y * 7.0 + zz));
  } else if (kind < 21.5) {
    var q = uv * 8.0;
    q.x += step(1.0, ink_mod(floor(q.y), 2.0)) * 0.5;
    let c = fract(q) - 0.5;
    let a = atan2(c.y, c.x);
    let star = 0.13 + 0.12 * pow(abs(cos(a * 2.5)), 6.0);
    m = 1.0 - smoothstep(star, star + 0.03, length(c));
  } else if (kind < 22.5) {
    let n1 = ink_vnoise(uv * 4.0 + 3.1);
    let n2 = ink_vnoise(uv * 4.0 - 7.7);
    var cam = base;
    cam = mix(cam, base * 0.6, step(0.55, n1));
    cam = mix(cam, mix(base, vec3f(0.9, 0.85, 0.7), 0.45), step(0.62, n2));
    return cam;
  } else if (kind < 23.5) {
    let f = fract(uv * 5.0);
    let band = step(0.7, f.x) + step(0.7, f.y);
    let thin = (1.0 - smoothstep(0.0, 0.04, abs(f.x - 0.35))) + (1.0 - smoothstep(0.0, 0.04, abs(f.y - 0.35)));
    let col = mix(base, base * 0.55, min(band, 1.0) * 0.8);
    return mix(col, vec3f(0.95, 0.82, 0.3), min(thin, 1.0) * 0.8);
  } else {
    let w = sin(uv.x * 14.0) * 0.06;
    m = 1.0 - smoothstep(0.08, 0.14, abs(fract(lp.y * 6.0 + w) - 0.5));
  }
  return mix(base, ink, m);
}

// 1 brick/stucco · 2 roof tiles · 3 planks · 4 stone blocks · 5 leaves · 6 tea rows
// 7 thatch · 8 grass · 9 sandstone strata · 10 marble
fn ink_surfacePattern(base: vec3f, kind: f32, p: vec3f, nW: vec3f, dist: f32, localPos: vec3f) -> vec3f {
  if (kind > 14.5) { return ink_fabricPrint(base, kind, nW, localPos); }
  if (kind > 13.5) {
    let q = floor(p * 26.0);
    let h = ink_hash21(q.xy + q.z * 17.13);
    let fleck = select(base * 0.4, vec3f(1.0), ink_hash21(q.zx + 3.1) > 0.45);
    return mix(base * 0.92, fleck, step(0.9, h) * 0.85);
  }
  if (kind > 10.5) { return base; }
  let broad = (kind > 5.5 && kind < 6.5) || (kind > 7.5 && kind < 9.5);
  let fade = 1.0 - smoothstep(select(70.0, 400.0, broad), select(260.0, 1200.0, broad), dist);
  if (fade <= 0.0 || kind < 0.5) { return base; }
  let an = abs(nW);
  let uv = select(select(p.xy, p.zy, an.x > an.z), p.xz, an.y > 0.72);
  var col = base;
  if (kind < 1.5) {
    var q = uv / vec2f(0.62, 0.26);
    q.x += step(1.0, ink_mod(floor(q.y), 2.0)) * 0.5;
    let f = fract(q);
    let joint = 1.0 - smoothstep(0.0, 0.07, min(min(f.x, 1.0 - f.x) * 2.4, min(f.y, 1.0 - f.y)));
    let patchy = step(0.62, ink_vnoise(uv * 0.55));
    col = base * (0.96 + 0.07 * ink_vnoise(uv * 2.0)) * (1.0 - joint * 0.14 * patchy);
  } else if (kind < 2.5) {
    let t = normalize(cross(nW, vec3f(0.0, 1.0, 0.0)) + vec3f(1e-4));
    var q = vec2f(dot(p, t) / 0.3, p.y / 0.26);
    q.x += step(1.0, ink_mod(floor(q.y), 2.0)) * 0.5;
    let f = fract(q);
    col = base * (0.9 + 0.18 * ink_hash21(floor(q)));
    col *= 1.0 - 0.28 * (1.0 - smoothstep(0.0, 0.2, f.y)) - 0.18 * (1.0 - smoothstep(0.0, 0.08, min(f.x, 1.0 - f.x)));
  } else if (kind < 3.5) {
    let f = fract(uv.x / 0.24);
    col = base * (0.9 + 0.15 * ink_hash21(vec2f(floor(uv.x / 0.24), 1.0))) * (0.95 + 0.08 * ink_vnoise(vec2f(uv.x * 4.0, uv.y * 0.5)));
    col *= 1.0 - 0.25 * (1.0 - smoothstep(0.02, 0.09, min(f, 1.0 - f)));
  } else if (kind < 4.5) {
    var q = uv / vec2f(1.0, 0.5);
    q.x += step(1.0, ink_mod(floor(q.y), 2.0)) * 0.37;
    let f = fract(q);
    col = base * (0.84 + 0.26 * ink_hash21(floor(q))) * (0.94 + 0.1 * ink_vnoise(uv * 3.0));
    col *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.05, min(min(f.x, 1.0 - f.x) * 2.0, min(f.y, 1.0 - f.y))));
  } else if (kind < 5.5) {
    let clump = ink_vnoise(uv * 2.2 + p.y);
    let fine = ink_vnoise(uv * 7.0);
    col = base * (0.84 + 0.22 * smoothstep(0.35, 0.65, clump)) * (0.95 + 0.1 * fine);
    col = mix(col, base * 1.22, smoothstep(0.55, 0.8, nW.y) * 0.35);
  } else if (kind < 6.5) {
    let wobble = ink_vnoise(p.xz * 0.05) * 2.5 + ink_vnoise(p.xz * 0.3) * 0.25;
    let row = fract(p.y * 1.25 + wobble);
    let bush = smoothstep(0.1, 0.45, row) * (1.0 - smoothstep(0.7, 0.95, row));
    col = mix(base * vec3f(0.72, 0.62, 0.45), base * (1.0 + 0.12 * ink_vnoise(p.xz * 2.0)), bush);
  } else if (kind < 7.5) {
    let streak = ink_vnoise(vec2f(uv.x * 9.0, uv.y * 0.7));
    col = base * (0.82 + 0.3 * streak);
  } else if (kind < 8.5) {
    col = base * (0.88 + 0.18 * ink_vnoise(uv * 1.7)) * (0.95 + 0.1 * step(0.72, ink_vnoise(uv * 14.0)));
  } else if (kind < 9.5) {
    let band = ink_vnoise(vec2f(p.y * 0.7 + ink_vnoise(uv * 0.08) * 3.0, 0.0));
    let strata = mix(vec3f(0.95, 0.78, 0.7), vec3f(1.08, 0.9, 0.78), band);
    col = base * strata * (0.92 + 0.12 * ink_vnoise(uv * vec2f(0.6, 4.0)));
    col *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.05, abs(fract(p.y * 0.35 + ink_vnoise(uv * 0.2)) - 0.5)));
  } else {
    let vein = abs(sin((uv.x + uv.y * 0.6) * 3.0 + ink_vnoise(uv * 1.5) * 6.0));
    col = base * (0.97 + 0.04 * ink_vnoise(uv * 5.0)) * (1.0 - 0.08 * (1.0 - smoothstep(0.0, 0.12, vein)));
  }
  return mix(base, col, fade);
}

fn ink_patternGloss(kind: f32) -> f32 {
  if (kind < 0.5) { return -1.0; }
  if (kind < 1.5) { return 0.08; }
  if (kind < 2.5) { return 0.22; }
  if (kind < 3.5) { return 0.12; }
  if (kind < 4.5) { return 0.1; }
  if (kind < 5.5) { return 0.18; }
  if (kind < 6.5) { return 0.1; }
  if (kind < 7.5) { return 0.02; }
  if (kind < 8.5) { return 0.05; }
  if (kind < 9.5) { return 0.06; }
  if (kind < 10.5) { return 0.6; }
  if (kind < 11.5) { return 0.03; }
  if (kind < 12.5) { return 0.95; }
  if (kind < 13.5) { return 0.0; }
  if (kind < 14.5) { return 0.9; }
  if (kind < 24.5) { return 0.05; }
  return -1.0;
}
`;

/** The face normal (view space): screen derivatives for flat shading, else the interpolated normal. */
export const FACE_NORMAL = /* wgsl */ `
fn ink_faceNormal(normalV: vec3f, front: f32, dVx: vec3f, dVy: vec3f) -> vec3f {
#if FLAT
  return normalize(cross(dVx, dVy));
#else
  return normalize(normalV) * front;
#endif
}
`;

/** The final shading normal: the face normal, bent toward the smooth normal in the realistic look. */
export const FINAL_NORMAL = /* wgsl */ `
fn ink_finalNormal(faceN: vec3f, smoothN: vec3f, front: f32, realism: f32) -> vec3f {
  if (realism > 0.001 && dot(smoothN, smoothN) > 1e-6) {
    var sN = normalize(smoothN) * front;
    if (dot(sN, faceN) < 0.2) { sN = normalize(sN + faceN * (0.2 - dot(sN, faceN))); }
    return normalize(mix(faceN, sN, realism));
  }
  return faceN;
}
`;

export const PAINT_MAIN = /* wgsl */ `
fn ink_paint(
  diffuse: vec3f, vcol: vec4f, mapTex: vec4f, pattern: f32,
  worldPos: vec3f, viewPos: vec3f, localPos: vec3f, dWx: vec3f, dWy: vec3f,
  faceN: vec3f, n: vec3f, roadInfo: vec4f, roadUv: vec2f, shadowF: f32, wash: f32, frag: vec2f,
  sunDir: vec3f, sunColor: vec3f, shadowTint: vec3f, skyTint: vec3f, hatch: f32, night: f32, wet: f32,
  realism: f32, upView: vec3f, skyHorizon: vec3f, sunIntensity: f32,
  headPos: vec3f, headDir: vec3f, headOn: f32, flash: f32, seasonLeaf: vec4f, seasonGrass: vec4f,
  emissive: f32, glowAtNight: f32, glossIn: f32
) -> vec4f {
#if GHOST
  if (ink_mod(floor(frag.x) + floor(frag.y), 2.0) < 1.0) { discard; }
#endif
  var base = diffuse * vcol.rgb;
  let nightMask = vcol.a;
#if MAP
  if (mapTex.a < 0.5) { discard; }
  base *= mapTex.rgb;
#endif
  let dist = length(viewPos);
#if ROAD
  base = mix(base, vec3f(dot(base, vec3f(0.3, 0.55, 0.15))) * vec3f(0.95, 0.96, 1.02), realism * 0.5 * step(roadInfo.x, 0.5));
  base = ink_roadPattern(base, roadUv, roadInfo);
#else
  if (pattern > 0.5) {
    let lum = dot(base, vec3f(0.3, 0.55, 0.15));
    if (pattern > 4.5 && pattern < 5.5) { base = mix(base, seasonLeaf.rgb * (0.55 + lum), seasonLeaf.a); }
    else if (pattern > 7.5 && pattern < 8.5) { base = mix(base, seasonGrass.rgb * (0.55 + lum), seasonGrass.a); }
    let nW = normalize(cross(dWx, dWy));
    base = ink_surfacePattern(base, pattern, worldPos, nW, dist, localPos);
  }
#endif
#if WASHABLE
  if (wash > 0.001) {
    let blot = ink_vnoise(worldPos.xz * 0.018) * 0.6 + ink_vnoise(worldPos.xz * 0.11 + 7.0) * 0.4;
    let k = smoothstep(blot - 0.07, blot + 0.07, wash * 1.2 - 0.1);
    let l = dot(base, vec3f(0.3, 0.55, 0.15));
    let sketch = mix(vec3f(l * 0.9 + 0.12), vec3f(0.95, 0.92, 0.85), 0.35);
    base = mix(base, sketch, k);
  }
#endif

  let ndl = dot(faceN, sunDir);
  let lit = smoothstep(0.02, 0.14, ndl) * shadowF;
  let highlight = smoothstep(0.62, 0.7, ndl) * shadowF;

  let shadowCol = base * shadowTint + skyTint * 0.05;
  let litCol = base * sunColor;
  var toon = mix(shadowCol, litCol, lit);
  toon += base * highlight * 0.07;
  let stroke = ink_vnoise(vec2f(dot(worldPos, vec3f(0.7, 0.35, 0.6)) * 1.3, dot(worldPos, vec3f(-0.3, 0.9, 0.2)) * 0.18));
  toon *= 1.0 - (1.0 - lit) * hatch * (stroke - 0.5) * 0.35;
  toon *= 1.0 - wet * 0.12 * (1.0 - lit * 0.5);

  var col = toon;
  if (realism > 0.001) {
    let grime = ink_vnoise(worldPos.xz * 0.21 + worldPos.y * 0.37) * 0.6 + ink_vnoise(worldPos.xy * 1.7 + worldPos.z * 0.9) * 0.4;
    let detailFade = 1.0 - smoothstep(60.0, 220.0, dist);
    let albedo = base * (1.0 + (grime - 0.5) * 0.16 * detailFade * realism);

    let V = normalize(viewPos);
    let L = sunDir;
    let ndlR = max(dot(n, L), 0.0);
    let wrapL = max((dot(n, L) + 0.25) / 1.25, 0.0);
    let sunTerm = mix(ndlR, wrapL, 0.35) * shadowF;
    let up = dot(n, upView);
    let hemi = up * 0.5 + 0.5;
    let groundBounce = mix(vec3f(0.5, 0.45, 0.4), mix(skyHorizon, sunColor, 0.4), 0.55);
    var ambient = mix(groundBounce * 0.62, mix(skyHorizon, skyTint, 0.6) * 0.74, hemi);
    ambient *= mix(0.9, 1.0, smoothstep(-0.6, 0.4, up));

    var gloss = glossIn;
#if !ROAD
    let pg = ink_patternGloss(pattern);
    if (pg >= 0.0) { gloss = pg; }
#endif
    gloss = mix(gloss, 0.9, step(0.5, nightMask));
    let wetUp = wet * smoothstep(0.35, 0.8, up);
    gloss = mix(gloss, 0.85, wetUp);
    let wetAlbedo = albedo * mix(1.0, 0.62, wetUp);

    let H = normalize(L + V);
    let ndh = max(dot(n, H), 0.0);
    let shininess = exp2(mix(3.0, 10.0, gloss));
    let fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    let spec = pow(ndh, shininess) * (shininess + 8.0) / 25.0 * mix(0.04, 1.0, fres) * gloss;
    let R = reflect(-V, n);
    let ry = dot(R, upView);
    var env = mix(skyHorizon, skyTint, smoothstep(-0.05, 0.6, ry));
    env = mix(env * 0.45, env, smoothstep(-0.25, 0.05, ry));
    var real = wetAlbedo * (sunColor * sunIntensity * sunTerm + ambient);
    real += sunColor * sunIntensity * spec * sunTerm * 1.2;
    real += env * fres * gloss * 0.8;
#if !ROAD
    if (pattern > 12.5 && pattern < 13.5) {
      real = base * (mix(skyHorizon, skyTint, 0.3) * 0.75 + sunColor * sunIntensity * (0.35 + 0.4 * wrapL));
    }
#endif
    col = mix(toon, real, realism);
  }

  if (headOn > 0.001) {
    let fragPos = -viewPos;
    let toFrag = fragPos - headPos;
    let d = length(toFrag);
    let dir = toFrag / max(d, 1e-3);
    let cone = smoothstep(0.8, 0.95, dot(dir, headDir));
    let atten = 1.0 / (1.0 + d * d * 0.004) * (1.0 - smoothstep(45.0, 80.0, d));
    let lam = max(dot(n, -dir), 0.0);
    col += base * vec3f(1.0, 0.92, 0.78) * cone * atten * lam * headOn * 1.8;
  }
  col += base * flash * 0.7;

  var glow = emissive * mix(1.0, night, glowAtNight) + nightMask * night;
  let glowCol = mix(base, vec3f(1.0, 0.86, 0.5), nightMask);
  col = mix(col, glowCol * mix(1.15, 2.2, realism), clamp(glow, 0.0, 1.0));
#if GHOST
  col = mix(col, vec3f(0.75, 0.9, 1.0), 0.45);
  glow = max(glow, 0.25);
#endif
  return vec4f(col, clamp(glow, 0.0, 1.0));
}
`;
