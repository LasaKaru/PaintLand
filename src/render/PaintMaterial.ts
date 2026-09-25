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
#ifdef USE_ROAD
  attribute vec3 roadInfo;
  varying vec3 vRoadInfo;
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
#ifdef USE_ROAD
  varying vec3 vRoadInfo;
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
// Surface ids: 0 road, 1 kerb, 2 pavement, 3 side wall, 4 underside.
vec3 roadPattern(vec3 base, vec2 uv, vec3 info) {
  float surface = info.x;
  float rails = info.y;
  float halfW = info.z;
  if (surface < 0.5) {
    // Staggered paving slabs 2.4m x 1.6m.
    vec2 tile = vec2(1.6, 2.4);
    vec2 p = uv / tile;
    p.x += step(1.0, mod(floor(p.y), 2.0)) * 0.5;
    vec2 cell = floor(p);
    vec2 f = fract(p);
    float edgeDist = min(min(f.x, 1.0 - f.x) * tile.x, min(f.y, 1.0 - f.y) * tile.y);
    float grout = 1.0 - smoothstep(0.03, 0.07, edgeDist);
    vec3 col = base * (0.94 + 0.12 * hash21(cell));
    col = mix(col, base * 0.72, grout * 0.85);
    // Edge lines.
    float edge = abs(abs(uv.x) - (halfW - 0.45));
    col = mix(col, vec3(0.96, 0.95, 0.92), 1.0 - smoothstep(0.08, 0.13, edge));
    // Centre dashes.
    float dash = step(fract(uv.y / 7.0), 0.45) * (1.0 - smoothstep(0.1, 0.16, abs(uv.x)));
    col = mix(col, vec3(0.95, 0.83, 0.23), dash * (1.0 - rails));
    // Tram rails: two pairs.
    if (rails > 0.5) {
      float r = min(min(abs(abs(uv.x) - 1.0), abs(abs(uv.x) - 2.45)), 10.0);
      col = mix(col, vec3(0.17, 0.15, 0.14), 1.0 - smoothstep(0.045, 0.08, r));
    }
    return col;
  } else if (surface < 2.5 && surface > 1.5) {
    // Pavement: square sand tiles.
    vec2 p = uv / 1.1;
    vec2 f = fract(p);
    float g = 1.0 - smoothstep(0.02, 0.06, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    return mix(base * (0.95 + 0.08 * hash21(floor(p))), base * 0.8, g * 0.7);
  } else if (surface > 3.5) {
    // Underside: soft paper stripes like a folded strip.
    return base * (0.92 + 0.08 * step(0.5, fract(uv.y / 3.0)));
  }
  return base;
}
#endif

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
