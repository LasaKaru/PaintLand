import { t } from '../core/i18n';
import { accessible } from './a11y';
import {
  decodeLivery, emptyLivery, encodeLivery, fillLivery, LIVERY_H, LIVERY_PALETTE, LIVERY_STAMPS, LIVERY_W, presetLivery, stampLivery,
} from '../gameplay/Livery';

type Tool = 'brush' | 'fill' | 'stamp';

const STAMP_ICONS: Record<string, string> = { lotus: '🪷', star: '⭐', heart: '❤', wave: '🌊', flame: '🔥', bolt: '⚡' };

/**
 * The livery painter (garage): a 32 × 16 pixel canvas, a paint box, brush,
 * fill and stamps, mirror painting, undo, ready-made designs and share codes.
 * Every finished stroke is saved and shown on the car behind the menu.
 */
export class LiveryEditor {
  private px = emptyLivery();
  private colour = 3;
  private tool: Tool = 'brush';
  private stamp = LIVERY_STAMPS[0];
  private mirror = false;
  private size = 1;
  private readonly undo: Uint8Array[] = [];
  private painting = false;
  private root: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(
    private readonly onSave: (code: string) => void,
    private readonly toast: (text: string) => void,
  ) {}

  /** Draw the editor into `root`, starting from the saved livery code. */
  mount(root: HTMLElement, code: string | undefined): void {
    this.root = root;
    this.px = decodeLivery(code) ?? emptyLivery();
    this.undo.length = 0;
    root.innerHTML = this.html();
    this.canvas = root.querySelector<HTMLCanvasElement>('canvas.livery-canvas');
    const c = this.canvas!;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pushUndo();
      this.painting = true;
      this.apply(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (this.painting && this.tool === 'brush') this.apply(e);
    });
    const end = (): void => {
      if (!this.painting) return;
      this.painting = false;
      this.save();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    root.addEventListener('click', (e) => this.onClick(e));
    accessible(root);
    this.draw();
  }

