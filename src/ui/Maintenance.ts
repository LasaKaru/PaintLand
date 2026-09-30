import { brand, loadBrand, onBrandChange, serverNow, COMPANY_LOGO, type MaintenanceInfo } from '../brand/Brand';
import { apiUrl } from '../net/Api';
import { lang, t } from '../core/i18n';
import { isSecret, typedSecret } from './Menu';

/** Where the game stands: open, closing soon (a warning), or closed. */
export type MaintState = 'open' | 'soon' | 'closed';

/** Players are warned this long before a planned close. */
export const SOON_MS = 15 * 60_000;
/** How often the game asks the server whether it's closed (ms). */
export const POLL_MS = 30_000;

/**
 * Open, closing soon or closed, on the server's clock. It opens again by itself
 * at `until`, even if the server can't be asked (the time was set in advance).
 */
export function maintState(m: MaintenanceInfo | undefined, now: number): MaintState {
  if (!m) return 'open';
  if (m.until && now >= m.until) return 'open';
  if (m.from && now < m.from) return m.from - now <= SOON_MS ? 'soon' : 'open';
  return 'closed';
}

/** A wait as days, hours, minutes and seconds (never negative). */
export function waitParts(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** "1 hr 5 min" in the player's language (the browser knows the unit words). */
export function formatWait(ms: number, locale: string, seconds = true): string {
  const p = waitParts(ms);
  const unit = (n: number, u: 'day' | 'hour' | 'minute' | 'second'): string => {
    try {
      return new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'short' }).format(n);
    } catch {
      return `${n} ${u[0]}`;
    }
  };
  const out: string[] = [];
  if (p.d) out.push(unit(p.d, 'day'));
  if (p.h || p.d) out.push(unit(p.h, 'hour'));
  if (!p.d) out.push(unit(p.m, 'minute'));
  if (seconds && !p.d && !p.h) out.push(unit(p.s, 'second'));
  return out.join(' ');
}

