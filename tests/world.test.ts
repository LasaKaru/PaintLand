import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHAPTERS } from '../src/world/Chapters';
import { Decorator } from '../src/world/Decorator';
import { Collectibles } from '../src/gameplay/Collectibles';
import { MISSIONS, missionsFor } from '../src/gameplay/Missions';
import { CATALOGUE } from '../src/gameplay/Profile';

describe.each(CHAPTERS.map((c) => [c.name, c] as const))('%s world', (_name, chapter) => {
  const path = chapter.buildRoute();

  it('dresses every district without errors and records landmarks', () => {
    const d = new Decorator(path, chapter);
    d.build();
    expect(d.group.children.length).toBeGreaterThan(20);
    expect(d.landmarks.length).toBeGreaterThanOrEqual(3);
    for (const lm of d.landmarks) expect(Number.isFinite(lm.position.x + lm.position.y + lm.position.z)).toBe(true);
  });

  it('nothing stands in the sea: every building at sea level is on painted land', () => {
    const d = new Decorator(path, chapter);
    d.build();
    d.group.updateMatrixWorld(true);
    const m = new THREE.Matrix4();
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const c = new THREE.Vector3();
    const wet: string[] = [];
    d.group.traverse((o) => {
      const im = o as THREE.InstancedMesh;
      if (!im.isInstancedMesh || d.isWaterOk(im.geometry)) return;
      if (!im.geometry.boundingBox) im.geometry.computeBoundingBox();
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        box.copy(im.geometry.boundingBox!).applyMatrix4(m.premultiply(im.matrixWorld));
        box.getSize(size);
        if (box.min.y < -1.2 || box.min.y > 1.4 || size.y < 1.6) continue;
        box.getCenter(c);
        if (!d.onLand(c.x, c.z)) wet.push(`${c.x.toFixed(0)},${c.z.toFixed(0)} h=${size.y.toFixed(1)}`);
      }
    });
    expect(wet).toEqual([]);
  });

  it('places notes and pickups', () => {
    const items = new Collectibles(path, chapter.districts);
    expect(items.notes.length).toBe(chapter.districts.reduce((n, d) => n + d.melody.length, 0));
  });

  it('has missions whose givers stand in real districts', () => {
    const missions = missionsFor(chapter.id);
    expect(missions.length).toBeGreaterThanOrEqual(6);
    for (const m of missions) {
      expect(m.giver.district).toBeLessThan(chapter.districts.length);
      if (m.district !== undefined) expect(m.district).toBeLessThan(chapter.districts.length);
    }
  });
});

describe('Missions and shop', () => {
  it('every mission reward item exists in the catalogue', () => {
    for (const m of MISSIONS) if (m.reward.item) expect(CATALOGUE.some((i) => i.id === m.reward.item)).toBe(true);
  });

  it('mission ids are unique', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });
});
