import * as THREE from 'three/webgpu';
import { paintShared } from '../PaintMaterial';
import { NOISE, T, fn, frameGroup, frameUniform, gbufferMrt, preprocess, type N } from './wgsl';
import { FACE_NORMAL, FINAL_NORMAL, PAINT_MAIN, PATTERNS, ROAD } from './paintWgsl';
/**
 * Frame-wide paint uniforms as nodes. They wrap the very objects in
 * `paintShared`, so the environment's writes reach both renderers (see
 * frameUniform in ./wgsl for why they share one buffer).
 */
let shared: ReturnType<typeof makeShared> | null = null;
function makeShared() {
  const s = paintShared;
  const u = (v: unknown, type?: string): N => frameUniform({ value: v }, type);
  return {
    sunDir: u(s.uSunDir.value),
    sunColor: u(s.uSunColor.value, 'color'),
    shadowTint: u(s.uShadowTint.value, 'color'),
    skyTint: u(s.uSkyTint.value, 'color'),
    upView: u(s.uUpView.value),
    skyHorizon: u(s.uSkyHorizon.value, 'color'),
    headPos: u(s.uHeadPos.value),
    headDir: u(s.uHeadDir.value),
    seasonLeaf: u(s.uSeasonLeaf.value),
    seasonGrass: u(s.uSeasonGrass.value),
    // Numbers are copied by value: these read the shared uniform objects each render.
    hatch: num(s.uHatch),
    night: num(s.uNight),
    wet: num(s.uWet),
    realism: num(s.uRealism),
    sunIntensity: num(s.uSunIntensity),
    headOn: num(s.uHeadOn),
    flash: num(s.uFlash),
    washRect: T.uniformArray(s.uWashRect.value, 'vec4').setGroup(frameGroup),
    wash: T.uniformArray(s.uWash.value, 'float').setGroup(frameGroup),
  };
}

const num = (holder: { value: number }): N => frameUniform(holder);

export function paintUniforms(): NonNullable<typeof shared> {
  shared ??= makeShared();
  return shared;
}

/** The sun's shadow, one node for every material (so the shadow map renders once per frame). */
let sunShadow: N | null = null;
let sunLight: THREE.DirectionalLight | null = null;
export function setSunLight(light: THREE.DirectionalLight): void {
  if (sunLight !== light) sunShadow = null;
  sunLight = light;
}
function shadowN(): N {
  if (!sunLight) return T.float(1);
  sunShadow ??= T.shadow(sunLight);
  return sunShadow;
}

const fns = new Map<string, { face: ReturnType<typeof fn>; final: ReturnType<typeof fn>; paint: ReturnType<typeof fn> }>();
function paintFns(flags: Record<string, boolean>) {
  const key = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(',');
  let f = fns.get(key);
  if (!f) {
    const helpers = [NOISE, ...(flags.ROAD ? [ROAD] : [PATTERNS])];
    f = {
      face: fn(preprocess(FACE_NORMAL, flags)),
      final: fn(FINAL_NORMAL),
      paint: fn(preprocess(PAINT_MAIN, flags), helpers),
    };
    fns.set(key, f);
  }
  return f;
}

/**
 * The WebGPU twin of PaintMaterial. The renderer builds one from a
 * PaintMaterial when it first draws it (renderer.library.fromMaterial), copying
 * its properties; per-material values are read from the original each draw
 * through materialReference, so the game keeps using PaintMaterial as before.
 */
export class PaintNodeMaterial extends THREE.NodeMaterial {
  static override get type(): string {
    return 'PaintNodeMaterial';
  }