export interface MaintenanceHost {
  /** Open the admin login (the secret word still works while the game is closed). */
  openAdmin(): void;
  /** An admin is logged in: they can keep playing and testing. */
  isAdmin(): boolean;
  /** The game should stop (closed) or carry on. */
  setClosed(closed: boolean): void;
  /** A short warning in the HUD. */
  warn(text: string): void;
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The maintenance scene: a little car up on a jack while the road is repainted. */
function maintenanceArt(): string {
  return `<svg class="maint-art" viewBox="0 0 400 230" aria-hidden="true">
    <defs>
      <filter id="maint-wash" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
    </defs>
    <g filter="url(#maint-wash)">
      <ellipse class="maint-blob b1" cx="85" cy="62" rx="78" ry="44" fill="#9cc7d9"/>
      <ellipse class="maint-blob b2" cx="318" cy="54" rx="86" ry="40" fill="#f2c38b"/>
      <path d="M0 168 Q90 118 190 152 T400 138 V230 H0Z" fill="#a9c98f" opacity="0.75"/>
    </g>
    <path class="maint-road" d="M-10 200 C90 182 170 212 250 192 S370 180 420 196" stroke="#5b5048" stroke-width="24" fill="none" stroke-linecap="round" pathLength="100"/>
    <path class="maint-lines" d="M-10 200 C90 182 170 212 250 192 S370 180 420 196" stroke="#f6f0e4" stroke-width="2.5" fill="none" stroke-dasharray="6 7" pathLength="100"/>
    <g class="maint-brush"><rect x="-4" y="-34" width="8" height="30" rx="3" fill="#b5835a"/><rect x="-6" y="-8" width="12" height="7" fill="#c9c2b6"/><path d="M-6 -1 Q0 12 6 -1Z" fill="#5b5048"/></g>
    <g class="maint-car" transform="translate(200 168)">
      <rect x="-9" y="10" width="18" height="16" fill="#8a7f73"/><rect x="-18" y="24" width="36" height="5" rx="2" fill="#6d645a"/>
      <g class="maint-bob">
        <path d="M-44 6 Q-42 -8 -26 -10 L-16 -24 Q-10 -30 6 -30 L18 -30 Q28 -30 34 -20 L40 -10 Q48 -8 48 4 Z" fill="#d9644a"/>
        <path d="M-12 -12 L-6 -24 L6 -24 L6 -12Z M12 -12 L12 -24 L18 -24 Q24 -24 28 -18 L32 -12Z" fill="#dff0f6"/>
        <circle class="maint-wheel" cx="-24" cy="8" r="9" fill="#2b2622"/><circle cx="-24" cy="8" r="3" fill="#c9c2b6"/>
        <circle class="maint-wheel" cx="30" cy="8" r="9" fill="#2b2622"/><circle cx="30" cy="8" r="3" fill="#c9c2b6"/>
      </g>
    </g>
    <g transform="translate(152 70)"><g class="maint-gear"><circle r="17" fill="none" stroke="#5b5048" stroke-width="8" stroke-dasharray="5.4 3.5"/><circle r="12" fill="#f6f0e4" stroke="#5b5048" stroke-width="3"/><circle r="4" fill="#5b5048"/></g></g>
    <g transform="translate(180 50)"><g class="maint-gear rev"><circle r="11" fill="none" stroke="#d9644a" stroke-width="6" stroke-dasharray="4.3 3.1"/><circle r="7" fill="#f6f0e4" stroke="#d9644a" stroke-width="2.5"/></g></g>
    <g transform="translate(252 112)"><g class="maint-wrench"><path d="M0 0 L26 -26 M22 -34 a9 9 0 1 0 12 12 l-6 -1 l-5 -5 z" stroke="#5b5048" stroke-width="6" stroke-linecap="round" fill="#5b5048"/></g></g>
    <g class="maint-drips"><path d="M40 0 v14 a4 4 0 0 0 8 0 v-14z" fill="#9cc7d9"/><path d="M300 0 v22 a4 4 0 0 0 8 0 v-22z" fill="#f2c38b"/><path d="M360 0 v10 a3.5 3.5 0 0 0 7 0 v-10z" fill="#d9644a"/></g>
  </svg>`;
}

/** The development scene: a new road being sketched in pencil, then washed with colour. */
function developmentArt(): string {
  return `<svg class="maint-art dev" viewBox="0 0 400 230" aria-hidden="true">
    <defs>
      <filter id="maint-wash-dev" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="11"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
      <pattern id="maint-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" fill="none" stroke="#9cc7d9" stroke-width="0.6" opacity="0.6"/></pattern>
    </defs>
    <rect width="400" height="230" fill="url(#maint-grid)"/>
    <g class="maint-wash-in" filter="url(#maint-wash-dev)">
      <ellipse cx="300" cy="60" rx="90" ry="42" fill="#f2c38b"/>
      <path d="M0 170 Q70 100 150 140 Q230 180 300 120 Q350 90 400 110 V230 H0Z" fill="#a9c98f" opacity="0.75"/>
      <path d="M-10 214 C80 200 150 150 220 170 S340 214 420 190" stroke="#5b5048" stroke-width="20" fill="none" stroke-linecap="round"/>
    </g>
    <path class="maint-sketch s1" d="M0 170 Q70 100 150 140 Q230 180 300 120 Q350 90 400 110" pathLength="100" fill="none" stroke="#2b2622" stroke-width="2" stroke-linecap="round"/>
    <path class="maint-sketch s2" d="M-10 214 C80 200 150 150 220 170 S340 214 420 190" pathLength="100" fill="none" stroke="#2b2622" stroke-width="2" stroke-dasharray="3 0" stroke-linecap="round"/>
    <path class="maint-sketch s3" d="M300 120 l0 -40 l14 -10 l14 10 l0 40 M306 96 h16" pathLength="100" fill="none" stroke="#2b2622" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="maint-pencil"><path d="M0 0 L-6 -16 L-2 -60 L6 -60 L10 -16 Z" fill="#f2c38b" stroke="#2b2622" stroke-width="1.5" transform="rotate(35)"/><path d="M0 0 L-3 -8 L5 -8 Z" fill="#2b2622" transform="rotate(35)"/></g>
    <g class="maint-crane" transform="translate(70 30)">
      <path d="M0 132 V14 M12 132 V14 M0 132 L12 118 L0 104 L12 90 L0 76 L12 62 L0 48 L12 34 L0 20" stroke="#e8b83a" stroke-width="3" fill="none" stroke-linejoin="round"/>
      <rect x="-8" y="130" width="28" height="8" rx="2" fill="#8a7f73"/>
      <path d="M-34 14 H128 M-34 4 H128 M-26 14 L-18 4 L-10 14 L-2 4 M20 14 L28 4 L36 14 L44 4 L52 14 L60 4 L68 14 L76 4 L84 14 L92 4 L100 14 L108 4 L116 14 L124 4" stroke="#e8b83a" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <path d="M6 -10 L-30 4 M6 -10 L124 4 M6 -10 V4" stroke="#8a7f73" stroke-width="1.5" fill="none"/>
      <rect x="-40" y="14" width="18" height="14" rx="2" fill="#8a7f73"/>
      <rect x="-2" y="14" width="16" height="14" rx="2" fill="#d9644a"/><rect x="2" y="17" width="8" height="6" fill="#dff0f6"/>
      <g class="maint-hook">
        <rect x="88" y="12" width="12" height="5" fill="#5b5048"/>
        <path d="M94 17 V58" stroke="#5b5048" stroke-width="1.5"/>
        <path d="M94 58 q-5 4 0 8" stroke="#5b5048" stroke-width="2" fill="none"/>
        <path d="M94 62 L70 70 M94 62 L118 70" stroke="#5b5048" stroke-width="1.2"/>
        <rect x="66" y="70" width="56" height="12" rx="2" fill="#5b5048"/>
        <path d="M71 76 H117" stroke="#f6f0e4" stroke-width="2" stroke-dasharray="6 5"/>
      </g>
    </g>
  </svg>`;
}

/**
 * The page players see while the owner has the game closed for maintenance or
 * development (admin panel → 🛠 Maintenance): a painted scene, the owner's note,
 * and when it opens again, counting down. The game stops underneath and carries
 * on where it was when the page lifts. A warning shows 15 minutes before a
 * planned close. Admins keep playing (with a small banner), and the secret word
 * still opens the admin login from this page.
 */
export class MaintenanceScreen {
  private readonly root: HTMLDivElement;
  private readonly banner: HTMLDivElement;
  private state: MaintState = 'open';
  private shown = false;
  /** The player chose to keep playing on their own (allowed by the owner). */
  private solo = false;
  /** The admin is looking at the page as players see it. */
  private preview = false;
  private warned = 0;
  private typed = '';
  private taps: number[] = [];
  private opening = false;
  private key = '';
  private leaveTimer = 0;

