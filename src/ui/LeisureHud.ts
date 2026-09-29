import { t } from '../core/i18n';
import { LIGHT_SCHEMES, type PartyState } from '../gameplay/Party';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** What the DJ panel asks the game to do. */
export type DjAction = 'station-' | 'station+' | 'track-' | 'track+' | 'fill' | 'horn' | 'scratch' | 'lights' | 'echo' | 'leave';

/**
 * Screen pieces for the quiet things to do: the fishing meter, the DJ panel,
 * the record picker at home, the "well rested" badge and the sleep fade.
 */
export class LeisureHud {
  readonly root = document.createElement('div');
  private readonly meter = document.createElement('div');
  private readonly tip = document.createElement('div');
  private readonly rested = document.createElement('div');
  private readonly fade = document.createElement('div');
  private readonly dj = document.createElement('div');
  private readonly records = document.createElement('div');
  onDj: ((a: DjAction, value?: number) => void) | null = null;
  onRecord: ((station: number, track: number, party: boolean) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root.className = 'leisure-hud';
    this.meter.className = 'fish-meter';
    this.meter.innerHTML = '<div class="fm-track"><div class="fm-bar"></div><div class="fm-fish">🐟</div></div><div class="fm-progress"><div></div></div>';
    this.tip.className = 'leisure-tip';
    this.rested.className = 'rested-badge';
    this.fade.className = 'sleep-fade';
    this.fade.innerHTML = '<span>Z z z</span>';
    this.dj.className = 'dj-panel card';
    this.records.className = 'record-picker card';
    for (const el of [this.meter, this.tip, this.rested, this.dj, this.records]) el.style.display = 'none';
    this.root.append(this.meter, this.tip, this.rested, this.fade, this.dj, this.records);
    parent.appendChild(this.root);
    this.dj.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-dj]');
      if (b) this.onDj?.(b.dataset.dj as DjAction);
    });
    this.dj.addEventListener('input', (e) => {
      const r = e.target as HTMLInputElement;
      if (r.dataset.djRange === 'filter') this.onFilter?.(Number(r.value));
    });
    this.records.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-rec]');
      if (!b) return;
      if (b.dataset.rec === 'close') return this.showRecords(null);
      const [st, tr] = b.dataset.rec!.split(':').map(Number);
      this.onRecord?.(st, tr, b.dataset.party === '1');
    });
  }

  onFilter: ((v: number) => void) | null = null;

  /** A short line of help at the bottom of the screen (null hides it). */
  setTip(text: string | null): void {
    this.tip.style.display = text ? 'block' : 'none';
    if (text && this.tip.textContent !== text) this.tip.textContent = text;
  }

  /** The reel meter: fish and bar positions 0..1 (bottom to top), progress 0..1. */
  setMeter(m: { fish: number; bar: number; size: number; progress: number; holding: boolean; icon: string } | null): void {
    this.meter.style.display = m ? 'flex' : 'none';
    if (!m) return;
    const bar = this.meter.querySelector<HTMLElement>('.fm-bar')!;
    const fish = this.meter.querySelector<HTMLElement>('.fm-fish')!;
    bar.style.bottom = `${m.bar * 100}%`;
    bar.style.height = `${m.size * 100}%`;
    bar.classList.toggle('on', m.holding);
    fish.style.bottom = `calc(${m.fish * 100}% - 12px)`;
    if (fish.textContent !== m.icon) fish.textContent = m.icon;
    this.meter.querySelector<HTMLElement>('.fm-progress > div')!.style.height = `${m.progress * 100}%`;
  }

  /** "Well rested" with minutes left (0 hides it). */
  setRested(minutes: number): void {
    const on = minutes > 0;
    this.rested.style.display = on ? 'block' : 'none';
    if (on) this.rested.textContent = `☕ ${t('rest.rested', { min: Math.ceil(minutes) })}`;
  }

  /** Fade to sleep and back. */
  setSleep(on: boolean): void {
    this.fade.classList.toggle('on', on);
  }

  /** The DJ panel (null hides it). */
  showDj(p: PartyState | null, stations: string[], online: number): void {
    this.dj.style.display = p ? 'block' : 'none';
    if (!p) return;
    const scheme = LIGHT_SCHEMES[p.scheme];
    this.dj.innerHTML = `
      <div class="dj-head"><b>🎧 ${esc(t('dj.title'))}</b><small>${online > 0 ? esc(t('dj.crowd', { n: online })) : esc(t('dj.solo'))}</small></div>
      <div class="dj-row"><button class="btn small" data-dj="station-" aria-label="${esc(t('dj.prevStation'))}">◀</button><span class="dj-station">📻 ${esc(stations[p.station] ?? '')}</span><button class="btn small" data-dj="station+" aria-label="${esc(t('dj.nextStation'))}">▶</button></div>
      <div class="dj-row"><button class="btn small" data-dj="track-" aria-label="${esc(t('dj.prevTrack'))}">⏮</button><span>${esc(t('dj.track', { n: p.track + 1 }))}</span><button class="btn small" data-dj="track+" aria-label="${esc(t('dj.nextTrack'))}">⏭</button></div>
      <label class="dj-row dj-filter">${esc(t('dj.filter'))}<input type="range" min="-1" max="1" step="0.05" value="${p.filter}" data-dj-range="filter" aria-label="${esc(t('dj.filter'))}"></label>
      <div class="dj-pads">
        <button class="btn" data-dj="fill">🥁 ${esc(t('dj.fill'))} <kbd>1</kbd></button>
        <button class="btn" data-dj="horn">📯 ${esc(t('dj.horn'))} <kbd>2</kbd></button>
        <button class="btn" data-dj="scratch">💿 ${esc(t('dj.scratch'))} <kbd>3</kbd></button>
        <button class="btn ${p.echo > 0 ? 'on' : ''}" data-dj="echo">〰 ${esc(t('dj.echo'))} <kbd>4</kbd></button>
        <button class="btn" data-dj="lights">💡 ${esc(t('dj.lights'))} <span class="dj-swatch">${scheme.map((c) => `<i style="background:${c}"></i>`).join('')}</span> <kbd>5</kbd></button>
      </div>
      <button class="btn small" data-dj="leave">✕ ${esc(t('dj.leave'))}</button>`;
  }

  get djOpen(): boolean {
    return this.dj.style.display !== 'none';
  }

  /** The record player: pick a station and a track, or start a party at home. */
  showRecords(stations: string[] | null, current?: { station: number; track: number }, partyOk = true): void {
    this.records.style.display = stations ? 'block' : 'none';
    if (!stations) return;
    this.records.innerHTML = `<h3 class="hand">🎶 ${esc(t('rest.records'))}</h3>
      <p class="menu-hint">${esc(t('rec.hint'))}</p>
      <div class="record-grid">${stations.map((s, i) => `<button class="btn ${current?.station === i ? 'primary' : ''}" data-rec="${i}:0">${esc(s)}</button>`).join('')}</div>
      <div class="row wrap">${partyOk ? `<button class="btn primary" data-rec="${current?.station ?? 0}:${current?.track ?? 0}" data-party="1">🎧 ${esc(t('rec.party'))}</button>` : ''}<button class="btn" data-rec="close">✕ ${esc(t('priv.close'))}</button></div>`;
  }

  get recordsOpen(): boolean {
    return this.records.style.display !== 'none';
  }
}
