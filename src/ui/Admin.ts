import { api, apiBase, apiUrl, setApiBase } from '../net/Api';
import { COMPANY_LOGO, setBrand, type BrandConfig } from '../brand/Brand';
import { paintedLogo } from '../brand/Watercolour';

/** What /api/admin/stats returns (server/admin.mjs). */
interface Row {
  key: string;
  value: number;
}
interface Stats {
  totals: { players: number; today: number; week: number; onlineNow: number; inRooms: number; rooms: number; sessions: number; avgSessionMin: number; playHours: number; returning: number };
  days: { day: string; players: number; newPlayers: number; sessions: number; playHours: number }[];
  chapters: Row[];
  areas: Row[];
  timeIn: Row[];
  languages: Row[];
  devices: Row[];
  quality: Row[];
  fps: Row[];
  trophies: Row[];
  missions: Row[];
  links: Row[];
  sponsors: { id: string; name: string; enabled: boolean; views: number; clicks: number }[];
  helao2: { views: number; clicks: number };
  roomSizes: Record<string, number>;
  since: number;
}
interface ServerConfig extends Omit<BrandConfig, 'sponsors'> {
  maxPlayersPerRoom: number;
  sponsors: { id: string; name: string; url: string; file: string; weight: number; enabled: boolean }[];
}
type Tab = 'dashboard' | 'branding' | 'links' | 'sponsors' | 'players' | 'security';

const TOKEN = 'paintland.admin';
const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
const fmt = (n: number): string => (Math.abs(n) >= 1000 ? n.toLocaleString('en') : String(n));

/**
 * The owner's admin panel, opened by typing the secret word on the menu.
 * Everything is checked and stored on the server; this is only the UI.
 */
