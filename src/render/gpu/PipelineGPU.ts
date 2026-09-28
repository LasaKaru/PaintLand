import * as THREE from 'three/webgpu';
import { AdaptiveGovernor } from '../Adaptive';
import { LutBank, bakeLut, lutTexture } from '../Lut';
import { createPaperTexture } from '../PaperTexture';
import type { FrameFx, RenderPipeline } from '../PaintPipeline';
import type { StudioSettings } from '../StudioSettings';
import { FBM4, NOISE, T, fn, markFrameUniforms, type N } from './wgsl';
import { lutStrip } from './lutStrip';
import { AO_BLUR, BLUR, BRIGHT, COMPOSITE, COMPOSITE_LIB, FINISH, FINISH_MAIN, KUWAHARA, POST_LIB, SHAFTS, SSAO } from './postWgsl';

type Target = THREE.RenderTarget;

/** A full-screen pass: a quad with its own node material. */
function quadPass(node: N): THREE.QuadMesh {
  const material = new THREE.NodeMaterial();
  material.fragmentNode = node;
  material.depthTest = false;
  material.depthWrite = false;
  return new THREE.QuadMesh(material);
}

function target(type: THREE.TextureDataType = THREE.HalfFloatType): Target {
  return new THREE.RenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type, depthBuffer: false });
}

