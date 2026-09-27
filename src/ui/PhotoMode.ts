import type { StudioSettings } from '../render/StudioSettings';
import { t } from '../core/i18n';
import { BRUSH_ICONS, BRUSH_KINDS, type BrushKind } from '../gameplay/SkyBrush';
import { TIME_PRESETS, WEATHER_ORDER, WEATHERS, type WeatherId } from '../world/Environment';

export interface PhotoHost {
  studio(): StudioSettings;
  studioChanged(): void;
  setTime(id: string): void;
  setWeather(id: WeatherId): void;
  capture(multiplier: 1 | 2 | 4): void;
  exit(): void;
  /** Line up a group photo with a countdown (free-roam areas, on foot). */
  groupPhoto?(): void;
  /** Send this view to a friend's mailbox as a postcard. */
  postcard?(): void;
  /** Enter this view in the weekly photo contest. */
  contest?(): void;
  /** The weather brush: which weather a drag paints (null: dragging looks around), its size, wipe it. */
  brush?(kind: BrushKind | null): void;
  brushSize?(size: number): void;
  brushClear?(): void;
}

/** Photo-mode camera and lens values (not saved). */
export interface PhotoState {
  fov: number;
  roll: number;
  focus: number;
  blur: number;
  autoFocus: boolean;
  hidePlayer: boolean;
}

/**
 * Photo mode panel (docs/08 §5): freeze the world, fly the camera, set the
 * lens (field of view, roll, focus, blur), the light (time, weather, exposure,
 * realism) and save a PNG up to 4K.
 */
export class PhotoMode {
  readonly root: HTMLDivElement;
  private brushKind: BrushKind | null = null;
  private brushSize = 1;
  readonly state: PhotoState = { fov: 60, roll: 0, focus: 12, blur: 0.4, autoFocus: true, hidePlayer: false };

