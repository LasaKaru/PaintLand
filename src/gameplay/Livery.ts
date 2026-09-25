/**
 * Hand-painted car liveries: a small pixel picture (32 × 16) painted in the
 * garage, shown on both sides of the car, saved in the profile and sent to
 * other players. It travels as a short share code:
 *
 *   L1.<base64url of run-length bytes>   each byte = (run − 1) << 4 | colour
 *
 * Colour 0 is clear (the car's own paint shows through). The code is checked
 * strictly when read, because peers and pasted codes are untrusted.
 */

export const LIVERY_W = 32;
export const LIVERY_H = 16;
export const LIVERY_SIZE = LIVERY_W * LIVERY_H;
/** Longest code accepted (a worst-case picture is 512 bytes → 686 chars). */
export const LIVERY_MAX_CODE = 700;

/** The paint box: index 0 is clear. */
export const LIVERY_PALETTE = [
  'transparent',
  '#f6f0e4', '#2b2622', '#d8463a', '#f08a2e', '#f4d23b', '#8cc63f', '#4f9a5a', '#2f8f86',
  '#3e9fd8', '#3e6fa8', '#9a5bd6', '#e8559a', '#f7b8cf', '#c8955a', '#8c8a94',
];

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toB64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = i + 1 >= bytes.length ? 2 : i + 2 >= bytes.length ? 3 : 4;
    for (let c = 0; c < chars; c++) out += B64[(n >> (18 - c * 6)) & 63];
  }
  return out;
}

function fromB64(s: string): number[] | null {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const chunk = s.slice(i, i + 4);
    if (chunk.length === 1) return null;
    let n = 0;
    for (let c = 0; c < 4; c++) {
      const v = c < chunk.length ? B64.indexOf(chunk[c]) : 0;
      if (v < 0) return null;
      n = (n << 6) | v;
    }
    bytes.push((n >> 16) & 255);
    if (chunk.length > 2) bytes.push((n >> 8) & 255);
    if (chunk.length > 3) bytes.push(n & 255);
  }
  return bytes;
}

export function emptyLivery(): Uint8Array {
  return new Uint8Array(LIVERY_SIZE);
}

export function isEmptyLivery(px: Uint8Array): boolean {
  return px.every((v) => v === 0);
}

/** Pixels → share code ('' for a blank picture). */
export function encodeLivery(px: Uint8Array): string {
  if (px.length !== LIVERY_SIZE || isEmptyLivery(px)) return '';
  const bytes: number[] = [];
  let i = 0;
  while (i < px.length) {
    const c = px[i] & 15;
    let run = 1;
    while (run < 16 && i + run < px.length && (px[i + run] & 15) === c) run++;
    bytes.push(((run - 1) << 4) | c);
    i += run;
  }
  return `L1.${toB64(bytes)}`;
}

/** Share code → pixels, or null when the code is not a valid livery. */
export function decodeLivery(code: unknown): Uint8Array | null {
  if (typeof code !== 'string' || code.length > LIVERY_MAX_CODE || !code.startsWith('L1.')) return null;
  const bytes = fromB64(code.slice(3));
  if (!bytes) return null;
  const px = new Uint8Array(LIVERY_SIZE);
  let i = 0;
  for (const b of bytes) {
    const run = (b >> 4) + 1;
    if (i + run > LIVERY_SIZE) return null;
    px.fill(b & 15, i, i + run);
    i += run;
  }
  return i === LIVERY_SIZE ? px : null;
}

/** Flood fill from (x, y) with colour `c`. */
export function fillLivery(px: Uint8Array, x: number, y: number, c: number): void {
  const from = px[y * LIVERY_W + x];
  if (from === c) return;
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= LIVERY_W || cy >= LIVERY_H) continue;
    const i = cy * LIVERY_W + cx;
    if (px[i] !== from) continue;
    px[i] = c;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

