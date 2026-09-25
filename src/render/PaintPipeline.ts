import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { aoBlurFragment, blurFragment, brightFragment, compositeFragment, finishFragment, fullscreenVertex, kuwaharaFragment, shaftsFragment, ssaoFragment } from './shaders';
import { createPaperTexture } from './PaperTexture';
import type { StudioSettings } from './StudioSettings';

/** Per-frame values the pipeline needs from the game (weather, speed, respawn). */
export interface FrameFx {
  fogColor: THREE.Color;
  rain: number;
  speedLines: number;
  borderPulse: number;
  splash: number;
  /** World-space direction toward the sun, and its colour. */
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  /** Weather fog multiplier (1 = clear, 6 = thick fog). */
  fogDensity: number;
  /** Lightning flash 0..1. */
  flash: number;
  /** Depth of field: focus distance (m) and amount 0..1 (0 = off). */
  dofFocus: number;
  dofAmount: number;
}

/**
 * The renderer (docs/03 §2): one scene pass into a G-buffer (colour + normal/id
 * + depth), then screen passes. The watercolour look uses a half-resolution
 * Kuwahara paint pass and a composite that lays ink over paint, paper and the
 * torn border. The realistic look (Art style → Realistic, or any blend between)
 * adds HDR, ambient occlusion, sun shafts, height fog, filmic tone mapping,
 * FXAA and depth of field. Each pass is switched by the graphics quality tier.
 */