  constructor(
    container: HTMLElement,
    private readonly host: MaintenanceHost,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'maint hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'maint-title');
    container.appendChild(this.root);
    this.banner = document.createElement('div');
    this.banner.className = 'maint-admin hidden';
    container.appendChild(this.banner);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.banner.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-maint="preview"]')) {
        this.preview = true;
        this.update(true);
      }
    });
    // While the page is up, keys don't reach the game; the secret word still opens the admin login.
    const block = (e: KeyboardEvent): void => {
      if (!this.shown) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('.admin-screen')) return;
      if (e.type === 'keydown' && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.typed = (this.typed + e.key.toLowerCase()).slice(-12);
        if (typedSecret(this.typed)) {
          this.typed = '';
          this.host.openAdmin();
        }
      }
      if (e.key === 'Tab' || target?.closest('.maint')) return;
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener('keydown', block, true);
    window.addEventListener('keyup', block, true);
    onBrandChange(() => this.update());
    window.addEventListener('inkroads:maintenance', () => void loadBrand());
    // Ask the server now and then (only while the game is on screen).
    window.setInterval(() => {
      if (!document.hidden) void loadBrand();
    }, POLL_MS);
    window.setInterval(() => this.update(), 1000);
    this.update();
  }

  private get info(): MaintenanceInfo | undefined {
    return brand().maintenance;
  }

  /** Recheck the state and redraw (every second while anything is going on). */
  update(force = false): void {
    const m = this.info;
    const now = serverNow();
    const state = maintState(m, now);
    if (state !== this.state) {
      // It just opened on its own at the set time: ask the server (the owner may have extended it).
      if (this.state === 'closed' && state === 'open' && m?.until && now >= m.until) this.reopen();
      if (state !== 'closed') this.solo = false;
      this.state = state;
    }
    if (state === 'soon' && m && Date.now() - this.warned > 5 * 60_000) {
      this.warned = Date.now();
      this.host.warn(t('maint.soon', { time: formatWait(m.from - now, lang(), false) }));
    }
    const admin = this.host.isAdmin();
    if (!admin) this.preview = false;
    const show = (state === 'closed' && !admin && !this.solo) || this.preview || this.opening;
    this.showBanner(admin && state !== 'open' && !this.preview ? m : undefined, state);
    if (show !== this.shown) {
      this.shown = show;
      // The game waits underneath (in an admin's preview too, so it looks just as players see it).
      this.host.setClosed(show);
      window.clearTimeout(this.leaveTimer);
      if (show) {
        this.root.classList.remove('hidden', 'leaving');
        this.key = '';
        this.render(true);
        queueMicrotask(() => this.root.querySelector<HTMLElement>('#maint-title')?.focus());
      } else {
        // The page washes away, then the game carries on.
        this.root.classList.add('leaving');
        this.leaveTimer = window.setTimeout(() => this.root.classList.add('hidden'), 900);
      }
    }
    if (show) this.render(force);
  }

  /** The admin panel's Preview: the page as players see it. */
  showPreview(): void {
    this.preview = true;
    this.update(true);
  }

  /** The set time came: show "opening…" while we ask the server, then lift the page. */
  private reopen(): void {
    this.opening = true;
    void loadBrand().finally(() => {
      window.setTimeout(() => {
        this.opening = false;
        this.update();
      }, 1200);
    });
  }

  private render(force: boolean): void {
    const m: MaintenanceInfo | undefined = this.info ?? (this.preview ? { mode: 'maintenance', message: '', from: 0, until: 0, offline: true, active: true, now: 0 } : undefined);
    const mode = m?.mode === 'development' ? 'development' : 'maintenance';
    const key = `${mode}|${m?.message}|${m?.until}|${m?.offline}|${this.preview}|${this.opening}|${lang()}`;
    // The scene is drawn once (so the animation keeps running); only the countdown ticks.
    if (key !== this.key || force) {
      this.key = key;
      const logo = brand().company.logo ? apiUrl(brand().company.logo!) : COMPANY_LOGO;
      this.root.dataset.mode = mode;
      this.root.innerHTML = `<div class="maint-card">
        <button class="maint-logo" data-maint="logo" aria-label="${esc(brand().company.name)}"><img src="${esc(logo)}" alt=""></button>
        ${mode === 'development' ? developmentArt() : maintenanceArt()}
        <h2 id="maint-title" class="hand" tabindex="-1">${esc(t(mode === 'development' ? 'maint.titleDev' : 'maint.titleMaint'))}</h2>
        <p class="maint-text">${esc(t(mode === 'development' ? 'maint.textDev' : 'maint.textMaint'))}</p>
        ${m?.message ? `<p class="maint-note">“${esc(m.message)}”</p>` : ''}
        <div class="maint-when" aria-live="polite"></div>
        ${this.preview ? `<button class="btn" data-maint="close-preview">✕ Close preview</button>` : m?.offline && !this.opening ? `<button class="btn primary" data-maint="solo">▶ ${esc(t('maint.offline'))}</button><p class="menu-hint">${esc(t('maint.offlineNote'))}</p>` : ''}
      </div>`;
    }
    const when = this.root.querySelector('.maint-when');
    if (!when) return;
    const now = serverNow();
    if (this.opening) when.innerHTML = `<b>${esc(t('maint.opening'))}</b>`;
    else if (m?.until && m.until > now) {
      const at = new Date(m.until - (serverNow() - Date.now()));
      const sameDay = at.toDateString() === new Date().toDateString();
      const clock = at.toLocaleString(lang(), sameDay ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      when.innerHTML = `<b>${esc(t('maint.back', { time: formatWait(m.until - now, lang()) }))}</b><span>${esc(t('maint.backAt', { time: clock }))}</span>`;
    } else when.innerHTML = `<b>${esc(t('maint.noTime'))}</b>`;
  }

  private showBanner(m: MaintenanceInfo | undefined, state: MaintState): void {
    this.banner.classList.toggle('hidden', !m);
    if (!m) return;
    const text = state === 'closed' ? `🛠 Closed for players (${m.mode})${m.until ? ` · opens in ${formatWait(m.until - serverNow(), 'en', false)}` : ''}` : `🛠 Closes for players in ${formatWait(m.from - serverNow(), 'en', false)}`;
    const html = `<span>${esc(text)} · you're playing as admin</span><button class="btn small" data-maint="preview">Preview</button>`;
    if (this.banner.innerHTML !== html) this.banner.innerHTML = html;
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-maint]');
    const what = el?.dataset.maint;
    if (what === 'solo') {
      this.solo = true;
      this.update();
    } else if (what === 'close-preview') {
      this.preview = false;
      this.update();
    } else if (what === 'logo') {
      // Touch screens: five quick taps on the logo ask for the secret word.
      const now = Date.now();
      this.taps = [...this.taps.filter((x) => now - x < 2500), now];
      if (this.taps.length >= 5) {
        this.taps = [];
        if (isSecret(prompt('…'))) this.host.openAdmin();
      }
    }
  }
}
