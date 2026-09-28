// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { preprocess, NOISE, FBM4, FBM5 } from '../src/render/gpu/wgsl';
import * as paint from '../src/render/gpu/paintWgsl';
import * as sky from '../src/render/gpu/skyWgsl';
import * as post from '../src/render/gpu/postWgsl';
import { lutStrip } from '../src/render/gpu/lutStrip';
import { gpuFailure, markGpuFailed, rendererChoice, setRendererChoice } from '../src/render/Backend';

/** The WebGPU renderer beta (render/gpu): the parts that can be checked without a GPU. */
describe('WebGPU renderer (beta)', () => {
  it('preprocesses #if / #else / #endif, nested', () => {
    const src = ['a', '#if ROAD', 'road', '#if !FLAT', 'smooth', '#else', 'flat', '#endif', '#else', 'props', '#endif', 'z'].join('\n');
    expect(preprocess(src, { ROAD: true, FLAT: false }).split('\n')).toEqual(['a', 'road', 'smooth', 'z']);
    expect(preprocess(src, { ROAD: true, FLAT: true }).split('\n')).toEqual(['a', 'road', 'flat', 'z']);
    expect(preprocess(src, { ROAD: false, FLAT: true }).split('\n')).toEqual(['a', 'props', 'z']);
    expect(() => preprocess('#if A\nx', {})).toThrow();
    expect(() => preprocess('#endif', {})).toThrow();
  });

  // Every WGSL snippet, with every combination of paint flags.
  const snippets: [string, string][] = [
    ...Object.entries({ NOISE, FBM4, FBM5 }),
    ...Object.entries(sky),
    ...Object.entries(post),
    ...Object.entries(paint).flatMap(([name, src]) =>
      [0, 1, 2, 3, 4, 5, 6, 7, 31].map((bits): [string, string] => {
        const flags = { ROAD: !!(bits & 1), FLAT: !!(bits & 2), GHOST: !!(bits & 4), WASHABLE: !!(bits & 8), MAP: !!(bits & 16) };
        return [`${name}/${bits}`, preprocess(src, flags)];
      }),
    ),
  ];

  it.each(snippets)('%s is WGSL, not leftover GLSL', (_name, src) => {
    // GLSL-only spellings that WGSL rejects.
    for (const bad of [/\bvec[234]\(/, /\bfloat\s+\w+\s*=/, /\bint\s+\w+\s*=/, /\btexture2D\(/, /\bgl_\w+/, /\batan\([^,()]*,/, /\bmod\(/, /\bfract\(\s*\)/, /#if|#else|#endif/, /\bdFd[xy]\(/]) {
      expect(src, `${bad}`).not.toMatch(bad);
    }
    // Balanced braces and parentheses.
    const count = (c: string): number => src.split(c).length - 1;
    expect(count('{')).toBe(count('}'));
    expect(count('(')).toBe(count(')'));
    // WGSL needs parentheses when && and || meet.
    for (const line of src.split('\n')) if (line.includes('&&') && line.includes('||')) expect(line).toMatch(/\(\s*[^()]*&&[^()]*\)|\([^()]*\|\|[^()]*\)/);
  });

  it('every ink_ function used is defined somewhere in the WGSL', () => {
    const all = snippets.map(([, s]) => s).join('\n');
    const defined = new Set([...all.matchAll(/\bfn (ink_\w+)/g)].map((m) => m[1]));
    const used = new Set([...all.matchAll(/\b(ink_\w+)\s*\(/g)].map((m) => m[1]));
    expect([...used].filter((u) => !defined.has(u))).toEqual([]);
  });

  it('entry snippets hold exactly one function (wgslFn uses the first)', () => {
    for (const [name, src] of Object.entries({ SKY: sky.SKY, SEA: sky.SEA, GALAXY: sky.GALAXY, PARTICLE: sky.PARTICLE, PAINT_MAIN: paint.PAINT_MAIN, COMPOSITE: post.COMPOSITE, FINISH_MAIN: post.FINISH_MAIN, SSAO: post.SSAO, BLUR: post.BLUR })) {
      expect(src.match(/\bfn\s/g)?.length, name).toBe(1);
    }
  });

  it('lays a 3D LUT out as a strip of blue slices', () => {
    const n = 3;
    const data = new Uint8Array(n * n * n * 4);
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) data.set([x * 100, y * 100, z * 100, 255], ((z * n + y) * n + x) * 4);
    const t3 = new THREE.Data3DTexture(data, n, n, n);
    const strip = lutStrip(t3);
    expect(strip.image.width).toBe(n * n);
    expect(strip.image.height).toBe(n);
    const px = strip.image.data as Uint8Array;
    // Texel (x + z·n, y) holds the colour for (r = x, g = y, b = z).
    for (const [x, y, z] of [[0, 0, 0], [2, 1, 0], [1, 2, 2], [2, 2, 1]]) {
      const i = (y * n * n + z * n + x) * 4;
      expect([px[i], px[i + 1], px[i + 2]]).toEqual([x * 100, y * 100, z * 100]);
    }
    expect(lutStrip(t3)).toBe(strip); // cached
  });

  describe('renderer choice', () => {
    const store = new Map<string, string>();
    beforeEach(() => {
      store.clear();
      (globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      };
    });
    afterEach(() => {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    });

    it('defaults to WebGL; WebGPU is opt-in and survives a restart', () => {
      expect(rendererChoice()).toBe('webgl');
      setRendererChoice('webgpu');
      expect(rendererChoice()).toBe('webgpu');
      setRendererChoice('webgl');
      expect(rendererChoice()).toBe('webgl');
    });

    it('a failure switches back to WebGL and says why; choosing WebGPU again clears it', () => {
      setRendererChoice('webgpu');
      markGpuFailed('WebGPU device lost: test');
      expect(rendererChoice()).toBe('webgl');
      expect(gpuFailure()).toBe('WebGPU device lost: test');
      setRendererChoice('webgpu');
      expect(gpuFailure()).toBeNull();
    });
  });

  it('only the WebGPU entry imports three/webgpu, and the game loads it lazily', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(/await import\('\.\/render\/gpu'\)/);
    expect(main).not.toMatch(/from '\.\/render\/gpu/);
    for (const f of ['src/core/Game.ts', 'src/render/PaintPipeline.ts', 'src/render/Backend.ts', 'src/render/Particles.ts']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/from '[^']*(three\/webgpu|three\/tsl|\/gpu)/);
    }
  });
});
