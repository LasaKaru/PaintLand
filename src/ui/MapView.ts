/**
 * The paper map (docs/10 §6): press M for a hand-painted map of the area
 * with its districts, roads, places you have discovered, loot, stunts and
 * mission targets. Click a discovered place to travel there. A small
 * heading-up minimap shows the same painting in the corner while you play.
 */
export interface MapRegion {
  id: string;
  name: string;
  rect: [number, number, number, number];
  colour: string;
  /** 0 = pencil sketch, 1 = painted (Colour the City). */
  paint: number;
}

export interface MapInfo {
  id: string;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  regions: MapRegion[];
  roads: { x1: number; z1: number; x2: number; z2: number; w: number }[];
  water: { x: number; z: number; r: number }[];
  /** Sea along an edge: z beyond this is water. */
  seaZ?: number;
  /** Solid blobs worth drawing (plazas, landmarks). */
  blocks: { x: number; z: number; w: number; d: number; colour: string }[];
}

export type MarkerKind = 'place' | 'unknown' | 'zone' | 'chest' | 'secret' | 'stunt' | 'mission' | 'peer' | 'event';

export interface MapMarker {
  kind: MarkerKind;
  x: number;
  z: number;
  label?: string;
  icon?: string;
  colour?: string;
  /** Places: id to travel to. */
  travel?: string;
}

export interface MapState {
  player: { x: number; z: number; heading: number };
  markers: MapMarker[];
  /** Progress rows shown beside the map. */
  districts: { name: string; colour: string; paint: number; done: number; need: number }[];
  title: string;
  subtitle: string;
}

const PAPER = '#f3ecdc';
const INK = '#2b2622';

export class MapView {
  readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly side: HTMLDivElement;
  private readonly mini: HTMLCanvasElement;
  private base: HTMLCanvasElement | null = null;
  private info: MapInfo | null = null;
  private scale = 1;
  private hits: { x: number; y: number; r: number; travel: string }[] = [];
  private baseKey = '';
  open = false;
  onTravel: ((id: string) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'map-screen hidden';
    this.root.innerHTML = `<div class="map-card card"><canvas></canvas><div class="map-side"></div></div>`;
    container.appendChild(this.root);
    this.canvas = this.root.querySelector('canvas')!;
    this.side = this.root.querySelector('.map-side')!;
    this.mini = document.createElement('canvas');
    this.mini.className = 'minimap hidden';
    this.mini.width = this.mini.height = 176;
    container.appendChild(this.mini);
    this.canvas.addEventListener('click', (e) => this.click(e));
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-travel], [data-close]');
      if (el?.dataset.travel) this.onTravel?.(el.dataset.travel);
      else if (el?.dataset.close !== undefined || e.target === this.root) this.onClose?.();
    });
  }

  /** Use a new area (or refresh when district paint changes). */
  setArea(info: MapInfo): void {
    const key = `${info.id}:${info.regions.map((r) => r.paint.toFixed(2)).join(',')}`;
    this.info = info;
    if (key === this.baseKey) return;
    this.baseKey = key;
    this.base = paintBase(info);
  }

  show(on: boolean): void {
    this.open = on;
    this.root.classList.toggle('hidden', !on);
  }

  showMini(on: boolean): void {
    this.mini.classList.toggle('hidden', !on || !this.base);
  }

  /** Draw the full map (when open). */
  draw(state: MapState, time: number): void {
    if (!this.open || !this.base || !this.info) return;
    const b = this.info.bounds;
    const availW = Math.min(window.innerWidth - 360, 1100);
    const availH = window.innerHeight - 120;
    const w = b.maxX - b.minX;
    const h = b.maxZ - b.minZ;
    this.scale = Math.max(0.1, Math.min(availW / w, availH / h));
    const cw = Math.round(w * this.scale);
    const ch = Math.round(h * this.scale);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== cw * dpr) {
      this.canvas.width = cw * dpr;
      this.canvas.height = ch * dpr;
      this.canvas.style.width = `${cw}px`;
      this.canvas.style.height = `${ch}px`;
    }
    const g = this.canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(this.base, 0, 0, cw, ch);
    const px = (x: number): number => (x - b.minX) * this.scale;
    const pz = (z: number): number => (z - b.minZ) * this.scale;
    this.hits = [];
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const m of state.markers) {
      const x = px(m.x);
      const y = pz(m.z);
      drawMarker(g, m, x, y, time, true);
      if (m.travel) this.hits.push({ x, y, r: 14, travel: m.travel });
    }
    drawPlayer(g, px(state.player.x), pz(state.player.z), state.player.heading, 1.4);
    // Side panel: title, districts, places to travel to.
    const places = state.markers.filter((m) => m.travel);
    const html = `<div class="hand map-title">${state.title}</div><div class="label">${state.subtitle}</div>
      ${state.districts.length ? `<div class="map-districts">${state.districts
        .map((d) => `<div class="map-district"><span class="dot" style="--c:${d.colour}"></span><span>${d.name}</span><span class="bar"><i style="width:${Math.round(d.paint * 100)}%;background:${d.colour}"></i></span><small>${d.paint >= 1 ? '✓' : `${d.done}/${d.need}`}</small></div>`)
        .join('')}</div>` : ''}
      <div class="map-places">${places.map((p) => `<button class="btn small" data-travel="${p.travel}">${p.icon ?? '📍'} ${p.label}</button>`).join('')}</div>
      <button class="btn" data-close>✕ M</button>`;
    if (this.side.innerHTML !== html) this.side.innerHTML = html;
  }

  /** Heading-up minimap around the player. */
  drawMini(state: MapState, time: number): void {
    if (!this.base || !this.info || this.mini.classList.contains('hidden')) return;
    const g = this.mini.getContext('2d')!;
    const S = this.mini.width;
    const b = this.info.bounds;
    const k = this.base.width / (b.maxX - b.minX); // base pixels per metre
    const zoom = S / 260; // screen pixels per metre: shows ~260 m across
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#9fd0de';
    g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.rotate(state.player.heading);
    g.scale(zoom / k, zoom / k);
    g.translate(-(state.player.x - b.minX) * k, -(state.player.z - b.minZ) * k);
    g.drawImage(this.base, 0, 0);
    g.restore();
    // Markers, rotated with the map but drawn upright.
    const c = Math.cos(state.player.heading);
    const s = Math.sin(state.player.heading);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const m of state.markers) {
      const dx = (m.x - state.player.x) * zoom;
      const dz = (m.z - state.player.z) * zoom;
      let x = dx * c - dz * s;
      let y = dx * s + dz * c;
      const d = Math.hypot(x, y);
      const edge = S / 2 - 12;
      if (d > edge) {
        // Mission targets stick to the rim so you always know the way.
        if (m.kind !== 'mission' && m.kind !== 'event') continue;
        x *= edge / d;
        y *= edge / d;
      }
      drawMarker(g, m, S / 2 + x, S / 2 + y, time, false);
    }
    drawPlayer(g, S / 2, S / 2, 0, 1);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.stroke();
    // North marker on the rim.
    const nx = S / 2 + Math.sin(-state.player.heading) * (S / 2 - 12) * -1;
    const ny = S / 2 - Math.cos(-state.player.heading) * (S / 2 - 12);
    g.fillStyle = '#d8463a';
    g.font = 'bold 12px "Space Mono", monospace';
    g.fillText('N', nx, ny);
  }

  private click(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const hit = this.hits.find((h) => Math.hypot(h.x - x, h.y - y) < h.r);
    if (hit) this.onTravel?.(hit.travel);
  }

  dispose(): void {
    this.root.remove();
    this.mini.remove();
  }
}

