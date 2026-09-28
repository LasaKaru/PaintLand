import * as THREE from 'three';
import { paintShared } from './PaintMaterial';
import { backend } from './Backend';

export type ParticleKind = 'smoke' | 'dust' | 'spark' | 'splash' | 'confetti' | 'firework' | 'flame' | 'firefly' | 'exhaust' | 'rain' | 'petal' | 'snow' | 'lantern';

interface KindDef {
  life: [number, number];
  size: [number, number];
  /** Size multiplier at end of life. */
  grow: number;
  drag: number;
  gravity: number;
  glow: number;
  colours: string[];
}

const KINDS: Record<ParticleKind, KindDef> = {
  smoke: { life: [0.8, 1.6], size: [0.5, 0.9], grow: 3.2, drag: 2.2, gravity: -0.6, glow: 0, colours: ['#e9e6e1', '#d8d4ce', '#f4f2ee'] },
  dust: { life: [0.7, 1.3], size: [0.4, 0.8], grow: 2.6, drag: 2.5, gravity: -0.3, glow: 0, colours: ['#d2a27a', '#c48a5e', '#e0b893'] },
  spark: { life: [0.25, 0.55], size: [0.08, 0.14], grow: 0.4, drag: 0.6, gravity: 14, glow: 1, colours: ['#ffd27a', '#ffb347', '#fff1c2'] },
  splash: { life: [0.35, 0.7], size: [0.12, 0.25], grow: 1.6, drag: 1.2, gravity: 9, glow: 0, colours: ['#e6f1f6', '#cfe3ec'] },
  confetti: { life: [1.6, 2.6], size: [0.16, 0.26], grow: 1, drag: 1.4, gravity: 3.5, glow: 0.35, colours: ['#e8559a', '#f4d23b', '#5dbb3f', '#3e9fd8', '#9a5bd6', '#f08a2e'] },
  firework: { life: [1.3, 2.2], size: [0.55, 0.9], grow: 0.5, drag: 1.3, gravity: 3, glow: 1, colours: ['#ff5d8f', '#ffd23f', '#5dfdcb', '#7cb8ff', '#ff9f43', '#c56cff'] },
  flame: { life: [0.25, 0.5], size: [0.18, 0.3], grow: 1.8, drag: 2, gravity: -4, glow: 1, colours: ['#ffb347', '#ff7a2e', '#ffe08a'] },
  firefly: { life: [3, 6], size: [0.1, 0.16], grow: 1, drag: 0.5, gravity: 0, glow: 1, colours: ['#e8ff8a', '#fff6a0'] },
  exhaust: { life: [0.2, 0.4], size: [0.25, 0.4], grow: 0.3, drag: 3, gravity: -1, glow: 0.9, colours: ['#7fc8ff', '#ffb35c', '#ffe08a'] },
  // The photo-mode weather brush.
  rain: { life: [2, 3], size: [0.07, 0.1], grow: 1, drag: 0, gravity: 30, glow: 0.45, colours: ['#dbe9f2', '#c4d8e6', '#eef5fa'] },
  petal: { life: [4, 7], size: [0.3, 0.45], grow: 1, drag: 1.5, gravity: 0.6, glow: 0.6, colours: ['#f7b8cf', '#f3a3c0', '#fbd3e1', '#ffffff'] },
  snow: { life: [5, 8], size: [0.2, 0.32], grow: 1, drag: 2, gravity: 0.8, glow: 0.6, colours: ['#ffffff', '#f2f6fb'] },
  lantern: { life: [8, 12], size: [0.5, 0.8], grow: 1, drag: 1, gravity: -0.5, glow: 1, colours: ['#ffb347', '#ff9f43', '#ffd27a'] },
};

const vertex = /* glsl */ `
attribute float size;
attribute vec4 pcolor;
attribute float fade;
uniform float uScale;
varying vec4 vColor;
varying float vFade;
void main() {
  vColor = pcolor;
  vFade = fade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size > 0.0 ? max(1.5, size * uScale / -mv.z) : 0.0;
}
`;

const fragment = /* glsl */ `
layout(location = 0) out highp vec4 gColor;
layout(location = 1) out highp vec4 gNormal;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTint;
uniform float uRealism;
varying vec4 vColor;
varying float vFade;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  // Screen-door fade: soft puffs without sorting or blending (works with the G-buffer).
  if (hash(gl_FragCoord.xy) > vFade * (1.0 - r * 0.55)) discard;
  vec3 n = normalize(vec3(c.x, -c.y, sqrt(max(0.0, 1.0 - r))));
  float lit = 0.6 + 0.4 * max(dot(n, uSunDir), 0.0);
  vec3 col = vColor.rgb * mix(uSkyTint * 0.35 + 0.7, uSunColor, lit * 0.5) * mix(1.0, lit + 0.2, uRealism);
  col = mix(col, vColor.rgb * 1.6, vColor.a);
  gColor = vec4(col, vColor.a);
  gNormal = vec4(n * 0.5 + 0.5, 0.777);
}
`;

/**
 * One pooled particle system for the whole game (docs/03 §8 "effects"):
 * tyre smoke, dust on earth roads, sparks, rain spray, exhaust, confetti and
 * fireflies. CPU-simulated (a few hundred points), drawn as lit sprites into
 * the same G-buffer as everything else, so they get ink lines and paint too.
 */
