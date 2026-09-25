import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

/** Paint scheme for the rover (garage customisation, docs/08 §2). */
export interface RoverLook {
  body: string;
  trim: string;
  wing: string;
  hubs: string;
  roofLoad: 'gramophone' | 'boombox' | 'flowers';
}

export const DEFAULT_ROVER_LOOK: RoverLook = {
  body: '#efe8d8',
  trim: '#8c8a94',
  wing: '#d8463a',
  hubs: '#f2b632',
  roofLoad: 'gramophone',
};

const TYRE = '#2f2a28';
const INK = '#2b2622';
const BRASS = '#d4a943';

export const WHEEL_RADIUS = 0.55;

/**
 * The rover: a boxy cream off-roader with chunky tyres, a red rear wing and a
 * brass gramophone on the roof (docs/05 §4.3). Faces -Z. Origin at ground
 * level under the centre of the body. Animated parts are separate objects.
 */
export class RoverModel {
  readonly root = new THREE.Group();
  /** Tilts and bounces with suspension. */
  readonly body = new THREE.Group();
  readonly wheels: THREE.Group[] = [];
  /** Front wheel steering pivots. */
  readonly steerPivots: THREE.Group[] = [];
  readonly horn = new THREE.Group();
  readonly antenna = new THREE.Group();
  readonly seat = new THREE.Object3D();
  private readonly brakeMat = new PaintMaterial({ color: '#ff5a4a', emissive: 0.15 });
  private readonly headMat = new PaintMaterial({ color: '#fff3c4', emissive: 0.2 });
  private readonly bodyMesh: THREE.Mesh;

  constructor(look: RoverLook = DEFAULT_ROVER_LOOK) {
    this.root.name = 'rover';
    this.root.add(this.body);
    this.bodyMesh = new THREE.Mesh(buildBody(look), new PaintMaterial({ vertexColors: true, flat: true }));
    this.bodyMesh.castShadow = true;
    this.body.add(this.bodyMesh);

    // Lights.
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), this.brakeMat);
    for (const x of [-0.72, 0.72]) {
      const b = brake.clone();
      b.position.set(x, 1.05, 2.03);
      this.body.add(b);
    }
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10).rotateX(Math.PI / 2), this.headMat);
    for (const x of [-0.7, 0.7]) {
      const h = head.clone();
      h.position.set(x, 1.12, -2.03);
      this.body.add(h);
    }

    // Roof load.
    this.horn.position.set(0.15, 2.18, 0.35);
    this.horn.add(new THREE.Mesh(buildRoofLoad(look), new PaintMaterial({ vertexColors: true, flat: true })));
    this.horn.children[0].castShadow = true;
    this.body.add(this.horn);

    // Antenna with a springy tip.
    const ant = new ModelKit()
      .cylinder(0.018, 0.025, 1.4, 5, INK, { position: [0, 0.7, 0] })
      .blob(0.07, '#e8559a', { position: [0, 1.42, 0], detail: 0 })
      .build(0);
    this.antenna.add(new THREE.Mesh(ant, new PaintMaterial({ vertexColors: true, flat: true })));
    this.antenna.position.set(-0.78, 2.05, 1.3);
    this.body.add(this.antenna);

    this.seat.position.set(-0.42, 0.95, -0.2);
    this.body.add(this.seat);

    // Wheels: [front-left, front-right, rear-left, rear-right].
    const wheelGeo = buildWheel(look);
    const wheelMat = new PaintMaterial({ vertexColors: true, flat: true });
    const spots: [number, number][] = [
      [-1.12, -1.35],
      [1.12, -1.35],
      [-1.12, 1.4],
      [1.12, 1.4],
    ];
    spots.forEach(([x, z], i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, WHEEL_RADIUS, z);
      const wheel = new THREE.Group();
      const mesh = new THREE.Mesh(wheelGeo, wheelMat);
      mesh.castShadow = true;
      if (x > 0) mesh.rotation.y = Math.PI;
      wheel.add(mesh);
      pivot.add(wheel);
      this.root.add(pivot);
      this.wheels.push(wheel);
      if (i < 2) this.steerPivots.push(pivot);
    });
  }

  setBrakeLights(on: boolean): void {
    this.brakeMat.emissiveStrength = on ? 1 : 0.15;
  }

  setHeadlights(strength: number): void {
    this.headMat.emissiveStrength = 0.2 + strength * 0.8;
  }
}

