import * as THREE from 'three';
import { Particles, type ParticleKind } from '../render/Particles';

/** What the photo-mode weather brush can paint into the view. */
export type BrushKind = 'rain' | 'petal' | 'firefly' | 'snow' | 'lantern';
export const BRUSH_KINDS: BrushKind[] = ['rain', 'petal', 'firefly', 'snow', 'lantern'];
export const BRUSH_ICONS: Record<BrushKind, string> = { rain: '🌧', petal: '🌸', firefly: '✨', snow: '❄', lantern: '🏮' };

const _ray = new THREE.Raycaster();
const _p = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _v2 = new THREE.Vector2();

/**
 * The weather brush (photo mode): drag across the picture to paint rain,
 * cherry petals, fireflies, snow or sky lanterns into that part of it. The
 * paint is held still (the world is frozen for the photo) and is wiped when
 * photo mode closes.
 */
export class SkyBrush {
  readonly particles = new Particles(4000);
  kind: BrushKind | null = null;
  /** 0.3–2: how wide each dab of weather is. */
  size = 1;
  painted = 0;

  constructor() {
    this.particles.still = true;
    this.particles.points.name = 'sky-brush';
    this.particles.points.renderOrder = 2;
  }

  /** Paint at a screen point (normalised device coordinates, −1…1). Returns how many particles went down. */
  paint(ndcX: number, ndcY: number, camera: THREE.PerspectiveCamera, rand: () => number = Math.random): number {
    if (!this.kind) return 0;
    _ray.setFromCamera(_v2.set(ndcX, ndcY), camera);
    const kind = this.kind as ParticleKind;
    let n = 0;
    const count = Math.round((this.kind === 'lantern' ? 2 : this.kind === 'rain' ? 5 : 8) * this.size);
    for (let i = 0; i < count; i++) {
      // Spread through depth so the weather has near and far drops.
      const d = 6 + rand() * 50 * this.size;
      _ray.ray.at(d, _p);
      const spread = d * 0.06 * this.size;
      _p.x += (rand() - 0.5) * spread;
      _p.y += (rand() - 0.5) * spread;
      _p.z += (rand() - 0.5) * spread;
      if (this.kind === 'rain') {
        // A streak: a short column of drops.
        for (let k = 0; k < 7; k++) {
          this.particles.emit(kind, _p.clone().setY(_p.y - k * 0.12 * (1 + d / 40)), _zero, 1, 0);
          n++;
        }
      } else {
        this.particles.emit(kind, _p, _zero, 1, 0);
        n++;
      }
    }
    this.painted += n;
    return n;
  }

  clear(): void {
    this.particles.clear();
    this.painted = 0;
  }

  update(viewportHeight: number, camera: THREE.PerspectiveCamera): void {
    this.particles.update(0, viewportHeight, camera);
  }
}
