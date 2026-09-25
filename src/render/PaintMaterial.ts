import * as THREE from 'three';

/**
 * Uniforms shared by every painted material. Updated once per frame by the
 * environment (time of day) and the pipeline; all materials hold references
 * to these same objects, so one write updates the whole world.
 */
export const paintShared = {
  uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.4) }, // view space
  uSunColor: { value: new THREE.Color('#fff6e4') },
  uShadowTint: { value: new THREE.Color('#8f93d6') },
  uSkyTint: { value: new THREE.Color('#bfe0f0') },
  uHatch: { value: 0.6 },
  uTime: { value: 0 },
  uNight: { value: 0 },
  uWet: { value: 0 },
};

export interface PaintOptions {
  color?: THREE.ColorRepresentation;
  /** Use per-vertex colours (RGBA; alpha = "glows at night" mask). */
  vertexColors?: boolean;
  /** Faceted low-poly shading (normals from screen derivatives). */
  flat?: boolean;
  /** 0..1 self-light. Emissive pixels also feed the glow pass. */
  emissive?: number;
  /** Emissive only after dusk (street lamps). */
  glowAtNight?: boolean;
  /** Road surface pattern: paving tiles, centre dashes, rails. */
  road?: boolean;
  side?: THREE.Side;
  /** Stable id so outlines are drawn between touching objects of the same colour. */
  objectId?: number;
}

let nextObjectId = 1;

const vertexShader = /* glsl */ `
varying vec3 vViewPosition;
varying vec3 vWorldPos;
varying float vInstance;
attribute float pattern;
varying float vPattern;
#ifdef USE_ROAD
  attribute vec4 roadInfo;
  varying vec4 vRoadInfo;
  varying vec2 vRoadUv;
#endif

#include <common>
#include <batching_pars_vertex>
#include <color_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>

void main() {
  #include <color_vertex>
  #include <morphinstance_vertex>
  #include <morphcolor_vertex>
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>

  vViewPosition = -mvPosition.xyz;

  #include <worldpos_vertex>
  #include <shadowmap_vertex>

  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
    vInstance = float(gl_InstanceID);
  #else
    vInstance = 0.0;
  #endif
  vWorldPos = (modelMatrix * wp).xyz;
  vPattern = pattern;

  #ifdef USE_ROAD
    vRoadInfo = roadInfo;
    vRoadUv = uv;
  #endif
}
`;