  private html(): string {
    const swatches = LIVERY_PALETTE.map(
      (col, i) => `<button class="swatch ${i === this.colour ? 'on' : ''} ${i === 0 ? 'none' : ''}" ${i ? `style="--c:${col}"` : ''} data-lcolour="${i}" aria-label="${i ? col : t('lv.eraser')}">${i ? '' : '⌫'}</button>`,
    ).join('');
    const tools = ([['brush', '🖌', t('lv.brush')], ['fill', '🪣', t('lv.fill')], ['stamp', '🔖', t('lv.stamp')]] as const)
      .map(([id, icon, label]) => `<button class="btn small ${this.tool === id ? 'primary' : ''}" data-ltool="${id}">${icon} ${label}</button>`)
      .join('');
    const stamps = LIVERY_STAMPS.map((s) => `<button class="btn small ${this.stamp === s ? 'primary' : ''}" data-lstamp="${s}" aria-label="${s}">${STAMP_ICONS[s] ?? s}</button>`).join('');
    return `
      <div class="livery-wrap"><canvas class="livery-canvas" width="${LIVERY_W * 12}" height="${LIVERY_H * 12}" aria-label="${t('lv.canvas')}"></canvas>
      <div class="livery-front">◀ ${t('lv.front')}</div></div>
      <div class="swatches">${swatches}</div>
      <div class="row wrap">${tools}
        <button class="btn small ${this.mirror ? 'primary' : ''}" data-laction="mirror">⇋ ${t('lv.mirror')}</button>
        <button class="btn small" data-laction="size">● ${this.size === 1 ? '1' : '2'}</button>
      </div>
      <div class="row wrap">${stamps}</div>
      <div class="row wrap">
        <button class="btn small" data-laction="undo">↶ ${t('lv.undo')}</button>
        <button class="btn small" data-laction="clear">✕ ${t('lv.clear')}</button>
        <button class="btn small" data-laction="preset">🎲 ${t('lv.idea')}</button>
      </div>
      <h4>${t('lv.code')}</h4>
      <div class="invite-row"> <input class="text-input" data-id="lcode" aria-label="${t('lv.code')}" maxlength="700" value="${encodeLivery(this.px)}" spellcheck="false">
        <button class="btn small" data-laction="copy">${t('mp.copy')}</button>
        <button class="btn small" data-laction="load">${t('lv.load')}</button></div>
      <p class="menu-hint">${t('lv.hint')}</p>`;
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!el || !this.root) return;
    const d = el.dataset;
    if (d.lcolour !== undefined) this.colour = Number(d.lcolour);
    else if (d.ltool) this.tool = d.ltool as Tool;
    else if (d.lstamp) {
      this.stamp = d.lstamp;
      this.tool = 'stamp';
    } else if (d.laction === 'mirror') this.mirror = !this.mirror;
    else if (d.laction === 'size') this.size = this.size === 1 ? 2 : 1;
    else if (d.laction === 'undo') {
      const prev = this.undo.pop();
      if (prev) {
        this.px = prev;
        this.save();
      }
    } else if (d.laction === 'clear') {
      this.pushUndo();
      this.px = emptyLivery();
      this.save();
    } else if (d.laction === 'preset') {
      this.pushUndo();
      const kinds = ['racer', 'sunset', 'garden', 'number'] as const;
      this.px = presetLivery(kinds[Math.floor(Math.random() * kinds.length)], Math.floor(Math.random() * 10));
      this.save();
    } else if (d.laction === 'copy') {
      const code = encodeLivery(this.px);
      void navigator.clipboard?.writeText(code).then(() => this.toast(t('lv.copied')), () => undefined);
    } else if (d.laction === 'load') {
      const input = this.root.querySelector<HTMLInputElement>('[data-id="lcode"]');
      const px = decodeLivery(input?.value.trim() ?? '');
      if (!px) {
        this.toast(t('lv.bad'));
        return;
      }
      this.pushUndo();
      this.px = px;
      this.save();
    } else return;
    this.refreshControls();
  }

  /** Re-draw the buttons (selection state) without rebuilding the canvas. */
  private refreshControls(): void {
    if (!this.root || !this.canvas) return;
    const holder = document.createElement('div');
    holder.innerHTML = this.html();
    const oldWrap = this.root.querySelector('.livery-wrap');
    const newWrap = holder.querySelector('.livery-wrap');
    if (oldWrap && newWrap) newWrap.replaceWith(oldWrap);
    this.root.replaceChildren(...holder.childNodes);
    accessible(this.root);
    this.draw();
  }

  private cell(e: PointerEvent): [number, number] {
    const r = this.canvas!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * LIVERY_W);
    const y = Math.floor(((e.clientY - r.top) / r.height) * LIVERY_H);
    return [Math.max(0, Math.min(LIVERY_W - 1, x)), Math.max(0, Math.min(LIVERY_H - 1, y))];
  }

  private apply(e: PointerEvent): void {
    const [x, y] = this.cell(e);
    const spots: [number, number][] = [[x, y]];
    // Mirror across the middle of the car (front half ↔ back half).
    if (this.mirror) spots.push([LIVERY_W - 1 - x, y]);
    for (const [sx, sy] of spots) {
      if (this.tool === 'fill') fillLivery(this.px, sx, sy, this.colour);
      else if (this.tool === 'stamp') stampLivery(this.px, this.stamp, sx, sy);
      else
        for (let dy = 0; dy < this.size; dy++)
          for (let dx = 0; dx < this.size; dx++) {
            const px = sx + dx;
            const py = sy + dy;
            if (px < LIVERY_W && py < LIVERY_H) this.px[py * LIVERY_W + px] = this.colour;
          }
    }
    this.draw();
    if (this.tool !== 'brush') {
      this.painting = false;
      this.save();
    }
  }

  private pushUndo(): void {
    this.undo.push(this.px.slice());
    if (this.undo.length > 40) this.undo.shift();
  }

  private save(): void {
    const code = encodeLivery(this.px);
    const input = this.root?.querySelector<HTMLInputElement>('[data-id="lcode"]');
    if (input) input.value = code;
    this.draw();
    this.onSave(code);
  }

  /** The editor view: a paper grid with the car's outline behind the paint. */
  private draw(): void {
    const c = this.canvas;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const s = c.width / LIVERY_W;
    ctx.fillStyle = '#efe8d8';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(43,38,34,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= LIVERY_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * s + 0.5, 0);
      ctx.lineTo(x * s + 0.5, c.height);
      ctx.stroke();
    }
    for (let y = 0; y <= LIVERY_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * s + 0.5);
      ctx.lineTo(c.width, y * s + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(43,38,34,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(c.width / 2, 0);
    ctx.lineTo(c.width / 2, c.height);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let y = 0; y < LIVERY_H; y++)
      for (let x = 0; x < LIVERY_W; x++) {
        const v = this.px[y * LIVERY_W + x];
        if (!v) continue;
        ctx.fillStyle = LIVERY_PALETTE[v];
        ctx.fillRect(x * s, y * s, s, s);
      }
  }
}
