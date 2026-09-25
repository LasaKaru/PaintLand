import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

export type HairStyle = 'bob' | 'bun' | 'short' | 'curly' | 'long' | 'ponytail' | 'braids' | 'bald';
export type TopStyle = 'tee' | 'shirt' | 'hoodie' | 'dress' | 'sari';
export type BottomStyle = 'trousers' | 'shorts' | 'skirt' | 'sarong';
export type HatStyle = 'none' | 'straw' | 'beret' | 'cap' | 'sunhat' | 'beanie' | 'crown' | 'helmet' | 'flowers';
export type GlassesStyle = 'none' | 'round' | 'sun';
export type BackStyle = 'none' | 'backpack' | 'satchel' | 'guitar' | 'cape' | 'wings';

/** Character creator values (docs/08 §1). */
export interface HumanLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  topStyle?: TopStyle;
  bottom: string;
  bottomStyle?: BottomStyle;
  shoes: string;
  scarf: string | null;
  hat: HatStyle;
  glasses?: GlassesStyle;
  back?: BackStyle;
  /** 0.9 – 1.1 */
  height?: number;
}

export const DEFAULT_HUMAN_LOOK: HumanLook = {
  skin: '#f0c7a6',
  hair: '#c8452e',
  hairStyle: 'bob',
  top: '#4f9a5a',
  topStyle: 'tee',
  bottom: '#3f5f9a',
  bottomStyle: 'trousers',
  shoes: '#2b2622',
  scarf: '#f4d23b',
  hat: 'none',
  glasses: 'none',
  back: 'none',
  height: 1,
};

export type HumanPose = 'idle' | 'walk' | 'run' | 'air' | 'sit' | 'ride' | 'wave';

const INK = '#2b2622';

/**
 * A paper-doll character: big head, strong silhouette, rigid limbs on pivots
 * animated procedurally (docs/03 §6, docs/05 §3.4). Height ≈ 1.6 m, faces -Z,
 * origin at the feet.
 */
export class HumanModel {
  readonly root = new THREE.Group();
  readonly hips = new THREE.Group();
  readonly chest = new THREE.Group();
  readonly head = new THREE.Group();
  private readonly legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  private readonly arms: { shoulder: THREE.Group; elbow: THREE.Group }[] = [];
  private phase = Math.random() * 6;
  private blend = 0;
  private readonly headMeshes: THREE.Mesh[] = [];