function buildBody(look: RoverLook): THREE.BufferGeometry {
  const k = new ModelKit();
  // Chassis and lower body.
  k.box(2.0, 0.28, 4.1, INK, { position: [0, 0.62, 0] });
  k.box(2.06, 0.62, 4.0, look.body, { position: [0, 1.02, 0] });
  // Bonnet sloping slightly.
  k.box(1.96, 0.22, 1.5, look.body, { position: [0, 1.38, -1.2], rotation: [0.06, 0, 0] });
  // Cabin.
  k.box(1.9, 0.72, 2.2, look.body, { position: [0, 1.72, 0.55] });
  // Windows (dark ink glass).
  k.box(1.7, 0.46, 0.06, '#4a5a7a', { position: [0, 1.76, -0.57], rotation: [-0.25, 0, 0] });
  k.box(0.05, 0.42, 1.8, '#4a5a7a', { position: [-0.96, 1.78, 0.55] });
  k.box(0.05, 0.42, 1.8, '#4a5a7a', { position: [0.96, 1.78, 0.55] });
  // Trim stripe and panel lines.
  k.box(2.1, 0.1, 4.05, look.trim, { position: [0, 0.86, 0] });
  k.box(2.1, 0.08, 0.08, INK, { position: [0, 1.2, 0.2] });
  // Bumpers.
  k.box(2.2, 0.3, 0.3, INK, { position: [0, 0.78, -2.12] });
  k.box(2.2, 0.3, 0.3, INK, { position: [0, 0.78, 2.12] });
  // Wheel arches.
  for (const [x, z] of [[-1.08, -1.35], [1.08, -1.35], [-1.08, 1.4], [1.08, 1.4]] as const) {
    k.box(0.22, 0.24, 1.35, look.trim, { position: [x, 1.2, z] });
  }
  // Rear wing on two struts.
  k.box(2.3, 0.1, 0.62, look.wing, { position: [0, 2.3, 1.85], rotation: [-0.08, 0, 0] });
  k.box(0.08, 0.5, 0.28, INK, { position: [-0.7, 2.05, 1.85] });
  k.box(0.08, 0.5, 0.28, INK, { position: [0.7, 2.05, 1.85] });
  k.box(0.08, 0.36, 0.7, look.wing, { position: [-1.15, 2.2, 1.85] });
  k.box(0.08, 0.36, 0.7, look.wing, { position: [1.15, 2.2, 1.85] });
  // Roof rack.
  k.box(1.7, 0.06, 1.9, INK, { position: [0, 2.12, 0.55] });
  for (const x of [-0.85, 0.85]) k.box(0.06, 0.18, 1.9, INK, { position: [x, 2.2, 0.55] });
  // Spare wheel on the back and a jerry can.
  k.cylinder(0.42, 0.42, 0.28, 10, TYRE, { position: [0, 1.25, 2.28], rotation: [Math.PI / 2, 0, 0] });
  k.cylinder(0.2, 0.2, 0.3, 8, look.hubs, { position: [0, 1.25, 2.32], rotation: [Math.PI / 2, 0, 0] });
  k.box(0.3, 0.45, 0.2, '#d8463a', { position: [-0.72, 2.4, 1.3] });
  // Roof lamps and snorkel.
  for (const x of [-0.5, -0.17, 0.17, 0.5]) k.cylinder(0.1, 0.1, 0.12, 8, '#fff3c4', { position: [x, 2.22, -0.45], rotation: [Math.PI / 2, 0, 0] });
  k.cylinder(0.07, 0.07, 1.0, 6, INK, { position: [1.02, 1.6, -0.9] });
  // Exhaust pipes.
  for (const x of [-0.55, -0.35]) k.cylinder(0.08, 0.08, 0.3, 8, '#9a9aa4', { position: [x, 0.62, 2.2], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.025, 3);
}

function buildWheel(look: RoverLook): THREE.BufferGeometry {
  const k = new ModelKit();
  const r = WHEEL_RADIUS;
  k.cylinder(r, r, 0.5, 12, TYRE, { rotation: [0, 0, Math.PI / 2] });
  // Chunky tread blocks.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box(0.52, 0.12, 0.18, TYRE, { position: [0, Math.cos(a) * r, Math.sin(a) * r], rotation: [a, 0, 0] });
  }
  k.cylinder(r * 0.55, r * 0.55, 0.52, 10, look.hubs, { rotation: [0, 0, Math.PI / 2], position: [-0.01, 0, 0] });
  k.cylinder(r * 0.18, r * 0.18, 0.56, 6, INK, { rotation: [0, 0, Math.PI / 2], position: [-0.02, 0, 0] });
  return k.build(0.01, 5);
}

function buildRoofLoad(look: RoverLook): THREE.BufferGeometry {
  const k = new ModelKit();
  if (look.roofLoad === 'gramophone') {
    // Wooden box, crank, brass horn flaring backwards and up.
    k.box(0.7, 0.36, 0.7, '#9a5a32', { position: [0, 0.18, 0] });
    k.cylinder(0.3, 0.3, 0.04, 14, INK, { position: [0, 0.38, 0] });
    k.cylinder(0.04, 0.04, 0.5, 6, BRASS, { position: [0.12, 0.6, 0.05], rotation: [0.3, 0, 0] });
    const horn = new THREE.LatheGeometry(
      [new THREE.Vector2(0.05, 0), new THREE.Vector2(0.08, 0.25), new THREE.Vector2(0.16, 0.5), new THREE.Vector2(0.32, 0.72), new THREE.Vector2(0.52, 0.84)],
      12,
    );
    k.add(horn, BRASS, { position: [0.12, 0.82, 0.12], rotation: [-0.9, 0, 0] });
    k.cylinder(0.05, 0.05, 0.3, 6, INK, { position: [-0.38, 0.22, 0], rotation: [0, 0, Math.PI / 2] });
  } else if (look.roofLoad === 'boombox') {
    k.box(1.1, 0.55, 0.36, '#d8463a', { position: [0, 0.28, 0] });
    for (const x of [-0.3, 0.3]) k.cylinder(0.18, 0.18, 0.06, 12, INK, { position: [x, 0.28, -0.19], rotation: [Math.PI / 2, 0, 0] });
    k.box(0.9, 0.06, 0.06, INK, { position: [0, 0.7, 0] });
  } else {
    for (const [x, z, c] of [[-0.3, 0, '#e8559a'], [0.25, 0.1, '#f08a2e'], [0, -0.3, '#f4d23b']] as const) {
      k.cylinder(0.18, 0.14, 0.3, 8, '#c8643a', { position: [x, 0.15, z] });
      k.blob(0.28, c, { position: [x, 0.45, z], detail: 0, seed: x });
    }
  }
  return k.build(0.015, 9);
}
