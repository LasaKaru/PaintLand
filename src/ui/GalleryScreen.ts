import type { AccountClient } from '../net/Account';
import type { Profile } from '../gameplay/Profile';
import { decodeRoad, type CustomRoad } from '../creator/CustomRoad';
import { t, type StringKey } from '../core/i18n';

export interface GalleryRoad {
  id: string;
  code: string;
  title: string;
  author: string;
  week: string;
  plays: number;
  count: number;
  avg: number;
  mine: boolean;
  myStars: number;
}

interface Contest {
  week: string;
  theme: string;
  endsAt: number;
  top: GalleryRoad[];
  winners: { week: string; theme: string; list: { id: string; title: string; author: string; avg: number; count: number }[] };
}

export interface GalleryHost {
  account: AccountClient;
  profile: Profile;
  testRoad(road: CustomRoad): void;
}

type Sort = 'top' | 'new' | 'week';

/** Weekly contest prizes (ink) for 1st, 2nd and 3rd. */
export const CONTEST_PRIZES = [300, 200, 100];

/** The server's English theme names → translation keys. */
const THEME_KEYS: Record<string, StringKey> = {
  'Longest ride': 'gal.th.long',
  'Loop-the-loops': 'gal.th.loops',
  'Seaside cruise': 'gal.th.sea',
  'Mountain pass': 'gal.th.mountain',
  'Night drive': 'gal.th.night',
  'Festival road': 'gal.th.festival',
  'Rolls and twists': 'gal.th.rolls',
  'Short and sweet': 'gal.th.short',
};
export const themeLabel = (theme: string): string => (THEME_KEYS[theme] ? t(THEME_KEYS[theme]) : theme);

const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Menu → Road gallery: roads other players made in the Road Studio. Play
 * them, rate them with stars, and see this week's contest.
 */
export class GalleryScreen {
  private sort: Sort = 'top';
  private roads: GalleryRoad[] | null = null;
  private contest: Contest | null = null;
  private page = 0;
  private more = false;
  private query = '';
  private error: string | null = null;
  private busy = false;

  constructor(
    private readonly host: GalleryHost,
    private readonly rerender: () => void,
    private readonly toast: (msg: string) => void,
  ) {}

  /** Fetch the list and the contest (when the screen opens, or after a change). */
  load(): void {
    if (this.busy) return;
    this.busy = true;
    const a = this.host.account;
    const q = `/api/gallery?sort=${this.sort}&page=${this.page}&q=${encodeURIComponent(this.query)}`;
    void Promise.all([a.call<{ roads: GalleryRoad[]; more: boolean }>(q), a.call<Contest>('/api/gallery/contest')]).then(([list, contest]) => {
      this.busy = false;
      this.error = list.ok && list.data ? null : (list.reason ?? t('gal.offline'));
      if (list.ok && list.data) {
        this.roads = list.data.roads;
        this.more = list.data.more;
      }
      if (contest.ok && contest.data) {
        this.contest = contest.data;
        this.checkPrize(contest.data);
      }
      this.rerender();
    });
  }

  /** Your road placed last week: a one-time ink prize. */
  private checkPrize(c: Contest): void {
    const me = this.host.account.name;
    if (!me) return;
    const place = c.winners.list.findIndex((w) => w.author === me);
    const key = `contest:${c.winners.week}`;
    const p = this.host.profile;
    if (place < 0 || p.data.seen.includes(key)) return;
    p.data.seen.push(key);
    p.earn(CONTEST_PRIZES[place]);
    this.toast(t('gal.won', { place: place + 1, ink: CONTEST_PRIZES[place] }));
  }

  publish(code: string): void {
    const a = this.host.account;
    if (!a.signedIn) {
      this.toast(t('gal.signIn'));
      return;
    }
    void a.call<{ id: string }>('/api/gallery/publish', 'POST', { code }).then((r) => {
      this.toast(r.ok ? t('gal.published') : (r.reason ?? t('gal.offline')));
      if (r.ok) {
        this.sort = 'new';
        this.page = 0;
        this.roads = null;
      }
    });
  }

