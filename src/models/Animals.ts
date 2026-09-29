import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

export const SPECIES = ['dog', 'cat', 'crow', 'cow', 'deer', 'kangaroo', 'elephant'] as const;
export type Species = (typeof SPECIES)[number];
export type AnimalPose = 'idle' | 'walk' | 'run' | 'sit' | 'lie' | 'eat' | 'hop' | 'fly' | 'bow';

const INK = '#2b2622';

/** Coats for each animal (picked by a seed). */
export const COATS: Record<Species, string[]> = {
  dog: ['#c8955a', '#2b2622', '#e8d8c0', '#b86b3a', '#8a6a4a'],
  cat: ['#8a8a8e', '#e0903a', '#2b2622', '#efe9dd', '#b0763f'],
  crow: ['#2b2622'],
  cow: ['#efe9dd', '#8a5a3a', '#c9b89a', '#5a4030'],
  deer: ['#b0763f', '#a86a38'],
  kangaroo: ['#b07a4a', '#9a6a44'],
  elephant: ['#8a8a8e', '#7d7a80'],
};

interface Shape {
  /** Height of the hips above the ground. */
  legLen: number;
  body: [number, number, number];
  /** Where each leg hangs from, relative to the body centre at hip height. */
  legs: [number, number][];
  legR: number;
  /** Scale for the collision radius. */
  radius: number;
}

const SHAPES: Record<Species, Shape> = {
  dog: { legLen: 0.32, body: [0.24, 0.26, 0.6], legs: [[-0.08, -0.22], [0.08, -0.22], [-0.08, 0.22], [0.08, 0.22]], legR: 0.035, radius: 0.35 },
  cat: { legLen: 0.18, body: [0.15, 0.16, 0.38], legs: [[-0.05, -0.13], [0.05, -0.13], [-0.05, 0.13], [0.05, 0.13]], legR: 0.022, radius: 0.22 },
  crow: { legLen: 0.08, body: [0.12, 0.12, 0.24], legs: [[-0.03, 0], [0.03, 0]], legR: 0.008, radius: 0.12 },
  cow: { legLen: 0.62, body: [0.52, 0.55, 1.2], legs: [[-0.17, -0.45], [0.17, -0.45], [-0.17, 0.45], [0.17, 0.45]], legR: 0.06, radius: 0.8 },
  deer: { legLen: 0.58, body: [0.3, 0.32, 0.78], legs: [[-0.1, -0.28], [0.1, -0.28], [-0.1, 0.28], [0.1, 0.28]], legR: 0.03, radius: 0.5 },
  kangaroo: { legLen: 0.45, body: [0.34, 0.6, 0.36], legs: [[-0.13, 0.05], [0.13, 0.05], [-0.1, -0.2], [0.1, -0.2]], legR: 0.06, radius: 0.45 },
  elephant: { legLen: 0.95, body: [1.25, 1.2, 2.0], legs: [[-0.42, -0.7], [0.42, -0.7], [-0.42, 0.7], [0.42, 0.7]], legR: 0.2, radius: 1.5 },
};

let material: PaintMaterial | null = null;
const mat = (): PaintMaterial => (material ??= new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.06 }));
const geos = new Map<string, THREE.BufferGeometry>();
const cached = (key: string, make: () => ModelKit): THREE.BufferGeometry => {
  let g = geos.get(key);
  if (!g) geos.set(key, (g = make().build(0.01, key.length)));
  return g;
};

/**
 * A small watercolour animal (docs/04 §7 "life"): body, head, legs and tail as
 * separate parts on pivots so walking, sitting, lying down, grazing and
 * bowing are procedural like the people. Faces −Z, origin at the feet.
 */
export class AnimalModel {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly head = new THREE.Group();
  readonly tail = new THREE.Group();
  readonly legs: THREE.Group[] = [];
  readonly wings: THREE.Group[] = [];
  /** An elephant's trunk. */
  readonly trunk = new THREE.Group();
  readonly shape: Shape;
  private phase = Math.random() * 6;
  /** Wag the tail (a happy dog). */
  happy = false;