export class Particles {
  /** Points with WebGL; with WebGPU (which draws points one pixel wide) an instanced quad per particle. */
  readonly points: THREE.Points | THREE.Mesh;
  private readonly dynamic: THREE.BufferAttribute[];
  private readonly max: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly grav: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly fade: Float32Array;
  private readonly base: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly drag: Float32Array;
  private readonly grow: Float32Array;
  private readonly wander: Uint8Array;
  private cursor = 0;
  private readonly c = new THREE.Color();
  readonly material: THREE.ShaderMaterial;
  /** Multiplier from the graphics tier (Low halves emission). */
  density = 1;
  /** Hold every particle where it is, full size and opacity (the photo-mode weather brush). */
  still = false;

  constructor(max = 900) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.grav = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.fade = new Float32Array(max);
    this.base = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.wander = new Uint8Array(max);
    const gpu = backend.gpu;
    const attr = (array: Float32Array, size: number): THREE.BufferAttribute =>
      (gpu ? new THREE.InstancedBufferAttribute(array, size) : new THREE.BufferAttribute(array, size)).setUsage(THREE.DynamicDrawUsage);
    this.dynamic = [attr(this.pos, 3), attr(this.col, 4), attr(this.size, 1), attr(this.fade, 1)];
    let g: THREE.BufferGeometry;
    if (gpu) {
      const q = new THREE.InstancedBufferGeometry();
      q.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
      q.setIndex([0, 1, 2, 0, 2, 3]);
      q.instanceCount = max;
      g = q;
      g.setAttribute('ipos', this.dynamic[0]);
    } else {
      g = new THREE.BufferGeometry();
      g.setAttribute('position', this.dynamic[0]);
    }
    g.setAttribute('pcolor', this.dynamic[1]);
    g.setAttribute('size', this.dynamic[2]);
    g.setAttribute('fade', this.dynamic[3]);
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: gpu ? THREE.DoubleSide : THREE.FrontSide,
      uniforms: {
        uScale: { value: 800 },
        uSunDir: paintShared.uSunDir,
        uSunColor: paintShared.uSunColor,
        uSkyTint: paintShared.uSkyTint,
        uRealism: paintShared.uRealism,
      },
    });
    // The WebGPU renderer draws this with its node twin (render/gpu/ParticleNode.ts).
    (this.material as { type: string }).type = 'InkParticles';
    this.points = gpu ? new THREE.Mesh(g, this.material) : new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.name = 'particles';
  }

  /** Emit `count` particles of a kind around `at`, moving with `velocity` ± `spread`. */
  emit(kind: ParticleKind, at: THREE.Vector3, velocity: THREE.Vector3, count: number, spread = 1, up: THREE.Vector3 = _up): void {
    const k = KINDS[kind];
    let n = count * this.density;
    // Fractional counts emit with probability, so per-frame emission rates work at any fps.
    while (n > 0) {
      if (n < 1 && Math.random() > n) break;
      n -= 1;
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const i3 = i * 3;
      this.pos[i3] = at.x + (Math.random() - 0.5) * spread * 0.3;
      this.pos[i3 + 1] = at.y + (Math.random() - 0.5) * spread * 0.3;
      this.pos[i3 + 2] = at.z + (Math.random() - 0.5) * spread * 0.3;
      this.vel[i3] = velocity.x + (Math.random() - 0.5) * spread;
      this.vel[i3 + 1] = velocity.y + (Math.random() - 0.5) * spread;
      this.vel[i3 + 2] = velocity.z + (Math.random() - 0.5) * spread;
      this.grav[i3] = -up.x * k.gravity;
      this.grav[i3 + 1] = -up.y * k.gravity;
      this.grav[i3 + 2] = -up.z * k.gravity;
      this.c.set(k.colours[Math.floor(Math.random() * k.colours.length)]);
      this.col[i * 4] = this.c.r;
      this.col[i * 4 + 1] = this.c.g;
      this.col[i * 4 + 2] = this.c.b;
      this.col[i * 4 + 3] = k.glow;
      this.base[i] = k.size[0] + Math.random() * (k.size[1] - k.size[0]);
      this.maxLife[i] = this.life[i] = k.life[0] + Math.random() * (k.life[1] - k.life[0]);
      this.drag[i] = k.drag;
      this.grow[i] = k.grow;
      this.wander[i] = kind === 'firefly' ? 1 : 0;
    }
  }

  update(dt: number, viewportHeight: number, camera: THREE.PerspectiveCamera): void {
    this.material.uniforms.uScale.value = viewportHeight * camera.projectionMatrix.elements[5] * 0.5;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        continue;
      }
      if (this.still) {
        this.size[i] = this.base[i];
        this.fade[i] = 1;
        continue;
      }
      this.life[i] -= dt;
      const i3 = i * 3;
      const d = Math.exp(-this.drag[i] * dt);
      if (this.wander[i]) {
        this.vel[i3] += (Math.random() - 0.5) * 3 * dt;
        this.vel[i3 + 1] += (Math.random() - 0.5) * 3 * dt;
        this.vel[i3 + 2] += (Math.random() - 0.5) * 3 * dt;
        // Fireflies blink.
        this.col[i * 4 + 3] = 0.4 + 0.6 * Math.max(0, Math.sin(this.life[i] * 5 + i));
      }
      for (let a = 0; a < 3; a++) {
        this.vel[i3 + a] = this.vel[i3 + a] * d + this.grav[i3 + a] * dt;
        this.pos[i3 + a] += this.vel[i3 + a] * dt;
      }
      const t = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.life[i] > 0 ? this.base[i] * (1 + (this.grow[i] - 1) * t) : 0;
      this.fade[i] = Math.min(1, (1 - t) * 1.6) * Math.min(1, t * 8 + 0.3);
    }
    for (const a of this.dynamic) a.needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.size.fill(0);
  }
}

const _up = new THREE.Vector3(0, 1, 0);