  render(): string {
    if (!this.roads && !this.busy && !this.error) this.load();
    const c = this.contest;
    const tabs = (['top', 'new', 'week'] as Sort[]).map((s) => `<button class="tab ${s === this.sort ? 'on' : ''}" data-gal-sort="${s}" aria-pressed="${s === this.sort}">${t(`gal.sort.${s}` as StringKey)}</button>`).join('');
    const days = c ? Math.max(0, Math.ceil((c.endsAt - Date.now()) / 86400_000)) : 0;
    const contest = c
      ? `<div class="card gal-contest"><b>🏁 ${t('gal.contest')}: ${esc(themeLabel(c.theme))}</b> · <small>${t('gal.endsIn', { days })}</small>
        <p class="menu-hint">${t('gal.contestHint')}</p>
        ${c.winners.list.length ? `<p><b>${t('gal.lastWinners', { theme: esc(themeLabel(c.winners.theme)) })}</b> ${c.winners.list.map((w, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(w.title)} — ${esc(w.author)}`).join(' · ')}</p>` : ''}</div>`
      : '';
    const cards = (this.roads ?? [])
      .map((r) => {
        const stars = [1, 2, 3, 4, 5]
          .map((n) => `<button class="star ${n <= r.myStars ? 'on' : ''}" data-gal-rate="${r.id}" data-stars="${n}" aria-label="${t('gal.rateN', { n })}" ${r.mine ? 'disabled' : ''}>★</button>`)
          .join('');
        return `<div class="card gal-card"><b>${esc(r.title)}</b><small>${t('gal.by', { name: esc(r.author) })}</small>
          <div class="gal-meta">★ ${r.count ? r.avg.toFixed(1) : '–'} <small>(${r.count})</small> · ▶ ${r.plays}</div>
          <div class="gal-stars" role="group" aria-label="${t('gal.rate')}">${stars}</div>
          <div class="row wrap"><button class="btn small primary" data-gal-play="${r.id}">▶ ${t('gal.play')}</button>
          ${r.mine ? `<button class="btn small" data-gal-delete="${r.id}">🗑 ${t('gal.delete')}</button>` : `<button class="btn small" data-gal-report="${r.id}">⚑ ${t('rp.report')}</button>`}</div></div>`;
      })
      .join('');
    const empty = this.roads && !this.roads.length ? `<p class="menu-hint">${t('gal.empty')}</p>` : '';
    return `${this.host.account.signedIn ? '' : `<p class="fam-status">${t('gal.signInHint')} <button class="btn small" data-nav="account">👤 ${t('acct.title')}</button></p>`}
      ${contest}
      <div class="tabs">${tabs}</div>
      <form class="report-form row" data-form="gal-search"><input class="text-input" name="q" maxlength="30" value="${esc(this.query)}" aria-label="${t('gal.search')}" placeholder="${t('gal.search')}"><button class="btn small" type="submit">${t('acct.search')}</button></form>
      ${this.error ? `<p class="fam-status" role="status">${esc(this.error)}</p>` : ''}
      ${this.busy && !this.roads ? `<p class="menu-hint">…</p>` : ''}
      <div class="gal-grid">${cards}</div>${empty}
      <div class="row">${this.page > 0 ? `<button class="btn small" data-gal-page="-1">← ${t('gal.prev')}</button>` : ''}${this.more ? `<button class="btn small" data-gal-page="1">${t('gal.next')} →</button>` : ''}</div>
      <p class="menu-hint">${t('gal.howTo')} <button class="btn small" data-nav="roadstudio">🛣 ${t('rs.title')}</button></p>`;
  }

  onClick(el: HTMLElement): boolean {
    const d = el.dataset;
    const a = this.host.account;
    const find = (id?: string): GalleryRoad | undefined => this.roads?.find((r) => r.id === id);
    if (d.galSort) {
      this.sort = d.galSort as Sort;
      this.page = 0;
      this.load();
      return true;
    }
    if (d.galPage) {
      this.page = Math.max(0, this.page + Number(d.galPage));
      this.load();
      return true;
    }
    if (d.galPlay) {
      const r = find(d.galPlay);
      const road = r ? decodeRoad(r.code) : null;
      if (!road) {
        this.toast(t('rs.bad'));
        return true;
      }
      void a.call('/api/gallery/play', 'POST', { id: r!.id });
      this.host.testRoad(road);
      return true;
    }
    if (d.galRate) {
      if (!a.signedIn) {
        this.toast(t('gal.signIn'));
        return true;
      }
      void a.call<{ road: GalleryRoad }>('/api/gallery/rate', 'POST', { id: d.galRate, stars: Number(d.stars) }).then((res) => {
        if (!res.ok || !res.data) return this.toast(res.reason ?? t('gal.offline'));
        this.roads = (this.roads ?? []).map((r) => (r.id === res.data!.road.id ? res.data!.road : r));
        this.toast(t('gal.thanks'));
        this.rerender();
      });
      return true;
    }
    if (d.galReport) {
      if (!a.signedIn) {
        this.toast(t('gal.signIn'));
        return true;
      }
      void a.call('/api/gallery/report', 'POST', { id: d.galReport }).then((res) => {
        this.toast(res.ok ? t('rp.sent') : (res.reason ?? t('gal.offline')));
        this.load();
      });
      return true;
    }
    if (d.galDelete) {
      void a.call('/api/gallery/delete', 'POST', { id: d.galDelete }).then((res) => {
        if (!res.ok) this.toast(res.reason ?? t('gal.offline'));
        this.load();
      });
      return true;
    }
    return false;
  }

  onSubmit(form: HTMLFormElement): boolean {
    if (form.dataset.form !== 'gal-search') return false;
    this.query = String(new FormData(form).get('q') ?? '').trim();
    this.page = 0;
    this.load();
    return true;
  }
}
