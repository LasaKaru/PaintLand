import { t } from '../core/i18n';

/** A Vesak lantern you designed (hung from your home's eaves). */
export interface LanternDesign {
  frame: 'octagon' | 'star' | 'box';
  /** Paper colours of the eight panels. */
  panels: string[];
  tassel: string;
}

export const LANTERN_PAPERS = ['#e0432f', '#f4d23b', '#f08a2e', '#e8559a', '#3e86c9', '#5dbb3f', '#9a5bd6', '#f6f0e4'] as const;
export const MAX_LANTERNS = 3;
export const POT_SWINGS = 5;
export const POT_INK = 20;

export function defaultLantern(): LanternDesign {
  return { frame: 'octagon', panels: ['#e0432f', '#f4d23b', '#e0432f', '#f4d23b', '#e0432f', '#f4d23b', '#e0432f', '#f4d23b'], tassel: '#f4d23b' };
}

/** A design as stored: only known values survive. */
export function cleanLantern(d: unknown): LanternDesign | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as Partial<LanternDesign>;
  const colour = (c: unknown): c is string => typeof c === 'string' && (LANTERN_PAPERS as readonly string[]).includes(c);
  if (!['octagon', 'star', 'box'].includes(o.frame as string) || !Array.isArray(o.panels) || o.panels.length !== 8 || !o.panels.every(colour) || !colour(o.tassel)) return null;
  return { frame: o.frame as LanternDesign['frame'], panels: [...o.panels], tassel: o.tassel };
}

// ————— the pot game (kana mutti bindeema) —————

export interface PotRound {
  /** Pot positions along the rope, 0…1. */
  pots: number[];
  broken: boolean[];
  /** Where you stand (0…1). */
  x: number;
  swings: number;
}

/** Three pots at spread-out random spots; you start in the middle. */
export function newPotRound(rand: () => number = Math.random): PotRound {
  const pots: number[] = [];
  for (let tries = 0; pots.length < 3 && tries < 200; tries++) {
    const p = 0.08 + rand() * 0.84;
    if (pots.every((q) => Math.abs(q - p) > 0.18)) pots.push(p);
  }
  // (A stuck random source: fall back to evenly spaced pots.)
  if (pots.length < 3) pots.splice(0, pots.length, 0.2, 0.5, 0.8);
  return { pots: pots.sort((a, b) => a - b), broken: [false, false, false], x: 0.5, swings: POT_SWINGS };
}

/** How close the nearest unbroken pot is (1 = right above you, 0 = far): the blindfold hint. */
export function potWarmth(r: PotRound): number {
  let best = 1;
  r.pots.forEach((p, i) => {
    if (!r.broken[i]) best = Math.min(best, Math.abs(p - r.x));
  });
  return Math.max(0, 1 - best / 0.35);
}

/** Swing the stick: breaks a pot within reach. Returns the pot's index, or -1 for a miss (or no swings left). */
export function swing(r: PotRound, reach = 0.045): number {
  if (r.swings <= 0) return -1;
  r.swings--;
  const i = r.pots.findIndex((p, k) => !r.broken[k] && Math.abs(p - r.x) <= reach);
  if (i >= 0) r.broken[i] = true;
  return i;
}

// ————— the screen —————

export interface FestivalHost {
  lanterns(): LanternDesign[];
  saveLantern(d: LanternDesign): void;
  removeLantern(i: number): void;
  /** Ink for broken pots (doubled during Avurudu); returns what was paid. */
  potReward(pots: number): number;
  sound(freq: number, dur?: number): void;
}

/**
 * Menu → Festival games. Two little games that mount a canvas inside the menu
 * panel: making a Vesak lantern (it hangs from your home) and the blindfolded
 * pot-breaking game from Sinhala and Tamil New Year.
 */
export class FestivalGames {
  mode: 'lantern' | 'pots' = 'lantern';
  private design = defaultLantern();
  private paper: string = LANTERN_PAPERS[0];
  private round: PotRound = newPotRound();
  private canvas: HTMLCanvasElement | null = null;
  private raf = 0;
  private keys = new Set<string>();
  private flash = 0;
  private message = '';

  constructor(
    private readonly host: FestivalHost,
    private readonly toast: (m: string) => void,
    private readonly rerender: () => void,
  ) {}