  constructor(readonly species: Species, readonly coat = COATS[species][0]) {
    const s = (this.shape = SHAPES[species]);
    this.root.name = `animal-${species}`;
    const [bw, bh, bd] = s.body;
    const c = coat;
    const dark = shade(c, 0.75);
    const light = shade(c, 1.25);
    const k = `${species}:${c}`;
    const part = (name: string, make: () => ModelKit): THREE.Mesh => {
      const m = new THREE.Mesh(cached(`${k}:${name}`, make), mat());
      m.castShadow = true;
      return m;
    };
    this.body.position.y = s.legLen;
    this.root.add(this.body);

    // Body.
    this.body.add(
      part('body', () => {
        const kit = new ModelKit();
        if (species === 'crow') kit.blob(bw * 0.6, c, { position: [0, bh * 0.5, 0], scale: [1, 0.9, 1.7], detail: 1 });
        else if (species === 'kangaroo') {
          kit.blob(0.2, c, { position: [0, 0.3, 0], scale: [0.95, 1.6, 0.95], rotation: [0.25, 0, 0], detail: 1 });
          kit.blob(0.16, light, { position: [0, 0.2, -0.1], scale: [0.8, 1.2, 0.6], detail: 0 });
        } else {
          kit.blob(Math.max(bw, bh) * 0.55, c, { position: [0, bh * 0.45, 0], scale: [bw / Math.max(bw, bh), bh / Math.max(bw, bh), bd / Math.max(bw, bh)], detail: 1, roughness: 0.06 });
          if (species === 'cow') kit.blob(0.16, c, { position: [0, bh * 0.9, -bd * 0.3], scale: [1, 0.9, 1.2], detail: 0 }); // the zebu hump
          if (species === 'cow' && c === '#efe9dd') kit.blob(0.18, INK, { position: [0.2, bh * 0.55, 0.15], scale: [0.4, 1, 1.2], detail: 0 });
          if (species === 'deer') for (let i = 0; i < 6; i++) kit.blob(0.025, '#f6f0e4', { position: [(i % 2 ? 1 : -1) * 0.1, bh * 0.75, -0.2 + i * 0.08], detail: 0 });
        }
        return kit;
      }),
    );

    // Head (with neck for the tall ones).
    const neck: Record<Species, [number, number, number]> = {
      dog: [0, bh * 0.75, -bd * 0.5],
      cat: [0, bh * 0.8, -bd * 0.5],
      crow: [0, bh * 0.85, -bd * 0.55],
      cow: [0, bh * 0.7, -bd * 0.5],
      deer: [0, bh * 0.8, -bd * 0.45],
      kangaroo: [0, 0.62, -0.05],
      elephant: [0, bh * 0.75, -bd * 0.5],
    };
    this.head.position.set(...neck[species]);
    this.body.add(this.head);
    this.head.add(
      part('head', () => {
        const kit = new ModelKit();
        switch (species) {
          case 'dog':
            kit.blob(0.13, c, { position: [0, 0.1, -0.06], detail: 1 });
            kit.box(0.09, 0.08, 0.14, light, { position: [0, 0.06, -0.19] });
            kit.blob(0.025, INK, { position: [0, 0.09, -0.27], detail: 0 });
            for (const x of [-0.08, 0.08]) kit.box(0.05, 0.1, 0.03, dark, { position: [x, 0.2, -0.03], rotation: [0, 0, x > 0 ? -0.3 : 0.3] });
            break;
          case 'cat':
            kit.blob(0.085, c, { position: [0, 0.07, -0.04], detail: 1 });
            for (const x of [-0.045, 0.045]) kit.cylinder(0.001, 0.03, 0.06, 4, c, { position: [x, 0.16, -0.03] });
            kit.blob(0.012, '#f09a8a', { position: [0, 0.06, -0.12], detail: 0 });
            break;
          case 'crow':
            kit.blob(0.05, c, { position: [0, 0.03, -0.02], detail: 0 });
            kit.cylinder(0.001, 0.018, 0.07, 4, '#3a3530', { position: [0, 0.025, -0.09], rotation: [-Math.PI / 2, 0, 0] });
            break;
          case 'cow':
            kit.box(0.26, 0.28, 0.42, c, { position: [0, 0.02, -0.18], rotation: [0.5, 0, 0] });
            kit.box(0.22, 0.14, 0.12, '#f0b8a8', { position: [0, -0.12, -0.38] });
            for (const x of [-0.12, 0.12]) kit.cylinder(0.015, 0.03, 0.18, 5, '#e8dcc0', { position: [x * 1.2, 0.2, -0.05], rotation: [0, 0, x > 0 ? -0.5 : 0.5] });
            for (const x of [-0.17, 0.17]) kit.box(0.12, 0.05, 0.08, dark, { position: [x, 0.08, -0.05] });
            break;
          case 'deer':
            kit.cylinder(0.06, 0.08, 0.36, 6, c, { position: [0, 0.16, 0], rotation: [-0.35, 0, 0] });
            kit.box(0.12, 0.12, 0.24, c, { position: [0, 0.34, -0.12], rotation: [0.35, 0, 0] });
            kit.blob(0.02, INK, { position: [0, 0.3, -0.25], detail: 0 });
            for (const x of [-0.08, 0.08]) kit.box(0.07, 0.04, 0.02, c, { position: [x, 0.42, -0.04], rotation: [0, 0, x > 0 ? -0.5 : 0.5] });
            // Short antlers.
            for (const x of [-0.05, 0.05]) kit.cylinder(0.008, 0.012, 0.16, 4, '#e8dcc0', { position: [x, 0.5, -0.06], rotation: [0.2, 0, x > 0 ? -0.35 : 0.35] });
            break;
          case 'kangaroo':
            kit.blob(0.1, c, { position: [0, 0.1, -0.03], scale: [0.9, 1, 1.3], detail: 1 });
            for (const x of [-0.05, 0.05]) kit.box(0.04, 0.13, 0.025, c, { position: [x, 0.22, 0.02], rotation: [0, 0, x > 0 ? -0.2 : 0.2] });
            kit.blob(0.02, INK, { position: [0, 0.08, -0.16], detail: 0 });
            break;
          case 'elephant':
            kit.blob(0.48, c, { position: [0, 0.1, -0.25], scale: [1, 1.05, 0.95], detail: 1, roughness: 0.04 });
            for (const x of [-1, 1]) kit.box(0.08, 0.62, 0.5, dark, { position: [x * 0.46, 0.05, -0.05], rotation: [0, x * 0.35, 0] });
            break;
        }
        return kit;
      }),
    );
    if (species === 'elephant') {
      // The trunk hangs from the face and sways.
      this.trunk.position.set(0, -0.1, -0.62);
      this.head.add(this.trunk);
      this.trunk.add(part('trunk', () => new ModelKit().cylinder(0.07, 0.13, 1.0, 8, c, { position: [0, -0.5, 0], pattern: Pattern.Matte }).cylinder(0.06, 0.07, 0.12, 8, dark, { position: [0, -1.02, -0.04] })));
    }

    // Legs: pivots at the hips so they swing.
    s.legs.forEach(([x, z], i) => {
      const leg = new THREE.Group();
      const hind = species === 'kangaroo' && i < 2;
      const arm = species === 'kangaroo' && i >= 2;
      leg.position.set(x, arm ? s.legLen + 0.42 : s.legLen, z);
      leg.add(
        part(hind ? 'hind' : arm ? 'arm' : 'leg', () => {
          const kit = new ModelKit();
          if (hind) {
            kit.blob(0.12, c, { position: [0, -0.12, 0.02], scale: [0.8, 1.5, 1], detail: 0 });
            kit.box(0.08, 0.06, 0.34, dark, { position: [0, -0.43, -0.1] });
          } else if (arm) kit.cylinder(0.025, 0.02, 0.2, 5, c, { position: [0, -0.1, 0] });
          else {
            kit.cylinder(s.legR, s.legR * 0.85, s.legLen, 6, species === 'crow' ? '#3a3530' : c, { position: [0, -s.legLen / 2, 0] });
            kit.cylinder(s.legR * 1.1, s.legR * 1.15, s.legLen * 0.12, 6, species === 'elephant' ? '#6a686c' : species === 'cow' || species === 'deer' ? INK : dark, { position: [0, -s.legLen + s.legLen * 0.06, 0] });
          }
          return kit;
        }),
      );
      this.root.add(leg);
      this.legs.push(leg);
    });

    // Tail.
    const tailAt: Record<Species, [number, number, number]> = {
      dog: [0, bh * 0.75, bd * 0.48],
      cat: [0, bh * 0.7, bd * 0.48],
      crow: [0, bh * 0.5, bd * 0.6],
      cow: [0, bh * 0.85, bd * 0.5],
      deer: [0, bh * 0.8, bd * 0.48],
      kangaroo: [0, 0.1, 0.15],
      elephant: [0, bh * 0.8, bd * 0.5],
    };
    this.tail.position.set(...tailAt[species]);
    this.body.add(this.tail);
    this.tail.add(
      part('tail', () => {
        const kit = new ModelKit();
        switch (species) {
          case 'kangaroo':
            kit.cylinder(0.03, 0.08, 0.8, 6, c, { position: [0, -0.1, 0.38], rotation: [1.3, 0, 0] });
            break;
          case 'crow':
            kit.box(0.08, 0.02, 0.14, c, { position: [0, 0, 0.06] });
            break;
          case 'deer':
            kit.blob(0.05, '#f6f0e4', { position: [0, 0, 0.02], detail: 0 });
            break;
          default: {
            const len = species === 'cat' ? 0.34 : species === 'dog' ? 0.26 : species === 'cow' ? 0.6 : 0.5;
            kit.cylinder(0.012, species === 'cat' ? 0.02 : 0.03, len, 5, c, { position: [0, len / 2, 0.02] });
            if (species === 'cow' || species === 'elephant') kit.blob(0.04, INK, { position: [0, len, 0.02], detail: 0 });
          }
        }
        return kit;
      }),
    );
    // Cows' and elephants' tails hang down; dogs' curl up; cats' stand up.
    this.tail.rotation.x = species === 'cow' || species === 'elephant' ? Math.PI - 0.2 : species === 'dog' ? 0.6 : species === 'cat' ? 0.3 : 0;

    if (species === 'crow') {
      for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * 0.06, bh * 0.65, 0);
        wing.add(part('wing', () => new ModelKit().box(0.22, 0.015, 0.14, c, { position: [0.11, 0, 0.02] })));
        wing.scale.x = side;
        this.body.add(wing);
        this.wings.push(wing);
      }
    }
  }

  /** How far to keep from walls and each other. */
  get radius(): number {
    return this.shape.radius;
  }

  animate(dt: number, pose: AnimalPose, speed: number, time: number): void {
    const s = this.shape;
    const sp = this.species;
    this.phase += dt * (pose === 'run' ? 11 : pose === 'hop' ? 7 : 2 + speed * (sp === 'elephant' ? 1.2 : 3));
    const p = this.phase;
    this.body.position.set(0, s.legLen, 0);
    this.body.rotation.set(0, 0, 0);
    this.head.rotation.set(0, Math.sin(time * 0.7 + this.coat.length) * 0.15, 0);
    for (const leg of this.legs) leg.rotation.set(0, 0, 0);
    const legs = this.legs;
    const moving = pose === 'walk' || pose === 'run';
    if (moving && sp !== 'kangaroo' && sp !== 'crow') {
      const a = pose === 'run' ? 0.8 : 0.45;
      legs.forEach((leg, i) => (leg.rotation.x = Math.sin(p + (i === 0 || i === 3 ? 0 : Math.PI)) * a));
      this.body.position.y += Math.abs(Math.sin(p)) * (pose === 'run' ? 0.05 : 0.015) * s.legLen * 3;
    }
    if (moving && sp === 'crow') {
      // Crows walk with a bobbing head.
      legs.forEach((leg, i) => (leg.rotation.x = Math.sin(p * 2 + i * Math.PI) * 0.6));
      this.head.position.z = -s.body[2] * 0.55 + Math.sin(p * 2) * 0.02;
    }
    if (pose === 'hop' || (moving && sp === 'kangaroo')) {
      const up = Math.max(0, Math.sin(p));
      this.body.position.y += up * (sp === 'kangaroo' ? 0.45 : 0.08);
      this.body.rotation.x = sp === 'kangaroo' ? -0.35 : 0;
      if (sp === 'kangaroo') {
        legs[0].rotation.x = legs[1].rotation.x = -0.4 + up * 0.9;
        legs[0].position.y = legs[1].position.y = s.legLen + up * 0.45;
        this.tail.rotation.x = -0.3 + up * 0.3;
      }
    } else if (sp === 'kangaroo') {
      legs[0].position.y = legs[1].position.y = s.legLen;
      this.tail.rotation.x = 0;
    }
    switch (pose) {
      case 'sit':
        // Back end down, front legs straight.
        this.body.rotation.x = 0.45;
        this.body.position.y = s.legLen * 0.7;
        if (legs.length === 4) {
          legs[2].rotation.x = legs[3].rotation.x = -1.2;
          legs[2].position.y = legs[3].position.y = s.legLen * 0.45;
        }
        break;
      case 'lie':
        // Lying down, legs tucked (a dog naps with its head on its paws).
        this.body.position.y = s.legLen * 0.22;
        legs.forEach((leg) => (leg.rotation.x = -1.4));
        this.head.rotation.x = -0.25;
        break;
      case 'eat':
        this.head.rotation.x = sp === 'elephant' ? 0.1 : -0.9 + Math.sin(time * 3) * 0.08;
        break;
      case 'bow':
        // A Nara deer's bow: the head dips and comes back up.
        this.head.rotation.x = -Math.max(0, Math.sin(time * 2.2)) * 0.9;
        break;
      case 'fly':
        this.body.position.y = s.legLen;
        legs.forEach((leg) => (leg.rotation.x = 0.8));
        break;
    }
    if (pose !== 'sit' && legs.length === 4 && sp !== 'kangaroo') legs[2].position.y = legs[3].position.y = s.legLen;
    // Wings: folded, or flapping in flight.
    for (const [i, w] of this.wings.entries()) w.rotation.z = pose === 'fly' ? Math.sin(time * 18) * 0.9 * (i ? -1 : 1) : 0.05;
    // Tails: a dog wags when happy; others swish now and then.
    if (sp === 'dog') this.tail.rotation.set(0.6, this.happy ? Math.sin(time * 16) * 0.7 : Math.sin(time * 1.5) * 0.1, 0);
    else if (sp === 'cow' || sp === 'elephant') this.tail.rotation.z = Math.sin(time * 1.1) * 0.25;
    else if (sp === 'cat') this.tail.rotation.set(0.3 + Math.sin(time * 1.3) * 0.2, Math.sin(time * 0.9) * 0.3, 0);
    // An elephant's trunk sways and curls; its ears flap slowly.
    if (sp === 'elephant') {
      this.trunk.rotation.x = Math.sin(time * 0.8) * 0.2 + (pose === 'eat' ? -0.6 + Math.sin(time * 2) * 0.3 : 0);
      this.trunk.rotation.z = Math.sin(time * 0.53) * 0.12;
    }
  }
}

function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f);
  c.g = Math.min(1, c.g * f);
  c.b = Math.min(1, c.b * f);
  return `#${c.getHexString()}`;
}