  constructor(parent: HTMLElement, private readonly host: PhotoHost) {
    this.root = document.createElement('div');
    this.root.className = 'photo-panel hidden';
    parent.appendChild(this.root);
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => this.onInput(e));
    this.root.addEventListener('click', (e) => this.onClick(e));
    // Keep key presses inside the panel from flying the camera.
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
  }

  open(fov: number): void {
    this.brushKind = null;
    this.state.fov = Math.round(fov);
    this.state.roll = 0;
    this.render();
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** Called by the game when auto-focus measures a new distance. */
  showFocus(m: number): void {
    const el = this.root.querySelector<HTMLInputElement>('[data-p="focus"]');
    if (el && this.state.autoFocus) {
      el.value = String(Math.round(m));
      const out = el.nextElementSibling;
      if (out) out.textContent = `${Math.round(m)} m`;
    }
  }

  private render(): void {
    const st = this.state;
    const s = this.host.studio();
    const slider = (key: string, label: string, v: number, min: number, max: number, step: number, unit = '', studio = false): string =>
      `<div class="field"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" ${studio ? 'data-s' : 'data-p'}="${key}"><output>${fmt(v)}${unit}</output></div>`;
    this.root.innerHTML = `
      <div class="menu-head"><div class="hand menu-title">Photo mode</div><button class="btn" data-a="exit">✕ Close</button></div>
      <p class="menu-hint">Drag to look · <kbd>W A S D</kbd> move · <kbd>Space</kbd>/<kbd>Ctrl</kbd> up/down · <kbd>Shift</kbd> faster · <kbd>P</kbd> or <kbd>Esc</kbd> to leave</p>
      <h4>Lens</h4>
      ${slider('fov', 'Field of view', st.fov, 20, 110, 1, '°')}
      ${slider('roll', 'Roll', st.roll, -45, 45, 1, '°')}
      <label class="check"><input type="checkbox" data-p="autoFocus" ${st.autoFocus ? 'checked' : ''}> Auto-focus on the centre</label>
      ${slider('focus', 'Focus distance', st.focus, 1, 300, 1, ' m')}
      ${slider('blur', 'Background blur (depth of field)', st.blur, 0, 1, 0.01)}
      <h4>Light</h4>
      <div class="seg wrap">${TIME_PRESETS.map((t) => `<button class="seg-btn" data-time="${t.id}">${t.label}</button>`).join('')}</div>
      <div class="seg wrap" style="margin-top:6px">${WEATHER_ORDER.map((w) => `<button class="seg-btn" data-weather="${w}">${WEATHERS[w].label}</button>`).join('')}</div>
      ${slider('realism', 'Painted ↔ realistic', s.realism, 0, 1, 0.01, '', true)}
      ${slider('exposure', 'Exposure', s.exposure, 0.5, 2, 0.01, '', true)}
      ${slider('saturation', 'Saturation', s.saturation, 0, 1.5, 0.01, '', true)}
      ${slider('vignette', 'Vignette', s.vignette, 0, 1, 0.01, '', true)}
      ${slider('border', 'Sketchbook border (painted look)', s.border, 0, 1, 0.01, '', true)}
      <label class="check"><input type="checkbox" data-p="hidePlayer" ${st.hidePlayer ? 'checked' : ''}> Hide my car and character</label>
      ${this.host.brush ? `<h4>${t('brush.title')}</h4><p class="menu-hint">${t('brush.hint')}</p>
      <div class="seg wrap"><button class="seg-btn ${this.brushKind ? '' : 'on'}" data-brush="" aria-pressed="${!this.brushKind}">${t('brush.off')}</button>${BRUSH_KINDS.map((k) => `<button class="seg-btn ${this.brushKind === k ? 'on' : ''}" data-brush="${k}" aria-pressed="${this.brushKind === k}">${BRUSH_ICONS[k]} ${t(`brush.${k}` as 'brush.rain')}</button>`).join('')}</div>
      <div class="field"><label>${t('brush.size')}</label><input type="range" min="0.3" max="2" step="0.05" value="${this.brushSize}" data-brush-size="1"><output>${fmt(this.brushSize)}</output></div>
      <div class="row"><button class="btn small" data-a="brush-clear">${t('brush.clear')}</button></div>` : ''}
      <h4>Save</h4>
      <div class="row wrap"><button class="btn primary" data-shot="1">📷 Save PNG</button><button class="btn" data-shot="2">2× size</button><button class="btn" data-shot="4">4K</button></div>
      <div class="row wrap"><button class="btn" data-a="group">👥 ${t('group.button')}</button><button class="btn" data-a="postcard">💌 ${t('mail.button')}</button><button class="btn" data-a="contest">🏆 ${t('pc.enterButton')}</button></div>`;
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    const out = el.nextElementSibling;
    if (el.dataset.brushSize) {
      this.brushSize = Number(el.value);
      this.host.brushSize?.(this.brushSize);
      if (out) out.textContent = fmt(this.brushSize);
      return;
    }
    if (el.dataset.p) {
      const key = el.dataset.p as keyof PhotoState;
      const v = el.type === 'checkbox' ? el.checked : Number(el.value);
      (this.state as unknown as Record<string, number | boolean>)[key] = v;
      if (key === 'focus') this.state.autoFocus = false;
      if (out?.tagName === 'OUTPUT') out.textContent = `${fmt(Number(el.value))}${key === 'fov' || key === 'roll' ? '°' : key === 'focus' ? ' m' : ''}`;
      if (key === 'focus') this.render();
    }
    if (el.dataset.s) {
      (this.host.studio() as unknown as Record<string, number>)[el.dataset.s] = Number(el.value);
      if (el.dataset.s === 'realism') this.host.studio().artStyle = Number(el.value) >= 1 ? 'realistic' : Number(el.value) <= 0 ? 'watercolour' : 'illustrated';
      if (out?.tagName === 'OUTPUT') out.textContent = fmt(Number(el.value));
      this.host.studioChanged();
    }
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!el) return;
    const d = el.dataset;
    if (d.a === 'exit') this.host.exit();
    if (d.a === 'group') this.host.groupPhoto?.();
    if (d.a === 'postcard') this.host.postcard?.();
    if (d.a === 'contest') this.host.contest?.();
    if (d.a === 'brush-clear') this.host.brushClear?.();
    if (d.brush !== undefined) {
      this.brushKind = (d.brush || null) as BrushKind | null;
      this.host.brush?.(this.brushKind);
      this.render();
    }
    if (d.time) this.host.setTime(d.time);
    if (d.weather) this.host.setWeather(d.weather as WeatherId);
    if (d.shot) this.host.capture(Number(d.shot) as 1 | 2 | 4);
  }
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
