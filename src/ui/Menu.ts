import type { Profile, ShopItem } from '../gameplay/Profile';
import { CATALOGUE, MAX_TONICS, PALETTE } from '../gameplay/Profile';
import type { ChapterDef } from '../world/Chapters';
import type { MissionDef } from '../gameplay/Missions';
import { VEHICLES, type VehicleId } from '../models/Vehicles';
import { ROVER_TUNING } from '../gameplay/RoverController';
import { randomLook, type HumanLook } from '../models/Human';
import { fmt } from './Hud';

export type MenuScreen = 'splash' | 'main' | 'chapters' | 'missions' | 'wardrobe' | 'garage' | 'shop' | 'multiplayer' | 'settings' | 'credits' | 'none';

/** Everything the menu needs from the game. */
export interface MenuHost {
  profile: Profile;
  chapters: ChapterDef[];
  currentChapter(): ChapterDef;
  missions(): MissionDef[];
  play(chapterId: string): void;
  startMission(m: MissionDef): void;
  lookChanged(): void;
  vehicleChanged(): void;
  showcase(target: 'character' | 'vehicle' | null): void;
  netStatus(): { status: string; room: string; players: string[] };
  netConnect(room: string, server: string | null): void;
  netDisconnect(): void;
  openStudio(): void;
  openControls(): void;
  watchIntro(): void;
  unlockAudio(): void;
  settings(): { music: number; notes: number; engine: number; reducedMotion: boolean; calmLighting: boolean; hudScale: number };
  setSetting(key: string, value: number | boolean): void;
  resume(): void;
  canResume(): boolean;
}

const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T => root.querySelector<T>(sel)!;

/**
 * The main menu and its screens, drawn as paper cards over the live
 * cinematic (docs/10 §3). Wardrobe and garage edit the profile live while the
 * camera showcases the character or the vehicle.
 */
export class Menu {
  readonly root: HTMLDivElement;
  screen: MenuScreen = 'none';
  private wardrobeTab = 'hair';
  private toastTimer = 0;

  constructor(parent: HTMLElement, private readonly host: MenuHost) {
    this.root = document.createElement('div');
    this.root.className = 'menu';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    host.profile.onChange(() => this.refreshInk());
  }

  show(screen: MenuScreen): void {
    this.screen = screen;
    this.root.classList.toggle('open', screen !== 'none');
    this.host.showcase(screen === 'wardrobe' ? 'character' : screen === 'garage' ? 'vehicle' : null);
    this.render();
  }

  private render(): void {
    const s = this.screen;
    if (s === 'none') {
      this.root.innerHTML = '';
      return;
    }
    const body = {
      splash: () => this.splash(),
      main: () => this.main(),
      chapters: () => this.chaptersScreen(),
      missions: () => this.missionsScreen(),
      wardrobe: () => this.wardrobe(),
      garage: () => this.garage(),
      shop: () => this.shop(),
      multiplayer: () => this.multiplayer(),
      settings: () => this.settingsScreen(),
      credits: () => this.credits(),
    }[s]();
    this.root.innerHTML = `${body}<div class="menu-toast" data-id="toast"></div>`;
  }

  private header(title: string, back = true): string {
    return `<div class="menu-head">${back ? '<button class="btn" data-nav="main">← Back</button>' : ''}<div class="hand menu-title">${title}</div><div class="ink-badge" data-id="ink">💧 ${this.host.profile.data.ink} ink</div></div>`;
  }

  private refreshInk(): void {
    const el = this.root.querySelector('[data-id="ink"]');
    if (el) el.textContent = `💧 ${this.host.profile.data.ink} ink`;
  }