export class AdminPanel {
  readonly root: HTMLDivElement;
  private token: string | null = null;
  private tab: Tab = 'dashboard';
  private stats: Stats | null = null;
  private config: ServerConfig | null = null;
  private chat: { chat: { at: number; room: string; name: string; text: string }[]; banned: string[] } | null = null;
  private timer = 0;
  private message = '';
  private email = '';
  open = false;
  onClose: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'admin-screen hidden';
    container.appendChild(this.root);
    try {
      this.token = sessionStorage.getItem(TOKEN);
    } catch {
      this.token = null;
    }
    this.root.addEventListener('click', (e) => void this.onClick(e));
    this.root.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.onSubmit(e.target as HTMLFormElement);
    });
    this.root.addEventListener('change', (e) => this.onChange(e));
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
    this.root.addEventListener('keyup', (e) => e.stopPropagation());
  }

  show(): void {
    this.open = true;
    this.root.classList.remove('hidden');
    if (this.token) void this.loadAll();
    else this.render();
  }

  hide(): void {
    this.open = false;
    this.root.classList.add('hidden');
    clearInterval(this.timer);
    this.onClose?.();
  }

  // ————— data —————

  private async call<T>(path: string, method = 'GET', body?: unknown): Promise<T | null> {
    const res = await api<T>(path, { method, body, token: this.token, timeout: 15000 });
    if (res.status === 401) {
      this.logout('Your session ended. Please log in again.');
      return null;
    }
    if (!res.ok) {
      this.flash(res.reason ?? 'Something went wrong.');
      return null;
    }
    return res.data;
  }

  private async loadAll(): Promise<void> {
    this.render();
    const [stats, config] = await Promise.all([this.call<Stats>('/api/admin/stats'), this.call<ServerConfig>('/api/admin/config')]);
    if (!this.token) return;
    this.stats = stats;
    this.config = config;
    this.render();
    clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (this.open && this.tab === 'dashboard') void this.call<Stats>('/api/admin/stats').then((s) => s && ((this.stats = s), this.render()));
    }, 15000);
  }

  private flash(msg: string): void {
    this.message = msg;
    this.render();
    window.setTimeout(() => {
      if (this.message === msg) {
        this.message = '';
        this.render();
      }
    }, 4000);
  }

  private logout(msg = ''): void {
    this.token = null;
    try {
      sessionStorage.removeItem(TOKEN);
    } catch {
      /* ignore */
    }
    clearInterval(this.timer);
    this.message = msg;
    this.render();
  }

  /** Apply a saved config to the running game too (footer, boards). */
  private applyToGame(c: ServerConfig): void {
    setBrand({
      company: c.company,
      links: c.links,
      logoFrequency: c.logoFrequency,
      showSponsorCta: c.showSponsorCta,
      sponsors: c.sponsors.filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name, url: s.url, weight: s.weight, image: `/api/brand/${s.file}` })),
    });
  }

  // ————— rendering —————

  private render(): void {
    if (!this.open) return;
    const scroll = this.root.querySelector('.admin-body')?.scrollTop ?? 0;
    this.root.innerHTML = this.token ? this.panel() : this.login();
    const body = this.root.querySelector('.admin-body');
    if (body) body.scrollTop = scroll;
    this.paintPreviews();
  }

  private login(): string {
    return `<form class="card admin-login" autocomplete="on">
      <div class="admin-brand"><img src="${COMPANY_LOGO}" alt="HelaO2"><span class="label">PaintLand admin</span></div>
      <div class="hand admin-title">Secret door 🔑</div>
      <label>Email<input class="text-input" type="email" name="email" autocomplete="username" value="${esc(this.email)}" required></label>
      <label>Password<input class="text-input" type="password" name="password" autocomplete="current-password" required></label>
      <details><summary>Server</summary><label>Admin server (leave empty for this site)<input class="text-input" name="server" placeholder="http://localhost:8787" value="${esc(apiBase())}"></label></details>
      ${this.message ? `<div class="admin-msg">${esc(this.message)}</div>` : ''}
      <div class="row"><button class="btn primary" type="submit" data-form="login">Log in</button><button class="btn" type="button" data-admin="close">Cancel</button></div>
    </form>`;
  }

  private panel(): string {
    const tabs: [Tab, string][] = [['dashboard', '📊 Dashboard'], ['branding', '🏷 Branding'], ['links', '🔗 Menu links'], ['sponsors', '🤝 Sponsors'], ['players', '👥 Players & chat'], ['security', '🔒 Security']];
    const body = { dashboard: () => this.dashboard(), branding: () => this.branding(), links: () => this.linksTab(), sponsors: () => this.sponsorsTab(), players: () => this.playersTab(), security: () => this.securityTab() }[this.tab]();
    return `<div class="card admin-panel">
      <div class="admin-head">
        <div class="admin-brand"><img src="${esc(this.config?.company.logo ? apiUrl(this.config.company.logo) : COMPANY_LOGO)}" alt=""><span class="hand">${esc(this.config?.company.name ?? 'HelaO2')} · PaintLand admin</span></div>
        <div class="row"><button class="btn small" data-admin="refresh">↻ Refresh</button><button class="btn small" data-admin="logout">Log out</button><button class="btn small" data-admin="close">✕ Close</button></div>
      </div>
      <nav class="tabs">${tabs.map(([id, label]) => `<button class="tab ${this.tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}</nav>
      ${this.message ? `<div class="admin-msg">${esc(this.message)}</div>` : ''}
      <div class="admin-body">${body}</div>
    </div>`;
  }

  // ————— dashboard —————

  private dashboard(): string {
    const s = this.stats;
    if (!s) return '<p class="menu-hint">Loading numbers…</p>';
    const t = s.totals;
    const tile = (label: string, value: string, sub = ''): string => `<div class="stat-tile"><div class="label">${label}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
    const spark = (key: 'players' | 'playHours'): number[] => s.days.slice(-14).map((d) => d[key]);
    const rooms = Object.entries(s.roomSizes);
    const sponsorRows = [{ id: 'helao2', name: `${this.config?.company.name ?? 'HelaO2'} (company)`, enabled: true, ...s.helao2 }, ...s.sponsors];
    return `
      <div class="kpi-row">
        ${tile('Players (all time)', fmt(t.players), `${fmt(t.returning)} came back`)}
        ${tile('Played today', fmt(t.today), sparkline(spark('players')))}
        ${tile('Last 7 days', fmt(t.week))}
        ${tile('Online now', fmt(t.onlineNow), `${t.inRooms} in ${t.rooms} multiplayer room${t.rooms === 1 ? '' : 's'}`)}
        ${tile('Sessions', fmt(t.sessions), `avg ${t.avgSessionMin} min`)}
        ${tile('Hours played', fmt(t.playHours), sparkline(spark('playHours')))}
      </div>
      <div class="grid2">
        <section class="viz-card"><h3>Players per day <small>last 30 days</small></h3>${lineChart(s.days.map((d) => ({ x: d.day, y: d.players })), 'players')}</section>
        <section class="viz-card"><h3>Hours played per day <small>last 30 days</small></h3>${lineChart(s.days.map((d) => ({ x: d.day, y: d.playHours })), 'hours')}</section>
      </div>
      <section class="viz-card"><h3>Sponsor and logo performance</h3>
        <table class="admin-table"><thead><tr><th>Board</th><th>Status</th><th class="num">Views</th><th class="num">Visits</th><th class="num">Visit rate</th></tr></thead><tbody>
        ${sponsorRows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.enabled ? '● showing' : '○ hidden'}</td><td class="num">${fmt(r.views)}</td><td class="num">${fmt(r.clicks)}</td><td class="num">${r.views ? ((r.clicks / r.views) * 100).toFixed(1) + '%' : '—'}</td></tr>`).join('')}
        </tbody></table>
        <p class="menu-hint">A view counts when a board is on screen and close for over a second (once per board per play session). A visit is a player pressing E at a board.</p>
      </section>
      <div class="grid3">
        ${barCard('Chapters started', s.chapters)}
        ${barCard('Areas visited', s.areas)}
        ${barCard('Hours by place', s.timeIn, 'h')}
        ${barCard('Languages', s.languages)}
        ${barCard('Devices', s.devices)}
        ${barCard('Graphics quality', s.quality)}
        ${barCard('Frame rate (fps)', s.fps.slice().sort((a, b) => Number(a.key) - Number(b.key)))}
        ${barCard('Missions finished', s.missions)}
        ${barCard('Trophies won', s.trophies)}
        ${barCard('Menu link clicks', s.links)}
        <section class="viz-card"><h3>Multiplayer rooms now</h3>${rooms.length ? `<table class="admin-table"><tbody>${rooms.map(([r, n]) => `<tr><td>${esc(r)}</td><td class="num">${n} player${n === 1 ? '' : 's'}</td></tr>`).join('')}</tbody></table>` : '<p class="menu-hint">Nobody in a room right now.</p>'}</section>
      </div>
      <div class="row wrap"><button class="btn" data-admin="export">⬇ Export all analytics (JSON)</button><span class="menu-hint">Counting since ${new Date(s.since).toLocaleDateString()}. Anonymous: one random id per browser, no names or addresses.</span></div>`;
  }

  // ————— settings tabs —————

  private branding(): string {
    const c = this.config;
    if (!c) return '<p class="menu-hint">Loading…</p>';
    return `<form class="admin-form" data-form="branding">
      <div class="grid2">
        <div>
          <label>Company name<input class="text-input" name="name" maxlength="60" value="${esc(c.company.name)}"></label>
          <label>Website<input class="text-input" name="site" type="url" placeholder="https://helao2.com" value="${esc(c.company.site)}"></label>
          <label>Loading screen words<input class="text-input" name="tagline" maxlength="80" placeholder="Presents" value="${esc(c.company.tagline)}"></label>
          <label>Sponsor contact email<input class="text-input" name="contact" maxlength="120" value="${esc(c.company.contact)}"></label>
        </div>
        <div>
          <label>How often your logo appears on boards: <b data-out="freq">${Math.round(c.logoFrequency * 100)}%</b><input type="range" name="logoFrequency" min="0" max="1" step="0.05" value="${c.logoFrequency}"></label>
          <label class="check"><input type="checkbox" name="showSponsorCta" ${c.showSponsorCta ? 'checked' : ''}> Show “Your brand here · ${esc(c.company.contact)}” boards</label>
          <label>Players per multiplayer room (2–64)<input class="text-input" name="maxPlayersPerRoom" type="number" min="2" max="64" value="${c.maxPlayersPerRoom}"></label>
          <div class="field"><label>Company logo</label>
            <div class="logo-previews"><img src="${esc(c.company.logo ? apiUrl(c.company.logo) : COMPANY_LOGO)}" alt="original"><img data-paint="${esc(c.company.logo ? apiUrl(c.company.logo) : COMPANY_LOGO)}" alt="as painted in the game"></div>
            <div class="row wrap"><input type="file" accept="image/png,image/jpeg,image/webp" data-upload="company"> ${c.company.logo ? '<button class="btn small" type="button" data-admin="reset-logo">Use the HelaO2 logo</button>' : ''}</div>
          </div>
        </div>
      </div>
      <button class="btn primary" type="submit">Save branding</button>
    </form>`;
  }

  private linksTab(): string {
    const c = this.config;
    if (!c) return '<p class="menu-hint">Loading…</p>';
    const custom = [...c.links.custom, { label: '', url: '' }, { label: '', url: '' }].slice(0, 8);
    return `<form class="admin-form" data-form="links">
      <p class="menu-hint">These buttons appear in the footer of the main menu. Leave a box empty to hide its button. Links must start with https:// or mailto:.</p>
      <label>☕ Buy me a coffee<input class="text-input" name="coffee" type="url" placeholder="https://buymeacoffee.com/…" value="${esc(c.links.coffee)}"></label>
      <label>💛 Fund me (GoFundMe, Patreon, Ko-fi…)<input class="text-input" name="fund" type="url" placeholder="https://…" value="${esc(c.links.fund)}"></label>
      <label>🤝 Become a sponsor<input class="text-input" name="sponsor" placeholder="mailto:support@helao2.com" value="${esc(c.links.sponsor)}"></label>
      <h3>More links</h3>
      ${custom.map((l, i) => `<div class="row"><input class="text-input" name="label${i}" maxlength="40" placeholder="Label (e.g. Discord)" value="${esc(l.label)}"><input class="text-input" name="url${i}" placeholder="https://…" value="${esc(l.url)}"></div>`).join('')}
      <button class="btn primary" type="submit">Save links</button>
    </form>`;
  }

  private sponsorsTab(): string {
    const c = this.config;
    if (!c) return '<p class="menu-hint">Loading…</p>';
    return `<form class="admin-form card" data-form="upload">
        <h3>Add a sponsor</h3>
        <div class="grid2">
          <label>Brand name<input class="text-input" name="name" maxlength="60" required></label>
          <label>Link (visited when a player presses E at the board)<input class="text-input" name="url" placeholder="https://…"></label>
        </div>
        <label>Logo (PNG, JPEG or WebP; a white background is painted out)<input type="file" name="file" accept="image/png,image/jpeg,image/webp" required></label>
        <button class="btn primary" type="submit">Upload and show in the game</button>
      </form>
      <form class="admin-form" data-form="sponsors">
        ${c.sponsors.length ? '' : '<p class="menu-hint">No sponsors yet. Until there are, some boards say “Your brand here” with your contact email.</p>'}
        ${c.sponsors
          .map(
            (s) => `<div class="card sponsor-row" data-id="${esc(s.id)}">
            <div class="logo-previews"><img src="${esc(apiUrl(`/api/brand/${s.file}`))}" alt="${esc(s.name)}"><img data-paint="${esc(apiUrl(`/api/brand/${s.file}`))}" alt="painted"></div>
            <div class="sponsor-fields">
              <label>Name<input class="text-input" name="name-${esc(s.id)}" value="${esc(s.name)}"></label>
              <label>Link<input class="text-input" name="url-${esc(s.id)}" value="${esc(s.url)}"></label>
              <label>Weight (how often, 0–10)<input class="text-input" type="number" min="0" max="10" step="0.5" name="weight-${esc(s.id)}" value="${s.weight}"></label>
              <label class="check"><input type="checkbox" name="enabled-${esc(s.id)}" ${s.enabled ? 'checked' : ''}> Showing in the game</label>
              <button class="btn small" type="button" data-delete="${esc(s.id)}">Delete</button>
            </div>
          </div>`,
          )
          .join('')}
        ${c.sponsors.length ? '<button class="btn primary" type="submit">Save sponsor changes</button>' : ''}
      </form>`;
  }

  private playersTab(): string {
    const s = this.stats;
    const chat = this.chat;
    if (!chat) {
      void this.call<NonNullable<AdminPanel['chat']>>('/api/admin/chat').then((c) => c && ((this.chat = c), this.render()));
      return '<p class="menu-hint">Loading chat…</p>';
    }
    return `<div class="kpi-row">
        <div class="stat-tile"><div class="label">Online now</div><div class="stat-value">${fmt(s?.totals.onlineNow ?? 0)}</div></div>
        <div class="stat-tile"><div class="label">In multiplayer rooms</div><div class="stat-value">${fmt(s?.totals.inRooms ?? 0)}</div></div>
        <div class="stat-tile"><div class="label">Room size limit</div><div class="stat-value">${this.config?.maxPlayersPerRoom ?? 32}</div></div>
      </div>
      <section class="viz-card"><h3>Banned names</h3>
        ${chat.banned.length ? chat.banned.map((n) => `<span class="chip">${esc(n)} <button class="btn small" data-unban="${esc(n)}">Unban</button></span>`).join(' ') : '<p class="menu-hint">Nobody is banned.</p>'}
        <form class="row" data-form="ban"><input class="text-input" name="name" maxlength="20" placeholder="Player name"><button class="btn" type="submit">Ban</button></form>
      </section>
      <section class="viz-card"><h3>Recent chat <small>newest first, last 200 lines, kept in memory only</small></h3>
        ${chat.chat.length ? `<table class="admin-table"><thead><tr><th>Time</th><th>Room</th><th>Player</th><th>Message</th><th></th></tr></thead><tbody>${chat.chat
          .slice()
          .reverse()
          .map((l) => `<tr><td>${new Date(l.at).toLocaleTimeString()}</td><td>${esc(l.room)}</td><td>${esc(l.name)}</td><td>${esc(l.text)}</td><td><button class="btn small" data-ban="${esc(l.name)}">Ban</button></td></tr>`)
          .join('')}</tbody></table>` : '<p class="menu-hint">No chat yet.</p>'}
      </section>`;
  }

  private securityTab(): string {
    return `<form class="admin-form" data-form="password">
      <p class="menu-hint">The password is stored on the server only as a salted hash. Choose a long one: at least 8 characters, better 12+. Changing it logs out every admin session.</p>
      <label>Login email (leave empty to keep it)<input class="text-input" type="email" name="email" placeholder="keep the current email"></label>
      <label>Current password<input class="text-input" type="password" name="current" autocomplete="current-password" required></label>
      <label>New password<input class="text-input" type="password" name="next" autocomplete="new-password" minlength="8" required></label>
      <label>New password again<input class="text-input" type="password" name="again" autocomplete="new-password" minlength="8" required></label>
      <button class="btn primary" type="submit">Change password</button>
    </form>`;
  }

  /** Show the painted version next to each uploaded logo. */
  private paintPreviews(): void {
    for (const img of this.root.querySelectorAll<HTMLImageElement>('img[data-paint]')) {
      const url = img.dataset.paint!;
      void paintedLogo(url, 360, 180).then((c) => {
        if (c) img.src = c.toDataURL('image/png');
      });
    }
  }

  // ————— events —————

  private async onClick(e: MouseEvent): Promise<void> {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-admin], [data-tab], [data-delete], [data-ban], [data-unban]');
    if (!el) return;
    const d = el.dataset;
    if (d.tab) {
      this.tab = d.tab as Tab;
      if (this.tab === 'players') this.chat = null;
      this.render();
      return;
    }
    if (d.admin === 'close') return this.hide();
    if (d.admin === 'logout') return this.logout('Logged out.');
    if (d.admin === 'refresh') {
      this.chat = null;
      return this.loadAll();
    }
    if (d.admin === 'export') {
      const res = await fetch(apiUrl('/api/admin/export'), { headers: { authorization: `Bearer ${this.token}` } });
      if (!res.ok) return this.flash('Export failed.');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await res.blob());
      a.download = `paintland-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      return;
    }
    if (d.admin === 'reset-logo' && this.config) {
      const saved = await this.call<ServerConfig>('/api/admin/config', 'PUT', { company: { ...this.config.company, logo: '' } });
      if (saved) this.saved(saved, 'The HelaO2 logo is back.');
      return;
    }
    if (d.delete) {
      if (!confirm('Delete this sponsor and its logo?')) return;
      const saved = await this.call<ServerConfig>(`/api/admin/sponsor?id=${encodeURIComponent(d.delete)}`, 'DELETE');
      if (saved) this.saved(saved, 'Sponsor deleted.');
      return;
    }
    if (d.ban || d.unban) {
      const res = await this.call<{ banned: string[] }>('/api/admin/ban', 'POST', { name: d.ban ?? d.unban, ban: !!d.ban });
      if (res && this.chat) {
        this.chat.banned = res.banned;
        this.flash(d.ban ? `${d.ban} is banned.` : `${d.unban} is unbanned.`);
      }
    }
  }

  private onChange(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (el.name === 'logoFrequency') {
      const out = this.root.querySelector('[data-out="freq"]');
      if (out) out.textContent = `${Math.round(Number(el.value) * 100)}%`;
    }
    if (el.dataset.upload === 'company' && el.files?.[0]) void this.upload(el.files[0], { kind: 'company' });
  }

  private saved(c: ServerConfig, msg: string): void {
    this.config = c;
    this.applyToGame(c);
    this.flash(msg);
  }

  /** Shrink an image in the browser (max 640 px) and upload it. */
  private async upload(file: File, extra: Record<string, string>): Promise<void> {
    if (file.size > 8_000_000) return this.flash('That file is too big (8 MB max before shrinking).');
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = url;
    });
    URL.revokeObjectURL(url);
    if (!img) return this.flash('That file is not an image the browser can read.');
    const k = Math.min(1, 640 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const data = c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
    this.flash('Uploading…');
    const saved = await this.call<ServerConfig>('/api/admin/sponsor', 'POST', { ...extra, image: data });
    if (saved) this.saved(saved, extra.kind === 'company' ? 'Company logo updated.' : 'Sponsor added: it is on boards in the game now.');
  }

  private async onSubmit(form: HTMLFormElement): Promise<void> {
    const f = new FormData(form);
    const v = (k: string): string => String(f.get(k) ?? '').trim();
    const kind = form.dataset.form ?? (form.querySelector('[data-form]') as HTMLElement | null)?.dataset.form;
    if (form.classList.contains('admin-login') || kind === 'login') {
      this.email = v('email');
      setApiBase(v('server'));
      const res = await api<{ token: string }>('/api/admin/login', { method: 'POST', body: { email: v('email'), password: String(f.get('password') ?? '') } });
      if (!res.ok || !res.data?.token) {
        this.message = res.reason ?? 'Login failed.';
        this.render();
        return;
      }
      this.token = res.data.token;
      try {
        sessionStorage.setItem(TOKEN, this.token);
      } catch {
        /* ignore */
      }
      this.message = '';
      this.tab = 'dashboard';
      void this.loadAll();
      return;
    }
    if (!this.config) return;
    if (kind === 'branding') {
      const saved = await this.call<ServerConfig>('/api/admin/config', 'PUT', {
        company: { name: v('name'), site: v('site'), tagline: v('tagline'), contact: v('contact') },
        logoFrequency: Number(v('logoFrequency')),
        showSponsorCta: f.get('showSponsorCta') === 'on',
        maxPlayersPerRoom: Number(v('maxPlayersPerRoom')),
      });
      if (saved) this.saved(saved, 'Branding saved. Players see it the next time they load the game.');
    } else if (kind === 'links') {
      const custom = [];
      for (let i = 0; i < 8; i++) if (v(`label${i}`) && v(`url${i}`)) custom.push({ label: v(`label${i}`), url: v(`url${i}`) });
      const saved = await this.call<ServerConfig>('/api/admin/config', 'PUT', { links: { coffee: v('coffee'), fund: v('fund'), sponsor: v('sponsor'), custom } });
      if (saved) this.saved(saved, 'Links saved. (Links that are not https:// or mailto: are dropped.)');
    } else if (kind === 'upload') {
      const file = f.get('file');
      if (!(file instanceof File) || !file.size) return this.flash('Choose a logo file.');
      await this.upload(file, { name: v('name'), url: v('url') });
    } else if (kind === 'sponsors') {
      const sponsors = this.config.sponsors.map((s) => ({ id: s.id, name: v(`name-${s.id}`), url: v(`url-${s.id}`), weight: Number(v(`weight-${s.id}`)), enabled: f.get(`enabled-${s.id}`) === 'on' }));
      const saved = await this.call<ServerConfig>('/api/admin/config', 'PUT', { sponsors });
      if (saved) this.saved(saved, 'Sponsors saved.');
    } else if (kind === 'ban') {
      if (!v('name')) return;
      const res = await this.call<{ banned: string[] }>('/api/admin/ban', 'POST', { name: v('name'), ban: true });
      if (res && this.chat) {
        this.chat.banned = res.banned;
        this.flash(`${v('name')} is banned.`);
      }
    } else if (kind === 'password') {
      if (v('next') !== v('again')) return this.flash('The two new passwords are different.');
      const res = await this.call<{ ok: boolean }>('/api/admin/password', 'POST', { current: String(f.get('current') ?? ''), next: String(f.get('next') ?? ''), email: v('email') });
      if (res?.ok) this.logout('Password changed. Log in with the new one.');
    }
  }
}

