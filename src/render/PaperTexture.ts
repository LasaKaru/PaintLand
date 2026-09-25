import * as THREE from 'three';
import { Random } from '../core/Random';

/**
 * Procedural cold-press watercolour paper (512², tiling). Values sit around
 * 0.5 grey so the composite can use it both as a multiplier and as grain.
 * Generated at start-up: no download, and it can be swapped for a scan later.
 */
export function createPaperTexture(size = 512, seed = 7): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  const rnd = new Random(seed);
  const img = ctx.createImageData(size, size);

  // Tileable value noise at several scales = the paper's tooth.
  const octave = (cells: number): Float32Array => {
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd.next();
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = smooth(fx - x0);
        const ty = smooth(fy - y0);
        const g = (ix: number, iy: number): number => grid[((iy % cells) * cells) + (ix % cells)];
        const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * tx;
        const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * tx;
        out[y * size + x] = a + (b - a) * ty;
      }
    }
    return out;
  };
  const o1 = octave(8);
  const o2 = octave(32);
  const o3 = octave(128);
  const o4 = octave(256);

  for (let i = 0; i < size * size; i++) {
    const v = 0.5 + (o1[i] - 0.5) * 0.12 + (o2[i] - 0.5) * 0.22 + (o3[i] - 0.5) * 0.35 + (o4[i] - 0.5) * 0.3;
    const c = Math.max(0, Math.min(255, v * 255));
    img.data[i * 4] = c;
    img.data[i * 4 + 1] = c;
    img.data[i * 4 + 2] = c;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // A few long fibres.
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffffff';
  for (let i = 0; i < 260; i++) {
    const x = rnd.range(0, size);
    const y = rnd.range(0, size);
    const a = rnd.range(0, Math.PI * 2);
    const len = rnd.range(6, 26);
    ctx.lineWidth = rnd.range(0.5, 1.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + rnd.jitter(4), y + Math.sin(a) * len * 0.5 + rnd.jitter(4), x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