  override setup(builder: THREE.NodeBuilder): unknown {
    const b = builder as unknown as { object: THREE.Object3D & { isInstancedMesh?: boolean; receiveShadow: boolean }; geometry: THREE.BufferGeometry; material: { defines?: Record<string, unknown>; vertexColors?: boolean } };
    // Copied from the ShaderMaterial: this material lights itself.
    this.lights = false;
    this.fog = false;
    const defines = b.material.defines ?? {};
    const flags = {
      ROAD: 'USE_ROAD' in defines,
      FLAT: 'FLAT_SHADED' in defines,
      GHOST: 'GHOST' in defines,
      WASHABLE: 'WASHABLE' in defines,
      MAP: 'USE_PAINT_MAP' in defines,
    };
    const f = paintFns(flags);
    const s = paintUniforms();
    const geo = b.geometry;
    const has = (name: string): boolean => !!geo?.getAttribute(name);

    const diffuse = T.materialReference('uniforms.diffuse.value', 'color');
    const colorAttr = geo?.getAttribute('color');
    let vcol: N = T.vec4(1, 1, 1, 0);
    if (b.material.vertexColors && colorAttr) {
      vcol = (colorAttr.itemSize === 4 ? T.attribute('color', 'vec4') : T.vec4(T.attribute('color', 'vec3'), 0));
    }
    // Per-instance colours (InstancedMesh.setColorAt), as three's GLSL applies them.
    if ((b.object as { instanceColor?: unknown }).instanceColor) vcol = T.vec4(vcol.rgb.mul(T.varyingProperty('vec3', 'vInstanceColor')), vcol.a);
    // A texture reference samples with the mesh's first uv set.
    const mapTex = flags.MAP && has('uv') ? T.materialReference('uniforms.uPaintMap.value', 'texture') : T.vec4(1);
    const pattern = has('pattern') ? T.attribute('pattern', 'float') : T.float(0);
    const smoothN = has('smoothNormal') && !b.object.isInstancedMesh ? T.transformNormalToView(T.attribute('smoothNormal', 'vec3')) : T.vec3(0);
    const roadInfo = flags.ROAD && has('roadInfo') ? T.attribute('roadInfo', 'vec4') : T.vec4(0);
    const roadUv = flags.ROAD && has('uv') ? T.uv() : T.vec2(0);
    const viewPos = T.positionView.negate();
    const localPos = T.positionGeometry;
    const front = T.frontFacing.select(T.float(1), T.float(-1));
    const shadowF = b.object.receiveShadow ? shadowN() : T.float(1);

    let wash: N = T.float(0);
    if (flags.WASHABLE) {
      const q = T.positionWorld.xz;
      for (let i = 0; i < 8; i++) {
        const r = s.washRect.element(i);
        const inside = T.step(r.xy, q).mul(T.step(q, r.zw));
        wash = T.max(wash, inside.x.mul(inside.y).mul(s.wash.element(i)));
      }
    }

    const faceN = f.face({ normalV: T.normalView, front, dVx: T.dFdx(viewPos), dVy: T.dFdy(viewPos) });
    const n = f.final({ faceN, smoothN, front, realism: s.realism });
    const col = f.paint({
      diffuse, vcol, mapTex, pattern,
      worldPos: T.positionWorld, viewPos, localPos, dWx: T.dFdx(T.positionWorld), dWy: T.dFdy(T.positionWorld),
      faceN, n, roadInfo, roadUv, shadowF, wash, frag: T.screenCoordinate,
      sunDir: s.sunDir, sunColor: s.sunColor, shadowTint: s.shadowTint, skyTint: s.skyTint, hatch: s.hatch, night: s.night, wet: s.wet,
      realism: s.realism, upView: s.upView, skyHorizon: s.skyHorizon, sunIntensity: s.sunIntensity,
      headPos: s.headPos, headDir: s.headDir, headOn: s.headOn, flash: s.flash, seasonLeaf: s.seasonLeaf, seasonGrass: s.seasonGrass,
      emissive: T.materialReference('uniforms.uEmissive.value', 'float'),
      glowAtNight: T.materialReference('uniforms.uGlowAtNight.value', 'float'),
      glossIn: T.materialReference('uniforms.uGloss.value', 'float'),
    });
    const instance = b.object.isInstancedMesh ? T.varying(T.float(T.instanceIndex)) : T.float(0);
    const id = T.materialReference('uniforms.uObjectId.value', 'float').add(instance.mul(0.6180339)).fract();
    this.outputNode = col;
    this.mrtNode = gbufferMrt(builder, { output: col, gnormal: T.vec4(n.mul(0.5).add(0.5), id) });
    return super.setup(builder);
  }
}