  constructor(readonly look: HumanLook = DEFAULT_HUMAN_LOOK) {
    this.root.name = 'human';
    const mat = new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.08 });
    const mesh = (g: THREE.BufferGeometry): THREE.Mesh => {
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true;
      return m;
    };
    const topStyle = look.topStyle ?? 'tee';
    const bottomStyle = look.bottomStyle ?? 'trousers';
    const longSkirt = topStyle === 'dress' || topStyle === 'sari' || bottomStyle === 'sarong' || bottomStyle === 'skirt';
    const legColour = bottomStyle === 'shorts' || longSkirt ? look.skin : look.bottom;
    const skirtColour = topStyle === 'dress' || topStyle === 'sari' ? look.top : look.bottom;

    this.root.scale.setScalar(look.height ?? 1);
    this.hips.position.y = 0.86;
    this.root.add(this.hips);

    // Pelvis, with a skirt, sarong or dress hem when chosen.
    const pelvis = new ModelKit().box(0.36, 0.2, 0.22, longSkirt ? skirtColour : look.bottom);
    if (longSkirt) {
      const len = bottomStyle === 'sarong' || topStyle === 'sari' ? 0.72 : 0.42;
      pelvis.cylinder(0.2, 0.3, len, 8, skirtColour, { position: [0, -len / 2 + 0.05, 0], pattern: bottomStyle === 'sarong' ? Pattern.Planks : Pattern.None });
    }
    this.hips.add(mesh(pelvis.build(0.01, 1)));

    this.chest.position.y = 0.1;
    this.hips.add(this.chest);
    const torso = new ModelKit()
      .cylinder(0.2, 0.16, 0.5, 7, look.top, { position: [0, 0.25, 0] })
      .box(0.44, 0.12, 0.24, look.top, { position: [0, 0.46, 0] });
    if (topStyle === 'shirt') {
      torso.box(0.04, 0.42, 0.02, '#f6f0e4', { position: [0, 0.27, -0.2] });
      torso.box(0.26, 0.08, 0.06, '#f6f0e4', { position: [0, 0.5, -0.12] });
    } else if (topStyle === 'hoodie') {
      torso.blob(0.17, shadeHex(look.top, 0.85), { position: [0, 0.54, 0.12], scale: [1.2, 0.6, 0.8], detail: 1 });
      torso.box(0.26, 0.12, 0.04, shadeHex(look.top, 0.85), { position: [0, 0.14, -0.19] });
    } else if (topStyle === 'sari') {
      torso.box(0.14, 0.62, 0.3, shadeHex(look.top, 1.12), { position: [0.12, 0.22, 0], rotation: [0, 0, -0.5] });
      torso.box(0.5, 0.06, 0.3, '#e8c872', { position: [0, 0.0, 0] });
    }
    if (look.scarf) torso.cylinder(0.12, 0.15, 0.1, 8, look.scarf, { position: [0, 0.54, 0] });
    const back = look.back ?? 'none';
    if (back === 'backpack') {
      torso.box(0.32, 0.36, 0.16, '#d8643a', { position: [0, 0.28, 0.2], pattern: Pattern.Planks });
      torso.box(0.26, 0.12, 0.05, '#f4d23b', { position: [0, 0.18, 0.29] });
    } else if (back === 'satchel') {
      torso.box(0.06, 0.6, 0.04, '#7a4a2a', { position: [0.05, 0.25, -0.18], rotation: [0, 0, 0.7] });
      torso.box(0.28, 0.22, 0.1, '#9a5a32', { position: [0.22, -0.05, 0.05] });
    } else if (back === 'guitar') {
      torso.blob(0.2, '#c8955a', { position: [0.05, 0.05, 0.2], scale: [1, 1.2, 0.35], detail: 1 });
      torso.box(0.06, 0.6, 0.05, '#7a4a2a', { position: [0.05, 0.5, 0.2], rotation: [0, 0, 0.1] });
    } else if (back === 'cape') {
      // A flowing painter's cape (loot).
      torso.box(0.46, 0.9, 0.04, '#9a2a4a', { position: [0, 0.12, 0.2], rotation: [0.18, 0, 0] });
      torso.box(0.5, 0.06, 0.2, '#f4c542', { position: [0, 0.55, 0.1] });
    } else if (back === 'wings') {
      // Paper-craft wings (legendary loot).
      for (const s of [-1, 1]) {
        torso.box(0.5, 0.28, 0.03, '#f6f0e4', { position: [s * 0.3, 0.38, 0.22], rotation: [0, s * -0.4, s * 0.35], nightGlow: 1 });
        torso.box(0.38, 0.2, 0.03, '#bfd9e8', { position: [s * 0.36, 0.18, 0.22], rotation: [0, s * -0.4, s * -0.2], nightGlow: 1 });
      }
    }
    this.chest.add(mesh(torso.build(0.012, 2)));

    // Head: big, round-ish, with painted features.
    this.head.position.y = 0.6;
    this.chest.add(this.head);
    const headKit = new ModelKit()
      .cylinder(0.05, 0.06, 0.1, 6, look.skin, { position: [0, 0.03, 0] })
      .blob(0.2, look.skin, { position: [0, 0.24, 0], scale: [1, 1.08, 0.96], detail: 1, roughness: 0.04 })
      .blob(0.028, INK, { position: [-0.075, 0.26, -0.18], detail: 0, roughness: 0 })
      .blob(0.028, INK, { position: [0.075, 0.26, -0.18], detail: 0, roughness: 0 })
      .blob(0.03, '#f09a8a', { position: [-0.12, 0.19, -0.16], scale: [1, 0.6, 0.4], detail: 0, roughness: 0 })
      .blob(0.03, '#f09a8a', { position: [0.12, 0.19, -0.16], scale: [1, 0.6, 0.4], detail: 0, roughness: 0 })
      .box(0.06, 0.012, 0.02, '#9a4a3a', { position: [0, 0.15, -0.19] });
    addHair(headKit, look);
    addGlasses(headKit, look.glasses ?? 'none');
    const headMesh = mesh(headKit.build(0.008, 4));
    this.head.add(headMesh);
    this.headMeshes.push(headMesh);

    const sleeve = topStyle === 'tee' || topStyle === 'dress' ? look.skin : look.top;
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.25, 0.44, 0);
      const upper = new ModelKit().cylinder(0.055, 0.05, 0.3, 6, topStyle === 'tee' ? look.top : sleeve, { position: [0, -0.15, 0] }).build(0.006, side);
      shoulder.add(mesh(upper));
      const elbow = new THREE.Group();
      elbow.position.y = -0.3;
      const fore = new ModelKit()
        .cylinder(0.045, 0.04, 0.26, 6, sleeve, { position: [0, -0.13, 0] })
        .blob(0.055, look.skin, { position: [0, -0.29, 0], detail: 0 })
        .build(0.006, side + 3);
      elbow.add(mesh(fore));
      shoulder.add(elbow);
      this.chest.add(shoulder);
      this.arms.push({ shoulder, elbow });
    }

    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.1, -0.06, 0);
      hip.add(mesh(new ModelKit().cylinder(0.075, 0.065, 0.42, 6, bottomStyle === 'shorts' ? look.bottom : legColour, { position: [0, -0.21, 0], scale: bottomStyle === 'shorts' ? [1, 0.5, 1] : [1, 1, 1] }).cylinder(0.06, 0.06, 0.24, 6, look.skin, { position: [0, -0.3, 0] }).build(0.006, side + 5)));
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      const shin = new ModelKit()
        .cylinder(0.06, 0.05, 0.36, 6, bottomStyle === 'trousers' && !longSkirt ? look.bottom : look.skin, { position: [0, -0.18, 0] })
        .box(0.12, 0.09, 0.24, look.shoes, { position: [0, -0.37, -0.04] })
        .build(0.006, side + 7);
      knee.add(mesh(shin));
      hip.add(knee);
      this.hips.add(hip);
      this.legs.push({ hip, knee });
    }
  }

  /** Hide the head in first person so it never covers the lens. */
  setHeadVisible(visible: boolean): void {
    for (const m of this.headMeshes) m.visible = visible;
  }

  /**
   * Procedural animation. `speed` in m/s drives stride; poses blend smoothly.
   */
  animate(dt: number, pose: HumanPose, speed: number, time: number): void {
    const moving = pose === 'walk' || pose === 'run';
    this.blend += ((moving ? 1 : 0) - this.blend) * Math.min(1, dt * 8);
    const stride = pose === 'run' ? 1.0 : 0.6;
    this.phase += dt * (2.2 + speed * 1.35);
    const p = this.phase;
    const b = this.blend;
    const swing = Math.sin(p) * stride * b;
    const lift = Math.max(0, Math.cos(p)) * stride * b;
    const liftB = Math.max(0, -Math.cos(p)) * stride * b;

    if (pose === 'sit' || pose === 'ride') {
      const ride = pose === 'ride';
      for (const [i, leg] of this.legs.entries()) {
        leg.hip.rotation.set(ride ? 1.2 : 1.45, 0, ride ? (i ? -0.25 : 0.25) : 0);
        leg.knee.rotation.x = ride ? -1.0 : -1.4;
      }
      this.arms[0].shoulder.rotation.set(1.0, 0, 0.15);
      this.arms[1].shoulder.rotation.set(1.0, 0, -0.15);
      for (const arm of this.arms) arm.elbow.rotation.x = 0.4;
      this.hips.position.y = 0.5;
      this.chest.rotation.x = ride ? -0.2 : -0.05;
      this.head.rotation.set(Math.sin(time * 1.3) * 0.04, Math.sin(time * 0.7) * 0.15, 0);
      return;
    }
    for (const leg of this.legs) leg.hip.rotation.z = 0;

    if (pose === 'air') {
      this.legs[0].hip.rotation.x = 0.7;
      this.legs[0].knee.rotation.x = -1.1;
      this.legs[1].hip.rotation.x = -0.3;
      this.legs[1].knee.rotation.x = -0.5;
      this.arms[0].shoulder.rotation.set(-0.4, 0, 0.9);
      this.arms[1].shoulder.rotation.set(0.2, 0, -0.9);
      this.hips.position.y = 0.86;
      return;
    }

    this.legs[0].hip.rotation.x = swing;
    this.legs[1].hip.rotation.x = -swing;
    this.legs[0].knee.rotation.x = -lift * 1.2;
    this.legs[1].knee.rotation.x = -liftB * 1.2;
    this.arms[0].shoulder.rotation.set(-swing * 0.8, 0, 0.12);
    this.arms[1].shoulder.rotation.set(swing * 0.8, 0, -0.12);
    this.arms[0].elbow.rotation.x = 0.3 + (pose === 'run' ? 0.8 : 0.2) * b;
    this.arms[1].elbow.rotation.x = 0.3 + (pose === 'run' ? 0.8 : 0.2) * b;
    if (pose === 'wave') {
      this.arms[1].shoulder.rotation.set(0, 0, -2.6 + Math.sin(time * 9) * 0.25);
      this.arms[1].elbow.rotation.x = 0.4;
    }

    const breathe = Math.sin(time * 2) * 0.01 * (1 - b);
    const bob = Math.abs(Math.sin(p)) * 0.05 * b * stride;
    this.hips.position.y = 0.86 + bob + breathe;
    this.chest.rotation.x = -(pose === 'run' ? 0.22 : 0.06) * b;
    this.head.rotation.set(-this.chest.rotation.x * 0.6, 0, 0);
  }
}