  render(): string {
    const tabs = `<div class="seg"><button class="seg-btn ${this.mode === 'lantern' ? 'on' : ''}" data-fest-mode="lantern">🏮 ${t('fg.lantern')}</button><button class="seg-btn ${this.mode === 'pots' ? 'on' : ''}" data-fest-mode="pots">🏺 ${t('fg.pots')}</button></div>`;
    if (this.mode === 'pots') {
      return `${tabs}<p class="menu-hint">${t('fg.potsHint', { n: POT_SWINGS })}</p>
        <canvas class="fest-canvas" width="640" height="360" data-id="fest" tabindex="0" aria-label="${t('fg.pots')}"></canvas>
        <div class="row"><button class="btn" data-fest-move="-1" aria-label="${t('fg.left')}">◀</button><button class="btn primary" data-fest-swing="1">🏏 ${t('fg.swing')}</button><button class="btn" data-fest-move="1" aria-label="${t('fg.right')}">▶</button><button class="btn" data-fest-new="1">↻ ${t('fg.again')}</button></div>
        <p class="menu-hint" data-id="fest-msg">${this.message}</p>`;
    }
    const d = this.design;
    const saved = this.host.lanterns();
    return `${tabs}<p class="menu-hint">${t('fg.lanternHint')}</p>
      <div class="fest-lantern">
        <canvas class="fest-canvas" width="360" height="360" data-id="fest" aria-label="${t('fg.lantern')}"></canvas>
        <div>
          <h4>${t('fg.frame')}</h4><div class="seg">${(['octagon', 'star', 'box'] as const).map((f) => `<button class="seg-btn ${d.frame === f ? 'on' : ''}" data-fest-frame="${f}">${t(`fg.${f}` as 'fg.star')}</button>`).join('')}</div>
          <h4>${t('fg.paper')}</h4><div class="swatches">${LANTERN_PAPERS.map((c) => `<button class="swatch ${this.paper === c ? 'on' : ''}" style="--c:${c}" data-fest-paper="${c}" aria-label="${c}" aria-pressed="${this.paper === c}"></button>`).join('')}</div>
          <p class="menu-hint">${t('fg.paint')}</p>
          <div class="row wrap"><button class="btn small" data-fest-fill="1">${t('fg.fill')}</button><button class="btn small" data-fest-tassel="1">${t('fg.tassel')}</button></div>
          <div class="row"><button class="btn primary" data-fest-hang="1" ${saved.length >= MAX_LANTERNS ? 'disabled' : ''}>🏮 ${t('fg.hang')}</button></div>
          <p class="menu-hint">${t('fg.hung', { n: saved.length, max: MAX_LANTERNS })}</p>
          <div class="row wrap">${saved.map((_, i) => `<button class="btn small" data-fest-remove="${i}">🗑 ${i + 1}</button>`).join('')}</div>
        </div>
      </div>`;
  }

