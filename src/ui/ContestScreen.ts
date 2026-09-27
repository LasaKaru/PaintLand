import type { AccountClient } from '../net/Account';
import type { Profile } from '../gameplay/Profile';
import { apiUrl } from '../net/Api';
import { t } from '../core/i18n';

export interface ContestEntry {
  id: string;
  name: string;
  caption: string;
  votes: number;
  mine: boolean;
  voted: boolean;
}

export interface ContestState {
  week: string;
  theme: string;
  endsAt: number;
  entries: ContestEntry[];
  myVotes: number;
  winner: { id: string; name: string; caption: string; week: string } | null;
}

export interface ContestHost {
  account: AccountClient;
  profile: Profile;
  /** A photo waiting to be entered (JPEG data URL), from photo mode. */
  pendingEntry(): string | null;
  clearEntry(): void;
}

const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const VOTES_PER_WEEK = 3;
export const photoUrl = (id: string): string => apiUrl(`/api/photos/${id}.jpg`);

/** Menu → Photo contest: this week's theme and entries (vote for 3), your entry, last week's winner. */
export class ContestScreen {
  private state: ContestState | null = null;
  private error = '';
  private busy = false;

  constructor(
    private readonly host: ContestHost,
    private readonly rerender: () => void,
    private readonly toast: (m: string) => void,
  ) {}

  load(): void {
    void this.host.account.call<ContestState>('/api/photos').then((r) => {
      if (r.ok && r.data) {
        this.state = r.data;
        this.error = '';
      } else this.error = r.reason ?? 'offline';
      this.rerender();
    });
  }

  render(): string {
    const st = this.state;
    const pending = this.host.pendingEntry();
    const signedIn = this.host.account.signedIn;
    const entryForm = pending
      ? `<div class="card"><img class="postcard-preview" src="${pending}" alt="${t('pc.yourEntry')}">
          ${signedIn
            ? `<form data-form="contest" class="stack"><label>${t('pc.caption')} <input name="caption" class="text-input" maxlength="80" placeholder="${t('pc.captionHint')}"></label><div class="row"><button class="btn primary" type="submit" ${this.busy ? 'disabled' : ''}>🏆 ${t('pc.enter')}</button></div></form>`
            : `<p class="menu-hint">${t('pc.signIn')}</p><button class="btn primary" data-nav="account">${t('acct.title')}</button>`}</div>`
      : `<p class="menu-hint">${t('pc.how')}</p>`;
    if (this.error) return `${entryForm}<p class="menu-hint">${esc(this.error)}</p><button class="btn" data-contest="reload">↻</button>`;
    if (!st) return `${entryForm}<p class="menu-hint">…</p>`;
    const days = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 86400_000));
    const winner = st.winner
      ? `<div class="card contest-winner"><h4>🏆 ${t('pc.lastWinner')}</h4><img src="${photoUrl(st.winner.id)}" alt="${esc(st.winner.caption || st.winner.name)}"><p><b>${esc(st.winner.name)}</b>${st.winner.caption ? ` · ${esc(st.winner.caption)}` : ''}</p><p class="menu-hint">${t('pc.billboard')}</p></div>`
      : '';
    const entries = st.entries.length
      ? `<div class="postcard-list">${st.entries
          .map(
            (e) => `<div class="card postcard ${e.mine ? 'pinned' : ''}"><img src="${photoUrl(e.id)}" alt="${esc(e.caption || e.name)}" loading="lazy">
              <div><b>${esc(e.name)}</b>${e.caption ? `<p>${esc(e.caption)}</p>` : ''}<small>♥ ${e.votes}</small></div>
              <div class="row">${e.mine ? `<span class="menu-hint">${t('pc.mine')}</span>` : signedIn ? `<button class="btn small ${e.voted ? 'primary' : ''}" data-contest-vote="${e.id}" aria-pressed="${e.voted}">♥ ${e.voted ? t('pc.voted') : t('pc.vote')}</button><button class="btn small" data-contest-report="${e.id}" aria-label="${t('pc.report')}">⚑</button>` : ''}</div></div>`,
          )
          .join('')}</div>`
      : `<p class="menu-hint">${t('pc.none')}</p>`;
    return `<p class="menu-hint">${t('pc.theme', { theme: esc(st.theme), days })}</p>${entryForm}${winner}
      <h4>${t('pc.entries')} ${signedIn ? `<small>(${t('pc.votesLeft', { n: Math.max(0, VOTES_PER_WEEK - st.myVotes) })})</small>` : ''}</h4>${entries}`;
  }

  onClick(el: HTMLElement): boolean {
    const d = el.dataset;
    if (d.contest === 'reload') {
      this.load();
      return true;
    }
    if (d.contestVote) {
      const e = this.state?.entries.find((x) => x.id === d.contestVote);
      if (!e) return true;
      void this.host.account.call<{ votes: number }>('/api/photos/vote', 'POST', { id: e.id, on: !e.voted }).then((r) => {
        if (!r.ok) this.toast(r.reason ?? 'offline');
        this.load();
      });
      return true;
    }
    if (d.contestReport) {
      void this.host.account.call('/api/photos/report', 'POST', { id: d.contestReport }).then((r) => {
        this.toast(r.ok ? t('pc.reported') : r.reason ?? 'offline');
        this.load();
      });
      return true;
    }
    return false;
  }

  onSubmit(form: HTMLFormElement): boolean {
    if (form.dataset.form !== 'contest') return false;
    const image = this.host.pendingEntry();
    if (!image || this.busy) return true;
    this.busy = true;
    this.rerender();
    const caption = String(new FormData(form).get('caption') ?? '').slice(0, 80);
    void this.host.account.call('/api/photos/enter', 'POST', { image, caption }).then((r) => {
      this.busy = false;
      if (r.ok) {
        this.toast(t('pc.entered'));
        this.host.clearEntry();
        this.host.profile.addStat('contestEntries');
      } else this.toast(r.reason ?? 'offline');
      this.load();
    });
    return true;
  }
}
