import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HumanModel } from '../src/models/Human';
import { BONE, CLIP_LOOPS, humanClips, type ClipName } from '../src/models/HumanClips';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {}, getContext: () => null });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const run = (h: HumanModel, seconds: number, pose: 'idle' | 'walk' = 'idle', onFrame?: () => void): void => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    h.animate(1 / 60, pose, pose === 'walk' ? 1.4 : 0, t);
    onFrame?.();
  }
};

describe('character rig', () => {
  it('has a skeleton of standard-named bones', () => {
    const h = new HumanModel();
    const names = h.skeleton.bones.map((b) => b.name).sort();
    expect(names).toEqual(Object.values(BONE).sort());
    for (const b of h.skeleton.bones) expect(b).toBeInstanceOf(THREE.Bone);
    // Bones hang from the character root, in a hierarchy.
    expect(h.skeleton.getBoneByName(BONE.leftForeArm)!.parent!.name).toBe(BONE.leftArm);
    expect(h.skeleton.getBoneByName(BONE.head)!.parent!.name).toBe(BONE.spine);
  });

  it('every clip is a valid three.js clip that binds to the rig', () => {
    const h = new HumanModel();
    const mixer = new THREE.AnimationMixer(h.root);
    for (const [name, clip] of Object.entries(humanClips())) {
      expect(clip.validate(), name).toBe(true);
      expect(clip.duration, name).toBeGreaterThan(0.3);
      for (const track of clip.tracks) expect(THREE.PropertyBinding.findNode(h.root, track.name.split('.')[0]), track.name).toBeTruthy();
      expect(mixer.clipAction(clip)).toBeTruthy();
    }
  });

  it('a throw plays over the procedural pose and hands back to it', () => {
    const h = new HumanModel();
    const arm = h.skeleton.getBoneByName(BONE.rightArm)!;
    run(h, 0.5);
    const rest = arm.quaternion.clone();
    h.play('throw', 0.06);
    expect(h.clip).toBe('throw');
    run(h, 0.14);
    expect(arm.quaternion.angleTo(rest)).toBeGreaterThan(1);
    run(h, 1);
    expect(h.clip).toBeNull();
    expect(arm.quaternion.angleTo(rest)).toBeLessThan(0.02);
  });

  it('crossfades smoothly (no pops) from walking into piloting and back', () => {
    const h = new HumanModel();
    run(h, 0.5, 'walk');
    const prev = new Map(h.skeleton.bones.map((b) => [b.name, b.quaternion.clone()]));
    let worst = 0;
    const track = (): void => {
      for (const b of h.skeleton.bones) {
        worst = Math.max(worst, b.quaternion.angleTo(prev.get(b.name)!));
        prev.get(b.name)!.copy(b.quaternion);
      }
    };
    h.play('pilot', 0.3);
    run(h, 3, 'idle', track);
    expect(h.clip).toBe('pilot');
    expect(h.hips.position.y).toBeCloseTo(0.42, 1);
    h.stop('pilot', 0.3);
    run(h, 1, 'idle', track);
    expect(h.clip).toBeNull();
    expect(h.hips.position.y).toBeGreaterThan(0.8);
    expect(worst).toBeLessThan(0.35);
  });

  it('loops what should loop and ends what shouldn’t', () => {
    for (const name of Object.keys(CLIP_LOOPS) as ClipName[]) {
      const h = new HumanModel();
      h.play(name);
      run(h, 4);
      expect(h.clip, name).toBe(CLIP_LOOPS[name] ? name : null);
    }
  });
});