/** Ready-made designs to start from (drawn from little ASCII sketches). */
const STAMP_ART: Record<string, { art: string[]; colours: Record<string, number> }> = {
  lotus: {
    colours: { p: 12, l: 13, g: 7, y: 5 },
    art: ['.....p.....', '....plp....', '.p..plp..p.', '.lp.plp.pl.', '..lpplppl..', '...lpypl...', 'gggglllgggg', '..ggggggg..'],
  },
  star: {
    colours: { y: 5, o: 4 },
    art: ['....y....', '....y....', '...yyy...', 'yyyyoyyyy', '.yyoooyy.', '..yyyyy..', '..yy.yy..', '.yy...yy.', '.y.....y.'],
  },
  heart: {
    colours: { r: 3, p: 12 },
    art: ['.rr...rr.', 'rppr.rrrr', 'rpprrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],
  },
  wave: {
    colours: { b: 10, c: 9, w: 1 },
    art: ['.....bbbb.......', '...bbccccb......', '..bccwwwccb.....', '.bccw...wccb....', 'bccw.....bccb...', 'ccw.......bccbbb', 'w..........bcccc'],
  },
  flame: {
    colours: { r: 3, o: 4, y: 5 },
    art: ['r..........', 'rr...r.....', 'orr..rr..r.', 'oorrrorrrr.', 'yooooooorrr', 'yyyyyyoooor', 'oooooooorr.', 'rrrrrrrr...'],
  },
  bolt: {
    colours: { y: 5, k: 2 },
    art: ['....kyyk', '...kyyk.', '..kyyk..', '.kyyyyyk', '..kkyyk.', '...kyyk.', '..kyyk..', '.kyk....'],
  },
};

export const LIVERY_STAMPS = Object.keys(STAMP_ART);

/** Paint a stamp centred at (cx, cy); clear cells in the stamp leave the picture alone. */
export function stampLivery(px: Uint8Array, name: string, cx: number, cy: number): void {
  const s = STAMP_ART[name];
  if (!s) return;
  const h = s.art.length;
  const w = Math.max(...s.art.map((r) => r.length));
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);
  s.art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = s.colours[row[x]];
      const px_ = x0 + x;
      const py = y0 + y;
      if (c === undefined || px_ < 0 || py < 0 || px_ >= LIVERY_W || py >= LIVERY_H) continue;
      px[py * LIVERY_W + px_] = c;
    }
  });
}

/** Quick starter designs for the random button. */
export function presetLivery(kind: 'racer' | 'sunset' | 'garden' | 'number', n = 7): Uint8Array {
  const px = emptyLivery();
  const row = (y: number, c: number, x0 = 0, x1 = LIVERY_W): void => {
    px.fill(c, y * LIVERY_W + x0, y * LIVERY_W + x1);
  };
  if (kind === 'racer') {
    for (const y of [6, 7]) row(y, 1);
    for (const y of [5, 8]) row(y, 3);
    stampLivery(px, 'star', 25, 7);
  } else if (kind === 'sunset') {
    for (let y = 9; y < 16; y++) row(y, y < 11 ? 5 : y < 13 ? 4 : 3);
    stampLivery(px, 'wave', 9, 11);
  } else if (kind === 'garden') {
    for (let y = 12; y < 16; y++) row(y, 7);
    stampLivery(px, 'lotus', 8, 8);
    stampLivery(px, 'lotus', 22, 8);
  } else {
    // A racing roundel with a number.
    for (let y = 0; y < 16; y++) for (let x = 8; x < 24; x++) if (Math.hypot(x - 15.5, y - 7.5) < 7.6) px[y * LIVERY_W + x] = 1;
    drawDigit(px, n % 10, 13, 3, 2);
  }
  return px;
}

const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];

/** A 3 × 5 digit drawn at 2× (6 × 10 pixels). */
function drawDigit(px: Uint8Array, d: number, x0: number, y0: number, c: number): void {
  const bits = DIGITS[d];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 6; x++) if (bits[(y >> 1) * 3 + (x >> 1)] === '1') px[(y0 + y) * LIVERY_W + x0 + x] = c;
}

/**
 * Paint the picture onto a canvas as soft watercolour dabs (the texture on the
 * car). `scale` canvas pixels per livery pixel.
 */
export function paintLiveryCanvas(canvas: HTMLCanvasElement, px: Uint8Array, scale = 8): void {
  canvas.width = LIVERY_W * scale;
  canvas.height = LIVERY_H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // A fixed pseudo-random wobble so the same livery always looks the same.
  let seed = 7;
  const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < LIVERY_H; y++)
    for (let x = 0; x < LIVERY_W; x++) {
      const c = px[y * LIVERY_W + x];
      if (!c) continue;
      ctx.fillStyle = LIVERY_PALETTE[c];
      ctx.globalAlpha = 0.9 + rnd() * 0.1;
      const j = scale * 0.12;
      ctx.beginPath();
      ctx.roundRect(x * scale - j * rnd(), y * scale - j * rnd(), scale + j * 2, scale + j * 2, scale * 0.3);
      ctx.fill();
    }
  ctx.globalAlpha = 1;
}
