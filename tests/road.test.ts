import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TrackBuilder } from '../src/road/TrackBuilder';
import { createFrame } from '../src/road/RoadPath';
import { CHAPTERS } from '../src/world/Chapters';

describe('TrackBuilder', () => {
  it('a straight road keeps its frame', () => {
    const path = new TrackBuilder(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 10).straight(100).build();
    expect(path.length).toBeCloseTo(100, 0);
    const f = path.sample(50);
    expect(f.position.z).toBeCloseTo(-50, 1);
    expect(f.up.y).toBeCloseTo(1, 5);
    expect(f.right.x).toBeCloseTo(1, 5);
  });

  it('a pitch of 180 degrees turns the road upside down', () => {
    const path = new TrackBuilder(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 10)
      .pitch(180, 20)
      .build();
    const end = path.sample(path.length);
    expect(end.up.y).toBeCloseTo(-1, 2);
    expect(end.tangent.z).toBeCloseTo(1, 2);
    expect(end.position.y).toBeCloseTo(40, 0);
  });

  it('a full loop returns upright, shifted sideways', () => {
    const path = new TrackBuilder(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 10)
      .loop(30, 15)
      .build();
    const end = path.sample(path.length);
    expect(end.up.y).toBeCloseTo(1, 2);
    expect(end.position.x).toBeCloseTo(15, 0);
    expect(Math.abs(end.position.y)).toBeLessThan(0.5);
  });
});

describe.each(CHAPTERS.map((c) => [c.name, c] as const))('%s route', (_name, chapter) => {
  const path = chapter.buildRoute();

  it('visits every district in order', () => {
    expect(path.spans.map((s) => s.district)).toEqual(chapter.districts.map((_, i) => i));
  });

  it('has orthonormal frames everywhere', () => {
    const f = createFrame();
    for (let s = 0; s < path.length; s += 3) {
      path.sample(s, f);
      expect(Math.abs(f.tangent.dot(f.up))).toBeLessThan(1e-3);
      expect(f.up.length()).toBeCloseTo(1, 4);
    }
  });

  it('never touches the ground or sea', () => {
    const f = createFrame();
    let minY = Infinity;
    for (let s = 0; s < path.length; s += 1) minY = Math.min(minY, path.sample(s, f).position.y);
    expect(minY).toBeGreaterThan(3);
  });

  it('is a proper chapter length (2–5 km)', () => {
    expect(path.length).toBeGreaterThan(2000);
    expect(path.length).toBeLessThan(5000);
  });

  it('every district melody has whole phrases', () => {
    for (const d of chapter.districts) expect(d.melody.length % 8).toBe(0);
  });
});
