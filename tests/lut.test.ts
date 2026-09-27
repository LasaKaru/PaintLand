import { describe, expect, it } from 'vitest';
import { LUT_LOOKS, LUT_SIZE, bakeLut, parseCube, sampleLut } from '../src/render/Lut';

describe('colour grading (LUTs)', () => {
  it('bakes every look into a full table, and "none" changes nothing', () => {
    for (const look of LUT_LOOKS) {
      const data = bakeLut(look.grade);
      expect(data.length, look.id).toBe(LUT_SIZE ** 3 * 4);
    }
    const id = bakeLut(LUT_LOOKS.find((l) => l.id === 'none')!.grade);
    for (const c of [[0, 0, 0], [1, 1, 1], [0.5, 0.25, 0.75], [1, 0, 0]] as const) {
      const [r, g, b] = sampleLut(id, LUT_SIZE, ...c);
      expect(Math.abs(r - c[0]) + Math.abs(g - c[1]) + Math.abs(b - c[2])).toBeLessThan(0.1);
    }
  });

  it('looks do what they say: golden warms, moonlight cools, ink is grey', () => {
    const at = (id: string, c: [number, number, number]) => sampleLut(bakeLut(LUT_LOOKS.find((l) => l.id === id)!.grade), LUT_SIZE, ...c);
    const grey: [number, number, number] = [0.7, 0.7, 0.7];
    const gold = at('golden', grey);
    expect(gold[0]).toBeGreaterThan(gold[2]);
    const moon = at('moonlight', grey);
    expect(moon[2]).toBeGreaterThan(moon[0]);
    const ink = at('ink', [0.9, 0.2, 0.1]);
    expect(Math.abs(ink[0] - ink[1])).toBeLessThan(0.05);
    // Nothing is flipped: bright stays brighter than dark in every look.
    for (const l of LUT_LOOKS) {
      const lo = at(l.id, [0.2, 0.2, 0.2]);
      const hi = at(l.id, [0.8, 0.8, 0.8]);
      expect(hi[1], l.id).toBeGreaterThan(lo[1]);
    }
  });

  it('reads .cube files and refuses anything else', () => {
    const rows: string[] = [];
    for (let b = 0; b < 2; b++) for (let g = 0; g < 2; g++) for (let r = 0; r < 2; r++) rows.push(`${1 - r} ${g} ${b}`);
    const cube = parseCube(`# made in Resolve\nTITLE "Invert red"\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n${rows.join('\n')}\n`)!;
    expect(cube.title).toBe('Invert red');
    expect(cube.size).toBe(2);
    expect(sampleLut(cube.data, 2, 0, 0, 0)).toEqual([1, 0, 0]);
    expect(parseCube('LUT_3D_SIZE 2\n0 0 0\n')).toBeNull(); // too few rows
    expect(parseCube('LUT_1D_SIZE 16\n')).toBeNull();
    expect(parseCube('LUT_3D_SIZE 999\n')).toBeNull();
    expect(parseCube(`LUT_3D_SIZE 2\nDOMAIN_MAX 2 2 2\n${rows.join('\n')}`)).toBeNull();
    expect(parseCube(`LUT_3D_SIZE 2\n${rows.join('\n').replace('0 0 0', 'a b c')}`)).toBeNull();
    expect(parseCube('<html>not a lut</html>')).toBeNull();
  });
});