// ————— small charts (inline SVG; one series each, hover tooltips) —————

const SERIES = '#2a78d6';

function sparkline(values: number[]): string {
  if (values.length < 2) return '';
  const max = Math.max(1, ...values);
  const w = 96;
  const h = 22;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${SERIES}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/** Nice round axis maximum. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

function lineChart(points: { x: string; y: number }[], unit: string): string {
  const W = 560;
  const H = 200;
  const L = 40;
  const R = 12;
  const T = 12;
  const B = 26;
  const max = niceMax(Math.max(...points.map((p) => p.y)));
  const X = (i: number): number => L + (i / Math.max(1, points.length - 1)) * (W - L - R);
  const Y = (v: number): number => T + (1 - v / max) * (H - T - B);
  const grid = [0, 0.5, 1].map((k) => `<line x1="${L}" x2="${W - R}" y1="${Y(max * k)}" y2="${Y(max * k)}" class="grid"/><text x="${L - 6}" y="${Y(max * k) + 4}" text-anchor="end" class="axis">${+(max * k).toFixed(2)}</text>`).join('');
  const labels = points
    .map((p, i) => ((i % 7 === 0 && points.length - 1 - i >= 4) || i === points.length - 1 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="axis">${p.x.slice(5)}</text>` : ''))
    .join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${X(points.length - 1)},${Y(0)} L${X(0)},${Y(0)} Z`;
  // Hover: one invisible column per day with a native tooltip, plus a crosshair shown by CSS.
  const cols = points
    .map((p, i) => {
      const w = (W - L - R) / Math.max(1, points.length - 1);
      return `<g class="hover-col"><rect x="${X(i) - w / 2}" y="${T}" width="${w}" height="${H - T - B}" fill="transparent"><title>${p.x}: ${p.y} ${unit}</title></rect><line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${Y(0)}" class="crosshair"/><circle cx="${X(i)}" cy="${Y(p.y)}" r="4" class="dot"/></g>`;
    })
    .join('');
  const last = points[points.length - 1];
  return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit} per day">
    ${grid}${labels}
    <path d="${area}" fill="${SERIES}" opacity="0.08"/>
    <path d="${path}" fill="none" stroke="${SERIES}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(points.length - 1)}" cy="${Y(last.y)}" r="4" fill="${SERIES}"/>
    <text x="${X(points.length - 1) - 6}" y="${Y(last.y) - 8}" text-anchor="end" class="value">${last.y}</text>
    ${cols}
  </svg>`;
}

function barCard(title: string, rows: Row[], unit = ''): string {
  if (!rows.length) return `<section class="viz-card"><h3>${title}</h3><p class="menu-hint">No data yet.</p></section>`;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<section class="viz-card"><h3>${title}</h3><div class="bars">${rows
    .map((r) => `<div class="bar-row" title="${esc(r.key)}: ${r.value}${unit}"><span class="bar-label">${esc(r.key)}</span><span class="bar-track"><i style="width:${Math.max(1, (r.value / max) * 100)}%"></i></span><span class="bar-value">${fmt(r.value)}${unit}</span></div>`)
    .join('')}</div></section>`;
}
