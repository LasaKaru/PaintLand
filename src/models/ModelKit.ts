import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash3 } from '../core/Random';

export interface PartOptions {
  position?: THREE.Vector3Like | [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  /** 1 = this part lights up at night (windows, lanterns). */
  nightGlow?: number;
  /** Surface pattern drawn by the paint shader (see Pattern). */
  pattern?: number;
}

/** Surface patterns understood by PaintMaterial. */
export const Pattern = {
  None: 0,
  Brick: 1,
  RoofTiles: 2,
  Planks: 3,
  Stone: 4,
  Leaves: 5,
  Tea: 6,
  Thatch: 7,
  Grass: 8,
  Sandstone: 9,
  Marble: 10,
} as const;

/**
 * A tiny modelling toolkit: add primitives with a colour and a transform,
 * then bake them into one flat-shaded, vertex-coloured geometry.
 * `build()` wobbles vertices a little so nothing is perfectly straight
 * (docs/03 §1 "slightly crooked").
 */
export class ModelKit {
  private parts: THREE.BufferGeometry[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3();
  private readonly p = new THREE.Vector3();
  private readonly c = new THREE.Color();

  add(geometry: THREE.BufferGeometry, colour: THREE.ColorRepresentation, opts: PartOptions = {}): this {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
    const pos = opts.position;
    if (Array.isArray(pos)) this.p.set(pos[0], pos[1], pos[2]);
    else if (pos) this.p.set(pos.x, pos.y, pos.z);
    else this.p.set(0, 0, 0);
    const r = opts.rotation ?? [0, 0, 0];
    this.q.setFromEuler(this.e.set(r[0], r[1], r[2]));
    const sc = opts.scale ?? 1;
    if (typeof sc === 'number') this.s.setScalar(sc);
    else this.s.set(sc[0], sc[1], sc[2]);
    g.applyMatrix4(this.m.compose(this.p, this.q, this.s));

    this.c.set(colour);
    const count = g.attributes.position.count;
    const colours = new Float32Array(count * 4);
    const glow = opts.nightGlow ?? 0;
    for (let i = 0; i < count; i++) {
      colours[i * 4] = this.c.r;
      colours[i * 4 + 1] = this.c.g;
      colours[i * 4 + 2] = this.c.b;
      colours[i * 4 + 3] = glow;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colours, 4));
    g.setAttribute('pattern', new THREE.BufferAttribute(new Float32Array(count).fill(opts.pattern ?? 0), 1));
    this.parts.push(g);
    if (g !== geometry) geometry.dispose();
    return this;
  }

  box(w: number, h: number, d: number, colour: THREE.ColorRepresentation, opts: PartOptions = {}): this {
    return this.add(new THREE.BoxGeometry(w, h, d), colour, opts);
  }

  cylinder(rTop: number, rBottom: number, h: number, segments: number, colour: THREE.ColorRepresentation, opts: PartOptions = {}): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, segments), colour, opts);
  }

  /** Faceted blob (foliage, rocks, clouds). */
  blob(radius: number, colour: THREE.ColorRepresentation, opts: PartOptions & { detail?: number; roughness?: number; seed?: number } = {}): this {
    const g = new THREE.IcosahedronGeometry(radius, opts.detail ?? 1);
    const rough = opts.roughness ?? 0.18;
    const seed = opts.seed ?? 0;
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const k = 1 + (hash3(v.x + seed, v.y, v.z) - 0.5) * 2 * rough;
      pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
    }
    return this.add(g, colour, opts);
  }

  /** Triangular prism roof, ridge along X, sitting on y = 0. */
  gable(w: number, h: number, d: number, colour: THREE.ColorRepresentation, opts: PartOptions = {}): this {
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(d / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(Math.PI / 2);
    return this.add(g, colour, opts);
  }

  get isEmpty(): boolean {
    return this.parts.length === 0;
  }

  build(wobble = 0.03, seed = 0): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    if (!merged) throw new Error('ModelKit: nothing to merge');
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (wobble > 0) {
      const pos = merged.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        pos.setXYZ(
          i,
          x + (hash3(x + seed, y, z) - 0.5) * wobble,
          y + (hash3(y + seed, z, x) - 0.5) * wobble,
          z + (hash3(z + seed, x, y) - 0.5) * wobble,
        );
      }
    }
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  }
}