  toast(text: string): void {
    const el = this.root.querySelector<HTMLElement>('[data-id="toast"]');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ————— screens —————

  private splash(): string {
    return `<div class="splash">
      <div class="title-letters">${'PAINTLAND'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
      <div class="banner">Drive the song · walk the page · paint the world</div>
      <button class="btn primary" data-nav="enter">Press any key to begin</button>
    </div>`;
  }

  private main(): string {
    const ch = this.host.currentChapter();
    const p = this.host.profile.data;
    return `<div class="menu-main">
      <div class="menu-logo"><div class="logo-mark big"></div><div><div class="hand logo-name big">PaintLand</div><div class="logo-sub">ink &amp; wash roads</div></div></div>
      <div class="menu-now">Now showing · <b>${ch.name}</b></div>
      <nav class="menu-list">
        ${this.host.canResume() ? '<button class="menu-item primary" data-nav="resume">▶ Resume</button>' : ''}
        <button class="menu-item ${this.host.canResume() ? '' : 'primary'}" data-play="${ch.id}">▶ Play · ${ch.name}</button>
        <button class="menu-item" data-nav="chapters">Chapters</button>
        <button class="menu-item" data-nav="missions">Missions</button>
        <button class="menu-item" data-nav="wardrobe">Wardrobe</button>
        <button class="menu-item" data-nav="garage">Garage</button>
        <button class="menu-item" data-nav="shop">Shop &amp; inventory</button>
        <button class="menu-item" data-nav="multiplayer">Multiplayer</button>
        <button class="menu-item" data-nav="settings">Settings</button>
        <button class="menu-item small" data-nav="intro">Watch the intro</button>
        <button class="menu-item small" data-nav="credits">Credits</button>
      </nav>
      <div class="menu-foot">
        <span>🎨 ${escapeHtml(p.name)}</span>
        <span data-id="ink">💧 ${p.ink} ink</span>
        <span>♪ ${this.host.profile.totalSealed()} phrases sealed</span>
      </div>
    </div>`;
  }

  private chaptersScreen(): string {
    const p = this.host.profile.data;
    const cards = this.host.chapters
      .map((c, i) => {
        const sealed = p.sealed[c.id]?.length ?? 0;
        const total = c.districts.reduce((n, d) => n + d.melody.length / 8, 0);
        const best = p.bestLap[c.id];
        return `<div class="card chapter-card chapter-${c.id}">
          <div class="kicker">${c.kicker} · ${i + 1}</div>
          <div class="hand chapter-name">${c.name}</div>
          <p>${c.blurb}</p>
          <div class="chapter-districts">${c.districts.map((d) => `<span>${d.name}</span>`).join('')}</div>
          <div class="chapter-stats">♪ ${sealed}/${total} phrases · best lap ${best ? fmt(best) : '—'}</div>
          <button class="btn primary" data-play="${c.id}">Play ↗</button>
        </div>`;
      })
      .join('');
    return `<div class="menu-panel wide">${this.header('Chapters')}<div class="chapter-grid">${cards}</div></div>`;
  }

  private missionsScreen(): string {
    const done = new Set(this.host.profile.data.missionsDone);
    const ch = this.host.currentChapter();
    const list = this.host
      .missions()
      .map((m) => {
        const d = ch.districts[m.giver.district];
        return `<div class="card mission-card ${done.has(m.id) ? 'done' : ''}">
          <div class="mission-top"><span class="hand">${m.title}</span><span class="reward">💧 ${m.reward.ink}${m.reward.item ? ` + ${itemName(m.reward.item)}` : ''}</span></div>
          <div class="label">${m.giver.name} · ${d?.name ?? ''}</div>
          <p>${m.text}</p>
          <button class="btn ${done.has(m.id) ? '' : 'primary'}" data-mission="${m.id}">${done.has(m.id) ? 'Play again' : 'Go to ' + m.giver.name.split(' ')[0]}</button>
        </div>`;
      })
      .join('');
    return `<div class="menu-panel wide">${this.header(`Missions · ${ch.name}`)}<p class="menu-hint">Missions are given by people with a yellow <b>!</b> above their heads. Walk up and press <b>E</b>, or start one here.</p><div class="mission-grid">${list}</div></div>`;
  }

  private swatches(field: string, colours: string[], current: string | null, allowNone = false): string {
    return `<div class="swatches">${allowNone ? `<button class="swatch none ${current === null ? 'on' : ''}" data-look="${field}" data-value="">∅</button>` : ''}${colours
      .map((c) => `<button class="swatch ${c === current ? 'on' : ''}" style="--c:${c}" data-look="${field}" data-value="${c}"></button>`)
      .join('')}</div>`;
  }

  private items(category: ShopItem['category'], current: string, field: string): string {
    return `<div class="item-grid">${CATALOGUE.filter((i) => i.category === category)
      .map((i) => {
        const owned = this.host.profile.owns(i.id);
        return `<button class="item ${i.value === current ? 'on' : ''} ${owned ? '' : 'locked'}" data-item="${i.id}" data-field="${field}">${i.name}${owned ? '' : `<small>💧 ${i.price}</small>`}</button>`;
      })
      .join('')}</div>`;
  }

  private wardrobe(): string {
    const look = this.host.profile.data.look;
    const tabs = ['hair', 'face', 'top', 'bottom', 'extras', 'name'];
    const tab = this.wardrobeTab;
    let content = '';
    if (tab === 'hair') content = `<h4>Style</h4>${this.items('hair', look.hairStyle, 'hairStyle')}<h4>Colour</h4>${this.swatches('hair', PALETTE.hair, look.hair)}`;
    if (tab === 'face') content = `<h4>Skin</h4>${this.swatches('skin', PALETTE.skin, look.skin)}<h4>Glasses</h4>${this.items('glasses', look.glasses ?? 'none', 'glasses')}<h4>Height</h4><input type="range" min="0.9" max="1.1" step="0.01" value="${look.height ?? 1}" data-range="height">`;
    if (tab === 'top') content = `<h4>Top</h4>${this.items('top', look.topStyle ?? 'tee', 'topStyle')}<h4>Colour</h4>${this.swatches('top', PALETTE.cloth, look.top)}<h4>Scarf</h4>${this.swatches('scarf', PALETTE.cloth, look.scarf, true)}`;
    if (tab === 'bottom') content = `<h4>Bottom</h4>${this.items('bottom', look.bottomStyle ?? 'trousers', 'bottomStyle')}<h4>Colour</h4>${this.swatches('bottom', PALETTE.cloth, look.bottom)}<h4>Shoes</h4>${this.swatches('shoes', PALETTE.cloth, look.shoes)}`;
    if (tab === 'extras') content = `<h4>Hat</h4>${this.items('hat', look.hat, 'hat')}<h4>On your back</h4>${this.items('back', look.back ?? 'none', 'back')}`;
    if (tab === 'name') content = `<h4>Your name (shown in multiplayer)</h4><input class="text-input" maxlength="20" value="${escapeHtml(this.host.profile.data.name)}" data-text="name">`;
    return `<div class="menu-panel side">${this.header('Wardrobe')}
      <div class="tabs">${tabs.map((t) => `<button class="tab ${t === tab ? 'on' : ''}" data-tab="${t}">${t}</button>`).join('')}</div>
      <div class="panel-body">${content}</div>
      <div class="row"><button class="btn" data-action="random-look">🎲 Randomise</button></div>
    </div>`;
  }

  private garage(): string {
    const p = this.host.profile;
    const vid = p.data.vehicle;
    const look = p.vehicleLook(vid);
    const stat = (v: number, max: number): string => `<span class="stat"><i style="width:${Math.round((v / max) * 100)}%"></i></span>`;
    const cards = VEHICLES.map((v) => {
      const t = { ...ROVER_TUNING, ...v.tuning };
      const owned = p.owns(`vehicle:${v.id}`);
      return `<button class="vehicle-card ${v.id === vid ? 'on' : ''} ${owned ? '' : 'locked'}" data-vehicle="${v.id}">
        <b>${v.name}</b><small>${v.blurb}</small>
        <div class="stats">speed ${stat(t.topSpeed, 60)} grip ${stat(t.steerLow, 13)} hop ${stat(t.hopSpeed, 11)}</div>
        ${owned ? '' : `<em>💧 ${v.price}</em>`}
      </button>`;
    }).join('');
    return `<div class="menu-panel side">${this.header('Garage')}
      <div class="panel-body">
        <div class="vehicle-grid">${cards}</div>
        <h4>Body</h4>${this.swatches('v:body', PALETTE.paint, look.body)}
        <h4>Trim</h4>${this.swatches('v:trim', PALETTE.paint, look.trim)}
        <h4>Accent</h4>${this.swatches('v:accent', PALETTE.paint, look.accent)}
        <h4>Hubs</h4>${this.swatches('v:hubs', PALETTE.paint, look.hubs)}
        <h4>Roof load</h4>${this.items('roof', look.roofLoad, 'roofLoad')}
      </div>
    </div>`;
  }

  private shop(): string {
    const p = this.host.profile;
    const tonics = (['magnet', 'feather', 'fizzy'] as const)
      .map((t) => {
        const item = CATALOGUE.find((i) => i.id === `tonic:${t}`)!;
        return `<div class="card tonic-card"><b>${item.name}</b><div class="dots">${'●'.repeat(p.data.tonics[t])}${'○'.repeat(MAX_TONICS - p.data.tonics[t])}</div><button class="btn" data-buy="${item.id}">Buy · 💧 ${item.price}</button></div>`;
      })
      .join('');
    const owned = CATALOGUE.filter((i) => i.price > 0 && i.category !== 'tonic' && p.owns(i.id));
    const forSale = CATALOGUE.filter((i) => i.price > 0 && i.category !== 'tonic' && !p.owns(i.id));
    return `<div class="menu-panel wide">${this.header('Shop & inventory')}
      <h4>Tonics you carry (press <kbd>Q</kbd> in game to drink one)</h4><div class="tonic-row">${tonics}</div>
      <h4>For sale</h4><div class="item-grid">${forSale.map((i) => `<button class="item locked" data-buy="${i.id}">${i.name}<small>${i.category} · 💧 ${i.price}</small></button>`).join('') || '<p>You own everything. Wow.</p>'}</div>
      <h4>Owned (${owned.length})</h4><div class="item-grid">${owned.map((i) => `<span class="item">${i.name}<small>${i.category}</small></span>`).join('') || '<p class="menu-hint">Nothing yet — earn ink from notes, phrases and missions.</p>'}</div>
      <p class="menu-hint">Earn ink: 1 per note, 10 per sealed phrase, 25 per lap, and big rewards from missions.</p>
    </div>`;
  }

  private multiplayer(): string {
    const n = this.host.netStatus();
    const url = new URL(window.location.href);
    const room = n.room || url.searchParams.get('room') || randomRoom();
    const serverSaved = localStorageGet('paintland.server') ?? 'ws://localhost:8787';
    return `<div class="menu-panel">${this.header('Multiplayer')}
      <p>Play together in the same painted world: see each other drive and walk, wave, and chat.</p>
      <div class="field"><label>Your name</label><input class="text-input" maxlength="20" value="${escapeHtml(this.host.profile.data.name)}" data-text="name"></div>
      <div class="field"><label>Room code</label><input class="text-input" maxlength="24" value="${escapeHtml(room)}" data-id="room"></div>
      <div class="field"><label>Server (online play)</label><input class="text-input" value="${escapeHtml(serverSaved)}" data-id="server"></div>
      <div class="row wrap">
        <button class="btn primary" data-action="join-online">Join online</button>
        <button class="btn" data-action="join-tabs">Play in two tabs (no server)</button>
        ${n.status !== 'offline' ? '<button class="btn" data-action="leave">Leave</button>' : ''}
      </div>
      <div class="net-status">Status: <b>${n.status}</b> ${n.players.length ? `· with ${n.players.map(escapeHtml).join(', ')}` : ''}</div>
      ${n.status !== 'offline' ? `<div class="field"><label>Invite link</label><input class="text-input" readonly value="${escapeHtml(inviteLink(n.room))}" data-id="invite"><button class="btn" data-action="copy-invite">Copy</button></div>` : ''}
      <p class="menu-hint">Online play needs the relay running: <code>npm run server</code>. In game, press <kbd>Enter</kbd> to chat and <kbd>G</kbd> to wave.</p>
    </div>`;
  }

  private settingsScreen(): string {
    const s = this.host.settings();
    const slider = (key: string, label: string, v: number, min = 0, max = 1, step = 0.01): string => `<div class="field"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-setting="${key}"></div>`;
    const toggle = (key: string, label: string, v: boolean): string => `<label class="check"><input type="checkbox" ${v ? 'checked' : ''} data-setting="${key}"> ${label}</label>`;
    return `<div class="menu-panel">${this.header('Settings')}
      ${slider('music', 'Radio volume', s.music)}
      ${slider('notes', 'Music-box notes', s.notes)}
      ${slider('engine', 'Engine hum', s.engine)}
      ${slider('hudScale', 'HUD size', s.hudScale, 0.7, 1.4, 0.05)}
      ${toggle('reducedMotion', 'Reduced motion (no line boil, speed lines or camera roll)', s.reducedMotion)}
      ${toggle('calmLighting', 'Calm lighting (slow time-of-day blends)', s.calmLighting)}
      <div class="row wrap"><button class="btn" data-action="studio">Open the Studio (art sliders)</button><button class="btn" data-action="controls">Controls</button></div>
    </div>`;
  }

  private credits(): string {
    return `<div class="menu-panel">${this.header('Credits')}
      <p><b>PaintLand</b> — a watercolour road game made with Three.js.</p>
      <p>Everything you see is painted in code: every house, tree, landmark, vehicle and person is built procedurally, then inked and washed by the renderer. Every song is generated live in the district’s key.</p>
      <p>Places visited: Colombo’s Lotus Tower and Galle Face Green, Sigiriya, Ella and the Nine Arch Bridge, Mirissa; the Great Wall, the Colosseum, the Taj Mahal, Machu Picchu, Christ the Redeemer, Chichen Itza and Petra — all as loving sketches, not replicas.</p>
    </div>`;
  }

  // ————— events —————

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button, [data-nav]');
    if (!el) return;
    const d = el.dataset;
    const p = this.host.profile;
    if (d.nav) {
      if (d.nav === 'enter') {
        this.host.unlockAudio();
        this.show('main');
      } else if (d.nav === 'intro') this.host.watchIntro();
      else if (d.nav === 'resume') this.host.resume();
      else this.show(d.nav as MenuScreen);
      return;
    }
    if (d.play) {
      this.host.play(d.play);
      return;
    }
    if (d.mission) {
      const m = this.host.missions().find((x) => x.id === d.mission);
      if (m) this.host.startMission(m);
      return;
    }
    if (d.tab) {
      this.wardrobeTab = d.tab;
      this.render();
      return;
    }
    if (d.look !== undefined && d.value !== undefined) {
      const field = d.look;
      if (field.startsWith('v:')) {
        p.setVehicleLook(p.data.vehicle, { [field.slice(2)]: d.value });
        this.host.vehicleChanged();
      } else {
        (p.data.look as unknown as Record<string, string | null>)[field] = d.value === '' ? null : d.value;
        p.save();
        this.host.lookChanged();
      }
      this.render();
      return;
    }
    if (d.item && d.field) {
      const item = CATALOGUE.find((i) => i.id === d.item)!;
      if (!p.owns(item.id)) {
        const r = p.buy(item);
        this.toast(r === 'ok' ? `Bought ${item.name}!` : r === 'poor' ? `Need ${item.price} ink` : '');
        if (r !== 'ok') return;
      }
      if (d.field === 'roofLoad') {
        p.setVehicleLook(p.data.vehicle, { roofLoad: item.value as never });
        this.host.vehicleChanged();
      } else {
        (p.data.look as unknown as Record<string, string>)[d.field] = item.value;
        p.save();
        this.host.lookChanged();
      }
      this.render();
      return;
    }
    if (d.vehicle) {
      const id = d.vehicle as VehicleId;
      const item = CATALOGUE.find((i) => i.id === `vehicle:${id}`)!;
      if (!p.owns(item.id)) {
        const r = p.buy(item);
        this.toast(r === 'ok' ? `The ${item.name} is yours!` : `Need ${item.price} ink`);
        if (r !== 'ok') return;
      }
      p.data.vehicle = id;
      p.save();
      this.host.vehicleChanged();
      this.render();
      return;
    }
    if (d.buy) {
      const item = CATALOGUE.find((i) => i.id === d.buy)!;
      const r = p.buy(item);
      this.toast(r === 'ok' ? `Bought ${item.name}` : r === 'poor' ? `Need ${item.price} ink` : r === 'full' ? 'You can carry 3' : 'Already owned');
      if (r === 'ok' && item.category !== 'tonic') this.host.lookChanged();
      this.render();
      return;
    }
    switch (d.action) {
      case 'random-look': {
        const look = randomLook(Math.random);
        // Only keep owned styles.
        const keep = (cat: ShopItem['category'], v: string | undefined, fallback: string): string => (p.owns(`${cat}:${v}`) ? v! : fallback);
        const next: HumanLook = {
          ...look,
          hairStyle: keep('hair', look.hairStyle, 'bob') as HumanLook['hairStyle'],
          topStyle: keep('top', look.topStyle, 'tee') as HumanLook['topStyle'],
          bottomStyle: keep('bottom', look.bottomStyle, 'trousers') as HumanLook['bottomStyle'],
          hat: keep('hat', look.hat, 'none') as HumanLook['hat'],
          glasses: keep('glasses', look.glasses, 'none') as HumanLook['glasses'],
          back: keep('back', look.back, 'none') as HumanLook['back'],
        };
        p.data.look = next;
        p.save();
        this.host.lookChanged();
        this.render();
        break;
      }
      case 'join-online':
      case 'join-tabs': {
        const room = ($<HTMLInputElement>(this.root, '[data-id="room"]').value || randomRoom()).replace(/[^a-zA-Z0-9_-]/g, '');
        const server = d.action === 'join-online' ? $<HTMLInputElement>(this.root, '[data-id="server"]').value.trim() : null;
        if (server) localStorageSet('paintland.server', server);
        this.host.netConnect(room, server);
        setTimeout(() => this.render(), 400);
        break;
      }
      case 'leave':
        this.host.netDisconnect();
        this.render();
        break;
      case 'copy-invite': {
        const input = $<HTMLInputElement>(this.root, '[data-id="invite"]');
        void navigator.clipboard?.writeText(input.value);
        this.toast('Invite link copied');
        break;
      }
      case 'studio':
        this.host.openStudio();
        break;
      case 'controls':
        this.host.openControls();
        break;
    }
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    const p = this.host.profile;
    if (el.dataset.range === 'height') {
      p.data.look.height = Number(el.value);
      p.save();
      this.host.lookChanged();
    }
    if (el.dataset.text === 'name') {
      p.data.name = el.value.slice(0, 20) || 'Painter';
      p.save();
    }
    if (el.dataset.setting) this.host.setSetting(el.dataset.setting, el.type === 'checkbox' ? el.checked : Number(el.value));
  }
}

function itemName(id: string): string {
  return CATALOGUE.find((i) => i.id === id)?.name ?? id;
}

function randomRoom(): string {
  return `paint-${Math.random().toString(36).slice(2, 7)}`;
}

function inviteLink(room: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', room);
  const server = localStorageGet('paintland.server');
  if (server) url.searchParams.set('server', server);
  return url.toString();
}

function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