function addHair(k: ModelKit, look: HumanLook): void {
  const c = look.hair;
  switch (look.hairStyle) {
    case 'bob':
      k.blob(0.22, c, { position: [0, 0.3, 0.02], scale: [1.08, 0.9, 1.05], detail: 1, roughness: 0.08 });
      k.box(0.44, 0.2, 0.3, c, { position: [0, 0.17, 0.08] });
      k.box(0.3, 0.06, 0.08, c, { position: [0, 0.37, -0.17], rotation: [0.3, 0, 0] });
      break;
    case 'bun':
      k.blob(0.21, c, { position: [0, 0.3, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      k.blob(0.1, c, { position: [0, 0.5, 0.1], detail: 1 });
      break;
    case 'short':
      k.blob(0.21, c, { position: [0, 0.32, 0.03], scale: [1.02, 0.75, 1.02], detail: 1, roughness: 0.1 });
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        k.blob(0.09, c, { position: [Math.cos(a) * 0.16, 0.36 + Math.sin(i) * 0.03, Math.sin(a) * 0.14 + 0.03], detail: 0, seed: i });
      }
      k.blob(0.17, c, { position: [0, 0.38, 0.03], detail: 1 });
      break;
    case 'long':
      k.blob(0.22, c, { position: [0, 0.3, 0.02], scale: [1.06, 0.9, 1.05], detail: 1, roughness: 0.06 });
      k.box(0.42, 0.55, 0.16, c, { position: [0, 0.02, 0.12] });
      break;
    case 'ponytail':
      k.blob(0.21, c, { position: [0, 0.31, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      k.blob(0.09, c, { position: [0, 0.2, 0.26], scale: [0.8, 2.2, 0.8], rotation: [0.4, 0, 0], detail: 1 });
      break;
    case 'braids':
      k.blob(0.21, c, { position: [0, 0.31, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.blob(0.05, c, { position: [s * 0.17, 0.18 - i * 0.09, 0.04], detail: 0 });
      break;
    case 'bald':
      break;
  }
  switch (look.hat) {
    case 'straw':
      k.cylinder(0.34, 0.34, 0.03, 14, '#e8c872', { position: [0, 0.42, 0], pattern: Pattern.Thatch });
      k.cylinder(0.16, 0.19, 0.14, 12, '#e8c872', { position: [0, 0.5, 0], pattern: Pattern.Thatch });
      k.cylinder(0.195, 0.195, 0.04, 12, '#d8463a', { position: [0, 0.45, 0] });
      break;
    case 'beret':
      k.blob(0.2, '#d8463a', { position: [0.03, 0.45, 0.02], scale: [1.1, 0.4, 1.1], detail: 1, roughness: 0.02 });
      break;
    case 'cap':
      k.blob(0.2, '#3e6fa8', { position: [0, 0.4, 0.02], scale: [1.05, 0.6, 1.05], detail: 1, roughness: 0.02 });
      k.box(0.24, 0.02, 0.16, '#3e6fa8', { position: [0, 0.37, -0.22] });
      break;
    case 'sunhat':
      k.cylinder(0.4, 0.42, 0.02, 16, '#f6f0e4', { position: [0, 0.4, 0] });
      k.blob(0.19, '#f6f0e4', { position: [0, 0.44, 0], scale: [1, 0.6, 1], detail: 1 });
      k.cylinder(0.2, 0.2, 0.05, 12, '#e8559a', { position: [0, 0.44, 0] });
      break;
    case 'beanie':
      k.blob(0.21, '#f08a2e', { position: [0, 0.38, 0.02], scale: [1.02, 0.8, 1.02], detail: 1, roughness: 0.02 });
      k.blob(0.06, '#f6f0e4', { position: [0, 0.55, 0.02], detail: 0 });
      break;
    case 'crown':
      k.cylinder(0.19, 0.2, 0.1, 10, '#f4c542', { position: [0, 0.47, 0], pattern: Pattern.Glass });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        k.cylinder(0.0, 0.04, 0.1, 4, '#f4c542', { position: [Math.cos(a) * 0.18, 0.56, Math.sin(a) * 0.18] });
        k.blob(0.025, '#e8559a', { position: [Math.cos(a) * 0.195, 0.47, Math.sin(a) * 0.195], detail: 0, nightGlow: 1 });
      }
      break;
    case 'helmet':
      k.blob(0.24, '#f6f0e4', { position: [0, 0.36, 0.02], scale: [1.04, 0.95, 1.08], detail: 1, roughness: 0 });
      k.box(0.3, 0.08, 0.02, '#3e9fd8', { position: [0, 0.3, -0.24], pattern: Pattern.Glass });
      k.box(0.04, 0.04, 0.48, '#d8463a', { position: [0, 0.6, 0.02] });
      break;
    case 'flowers':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.blob(0.05, ['#e8559a', '#f4d23b', '#f6f0e4', '#9a5bd6'][i % 4], { position: [Math.cos(a) * 0.19, 0.44, Math.sin(a) * 0.19], detail: 0 });
      }
      break;
    default:
      break;
  }
}

function addGlasses(k: ModelKit, style: GlassesStyle): void {
  if (style === 'none') return;
  const lens = style === 'sun' ? INK : '#dfe9ef';
  for (const s of [-1, 1]) k.cylinder(0.05, 0.05, 0.02, 10, lens, { position: [s * 0.075, 0.26, -0.2], rotation: [Math.PI / 2, 0, 0] });
  k.box(0.2, 0.015, 0.015, INK, { position: [0, 0.27, -0.205] });
}

export function shadeHex(hex: string, f: number): string {
  const c = new THREE.Color(hex).multiplyScalar(f);
  c.r = Math.min(1, c.r);
  c.g = Math.min(1, c.g);
  c.b = Math.min(1, c.b);
  return `#${c.getHexString()}`;
}

/** A random look for pedestrians and new players. */
export function randomLook(r: () => number): HumanLook {
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
  return {
    skin: pick(['#f0c7a6', '#d9a57e', '#b27b52', '#8a5a3a', '#f6d8c0', '#6b4630']),
    hair: pick(['#c8452e', '#2b2622', '#6b4a2a', '#e8c872', '#9a5bd6', '#3e6fa8', '#8a8a9a']),
    hairStyle: pick(['bob', 'bun', 'short', 'curly', 'long', 'ponytail', 'braids', 'bald'] as const),
    top: pick(['#4f9a5a', '#d8463a', '#f4d23b', '#3e6fa8', '#e8559a', '#f6f0e4', '#2f8f86', '#f08a2e']),
    topStyle: pick(['tee', 'tee', 'shirt', 'hoodie', 'dress', 'sari'] as const),
    bottom: pick(['#3f5f9a', '#2b2622', '#c8955a', '#6a6f8a', '#f6f0e4', '#9a3a2a']),
    bottomStyle: pick(['trousers', 'trousers', 'shorts', 'skirt', 'sarong'] as const),
    shoes: pick(['#2b2622', '#d8463a', '#f6f0e4', '#7a4a2a']),
    scarf: r() < 0.35 ? pick(['#f4d23b', '#e8559a', '#2f8f86']) : null,
    hat: pick(['none', 'none', 'none', 'straw', 'beret', 'cap', 'sunhat', 'beanie'] as const),
    glasses: pick(['none', 'none', 'round', 'sun'] as const),
    back: pick(['none', 'none', 'backpack', 'satchel', 'guitar'] as const),
    height: 0.92 + r() * 0.16,
  };
}
