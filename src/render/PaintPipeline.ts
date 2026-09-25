import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { blurFragment, brightFragment, compositeFragment, fullscreenVertex, kuwaharaFragment } from './shaders';
import { createPaperTexture } from './PaperTexture';
import type { StudioSettings } from './StudioSettings';

/** Per-frame values the pipeline needs from the game (weather, speed, respawn). */
export interface FrameFx {
  fogColor: THREE.Color;
  rain: number;
  speedLines: number;
  borderPulse: number;
  splash: number;
}

/**
 * The watercolour renderer (docs/03 §2): one scene pass into a G-buffer
 * (colour + normal/id + depth), a half-resolution Kuwahara paint pass,
 * a quarter-resolution glow, and one composite pass that lays ink over paint,
 * then paper, grade, weather and the torn border.
 */
export class PaintPipeline {
  private gbuffer: THREE.WebGLRenderTarget;
  private paintRT: THREE.WebGLRenderTarget;
  private bloomA: THREE.WebGLRenderTarget;
  private bloomB: THREE.WebGLRenderTarget;
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

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly settings: StudioSettings) {
    this.gbuffer = this.makeGBuffer(1, 1);
    this.paintRT = makeTarget(1, 1);
    this.bloomA = makeTarget(1, 1);
    this.bloomB = makeTarget(1, 1);

    this.kuwahara = pass(kuwaharaFragment, {
      tColor: { value: null },
      texel: { value: new THREE.Vector2() },
      radius: { value: 4 },
    });
    this.bright = pass(brightFragment, { tColor: { value: null } });
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
    });
  }

  private makeGBuffer(w: number, h: number): THREE.WebGLRenderTarget {
    const depth = new THREE.DepthTexture(w, h);
    depth.type = THREE.UnsignedIntType;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      count: 2,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.UnsignedByteType,
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
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.settings.renderScale * (this.settings.autoResolution ? this.dynamicScale : 1) * pr;
    this.scale = scale;
    const w = Math.max(2, Math.round(this.width * scale));
    const h = Math.max(2, Math.round(this.height * scale));
    this.gbuffer.setSize(w, h);
    this.paintRT.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.bloomA.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.bloomB.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.composite.uniforms.resolution.value.set(w, h);
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

    // 2 · Kuwahara colour bleed at half resolution.
    const radius = Math.round(s.colourBleed);
    if (radius > 0) {
      this.kuwahara.uniforms.tColor.value = colour;
      this.kuwahara.uniforms.texel.value.set(1 / this.gbuffer.width, 1 / this.gbuffer.height);
      this.kuwahara.uniforms.radius.value = Math.min(6, radius);
      this.draw(this.kuwahara, this.paintRT);
    }

    // 3 · Glow.
    this.bright.uniforms.tColor.value = colour;
    this.draw(this.bright, this.bloomA);
    for (let i = 0; i < 2; i++) {
      this.blur.uniforms.tInput.value = this.bloomA.texture;
      this.blur.uniforms.direction.value.set(1 / this.bloomA.width, 0);
      this.draw(this.blur, this.bloomB);
      this.blur.uniforms.tInput.value = this.bloomB.texture;
      this.blur.uniforms.direction.value.set(0, 1 / this.bloomA.height);
      this.draw(this.blur, this.bloomA);
    }

    // 4 · Composite to the screen.
    const boilFps = s.reducedMotion ? 0 : s.lineBoilFps;
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
    u.tDepth.value = this.gbuffer.depthTexture;
    u.tPaint.value = radius > 0 ? this.paintRT.texture : colour;
    u.tBloom.value = this.bloomA.texture;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;
    u.time.value = time;
    u.inkStrength.value = s.inkStrength;
    u.lineWeight.value = s.lineWeight * this.scale;
    u.lineCrispness.value = s.lineCrispness;
    u.boilAmount.value = s.reducedMotion ? 0 : s.lineBoilAmount * this.scale;
    u.pencilLines.value = s.pencilLines;
    u.bleedMix.value = radius > 0 ? 0.85 : 0;
    u.edgeDarkening.value = s.edgeDarkening;
    u.wetEdges.value = s.wetEdges * this.scale;
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
    this.draw(this.composite, null);
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
    this.quad.dispose();
  }
}

function makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    depthBuffer: false,
  });
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
