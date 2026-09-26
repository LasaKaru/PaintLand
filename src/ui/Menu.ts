import { LiveryEditor } from './LiveryEditor';
import { AccountScreen, type AccountHost } from './AccountScreen';
import { GalleryScreen } from './GalleryScreen';
import { PassScreen } from './PassScreen';
import { buyFeatured, featuredToday, FEATURED_OFF } from '../gameplay/SeasonPass';
import { PAGE_REWARD, pageDone, stickerPages, type StickerArea } from '../gameplay/Stickers';
import { actionGroupLabel, actionLabel, itemLabel } from './names';
import { checkPin, hashPin, isLocked, PIN_PATTERN, PinGuard } from '../core/Family';
import { RoadStudio } from './RoadStudio';
import type { CustomRoad } from '../creator/CustomRoad';
import { accessible } from './a11y';
import { defaultServer } from '../net/Leaderboard';
import type { BenchmarkResult } from '../render/Benchmark';
import type { Profile, ShopItem } from '../gameplay/Profile';
import { brand, COMPANY_LOGO } from '../brand/Brand';
import { paintedLogo } from '../brand/Watercolour';
import { apiUrl } from '../net/Api';
import { analytics } from '../net/Analytics';
import { CHALLENGES, challengeAmount, challengeProgress, ensureDaily } from '../gameplay/Challenges';
import { PHOTO_SUBJECTS } from '../gameplay/PhotoHunt';
import { CHAINS, CITY_MISSIONS, missionUnlocked } from '../gameplay/CityMissions';
import { CATALOGUE, MAX_OUTFITS, MAX_TONICS, PALETTE } from '../gameplay/Profile';
import type { ChapterDef } from '../world/Chapters';
import type { MissionDef } from '../gameplay/Missions';
import { VEHICLES, type VehicleId } from '../models/Vehicles';
import { defaultEngine, defaultHorn } from '../audio/VehicleSounds';

/** Ready-made outfits from the Sri Lankan pack (colours are free; styles need the pack). */
const LANKA_PRESETS: { id: string; label: StringKey; look: Partial<HumanLook> }[] = [
  { id: 'osariya', label: 'wr.presetOsariya', look: { topStyle: 'osariya', top: '#d8463a', hairStyle: 'bun', hat: 'none', acc: 'earrings', scarf: null } },
  { id: 'national', label: 'wr.presetNational', look: { topStyle: 'national', top: '#f6f0e4', bottomStyle: 'sarong', bottom: '#f6f0e4', hat: 'natcap', scarf: null, shoes: '#6b4a2a' } },
];

/** Garage item fields stored on the vehicle's look rather than the character's. */
const VEHICLE_FIELDS = ['roofLoad', 'decal', 'spoiler', 'glow', 'finish', 'wrap', 'wheelStyle', 'exhaust', 'engine', 'horn'];
import { ROVER_TUNING } from '../gameplay/RoverController';
import { randomLook, type HumanLook } from '../models/Human';
import { fmt } from './Hud';
import { TROPHIES } from '../gameplay/Trophies';
import { fetchBoard } from '../net/Leaderboard';
import { LANGS, lang, onLangChange, setLang, t, type Lang, type StringKey } from '../core/i18n';
import { ACTION_INFO, keyLabel, type ActionName, type Input } from '../core/Input';
import type { GameOptions } from '../core/Options';
import { QUALITY_KEYS, VIBES, applyArtStyle, applyQuality, applyVibe, type ArtStyle, type QualityLevel, type StudioSettings } from '../render/StudioSettings';

type SettingsTab = 'graphics' | 'look' | 'controls' | 'driving' | 'audio' | 'access' | 'family';

export type MenuScreen = 'splash' | 'main' | 'trials' | 'race' | 'chapters' | 'missions' | 'wardrobe' | 'garage' | 'shop' | 'multiplayer' | 'trophies' | 'settings' | 'credits' | 'citymissions' | 'daily' | 'livery' | 'roadstudio' | 'account' | 'gallery' | 'stickers' | 'mural' | 'pass' | 'none';

/** Everything the menu needs from the game. */
export interface MenuHost extends AccountHost {
  profile: Profile;
  runBenchmark(done: (r: BenchmarkResult) => void): void;
  testRoad(road: CustomRoad): void;
  voiceMuted(name: string): boolean;
  reportPlayer(name: string, reason: string, note: string, block: boolean): Promise<boolean>;
  toggleVoiceMute(name: string): void;
  chapters: ChapterDef[];
  currentChapter(): ChapterDef;
  missions(): MissionDef[];
  play(chapterId: string): void;
  startMission(m: MissionDef): void;
  lookChanged(): void;
  vehicleChanged(): void;
  /** Play together (convoys, contests, paint splashes); returns a message to show. */
  together(kind: 'convoy' | 'drift' | 'stunt' | 'paint'): string | null;
  togetherState(): { roam: boolean; online: boolean; convoy: 'leading' | 'following' | null; busy: boolean };
  /** Free-roam areas visited so far (sticker book pages). */
  stickerAreas(): StickerArea[];
  /** The mural board being painted (Menu → mural). */
  currentMural(): string | null;
  muralChanged(id: string): void;
  /** Play the fitted horn (garage preview). */
  previewHorn?(): void;
  showcase(target: 'character' | 'vehicle' | null): void;
  netStatus(): { status: string; room: string; players: string[] };
  netConnect(room: string, server: string | null): boolean;
  netDisconnect(): void;
  openStudio(): void;
  openControls(): void;
  watchIntro(): void;
  enterHub(): void;
  enterCity(): void;
  enterVillage(): void;
  startCityMission(id: string): void;
  cancelCityMission(): void;
  /** Id of the open-world mission in progress, if any. */
  cityMission(): string | null;
  uiSound(): void;
  startTrial(chapterId: string): void;
  startRace(chapterId: string): void;
  handling(): 'arcade' | 'realistic';
  unlockAudio(): void;
  /** Art + graphics values (mutable; call settingsChanged after editing). */
  studio(): StudioSettings;
  /** Controls, driving, accessibility (mutable). */
  options(): GameOptions;
  settingsChanged(): void;
  input(): Input;
  stats(): string;
  resume(): void;
  canResume(): boolean;
  /** The secret word was typed: open the admin login. */
  openAdmin(): void;
}

