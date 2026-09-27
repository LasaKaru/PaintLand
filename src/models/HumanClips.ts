/**
 * Keyframed animation clips for the characters, as standard three.js
 * AnimationClips on the character's named bones (see BONE in Human.ts). A
 * clip only moves the bones it has tracks for, and it is crossfaded over the
 * procedural walk/run/idle motion — so a throw works while running.
 *
 * Poses are written as Euler angles (the same convention as the procedural
 * code: rotation.x > 0 swings a limb forward, chest x < 0 leans forward) and
 * stored as quaternion tracks.
 */
import * as THREE from 'three';

/** Standard humanoid bone names (the common Mixamo-style names). */
export const BONE = {
  hips: 'Hips',
  spine: 'Spine',
  head: 'Head',
  leftArm: 'LeftArm',
  leftForeArm: 'LeftForeArm',
  rightArm: 'RightArm',
  rightForeArm: 'RightForeArm',
  leftUpLeg: 'LeftUpLeg',
  leftLeg: 'LeftLeg',
  rightUpLeg: 'RightUpLeg',
  rightLeg: 'RightLeg',
} as const;

export type BoneName = (typeof BONE)[keyof typeof BONE];
export type ClipName = 'throw' | 'pilot' | 'climb' | 'land';

/** Loop forever, or play once and fade back to the procedural motion. */
export const CLIP_LOOPS: Record<ClipName, boolean> = { throw: false, pilot: true, climb: true, land: false };

type Euler3 = [number, number, number];
type Keys = { t: number; pose: Partial<Record<BoneName, Euler3>>; hipsY?: number }[];

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

function clip(name: ClipName, keys: Keys): THREE.AnimationClip {
  const bones = new Set<BoneName>();
  for (const k of keys) for (const b of Object.keys(k.pose) as BoneName[]) bones.add(b);
  const times = keys.map((k) => k.t);
  const tracks: THREE.KeyframeTrack[] = [];
  for (const bone of bones) {
    const values: number[] = [];
    let last: Euler3 = [0, 0, 0];
    for (const k of keys) {
      last = k.pose[bone] ?? last;
      _q.setFromEuler(_e.set(last[0], last[1], last[2]));
      values.push(_q.x, _q.y, _q.z, _q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values));
  }
  if (keys.some((k) => k.hipsY !== undefined)) {
    let y = 0.86;
    const values: number[] = [];
    for (const k of keys) {
      y = k.hipsY ?? y;
      values.push(0, y, 0);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${BONE.hips}.position`, times, values));
  }
  return new THREE.AnimationClip(name, keys[keys.length - 1].t, tracks);
}

function buildClips(): Record<ClipName, THREE.AnimationClip> {
  return {
    // Wind up, twist, and lob with the right arm (the legs keep walking).
    throw: clip('throw', [
      { t: 0, pose: { RightArm: [0.3, 0, -0.12], RightForeArm: [0.3, 0, 0], Spine: [0, 0, 0] } },
      { t: 0.14, pose: { RightArm: [-2.3, 0, -0.35], RightForeArm: [1.3, 0, 0], Spine: [0.05, 0.35, 0] } },
      { t: 0.28, pose: { RightArm: [2.1, 0, -0.2], RightForeArm: [0.15, 0, 0], Spine: [-0.18, -0.3, 0] } },
      { t: 0.5, pose: { RightArm: [0.5, 0, -0.12], RightForeArm: [0.35, 0, 0], Spine: [0, 0, 0] } },
    ]),
    // Kneeling on the paper plane, leaning into the wind, arms out like wings.
    pilot: clip('pilot', [
      {
        t: 0,
        hipsY: 0.42,
        pose: { Spine: [-0.45, 0, 0], Head: [0.4, 0, 0], LeftArm: [0.2, 0, 1.25], RightArm: [0.2, 0, -1.25], LeftForeArm: [0.15, 0, 0], RightForeArm: [0.15, 0, 0], LeftUpLeg: [1.45, 0, 0.12], RightUpLeg: [1.45, 0, -0.12], LeftLeg: [-1.95, 0, 0], RightLeg: [-1.95, 0, 0] },
      },
      { t: 1, hipsY: 0.44, pose: { Spine: [-0.4, 0, 0.04], Head: [0.35, 0.1, 0], LeftArm: [0.25, 0, 1.4], RightArm: [0.15, 0, -1.1] } },
      { t: 2, hipsY: 0.42, pose: { Spine: [-0.45, 0, 0], Head: [0.4, 0, 0], LeftArm: [0.2, 0, 1.25], RightArm: [0.2, 0, -1.25] } },
    ]),
    // Hand over hand up a ladder or a wall.
    climb: clip('climb', [
      { t: 0, pose: { LeftArm: [2.9, 0, 0.1], RightArm: [2.2, 0, -0.1], LeftForeArm: [0.2, 0, 0], RightForeArm: [0.9, 0, 0], LeftUpLeg: [0.2, 0, 0], RightUpLeg: [0.95, 0, 0], LeftLeg: [-0.3, 0, 0], RightLeg: [-1.3, 0, 0], Spine: [-0.1, 0, 0] } },
      { t: 0.6, pose: { LeftArm: [2.2, 0, 0.1], RightArm: [2.9, 0, -0.1], LeftForeArm: [0.9, 0, 0], RightForeArm: [0.2, 0, 0], LeftUpLeg: [0.95, 0, 0], RightUpLeg: [0.2, 0, 0], LeftLeg: [-1.3, 0, 0], RightLeg: [-0.3, 0, 0], Spine: [-0.1, 0, 0] } },
      { t: 1.2, pose: { LeftArm: [2.9, 0, 0.1], RightArm: [2.2, 0, -0.1], LeftForeArm: [0.2, 0, 0], RightForeArm: [0.9, 0, 0], LeftUpLeg: [0.2, 0, 0], RightUpLeg: [0.95, 0, 0], LeftLeg: [-0.3, 0, 0], RightLeg: [-1.3, 0, 0], Spine: [-0.1, 0, 0] } },
    ]),
    // A soft landing: knees bend, arms out for balance, then stand up.
    land: clip('land', [
      { t: 0, hipsY: 0.86, pose: { LeftUpLeg: [0, 0, 0], RightUpLeg: [0, 0, 0], LeftLeg: [0, 0, 0], RightLeg: [0, 0, 0], LeftArm: [0, 0, 0.12], RightArm: [0, 0, -0.12], Spine: [0, 0, 0] } },
      { t: 0.15, hipsY: 0.62, pose: { LeftUpLeg: [0.9, 0, 0.1], RightUpLeg: [0.9, 0, -0.1], LeftLeg: [-1.4, 0, 0], RightLeg: [-1.4, 0, 0], LeftArm: [0.3, 0, 1.0], RightArm: [0.3, 0, -1.0], Spine: [-0.35, 0, 0] } },
      { t: 0.6, hipsY: 0.86, pose: { LeftUpLeg: [0, 0, 0], RightUpLeg: [0, 0, 0], LeftLeg: [0, 0, 0], RightLeg: [0, 0, 0], LeftArm: [0, 0, 0.12], RightArm: [0, 0, -0.12], Spine: [0, 0, 0] } },
    ]),
  };
}

let cache: Record<ClipName, THREE.AnimationClip> | null = null;

/** The shared clips (built once). */
export function humanClips(): Record<ClipName, THREE.AnimationClip> {
  return (cache ??= buildClips());
}