export class PaintPipeline {
  private gbuffer: THREE.WebGLRenderTarget;
  private paintRT: THREE.WebGLRenderTarget;
  private bloomA: THREE.WebGLRenderTarget;
  private bloomB: THREE.WebGLRenderTarget;
  private aoA: THREE.WebGLRenderTarget;
  private aoB: THREE.WebGLRenderTarget;
  private shaftRT: THREE.WebGLRenderTarget;
  private ldrRT: THREE.WebGLRenderTarget;
  private dofA: THREE.WebGLRenderTarget;
  private dofB: THREE.WebGLRenderTarget;
  private readonly white: THREE.DataTexture;
  private readonly black: THREE.DataTexture;
  private readonly ssao: THREE.ShaderMaterial;
  private readonly aoBlur: THREE.ShaderMaterial;
  private readonly shafts: THREE.ShaderMaterial;
  private readonly finish: THREE.ShaderMaterial;
  private gbufferHdr = false;
  private readonly sunNdc = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private readonly quad = new FullScreenQuad();
  private readonly kuwahara: THREE.ShaderMaterial;
  private readonly bright: THREE.ShaderMaterial;
  private readonly blur: THREE.ShaderMaterial;
  private readonly composite: THREE.ShaderMaterial;
  private width = 1;
  private height = 1;
  private scale = 1;
  private boilTimer = 0;
  private frameTimes: number[] = [];
  /** Current dynamic render scale (auto resolution). */
  dynamicScale = 1;
  /** Colour-vision assist: 0 none, 1 protan, 2 deutan, 3 tritan. */
  colourBlind = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly settings: StudioSettings) {
    this.gbufferHdr = this.wantHdr();
    this.gbuffer = this.makeGBuffer(1, 1, this.gbufferHdr);
    this.paintRT = makeTarget(1, 1);
    this.bloomA = makeTarget(1, 1);
    this.bloomB = makeTarget(1, 1);
    this.aoA = makeTarget(1, 1);
    this.aoB = makeTarget(1, 1);
    this.shaftRT = makeTarget(1, 1);
    this.ldrRT = makeTarget(1, 1, THREE.UnsignedByteType);
    this.dofA = makeTarget(1, 1, THREE.UnsignedByteType);
    this.dofB = makeTarget(1, 1, THREE.UnsignedByteType);
    this.white = solid(255);
    this.black = solid(0);
    const depthUniforms = (): Record<string, THREE.IUniform> => ({ tDepth: { value: null }, cameraNear: { value: 0.1 }, cameraFar: { value: 1000 } });
    this.ssao = pass(ssaoFragment, { ...depthUniforms(), tNormal: { value: null }, projScale: { value: new THREE.Vector2(1, 1) }, radius: { value: 1.1 }, samples: { value: 8 }, intensity: { value: 1.4 } });
    this.aoBlur = pass(aoBlurFragment, { ...depthUniforms(), tAO: { value: null }, texel: { value: new THREE.Vector2() } });
    this.shafts = pass(shaftsFragment, { tColor: { value: null }, tNormal: { value: null }, sunUv: { value: new THREE.Vector2() }, aspect: { value: 1 } });
    this.finish = pass(finishFragment, { ...depthUniforms(), tInput: { value: null }, tBlur: { value: null }, resolution: { value: new THREE.Vector2() }, fxaa: { value: 1 }, dofAmount: { value: 0 }, focus: { value: 10 } });

    this.kuwahara = pass(kuwaharaFragment, {
      tColor: { value: null },
      texel: { value: new THREE.Vector2() },
      radius: { value: 4 },
    });
    this.bright = pass(brightFragment, { tColor: { value: null }, hdrBloom: { value: 0 } });
    this.blur = pass(blurFragment, { tInput: { value: null }, direction: { value: new THREE.Vector2() } });
    this.composite = pass(compositeFragment, {
      tColor: { value: null },
      tNormal: { value: null },
      tDepth: { value: null },
      tPaint: { value: null },
      tBloom: { value: null },
      tPaper: { value: createPaperTexture() },
      resolution: { value: new THREE.Vector2() },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000 },
      time: { value: 0 },
      boilSeed: { value: 0 },
      inkStrength: { value: 0 },
      lineWeight: { value: 1 },
      lineCrispness: { value: 0.5 },
      boilAmount: { value: 1 },
      pencilLines: { value: 0 },
      bleedMix: { value: 0.85 },
      edgeDarkening: { value: 0.5 },
      wetEdges: { value: 0.3 },
      granulation: { value: 0.4 },
      paperGrain: { value: 0.5 },
      border: { value: 0.6 },
      borderPulse: { value: 0 },
      glow: { value: 1 },
      saturation: { value: 1 },
      warmth: { value: 0 },
      atmosphere: { value: 0.5 },
      fogColor: { value: new THREE.Color('#dfe8ef') },
      inkColor: { value: new THREE.Color('#2b2622') },
      pageColor: { value: new THREE.Color('#f1ecdd') },
      rain: { value: 0 },
      speedLines: { value: 0 },
      splash: { value: 0 },
      tAO: { value: null },
      tShafts: { value: null },
      realism: { value: 0 },
      exposure: { value: 1 },
      contrast: { value: 1 },
      vignette: { value: 0 },
      aoStrength: { value: 0 },
      shaftStrength: { value: 0 },
      sunColor: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      fogDensity: { value: 1 },
      flash: { value: 0 },
      projInv: { value: new THREE.Matrix4() },
      camWorld: { value: new THREE.Matrix4() },
      cbMode: { value: 0 },
    });
  }

  /** Half-float colour when the tier asks for HDR and the GPU can render to it. */
  private wantHdr(): boolean {
    return this.settings.hdr && this.renderer.extensions.has('EXT_color_buffer_float');
  }

  private makeGBuffer(w: number, h: number, hdr: boolean): THREE.WebGLRenderTarget {
    const depth = new THREE.DepthTexture(w, h);
    depth.type = THREE.UnsignedIntType;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      count: 2,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthTexture: depth,
      depthBuffer: true,
    });
    rt.textures[0].name = 'colour';
    rt.textures[1].name = 'normal-id';
    rt.textures[1].minFilter = rt.textures[1].magFilter = THREE.NearestFilter;
    return rt;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeTargets();
  }

  private resizeTargets(): void {
    if (this.wantHdr() !== this.gbufferHdr) {
      this.gbuffer.dispose();
      this.gbufferHdr = this.wantHdr();
      this.gbuffer = this.makeGBuffer(1, 1, this.gbufferHdr);
    }
    const pr = Math.min(window.devicePixelRatio || 1, this.settings.maxPixelRatio);
    const scale = this.settings.renderScale * (this.settings.autoResolution ? this.dynamicScale : 1) * pr;
    this.scale = scale;
    const w = Math.max(2, Math.round(this.width * scale));
    const h = Math.max(2, Math.round(this.height * scale));
    this.gbuffer.setSize(w, h);
    this.paintRT.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.bloomA.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.bloomB.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.aoA.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.aoB.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.shaftRT.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.ldrRT.setSize(w, h);
    this.dofA.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.dofB.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.composite.uniforms.resolution.value.set(w, h);
    this.finish.uniforms.resolution.value.set(w, h);
  }

  /** Dynamic resolution: hold ~60 fps by lowering render scale before dropping effects (docs/11 §4). */
  private autoBalance(dt: number): void {
    if (!this.settings.autoResolution) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 45) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    this.frameTimes.length = 0;
    let next = this.dynamicScale;
    if (p80 > 1 / 50) next = Math.max(0.55, this.dynamicScale - 0.1);
    else if (p80 < 1 / 58 && this.dynamicScale < 1) next = Math.min(1, this.dynamicScale + 0.05);
    if (next !== this.dynamicScale) {
      this.dynamicScale = next;
      this.resizeTargets();
    }
  }

  get renderScale(): number {
    return this.scale;
  }

  /** Render size in pixels (for photo capture). */
  get size(): { width: number; height: number } {
    return { width: this.gbuffer.width, height: this.gbuffer.height };
  }

  /** Temporarily render at an exact pixel size (photo mode 2×/4K), or back to normal with null. */
  forceSize(px: { width: number; height: number } | null): void {
    if (!px) {
      this.resizeTargets();
      return;
    }
    const { width: w, height: h } = px;
    this.scale = w / Math.max(1, this.width);
    this.gbuffer.setSize(w, h);
    this.paintRT.setSize(w >> 1, h >> 1);
    this.bloomA.setSize(w >> 2, h >> 2);
    this.bloomB.setSize(w >> 2, h >> 2);
    this.aoA.setSize(w >> 1, h >> 1);
    this.aoB.setSize(w >> 1, h >> 1);
    this.shaftRT.setSize(w >> 2, h >> 2);
    this.ldrRT.setSize(w, h);
    this.dofA.setSize(w >> 1, h >> 1);
    this.dofB.setSize(w >> 1, h >> 1);
    this.composite.uniforms.resolution.value.set(w, h);
    this.finish.uniforms.resolution.value.set(w, h);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, dt: number, time: number, fx: FrameFx): void {
    const s = this.settings;
    const r = this.renderer;
    this.autoBalance(dt);

    // 1 · Scene into the G-buffer.
    r.setRenderTarget(this.gbuffer);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);

    const colour = this.gbuffer.textures[0];
    const normal = this.gbuffer.textures[1];
    const depth = this.gbuffer.depthTexture;
    const realism = s.realism;
    const wc = 1 - realism;

    // 2 · Kuwahara colour bleed at half resolution (painted look only).
    const radius = Math.round(s.colourBleed * Math.min(1, wc * 1.5));
    if (radius > 0) {
      this.kuwahara.uniforms.tColor.value = colour;
      this.kuwahara.uniforms.texel.value.set(1 / this.gbuffer.width, 1 / this.gbuffer.height);
      this.kuwahara.uniforms.radius.value = Math.min(6, radius);
      this.draw(this.kuwahara, this.paintRT);
    }

    // 3 · Ambient occlusion at half resolution.
    const aoOn = s.aoQuality > 0 && s.aoStrength > 0;
    if (aoOn) {
      const ao = this.ssao.uniforms;
      this.bindDepth(ao, depth, camera);
      ao.tNormal.value = normal;
      ao.projScale.value.set(camera.projectionMatrix.elements[0], camera.projectionMatrix.elements[5]);
      ao.samples.value = s.aoQuality >= 2 ? 16 : 8;
      this.draw(this.ssao, this.aoA);
      const bl = this.aoBlur.uniforms;
      this.bindDepth(bl, depth, camera);
      bl.tAO.value = this.aoA.texture;
      bl.texel.value.set(1 / this.aoA.width, 1 / this.aoA.height);
      this.draw(this.aoBlur, this.aoB);
    }

    // 4 · Glow: emissive pixels, plus HDR highlights in the realistic look.
    const bloomOn = s.bloomQuality > 0 && s.glow > 0;
    if (bloomOn) {
      this.bright.uniforms.tColor.value = colour;
      this.bright.uniforms.hdrBloom.value = this.gbufferHdr ? realism * 0.6 : 0;
      this.draw(this.bright, this.bloomA);
      const passes = s.bloomQuality >= 2 ? 3 : 2;
      for (let i = 0; i < passes; i++) {
        const spread = 1 + i * 0.75;
        this.blur.uniforms.tInput.value = this.bloomA.texture;
        this.blur.uniforms.direction.value.set(spread / this.bloomA.width, 0);
        this.draw(this.blur, this.bloomB);
        this.blur.uniforms.tInput.value = this.bloomB.texture;
        this.blur.uniforms.direction.value.set(0, spread / this.bloomA.height);
        this.draw(this.blur, this.bloomA);
      }
    }

    // 5 · Sun shafts at quarter resolution, only when the sun is roughly in view.
    let shaftStrength = 0;
    if (s.shafts && s.sunShafts > 0 && fx.flash < 0.05) {
      camera.getWorldDirection(this.camDir);
      const facing = this.camDir.dot(fx.sunDir);
      if (facing > 0.1) {
        this.sunNdc.copy(camera.position).addScaledVector(fx.sunDir, 1000).project(camera);
        const edge = Math.max(Math.abs(this.sunNdc.x), Math.abs(this.sunNdc.y));
        shaftStrength = s.sunShafts * Math.min(1, (facing - 0.1) * 3) * (1 - Math.min(1, Math.max(0, edge - 1) / 0.8)) * (1 - fx.rain * 0.7);
        if (shaftStrength > 0.01) {
          const sh = this.shafts.uniforms;
          sh.tColor.value = colour;
          sh.tNormal.value = normal;
          sh.sunUv.value.set(this.sunNdc.x * 0.5 + 0.5, this.sunNdc.y * 0.5 + 0.5);
          sh.aspect.value = camera.aspect;
          this.draw(this.shafts, this.shaftRT);
        }
      }
    }

    // 6 · Composite (to the screen, or to a buffer when FXAA / depth of field follow).
    const boilFps = s.reducedMotion ? 0 : s.lineBoilFps * (wc > 0.5 ? 1 : 0);
    if (boilFps > 0) {
      this.boilTimer += dt;
      if (this.boilTimer > 1 / boilFps) {
        this.boilTimer = 0;
        this.composite.uniforms.boilSeed.value = Math.random() * 100;
      }
    }
    const u = this.composite.uniforms;
    u.tColor.value = colour;
    u.tNormal.value = normal;
    u.tDepth.value = depth;
    u.tPaint.value = radius > 0 ? this.paintRT.texture : colour;
    u.tBloom.value = bloomOn ? this.bloomA.texture : this.black;
    u.tAO.value = aoOn ? this.aoB.texture : this.white;
    u.tShafts.value = shaftStrength > 0.01 ? this.shaftRT.texture : this.black;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;
    u.time.value = time;
    u.inkStrength.value = s.inkStrength;
    u.lineWeight.value = s.lineWeight * this.scale;
    u.lineCrispness.value = s.lineCrispness;
    u.boilAmount.value = s.reducedMotion ? 0 : s.lineBoilAmount * this.scale * wc;
    u.pencilLines.value = s.pencilLines;
    u.bleedMix.value = radius > 0 ? 0.85 : 0;
    u.edgeDarkening.value = s.edgeDarkening;
    u.wetEdges.value = s.wetEdges * this.scale * wc;
    u.granulation.value = s.granulation;
    u.paperGrain.value = s.paperGrain;
    u.border.value = s.border;
    u.borderPulse.value = fx.borderPulse;
    u.glow.value = s.glow;
    u.saturation.value = s.saturation;
    u.warmth.value = s.warmth;
    u.atmosphere.value = s.atmosphere;
    u.fogColor.value.copy(fx.fogColor);
    u.rain.value = fx.rain;
    u.speedLines.value = s.reducedMotion ? 0 : fx.speedLines * s.speedLines;
    u.splash.value = fx.splash;
    u.realism.value = realism;
    u.exposure.value = s.exposure;
    u.contrast.value = s.contrast;
    u.vignette.value = s.vignette;
    u.aoStrength.value = aoOn ? s.aoStrength : 0;
    u.shaftStrength.value = shaftStrength;
    u.sunColor.value.copy(fx.sunColor);
    u.sunDir.value.copy(fx.sunDir);
    u.fogDensity.value = fx.fogDensity;
    u.flash.value = fx.flash;
    u.projInv.value.copy(camera.projectionMatrixInverse);
    u.camWorld.value.copy(camera.matrixWorld);
    u.cbMode.value = this.colourBlind;

    const dof = fx.dofAmount > 0.01;
    const needFinish = s.fxaa || dof;
    this.draw(this.composite, needFinish ? this.ldrRT : null);
    if (!needFinish) return;

    // 7 · Depth of field blur source, then FXAA + DoF to the screen.
    if (dof) {
      this.blur.uniforms.tInput.value = this.ldrRT.texture;
      this.blur.uniforms.direction.value.set(2 / this.dofA.width, 0);
      this.draw(this.blur, this.dofB);
      this.blur.uniforms.tInput.value = this.dofB.texture;
      this.blur.uniforms.direction.value.set(0, 2 / this.dofA.height);
      this.draw(this.blur, this.dofA);
      this.blur.uniforms.tInput.value = this.dofA.texture;
      this.blur.uniforms.direction.value.set(4 / this.dofA.width, 0);
      this.draw(this.blur, this.dofB);
      this.blur.uniforms.tInput.value = this.dofB.texture;
      this.blur.uniforms.direction.value.set(0, 4 / this.dofA.height);
      this.draw(this.blur, this.dofA);
    }
    const f = this.finish.uniforms;
    this.bindDepth(f, depth, camera);
    f.tInput.value = this.ldrRT.texture;
    f.tBlur.value = this.dofA.texture;
    f.fxaa.value = s.fxaa ? 1 : 0;
    f.dofAmount.value = dof ? fx.dofAmount : 0;
    f.focus.value = fx.dofFocus;
    this.draw(this.finish, null);
  }

  private bindDepth(u: Record<string, THREE.IUniform>, depth: THREE.Texture | null, camera: THREE.PerspectiveCamera): void {
    u.tDepth.value = depth;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;
  }

  private draw(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
  }

  dispose(): void {
    this.gbuffer.dispose();
    this.paintRT.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
    for (const t of [this.aoA, this.aoB, this.shaftRT, this.ldrRT, this.dofA, this.dofB]) t.dispose();
    this.quad.dispose();
  }
}

function makeTarget(w: number, h: number, type: THREE.TextureDataType = THREE.HalfFloatType): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type,
    depthBuffer: false,
  });
}

function solid(v: number): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([v, v, v, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

function pass(fragmentShader: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: fullscreenVertex,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
}
