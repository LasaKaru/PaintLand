import { clubRoom, type AccountClient, type ClubInfo, type Friend } from '../net/Account';
import { t } from '../core/i18n';

export interface AccountHost {
  account: AccountClient;
  /** Friends and clubs are social: off when the family settings block online play. */
  socialAllowed(): boolean;
  /** Current progress summary (ink, trophies) for the save choice. */
  localSummary(): { ink: number; trophies: number };
  useCloudSave(): void;
  keepDeviceSave(): Promise<void>;
  syncNow(): Promise<'ok' | 'conflict' | 'offline'>;
  joinRoom(room: string): boolean;
}

const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Menu → Account: sign in or create an account, keep progress in the cloud,
 * friends (with a Join button when they're in a room) and clubs.
 */
export class AccountScreen {
  private friends: { friends: Friend[]; requests: string[]; sent: string[] } | null = null;
  private club: ClubInfo | null = null;
  private found: ClubInfo[] | null = null;
  private loading = false;
  private again = false;
  private loadedFor: string | null = null;

  constructor(
    private readonly host: AccountHost,
    private readonly rerender: () => void,
    private readonly toast: (msg: string) => void,
  ) {}

  /** Fetch friends and club when the screen opens (once per sign-in, then on changes). */
  load(force = false): void {
    const a = this.host.account;
    if (!a.signedIn || (!force && this.loadedFor === a.name)) return;
    // A reload asked for while one is running happens right after it (so a change is never missed).
    if (this.loading) {
      if (force) this.again = true;
      return;
    }
    this.loading = true;
    this.loadedFor = a.name;
    void Promise.all([a.refresh(), this.host.socialAllowed() ? a.friends() : null, this.host.socialAllowed() ? a.myClub() : null]).then(([, f, c]) => {
      this.loading = false;
      if (f?.ok && f.data) this.friends = f.data;
      if (c?.ok && c.data) this.club = c.data.club;
      this.rerender();
      if (this.again) {
        this.again = false;
        this.load(true);
      }
    });
  }

  render(): string {
    const a = this.host.account;
    if (!a.signedIn) return this.signedOut();
    this.load();
    const summary = this.host.localSummary();
    const conflict = a.conflict;
    const cloudInk = Number((conflict?.cloud as { ink?: number } | undefined)?.ink ?? 0);
    const cloudTrophies = Array.isArray((conflict?.cloud as { trophies?: unknown[] } | undefined)?.trophies) ? (conflict!.cloud as { trophies: unknown[] }).trophies.length : 0;
    const synced = a.lastSync ? t('acct.syncedAt', { time: new Date(a.lastSync).toLocaleTimeString() }) : t('acct.notSynced');
    return `<p class="acct-who">✓ ${t('acct.signedInAs', { name: esc(a.name) })} <button class="btn small" data-acct="logout">${t('acct.signOut')}</button></p>
      <h4>☁ ${t('acct.cloud')}</h4>
      ${conflict
        ? `<div class="card acct-conflict" role="alert"><p>${t('acct.conflict')}</p>
          <div class="row wrap"><button class="btn primary" data-acct="use-cloud">${t('acct.useCloud', { ink: cloudInk, trophies: cloudTrophies })}</button>
          <button class="btn" data-acct="keep-device">${t('acct.keepDevice', { ink: summary.ink, trophies: summary.trophies })}</button></div></div>`
        : `<p class="menu-hint">${synced}</p><div class="row"><button class="btn" data-acct="sync">🔄 ${t('acct.syncNow')}</button></div>`}
      ${this.host.socialAllowed() ? this.social() : `<p class="fam-status" role="status">🔒 ${t('acct.socialLocked')}</p>`}
      <h4>${t('acct.settings')}</h4>
      <form class="report-form" data-form="acct-password">
        <label>${t('acct.current')}<input class="text-input" type="password" name="current" autocomplete="current-password" required></label>
        <label>${t('acct.newPassword')}<input class="text-input" type="password" name="next" autocomplete="new-password" minlength="8" required></label>
        <button class="btn small" type="submit">${t('acct.changePassword')}</button>
      </form>
      <form class="report-form" data-form="acct-delete">
        <label>${t('acct.password')}<input class="text-input" type="password" name="password" autocomplete="current-password" required></label>
        <label class="check"><input type="checkbox" name="sure" required> ${t('acct.deleteSure')}</label>
        <button class="btn small danger" type="submit">${t('acct.delete')}</button>
      </form>`;
  }

  private signedOut(): string {
    return `<p>${t('acct.why')}</p>
      <p class="menu-hint">${t('acct.privacy')}</p>
      <h4>${t('acct.signIn')}</h4>
      <form class="report-form" data-form="acct-login">
        <label>${t('acct.name')}<input class="text-input" name="name" autocomplete="username" maxlength="20" required></label>
        <label>${t('acct.password')}<input class="text-input" type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn primary" type="submit">${t('acct.signIn')}</button>
      </form>
      <h4>${t('acct.create')}</h4>
      <form class="report-form" data-form="acct-register">
        <label>${t('acct.name')}<input class="text-input" name="name" autocomplete="username" minlength="3" maxlength="20" required></label>
        <label>${t('acct.password')}<input class="text-input" type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        <label>${t('acct.repeat')}<input class="text-input" type="password" name="again" autocomplete="new-password" minlength="8" required></label>
        <button class="btn" type="submit">${t('acct.create')}</button>
      </form>`;
  }

  private social(): string {
    const f = this.friends;
    const friendRows = (f?.friends ?? [])
      .map(
        (x) => `<div class="player-row"><span>${x.online ? '🟢' : '⚪'} ${esc(x.name)}${x.club ? ` <small>[${esc(x.club)}]</small>` : ''}</span>
        ${x.online && x.room ? `<button class="btn small primary" data-acct="join" data-room="${esc(x.room)}">${t('acct.join')}</button>` : ''}
        <button class="btn small" data-acct="unfriend" data-name="${esc(x.name)}">${t('acct.remove')}</button></div>`,
      )
      .join('');
    const requests = (f?.requests ?? [])
      .map((n) => `<div class="player-row"><span>👋 ${esc(n)}</span><button class="btn small primary" data-acct="accept" data-name="${esc(n)}">${t('acct.accept')}</button><button class="btn small" data-acct="decline" data-name="${esc(n)}">${t('acct.decline')}</button></div>`)
      .join('');
    const c = this.club;
    const clubHtml = c
      ? `<div class="card"><b>${esc(c.name)} [${esc(c.tag)}]</b>${c.motto ? `<p class="menu-hint">${esc(c.motto)}</p>` : ''}
        ${(c.list ?? []).map((m) => `<div class="player-row"><span>${m.online ? '🟢' : '⚪'} ${esc(m.name)}${m.owner ? ' ★' : ''}</span>${c.owner === this.host.account.name && !m.owner ? `<button class="btn small" data-acct="kick" data-name="${esc(m.name)}">${t('acct.remove')}</button>` : ''}</div>`).join('')}
        <div class="row wrap"><button class="btn primary" data-acct="join" data-room="${esc(clubRoom(c.tag))}">${t('acct.clubRoom')}</button><button class="btn" data-acct="leave-club">${t('acct.leaveClub')}</button></div></div>`
      : `<p class="menu-hint">${t('acct.noClub')}</p>
        <form class="report-form" data-form="acct-club-join"><label>${t('acct.clubTag')}<input class="text-input" name="tag" maxlength="5" required></label><button class="btn small" type="submit">${t('acct.joinClub')}</button></form>
        <form class="report-form" data-form="acct-club-find"><label>${t('acct.findClub')}<input class="text-input" name="q" maxlength="30"></label><button class="btn small" type="submit">${t('acct.search')}</button></form>
        ${this.found ? `<div>${this.found.map((x) => `<div class="player-row"><span>${esc(x.name)} [${esc(x.tag)}] · ${x.members}</span><button class="btn small" data-acct="join-club" data-tag="${esc(x.tag)}">${t('acct.joinClub')}</button></div>`).join('') || `<p class="menu-hint">${t('acct.noneFound')}</p>`}</div>` : ''}
        <form class="report-form" data-form="acct-club-create">
          <label>${t('acct.clubName')}<input class="text-input" name="name" minlength="3" maxlength="20" required></label>
          <label>${t('acct.clubTag')}<input class="text-input" name="tag" minlength="2" maxlength="5" required></label>
          <label>${t('acct.clubMotto')}<input class="text-input" name="motto" maxlength="60"></label>
          <button class="btn small" type="submit">${t('acct.createClub')}</button>
        </form>`;
    return `<h4>👥 ${t('acct.friends')}</h4>
      <form class="report-form" data-form="acct-friend"><label>${t('acct.addFriend')}<input class="text-input" name="name" maxlength="20" required></label><button class="btn small" type="submit">${t('acct.sendRequest')}</button></form>
      ${requests ? `<p><b>${t('acct.requests')}</b></p>${requests}` : ''}
      ${friendRows || `<p class="menu-hint">${t('acct.noFriends')}</p>`}
      ${f?.sent.length ? `<p class="menu-hint">${t('acct.waiting', { names: f.sent.map(esc).join(', ') })}</p>` : ''}
      <h4>🏁 ${t('acct.club')}</h4>${clubHtml}`;
  }

  /** Button clicks inside the account screen; true when handled. */
  onClick(el: HTMLElement): boolean {
    const d = el.dataset;
    if (!d.acct) return false;
    const a = this.host.account;
    const done = (r: { ok: boolean; reason?: string }, ok?: string): void => {
      if (!r.ok) this.toast(r.reason ?? t('acct.failed'));
      else if (ok) this.toast(ok);
      this.load(true);
    };
    switch (d.acct) {
      case 'logout':
        void a.logout().then(() => {
          this.friends = this.club = this.found = null;
          this.loadedFor = null;
          this.rerender();
        });
        break;
      case 'sync':
        void this.host.syncNow().then((r) => {
          this.toast(r === 'ok' ? t('acct.synced') : r === 'conflict' ? t('acct.conflict') : t('acct.offline'));
          this.rerender();
        });
        break;
      case 'use-cloud':
        this.host.useCloudSave();
        this.rerender();
        break;
      case 'keep-device':
        void this.host.keepDeviceSave().then(() => this.rerender());
        break;
      case 'join':
        if (d.room && this.host.joinRoom(d.room)) this.toast(t('acct.joining'));
        break;
      case 'unfriend':
        void a.friendAction('remove', d.name ?? '').then((r) => done(r));
        break;
      case 'accept':
      case 'decline':
        void a.friendAction('respond', d.name ?? '', d.acct === 'accept').then((r) => done(r));
        break;
      case 'kick':
        void a.clubAction('kick', { name: d.name ?? '' }).then((r) => done(r));
        break;
      case 'leave-club':
        void a.clubAction('leave').then((r) => {
          this.club = null;
          done(r);
        });
        break;
      case 'join-club':
        void a.clubAction('join', { tag: d.tag ?? '' }).then((r) => {
          this.found = null;
          done(r, t('acct.welcomeClub'));
        });
        break;
    }
    return true;
  }

  /** Form submits inside the account screen; true when handled. */
  onSubmit(form: HTMLFormElement): boolean {
    const kind = form.dataset.form ?? '';
    if (!kind.startsWith('acct-')) return false;
    const f = new FormData(form);
    const v = (k: string): string => String(f.get(k) ?? '');
    const a = this.host.account;
    const after = (err: string | null, ok: string): void => {
      this.toast(err ?? ok);
      this.rerender();
    };
    switch (kind) {
      case 'acct-login':
        void a.login(v('name'), v('password')).then((err) => {
          after(err, t('acct.welcome', { name: a.name ?? '' }));
          if (!err) void this.host.syncNow().then(() => this.rerender());
        });
        break;
      case 'acct-register':
        if (v('password') !== v('again')) {
          this.toast(t('acct.mismatch'));
          break;
        }
        void a.register(v('name'), v('password')).then((err) => {
          after(err, t('acct.welcome', { name: a.name ?? '' }));
          if (!err) void this.host.syncNow().then(() => this.rerender());
        });
        break;
      case 'acct-password':
        void a.changePassword(v('current'), v('next')).then((err) => after(err, t('acct.passwordChanged')));
        break;
      case 'acct-delete':
        void a.deleteAccount(v('password')).then((err) => after(err, t('acct.deleted')));
        break;
      case 'acct-friend':
        void a.friendAction('request', v('name')).then((r) => {
          this.toast(r.ok ? (r.data?.friends ? t('acct.nowFriends') : t('acct.requestSent')) : (r.reason ?? t('acct.failed')));
          this.load(true);
        });
        break;
      case 'acct-club-create':
        void a.clubAction('create', { name: v('name'), tag: v('tag'), motto: v('motto') }).then((r) => {
          this.toast(r.ok ? t('acct.welcomeClub') : (r.reason ?? t('acct.failed')));
          this.load(true);
        });
        break;
      case 'acct-club-join':
        void a.clubAction('join', { tag: v('tag') }).then((r) => {
          this.toast(r.ok ? t('acct.welcomeClub') : (r.reason ?? t('acct.failed')));
          this.load(true);
        });
        break;
      case 'acct-club-find':
        void a.findClubs(v('q')).then((r) => {
          this.found = r.ok && r.data ? r.data.clubs : [];
          this.rerender();
        });
        break;
    }
    return true;
  }
}