/** Seeded wobble so painted edges look hand-made but stay put between redraws. */
function wobble(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

function mixGrey(hex: string, paint: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const l = r * 0.3 + g * 0.55 + b * 0.15;
  const m = (c: number): number => Math.round(l + (c - l) * paint);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/** Paint the static map once: paper, sea, districts, water, roads, blocks, labels. */
function paintBase(info: MapInfo): HTMLCanvasElement {
  const b = info.bounds;
  const k = Math.min(1, 1100 / (b.maxX - b.minX));
  const c = document.createElement('canvas');
  c.width = Math.round((b.maxX - b.minX) * k);
  c.height = Math.round((b.maxZ - b.minZ) * k);
  const g = c.getContext('2d')!;
  const X = (x: number): number => (x - b.minX) * k;
  const Z = (z: number): number => (z - b.minZ) * k;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  // Paper grain.
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(120,100,70,${0.03 + (wobble(i) + 0.5) * 0.03})`;
    g.fillRect((wobble(i * 3) + 0.5) * c.width, (wobble(i * 7) + 0.5) * c.height, 2, 2);
  }
  if (info.seaZ !== undefined) {
    g.fillStyle = 'rgba(80,170,200,0.55)';
    g.fillRect(0, Z(info.seaZ), c.width, c.height);
  }
  // Districts: layered washes with soft, uneven edges.
  info.regions.forEach((r, ri) => {
    const col = mixGrey(r.colour, 0.15 + r.paint * 0.85);
    for (let layer = 0; layer < 3; layer++) {
      g.globalAlpha = 0.16 + r.paint * 0.08;
      g.fillStyle = col;
      const j = 6 * k * (layer + 1);
      g.fillRect(X(r.rect[0]) + wobble(ri * 10 + layer) * j, Z(r.rect[1]) + wobble(ri * 10 + layer + 3) * j, (r.rect[2] - r.rect[0]) * k + wobble(ri + layer * 5) * j, (r.rect[3] - r.rect[1]) * k + wobble(ri + layer * 9) * j);
    }
    g.globalAlpha = 1;
    // Unpainted districts get pencil hatching.
    if (r.paint < 1) {
      g.save();
      g.beginPath();
      g.rect(X(r.rect[0]), Z(r.rect[1]), (r.rect[2] - r.rect[0]) * k, (r.rect[3] - r.rect[1]) * k);
      g.clip();
      g.strokeStyle = `rgba(60,55,50,${0.18 * (1 - r.paint)})`;
      g.lineWidth = 1;
      for (let d = -c.height; d < c.width; d += 9) {
        g.beginPath();
        g.moveTo(d, 0);
        g.lineTo(d + c.height, c.height);
        g.stroke();
      }
      g.restore();
    }
  });
  for (const w of info.water) {
    g.fillStyle = 'rgba(70,160,200,0.7)';
    g.beginPath();
    g.ellipse(X(w.x), Z(w.z), w.r * k, w.r * k * 0.8, 0.2, 0, Math.PI * 2);
    g.fill();
  }
  for (const bl of info.blocks) {
    g.fillStyle = bl.colour;
    g.fillRect(X(bl.x - bl.w / 2), Z(bl.z - bl.d / 2), bl.w * k, bl.d * k);
  }
  // Roads: ink outline, then lavender paint.
  g.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (const r of info.roads) {
      g.strokeStyle = pass ? '#b9b0d6' : INK;
      g.lineWidth = Math.max(pass ? 2 : 3.4, r.w * k + (pass ? 0 : 2));
      g.beginPath();
      g.moveTo(X(r.x1), Z(r.z1));
      g.lineTo(X(r.x2), Z(r.z2));
      g.stroke();
    }
  }
  // District names in brush lettering.
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const r of info.regions) {
    const w = (r.rect[2] - r.rect[0]) * k;
    const size = Math.max(11, Math.min(26, w / 9));
    g.font = `${size}px Caveat, cursive`;
    g.fillStyle = r.paint >= 1 ? INK : 'rgba(43,38,34,0.55)';
    g.fillText(r.name, X((r.rect[0] + r.rect[2]) / 2), Z((r.rect[1] + r.rect[3]) / 2));
  }
  return c;
}

function drawPlayer(g: CanvasRenderingContext2D, x: number, y: number, heading: number, s: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(-heading);
  g.fillStyle = '#d8463a';
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -9 * s);
  g.lineTo(6 * s, 7 * s);
  g.lineTo(0, 3 * s);
  g.lineTo(-6 * s, 7 * s);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

function drawMarker(g: CanvasRenderingContext2D, m: MapMarker, x: number, y: number, time: number, big: boolean): void {
  const s = big ? 1 : 0.8;
  g.lineWidth = 1.5;
  g.strokeStyle = INK;
  switch (m.kind) {
    case 'mission': {
      const r = (7 + Math.sin(time * 5) * 2) * s;
      g.fillStyle = 'rgba(244,210,59,0.9)';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      break;
    }
    case 'chest':
      g.fillStyle = m.colour ?? '#b58a5c';
      g.fillRect(x - 4 * s, y - 3 * s, 8 * s, 6 * s);
      g.strokeRect(x - 4 * s, y - 3 * s, 8 * s, 6 * s);
      break;
    case 'secret':
      g.fillStyle = '#f4c542';
      g.beginPath();
      g.arc(x, y, 3.5 * s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      break;
    case 'stunt':
      g.fillStyle = '#e8559a';
      g.beginPath();
      g.moveTo(x, y - 5 * s);
      g.lineTo(x + 5 * s, y + 4 * s);
      g.lineTo(x - 5 * s, y + 4 * s);
      g.closePath();
      g.fill();
      g.stroke();
      break;
    case 'peer':
      g.fillStyle = '#3e9fd8';
      g.beginPath();
      g.arc(x, y, 5 * s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      break;
    case 'unknown':
      g.fillStyle = 'rgba(43,38,34,0.5)';
      g.font = `bold ${Math.round(13 * s)}px "Space Mono", monospace`;
      g.fillText('?', x, y);
      break;
    default: {
      // Places, zones and events: an emoji on a paper disc.
      g.fillStyle = m.kind === 'event' ? 'rgba(255,224,138,0.95)' : PAPER;
      g.beginPath();
      g.arc(x, y, 9 * s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.font = `${Math.round(11 * s)}px sans-serif`;
      g.fillStyle = INK;
      g.fillText(m.icon ?? '📍', x, y + 1);
      if (big && m.label && m.kind === 'place') {
        g.font = '15px Caveat, cursive';
        g.fillText(m.label, x, y + 17);
      }
    }
  }
}