function solid(v: number): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([v, v, v, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

const LIB = [NOISE, POST_LIB];


/**
 * The WebGPU version of PaintPipeline (render/PaintPipeline.ts): the same
 * G-buffer and passes, the same settings and adaptive quality, drawn with
 * WGSL (render/gpu/postWgsl.ts).
 */
export class PipelineGPU implements RenderPipeline {
  private gbuffer: Target;
  private gbufferHdr: boolean;
  private readonly paintRT = target();
  private readonly bloomA = target();
  private readonly bloomB = target();
  private readonly aoA = target();
  private readonly aoB = target();
  private readonly shaftRT = target();
  private readonly ldrRT = target(THREE.UnsignedByteType);
  private readonly dofA = target(THREE.UnsignedByteType);
  private readonly dofB = target(THREE.UnsignedByteType);
  private readonly white = solid(255);
  private readonly black = solid(0);
  readonly luts = new LutBank();
  private width = 1;
  private height = 1;
  private scale = 1;
  private boilTimer = 0;
  private frameTimes: number[] = [];
  dynamicScale = 1;
  readonly adaptive = new AdaptiveGovernor();
  onAdapt: (() => void) | null = null;
  colourBlind = 0;
  private readonly sunNdc = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  /** Test harness only: draw the final image to this target instead of the canvas. */
  offscreen: Target | null = null;

  // Uniform values (nodes hold references to these objects).
  private readonly u = {
    texelFull: new THREE.Vector2(),
    kRadius: T.uniform(4),
    hdrBloom: T.uniform(0),
    projScale: new THREE.Vector2(1, 1),
    aoSamples: T.uniform(8),
    near: T.uniform(0.1),
    far: T.uniform(1000),
    aoTexel: new THREE.Vector2(),
    sunUv: new THREE.Vector2(),
    aspect: T.uniform(1),
    p: Array.from({ length: 9 }, () => new THREE.Vector4()),
    fogColor: new THREE.Color('#dfe8ef'),
    inkColor: new THREE.Color('#2b2622'),
    pageColor: new THREE.Color('#f1ecdd'),
    sunColor: new THREE.Color(),
    sunDir: new THREE.Vector3(0, 1, 0),
    projInv: new THREE.Matrix4(),
    camWorld: new THREE.Matrix4(),
    resolution: new THREE.Vector2(),
    fxaa: T.uniform(1),
    dofAmount: T.uniform(0),
    focus: T.uniform(10),
  };

  private kuwahara!: THREE.QuadMesh;
  private bright!: THREE.QuadMesh;
  private ssao!: THREE.QuadMesh;
  private aoBlur!: THREE.QuadMesh;
  private shafts!: THREE.QuadMesh;
  private composite!: THREE.QuadMesh;
  private finish!: THREE.QuadMesh;
  private bloomBlur: { quad: THREE.QuadMesh; dir: THREE.Vector2 }[] = [];
  private dofBlur: { quad: THREE.QuadMesh; dir: THREE.Vector2 }[] = [];
  /** Texture inputs the composite switches between frames. */
  private tex!: { paint: N; bloom: N; ao: N; shafts: N; lut: N };

  constructor(private readonly renderer: THREE.WebGPURenderer, private readonly settings: StudioSettings) {
    this.gbufferHdr = settings.hdr;
    this.gbuffer = this.makeGBuffer(this.gbufferHdr);
    this.buildPasses();
  }

  private makeGBuffer(hdr: boolean): Target {
    const depth = new THREE.DepthTexture(1, 1);
    depth.type = THREE.UnsignedIntType;
    const rt = new THREE.RenderTarget(1, 1, {
      count: 2,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthTexture: depth,
      depthBuffer: true,
    });
    // The names match the materials' MRT outputs (render/gpu/PaintNode.ts).
    rt.textures[0].name = 'output';
    rt.textures[1].name = 'gnormal';
    rt.textures[1].minFilter = rt.textures[1].magFilter = THREE.NearestFilter;
    return rt;
  }

  /** (Re)build every pass: the G-buffer's textures are wired into their nodes. */
  private buildPasses(): void {
    const u = this.u;
    const g = this.gbuffer;
    const colour = T.texture(g.textures[0]);
    const sColour = T.sampler(colour);
    const normal = T.texture(g.textures[1]);
    const depth = T.texture(g.depthTexture);
    const uvIn = T.uv();

    this.kuwahara = quadPass(fn(KUWAHARA, LIB)({ tColor: colour, sColor: sColour, uvIn, texel: T.uniform(u.texelFull), radius: u.kRadius }));
    this.bright = quadPass(fn(BRIGHT, LIB)({ tColor: colour, sColor: sColour, uvIn, hdrBloom: u.hdrBloom }));
    this.ssao = quadPass(
      fn(SSAO, LIB)({ tNormal: normal, tDepth: depth, uvIn, frag: T.screenCoordinate, projScale: T.uniform(u.projScale), radius: T.uniform(1.1), samples: u.aoSamples, intensity: T.uniform(1.4), near: u.near, far: u.far }),
    );
    const aoTex = T.texture(this.aoA.texture);
    this.aoBlur = quadPass(fn(AO_BLUR, LIB)({ tAO: aoTex, sAO: T.sampler(aoTex), tDepth: depth, uvIn, texel: T.uniform(u.aoTexel), near: u.near, far: u.far }));
    this.shafts = quadPass(fn(SHAFTS, LIB)({ tColor: colour, sColor: sColour, tNormal: normal, uvIn, sunUv: T.uniform(u.sunUv), aspect: u.aspect }));

    const blurFn = fn(BLUR, LIB);
    const blur = (src: Target) => {
      const dir = new THREE.Vector2();
      const t = T.texture(src.texture);
      return { quad: quadPass(blurFn({ tInput: t, sInput: T.sampler(t), uvIn, direction: T.uniform(dir) })), dir };
    };
    // Bloom: up to three H+V rounds between A and B. Depth of field: two rounds from the LDR image.
    this.bloomBlur = [0, 1, 2].flatMap(() => [blur(this.bloomA), blur(this.bloomB)]);
    this.dofBlur = [blur(this.ldrRT), blur(this.dofB), blur(this.dofA), blur(this.dofB)];

    const paper = createPaperTexture();
    const paperNode = T.texture(paper);
    this.tex = {
      paint: T.texture(g.textures[0]),
      bloom: T.texture(this.black),
      ao: T.texture(this.white),
      shafts: T.texture(this.black),
      lut: T.texture(lutStrip(lutTexture(bakeLut((r, g2, b) => [r, g2, b], 2), 2))),
    };
    this.composite = quadPass(
      fn(COMPOSITE, [NOISE, FBM4, POST_LIB, COMPOSITE_LIB])({
        tColor: colour, sLin: sColour, tNormal: normal, tDepth: depth, tPaint: this.tex.paint, tBloom: this.tex.bloom,
        tPaper: paperNode, sPaper: T.sampler(paperNode), tAO: this.tex.ao, tShafts: this.tex.shafts, tLut: this.tex.lut,
        uvIn, p0: T.uniform(u.p[0]), p1: T.uniform(u.p[1]), p2: T.uniform(u.p[2]), p3: T.uniform(u.p[3]), p4: T.uniform(u.p[4]),
        p5: T.uniform(u.p[5]), p6: T.uniform(u.p[6]), p7: T.uniform(u.p[7]), p8: T.uniform(u.p[8]),
        fogColor: T.uniform(u.fogColor, 'color'), inkColor: T.uniform(u.inkColor, 'color'), pageColor: T.uniform(u.pageColor, 'color'),
        sunColor: T.uniform(u.sunColor, 'color'), sunDir: T.uniform(u.sunDir), projInv: T.uniform(u.projInv), camWorld: T.uniform(u.camWorld),
      }),
    );
    const ldr = T.texture(this.ldrRT.texture);
    this.finish = quadPass(
      fn(FINISH_MAIN, [NOISE, POST_LIB, FINISH])({
        tInput: ldr, sInput: T.sampler(ldr), tBlur: T.texture(this.dofA.texture), tDepth: depth, uvIn,
        resolution: T.uniform(u.resolution), fxaa: u.fxaa, dofAmount: u.dofAmount, focus: u.focus, near: u.near, far: u.far,
      }),
    );
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeTargets();
  }

  private resizeTargets(): void {
    if (this.settings.hdr !== this.gbufferHdr) {
      this.gbuffer.dispose();
      this.gbufferHdr = this.settings.hdr;
      this.gbuffer = this.makeGBuffer(this.gbufferHdr);
      this.buildPasses();
    }
    const pr = Math.min(window.devicePixelRatio || 1, this.settings.maxPixelRatio);
    this.scale = this.settings.renderScale * (this.settings.autoResolution ? this.dynamicScale : 1) * pr;
    this.sizeTargets(Math.max(2, Math.round(this.width * this.scale)), Math.max(2, Math.round(this.height * this.scale)));
  }

  private sizeTargets(w: number, h: number): void {
    const half = (v: number): number => Math.max(2, v >> 1);
    const quarter = (v: number): number => Math.max(2, v >> 2);
    this.gbuffer.setSize(w, h);
    this.paintRT.setSize(half(w), half(h));
    this.bloomA.setSize(quarter(w), quarter(h));
    this.bloomB.setSize(quarter(w), quarter(h));
    this.aoA.setSize(half(w), half(h));
    this.aoB.setSize(half(w), half(h));
    this.shaftRT.setSize(quarter(w), quarter(h));
    this.ldrRT.setSize(w, h);
    this.dofA.setSize(half(w), half(h));
    this.dofB.setSize(half(w), half(h));
    this.offscreen?.setSize(w, h);
    this.u.resolution.set(w, h);
  }

  /** Dynamic resolution, as in PaintPipeline.autoBalance. */
  private autoBalance(dt: number): void {
    if (!this.settings.autoResolution) {
      if (this.adaptive.level > 0) {
        this.adaptive.reset();
        this.onAdapt?.();
      }
      return;
    }
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
    if (this.adaptive.step(p80, this.dynamicScale)) this.onAdapt?.();
  }

  get renderScale(): number {
    return this.scale;
  }

  get size(): { width: number; height: number } {
    return { width: this.gbuffer.width, height: this.gbuffer.height };
  }

  forceSize(px: { width: number; height: number } | null): void {
    if (!px) {
      this.resizeTargets();
      return;
    }
    this.scale = px.width / Math.max(1, this.width);
    this.sizeTargets(px.width, px.height);
  }

  private draw(pass: THREE.QuadMesh, to: Target | null): void {
    this.renderer.setRenderTarget(to ?? this.offscreen);
    pass.render(this.renderer);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, dt: number, time: number, fx: FrameFx): void {
    const s = this.settings;
    const r = this.renderer;
    const u = this.u;
    this.autoBalance(dt);

    // 1 · Scene into the G-buffer (with this frame's sun, weather and time).
    markFrameUniforms();
    r.setRenderTarget(this.gbuffer);
    r.setClearColor(0x000000, 0);
    r.render(scene, camera);

    const realism = s.realism;
    const wc = 1 - realism;
    u.near.value = camera.near;
    u.far.value = camera.far;

    // 2 · Kuwahara colour bleed at half resolution.
    const radius = Math.round(s.colourBleed * Math.min(1, wc * 1.5));
    if (radius > 0) {
      u.texelFull.set(1 / this.gbuffer.width, 1 / this.gbuffer.height);
      u.kRadius.value = Math.min(6, radius);
      this.draw(this.kuwahara, this.paintRT);
    }

    // 3 · Ambient occlusion.
    const aoOn = s.aoQuality > 0 && s.aoStrength > 0 && !this.adaptive.off('ao');
    if (aoOn) {
      u.projScale.set(camera.projectionMatrix.elements[0], camera.projectionMatrix.elements[5]);
      u.aoSamples.value = s.aoQuality >= 2 ? 16 : 8;
      this.draw(this.ssao, this.aoA);
      u.aoTexel.set(1 / this.aoA.width, 1 / this.aoA.height);
      this.draw(this.aoBlur, this.aoB);
    }

    // 4 · Glow.
    const bloomOn = s.bloomQuality > 0 && s.glow > 0;
    if (bloomOn) {
      u.hdrBloom.value = this.gbufferHdr ? realism * 0.6 : 0;
      this.draw(this.bright, this.bloomA);
      const passes = s.bloomQuality >= 2 && !this.adaptive.off('bloom') ? 3 : 2;
      for (let i = 0; i < passes; i++) {
        const spread = 1 + i * 0.75;
        const h = this.bloomBlur[i * 2];
        const v = this.bloomBlur[i * 2 + 1];
        h.dir.set(spread / this.bloomA.width, 0);
        this.draw(h.quad, this.bloomB);
        v.dir.set(0, spread / this.bloomA.height);
        this.draw(v.quad, this.bloomA);
      }
    }

    // 5 · Sun shafts.
    let shaftStrength = 0;
    if (s.shafts && s.sunShafts > 0 && fx.flash < 0.05 && !this.adaptive.off('shafts')) {
      camera.getWorldDirection(this.camDir);
      const facing = this.camDir.dot(fx.sunDir);
      if (facing > 0.1) {
        this.sunNdc.copy(camera.position).addScaledVector(fx.sunDir, 1000).project(camera);
        const edge = Math.max(Math.abs(this.sunNdc.x), Math.abs(this.sunNdc.y));
        shaftStrength = s.sunShafts * Math.min(1, (facing - 0.1) * 3) * (1 - Math.min(1, Math.max(0, edge - 1) / 0.8)) * (1 - fx.rain * 0.7);
        if (shaftStrength > 0.01) {
          u.sunUv.set(this.sunNdc.x * 0.5 + 0.5, this.sunNdc.y * 0.5 + 0.5);
          u.aspect.value = camera.aspect;
          this.draw(this.shafts, this.shaftRT);
        }
      }
    }

    // 6 · Composite.
    const boilFps = s.reducedMotion ? 0 : s.lineBoilFps * (wc > 0.5 ? 1 : 0);
    let boilSeed = u.p[7].w;
    if (boilFps > 0) {
      this.boilTimer += dt;
      if (this.boilTimer > 1 / boilFps) {
        this.boilTimer = 0;
        boilSeed = Math.random() * 100;
      }
    }
    this.tex.paint.value = radius > 0 ? this.paintRT.texture : this.gbuffer.textures[0];
    this.tex.bloom.value = bloomOn ? this.bloomA.texture : this.black;
    this.tex.ao.value = aoOn ? this.aoB.texture : this.white;
    this.tex.shafts.value = shaftStrength > 0.01 ? this.shaftRT.texture : this.black;
    const lut = this.luts.get(fx.lut ?? s.lut);
    const lutMix = lut ? (fx.lut ? Math.max(0.6, s.lutStrength) : s.lutStrength) : 0;
    if (lut) this.tex.lut.value = lutStrip(lut.tex);
    const p = u.p;
    p[0].set(s.inkStrength, s.lineWeight * this.scale, s.lineCrispness, s.reducedMotion ? 0 : s.lineBoilAmount * this.scale * wc);
    p[1].set(s.pencilLines, radius > 0 ? 0.85 : 0, s.edgeDarkening, s.wetEdges * this.scale * wc);
    p[2].set(s.granulation, s.paperGrain, s.border, fx.borderPulse);
    p[3].set(s.glow, s.saturation, s.warmth, s.atmosphere);
    p[4].set(fx.rain, s.reducedMotion ? 0 : fx.speedLines * s.speedLines, fx.splash, realism);
    p[5].set(s.exposure, s.contrast, s.vignette, aoOn ? s.aoStrength : 0);
    p[6].set(shaftStrength, fx.fogDensity, fx.flash, this.colourBlind);
    p[7].set(lutMix, lut ? lut.size : 2, time, boilSeed);
    p[8].set(this.gbuffer.width, this.gbuffer.height, camera.near, camera.far);
    u.fogColor.copy(fx.fogColor);
    u.sunColor.copy(fx.sunColor);
    u.sunDir.copy(fx.sunDir);
    u.projInv.copy(camera.projectionMatrixInverse);
    u.camWorld.copy(camera.matrixWorld);

    const dof = fx.dofAmount > 0.01;
    const needFinish = s.fxaa || dof;
    this.draw(this.composite, needFinish ? this.ldrRT : null);
    if (!needFinish) return;

    // 7 · Depth of field, then FXAA + DoF to the screen.
    if (dof) {
      const steps: [number, number, Target][] = [
        [2 / this.dofA.width, 0, this.dofB],
        [0, 2 / this.dofA.height, this.dofA],
        [4 / this.dofA.width, 0, this.dofB],
        [0, 4 / this.dofA.height, this.dofA],
      ];
      steps.forEach(([x, y, to], i) => {
        this.dofBlur[i].dir.set(x, y);
        this.draw(this.dofBlur[i].quad, to);
      });
    }
    u.fxaa.value = s.fxaa ? 1 : 0;
    u.dofAmount.value = dof ? fx.dofAmount : 0;
    u.focus.value = fx.dofFocus;
    this.draw(this.finish, null);
  }

  dispose(): void {
    for (const t of [this.gbuffer, this.paintRT, this.bloomA, this.bloomB, this.aoA, this.aoB, this.shaftRT, this.ldrRT, this.dofA, this.dofB]) t.dispose();
  }
}
