/**
 * Turns any logo (a company or sponsor upload) into a watercolour painting on
 * paper, so real brands sit in the painted world instead of on top of it:
 *
 *   1. the logo's white/grey background is keyed out, so only the "ink" remains;
 *   2. pigment is thinned toward the paper and granulates (patchy density);
 *   3. a blurred copy bleeds out around the shapes, like wet-on-wet;
 *   4. edges darken where pigment pools as the wash dries;
 *   5. warm paper with grain, soft coloured blooms and a wobbly inked border.
 *
 * The result is a canvas used as a texture (brand boards) or an <img> (menu).
 */

export interface PaintOptions {
  width: number;
  height: number;
  /** Paper colour. */
  paper?: string;
  /** Colour of the soft background blooms. */
  bloom?: string;
  seed?: number;
  /** Draw the inked border (off for small UI chips). */
  border?: boolean;
}

/** Tiny seeded random (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Smooth value noise on a coarse grid (for granulation and blooms). */
function noiseField(w: number, h: number, cell: number, rand: () => number): Float32Array {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh).map(() => rand());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    let ty = gy - y0;
    ty = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      let tx = gx - x0;
      tx = tx * tx * (3 - 2 * tx);
      const a = grid[y0 * gw + x0];
      const b = grid[y0 * gw + x0 + 1];
      const c = grid[(y0 + 1) * gw + x0];
      const d = grid[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

/** Separable box blur of one float channel, in place. */
function boxBlur(ch: Float32Array, w: number, h: number, r: number): void {
  if (r < 1) return;
  const tmp = new Float32Array(ch.length);
  const n = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += ch[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / n;
      acc += ch[y * w + Math.min(w - 1, x + r + 1)] - ch[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      ch[y * w + x] = acc / n;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Warm paper with grain and a few soft colour blooms. */
function paintPaper(ctx: CanvasRenderingContext2D, w: number, h: number, o: PaintOptions, rand: () => number): void {
  ctx.fillStyle = o.paper ?? '#f6efdf';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 5; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.25 + rand() * 0.4) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, o.bloom ?? (i % 2 ? 'rgba(244, 210, 150, 0.22)' : 'rgba(180, 205, 225, 0.18)'));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // Paper tooth: fine speckles and a few longer fibres.
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.fillStyle = `rgba(110, 90, 60, ${0.03 + rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** A hand-inked, slightly wobbly border. */
function inkBorder(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number): void {
  const m = Math.round(Math.min(w, h) * 0.04);
  ctx.strokeStyle = 'rgba(43, 38, 34, 0.85)';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass ? 0.35 : 0.9;
    ctx.beginPath();
    const pts: [number, number][] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) pts.push([m + ((w - 2 * m) * i) / steps, m]);
    for (let i = 1; i <= steps; i++) pts.push([w - m, m + ((h - 2 * m) * i) / steps]);
    for (let i = 1; i <= steps; i++) pts.push([w - m - ((w - 2 * m) * i) / steps, h - m]);
    for (let i = 1; i < steps; i++) pts.push([m, h - m - ((h - 2 * m) * i) / steps]);
    pts.forEach(([x, y], i) => {
      const jx = x + (rand() - 0.5) * m * 0.3;
      const jy = y + (rand() - 0.5) * m * 0.3;
      if (i === 0) ctx.moveTo(jx, jy);
      else ctx.lineTo(jx, jy);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Paint a logo as watercolour. `img` may be any drawable (image, canvas).
 * Returns a new canvas of the requested size.
 */
export function paintLogo(img: CanvasImageSource & { width: number; height: number }, o: PaintOptions): HTMLCanvasElement {
  const w = o.width;
  const h = o.height;
  const rand = rng(o.seed ?? 7);
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  paintPaper(ctx, w, h, o, rand);

  // Fit the logo inside the margins, keeping its aspect.
  const margin = 0.12;
  const iw = Number(img.width) || 1;
  const ih = Number(img.height) || 1;
  const scale = Math.min((w * (1 - 2 * margin)) / iw, (h * (1 - 2 * margin)) / ih);
  const dw = Math.max(1, Math.round(iw * scale));
  const dh = Math.max(1, Math.round(ih * scale));
  const ox = Math.round((w - dw) / 2);
  const oy = Math.round((h - dh) / 2);
  const src = makeCanvas(w, h);
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(img, ox, oy, dw, dh);
  let data: ImageData;
  try {
    data = sctx.getImageData(0, 0, w, h);
  } catch {
    // A cross-origin image without CORS cannot be read: paint it plainly.
    ctx.globalAlpha = 0.9;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(img, ox, oy, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (o.border !== false) inkBorder(ctx, w, h, rand);
    return out;
  }
  const px = data.data;
  const n = w * h;
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const B = new Float32Array(n);
  const A = new Float32Array(n);
  const gran = noiseField(w, h, Math.max(3, Math.round(w / 90)), rand);
  const bloom = noiseField(w, h, Math.max(8, Math.round(w / 12)), rand);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4] / 255;
    const g = px[i * 4 + 1] / 255;
    const b = px[i * 4 + 2] / 255;
    let a = px[i * 4 + 3] / 255;
    // 1. Key out the white/grey background (the "paper" of the original logo).
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;
    const lum = r * 0.3 + g * 0.55 + b * 0.15;
    if (sat < 0.18) a *= 1 - smoothstep(0.78, 0.93, lum);
    // 2. Thin the pigment toward the paper and let it granulate.
    const thin = 0.1 + bloom[i] * 0.12;
    R[i] = r + (1 - r) * thin;
    G[i] = g + (1 - g) * thin;
    B[i] = b + (1 - b) * thin;
    A[i] = a * (0.78 + gran[i] * 0.22);
  }
  // 3. Bleed: a soft, wider copy of the pigment underneath.
  const bleedA = A.slice();
  const radius = Math.max(2, Math.round(Math.min(w, h) / 110));
  boxBlur(bleedA, w, h, radius);
  // 4. Edge darkening: where the pigment is dense but its neighbourhood is thin.
  const nearA = A.slice();
  boxBlur(nearA, w, h, Math.max(1, Math.round(radius / 2)));
  // Colour of the bleed: the blurred pigment colour.
  const bR = R.map((v, i) => v * A[i]);
  const bG = G.map((v, i) => v * A[i]);
  const bB = B.map((v, i) => v * A[i]);
  boxBlur(bR, w, h, radius);
  boxBlur(bG, w, h, radius);
  boxBlur(bB, w, h, radius);

  const layer = ctx.createImageData(w, h);
  const lp = layer.data;
  for (let i = 0; i < n; i++) {
    const edge = Math.max(0, A[i] - nearA[i]) * 1.6;
    const main = A[i];
    const bl = bleedA[i] * 0.5;
    const alpha = Math.min(1, main * 0.9 + bl * (1 - main) + edge * 0.4);
    if (alpha <= 0.002) continue;
    // Mix crisp pigment with bleed colour; darken at the pooled edges.
    const wMain = main / Math.max(1e-4, main + bl);
    const cr = (R[i] * wMain + (bleedA[i] > 0 ? bR[i] / bleedA[i] : R[i]) * (1 - wMain)) * (1 - edge * 0.35);
    const cg = (G[i] * wMain + (bleedA[i] > 0 ? bG[i] / bleedA[i] : G[i]) * (1 - wMain)) * (1 - edge * 0.35);
    const cb = (B[i] * wMain + (bleedA[i] > 0 ? bB[i] / bleedA[i] : B[i]) * (1 - wMain)) * (1 - edge * 0.35);
    lp[i * 4] = Math.round(Math.min(1, cr) * 255);
    lp[i * 4 + 1] = Math.round(Math.min(1, cg) * 255);
    lp[i * 4 + 2] = Math.round(Math.min(1, cb) * 255);
    lp[i * 4 + 3] = Math.round(alpha * 255);
  }
  sctx.clearRect(0, 0, w, h);
  sctx.putImageData(layer, 0, 0);
  // 5. Lay the pigment onto the paper (multiply, like a transparent wash).
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (o.border !== false) inkBorder(ctx, w, h, rand);
  return out;
}

/** "Your brand here" card for empty sponsor slots. */
export function paintCta(title: string, line: string, o: PaintOptions): HTMLCanvasElement {
  const w = o.width;
  const h = o.height;
  const rand = rng(o.seed ?? 11);
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d')!;
  paintPaper(ctx, w, h, { ...o, bloom: 'rgba(232, 85, 154, 0.12)' }, rand);
  // A loose brush swash behind the title.
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(244, 210, 59, 0.55)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.42, w * 0.38, h * 0.16, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#2b2622';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = Math.round(h * 0.2);
  ctx.font = `${size}px "Permanent Marker", "Caveat", cursive`;
  while (ctx.measureText(title).width > w * 0.84 && size > 10) ctx.font = `${--size}px "Permanent Marker", "Caveat", cursive`;
  ctx.fillText(title, w / 2, h * 0.42);
  let small = Math.round(h * 0.1);
  ctx.font = `600 ${small}px "Space Mono", monospace`;
  while (ctx.measureText(line).width > w * 0.86 && small > 8) ctx.font = `600 ${--small}px "Space Mono", monospace`;
  ctx.fillStyle = '#d2643a';
  ctx.fillText(line, w / 2, h * 0.7);
  if (o.border !== false) inkBorder(ctx, w, h, rand);
  return out;
}

const images = new Map<string, Promise<HTMLImageElement | null>>();

/** Load an image with CORS so it can be repainted (null when it fails). */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let p = images.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

const painted = new Map<string, Promise<HTMLCanvasElement | null>>();

/** Paint (and cache) a logo URL at a size. */
export function paintedLogo(url: string, w: number, h: number, border = true): Promise<HTMLCanvasElement | null> {
  const key = `${url}|${w}x${h}|${border}`;
  let p = painted.get(key);
  if (!p) {
    p = loadImage(url).then((img) => (img ? paintLogo(img, { width: w, height: h, seed: hashString(url), border }) : null));
    painted.set(key, p);
  }
  return p;
}

/** Forget painted logos (after the admin changes branding). */
export function clearPainted(): void {
  painted.clear();
  images.clear();
}
