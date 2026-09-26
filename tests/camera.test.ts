import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHAPTERS } from '../src/world/Chapters';
import { Decorator } from '../src/world/Decorator';
import { CameraRig, type DriveCamera } from '../src/camera/CameraRig';
import { defaultRoad, roadChapter } from '../src/creator/CustomRoad';

/**
 * Automated camera fly-through (docs/12 §6): drive every chapter (and a Road
 * Studio road) end to end with every driving camera, and check each frame
 * that the camera never dips under the sea, never ends up inside a building or
 * tree (the decorator's blocker spheres), and never produces NaN.
 */
const MODES: DriveCamera[] = ['chase', 'low', 'drone', 'cinema'];
const chapters = [...CHAPTERS, roadChapter(defaultRoad())];

describe.each(chapters.map((c) => [c.name, c] as const))('camera fly-through · %s', (_name, chapter) => {
  const path = chapter.buildRoute();
  const decor = new Decorator(path, chapter);
  decor.build();
  const blockers = decor.blockers;
  const pawn = new THREE.Vector3();
  const f = { position: new THREE.Vector3(), tangent: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };

  it.each(MODES)('%s camera stays above water and out of solid things', (mode) => {
    const rig = new CameraRig(path, blockers, 16 / 9);
    rig.driveMode = mode;
    rig.shake = 0;
    const dt = 1 / 15;
    const speed = 28;
    let under = 0;
    let inside = 0;
    let bad = 0;
    let frames = 0;
    const worst: string[] = [];
    for (let s = 8; s < path.length - 5; s += speed * dt) {
      rig.updateDrive(dt, { s, x: Math.sin(s / 60) * 2, h: 0, yaw: 0, speed, boosting: false });
      frames++;
      const p = rig.camera.position;
      if (!Number.isFinite(p.x + p.y + p.z)) bad++;
      if (p.y < 1.49) under++;
      // The pawn's own head, as the rig uses it: blockers containing the pawn are ignored by design.
      path.sample(s, f as never);
      pawn.copy(f.position).addScaledVector(f.up, 1.5);
      for (const b of blockers) {
        const r2 = b.radius * b.radius;
        if (pawn.distanceToSquared(b.center) < r2) continue;
        if (p.distanceToSquared(b.center) < r2 * 0.96) {
          inside++;
          if (worst.length < 3) worst.push(`s=${s.toFixed(0)} r=${b.radius.toFixed(1)}`);
          break;
        }
      }
    }
    expect(frames).toBeGreaterThan(50);
    expect(bad, 'NaN frames').toBe(0);
    expect(under, 'frames under the sea').toBe(0);
    expect(inside, `frames inside solid things (${worst.join('; ')})`).toBe(0);
  });
});