/** Typed on a menu screen, opens the admin login (the password is checked by the server). */
const SECRET = 'kumara';
const PAINTED_UI = new Map<string, string>();

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
  private benchResult: BenchmarkResult | null = null;
  private reportFor: string | null = null;
  private renderedScreen: MenuScreen | null = null;
  private familyUnlocked = false;
  private readonly pinGuard = new PinGuard();
  private readonly roadStudio = new RoadStudio(
    (road) => this.host.testRoad(road),
    (text) => this.toast(text),
    (code) => this.galleryScreen.publish(code),
  );
  private readonly accountScreen: AccountScreen;
  private readonly galleryScreen: GalleryScreen;
  private readonly passScreen: PassScreen;
  /** The same painter, for mural boards in the free-roam areas. */
  private readonly muralEditor = new LiveryEditor(
    (code) => {
      const id = this.host.currentMural();
      if (!id) return;
      const p = this.host.profile;
      p.data.murals = { ...p.data.murals, [id]: code };
      p.save();
      this.host.muralChanged(id);
    },
    (text) => this.toast(text),
  );
  private readonly liveryEditor = new LiveryEditor(
    (code) => {
      const p = this.host.profile;
      p.setVehicleLook(p.data.vehicle, { livery: code || undefined });
      this.host.vehicleChanged();
    },
    (text) => this.toast(text),
  );
  private settingsTab: SettingsTab = 'graphics';
  private listening: ActionName | null = null;
  private readonly formatters = new Map<string, (v: number) => string>();
  private toastTimer = 0;
  private typed = '';
  private logoTaps: number[] = [];

  constructor(parent: HTMLElement, private readonly host: MenuHost) {
    this.accountScreen = new AccountScreen(
      host,
      () => this.render(),
      (m) => this.toast(m),
    );
    this.galleryScreen = new GalleryScreen(
      host,
      () => this.screen === 'gallery' && this.render(),
      (m) => this.toast(m),
    );
    this.passScreen = new PassScreen(
      host,
      () => this.screen === 'pass' && this.render(),
      (m) => this.toast(m),
    );
    this.root = document.createElement('div');
    this.root.className = 'menu';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('submit', (e) => this.onSubmit(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => this.onInput(e));
    host.profile.onChange(() => this.refreshInk());
    this.root.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
      if (a) analytics.track(a.dataset.link === 'sponsor-logo' ? 'sponsor_click' : 'link', { id: a.dataset.id ?? a.dataset.link });
    });
    // The secret word on any menu screen (not while typing in a field) opens the admin login.
    window.addEventListener('keydown', (e) => {
      if (this.screen === 'none' || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      this.typed = (this.typed + e.key.toLowerCase()).slice(-12);
      if (this.typed.endsWith(SECRET)) {
        this.typed = '';
        this.host.openAdmin();
      }
    });
    onLangChange(() => this.render());
    setInterval(() => {
      const el = this.root.querySelector('[data-id="stats"]');
      if (el) el.textContent = this.host.stats();
    }, 500);
  }

  show(screen: MenuScreen): void {
    this.cancelListening();
    // Opening Account fetches fresh friends and club news.
    if (screen === 'account' && this.screen !== 'account') this.accountScreen.load(true);
    if (screen === 'gallery' && this.screen !== 'gallery') this.galleryScreen.load();
    if (screen === 'pass') this.passScreen.load();
    this.screen = screen;
    this.root.classList.toggle('open', screen !== 'none');
    this.host.showcase(screen === 'wardrobe' ? 'character' : screen === 'garage' || screen === 'livery' ? 'vehicle' : null);
    this.render();
  }

  private render(): void {
    const s = this.screen;
    if (s === 'none') {
      this.root.innerHTML = '';
      return;
    }
    // Keyboard users: remember the focused control so it keeps focus after the redraw.
    const focusSig = focusSignature(this.root);
    const newScreen = this.renderedScreen !== s;
    this.renderedScreen = s;
    const body = {
      splash: () => this.splash(),
      main: () => this.main(),
      chapters: () => this.chaptersScreen(),
      missions: () => this.missionsScreen(),
      citymissions: () => this.cityMissionsScreen(),
      daily: () => this.dailyScreen(),
      wardrobe: () => this.wardrobe(),
      garage: () => this.garage(),
      roadstudio: () => `<div class="menu-panel wide">${this.header(t('rs.title'))}<div class="panel-body" data-id="roadstudio"></div></div>`,
      stickers: () => this.stickersScreen(),
      mural: () => `<div class="menu-panel side">${this.header(`🎨 ${t('mural.title')}`).replace('data-nav="main"', 'data-nav="resume"')}<p class="menu-hint">${t('mural.hint')}</p><div class="panel-body" data-id="mural"></div></div>`,
      livery: () => `<div class="menu-panel side">${this.header(t('lv.title')).replace('data-nav="main"', 'data-nav="garage"')}<div class="panel-body" data-id="livery"></div></div>`,
      shop: () => this.shop(),
      multiplayer: () => this.multiplayer(),
      gallery: () => `<div class="menu-panel wide">${this.header(`🖼 ${t('gal.title')}`)}<div class="panel-body">${this.galleryScreen.render()}</div></div>`,
      pass: () => `<div class="menu-panel wide">${this.header(`🎟 ${t('pass.title')}`)}<div class="panel-body">${this.passScreen.render()}</div></div>`,
      account: () => `<div class="menu-panel">${this.header(t('acct.title'))}<div class="panel-body">${this.accountScreen.render()}</div></div>`,
      settings: () => this.settingsScreen(),
      trophies: () => this.trophiesScreen(),
      trials: () => this.trialsScreen(),
      race: () => this.raceScreen(),
      credits: () => this.credits(),
    }[s]();
    // Keep a message that's still showing across re-renders (async actions re-render after toasting).
    const live = this.toastText && performance.now() < this.toastUntil;
    this.root.innerHTML = `${body}<div class="menu-toast ${live ? 'show' : ''}" data-id="toast" role="status" aria-live="polite">${live ? escapeHtml(this.toastText) : ''}</div>`;
    const lv = s === 'livery' ? this.root.querySelector<HTMLElement>('[data-id="livery"]') : null;
    if (lv) this.liveryEditor.mount(lv, this.host.profile.vehicleLook(this.host.profile.data.vehicle).livery);
    const mu = s === 'mural' ? this.root.querySelector<HTMLElement>('[data-id="mural"]') : null;
    const muralId = this.host.currentMural();
    if (mu && muralId) this.muralEditor.mount(mu, this.host.profile.data.murals?.[muralId]);
    if (focusSig && !newScreen) this.root.querySelector<HTMLElement>(focusSig)?.focus({ preventScroll: true });
    else if (newScreen && (document.activeElement === document.body || this.root.contains(document.activeElement) || !document.activeElement))
      // A new screen: put focus at its start (the menu, or the Back button).
      this.root.querySelector<HTMLElement>('.menu-panel button, .menu-item, button')?.focus({ preventScroll: true });
    const rs = s === 'roadstudio' ? this.root.querySelector<HTMLElement>('[data-id="roadstudio"]') : null;
    if (rs) this.roadStudio.mount(rs);
    accessible(this.root);
    this.paintBrandImages();
  }

  /** Branding changed (admin panel or server): redraw the footer. */
  refreshBrand(): void {
    if (this.screen === 'main' || this.screen === 'splash') this.render();
  }

  /** Company, support links, sponsor logos and the advertising line, from the admin settings. */
  private brandFooter(): string {
    const b = brand();
    const link = (id: string, url: string, label: string): string => (url ? `<a class="btn small" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-link="${id}">${label}</a>` : '');
    const sponsors = b.sponsors.filter((s) => s.weight > 0);
    return `<div class="brand-foot">
      <a class="brand-presents" href="${escapeHtml(b.company.site || '#')}" target="_blank" rel="noopener" data-link="site">
        <img class="brand-logo" data-paint-src="${escapeHtml(b.company.logo ? apiUrl(b.company.logo) : COMPANY_LOGO)}" alt="${escapeHtml(b.company.name)}">
        <span class="label">${t('brand.by', { name: escapeHtml(b.company.name) })}</span>
      </a>
      <div class="brand-links">
        ${link('coffee', b.links.coffee, `☕ ${t('brand.coffee')}`)}
        ${link('fund', b.links.fund, `💛 ${t('brand.fund')}`)}
        ${link('sponsor', b.links.sponsor, `🤝 ${t('brand.sponsor')}`)}
        ${b.links.custom.map((l, i) => link(`custom${i}`, l.url, escapeHtml(l.label))).join('')}
      </div>
      ${sponsors.length ? `<div class="brand-sponsors">${sponsors.map((s) => `<a href="${escapeHtml(s.url || '#')}" target="_blank" rel="noopener" data-link="sponsor-logo" data-id="${escapeHtml(s.id)}" title="${escapeHtml(s.name)}"><img data-paint-src="${escapeHtml(apiUrl(s.image))}" alt="${escapeHtml(s.name)}"></a>`).join('')}</div>` : ''}
      ${b.showSponsorCta && b.company.contact ? `<a class="brand-cta" href="mailto:${escapeHtml(b.company.contact)}?subject=Advertise%20in%20Inkroads" data-link="advertise">${t('brand.advertiseLine', { email: escapeHtml(b.company.contact) })}</a>` : ''}
    </div>`;
  }

  /** Swap footer logos for their watercolour versions once painted. */
  private paintBrandImages(): void {
    for (const img of this.root.querySelectorAll<HTMLImageElement>('img[data-paint-src]')) {
      const src = img.dataset.paintSrc!;
      const cached = PAINTED_UI.get(src);
      if (cached) {
        img.src = cached;
        continue;
      }
      void paintedLogo(src, 300, 110, false).then((c) => {
        if (!c) return;
        const url = c.toDataURL('image/png');
        PAINTED_UI.set(src, url);
        img.src = url;
      });
    }
  }

  private header(title: string, back = true): string {
    return `<div class="menu-head">${back ? `<button class="btn" data-nav="main">${t('menu.back')}</button>` : ''}<div class="hand menu-title">${title}</div><div class="ink-badge" data-id="ink">💧 ${this.host.profile.data.ink} ink</div></div>`;
  }

  private refreshInk(): void {
    const el = this.root.querySelector('[data-id="ink"]');
    if (el) el.textContent = `💧 ${this.host.profile.data.ink} ink`;
  }

  private toastText = '';
  private toastUntil = 0;

  toast(text: string): void {
    if (!text) return;
    this.toastText = text;
    this.toastUntil = performance.now() + 2600;
    const el = this.root.querySelector<HTMLElement>('[data-id="toast"]');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.root.querySelector<HTMLElement>('[data-id="toast"]')?.classList.remove('show'), 2600);
  }

  // ————— screens —————

  private splash(): string {
    return `<div class="splash">
      <div class="title-letters">${'INKROADS'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
      <div class="banner">${t('splash.banner')}</div>
      <button class="btn primary" data-nav="enter">${t('splash.press')}</button>
      <div class="lang-row">${this.langButtons()}</div>
    </div>`;
  }

  private main(): string {
    const ch = this.host.currentChapter();
    const p = this.host.profile.data;
    return `<div class="menu-main">
      <div class="menu-logo" data-action="logo-tap"><div class="logo-mark big"></div><div><div class="hand logo-name big">Inkroads</div><div class="logo-sub">ink &amp; wash roads</div></div></div>
      <div class="menu-now">${t('menu.now')} · <b>${ch.name}</b></div>
      <nav class="menu-list">
        ${this.host.canResume() ? `<button class="menu-item primary" data-nav="resume">${t('menu.resume')}</button>` : ''}
        <button class="menu-item ${this.host.canResume() ? '' : 'primary'}" data-play="${ch.id}">${t('menu.play', { chapter: ch.name })}</button>
        <button class="menu-item" data-nav="hub">${t('menu.hub')}</button>
        <button class="menu-item" data-nav="city">${t('menu.city')}</button>
        <button class="menu-item" data-nav="village">${t('menu.village')}</button>
        <button class="menu-item" data-nav="daily">${t('daily.menu')}</button>
        <button class="menu-item" data-nav="chapters">${t('menu.chapters')}</button>
        <button class="menu-item" data-nav="roadstudio">🛣 ${t('rs.title')}</button>
        <button class="menu-item" data-nav="gallery">🖼 ${t('gal.title')}</button>
        <button class="menu-item" data-nav="pass">🎟 ${t('pass.title')}</button>
        <button class="menu-item" data-nav="stickers">📒 ${t('st.title')}</button>
        <button class="menu-item" data-nav="trials">${t('menu.trials')}</button>
        <button class="menu-item" data-nav="race">${t('menu.race')}</button>
        <button class="menu-item" data-nav="missions">${t('menu.missions')}</button>
        <button class="menu-item" data-nav="wardrobe">${t('menu.wardrobe')}</button>
        <button class="menu-item" data-nav="garage">${t('menu.garage')}</button>
        <button class="menu-item" data-nav="shop">${t('menu.shop')}</button>
        <button class="menu-item" data-nav="multiplayer">${t('menu.multiplayer')}</button>
        <button class="menu-item" data-nav="account">👤 ${this.host.account.signedIn ? escapeHtml(this.host.account.name ?? '') : t('acct.title')}</button>
        <button class="menu-item" data-nav="trophies">${t('menu.trophies', { n: this.host.profile.data.trophies.length, total: TROPHIES.length })}</button>
        <button class="menu-item" data-nav="settings">${t('menu.settings')}</button>
        <button class="menu-item small" data-nav="intro">${t('menu.intro')}</button>
        <button class="menu-item small" data-nav="credits">${t('menu.credits')}</button>
      </nav>
      <div class="menu-foot">
        <span>🎨 ${escapeHtml(p.name)}</span>
        <span data-id="ink">💧 ${p.ink} ink</span>
        <span>♪ ${t('menu.sealed', { n: this.host.profile.totalSealed() })}</span>
      </div>
      <div class="lang-row">${this.langButtons()}</div>
    </div>
    ${this.brandFooter()}`;
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

  private dailyScreen(): string {
    const p = this.host.profile;
    const day = todayKey();
    const state = p.data.daily?.day === day ? p.data.daily : ensureDaily(null, day, (k) => p.stat(k));
    const rows = state.ids
      .map((id) => {
        const c = CHALLENGES.find((q) => q.id === id)!;
        const got = p.data.daily?.day === day ? challengeProgress(c, state, (k) => p.stat(k)) : 0;
        const done = state.claimed.includes(id);
        return `<div class="card daily-row ${done ? 'done' : ''}"><span class="icon">${done ? '✅' : c.icon}</span>
          <div><div class="hand">${t(`ch.${c.stat}` as StringKey, { n: challengeAmount(c, c.amount) })}</div><div class="bar"><i style="width:${Math.round((got / c.amount) * 100)}%"></i></div></div>
          <span class="reward">💧 ${c.ink} · ${challengeAmount(c, got)} / ${challengeAmount(c, c.amount)}</span></div>`;
      })
      .join('');
    const seen = p.data.seen;
    const hunt = PHOTO_SUBJECTS.map((s) => {
      const done = seen.includes(`photo:${s.id}`);
      return `<div class="card hunt-item ${done ? 'done' : ''}"><div class="icon">${done ? '✅' : s.icon}</div><div class="hand">${s.name}</div><small>💧 ${s.ink}</small></div>`;
    }).join('');
    const found = PHOTO_SUBJECTS.filter((s) => seen.includes(`photo:${s.id}`)).length;
    return `<div class="menu-panel wide">${this.header(t('daily.title'))}
      <p class="menu-hint">${t('daily.intro')} · <b>🔥 ${t('daily.streak', { n: p.data.streak?.count ?? 0 })}</b></p>
      <div class="daily-list">${rows}</div>
      <h3 class="hand">📷 ${t('hunt.title')} (${found} / ${PHOTO_SUBJECTS.length})</h3>
      <p class="menu-hint">${t('hunt.intro')}</p>
      <div class="hunt-grid">${hunt}</div>
    </div>`;
  }

  private cityMissionsScreen(): string {
    const done = this.host.profile.data.seen.filter((s) => s.startsWith('cm:')).map((s) => s.slice(3));
    const current = this.host.cityMission();
    const chains = CHAINS.map((c) => {
      const rows = CITY_MISSIONS.filter((m) => m.chain === c.id)
        .map((m) => {
          const isDone = done.includes(m.id);
          const open = missionUnlocked(m, done);
          const btn = !open
            ? `<span class="label">🔒 ${t('cm.locked')}</span>`
            : `<button class="btn ${isDone ? '' : 'primary'}" data-citymission="${m.id}">${m.id === current ? '▶' : isDone ? t('cm.replay') : t('cm.start')}</button>`;
          return `<div class="card mission-card ${isDone ? 'done' : ''}">
            <div class="mission-top"><span class="hand">${isDone ? '✓ ' : ''}${m.title}</span><span class="reward">💧 ${m.reward.ink}${m.reward.item ? ` + ${itemLabel(m.reward.item)}` : ''}</span></div>
            <div class="label">${m.giver}</div>
            <p>${m.intro}</p>${btn}</div>`;
        })
        .join('');
      return `<h3 class="hand">${c.icon} ${c.name}</h3><p class="menu-hint">${c.blurb}</p><div class="mission-grid">${rows}</div>`;
    }).join('');
    const cancel = current ? `<button class="btn" data-citymission="cancel">${t('cm.cancel')}</button>` : '';
    return `<div class="menu-panel wide">${this.header(t('cm.title'))}<p class="menu-hint">${t('cm.intro')} (${done.length} / ${CITY_MISSIONS.length})</p>${cancel}${chains}</div>`;
  }

  private missionsScreen(): string {
    const done = new Set(this.host.profile.data.missionsDone);
    const ch = this.host.currentChapter();
    const list = this.host
      .missions()
      .map((m) => {
        const d = ch.districts[m.giver.district];
        return `<div class="card mission-card ${done.has(m.id) ? 'done' : ''}">
          <div class="mission-top"><span class="hand">${m.title}</span><span class="reward">💧 ${m.reward.ink}${m.reward.item ? ` + ${itemLabel(m.reward.item)}` : ''}</span></div>
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
        const tag = owned ? '' : i.loot ? '<small>🎁 loot chests</small>' : `<small>💧 ${i.price}</small>`;
        return `<button class="item ${i.value === current ? 'on' : ''} ${owned ? '' : 'locked'} ${i.rarity !== undefined ? `rarity-${i.rarity}` : ''}" data-item="${i.id}" data-field="${field}">${itemLabel(i)}${tag}</button>`;
      })
      .join('')}</div>`;
  }

  private wardrobe(): string {
    const look = this.host.profile.data.look;
    const tabs = ['hair', 'face', 'top', 'bottom', 'extras', 'pet', 'outfits', 'name'];
    const tab = this.wardrobeTab;
    let content = '';
    if (tab === 'hair') content = `<h4>Style</h4>${this.items('hair', look.hairStyle, 'hairStyle')}<h4>Colour</h4>${this.swatches('hair', PALETTE.hair, look.hair)}`;
    if (tab === 'face') content = `<h4>Skin</h4>${this.swatches('skin', PALETTE.skin, look.skin)}<h4>${t('wr.eyes')}</h4>${this.items('eyes', look.eyes ?? 'dots', 'eyes')}<h4>${t('wr.mouth')}</h4>${this.items('mouth', look.mouth ?? 'smile', 'mouth')}<h4>${t('wr.details')}</h4>${this.items('facial', look.face ?? 'none', 'face')}<h4>Glasses</h4>${this.items('glasses', look.glasses ?? 'none', 'glasses')}<h4>Height</h4><input type="range" min="0.9" max="1.1" step="0.01" value="${look.height ?? 1}" data-range="height">`;
    if (tab === 'top') content = `<h4>Top</h4>${this.items('top', look.topStyle ?? 'tee', 'topStyle')}<h4>Colour</h4>${this.swatches('top', PALETTE.cloth, look.top)}<h4>${t('wr.print')}</h4>${this.items('print', look.print ?? 'none', 'print')}<h4>Scarf</h4>${this.swatches('scarf', PALETTE.cloth, look.scarf, true)}`;
    if (tab === 'bottom') content = `<h4>Bottom</h4>${this.items('bottom', look.bottomStyle ?? 'trousers', 'bottomStyle')}<h4>Colour</h4>${this.swatches('bottom', PALETTE.cloth, look.bottom)}<h4>${t('wr.print')}</h4>${this.items('bprint', look.bottomPrint ?? 'none', 'bottomPrint')}<h4>Shoes</h4>${this.swatches('shoes', PALETTE.cloth, look.shoes)}`;
    if (tab === 'extras') content = `<h4>Hat</h4>${this.items('hat', look.hat, 'hat')}<h4>On your back</h4>${this.items('back', look.back ?? 'none', 'back')}<h4>${t('wr.acc')}</h4>${this.items('acc', look.acc ?? 'none', 'acc')}`;
    if (tab === 'pet') content = `<h4>${t('wr.pet')}</h4>${this.items('pet', look.pet ?? 'none', 'pet')}<p class="menu-hint">${t('wr.petHint')}</p>`;
    if (tab === 'outfits') content = this.outfitsTab();
    if (tab === 'name') content = `<h4>Your name (shown in multiplayer)</h4><input class="text-input" maxlength="20" value="${escapeHtml(this.host.profile.data.name)}" data-text="name">`;
    return `<div class="menu-panel side">${this.header('Wardrobe')}
      <div class="tabs">${tabs.map((t) => `<button class="tab ${t === tab ? 'on' : ''}" data-tab="${t}">${t}</button>`).join('')}</div>
      <div class="panel-body">${content}</div>
      <div class="row"><button class="btn" data-action="random-look">🎲 Randomise</button></div>
    </div>`;
  }

  private togetherSection(): string {
    const st = this.host.togetherState();
    const note = st.roam ? t('tg.hint') : t('tg.needRoam');
    const dis = st.roam ? '' : 'disabled';
    const busy = st.busy ? 'disabled' : '';
    return `<h4>🤝 ${t('tg.title')}</h4><p class="menu-hint">${note}</p>
      <div class="row wrap">
        <button class="btn" data-together="convoy" ${dis} ${st.online ? '' : 'disabled'}>🚗 ${st.convoy === 'leading' ? t('tg.endConvoy') : t('tg.leadConvoy')}</button>
        <button class="btn" data-together="drift" ${dis} ${busy}>🌀 ${t('tg.drift')}</button>
        <button class="btn" data-together="stunt" ${dis} ${busy}>🦘 ${t('tg.stunt')}</button>
        <button class="btn" data-together="paint" ${dis} ${busy}>🎨 ${t('tg.paint')}</button>
      </div>`;
  }

  private stickersScreen(): string {
    const p = this.host.profile;
    const pages = stickerPages(p.data, this.host.stickerAreas(), { harbour: t('hub.name'), village: t('st.village'), city: t('city.name'), chapters: t('menu.chapters'), photos: t('st.photos'), garage: t('menu.garage') }, { secret: t('st.secret'), mural: t('st.mural') });
    const total = pages.reduce((n, pg) => n + pg.stickers.filter((x) => x.got).length, 0);
    const all = pages.reduce((n, pg) => n + pg.stickers.length, 0);
    const html = pages
      .map((pg) => {
        const got = pg.stickers.filter((x) => x.got).length;
        const claimed = p.data.seen.includes(`stickers:${pg.id}`);
        const reward = pageDone(pg) ? (claimed ? `<span class="menu-hint">✓ ${t('st.claimed')}</span>` : `<button class="btn small primary" data-sticker-claim="${pg.id}">🎁 ${t('st.claim', { ink: PAGE_REWARD })}</button>`) : '';
        const body = pg.locked
          ? `<p class="menu-hint">${t('st.visit', { place: escapeHtml(pg.title) })}</p>`
          : `<div class="sticker-grid">${pg.stickers.map((x) => `<span class="sticker ${x.got ? 'got' : ''}" title="${escapeHtml(x.got ? x.label : t('st.unknown'))}"><b aria-hidden="true">${x.got ? x.icon : '?'}</b><small>${x.got ? escapeHtml(x.label) : t('st.unknown')}</small></span>`).join('')}</div>`;
        return `<div class="card sticker-page"><div class="row"><b>${escapeHtml(pg.title)}</b><small>${pg.locked ? '' : `${got}/${pg.stickers.length}`}</small>${reward}</div>${body}</div>`;
      })
      .join('');
    return `<div class="menu-panel wide">${this.header(`📒 ${t('st.title')}`)}<p class="menu-hint">${t('st.hint', { n: total, total: all, ink: PAGE_REWARD })}</p><div class="panel-body">${html}</div></div>`;
  }

  private outfitsTab(): string {
    const p = this.host.profile;
    const saved = p.data.outfits ?? [];
    const rows = saved
      .map((o, i) => `<div class="card outfit-card"><b>${escapeHtml(o.name)}</b><div class="row"><button class="btn primary" data-action="outfit-wear" data-index="${i}">${t('wr.wear')}</button><button class="btn" data-action="outfit-delete" data-index="${i}" aria-label="${t('wr.delete')} ${escapeHtml(o.name)}">🗑</button></div></div>`)
      .join('');
    const pack = CATALOGUE.find((i) => i.id === 'pack:lanka')!;
    const presets = LANKA_PRESETS.map((pr) => {
      const missing = p.missingFor(pr.look).length;
      return `<div class="card outfit-card"><b>🇱🇰 ${t(pr.label)}</b><div class="row"><button class="btn ${missing ? '' : 'primary'}" data-action="preset-wear" data-preset="${pr.id}">${t('wr.wear')}</button></div></div>`;
    }).join('');
    const ownsPack = p.owns(pack.id);
    return `<h4>${t('wr.saveOutfit')}</h4>
      <div class="row"><input class="text-input" maxlength="24" placeholder="${t('wr.outfitName')}" aria-label="${t('wr.outfitName')}" data-id="outfit-name"><button class="btn primary" data-action="outfit-save">💾 ${t('wr.save')}</button></div>
      <h4>${t('wr.myOutfits')} (${saved.length}/${MAX_OUTFITS})</h4>
      <div class="outfit-grid">${rows || `<p class="menu-hint">${t('wr.noOutfits')}</p>`}</div>
      <h4>${t('wr.lankaPack')}</h4>
      <div class="outfit-grid">${presets}</div>
      ${ownsPack ? '' : `<div class="row"><button class="btn primary" data-buy="${pack.id}">${itemLabel(pack)} · 💧 ${pack.price}</button></div><p class="menu-hint">${t('wr.packHint')}</p>`}`;
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
        <b>${itemLabel(`vehicle:${v.id}`)}</b><small>${v.blurb}</small>
        <div class="stats">speed ${stat(t.topSpeed, 60)} grip ${stat(t.steerLow, 13)} hop ${stat(t.hopSpeed, 11)}</div>
        ${owned ? '' : `<em>💧 ${v.price}</em>`}
      </button>`;
    }).join('');
    return `<div class="menu-panel side">${this.header('Garage')}
      <div class="panel-body">
        <div class="vehicle-grid">${cards}</div>
        <div class="row"><button class="btn primary" data-nav="livery">🎨 ${t('lv.open')}</button></div>
        <h4>Body</h4>${this.swatches('v:body', PALETTE.paint, look.body)}
        <h4>Trim</h4>${this.swatches('v:trim', PALETTE.paint, look.trim)}
        <h4>Accent</h4>${this.swatches('v:accent', PALETTE.paint, look.accent)}
        <h4>Hubs</h4>${this.swatches('v:hubs', PALETTE.paint, look.hubs)}
        <h4>Roof load</h4>${this.items('roof', look.roofLoad, 'roofLoad')}
        <h4>Decals</h4>${this.items('decal', look.decal ?? 'none', 'decal')}
        <h4>Spoiler</h4>${this.items('spoiler', look.spoiler ?? 'none', 'spoiler')}
        <h4>Underglow</h4>${this.items('glow', look.glow ?? 'none', 'glow')}
        <h4>${t('gar.finish')}</h4>${this.items('finish', look.finish ?? 'gloss', 'finish')}
        <h4>${t('gar.wrap')}</h4>${this.items('wrap', look.wrap ?? 'none', 'wrap')}
        <h4>${t('gar.wheels')}</h4>${this.items('wheels', look.wheelStyle ?? 'classic', 'wheelStyle')}
        <h4>${t('gar.exhaust')}</h4>${this.items('exhaust', look.exhaust ?? 'none', 'exhaust')}
        <h4>${t('gar.engine')}</h4>${this.items('engine', look.engine ?? defaultEngine(vid), 'engine')}
        <h4>${t('gar.horn')}</h4>${this.items('horn', look.horn ?? defaultHorn(vid), 'horn')}
      </div>
    </div>`;
  }

  private shop(): string {
    const p = this.host.profile;
    const tonics = (['magnet', 'feather', 'fizzy'] as const)
      .map((t) => {
        const item = CATALOGUE.find((i) => i.id === `tonic:${t}`)!;
        return `<div class="card tonic-card"><b>${itemLabel(item)}</b><div class="dots">${'●'.repeat(p.data.tonics[t])}${'○'.repeat(MAX_TONICS - p.data.tonics[t])}</div><button class="btn" data-buy="${item.id}">Buy · 💧 ${item.price}</button></div>`;
      })
      .join('');
    const featured = featuredToday(p)
      .map((f) => `<button class="item locked featured" data-featured="${f.item.id}">${itemLabel(f.item)}<small><s>💧 ${f.item.price}</s> 💧 ${f.price}</small></button>`)
      .join('');
    const owned = CATALOGUE.filter((i) => i.price > 0 && i.category !== 'tonic' && p.owns(i.id));
    const forSale = CATALOGUE.filter((i) => i.price > 0 && i.category !== 'tonic' && !p.owns(i.id));
    return `<div class="menu-panel wide">${this.header('Shop & inventory')}
      <p class="fam-status">${t('shop.cosmetic')}</p>
      ${featured ? `<h4>✨ ${t('shop.featured', { off: Math.round(FEATURED_OFF * 100) })}</h4><div class="item-grid">${featured}</div>` : ''}
      <h4>Tonics you carry (press <kbd>Q</kbd> in game to drink one)</h4><div class="tonic-row">${tonics}</div>
      <h4>For sale</h4><div class="item-grid">${forSale.map((i) => `<button class="item locked" data-buy="${i.id}">${itemLabel(i)}<small>${i.category} · 💧 ${i.price}</small></button>`).join('') || '<p>You own everything. Wow.</p>'}</div>
      <h4>Owned (${owned.length})</h4><div class="item-grid">${owned.map((i) => `<span class="item">${itemLabel(i)}<small>${i.category}</small></span>`).join('') || '<p class="menu-hint">Nothing yet — earn ink from notes, phrases and missions.</p>'}</div>
      <p class="menu-hint">Earn ink: 1 per note, 10 per sealed phrase, 25 per lap, and big rewards from missions.</p>
    </div>`;
  }

  private multiplayer(): string {
    const n = this.host.netStatus();
    const url = new URL(window.location.href);
    const room = n.room || url.searchParams.get('room') || randomRoom();
    const serverSaved = localStorageGet('paintland.server') ?? defaultServer();
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
      ${n.status !== 'offline' ? `<div class="field"><label>${t('mp.invite')}</label><div class="invite-row"><input class="text-input" readonly value="${escapeHtml(inviteLink(n.room))}" data-id="invite"><button class="btn" data-action="copy-invite">${t('mp.copy')}</button></div></div>` : ''}
      ${n.players.length ? `<div class="field">${n.players
        .map((name) => {
          const blocked = this.host.options().blocked.includes(name);
          const muted = this.host.voiceMuted(name);
          const voiceBtn = this.host.options().voice && !blocked ? `<button class="btn small" data-action="voice-mute" data-name="${escapeHtml(name)}" aria-pressed="${muted}">${muted ? `🔈 ${t('voice.unmute')}` : `🔇 ${t('voice.mute')}`}</button>` : '';
          const reportBtn = `<button class="btn small" data-action="report-open" data-name="${escapeHtml(name)}">⚑ ${t('rp.report')}</button>`;
          const form =
            this.reportFor === name
              ? `<form class="report-form" data-form="report" data-name="${escapeHtml(name)}">
                <label>${t('rp.why')}<select name="reason">${(['chat', 'name', 'cheating', 'bullying', 'other'] as const).map((r) => `<option value="${r}">${t(`rp.r.${r}` as StringKey)}</option>`).join('')}</select></label>
                <label>${t('rp.note')}<input class="text-input" name="note" maxlength="300"></label>
                <label class="check"><input type="checkbox" name="block" checked> ${t('rp.block')}</label>
                <div class="row"><button class="btn primary small" type="submit">${t('rp.send')}</button><button class="btn small" type="button" data-action="report-cancel">${t('rp.cancel')}</button></div>
              </form>`
              : '';
          return `<div class="player-row"><span>${blocked ? '🚫 ' : '🎨 '}${escapeHtml(name)}</span>${voiceBtn}${reportBtn}<button class="btn small" data-action="block" data-name="${escapeHtml(name)}">${blocked ? t('mp.unblock') : t('mp.block')}</button></div>${form}`;
        })
        .join('')}</div>` : ''}
      ${this.togetherSection()}
      ${isLocked(this.host.options().family) ? `<p class="fam-status" role="status">🔒 ${t('fam.mpNote')}</p>` : ''}
      ${this.choice('o.chat', t('set.chat'), [['filtered', t('set.chatFiltered')], ['on', t('set.chatOn')], ['off', t('set.chatOff')]])}
      ${this.toggle('o.voice', t('voice.setting'))}
      <p class="menu-hint">${t('voice.privacy')}</p>
      ${this.host.options().voice ? this.slider('o.voiceVolume', t('voice.volume'), 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`) : ''}
      <p class="menu-hint">Online play needs the relay running: <code>npm run server</code>. In game, press <kbd>Enter</kbd> to chat and <kbd>G</kbd> to wave.</p>
    </div>`;
  }

  private settingsScreen(): string {
    const tabs: [SettingsTab, string][] = [['graphics', t('set.graphics')], ['look', t('set.look')], ['controls', t('set.controls')], ['driving', t('set.driving')], ['audio', t('set.audio')], ['access', t('set.access')], ['family', `👪 ${t('fam.tab')}`]];
    const body = {
      graphics: () => this.graphicsTab(),
      look: () => this.lookTab(),
      controls: () => this.controlsTab(),
      driving: () => this.drivingTab(),
      audio: () => this.audioTab(),
      access: () => this.accessTab(),
      family: () => this.familyTab(),
    }[this.settingsTab]();
    return `<div class="menu-panel wide">${this.header(t('title.settings'))}
      <div class="tabs">${tabs.map(([id, label]) => `<button class="tab ${this.settingsTab === id ? 'on' : ''}" data-stab="${id}">${label}</button>`).join('')}</div>
      <div class="settings-body">${body}</div>
    </div>`;
  }

  // Small builders. `k` is "s.key" (studio/graphics) or "o.key" (options).
  private val(k: string): unknown {
    const [scope, key] = k.split('.');
    const obj = (scope === 's' ? this.host.studio() : this.host.options()) as unknown as Record<string, unknown>;
    return obj[key];
  }

  private slider(k: string, label: string, min: number, max: number, step: number, fmtFn: (v: number) => string = (v) => String(v)): string {
    const v = Number(this.val(k));
    this.formatters.set(k, fmtFn);
    return `<div class="field"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-opt="${k}"><output>${fmtFn(v)}</output></div>`;
  }

  private toggle(k: string, label: string): string {
    return `<label class="check"><input type="checkbox" ${this.val(k) ? 'checked' : ''} data-opt="${k}"> ${label}</label>`;
  }

  private choice(k: string, label: string, options: [string | number, string][]): string {
    const v = this.val(k);
    return `<div class="field"><label>${label}</label><div class="seg">${options.map(([ov, ol]) => `<button class="seg-btn ${String(v) === String(ov) ? 'on' : ''}" data-set="${k}" data-value="${ov}" data-num="${typeof ov === 'number' ? 1 : 0}">${ol}</button>`).join('')}</div></div>`;
  }

  private graphicsTab(): string {
    const s = this.host.studio();
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    const levels: [QualityLevel, string, string][] = [['low', t('q.low'), 'Laptops & phones'], ['medium', t('q.medium'), 'Balanced'], ['high', t('q.high'), 'Recommended'], ['ultra', t('q.ultra'), 'Strong GPUs']];
    return `
      <div class="quality-row">${levels.map(([id, name, sub]) => `<button class="quality ${s.quality === id ? 'on' : ''}" data-quality="${id}"><b>${name}</b><small>${sub}</small></button>`).join('')}
        <div class="quality custom ${s.quality === 'custom' ? 'on' : ''}"><b>${t('q.custom')}</b><small>your mix</small></div></div>
      <div class="grid2">
        <div>
          <h4>Resolution</h4>
          ${this.slider('s.renderScale', 'Render scale', 0.5, 1, 0.05, pct)}
          ${this.toggle('s.autoResolution', 'Auto-balance to hold 60 fps')}
          <p class="menu-hint">${t('bench.adaptive')}</p>
          <button class="btn" data-action="benchmark">⏱ ${t('bench.run')}</button>
          ${this.benchResult ? `<div class="bench-result" role="status">${t('bench.result', { avg: this.benchResult.avgFps, low: this.benchResult.lowFps })}<br><b>${t('bench.recommend', { level: t(`q.${this.benchResult.recommend}` as StringKey) })}</b> <button class="btn small primary" data-quality="${this.benchResult.recommend}">${t('bench.apply')}</button></div>` : ''}
          ${this.choice('s.maxPixelRatio', 'Sharpness on high-DPI screens', [[1, '1×'], [1.5, '1.5×'], [2, '2×']])}
          ${this.toggle('s.fxaa', 'Anti-aliasing (FXAA)')}
          ${this.choice('s.fpsCap', 'Frame rate limit', [[0, 'Off'], [30, '30'], [60, '60'], [120, '120']])}
          <h4>Distance</h4>
          ${this.slider('s.drawDistance', 'Draw distance', 1500, 6000, 100, (v) => `${(v / 1000).toFixed(1)} km`)}
        </div>
        <div>
          <h4>Lighting</h4>
          ${this.choice('s.shadowQuality', 'Shadows', [[0, 'Off'], [1, 'Low'], [2, 'High'], [3, 'Ultra']])}
          ${this.slider('s.shadowDistance', 'Shadow distance', 40, 160, 5, (v) => `${v} m`)}
          ${this.toggle('s.softShadows', 'Soft shadow edges')}
          ${this.choice('s.aoQuality', 'Ambient occlusion', [[0, 'Off'], [1, 'On'], [2, 'High']])}
          ${this.choice('s.bloomQuality', 'Glow / bloom', [[0, 'Off'], [1, 'On'], [2, 'Wide']])}
          ${this.toggle('s.shafts', 'Sun shafts (god rays)')}
          ${this.toggle('s.hdr', 'HDR lighting (needs float render targets)')}
        </div>
      </div>
      <div class="perf-line" data-id="stats">${this.host.stats()}</div>`;
  }

  private lookTab(): string {
    const s = this.host.studio();
    const styles: [ArtStyle, string, string][] = [['watercolour', t('art.watercolour'), 'Ink, washes and paper — the sketchbook'], ['illustrated', t('art.illustrated'), 'Soft ink over lit colour'], ['realistic', t('art.realistic'), 'Filmic light, reflections, fog, depth of field']];
    const f2 = (v: number): string => v.toFixed(2);
    return `
      <div class="quality-row">${styles.map(([id, name, sub]) => `<button class="quality art-${id} ${s.artStyle === id ? 'on' : ''}" data-art="${id}"><b>${name}</b><small>${sub}</small></button>`).join('')}</div>
      <div class="grid2">
        <div>
          ${this.slider('s.realism', 'Realism (blend painted ↔ real)', 0, 1, 0.01, f2)}
          ${this.slider('s.exposure', 'Exposure', 0.5, 2, 0.01, f2)}
          ${this.slider('s.contrast', 'Contrast', 0.7, 1.4, 0.01, f2)}
          ${this.slider('s.saturation', 'Saturation', 0, 1.5, 0.01, f2)}
          ${this.slider('s.warmth', 'Warmth', -1, 1, 0.01, f2)}
          ${this.slider('s.vignette', 'Vignette', 0, 1, 0.01, f2)}
        </div>
        <div>
          ${this.slider('s.inkStrength', 'Ink outlines', 0, 1, 0.01, f2)}
          ${this.slider('s.aoStrength', 'Ambient occlusion strength', 0, 1.5, 0.01, f2)}
          ${this.slider('s.sunShafts', 'Sun shafts strength', 0, 1.5, 0.01, f2)}
          ${this.slider('s.glow', 'Glow strength', 0, 2, 0.01, f2)}
          ${this.slider('s.cinematicDof', 'Cinematic depth of field', 0, 1, 0.01, f2)}
          ${this.slider('s.fov', 'Field of view', 55, 110, 1, (v) => `${v}°`)}
          <div class="field"><label>Watercolour vibe</label><select data-vibe>${Object.keys(VIBES).map((v) => `<option ${s.vibe === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="row wrap"><button class="btn" data-action="studio">Open the Studio (every art slider)</button></div>`;
  }

  private controlsTab(): string {
    const input = this.host.input();
    const groups = [...new Set(ACTION_INFO.map((a) => a.group))];
    const rows = groups.map((g) => `<h4>${actionGroupLabel(g)}</h4>${ACTION_INFO.filter((a) => a.group === g).map((a) => {
      const keys = input.bindings[a.action];
      const listening = this.listening === a.action;
      return `<div class="bind-row"><span>${actionLabel(a.action)}</span><span class="keys">${keys.map((k) => `<kbd>${escapeHtml(keyLabel(k))}</kbd>`).join(' ') || '<i>none</i>'}</span><button class="btn small ${listening ? 'listening' : ''}" data-bind="${a.action}">${listening ? 'Press a key… (Esc cancels)' : 'Change'}</button></div>`;
    }).join('')}`).join('');
    return `
      <div class="grid2">
        <div class="bind-list">${rows}<div class="row"><button class="btn" data-action="reset-binds">Reset keys to defaults</button></div></div>
        <div>
          <h4>Mouse</h4>
          ${this.slider('o.mouseSensitivity', 'Look sensitivity', 0.2, 3, 0.05, (v) => `${v.toFixed(2)}×`)}
          ${this.toggle('o.invertY', 'Invert vertical look')}
          <h4>Gamepad</h4>
          ${this.slider('o.padLookSensitivity', 'Stick look sensitivity', 0.2, 3, 0.05, (v) => `${v.toFixed(2)}×`)}
          ${this.slider('o.padDeadzone', 'Stick deadzone', 0.02, 0.4, 0.01, (v) => v.toFixed(2))}
          ${this.toggle('o.vibration', 'Vibration')}
          <p class="menu-hint">Pad: RT throttle · LT brake · A hop · X boost · B drift · Y get in/out · Start pause · Back photo mode.</p>
        </div>
      </div>`;
  }

  private drivingTab(): string {
    return `
      <div class="grid2">
        <div>
          ${this.choice('o.handling', 'Handling model', [['arcade', 'Arcade'], ['realistic', 'Realistic']])}
          <p class="menu-hint">Realistic: a 6-speed gearbox with engine rpm, air drag and engine braking, less steering at speed, and tyres that slide past their grip.</p>
          ${this.choice('o.gearbox', 'Gearbox (realistic)', [['auto', 'Automatic'], ['manual', 'Manual']])}
          <p class="menu-hint">Manual: <kbd>. period</kbd> gear up, <kbd>, comma</kbd> gear down (rebind in Controls).</p>
          ${this.toggle('o.autoCruise', 'Auto-cruise (keeps rolling on flat road)')}
          ${this.choice('o.units', 'Speed units', [['kmh', 'km/h'], ['mph', 'mph']])}
        </div>
        <div>
          ${this.slider('o.steerSensitivity', 'Steering sensitivity', 0.4, 1.6, 0.05, (v) => `${v.toFixed(2)}×`)}
          ${this.slider('o.steerSmoothing', 'Steering smoothing', 0, 1, 0.05, (v) => v.toFixed(2))}
          ${this.slider('o.steerAssist', 'Lane assist (centres when you let go)', 0, 1, 0.05, (v) => v.toFixed(2))}
          ${this.slider('s.cameraRoll', 'Camera roll in loops', 0, 1, 0.05, (v) => v.toFixed(2))}
          ${this.slider('s.cameraShake', 'Camera shake', 0, 1, 0.05, (v) => v.toFixed(2))}
          ${this.toggle('o.showGhost', 'Show my best-lap ghost')}
        </div>
      </div>`;
  }

  private audioTab(): string {
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    return `
      ${this.slider('s.musicVolume', 'Radio', 0, 1, 0.01, pct)}
      ${this.slider('s.musicBox', 'Music-box notes', 0, 1, 0.01, pct)}
      ${this.slider('s.engineHum', 'Engine', 0, 1, 0.01, pct)}
      ${this.slider('s.wind', 'Wind and weather', 0, 1, 0.01, pct)}
      ${this.slider('s.ambience', 'Nature and city ambience (birds, sea, crickets, traffic)', 0, 1, 0.01, pct)}`;
  }

  private accessTab(): string {
    return `
      <div class="field"><label>${t('menu.language')}</label><div class="lang-row">${this.langButtons()}</div></div>
      <div class="grid2">
        <div>
          ${this.toggle('s.reducedMotion', 'Reduced motion (no line boil, speed lines or camera roll)')}
          ${this.toggle('o.calmLighting', 'Calm lighting (slow time-of-day blends)')}
          ${this.slider('o.hudScale', 'HUD size', 0.7, 1.4, 0.05, (v) => `${Math.round(v * 100)}%`)}
          ${this.choice('o.colourBlind', 'Colour-vision assist', [['none', 'Off'], ['protan', 'Protan'], ['deutan', 'Deutan'], ['tritan', 'Tritan']])}
        </div>
        <div>
          ${this.toggle('o.autoWeather', 'Weather changes by itself')}
          ${this.toggle('o.minimap', 'Minimap in free roam')}
          ${this.toggle('o.analytics', t('set.analytics'))}
          ${this.choice('o.chat', t('set.chat'), [['filtered', t('set.chatFiltered')], ['on', t('set.chatOn')], ['off', t('set.chatOff')]])}
          ${this.slider('o.dayMinutes', 'Length of an auto day', 4, 40, 1, (v) => `${v} min`)}
          ${this.choice('o.season', t('set.season'), [['auto', t('set.auto')], ['off', t('set.off')], ['spring', t('season.spring')], ['summer', t('season.summer')], ['autumn', t('season.autumn')], ['winter', t('season.winter')]])}
          ${this.choice('o.festival', t('set.festival'), [['auto', t('set.auto')], ['off', t('set.off')], ['vesak', t('fest.vesak')], ['avurudu', t('fest.avurudu')], ['diwali', t('fest.diwali')]])}
          <div class="row wrap"><button class="btn" data-action="controls">Controls card</button></div>
        </div>
      </div>`;
  }

  /** Write a settings value from a control, mark graphics as Custom when a tier key moves. */
  /** Settings → Family: parental controls behind a PIN. */
  private familyTab(): string {
    const f = this.host.options().family;
    const locked = isLocked(f);
    const editable = !locked || this.familyUnlocked;
    const row = (key: 'online' | 'chat' | 'voice', label: string): string =>
      `<div class="field"><label>${label}</label><div class="seg">${[true, false]
        .map((v) => `<button class="seg-btn ${f[key] === v ? 'on' : ''}" data-action="fam-set" data-key="${key}" data-value="${v}" ${editable ? '' : 'disabled'}>${v ? t('fam.allowed') : t('fam.notAllowed')}</button>`)
        .join('')}</div></div>`;
    const allowances = `${row('online', t('fam.online'))}${row('chat', t('fam.chat'))}${row('voice', t('fam.voice'))}`;
    const pinForm = (form: string, button: string, twice: boolean): string => `<form class="report-form" data-form="${form}">
        <label>${t('fam.pin')}<input class="text-input" type="password" inputmode="numeric" autocomplete="off" name="pin" pattern="\\d{4,8}" minlength="4" maxlength="8" required></label>
        ${twice ? `<label>${t('fam.pinAgain')}<input class="text-input" type="password" inputmode="numeric" autocomplete="off" name="again" pattern="\\d{4,8}" minlength="4" maxlength="8" required></label>` : ''}
        <div class="row"><button class="btn primary small" type="submit">${button}</button></div>
      </form>`;
    if (!locked)
      return `<p>${t('fam.intro')}</p>${allowances}<h4>${t('fam.setPin')}</h4>${pinForm('fam-new', t('fam.lock'), true)}`;
    if (!this.familyUnlocked)
      return `<p class="fam-status" role="status">🔒 ${t('fam.lockedNote')}</p>${allowances}<h4>${t('fam.unlock')}</h4>${pinForm('fam-unlock', t('fam.unlock'), false)}
        <details><summary>${t('fam.forgot')}</summary><p class="menu-hint">${t('fam.forgotHelp')}</p><button class="btn small" data-action="fam-reset">${t('fam.reset')}</button></details>`;
    return `<p class="fam-status" role="status">🔓 ${t('fam.unlockedNote')}</p>${allowances}
      <div class="row wrap"><button class="btn primary" data-action="fam-relock">🔒 ${t('fam.relock')}</button><button class="btn" data-action="fam-remove">${t('fam.remove')}</button></div>
      <h4>${t('fam.change')}</h4>${pinForm('fam-new', t('fam.change'), true)}`;
  }

  private writeOpt(k: string, value: unknown): void {
    const [scope, key] = k.split('.');
    const obj = (scope === 's' ? this.host.studio() : this.host.options()) as unknown as Record<string, unknown>;
    obj[key] = value;
    if (scope === 's' && (QUALITY_KEYS as readonly string[]).includes(key)) this.host.studio().quality = 'custom';
    if (scope === 's' && key === 'realism') this.host.studio().artStyle = value === 0 ? 'watercolour' : value === 1 ? 'realistic' : 'illustrated';
    this.host.settingsChanged();
  }

  private trialsScreen(): string {
    const handling = this.host.handling();
    const p = this.host.profile.data;
    const cards = this.host.chapters.map((ch) => {
      const best = p.trialBest[`${ch.id}:${handling}`];
      return `<div class="card chapter-card chapter-${ch.id}">
        <div class="kicker">${ch.kicker}</div><div class="hand chapter-name">${ch.name}</div>
        <div class="chapter-stats">${t('trial.best', { handling })}: ${best !== undefined ? `${best.toFixed(2)} s` : '—'}</div>
        <ol class="board" data-board="${ch.id}"><li class="muted">Loading the leaderboard…</li></ol>
        <button class="btn primary" data-trial="${ch.id}">${t('trial.start')}</button>
      </div>`;
    }).join('');
    // Fill the boards when the server answers.
    for (const ch of this.host.chapters) {
      void fetchBoard(ch.id, handling).then((res) => {
        const el = this.root.querySelector(`[data-board="${ch.id}"]`);
        if (!el) return;
        if (!res) el.innerHTML = '<li class="muted">Leaderboard server offline — run <code>npm run server</code> or set a server in Multiplayer.</li>';
        else if (!res.enabled) el.innerHTML = '<li class="muted">This server has no run verifier (npm run build:server).</li>';
        else if (!res.entries.length) el.innerHTML = '<li class="muted">No verified times yet — be the first!</li>';
        else el.innerHTML = res.entries.map((e) => `<li><b>${escapeHtml(e.name)}</b> <span>${e.time.toFixed(2)} s</span> <small>${escapeHtml(e.vehicle)}</small></li>`).join('');
      });
    }
    return `<div class="menu-panel wide">${this.header(t('title.trials'))}
      <p class="menu-hint">One lap from a standing start: no traffic, no tonics. Your inputs are recorded and the server replays them through the same physics — a time only counts if the replay matches. Handling: <b>${handling}</b> (change it in Settings → Driving; each handling model has its own board).</p>
      <div class="chapter-grid">${cards}</div>
    </div>`;
  }

  /** Language picker: a dropdown (24 languages), each named in its own script. */
  private langButtons(): string {
    return `<label class="lang-pick">🌐 <select data-langselect aria-label="Language">${LANGS.map((l) => `<option value="${l.id}" ${lang() === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label>`;
  }

  private raceScreen(): string {
    const n = this.host.netStatus();
    const online = n.status !== 'offline';
    const cards = this.host.chapters.map((ch) => `<div class="card chapter-card chapter-${ch.id}">
        <div class="kicker">${ch.kicker}</div><div class="hand chapter-name">${ch.name}</div>
        <button class="btn primary" data-race="${ch.id}" ${online ? '' : 'disabled'}>${t('race.start')}</button>
      </div>`).join('');
    return `<div class="menu-panel wide">${this.header(t('race.title'))}
      <p class="menu-hint">${t('race.intro')}</p>
      <p><b>${online ? t('race.players', { n: n.players.length + 1 }) : t('race.needRoom')}</b> ${online ? `· ${escapeHtml(n.status)}` : '<button class="btn" data-nav="multiplayer">' + t('menu.multiplayer') + '</button>'}</p>
      <div class="chapter-grid">${cards}</div>
    </div>`;
  }

  private trophiesScreen(): string {
    const p = this.host.profile;
    const st = p.data.stats;
    const km = ((st.distance ?? 0) / 1000).toFixed(1);
    const cards = TROPHIES.map((t) => {
      const [a, b] = t.progress(p);
      const done = p.data.trophies.includes(t.id);
      return `<div class="card trophy ${done ? 'done' : ''}"><div class="trophy-icon">${t.icon}</div><div><div class="hand">${t.name}</div><small>${t.text}</small>
        <div class="bar"><i style="width:${Math.round((Math.min(a, b) / b) * 100)}%"></i></div><small>${done ? `Unlocked · +${t.reward} ink` : `${Math.floor(a)} / ${b} · ${t.reward} ink`}</small></div></div>`;
    }).join('');
    return `<div class="menu-panel wide">${this.header(t('title.trophies', { n: p.data.trophies.length, total: TROPHIES.length }))}
      <div class="stat-line">🛣 ${km} km · 🏁 ${st.laps ?? 0} laps · ♪ ${st.notes ?? 0} notes · 🪁 best air ${(st.maxAir ?? 0).toFixed(1)} s · 💨 top ${Math.round(st.maxSpeed ?? 0)} km/h · 🙃 ${Math.round(st.upsideDown ?? 0)} s upside down · 📷 ${st.photos ?? 0} photos</div>
      <div class="trophy-grid">${cards}</div>
    </div>`;
  }

  private credits(): string {
    return `<div class="menu-panel">${this.header('Credits')}
      <p><b>Inkroads</b> — a watercolour road game made with Three.js.</p>
      <p>Everything you see is painted in code: every house, tree, landmark, vehicle and person is built procedurally, then inked and washed by the renderer. Every song is generated live in the district’s key.</p>
      <p>Places visited: Colombo’s Lotus Tower and Galle Face Green, Sigiriya, Ella and the Nine Arch Bridge, Mirissa; the Great Wall, the Colosseum, the Taj Mahal, Machu Picchu, Christ the Redeemer, Chichen Itza and Petra — all as loving sketches, not replicas.</p>
    </div>`;
  }

  // ————— events —————

  /** Set, change or check the family PIN. */
  private async familyPin(form: HTMLFormElement): Promise<void> {
    const f = this.host.options().family;
    const data = new FormData(form);
    const pin = String(data.get('pin') ?? '');
    if (form.dataset.form === 'fam-unlock') {
      const wait = this.pinGuard.wait();
      if (wait > 0) return this.toast(t('fam.wait', { s: wait }));
      const ok = await checkPin(pin, f.pin);
      this.pinGuard.record(ok);
      if (!ok) return this.toast(t('fam.wrong'));
      this.familyUnlocked = true;
      this.render();
      return;
    }
    if (isLocked(f) && !this.familyUnlocked) return;
    if (!PIN_PATTERN.test(pin)) return this.toast(t('fam.pinRule'));
    if (pin !== String(data.get('again') ?? '')) return this.toast(t('fam.mismatch'));
    f.pin = await hashPin(pin);
    this.familyUnlocked = false;
    this.host.settingsChanged();
    this.render();
    this.toast(t('fam.lockedToast'));
  }

  private onSubmit(e: SubmitEvent): void {
    const form = e.target as HTMLFormElement;
    if (this.accountScreen.onSubmit(form) || this.galleryScreen.onSubmit(form) || this.passScreen.onSubmit(form)) {
      e.preventDefault();
      return;
    }
    if (form.dataset.form === 'fam-new' || form.dataset.form === 'fam-unlock') {
      e.preventDefault();
      void this.familyPin(form);
      return;
    }
    if (form.dataset.form !== 'report') return;
    e.preventDefault();
    const f = new FormData(form);
    const name = form.dataset.name ?? '';
    this.reportFor = null;
    void this.host.reportPlayer(name, String(f.get('reason') ?? 'other'), String(f.get('note') ?? ''), f.get('block') === 'on').then((ok) => {
      this.render();
      this.toast(ok ? t('rp.sent') : t('rp.failed'));
    });
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button, [data-nav], [data-action="logo-tap"]');
    if (!el) return;
    this.host.uiSound();
    const d = el.dataset;
    const p = this.host.profile;
    if (d.acct && this.accountScreen.onClick(el)) return;
    if (this.galleryScreen.onClick(el)) return;
    if (this.passScreen.onClick(el)) return;
    if (d.featured) {
      const r = buyFeatured(p, d.featured);
      this.toast(r === 'ok' ? `✓ ${itemLabel(d.featured)}` : r === 'poor' ? t('shop.poor') : '');
      this.render();
      return;
    }
    if (d.together) {
      const msg = this.host.together(d.together as 'convoy' | 'drift' | 'stunt' | 'paint');
      if (msg) this.toast(msg);
      // Back to the game so the event can start.
      if (this.host.togetherState().roam) this.host.resume();
      else this.render();
      return;
    }
    if (d.stickerClaim) {
      const pg = stickerPages(p.data, this.host.stickerAreas(), {}, { secret: '', mural: '' }).find((x) => x.id === d.stickerClaim);
      if (pg && pageDone(pg) && p.markSeen(`stickers:${pg.id}`)) {
        p.earn(PAGE_REWARD);
        this.toast(t('st.reward', { ink: PAGE_REWARD }));
      }
      this.render();
      return;
    }
    if (d.nav) {
      if (d.nav === 'enter') {
        this.host.unlockAudio();
        this.show('main');
      } else if (d.nav === 'intro') this.host.watchIntro();
      else if (d.nav === 'hub') this.host.enterHub();
      else if (d.nav === 'city') this.host.enterCity();
      else if (d.nav === 'village') this.host.enterVillage();
      else if (d.nav === 'resume') this.host.resume();
      else this.show(d.nav as MenuScreen);
      return;
    }
    if (d.citymission) {
      if (d.citymission === 'cancel') {
        this.host.cancelCityMission();
        this.show('citymissions');
      } else this.host.startCityMission(d.citymission);
      return;
    }
    if (d.race) {
      this.host.startRace(d.race);
      return;
    }
    if (d.trial) {
      this.host.startTrial(d.trial);
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
    if (d.stab) {
      this.settingsTab = d.stab as SettingsTab;
      this.cancelListening();
      this.render();
      return;
    }
    if (d.set) {
      this.writeOpt(d.set, d.num === '1' ? Number(d.value) : d.value);
      this.render();
      return;
    }
    if (d.quality) {
      applyQuality(this.host.studio(), d.quality as QualityLevel);
      this.host.settingsChanged();
      this.render();
      this.toast(`Graphics: ${d.quality}`);
      return;
    }
    if (d.art) {
      applyArtStyle(this.host.studio(), d.art as ArtStyle);
      this.host.settingsChanged();
      this.render();
      return;
    }
    if (d.bind) {
      const action = d.bind as ActionName;
      this.listening = action;
      this.render();
      this.host.input().captureNextKey((code) => {
        this.listening = null;
        if (code !== 'Escape') {
          this.host.input().bindPrimary(action, code);
          this.toast(`${keyLabel(code)} → ${actionLabel(action)}`);
        }
        this.render();
      });
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
      if (!p.owns(item.id) && item.loot) {
        this.toast('🎁 Found only in loot chests — explore Serendib City');
        return;
      }
      if (!p.owns(item.id)) {
        const r = p.buy(item);
        this.toast(r === 'ok' ? `Bought ${itemLabel(item)}!` : r === 'poor' ? `Need ${item.price} ink` : '');
        if (r !== 'ok') return;
      }
      if (VEHICLE_FIELDS.includes(d.field)) {
        const value = d.field === 'glow' && item.value === 'none' ? null : item.value;
        p.setVehicleLook(p.data.vehicle, { [d.field]: value } as never);
        this.host.vehicleChanged();
        if (d.field === 'horn') this.host.previewHorn?.();
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
        this.toast(r === 'ok' ? `The ${itemLabel(item)} is yours!` : `Need ${item.price} ink`);
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
      this.toast(r === 'ok' ? `Bought ${itemLabel(item)}` : r === 'poor' ? `Need ${item.price} ink` : r === 'full' ? 'You can carry 3' : 'Already owned');
      if (r === 'ok' && item.category !== 'tonic') this.host.lookChanged();
      this.render();
      return;
    }
    switch (d.action) {
      case 'benchmark':
        this.show('none');
        this.host.runBenchmark((r) => {
          this.benchResult = r;
          this.settingsTab = 'graphics';
          this.render();
        });
        break;
      case 'outfit-save': {
        const name = this.root.querySelector<HTMLInputElement>('[data-id="outfit-name"]')?.value ?? '';
        const r = p.saveOutfit(name);
        this.toast(r === 'ok' ? t('wr.saved') : t('wr.full', { n: MAX_OUTFITS }));
        this.render();
        return;
      }
      case 'outfit-wear':
      case 'preset-wear': {
        const look = d.action === 'outfit-wear' ? p.data.outfits?.[Number(d.index)]?.look : LANKA_PRESETS.find((x) => x.id === d.preset)?.look;
        if (!look) return;
        const missing = p.wearOutfit(look);
        this.host.lookChanged();
        if (missing) this.toast(t('wr.missing', { n: missing }));
        this.render();
        return;
      }
      case 'outfit-delete':
        p.deleteOutfit(Number(d.index));
        this.render();
        return;
      case 'random-look': {
        const look = randomLook(Math.random);
        // Only keep owned styles.
        const keep = (cat: ShopItem['category'], v: string | undefined, fallback: string): string => (p.owns(`${cat}:${v}`) ? v! : fallback);
        const next: HumanLook = {
          ...look,
          pet: p.data.look.pet,
          hairStyle: keep('hair', look.hairStyle, 'bob') as HumanLook['hairStyle'],
          topStyle: keep('top', look.topStyle, 'tee') as HumanLook['topStyle'],
          bottomStyle: keep('bottom', look.bottomStyle, 'trousers') as HumanLook['bottomStyle'],
          hat: keep('hat', look.hat, 'none') as HumanLook['hat'],
          glasses: keep('glasses', look.glasses, 'none') as HumanLook['glasses'],
          back: keep('back', look.back, 'none') as HumanLook['back'],
          eyes: keep('eyes', look.eyes, 'dots') as HumanLook['eyes'],
          mouth: keep('mouth', look.mouth, 'smile') as HumanLook['mouth'],
          face: keep('facial', look.face, 'none') as HumanLook['face'],
          acc: keep('acc', look.acc, 'none') as HumanLook['acc'],
        };
        p.data.look = next;
        p.save();
        this.host.lookChanged();
        this.render();
        break;
      }
      case 'logo-tap': {
        // Touch screens have no keyboard: five quick taps on the logo ask for the secret word.
        const now = Date.now();
        this.logoTaps = [...this.logoTaps.filter((x) => now - x < 2500), now];
        if (this.logoTaps.length >= 5) {
          this.logoTaps = [];
          const word = prompt('…');
          if (word && word.trim().toLowerCase() === SECRET) this.host.openAdmin();
        }
        break;
      }
      case 'join-online':
      case 'join-tabs': {
        const room = ($<HTMLInputElement>(this.root, '[data-id="room"]').value || randomRoom()).replace(/[^a-zA-Z0-9_-]/g, '');
        const server = d.action === 'join-online' ? $<HTMLInputElement>(this.root, '[data-id="server"]').value.trim() : null;
        if (server) localStorageSet('paintland.server', server);
        if (!this.host.netConnect(room, server)) {
          this.toast(t('fam.blocked'));
          break;
        }
        setTimeout(() => this.render(), 400);
        break;
      }
      case 'fam-set': {
        const f = this.host.options().family;
        if (isLocked(f) && !this.familyUnlocked) break;
        f[d.key as 'online' | 'chat' | 'voice'] = d.value === 'true';
        this.host.settingsChanged();
        this.render();
        break;
      }
      case 'fam-relock':
        this.familyUnlocked = false;
        this.host.settingsChanged();
        this.render();
        this.toast(t('fam.lockedToast'));
        break;
      case 'fam-remove':
        if (!this.familyUnlocked) break;
        this.host.options().family.pin = null;
        this.familyUnlocked = false;
        this.host.settingsChanged();
        this.render();
        break;
      case 'fam-reset':
        if (!window.confirm(t('fam.resetConfirm'))) break;
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith('paintland.')) localStorage.removeItem(k);
        } catch {
          /* storage blocked */
        }
        window.location.reload();
        break;
      case 'report-open':
        this.reportFor = d.name ?? null;
        this.render();
        break;
      case 'report-cancel':
        this.reportFor = null;
        this.render();
        break;
      case 'voice-mute':
        this.host.toggleVoiceMute(d.name ?? '');
        this.render();
        break;
      case 'block': {
        const o = this.host.options();
        const name = d.name ?? '';
        o.blocked = o.blocked.includes(name) ? o.blocked.filter((b) => b !== name) : [...o.blocked, name];
        this.host.settingsChanged();
        this.render();
        break;
      }
      case 'leave':
        this.host.netDisconnect();
        this.render();
        break;
      case 'copy-invite': {
        const input = $<HTMLInputElement>(this.root, '[data-id="invite"]');
        void navigator.clipboard?.writeText(input.value);
        this.toast(t('mp.copied'));
        break;
      }
      case 'studio':
        this.host.openStudio();
        break;
      case 'controls':
        this.host.openControls();
        break;
      case 'reset-binds':
        this.host.input().resetBindings();
        this.toast('Keys reset');
        this.render();
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
    if (el.dataset.opt && (e.type === 'input' || el.type === 'checkbox')) {
      if (el.type === 'checkbox' && e.type === 'input') return; // handled on change
      this.writeOpt(el.dataset.opt, el.type === 'checkbox' ? el.checked : Number(el.value));
      const out = el.nextElementSibling;
      if (out?.tagName === 'OUTPUT') out.textContent = (this.formatters.get(el.dataset.opt) ?? String)(Number(el.value));
      const q = this.root.querySelector('.quality.custom');
      if (q && this.host.studio().quality === 'custom') {
        this.root.querySelectorAll('.quality').forEach((b) => b.classList.remove('on'));
        q.classList.add('on');
      }
    }
    if (el.dataset.langselect !== undefined && e.type === 'change') {
      void setLang((el as unknown as HTMLSelectElement).value as Lang);
      return;
    }
    if (el.dataset.vibe !== undefined && e.type === 'change') {
      applyVibe(this.host.studio(), (el as unknown as HTMLSelectElement).value);
      this.host.settingsChanged();
    }
  }

  private cancelListening(): void {
    if (this.listening) this.host.input().captureNextKey(null);
    this.listening = null;
  }
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

/** Local calendar day, for daily brushstrokes. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** A selector for the focused control inside `root` (from its data attributes), to refocus it after a redraw. */
function focusSignature(root: HTMLElement): string | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || !root.contains(el)) return null;
  const attrs = Object.entries(el.dataset)
    .map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${CSS.escape(v ?? '')}"]`)
    .join('');
  if (attrs) return `${el.tagName.toLowerCase()}${attrs}`;
  const name = el.getAttribute('name');
  return name ? `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]` : null;
}