const fragmentShader = /* glsl */ `
layout(location = 0) out highp vec4 gColor;
layout(location = 1) out highp vec4 gNormal;

uniform vec3 diffuse;
uniform float uEmissive;
uniform float uGlowAtNight;
uniform float uObjectId;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uShadowTint;
uniform vec3 uSkyTint;
uniform float uHatch;
uniform float uTime;
uniform float uNight;
uniform float uWet;

varying vec3 vViewPosition;
varying vec3 vWorldPos;
varying float vInstance;
varying float vPattern;
#ifdef USE_ROAD
  varying vec4 vRoadInfo;
  varying vec2 vRoadUv;
#endif

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <normal_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

#ifdef USE_ROAD
// Distance (m) from uv to the nearest joint of a staggered grid of cells.
float jointDist(vec2 uv, vec2 cell, float stagger, out vec2 id) {
  vec2 p = uv / cell;
  p.x += step(1.0, mod(floor(p.y), 2.0)) * stagger;
  id = floor(p);
  vec2 f = fract(p);
  return min(min(f.x, 1.0 - f.x) * cell.x, min(f.y, 1.0 - f.y) * cell.y);
}

// Surface ids: 0 road, 1 kerb, 2 pavement, 3 side wall, 4 underside. info.w = paving style.
vec3 roadPattern(vec3 base, vec2 uv, vec4 info) {
  float surface = info.x;
  float rails = info.y;
  float halfW = info.z;
  float paving = info.w;
  vec2 id;
  if (surface < 0.5) {
    vec3 col = base;
    bool dashes = true;
    if (paving < 0.5) {
      // Lavender slabs 1.6 x 2.4 m.
      float d = jointDist(uv, vec2(1.6, 2.4), 0.5, id);
      col = base * (0.94 + 0.12 * hash21(id));
      col = mix(col, base * 0.72, (1.0 - smoothstep(0.03, 0.07, d)) * 0.85);
    } else if (paving < 1.5) {
      // Cobbles: small rounded stones, each a slightly different tone.
      float d = jointDist(uv, vec2(0.42, 0.34), 0.5, id);
      col = base * (0.86 + 0.24 * hash21(id));
      col *= 0.9 + 0.12 * smoothstep(0.0, 0.12, d);
      col = mix(col, base * 0.55, 1.0 - smoothstep(0.015, 0.04, d));
      dashes = false;
    } else if (paving < 2.5) {
      // Asphalt: aggregate speckle, solid double centre line, white lane dashes.
      col = base * (0.93 + 0.1 * vnoise(uv * 9.0) + 0.05 * vnoise(uv * 0.4));
      float centre = min(abs(uv.x - 0.14), abs(uv.x + 0.14));
      col = mix(col, vec3(0.95, 0.8, 0.22), 1.0 - smoothstep(0.05, 0.08, centre));
      float lane = abs(abs(uv.x) - halfW * 0.5);
      col = mix(col, vec3(0.95), (1.0 - smoothstep(0.06, 0.1, lane)) * step(fract(uv.y / 9.0), 0.4));
      dashes = false;
    } else if (paving < 3.5) {
      // Big stone blocks (walls of wonders).
      float d = jointDist(uv, vec2(1.3, 0.85), 0.5, id);
      col = base * (0.85 + 0.25 * hash21(id)) * (0.95 + 0.08 * vnoise(uv * 3.0));
      col = mix(col, base * 0.6, 1.0 - smoothstep(0.02, 0.05, d));
      dashes = false;
    } else if (paving < 4.5) {
      // Wooden planks across the road.
      float f = fract(uv.y / 0.34);
      float row = floor(uv.y / 0.34);
      col = base * (0.88 + 0.2 * hash21(vec2(row, 3.0))) * (0.94 + 0.08 * vnoise(vec2(uv.x * 0.6, row * 7.0)));
      col = mix(col, base * 0.5, 1.0 - smoothstep(0.03, 0.1, min(f, 1.0 - f)));
      dashes = false;
    } else {
      // Red laterite earth with tyre ruts.
      col = base * (0.9 + 0.15 * vnoise(uv * 1.3) + 0.08 * vnoise(uv * 7.0));
      float rut = min(abs(abs(uv.x) - 1.9), abs(abs(uv.x) - 3.4));
      col *= 1.0 - 0.12 * (1.0 - smoothstep(0.2, 0.45, rut));
      dashes = false;
    }
    // Edge lines.
    float edge = abs(abs(uv.x) - (halfW - 0.45));
    if (paving < 2.5) col = mix(col, vec3(0.96, 0.95, 0.92), 1.0 - smoothstep(0.08, 0.13, edge));
    // Centre dashes.
    float dash = step(fract(uv.y / 7.0), 0.45) * (1.0 - smoothstep(0.1, 0.16, abs(uv.x)));
    if (dashes) col = mix(col, vec3(0.95, 0.83, 0.23), dash * (1.0 - rails));
    // Manhole covers and chalk doodles, sparse.
    vec2 cell = floor(uv / vec2(6.0, 23.0));
    float r = hash21(cell + 7.0);
    vec2 c = (cell + vec2(0.5)) * vec2(6.0, 23.0) + (vec2(hash21(cell), hash21(cell + 3.0)) - 0.5) * vec2(3.0, 12.0);
    float dm = length(uv - c);
    if (r > 0.9 && paving < 2.5) {
      col = mix(col, base * 0.6, 1.0 - smoothstep(0.42, 0.47, dm));
      col = mix(col, base * 0.8, (1.0 - smoothstep(0.02, 0.05, abs(dm - 0.3))) * step(dm, 0.47));
    } else if (r < 0.04 && paving < 0.5) {
      float ring = 1.0 - smoothstep(0.03, 0.08, abs(dm - 0.55 - 0.1 * sin(atan(uv.y - c.y, uv.x - c.x) * 5.0)));
      col = mix(col, vec3(0.98, 0.96, 0.9), ring * 0.8);
    }
    // Tram rails: two pairs.
    if (rails > 0.5) {
      float rr = min(abs(abs(uv.x) - 1.0), abs(abs(uv.x) - 2.45));
      col = mix(col, vec3(0.17, 0.15, 0.14), 1.0 - smoothstep(0.045, 0.08, rr));
    }
    return col;
  } else if (surface > 1.5 && surface < 2.5) {
    if (paving > 4.5) {
      // Grass verge beside earth roads.
      return base * (0.85 + 0.25 * vnoise(uv * 4.0)) * (0.95 + 0.1 * step(0.7, vnoise(uv * 18.0)));
    }
    float d = jointDist(uv, vec2(1.1, 1.1), 0.0, id);
    return mix(base * (0.95 + 0.08 * hash21(id)), base * 0.8, (1.0 - smoothstep(0.02, 0.06, d)) * 0.7);
  } else if (surface > 2.5 && surface < 3.5) {
    // Side walls: stone courses.
    float d = jointDist(uv, vec2(0.9, 0.3), 0.5, id);
    return mix(base * (0.94 + 0.1 * hash21(id)), base * 0.78, (1.0 - smoothstep(0.015, 0.035, d)) * 0.6);
  } else if (surface > 3.5) {
    // Underside: soft paper stripes like a folded strip.
    return base * (0.92 + 0.08 * step(0.5, fract(uv.y / 3.0)));
  }
  return base;
}
#endif

// ————— Surface patterns for props (docs/03 §3) —————
// 1 brick/stucco · 2 roof tiles · 3 planks · 4 stone blocks · 5 leaves · 6 tea rows
// 7 thatch · 8 grass · 9 sandstone strata · 10 marble
vec3 surfacePattern(vec3 base, float kind, vec3 p, vec3 nW, float dist) {
  bool broad = kind > 5.5 && kind < 6.5 || kind > 7.5 && kind < 9.5;
  float fade = 1.0 - smoothstep(broad ? 400.0 : 70.0, broad ? 1200.0 : 260.0, dist);
  if (fade <= 0.0 || kind < 0.5) return base;
  vec3 an = abs(nW);
  vec2 uv = an.y > 0.72 ? p.xz : (an.x > an.z ? p.zy : p.xy);
  vec3 col = base;
  if (kind < 1.5) {
    vec2 q = uv / vec2(0.62, 0.26);
    q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 f = fract(q);
    float joint = 1.0 - smoothstep(0.0, 0.07, min(min(f.x, 1.0 - f.x) * 2.4, min(f.y, 1.0 - f.y)));
    float patchy = step(0.62, vnoise(uv * 0.55));
    col = base * (0.96 + 0.07 * vnoise(uv * 2.0)) * (1.0 - joint * 0.14 * patchy);
  } else if (kind < 2.5) {
    vec3 t = normalize(cross(nW, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
    vec2 q = vec2(dot(p, t) / 0.3, p.y / 0.26);
    q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 f = fract(q);
    col = base * (0.9 + 0.18 * hash21(floor(q)));
    col *= 1.0 - 0.28 * (1.0 - smoothstep(0.0, 0.2, f.y)) - 0.18 * (1.0 - smoothstep(0.0, 0.08, min(f.x, 1.0 - f.x)));
  } else if (kind < 3.5) {
    float f = fract(uv.x / 0.24);
    col = base * (0.9 + 0.15 * hash21(vec2(floor(uv.x / 0.24), 1.0))) * (0.95 + 0.08 * vnoise(vec2(uv.x * 4.0, uv.y * 0.5)));
    col *= 1.0 - 0.25 * (1.0 - smoothstep(0.02, 0.09, min(f, 1.0 - f)));
  } else if (kind < 4.5) {
    vec2 q = uv / vec2(1.0, 0.5);
    q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.37;
    vec2 f = fract(q);
    col = base * (0.84 + 0.26 * hash21(floor(q))) * (0.94 + 0.1 * vnoise(uv * 3.0));
    col *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.05, min(min(f.x, 1.0 - f.x) * 2.0, min(f.y, 1.0 - f.y))));
  } else if (kind < 5.5) {
    float clump = vnoise(uv * 2.2 + p.y);
    float fine = vnoise(uv * 7.0);
    col = base * (0.84 + 0.22 * smoothstep(0.35, 0.65, clump)) * (0.95 + 0.1 * fine);
    col = mix(col, base * 1.22, smoothstep(0.55, 0.8, nW.y) * 0.35);
  } else if (kind < 6.5) {
    float wobble = vnoise(p.xz * 0.05) * 2.5 + vnoise(p.xz * 0.3) * 0.25;
    float row = fract(p.y * 1.25 + wobble);
    float bush = smoothstep(0.1, 0.45, row) * (1.0 - smoothstep(0.7, 0.95, row));
    col = mix(base * vec3(0.72, 0.62, 0.45), base * (1.0 + 0.12 * vnoise(p.xz * 2.0)), bush);
  } else if (kind < 7.5) {
    float streak = vnoise(vec2(uv.x * 9.0, uv.y * 0.7));
    col = base * (0.82 + 0.3 * streak);
  } else if (kind < 8.5) {
    col = base * (0.88 + 0.18 * vnoise(uv * 1.7)) * (0.95 + 0.1 * step(0.72, vnoise(uv * 14.0)));
  } else if (kind < 9.5) {
    float band = vnoise(vec2(p.y * 0.7 + vnoise(uv * 0.08) * 3.0, 0.0));
    vec3 strata = mix(vec3(0.95, 0.78, 0.7), vec3(1.08, 0.9, 0.78), band);
    col = base * strata * (0.92 + 0.12 * vnoise(uv * vec2(0.6, 4.0)));
    col *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.05, abs(fract(p.y * 0.35 + vnoise(uv * 0.2)) - 0.5)));
  } else {
    float vein = abs(sin((uv.x + uv.y * 0.6) * 3.0 + vnoise(uv * 1.5) * 6.0));
    col = base * (0.97 + 0.04 * vnoise(uv * 5.0)) * (1.0 - 0.08 * (1.0 - smoothstep(0.0, 0.12, vein)));
  }
  return mix(base, col, fade);
}

void main() {
  vec3 base = diffuse;
  float nightMask = 0.0;
  #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
    base *= vColor.rgb;
    #ifdef USE_COLOR_ALPHA
      nightMask = vColor.a;
    #endif
  #endif

  #ifdef USE_ROAD
    base = roadPattern(base, vRoadUv, vRoadInfo);
  #else
    if (vPattern > 0.5) {
      vec3 nW = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
      base = surfacePattern(base, vPattern, vWorldPos, nW, length(vViewPosition));
    }
  #endif

  #ifdef FLAT_SHADED
    vec3 n = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  #else
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  #endif

  float ndl = dot(n, uSunDir);
  float shadow = getShadowMask();
  float lit = smoothstep(0.02, 0.14, ndl) * shadow;
  float highlight = smoothstep(0.62, 0.7, ndl) * shadow;

  // Coloured shadows (never grey) with a little sky fill.
  vec3 shadowCol = base * uShadowTint + uSkyTint * 0.05;
  vec3 litCol = base * uSunColor;
  vec3 col = mix(shadowCol, litCol, lit);
  col += base * highlight * 0.07;

  // Brushed hatching inside shadows, in world space so it sticks to surfaces.
  float stroke = vnoise(vec2(dot(vWorldPos, vec3(0.7, 0.35, 0.6)) * 1.3, dot(vWorldPos, vec3(-0.3, 0.9, 0.2)) * 0.18));
  col *= 1.0 - (1.0 - lit) * uHatch * (stroke - 0.5) * 0.35;

  // Wet surfaces darken a little in rain.
  col *= 1.0 - uWet * 0.12 * (1.0 - lit * 0.5);

  float glow = uEmissive * mix(1.0, uNight, uGlowAtNight) + nightMask * uNight;
  vec3 glowCol = mix(base, vec3(1.0, 0.86, 0.5), nightMask);
  col = mix(col, glowCol * 1.15, clamp(glow, 0.0, 1.0));

  gColor = vec4(col, clamp(glow, 0.0, 1.0));
  gNormal = vec4(n * 0.5 + 0.5, fract(uObjectId + vInstance * 0.6180339));
}
`;

