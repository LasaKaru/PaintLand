/**
 * The paper plane you ride (a big folded dart, nose toward −z, the rider
 * sits on top), the rings of a flight course, and the little stand the
 * plane waits on at each town's launch ring.
 */
import * as THREE from 'three';
import { ModelKit } from './ModelKit';

/** Where the rider sits, in the plane's own space. */
export const PLANE_SEAT = new THREE.Vector3(0, 0.12, 0.25);

/** Flat triangles, drawn from both sides. */
function sheet(tris: number[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const [ax, ay, az, bx, by, bz, cx, cy, cz] of tris) {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    pos.push(ax, ay + 0.01, az, cx, cy + 0.01, cz, bx, by + 0.01, bz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function buildPaperPlane(colour = '#f6f0e4', stripe = '#e8559a'): THREE.BufferGeometry {
  const k = new ModelKit();
  const nose: [number, number, number] = [0, 0.05, -3.2];
  // Wings, with a slight upward fold (dihedral) at the tips.
  k.add(
    sheet([
      [...nose, 0, 0, 2.0, -2.6, 0.35, 2.1],
      [...nose, 2.6, 0.35, 2.1, 0, 0, 2.0],
    ]),
    colour,
  );
  // The keel folded underneath.
  k.add(
    sheet([
      [...nose, 0, -0.55, 1.8, 0, 0, 2.0],
      [0, 0, 2.0, 0, -0.55, 1.8, ...nose],
    ]),
    '#e6dcc8',
  );
  // A painted stripe along each wing.
  k.add(
    sheet([
      [0, 0.03, -1.9, -1.9, 0.29, 2.08, -1.5, 0.24, 2.07],
      [0, 0.03, -1.9, 1.5, 0.24, 2.07, 1.9, 0.29, 2.08],
    ]),
    stripe,
  );
  return k.build(0);
}

/** A ring to fly through, facing +z before it is turned to its heading. */
export function buildFlightRing(colour: string, r: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.add(new THREE.TorusGeometry(r + 0.4, 0.4, 6, 36), colour, { nightGlow: 1 });
  // Little paper streamers on the ring.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box(0.3, 1.4, 0.05, i % 2 ? '#f6f0e4' : '#f4d23b', { position: [Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4) - 0.8, 0], nightGlow: 1 });
  }
  return k.build(0);
}

/** A little wooden stand the plane waits on at a launch ring. */
export function buildPlaneStand(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.8, 0.3, 4.4, '#8a6a4a', { position: [0, 0.15, 0] });
  k.box(0.25, 1.4, 0.25, '#7a5a3a', { position: [0, 0.8, -1.2] });
  k.box(0.25, 1.1, 0.25, '#7a5a3a', { position: [0, 0.65, 1.2] });
  // A windsock.
  k.box(0.12, 4, 0.12, '#7a5a3a', { position: [2.6, 2, 0] });
  k.cylinder(0.35, 0.18, 1.4, 8, '#e0432f', { position: [2.6, 3.7, 0.7], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.02);
}

/** A paper parachute for a dropped car: striped canopy and four cords (cords end at y = 0). */
export function buildParachute(): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#f6f0e4', '#e8559a', '#f6f0e4', '#f4d23b', '#f6f0e4', '#3e86c9'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.blob(1.7, colours[i], { position: [Math.cos(a) * 1.9, 6.4, Math.sin(a) * 1.9], scale: [1.1, 0.45, 1.1], detail: 1 });
  }
  k.blob(2.2, '#f6f0e4', { position: [0, 6.9, 0], scale: [1.2, 0.5, 1.2], detail: 1 });
  for (const [x, z] of [[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]] as const) {
    const top = new THREE.Vector3(x * 2.6, 6.1, z * 1.6);
    const bottom = new THREE.Vector3(x * 0.9, 0, z * 1.4);
    const mid = top.clone().add(bottom).multiplyScalar(0.5);
    const len = top.distanceTo(bottom);
    const dir = top.clone().sub(bottom).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    k.cylinder(0.03, 0.03, len, 4, '#2b2622', { position: [mid.x, mid.y, mid.z], rotation: [e.x, e.y, e.z] });
  }
  return k.build(0.01);
}
