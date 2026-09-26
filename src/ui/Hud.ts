import { TIME_PRESETS } from '../world/Environment';
import { brand, COMPANY_LOGO } from '../brand/Brand';
import { t } from '../core/i18n';
import { apiUrl } from '../net/Api';
import type { Phrase } from '../gameplay/Collectibles';
import { NOTE_COLOURS } from '../world/Districts';

export interface HudCallbacks {
  onTimePreset: (id: string) => void;
  onAuto: () => void;
  onRain: () => void;
  onRadio: () => void;
  onNextSong: () => void;
  onBand: () => void;
  onCamera: () => void;
  onStudio: () => void;
  onPause: () => void;
  onStart: (radio: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onHelp: () => void;
  onLook: () => void;
  onTitle: () => void;
}

const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`HUD element missing: ${sel}`);
  return el;
};

/**
 * All HUD and menus as HTML paper cards over the canvas (docs/10).
 * The centre of the screen stays clear for the road.
 */
export class Hud {
  readonly root: HTMLDivElement;
  private readonly el: Record<string, HTMLElement> = {};
  private popLayer: HTMLElement;
  private titleTimer = 0;
  private splitTimer = 0;
  private lastSongbookKey = '';

  constructor(parent: HTMLElement, cb: HudCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = template();
    parent.appendChild(this.root);

    for (const id of [
      'clock', 'clockBand', 'status', 'timer', 'timerDistrict', 'timerTime', 'timerLap', 'titleCard', 'titleKicker', 'titleName', 'titlePoem',
      'split', 'splitName', 'splitTime', 'splitDelta', 'tonics', 'radioFreq', 'radioName', 'radioTrack', 'radioBar', 'radioOff',
      'songbook', 'songCount', 'speed', 'speedUnit', 'boostBar', 'district', 'gravityArrow', 'gravityLabel', 'prompt', 'cameraBtn',
      'screenTitle', 'screenIntro', 'screenPause', 'screenHelp', 'loading', 'radioCheck', 'lapBanner', 'score',
      'mission', 'bag', 'dialog', 'dialogName', 'dialogText', 'letterbox', 'subtitle', 'chat', 'chatInput', 'chatLog', 'labels', 'ink', 'players',
    ]) {
      this.el[id] = $(this.root, `[data-id="${id}"]`);
    }
    this.popLayer = $(this.root, '[data-id="pops"]');

    // Time-of-day pills.
    const pills = $(this.root, '[data-id="pills"]');
    for (const t of TIME_PRESETS) {
      const b = document.createElement('button');
      b.className = 'pill';
      b.textContent = t.label;
      b.dataset.preset = t.id;
      b.addEventListener('click', () => cb.onTimePreset(t.id));
      pills.appendChild(b);
    }
    const auto = document.createElement('button');
    auto.className = 'pill';
    auto.dataset.preset = 'auto';
    auto.textContent = 'Auto ›';
    auto.addEventListener('click', cb.onAuto);
    const rain = document.createElement('button');
    rain.className = 'pill';
    rain.dataset.preset = 'rain';
    rain.dataset.id = 'weatherPill';
    rain.title = 'Weather (9)';
    rain.textContent = '☀ Clear';
    rain.addEventListener('click', cb.onRain);
    pills.append(auto, rain);

    const click = (id: string, fn: () => void): void => {
      this.root.querySelectorAll(`[data-action="${id}"]`).forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      }));
    };
    click('radio', cb.onRadio);
    click('next', cb.onNextSong);
    click('band', cb.onBand);
    click('camera', cb.onCamera);
    click('studio', cb.onStudio);
    click('pause', cb.onPause);
    click('resume', cb.onResume);
    click('restart', cb.onRestart);
    click('help', cb.onHelp);
    click('look', cb.onLook);
    click('start-title', cb.onTitle);
    click('start', () => cb.onStart((this.el.radioCheck as HTMLInputElement).checked));
    click('closeHelp', () => this.show('screenHelp', false));
    click('dialog-yes', () => this.closeDialog(true));
    click('dialog-no', () => this.closeDialog(false));
  }

  show(screen: 'screenTitle' | 'screenIntro' | 'screenPause' | 'screenHelp' | 'loading', visible: boolean): void {
    this.el[screen].classList.toggle('hidden', !visible);
  }

  private tipEl: HTMLDivElement | null = null;
  private tipTimer = 0;

  /** A short onboarding tip at the top of the screen (docs/10 §8). */
  tip(text: string, seconds = 6, label = 'Tip'): void {
    if (!this.tipEl) {
      this.tipEl = document.createElement('div');
      this.tipEl.className = 'tip-card';
      this.root.appendChild(this.tipEl);
    }
    this.tipEl.innerHTML = `<b>${label}</b> ${text}`;
    this.tipEl.classList.add('show');
    clearTimeout(this.tipTimer);
    this.tipTimer = window.setTimeout(() => this.tipEl?.classList.remove('show'), seconds * 1000);
  }

  private objectiveEl: HTMLDivElement | null = null;
  private compassEl: HTMLDivElement | null = null;
  private counterEl: HTMLDivElement | null = null;
  private lootEl: HTMLDivElement | null = null;
  private lootTimer = 0;

  private ensure(cls: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `${cls} hidden`;
    this.root.appendChild(el);
    return el;
  }

  /** Mission objective card (null hides). */
  objective(title: string | null, step = '', extra = ''): void {
    this.objectiveEl ??= this.ensure('card objective');
    this.objectiveEl.classList.toggle('hidden', !title);
    if (!title) return;
    const html = `<div class="hand">${title}</div><div>${step}</div>${extra ? `<small>${extra}</small>` : ''}`;
    if (this.objectiveEl.innerHTML !== html) this.objectiveEl.innerHTML = html;
  }

  /** Compass arrow toward a target: angle in degrees (0 = straight ahead), distance in metres. */
  compass(angle: number | null, metres = 0): void {
    this.compassEl ??= (() => {
      const el = this.ensure('compass');
      el.innerHTML = '<div class="arrow">▲</div><div class="dist"></div>';
      return el;
    })();
    this.compassEl.classList.toggle('hidden', angle === null);
    if (angle === null) return;
    (this.compassEl.firstElementChild as HTMLElement).style.transform = `rotate(${angle.toFixed(0)}deg)`;
    (this.compassEl.lastElementChild as HTMLElement).textContent = `${Math.round(metres)} m`;
  }

  /** Small counter chip (secrets found…). */
  counter(text: string | null): void {
    this.counterEl ??= this.ensure('counter-chip');
    this.counterEl.classList.toggle('hidden', !text);
    if (text && this.counterEl.textContent !== text) this.counterEl.textContent = text;
  }

  /** Loot reveal: rarity banner, item name, extras. */
  lootCard(rarity: string, colour: string, title: string, detail: string): void {
    this.lootEl ??= (() => {
      const el = document.createElement('div');
      el.className = 'card loot-card';
      this.root.appendChild(el);
      return el;
    })();
    this.lootEl.style.borderColor = colour;
    this.lootEl.style.boxShadow = `0 0 0 3px ${colour}, 4px 6px 0 rgba(43,38,34,0.2)`;
    this.lootEl.innerHTML = `<div class="rar" style="color:${colour}">${rarity}</div><div class="hand">${title}</div><div>${detail}</div>`;
    this.lootEl.classList.add('show');
    clearTimeout(this.lootTimer);
    this.lootTimer = window.setTimeout(() => this.lootEl?.classList.remove('show'), 3200);
  }

  private bannerEl: HTMLDivElement | null = null;
  private bannerTimer = 0;

  /** District name with its paint bar, shown when you drive into a district. */
  districtBanner(name: string, colour: string, paint: number, sub: string): void {
    this.bannerEl ??= (() => {
      const el = document.createElement('div');
      el.className = 'district-banner';
      this.root.appendChild(el);
      return el;
    })();
    this.bannerEl.innerHTML = `<div class="hand" style="color:${colour}">${name}</div><div class="bar"><i style="width:${Math.round(paint * 100)}%;background:${colour}"></i></div><small>${sub}</small>`;
    this.bannerEl.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl?.classList.remove('show'), 3500);
  }

  private boardEl: HTMLDivElement | null = null;

  /** Live race standings card (null hides it). */
  raceBoard(title: string | null, rows: string[] = []): void {
    if (!this.boardEl) {
      this.boardEl = document.createElement('div');
      this.boardEl.className = 'card race-board hidden';
      this.root.appendChild(this.boardEl);
    }
    this.boardEl.classList.toggle('hidden', !title);
    if (title) this.boardEl.innerHTML = `<div class="hand">${title}</div><ol>${rows.map((r) => `<li>${r}</li>`).join('')}</ol>`;
  }

  /** Full-screen notice (graphics reset). */
  notice(text: string | null): void {
    let el = this.root.querySelector<HTMLDivElement>('.notice');
    if (!el) {
      el = document.createElement('div');
      el.className = 'notice';
      document.body.appendChild(el);
    }
    el.textContent = text ?? '';
    el.style.display = text ? 'flex' : 'none';
  }

  /** Hub mode hides the route-only cards (timer, songbook, missions, tonics). */
  setHub(on: boolean): void {
    this.root.classList.toggle('hub', on);
  }

  setPlaying(playing: boolean): void {
    this.root.classList.toggle('playing', playing);
  }

  setLoading(progress: number, text: string): void {
    const bar = this.el.loading.querySelector<HTMLElement>('.load-fill');
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
    const label = this.el.loading.querySelector<HTMLElement>('.load-text');
    if (label) label.textContent = text;
  }

  setClock(time: string, band: string, presetId: string, auto: boolean, weather: string): void {
    this.el.clock.textContent = time;
    this.el.clockBand.textContent = band;
    this.root.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => {
      const p = b.dataset.preset;
      b.classList.toggle('active', (p === presetId && !auto) || (p === 'auto' && auto) || (p === 'rain' && weather !== 'Clear'));
      if (p === 'rain') {
        const icon = { Clear: '☀', Cloudy: '☁', Fog: '≋', Rain: '☂', Storm: '⚡' }[weather] ?? '☂';
        const text = `${icon} ${weather}`;
        if (b.textContent !== text) b.textContent = text;
      }
    });
  }

  setStatus(notes: number, total: number, band: string, vibe: string): void {
    this.el.status.textContent = `♪ ${notes}/${total} · ${band} · ${vibe}`;
  }

  setTimer(visible: boolean, district: string, time: number, lap: number, best: number | null, lapNo: number): void {
    this.el.timer.classList.toggle('hidden', !visible);
    if (!visible) return;
    this.el.timerDistrict.textContent = district;
    this.el.timerTime.textContent = fmt(time);
    this.el.timerLap.textContent = `LAP ${lapNo} · ${fmt(lap)} · BEST ${best !== null ? fmt(best) : '—'}`;
  }

  showDistrictTitle(kicker: string, name: string, poem: string): void {
    this.el.titleKicker.textContent = kicker;
    this.el.titleName.textContent = name;
    this.el.titlePoem.textContent = poem;
    this.el.titleCard.classList.remove('show');
    void this.el.titleCard.offsetWidth;
    this.el.titleCard.classList.add('show');
    this.titleTimer = 3.2;
  }

  showSplit(name: string, time: number, delta: number | null): void {
    this.el.splitName.textContent = `✓ ${name}`;
    this.el.splitTime.textContent = fmt(time);
    this.el.splitDelta.textContent = delta === null ? 'first run' : `${delta <= 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}s vs best`;
    this.el.splitDelta.className = `split-delta ${delta === null ? '' : delta <= 0 ? 'faster' : 'slower'}`;
    this.el.split.classList.add('show');
    this.splitTimer = 3.5;
  }

  showLapBanner(text: string): void {
    this.el.lapBanner.textContent = text;
    this.el.lapBanner.classList.remove('show');
    void this.el.lapBanner.offsetWidth;
    this.el.lapBanner.classList.add('show');
  }

  setTonics(items: { buff: string; drawback: string; remaining: number; total: number }[]): void {
    const html = items
      .map((t) => `<div class="tonic"><span class="ring" style="--p:${(t.remaining / t.total).toFixed(3)}"></span>${t.buff} <b>▾</b> <em>${t.drawback}</em></div>`)
      .join('');
    if (this.el.tonics.innerHTML !== html) this.el.tonics.innerHTML = html;
  }

  setRadio(freq: string, name: string, track: string, progress: number, on: boolean): void {
    this.el.radioFreq.textContent = freq;
    this.el.radioName.textContent = on ? name : 'Radio off';
    this.el.radioTrack.textContent = on ? track : 'quiet pad only';
    this.el.radioBar.style.width = `${Math.round(progress * 100)}%`;
    this.el.radioOff.textContent = on ? '■ Off' : '▶ On';
  }

  setSongbook(phrases: Phrase[], currentPhrase: number, notes: number, noteTotal: number, sealed: number): void {
    this.el.songCount.textContent = `${notes}/${noteTotal} · ${sealed}/${phrases.length} phrases`;
    const key = phrases.map((p) => p.notes.map((n) => (n.collected ? 1 : 0)).join('') + (p.sealed ? 's' : '')).join('|') + currentPhrase;
    if (key === this.lastSongbookKey) return;
    this.lastSongbookKey = key;
    // Show a window of phrase cards around the current one.
    const from = Math.max(0, Math.min(phrases.length - 8, currentPhrase - 2));
    const cards = phrases.slice(from, from + 8).map((p, i) => {
      const idx = from + i;
      const dots = p.notes
        .map((n, j) => {
          const y = 22 - (((n.midi % 24) + 24) % 24) * 0.8;
          const c = n.collected ? NOTE_COLOURS[((n.midi % 12) + 12) % 12] : 'transparent';
          return `<circle cx="${6 + j * 7}" cy="${y.toFixed(1)}" r="2.6" fill="${c}" stroke="#2b2622" stroke-width="0.7"/>`;
        })
        .join('');
      const lines = [6, 10, 14, 18, 22].map((y) => `<line x1="1" x2="61" y1="${y}" y2="${y}"/>`).join('');
      return `<svg class="phrase ${p.sealed ? 'sealed' : ''} ${idx === currentPhrase ? 'current' : ''}" viewBox="0 0 62 28">${lines}${dots}</svg>`;
    });
    this.el.songbook.innerHTML = cards.join('');
  }

  setSpeed(speed: number, boost: number, boosting: boolean, district: string, gravityAngle: number, gravityLabel: string, onFoot: boolean, unit = 'km/h', gear?: string): void {
    this.el.speed.textContent = String(Math.round(Math.abs(speed))).padStart(3, '0');
    const u = onFoot ? `on foot · ${unit}` : gear ? `${unit} · gear ${gear}` : unit;
    if (this.el.speedUnit.textContent !== u) this.el.speedUnit.textContent = u;
    this.el.boostBar.style.width = `${Math.round(boost * 100)}%`;
    this.el.boostBar.parentElement?.classList.toggle('boosting', boosting);
    this.el.district.textContent = district;
    this.el.gravityArrow.style.transform = `rotate(${gravityAngle.toFixed(1)}deg)`;
    this.el.gravityLabel.textContent = gravityLabel;
  }

  setScore(score: number, combo: number): void {
    this.el.score.textContent = combo > 1 ? `${score.toLocaleString()} · ×${combo}` : score.toLocaleString();
  }

  setCameraLabel(label: string): void {
    this.el.cameraBtn.textContent = `Camera · ${label}`;
  }

  setPrompt(text: string | null): void {
    this.el.prompt.classList.toggle('hidden', !text);
    if (text) this.el.prompt.textContent = text;
  }

  /** Hand-lettered pop text at a screen position (e.g. "AIR +22", "SEALED"). */
  pop(text: string, x: number, y: number, kind: 'good' | 'info' | 'big' = 'info'): void {
    const el = document.createElement('div');
    el.className = `pop ${kind}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.popLayer.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  private dialogAccept: (() => void) | null = null;

  setMission(text: string | null): void {
    this.el.mission.classList.toggle('hidden', !text);
    if (text && this.el.mission.textContent !== text) this.el.mission.textContent = text;
  }

  setInk(ink: number): void {
    const t = `💧 ${ink} ink`;
    if (this.el.ink.textContent !== t) this.el.ink.textContent = t;
  }

  /** Carried tonics: Q drinks the selected one, Z cycles. */
  setBag(tonics: Record<string, number>, selected: string): void {
    const names: Record<string, string> = { magnet: 'Magnet', feather: 'Feather', fizzy: 'Fizzy Ink' };
    const html = Object.keys(names)
      .map((k) => `<span class="${k === selected ? 'on' : ''} ${tonics[k] ? '' : 'empty'}">${names[k]} ×${tonics[k] ?? 0}</span>`)
      .join('') + '<small>Q drink · Z switch</small>';
    if (this.el.bag.innerHTML !== html) this.el.bag.innerHTML = html;
  }

  get dialogOpen(): boolean {
    return !this.el.dialog.classList.contains('hidden');
  }

  showDialog(name: string, text: string, onAccept: () => void): void {
    this.el.dialogName.textContent = name;
    this.el.dialogText.textContent = text;
    this.dialogAccept = onAccept;
    this.el.dialog.classList.remove('hidden');
  }

  closeDialog(accept: boolean): void {
    this.el.dialog.classList.add('hidden');
    const fn = this.dialogAccept;
    this.dialogAccept = null;
    if (accept) fn?.();
  }

  letterbox(on: boolean, line = ''): void {
    this.el.letterbox.classList.toggle('hidden', !on);
    if (this.el.subtitle.textContent !== line) {
      this.el.subtitle.textContent = line;
      this.el.subtitle.classList.remove('show');
      void this.el.subtitle.offsetWidth;
      if (line) this.el.subtitle.classList.add('show');
    }
    this.root.classList.toggle('cinematic', on);
  }

  get labels(): HTMLElement {
    return this.el.labels;
  }

  get chatOpen(): boolean {
    return !this.el.chat.classList.contains('hidden');
  }

  openChat(onSend: (text: string) => void): void {
    const input = this.el.chatInput as HTMLInputElement;
    this.el.chat.classList.remove('hidden');
    input.value = '';
    input.focus();
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const t = input.value.trim();
        if (t) onSend(t);
        this.closeChat();
      } else if (e.key === 'Escape') this.closeChat();
    };
  }

  closeChat(): void {
    this.el.chat.classList.add('hidden');
    (this.el.chatInput as HTMLInputElement).blur();
  }

  chatLine(name: string, text: string): void {
    const line = document.createElement('div');
    line.innerHTML = `<b></b> <span></span>`;
    (line.firstChild as HTMLElement).textContent = name;
    (line.lastChild as HTMLElement).textContent = text;
    this.el.chatLog.appendChild(line);
    while (this.el.chatLog.children.length > 6) this.el.chatLog.firstChild?.remove();
    setTimeout(() => line.remove(), 12000);
  }

  setPlayers(names: string[], status: string): void {
    this.el.players.classList.toggle('hidden', status === 'offline');
    const html = `<b>${status}</b>${names.map(() => `<span></span>`).join('')}`;
    if (this.el.players.dataset.key !== html + names.join('|')) {
      this.el.players.dataset.key = html + names.join('|');
      this.el.players.innerHTML = html;
      this.el.players.querySelectorAll('span').forEach((sp, i) => (sp.textContent = `● ${names[i]}`));
    }
  }

  update(dt: number): void {
    if (this.titleTimer > 0) {
      this.titleTimer -= dt;
      if (this.titleTimer <= 0) this.el.titleCard.classList.remove('show');
    }
    if (this.splitTimer > 0) {
      this.splitTimer -= dt;
      if (this.splitTimer <= 0) this.el.split.classList.remove('show');
    }
  }
}

export function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

function template(): string {
  return /* html */ `
  <div class="corner top-left">
    <div class="card logo-card">
      <div class="logo-mark"></div>
      <div>
        <div class="logo-name">Inkroads</div>
        <div class="logo-sub">ink &amp; wash roads</div>
      </div>
    </div>
    <div class="row">
      <div class="card clock-card"><span data-id="clock">09:30</span> <small data-id="clockBand">MORNING</small></div>
      <div class="pills" data-id="pills"></div>
    </div>
    <div class="status-chip" data-id="status">♪ 0/0</div>
  </div>

  <div class="card timer hidden" data-id="timer">
    <div class="label" data-id="timerDistrict">Biscuit Row</div>
    <div class="big" data-id="timerTime">0:00.00</div>
    <div class="label" data-id="timerLap"></div>
    <div class="label score" data-id="score">0</div>
    <div class="label ink-line" data-id="ink">💧 0</div>
  </div>

  <div class="corner top-right">
    <button class="btn" data-action="help">Controls ?</button>
    <button class="btn" data-action="look">Menu ☰</button>
    <button class="btn" data-action="studio">Studio ✎</button>
    <button class="btn" data-action="pause">Pause ❚❚</button>
  </div>

  <div class="title-card" data-id="titleCard">
    <div class="kicker" data-id="titleKicker"></div>
    <div class="name" data-id="titleName"></div>
    <div class="poem" data-id="titlePoem"></div>
  </div>
  <div class="lap-banner" data-id="lapBanner"></div>
  <div class="pops" data-id="pops"></div>
  <div class="prompt hidden" data-id="prompt"></div>

  <div class="bottom-centre">
    <div class="card split" data-id="split">
      <div class="label" data-id="splitName"></div>
      <div class="big" data-id="splitTime"></div>
      <div class="split-delta" data-id="splitDelta"></div>
    </div>
    <div class="tonics" data-id="tonics"></div>
    <div class="card songbook-card">
      <div class="songbook-head"><span class="hand">Songbook</span> <small data-id="songCount"></small></div>
      <div class="songbook" data-id="songbook"></div>
    </div>
  </div>

  <div class="corner bottom-left card radio-card">
    <div class="dial"><span data-id="radioFreq">88.3</span><small>MHz</small></div>
    <div class="radio-info">
      <div class="hand" data-id="radioName">Paper Kite FM</div>
      <div class="label" data-id="radioTrack">track 01 / 08</div>
      <div class="bar"><div data-id="radioBar"></div></div>
      <div class="row">
        <button class="btn dark" data-action="radio" data-id="radioOff">■ Off</button>
        <button class="btn" data-action="next">Next ♫</button>
        <button class="btn" data-action="band">Band ⇄</button>
      </div>
    </div>
  </div>

  <div class="corner bottom-right card speed-card">
    <div class="gravity">
      <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><g data-id="gravityArrow"><path d="M20 30 L20 9 M13 16 L20 9 L27 16"/></g></svg>
      <small data-id="gravityLabel">down is down</small>
    </div>
    <div class="speed-block">
      <div class="big" data-id="speed">000</div>
      <small data-id="speedUnit">km/h</small>
      <div class="boost"><div data-id="boostBar"></div></div>
    </div>
    <div class="speed-side">
      <div class="hand district" data-id="district">Biscuit Row</div>
      <button class="btn" data-action="camera" data-id="cameraBtn">Camera · Chase</button>
    </div>
  </div>

  <div class="mission-line hidden" data-id="mission"></div>
  <div class="bag" data-id="bag"></div>
  <div class="labels" data-id="labels"></div>
  <div class="players hidden" data-id="players"></div>
  <div class="chat-log" data-id="chatLog"></div>
  <div class="chat hidden" data-id="chat"><input maxlength="120" placeholder="Say something nice… (Enter to send, Esc to close)" data-id="chatInput"></div>
  <div class="letterbox hidden" data-id="letterbox"><div class="lb-bar top"></div><div class="lb-bar bottom"><div class="subtitle" data-id="subtitle"></div><div class="skip">Space / Esc to skip</div></div></div>
  <div class="dialog hidden" data-id="dialog">
    <div class="card dialog-card">
      <div class="hand dialog-name" data-id="dialogName"></div>
      <p data-id="dialogText"></p>
      <div class="row"><button class="btn primary" data-action="dialog-yes">Accept (E)</button><button class="btn" data-action="dialog-no">Not now (Esc)</button></div>
    </div>
  </div>

  <div class="screen loading" data-id="loading">
    <svg class="wc-filters" aria-hidden="true" width="0" height="0"><filter id="wc-rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/><feGaussianBlur stdDeviation="0.35"/></filter></svg>
    <div class="presents" data-id="presents">
      <div class="presents-wash"></div>
      <img class="presents-logo" src="${brandLogoUrl()}" alt="${escapeText(brand().company.name)}">
      <div class="hand presents-word">${escapeText(brand().company.tagline === 'Presents' || !brand().company.tagline ? t('brand.presents') : brand().company.tagline)}</div>
    </div>
    <div class="card loading-card">
      <div class="hand big-title">Inkroads</div>
      <div class="load-bar"><div class="load-fill"></div></div>
      <div class="label load-text">mixing paint…</div>
    </div>
  </div>

  <div class="screen title-screen hidden" data-id="screenTitle">
    <div class="banner">Drive the song · beat the clock</div>
    <div class="title-letters">
      ${'INKROADS'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}
    </div>
    <button class="btn primary" data-action="start-title"><kbd>Space</kbd> Drive</button>
    <div class="title-hints">A D steer · W throttle · Space hop · Shift boost · F get out · C camera</div>
  </div>

  <div class="screen intro hidden" data-id="screenIntro">
    <div class="card intro-card">
      <div class="kicker">01 / a road that forgets which way is down</div>
      <h1>Paint the road.<br><em>Then drive up it.</em></h1>
      <p>A little rover with a brass gramophone on its roof, a watercolour town folded like paper, and streets that turn
      ninety degrees toward the sky. The road is sheet music: steer through the floating notes to play each street's melody.
      Hop out any time and walk — even on the ceiling.</p>
      <label class="check"><input type="checkbox" data-id="radioCheck" checked> Start with the radio on</label>
      <button class="btn primary wide" data-action="start">Start the engine ↗</button>
      <div class="legend">
        <b>W/S</b> throttle · <b>A/D</b> steer · <b>Space</b> hop · <b>Shift</b> boost · <b>Ctrl</b> drift · <b>F</b> get in/out ·
        <b>C</b> camera · <b>scroll</b> zoom · <b>[ ]</b> field of view · <b>T</b> radio · <b>N</b> next song · <b>B</b> band ·
        <b>1–7</b> time of day · <b>9</b> weather · <b>H</b> honk · <b>R</b> respawn · <b>\`</b> studio · <b>U</b> hide HUD · <b>P</b> photo mode · <b>Esc</b> pause
      </div>
    </div>
  </div>

  <div class="screen pause hidden" data-id="screenPause">
    <div class="card pause-card">
      <div class="hand big-title">Paused</div>
      <button class="btn wide" data-action="resume">Resume</button>
      <button class="btn wide" data-action="restart">Restart lap</button>
      <button class="btn wide" data-action="look">Main menu ☰</button>
      <button class="btn wide" data-action="studio">Studio ✎</button>
      <button class="btn wide" data-action="help">Controls</button>
    </div>
  </div>

  <div class="screen help hidden" data-id="screenHelp">
    <div class="card help-card">
      <div class="hand big-title">Controls</div>
      <table>
        <tr><th></th><th>Driving</th><th>On foot</th></tr>
        <tr><td>Move</td><td>W/S throttle · A/D steer</td><td>WASD</td></tr>
        <tr><td>Space</td><td>Hop</td><td>Jump</td></tr>
        <tr><td>Shift</td><td>Boost</td><td>Sprint</td></tr>
        <tr><td>Ctrl</td><td>Drift</td><td>Walk slowly</td></tr>
        <tr><td>F / E</td><td>Get out</td><td>Get in (near the rover)</td></tr>
        <tr><td>C / V</td><td>Chase · Low · Drone · Cinema · Cockpit</td><td>Third ↔ first person</td></tr>
        <tr><td>Mouse</td><td>—</td><td>Look (click to lock)</td></tr>
        <tr><td>Scroll · [ ]</td><td colspan="2">Zoom · field of view</td></tr>
        <tr><td>T · N · B</td><td colspan="2">Radio on/off · next song · change station</td></tr>
        <tr><td>1–7 · 8 · 9</td><td colspan="2">Time of day · auto day cycle · weather (clear, cloudy, fog, rain, storm)</td></tr>
        <tr><td>H · R</td><td colspan="2">Honk (plays a note) · respawn</td></tr>
        <tr><td>Q · Z · G · Enter</td><td colspan="2">Drink tonic · next tonic · wave · chat (online)</td></tr>
        <tr><td>. · ,</td><td colspan="2">Gear up · down (realistic handling, manual gearbox)</td></tr>
        <tr><td>P</td><td colspan="2">Photo mode: free camera, focus, blur, light · save PNG up to 4K</td></tr>
        <tr><td>\` / F2 · U · Esc</td><td colspan="2">Studio panel · hide HUD · pause</td></tr>
        <tr><td>Gamepad</td><td colspan="2">Stick steer/move · RT/LT throttle/brake · A hop · X boost · B drift · Y get in/out · R3 camera · Back photo</td></tr>
        <tr><td>Settings</td><td colspan="2">Menu → Settings: graphics quality, art style (watercolour ↔ realistic), key rebinding, handling</td></tr>
      </table>
      <button class="btn primary" data-action="closeHelp">Got it</button>
    </div>
  </div>
  `;
}

function brandLogoUrl(): string {
  const logo = brand().company.logo;
  return logo ? apiUrl(logo) : COMPANY_LOGO;
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