/** The one toon/paint material used by (almost) everything in the world (docs/03 §2.1). */
export class PaintMaterial extends THREE.ShaderMaterial {
  constructor(opts: PaintOptions = {}) {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      {
        diffuse: { value: new THREE.Color(opts.color ?? '#ffffff') },
        uEmissive: { value: opts.emissive ?? 0 },
        uGlowAtNight: { value: opts.glowAtNight ? 1 : 0 },
        uObjectId: { value: opts.objectId ?? fract(nextObjectId++ * 0.3819661) },
      },
    ]);
    Object.assign(uniforms, paintShared);
    super({
      uniforms,
      vertexShader,
      fragmentShader,
      lights: true,
      glslVersion: THREE.GLSL3,
      vertexColors: opts.vertexColors ?? false,
      side: opts.side ?? THREE.FrontSide,
      defines: {
        ...(opts.road ? { USE_ROAD: '' } : {}),
        // Faceted low-poly look: normals from screen derivatives (three's own chunks honour this define).
        ...(opts.flat ? { FLAT_SHADED: '' } : {}),
      },
    });
  }

  get color(): THREE.Color {
    return this.uniforms.diffuse.value as THREE.Color;
  }

  set emissiveStrength(v: number) {
    this.uniforms.uEmissive.value = v;
  }
}

function fract(x: number): number {
  return x - Math.floor(x);
}