  /** After the menu has drawn: start the canvas. */
  mount(root: HTMLElement): void {
    cancelAnimationFrame(this.raf);
    this.canvas = root.querySelector<HTMLCanvasElement>('[data-id="fest"]');
    if (!this.canvas) return;
    if (this.mode === 'lantern') {
      this.canvas.onclick = (e) => this.paintPanel(e);
      this.drawLantern();
      return;
    }
    const c = this.canvas;
    c.onkeydown = (e) => {
      e.stopPropagation();
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.doSwing();
      } else this.keys.add(e.code);
    };
    c.onkeyup = (e) => {
      e.stopPropagation();
      this.keys.delete(e.code);
    };
    c.focus({ preventScroll: true });
    let last = performance.now();
    const loop = (now: number): void => {
      if (!this.canvas?.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dir = (this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? 1 : 0);
      this.move(dir * dt * 0.35);
      this.drawPots(now / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private move(dx: number): void {
    const r = this.round;
    const before = potWarmth(r);
    r.x = Math.max(0, Math.min(1, r.x + dx));
    // The crowd calls out as you get warmer (a rising note).
    const w = potWarmth(r);
    if (dx !== 0 && Math.floor(w * 5) > Math.floor(before * 5)) this.host.sound(300 + w * 500, 0.06);
  }

  private doSwing(): void {
    const r = this.round;
    if (r.swings <= 0) return;
    const hit = swing(r);
    this.flash = 1;
    this.host.sound(hit >= 0 ? 880 : 160, hit >= 0 ? 0.25 : 0.12);
    const broken = r.broken.filter(Boolean).length;
    if (r.swings === 0 || broken === r.pots.length) {
      const ink = this.host.potReward(broken);
      this.message = t('fg.potsDone', { n: broken, ink });
      this.toast(this.message);
    } else this.message = hit >= 0 ? t('fg.hit', { n: r.swings }) : t('fg.miss', { n: r.swings });
    const msg = this.canvas?.parentElement?.querySelector('[data-id="fest-msg"]');
    if (msg) msg.textContent = this.message;
  }

  onClick(el: HTMLElement): boolean {
    const d = el.dataset;
    if (d.festMode) {
      this.mode = d.festMode as 'lantern' | 'pots';
      this.message = '';
      this.rerender();
      return true;
    }
    if (d.festMove) {
      this.move(Number(d.festMove) * 0.04);
      this.canvas?.focus({ preventScroll: true });
      return true;
    }
    if (d.festSwing) {
      this.doSwing();
      this.canvas?.focus({ preventScroll: true });
      return true;
    }
    if (d.festNew) {
      this.round = newPotRound();
      this.message = '';
      this.rerender();
      return true;
    }
    if (d.festFrame) {
      this.design.frame = d.festFrame as LanternDesign['frame'];
      this.rerender();
      return true;
    }
    if (d.festPaper) {
      this.paper = d.festPaper;
      this.rerender();
      return true;
    }
    if (d.festFill) {
      this.design.panels = this.design.panels.map(() => this.paper);
      this.drawLantern();
      return true;
    }
    if (d.festTassel) {
      this.design.tassel = this.paper;
      this.drawLantern();
      return true;
    }
    if (d.festHang) {
      if (this.host.lanterns().length >= MAX_LANTERNS) return true;
      this.host.saveLantern({ ...this.design, panels: [...this.design.panels] });
      this.host.sound(660, 0.2);
      this.toast(t('fg.hungToast'));
      this.rerender();
      return true;
    }
    if (d.festRemove) {
      this.host.removeLantern(Number(d.festRemove));
      this.rerender();
      return true;
    }
    return false;
  }

  // ————— drawing —————

  /** Click a panel of the lantern to paper it. */
  private paintPanel(e: MouseEvent): void {
    const c = this.canvas!;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width - c.width / 2;
    const y = ((e.clientY - r.top) / r.height) * c.height - c.height / 2 + 10;
    const a = Math.atan2(y, x);
    const i = ((Math.round((a / (Math.PI * 2)) * 8) % 8) + 8) % 8;
    this.design.panels[i] = this.paper;
    this.host.sound(520 + i * 40, 0.05);
    this.drawLantern();
  }

  private drawLantern(): void {
    const c = this.canvas;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    drawLanternArt(g, c.width, c.height, this.design);
  }

  private drawPots(time: number): void {
    const c = this.canvas;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const W = c.width;
    const H = c.height;
    const r = this.round;
    // The yard: a rope strung between two poles, the crowd, and the pots.
    g.fillStyle = '#f2d7a0';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8cc63f';
    g.fillRect(0, H * 0.78, W, H * 0.22);
    g.strokeStyle = '#7a5a3a';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(20, H * 0.2);
    g.quadraticCurveTo(W / 2, H * 0.28, W - 20, H * 0.2);
    g.stroke();
    r.pots.forEach((p, i) => {
      const x = 30 + p * (W - 60);
      const y = H * 0.24 + Math.sin(p * Math.PI) * H * 0.04;
      g.strokeStyle = '#7a5a3a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + 30);
      g.stroke();
      if (r.broken[i]) {
        g.fillStyle = '#b8744a';
        for (let k = 0; k < 5; k++) g.fillRect(x - 20 + k * 9, H * 0.76 - (k % 2) * 6, 7, 5);
        g.fillStyle = '#f4d23b';
        g.font = '20px sans-serif';
        g.fillText('✨', x - 10, y + 60);
      } else {
        g.fillStyle = '#c96a3a';
        g.beginPath();
        g.ellipse(x, y + 48, 20, 18, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2b2622';
        g.fillRect(x - 10, y + 28, 20, 5);
      }
    });
    // You, with a stick.
    const px = 30 + r.x * (W - 60);
    const lift = this.flash > 0 ? -1 : 0;
    g.fillStyle = '#2b2622';
    g.fillRect(px - 8, H * 0.55, 16, H * 0.23);
    g.beginPath();
    g.arc(px, H * 0.5, 13, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#b58a5c';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(px, H * 0.58);
    g.lineTo(px + 10, H * 0.58 + lift * 110 - 70);
    g.stroke();
    this.flash = Math.max(0, this.flash - 0.08);
    // The blindfold: dark everywhere except a faint glow that brightens as you get warm.
    const warm = potWarmth(r);
    if (r.swings > 0 && r.broken.some((b) => !b)) {
      const grad = g.createRadialGradient(px, H * 0.45, 20, px, H * 0.45, 70 + warm * 140);
      grad.addColorStop(0, `rgba(20,16,14,${0.35 - warm * 0.25})`);
      grad.addColorStop(1, 'rgba(20,16,14,0.96)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      // The crowd's hint: a pulsing ring, faster when you're close.
      g.strokeStyle = `rgba(244,210,59,${0.25 + warm * 0.6})`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(px, H * 0.45, 26 + Math.sin(time * (3 + warm * 12)) * 6, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = r.swings > 0 ? '#f6f0e4' : '#2b2622';
    g.font = '600 18px sans-serif';
    g.fillText(`🏏 ${r.swings}   🏺 ${r.broken.filter(Boolean).length}/${r.pots.length}`, 14, 26);
  }

  unmount(): void {
    cancelAnimationFrame(this.raf);
    this.keys.clear();
  }
}

/** A Vesak lantern: an octagonal (or star, or box) frame of paper panels with tassels. */
export function drawLanternArt(g: CanvasRenderingContext2D, W: number, H: number, d: LanternDesign): void {
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#1f1c2e';
  g.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2 - 10;
  const R = Math.min(W, H) * 0.3;
  // A warm glow behind.
  const glow = g.createRadialGradient(cx, cy, 10, cx, cy, R * 1.7);
  glow.addColorStop(0, 'rgba(255,200,120,0.55)');
  glow.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.lineWidth = 3;
  g.strokeStyle = '#2b2622';
  for (let i = 0; i < 8; i++) {
    const a0 = ((i - 0.5) / 8) * Math.PI * 2;
    const a1 = ((i + 0.5) / 8) * Math.PI * 2;
    const r0 = d.frame === 'star' ? R * 0.55 : R;
    const tip = d.frame === 'star' ? R * 1.15 : R;
    g.fillStyle = d.panels[i];
    g.globalAlpha = 0.92;
    g.beginPath();
    g.moveTo(cx, cy);
    if (d.frame === 'box') {
      const s = R * 0.9;
      const corner = (a: number): [number, number] => [cx + Math.max(-s, Math.min(s, Math.cos(a) * s * 1.5)), cy + Math.max(-s, Math.min(s, Math.sin(a) * s * 1.5))];
      g.lineTo(...corner(a0));
      g.lineTo(...corner((a0 + a1) / 2));
      g.lineTo(...corner(a1));
    } else {
      g.lineTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
      g.lineTo(cx + Math.cos((a0 + a1) / 2) * tip, cy + Math.sin((a0 + a1) / 2) * tip);
      g.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
    }
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    g.stroke();
  }
  // Tassels hanging from the bottom points.
  g.strokeStyle = d.tassel;
  g.lineWidth = 3;
  for (let k = -2; k <= 2; k++) {
    const x = cx + k * R * 0.28;
    g.beginPath();
    g.moveTo(x, cy + R * 0.7);
    g.lineTo(x + Math.sin(k) * 4, cy + R * 1.5 + Math.abs(k) * -8);
    g.stroke();
  }
  // The hook it hangs from.
  g.strokeStyle = '#f6f0e4';
  g.beginPath();
  g.moveTo(cx, 0);
  g.lineTo(cx, cy - R);
  g.stroke();
}
