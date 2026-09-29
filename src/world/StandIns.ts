import * as THREE from 'three';
import { ModelKit } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

/** Beyond this distance (metres) a townsperson is drawn as a simple stand-in instead of a full model. */
export const STAND_IN_FAR = 55;

let geos: THREE.BufferGeometry[] | null = null;
let material: PaintMaterial | null = null;

/** Body (tinted by the top colour, legs a darker shade), head (skin) and hair (hair colour). White vertex colours take the tint. */
function standInGeometry(): THREE.BufferGeometry[] {
  return (geos ??= [
    new ModelKit()
      .cylinder(0.2, 0.24, 0.72, 7, '#ffffff', { position: [0, 1.06, 0] })
      .cylinder(0.14, 0.12, 0.76, 6, '#6e6e6e', { position: [0, 0.38, 0] })
      .build(0),
    new ModelKit().blob(0.2, '#ffffff', { position: [0, 1.6, 0], detail: 1 }).build(0),
    new ModelKit().blob(0.215, '#ffffff', { position: [0, 1.68, 0.02], scale: [1.02, 0.62, 1.02], detail: 1 }).build(0),
  ]);
}

/**
 * Far-away people drawn cheaply (docs/11 §4 "crowds"): three instanced meshes
 * for everyone beyond STAND_IN_FAR, coloured per person, so a busy town costs
 * a few draw calls instead of a few hundred animated models. Fill it each
 * frame between begin() and end().
 */
export class StandIns {
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[] = [];
  private capacity = 0;
  private n = 0;
  private readonly c = new THREE.Color();

  constructor(capacity = 64) {
    this.group.name = 'stand-ins';
    this.grow(capacity);
  }

  /** How many stand-ins were drawn last frame. */
  get count(): number {
    return this.n;
  }

  private grow(capacity: number): void {
    for (const m of this.meshes) m.removeFromParent();
    material ??= new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.05 });
    this.meshes = standInGeometry().map((g) => {
      const m = new THREE.InstancedMesh(g, material!, capacity);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = false;
      m.count = 0;
      m.setColorAt(0, this.c.set('#ffffff'));
      this.group.add(m);
      return m;
    });
    this.capacity = capacity;
  }

  begin(): void {
    this.n = 0;
  }

  /** One person: where they stand (matrix, with their height as scale) and their colours. */
  add(matrix: THREE.Matrix4, top: string, skin: string, hair: string): void {
    if (this.n >= this.capacity) {
      // Grow (rare): keep what's been added this frame.
      const old = this.meshes.map((m) => ({ mats: m.instanceMatrix.array.slice(0, this.n * 16), cols: m.instanceColor?.array.slice(0, this.n * 3) }));
      this.grow(this.capacity * 2);
      this.meshes.forEach((m, i) => {
        m.instanceMatrix.array.set(old[i].mats);
        if (old[i].cols && m.instanceColor) m.instanceColor.array.set(old[i].cols!);
      });
    }
    const [body, head, hairMesh] = this.meshes;
    for (const m of this.meshes) m.setMatrixAt(this.n, matrix);
    body.setColorAt(this.n, this.c.set(top));
    head.setColorAt(this.n, this.c.set(skin));
    hairMesh.setColorAt(this.n, this.c.set(hair));
    this.n++;
  }

  end(): void {
    for (const m of this.meshes) {
      m.count = this.n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
