import { t, type StringKey } from '../core/i18n';
import {
  decodeRoad, defaultRoad, encodeRoad, MAX_PIECES, newPiece, PIECE_KINDS, PIECE_RANGES, ROAD_PRESETS, ROAD_STYLES, roadStats, sanitizeRoad,
  type CustomRoad, type PieceKind, type RoadStats,
} from '../creator/CustomRoad';
import { accessible } from './a11y';

const KEY = 'paintland.road.v1';
const ICONS: Record<PieceKind, string> = { straight: '⬆', left: '↰', right: '↱', climb: '⬈', dive: '⬊', roll: '🌀', loop: '➰', scene: '🎨' };
const PAVINGS = ['slabs', 'cobbles', 'asphalt', 'stone', 'planks', 'earth'] as const;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Road Studio screen: build a road from pieces, see it from above with its
 * height, test-drive it, and share it as a code.
 */
export class RoadStudio {
  private road: CustomRoad = defaultRoad();
  private root: HTMLElement | null = null;
  private stats: RoadStats | null = null;

  constructor(
    private readonly onDrive: (road: CustomRoad) => void,
    private readonly toast: (text: string) => void,
    /** Publish to the road gallery (Menu → Gallery). */
    private readonly onPublish?: (code: string) => void,
  ) {
    try {
      const saved = localStorage.getItem(KEY);
      const road = saved ? decodeRoad(saved) : null;
      if (road) this.road = road;
    } catch {
      /* storage blocked: start from the example */
    }
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('change', (e) => this.onChange(e));
    this.render();
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, encodeRoad(this.road));
    } catch {
      /* ignore */
    }
  }

  private render(): void {
    if (!this.root) return;
    this.stats = roadStats(this.road);
    const r = this.road;
    const st = this.stats;
    const styleOptions = (sel: number): string => ROAD_STYLES.map((s, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(s.name)} · ${esc(s.chapter)}</option>`).join('');
    const num = (i: number, field: 'a' | 'b', label: string, unit: string): string => {
      const range = PIECE_RANGES[r.pieces[i].k][field]!;
      return `<label class="rs-num">${label}<input type="number" min="${range[0]}" max="${range[1]}" step="1" value="${r.pieces[i][field]}" data-rs-piece="${i}" data-rs-field="${field}"><small>${unit}</small></label>`;
    };
    const rows = r.pieces
      .map((p, i) => {
        let controls = '';
        if (p.k === 'straight') controls = num(i, 'a', t('rs.length'), 'm');
        else if (p.k === 'left' || p.k === 'right') controls = num(i, 'a', t('rs.angle'), '°') + num(i, 'b', t('rs.radius'), 'm');
        else if (p.k === 'climb' || p.k === 'dive') controls = num(i, 'a', t('rs.slope'), '°') + num(i, 'b', t('rs.length'), 'm');
        else if (p.k === 'roll') controls = num(i, 'a', t('rs.turns'), '×') + num(i, 'b', t('rs.length'), 'm');
        else if (p.k === 'loop') controls = num(i, 'a', t('rs.radius'), 'm');
        else controls = `<select aria-label="${t('rs.scene')}" data-rs-piece="${i}" data-rs-field="a">${styleOptions(p.a)}</select>`;
        return `<li class="rs-piece"><span class="rs-kind">${ICONS[p.k]} ${t(`rs.${p.k}` as StringKey)}</span><span class="rs-controls">${controls}</span>
          <span class="rs-move"><button class="btn small" data-rs-up="${i}" aria-label="${t('rs.up')}">↑</button><button class="btn small" data-rs-down="${i}" aria-label="${t('rs.down')}">↓</button><button class="btn small" data-rs-del="${i}" aria-label="${t('rs.remove')}">✕</button></span></li>`;
      })
      .join('');
    const add = PIECE_KINDS.map((k) => `<button class="btn small" data-rs-add="${k}">${ICONS[k]} ${t(`rs.${k}` as StringKey)}</button>`).join('');
    const warn = st.warnings.map((w) => `<span class="rs-warn">⚠ ${t(`rs.w.${w}` as StringKey)}</span>`).join(' ');
    this.root.innerHTML = `
      <div class="rs-grid">
        <div>
          <div class="field"><label>${t('rs.name')}</label><input class="text-input" maxlength="24" value="${esc(r.name)}" data-rs-set="name"></div>
          <div class="field"><label>${t('rs.start')}</label><select data-rs-set="style">${styleOptions(r.style)}</select></div>
          <div class="field"><label>${t('rs.time')}</label><select data-rs-set="preset">${ROAD_PRESETS.map((p) => `<option ${p === r.preset ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="field"><label>${t('rs.paving')}</label><select data-rs-set="paving">${PAVINGS.map((p, i) => `<option value="${i}" ${i === r.paving ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="field"><label>${t('rs.width')}</label><input type="range" min="8" max="14" step="1" value="${r.width}" data-rs-set="width"><output>${r.width} m</output></div>
        </div>
        <div>
          <canvas class="rs-preview" width="360" height="260" aria-label="${t('rs.preview')}"></canvas>
          <p class="rs-stats" role="status">${t('rs.stats', { length: Math.round(st.length), min: Math.round(st.minY), max: Math.round(st.maxY), scenes: st.scenes })} ${warn}</p>
          <div class="row wrap"><button class="btn primary" data-rs-action="drive">▶ ${t('rs.drive')}</button><button class="btn small" data-rs-action="example">↺ ${t('rs.example')}</button>${this.onPublish ? `<button class="btn small" data-rs-action="publish">🖼 ${t('gal.publish')}</button>` : ''}</div>
        </div>
      </div>
      <h4>${t('rs.pieces')} (${r.pieces.length}/${MAX_PIECES})</h4>
      <ol class="rs-list">${rows}</ol>
      <div class="row wrap rs-add">${add}</div>
      <h4>${t('lv.code')}</h4>
      <div class="invite-row"><input class="text-input" data-id="rscode" aria-label="${t('lv.code')}" maxlength="2400" value="${encodeRoad(r)}" spellcheck="false">
        <button class="btn small" data-rs-action="copy">${t('mp.copy')}</button><button class="btn small" data-rs-action="load">${t('lv.load')}</button></div>
      <p class="menu-hint">${t('rs.hint')}</p>`;
    accessible(this.root);
    this.drawPreview();
  }

  /** Top-down view: the road coloured from low (sea blue) to high (warm), start and finish flags. */
  private drawPreview(): void {
    const c = this.root?.querySelector<HTMLCanvasElement>('canvas.rs-preview');
    const ctx = c?.getContext('2d');
    const pts = this.stats?.outline;
    if (!c || !ctx || !pts?.length) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of pts) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    const pad = 18;
    const scale = Math.min((c.width - pad * 2) / Math.max(1, maxX - minX), (c.height - pad * 2) / Math.max(1, maxZ - minZ));
    const ox = (c.width - (maxX - minX) * scale) / 2;
    const oz = (c.height - (maxZ - minZ) * scale) / 2;
    const px = (x: number): number => ox + (x - minX) * scale;
    const pz = (z: number): number => oz + (z - minZ) * scale;
    ctx.fillStyle = '#efe8d8';
    ctx.fillRect(0, 0, c.width, c.height);
    const lo = this.stats!.minY;
    const span = Math.max(1, this.stats!.maxY - lo);
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    for (let i = 1; i < pts.length; i++) {
      const h = (pts[i][2] - lo) / span;
      ctx.strokeStyle = pts[i][2] < 3 ? '#3e9fd8' : `hsl(${200 - h * 180}, 60%, ${45 + h * 10}%)`;
      ctx.beginPath();
      ctx.moveTo(px(pts[i - 1][0]), pz(pts[i - 1][1]));
      ctx.lineTo(px(pts[i][0]), pz(pts[i][1]));
      ctx.stroke();
    }
    const flag = (p: [number, number, number], colour: string): void => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(px(p[0]), pz(p[1]), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b2622';
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    flag(pts[0], '#5dbb3f');
    flag(pts[pts.length - 1], '#d8463a');
  }

  private onChange(e: Event): void {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const d = el.dataset;
    if (d.rsSet) {
      const r = this.road as unknown as Record<string, unknown>;
      r[d.rsSet] = d.rsSet === 'name' || d.rsSet === 'preset' ? el.value : Number(el.value);
    } else if (d.rsPiece !== undefined && d.rsField) {
      const p = this.road.pieces[Number(d.rsPiece)];
      if (p) p[d.rsField as 'a' | 'b'] = Number(el.value);
    } else return;
    this.commit();
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!el) return;
    const d = el.dataset;
    const list = this.road.pieces;
    if (d.rsAdd) {
      if (list.length >= MAX_PIECES) return this.toast(t('rs.full'));
      list.push(newPiece(d.rsAdd as PieceKind));
    } else if (d.rsUp !== undefined) {
      const i = Number(d.rsUp);
      if (i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    } else if (d.rsDown !== undefined) {
      const i = Number(d.rsDown);
      if (i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    } else if (d.rsDel !== undefined) list.splice(Number(d.rsDel), 1);
    else if (d.rsAction === 'example') this.road = defaultRoad();
    else if (d.rsAction === 'drive') {
      this.save();
      this.onDrive(this.road);
      return;
    } else if (d.rsAction === 'publish') {
      if (this.stats?.warnings.some((w) => w !== 'long')) return this.toast(t('gal.fixFirst'));
      this.onPublish?.(encodeRoad(this.road));
      return;
    } else if (d.rsAction === 'copy') {
      void navigator.clipboard?.writeText(encodeRoad(this.road)).then(() => this.toast(t('lv.copied')), () => undefined);
      return;
    } else if (d.rsAction === 'load') {
      const input = this.root?.querySelector<HTMLInputElement>('[data-id="rscode"]');
      const road = decodeRoad(input?.value.trim() ?? '');
      if (!road) return this.toast(t('rs.bad'));
      this.road = road;
    } else return;
    this.commit();
  }

  private commit(): void {
    this.road = sanitizeRoad(this.road);
    this.save();
    this.render();
  }
}
