import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  DOT_SPACING, DOTS_PER_MESSAGE, MAX_DOTS_PER_PLACE, TRAIL_COLOURS, TrailBrush, TrailLayer, TrailStore, decodeDots, encodeDots, nearestTrailColour, packDots, unpackDots, type TrailDot,
} from '../src/gameplay/PaintTrail';

const dot = (x: number, c = 3): TrailDot => ({ x, y: 6.5, z: -x * 2, nx: 0, ny: 1, nz: 0, c, r: 1.2 });

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('paint trail', () => {
  it('stores dabs compactly and reads them back', () => {
    const dots = [dot(0), dot(12.3, 15), { ...dot(-900.6), nx: 0.6, ny: 0.8, r: 1.9 }];
    const back = decodeDots(encodeDots(dots));
    expect(back).toHaveLength(3);
    for (const [a, b] of dots.map((d, i) => [d, back[i]] as const)) {
      expect(b.x).toBeCloseTo(a.x, 0);
      expect(b.z).toBeCloseTo(a.z, 0);
      expect(b.ny).toBeCloseTo(a.ny, 1);
      expect(b.c).toBe(a.c);
      expect(b.r).toBeCloseTo(a.r, 1);
    }
    // 10 bytes a dab.
    expect(atob(encodeDots(dots)).length).toBe(30);
    expect(decodeDots('not base64!!')).toEqual([]);
  });

  it('keeps a trail per place, capped, across reloads', () => {
    const storage = memoryStorage();
    const a = new TrailStore(storage);
    for (let i = 0; i < MAX_DOTS_PER_PLACE + 50; i++) a.add('paris', dot(i % 100));
    a.add('hub', dot(1));
    a.save();
    const b = new TrailStore(storage);
    expect(b.dots('paris')).toHaveLength(MAX_DOTS_PER_PLACE);
    expect(b.dots('hub')).toHaveLength(1);
    expect(b.total).toBe(MAX_DOTS_PER_PLACE + 1);
    b.clear('paris');
    expect(new TrailStore(storage).dots('paris')).toHaveLength(0);
    b.clear();
    expect(storage.data.size).toBe(0);
  });

  it('survives blocked or corrupt storage', () => {
    const bad = { getItem: () => '{nope', setItem: () => { throw new Error('full'); }, removeItem: () => undefined };
    const s = new TrailStore(bad);
    s.add('x', dot(1));
    expect(() => s.save()).not.toThrow();
    expect(s.dots('x')).toHaveLength(1);
    expect(new TrailStore(null).total).toBe(0);
  });

  it('packs batches for the room and checks what comes in', () => {
    const many = Array.from({ length: 40 }, (_, i) => dot(i));
    const flat = packDots(many);
    expect(flat).toHaveLength(DOTS_PER_MESSAGE * 8);
    // Well under the relay's 4 KB per message.
    expect(JSON.stringify({ t: 'emote', kind: 'trail', place: 'islandtrip', d: flat }).length).toBeLessThan(4096);
    const got = unpackDots('islandtrip', flat);
    expect(got?.dots).toHaveLength(DOTS_PER_MESSAGE);
    expect(got?.dots[5].x).toBeCloseTo(5, 1);

    expect(unpackDots('Bad Place!', flat)).toBeNull();
    expect(unpackDots('hub', [])).toBeNull();
    expect(unpackDots('hub', flat.slice(0, 7))).toBeNull();
    expect(unpackDots('hub', [...flat, ...flat])).toBeNull();
    const withBad = (i: number, v: unknown) => { const f: unknown[] = packDots([dot(1)]); f[i] = v; return unpackDots('hub', f); };
    expect(withBad(0, 1e9)).toBeNull(); // far away
    expect(withBad(1, 'x')).toBeNull(); // not a number
    expect(withBad(4, 0)).toBeNull(); // no up vector
    expect(withBad(6, 16)).toBeNull(); // no such colour
    expect(withBad(6, 1.5)).toBeNull();
    expect(withBad(7, 9)).toBeNull(); // huge dab
    expect(withBad(1, Number.NaN)).toBeNull();
  });

  it('dabs every so often while driving on the ground', () => {
    const brush = new TrailBrush();
    const up = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const drive = (metres: number, grounded = true): number => {
      let n = 0;
      for (let i = 0; i < metres * 10; i++) {
        p.z -= 0.1;
        if (brush.update(p, up, grounded, 2, 20)) n++;
      }
      return n;
    };
    expect(drive(20)).toBe(0); // brush off
    brush.on = true;
    const n = drive(90);
    expect(n).toBeGreaterThan(90 / DOT_SPACING - 3);
    expect(n).toBeLessThan(90 / DOT_SPACING + 3);
    expect(drive(20, false)).toBe(0); // in the air
    // A teleport doesn't draw a line across the map.
    p.set(5000, 0, 0);
    expect(brush.update(p, up, true, 2, 20)).toBeNull();
  });

  it('draws dabs with their colours, wrapping round when full', () => {
    const layer = new TrailLayer(10);
    layer.set([dot(1), dot(2, 7)]);
    expect(layer.size).toBe(2);
    for (let i = 0; i < 15; i++) layer.add(dot(i));
    expect(layer.size).toBeLessThanOrEqual(10);
    const mesh = layer.group.children[0] as THREE.Mesh;
    const perDab = mesh.geometry.drawRange.count / layer.size;
    expect(Number.isInteger(perDab) && perDab > 0).toBe(true);
    // Colours are baked in: a pink dab is pink.
    layer.set([dot(0, 9)]);
    const c = mesh.geometry.getAttribute('color');
    expect(c.getX(0)).toBeGreaterThan(c.getZ(0));
    const drawn = () => layer.group.children.reduce((a, m) => a + (m as THREE.Mesh).geometry.drawRange.count, 0);
    layer.set([]);
    expect(drawn()).toBe(0);
  });

  it('matches the car colour to the nearest paint', () => {
    expect(nearestTrailColour(TRAIL_COLOURS[6])).toBe(6);
    expect(nearestTrailColour('#e1442e')).toBe(0);
  });
});
