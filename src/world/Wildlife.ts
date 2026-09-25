import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

interface Bird {
  flock: number;
  angle: number;
  radius: number;
  height: number;
  speed: number;
  phase: number;
}

interface Flock {
  centre: THREE.Vector3;
  target: THREE.Vector3;
  birds: Bird[];
}

/**
 * Flocks of birds wheeling over the route (gulls by day, bats after dark),
 * three instanced meshes (body, left wing, right wing) updated on the CPU.
 * The flocks drift after the player so there is always life in the sky.
 */
export class Wildlife {
  readonly group = new THREE.Group();
  private readonly flocks: Flock[] = [];
  private readonly bodies: THREE.InstancedMesh;
  private readonly leftWings: THREE.InstancedMesh;
  private readonly rightWings: THREE.InstancedMesh;
  private readonly count: number;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly qWing = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly e = new THREE.Euler();
  private readonly q2 = new THREE.Quaternion();
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.05 });
  private nightColour = false;

  constructor(flocks = 3, perFlock = 11) {
    this.group.name = 'wildlife';
    const body = new ModelKit().blob(0.22, '#f4f2ee', { scale: [0.7, 0.6, 1.6], detail: 0, roughness: 0, pattern: Pattern.Matte }).box(0.12, 0.1, 0.25, '#f0a030', { position: [0, 0, -0.42] }).build(0);
    const wing = (side: number): THREE.BufferGeometry =>
      new ModelKit()
        .box(0.75, 0.04, 0.34, '#f4f2ee', { position: [side * 0.42, 0, 0], pattern: Pattern.Matte })
        .box(0.4, 0.04, 0.22, '#3a3d48', { position: [side * 0.95, 0, 0.04], rotation: [0, side * 0.2, 0], pattern: Pattern.Matte })
        .build(0);
    this.count = flocks * perFlock;
    this.bodies = new THREE.InstancedMesh(body, this.material, this.count);
    this.leftWings = new THREE.InstancedMesh(wing(-1), this.material, this.count);
    this.rightWings = new THREE.InstancedMesh(wing(1), this.material, this.count);
    for (const mesh of [this.bodies, this.leftWings, this.rightWings]) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(mesh);
    }
    for (let f = 0; f < flocks; f++) {
      const birds: Bird[] = [];
      for (let i = 0; i < perFlock; i++) {
        birds.push({ flock: f, angle: Math.random() * Math.PI * 2, radius: 14 + Math.random() * 16, height: Math.random() * 8, speed: 0.35 + Math.random() * 0.25, phase: Math.random() * 10 });
      }
      this.flocks.push({ centre: new THREE.Vector3(), target: new THREE.Vector3(), birds });
    }
  }

  /** Place flocks around the focus at start. */
  reset(focus: THREE.Vector3): void {
    this.flocks.forEach((fl, i) => {
      const a = (i / this.flocks.length) * Math.PI * 2;
      fl.centre.set(focus.x + Math.cos(a) * 90, focus.y + 30 + i * 8, focus.z + Math.sin(a) * 90);
      fl.target.copy(fl.centre);
    });
  }

  update(dt: number, time: number, focus: THREE.Vector3, night: number): void {
    // Bats at night: dark bodies, faster flaps.
    const isNight = night > 0.6;
    if (isNight !== this.nightColour) {
      this.nightColour = isNight;
      this.material.color.set(isNight ? '#3a3448' : '#ffffff');
    }
    let n = 0;
    for (let f = 0; f < this.flocks.length; f++) {
      const fl = this.flocks[f];
      // Wander: pick a new spot near the player when the flock gets there, or when the player runs away.
      if (fl.centre.distanceTo(fl.target) < 10 || fl.target.distanceTo(focus) > 260) {
        const a = Math.random() * Math.PI * 2;
        const r = 60 + Math.random() * 120;
        fl.target.set(focus.x + Math.cos(a) * r, focus.y + 22 + Math.random() * 40, focus.z + Math.sin(a) * r);
      }
      const far = fl.centre.distanceTo(focus) > 500;
      if (far) fl.centre.lerp(fl.target, 1);
      else fl.centre.lerp(fl.target, 1 - Math.exp(-0.12 * dt));
      for (const b of fl.birds) {
        b.angle += b.speed * dt * (isNight ? 1.6 : 1);
        const flap = Math.sin(time * (isNight ? 16 : 9) + b.phase) * (isNight ? 0.9 : 0.6);
        const glide = Math.sin(time * 0.5 + b.phase) > 0.4 ? 0.15 : 1;
        this.p.set(fl.centre.x + Math.cos(b.angle) * b.radius, fl.centre.y + b.height + Math.sin(time * 0.7 + b.phase) * 1.5, fl.centre.z + Math.sin(b.angle) * b.radius);
        // Face along the circle, bank into the turn.
        this.e.set(0, Math.PI - b.angle, -0.35, 'YXZ');
        this.q.setFromEuler(this.e);
        this.m.compose(this.p, this.q, this.s);
        this.bodies.setMatrixAt(n, this.m);
        this.qWing.setFromAxisAngle(_z, flap * glide);
        this.m.compose(this.p, this.q2.copy(this.q).multiply(this.qWing), this.s);
        this.leftWings.setMatrixAt(n, this.m);
        this.qWing.setFromAxisAngle(_z, -flap * glide);
        this.m.compose(this.p, this.q2.copy(this.q).multiply(this.qWing), this.s);
        this.rightWings.setMatrixAt(n, this.m);
        n++;
      }
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.leftWings.instanceMatrix.needsUpdate = true;
    this.rightWings.instanceMatrix.needsUpdate = true;
  }
}

const _z = new THREE.Vector3(0, 0, 1);
