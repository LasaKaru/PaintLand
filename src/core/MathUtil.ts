import * as THREE from 'three';

export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const deg = (d: number): number => (d * Math.PI) / 180;

/**
 * Frame-rate independent exponential smoothing factor.
 * `sharpness` is roughly "how many times per second the gap closes by ~63%".
 */
export const damp = (sharpness: number, dt: number): number => 1 - Math.exp(-sharpness * dt);

export function dampScalar(current: number, target: number, sharpness: number, dt: number): number {
  return current + (target - current) * damp(sharpness, dt);
}

export function dampVec3(current: THREE.Vector3, target: THREE.Vector3, sharpness: number, dt: number): THREE.Vector3 {
  return current.lerp(target, damp(sharpness, dt));
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

/**
 * Build a rotation matrix whose columns are (right, up, back) from a forward and up vector.
 * Three.js objects face -Z, so "back" = -forward.
 */
export function basisFromForwardUp(forward: THREE.Vector3, up: THREE.Vector3, out: THREE.Matrix4): THREE.Matrix4 {
  const f = _f.copy(forward).normalize();
  const r = _r.crossVectors(f, up).normalize();
  const u = _u.crossVectors(r, f).normalize();
  return out.makeBasis(r, u, _b.copy(f).negate());
}

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _b = new THREE.Vector3();
