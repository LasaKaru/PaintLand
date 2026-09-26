import * as THREE from 'three';
import type { HumanModel } from './Human';
import type { VehicleModel } from './Vehicles';

/** Never shrink a rider below this share of their size to fit a roof. */
export const MIN_FIT_SCALE = 0.85;
const MAX_SINK = 0.08;
const CLEARANCE = 0.02;

const _m = new THREE.Matrix4();
const _box = new THREE.Box3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

/** The rider's highest point in the vehicle's own frame (so tilting on a slope doesn't matter). */
function topInVehicle(vehicle: VehicleModel, human: HumanModel): number {
  const inv = _m.copy(vehicle.root.matrixWorld).invert();
  let top = -Infinity;
  human.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    mesh.geometry.computeBoundingBox();
    _box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
    top = Math.max(top, _box.max.y);
  });
  return top;
}

/** Height of the (outer) roof over the rider's head in the vehicle's frame, or null for open vehicles. */
function roofOver(vehicle: VehicleModel, human: HumanModel): number | null {
  const body = vehicle.body.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
  if (!body) return null;
  new THREE.Box3().setFromObject(human.head).getCenter(_p);
  _up.set(0, 1, 0).transformDirection(vehicle.root.matrixWorld);
  raycaster.set(_p, _up);
  raycaster.far = 4;
  const material = body.material as THREE.Material;
  const side = material.side;
  material.side = THREE.DoubleSide; // roofs are seen from below
  // Bodies are built from overlapping shells: the roof that shows is the
  // outermost surface above the head, so take the farthest hit.
  const hits = raycaster.intersectObject(body, false);
  material.side = side;
  if (!hits.length) return null;
  return _p.copy(hits[hits.length - 1].point).applyMatrix4(_m.copy(vehicle.root.matrixWorld).invert()).y;
}

/** How far the rider sticks up through the roof (≤ 0 when they fit). */
export function riderOverflow(vehicle: VehicleModel, human: HumanModel): number {
  vehicle.root.updateMatrixWorld(true);
  const roof = roofOver(vehicle, human);
  if (roof === null) return 0;
  return topInVehicle(vehicle, human) - (roof - CLEARANCE);
}

/**
 * Seat a character in a vehicle so they never poke through its roof: settle
 * a little lower into the seat, then (for very tall riders) scale down a
 * touch, never below MIN_FIT_SCALE; a hat that still doesn't fit comes off
 * while driving and goes back on when they get out.
 */
export function seatRider(vehicle: VehicleModel, human: HumanModel, height = 1): { sink: number; scale: number; hatOff: boolean } {
  vehicle.seat.add(human.root);
  human.root.position.set(0, -0.45, 0);
  human.root.quaternion.identity();
  const base = 0.85 * height;
  human.root.scale.setScalar(base);
  human.setHatVisible(true);
  human.animate(0, vehicle.def.seatPose, 0, 0);
  let over = riderOverflow(vehicle, human);
  const result = { sink: 0, scale: 1, hatOff: false };
  if (over <= 0) return result;
  result.sink = Math.min(over, MAX_SINK);
  human.root.position.y -= result.sink;
  over = riderOverflow(vehicle, human);
  if (over > 0) {
    // Shrink about the seat: the part above the seat gets shorter in proportion.
    vehicle.root.updateMatrixWorld(true);
    const seatY = _p.setFromMatrixPosition(vehicle.seat.matrixWorld).applyMatrix4(_m.copy(vehicle.root.matrixWorld).invert()).y;
    const span = topInVehicle(vehicle, human) - seatY;
    result.scale = Math.max(MIN_FIT_SCALE, (span - over) / span);
    human.root.scale.setScalar(base * result.scale);
    over = riderOverflow(vehicle, human);
  }
  if (over > 0 && human.hatVisible) {
    human.setHatVisible(false);
    result.hatOff = true;
  }
  return result;
}

/** Standing again: full size, hat back on. */
export function unseatRider(human: HumanModel, height = 1): void {
  human.root.position.set(0, 0, 0);
  human.root.quaternion.identity();
  human.root.scale.setScalar(height);
  human.setHatVisible(true);
}
