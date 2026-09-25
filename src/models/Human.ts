import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

/** Character creator values (docs/08 §1). */
export interface HumanLook {
  skin: string;
  hair: string;
  hairStyle: 'bob' | 'bun' | 'short' | 'curly';
  top: string;
  bottom: string;
  shoes: string;
  scarf: string | null;
  hat: 'none' | 'straw' | 'beret';
}

export const DEFAULT_HUMAN_LOOK: HumanLook = {
  skin: '#f0c7a6',
  hair: '#c8452e',
  hairStyle: 'bob',
  top: '#4f9a5a',
  bottom: '#3f5f9a',
  shoes: '#2b2622',
  scarf: '#f4d23b',
  hat: 'none',
};

export type HumanPose = 'idle' | 'walk' | 'run' | 'air' | 'sit';

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
  private phase = 0;
  private blend = 0;
  private readonly headMeshes: THREE.Mesh[] = [];

  constructor(look: HumanLook = DEFAULT_HUMAN_LOOK) {
    this.root.name = 'human';
    const mat = new PaintMaterial({ vertexColors: true, flat: true });
    const mesh = (g: THREE.BufferGeometry): THREE.Mesh => {
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true;
      return m;
    };

    this.hips.position.y = 0.86;
    this.root.add(this.hips);

    // Pelvis + torso.
    this.hips.add(mesh(new ModelKit().box(0.36, 0.2, 0.22, look.bottom, { position: [0, 0, 0] }).build(0.01, 1)));
    this.chest.position.y = 0.1;
    this.hips.add(this.chest);
    const torso = new ModelKit()
      .cylinder(0.2, 0.16, 0.5, 7, look.top, { position: [0, 0.25, 0] })
      .box(0.44, 0.12, 0.24, look.top, { position: [0, 0.46, 0] });
    if (look.scarf) torso.cylinder(0.12, 0.15, 0.1, 8, look.scarf, { position: [0, 0.54, 0] });
    this.chest.add(mesh(torso.build(0.012, 2)));

    // Head: big, round-ish, with painted features.
    this.head.position.y = 0.6;
    this.chest.add(this.head);
    const headKit = new ModelKit()
      .cylinder(0.05, 0.06, 0.1, 6, look.skin, { position: [0, 0.03, 0] })
      .blob(0.2, look.skin, { position: [0, 0.24, 0], scale: [1, 1.08, 0.96], detail: 1, roughness: 0.04 })
      .blob(0.028, '#2b2622', { position: [-0.075, 0.26, -0.18], detail: 0, roughness: 0 })
      .blob(0.028, '#2b2622', { position: [0.075, 0.26, -0.18], detail: 0, roughness: 0 })
      .blob(0.03, '#f09a8a', { position: [-0.12, 0.19, -0.16], scale: [1, 0.6, 0.4], detail: 0, roughness: 0 })
      .blob(0.03, '#f09a8a', { position: [0.12, 0.19, -0.16], scale: [1, 0.6, 0.4], detail: 0, roughness: 0 });
    addHair(headKit, look);
    const headMesh = mesh(headKit.build(0.008, 4));
    this.head.add(headMesh);
    this.headMeshes.push(headMesh);

    // Arms.
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.25, 0.44, 0);
      const upper = new ModelKit().cylinder(0.055, 0.05, 0.3, 6, look.top, { position: [0, -0.15, 0] }).build(0.006, side);
      shoulder.add(mesh(upper));
      const elbow = new THREE.Group();
      elbow.position.y = -0.3;
      const fore = new ModelKit()
        .cylinder(0.045, 0.04, 0.26, 6, look.skin, { position: [0, -0.13, 0] })
        .blob(0.055, look.skin, { position: [0, -0.29, 0], detail: 0 })
        .build(0.006, side + 3);
      elbow.add(mesh(fore));
      shoulder.add(elbow);
      this.chest.add(shoulder);
      this.arms.push({ shoulder, elbow });
    }

    // Legs.
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.1, -0.06, 0);
      hip.add(mesh(new ModelKit().cylinder(0.075, 0.065, 0.42, 6, look.bottom, { position: [0, -0.21, 0] }).build(0.006, side + 5)));
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      const shin = new ModelKit()
        .cylinder(0.06, 0.05, 0.36, 6, look.skin, { position: [0, -0.18, 0] })
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
   * Limbs can step "on twos" for a hand-animated feel (docs/03 §1 Motion).
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

    if (pose === 'sit') {
      for (const leg of this.legs) {
        leg.hip.rotation.x = 1.45;
        leg.knee.rotation.x = -1.4;
      }
      this.arms[0].shoulder.rotation.set(1.0, 0, 0.15);
      this.arms[1].shoulder.rotation.set(1.0, 0, -0.15);
      for (const arm of this.arms) arm.elbow.rotation.x = 0.4;
      this.hips.position.y = 0.5;
      this.chest.rotation.x = -0.05;
      this.head.rotation.set(Math.sin(time * 1.3) * 0.04, Math.sin(time * 0.7) * 0.15, 0);
      return;
    }

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
  }
  if (look.hat === 'straw') {
    k.cylinder(0.34, 0.34, 0.03, 14, '#e8c872', { position: [0, 0.42, 0] });
    k.cylinder(0.16, 0.19, 0.14, 12, '#e8c872', { position: [0, 0.5, 0] });
    k.cylinder(0.195, 0.195, 0.04, 12, '#d8463a', { position: [0, 0.45, 0] });
  } else if (look.hat === 'beret') {
    k.blob(0.2, '#d8463a', { position: [0.03, 0.45, 0.02], scale: [1.1, 0.4, 1.1], detail: 1, roughness: 0.02 });
  }
}
