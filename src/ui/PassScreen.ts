import type { AccountClient } from '../net/Account';
import type { Profile } from '../gameplay/Profile';
import { brand } from '../brand/Brand';
import { apiUrl } from '../net/Api';
import { analytics } from '../net/Analytics';
import { t, type StringKey } from '../core/i18n';
import { itemLabel } from './names';
import {
  TIERS,
  XP_PER_TIER,
  challengeDone,
  challengeProgress,
  claimTier,
  freeReward,
  joinChallenge,
  joined,
  patronReward,
  seasonAt,
  seasonXp,
  settleChallenge,
  tierReached,
  passState,
  type SponsorChallenge,
  type TierReward,
} from '../gameplay/SeasonPass';

export interface PassHost {
  account: AccountClient;
  profile: Profile;
}

const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The sponsor challenges running now (from /api/config). */
export function liveChallenges(now = Date.now()): SponsorChallenge[] {
  return ((brand() as { challenges?: SponsorChallenge[] }).challenges ?? []).filter((c) => c.end > now);
}

/** Pay out every joined challenge that just reached its target; returns them. */
export function settleChallenges(p: Profile, now = Date.now()): SponsorChallenge[] {
  const done: SponsorChallenge[] = [];
  for (const c of liveChallenges(now))
    if (joined(p, c.id) && settleChallenge(p, c, now)) {
      analytics.track('challenge', { id: c.id, step: 'done' });
      done.push(c);
    }
  return done;
}

/**
 * Menu → Season pass: the free and Patron tracks, and sponsor challenges.
 * Everything a pass, a code or a sponsor gives is cosmetic (or earned ink).
 */
export class PassScreen {
  private tab: 'pass' | 'challenges' = 'pass';
  private patron = false;
  private checkedFor: string | null = null;

  constructor(
    private readonly host: PassHost,
    private readonly rerender: () => void,
    private readonly toast: (msg: string) => void,
  ) {}

  /** Ask the server whether this account is a Patron this season. */
  load(): void {
    const a = this.host.account;
    if (!a.signedIn) {
      this.patron = false;
      return;
    }
    const key = `${a.name}:${seasonAt().id}`;
    if (this.checkedFor === key) return;
    this.checkedFor = key;
    void a.call<{ patron: boolean }>('/api/store/me').then((r) => {
      this.patron = !!(r.ok && r.data?.patron);
      this.rerender();
    });
  }

  private rewardLabel(r: TierReward, claimed: boolean): string {
    if (r.item) return `${itemLabel(r.item)}${!claimed && this.host.profile.owns(r.item) ? ` <small>${t('pass.have')}</small>` : ''}`;
    return r.ink ? `💧 ${t('pass.ink', { ink: r.ink })}` : '—';
  }

  render(): string {
    const tabs = (['pass', 'challenges'] as const).map((k) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-pass-tab="${k}" aria-pressed="${this.tab === k}">${t(k === 'pass' ? 'pass.tabPass' : 'pass.tabChallenges')}</button>`).join('');
    return `<div class="tabs">${tabs}</div>${this.tab === 'pass' ? this.passTab() : this.challengesTab()}<p class="menu-hint">${t('pass.cosmeticOnly')}</p>`;
  }

  private passTab(): string {
    const p = this.host.profile;
    const s = seasonAt();
    const st = passState(p);
    const xp = seasonXp(p);
    const reached = tierReached(p);
    const days = Math.max(0, Math.ceil((s.end - Date.now()) / 86400_000));
    const into = reached >= TIERS ? XP_PER_TIER : xp - reached * XP_PER_TIER;
    const rows: string[] = [];
    for (let tier = 1; tier <= TIERS; tier++) {
      const open = tier <= reached;
      const cell = (track: 'free' | 'patron'): string => {
        const r = track === 'free' ? freeReward(tier, s.index) : patronReward(tier, s.index);
        const got = (track === 'free' ? st.claimed : st.patronClaimed).includes(tier);
        const can = open && !got && (track === 'free' || this.patron);
        const state = got ? `✓ ${t('pass.claimed')}` : !open ? `🔒 ${t('pass.locked')}` : track === 'patron' && !this.patron ? t('pass.patronOnly') : '';
        return `<div class="pass-cell ${track} ${got ? 'got' : ''} ${open ? 'open' : ''}"><span>${this.rewardLabel(r, got)}</span>${can ? `<button class="btn small primary" data-pass-claim="${tier}" data-track="${track}">${t('pass.claim')}</button>` : `<small>${state}</small>`}</div>`;
      };
      rows.push(`<div class="pass-row ${open ? 'open' : ''}"><b class="pass-tier">${tier}</b>${cell('free')}${cell('patron')}</div>`);
    }
    const patronBox = this.patron
      ? `<p class="fam-status">✦ ${t('pass.patronOn')}</p>`
      : `<div class="card"><p>${t('pass.patronOff')}</p>${
          this.host.account.signedIn
            ? `<form class="report-form row" data-form="pass-redeem"><input class="text-input" name="code" maxlength="20" autocomplete="off" aria-label="${t('pass.code')}" placeholder="XXXX-XXXX-XXXX"><button class="btn small" type="submit">${t('pass.redeem')}</button></form>`
            : `<p class="menu-hint">${t('pass.signIn')} <button class="btn small" data-nav="account">👤 ${t('acct.title')}</button></p>`
        }</div>`;
    return `<div class="card pass-head"><b>${t('pass.season', { n: s.index + 1, name: s.name })}</b> · <small>${t('pass.endsIn', { days })}</small>
        <div class="pass-tierline">${t('pass.tier', { n: reached, total: TIERS })}</div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${XP_PER_TIER}" aria-valuenow="${into}" aria-label="${t('pass.xp', { xp: into, need: XP_PER_TIER })}"><div style="width:${(into / XP_PER_TIER) * 100}%"></div></div>
        <small>${reached >= TIERS ? '★' : t('pass.xp', { xp: into, need: XP_PER_TIER })}</small>
        <p class="menu-hint">${t('pass.how')}</p></div>
      ${patronBox}
      <div class="pass-grid"><div class="pass-row head"><b></b><b>${t('pass.free')}</b><b>✦ ${t('pass.patron')}</b></div>${rows.join('')}</div>`;
  }

  private challengesTab(): string {
    const p = this.host.profile;
    const list = liveChallenges();
    if (!list.length) return `<p class="menu-hint">${t('pass.noChallenges')}</p>`;
    return `<div class="gal-grid">${list
      .map((c) => {
        const isIn = joined(p, c.id);
        const done = challengeDone(p, c.id);
        const prog = challengeProgress(p, c);
        const goal = t(`pass.kind.${c.kind}` as StringKey, { target: c.target });
        const reward = [c.ink ? `💧 ${c.ink}` : '', c.item ? itemLabel(c.item) : ''].filter(Boolean).join(' + ');
        const shown = c.kind === 'distance' ? prog.toFixed(1) : String(Math.floor(prog));
        return `<div class="card gal-card">
          ${c.sponsor.image ? `<img class="ch-logo" src="${esc(apiUrl(c.sponsor.image))}" alt="${esc(c.sponsor.name)}">` : ''}
          <b>${esc(c.title)}</b><small>${t('pass.by', { sponsor: esc(c.sponsor.name) })}</small>
          ${c.text ? `<p>${esc(c.text)}</p>` : ''}
          <p>🎯 ${goal}</p><p>${t('pass.reward', { reward })}</p>
          ${isIn ? `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${c.target}" aria-valuenow="${prog}" aria-label="${goal}"><div style="width:${(prog / c.target) * 100}%"></div></div><small>${done ? `✓ ${t('pass.done')}` : t('pass.progress', { n: shown, target: c.target })}</small>` : `<button class="btn small primary" data-pass-join="${esc(c.id)}">${t('pass.join')}</button>`}
          ${c.sponsor.url ? `<a class="btn small" href="${esc(c.sponsor.url)}" target="_blank" rel="noopener noreferrer sponsored" data-link="sponsor-logo" data-id="${esc(c.id)}">${t('pass.visit')}</a>` : ''}
        </div>`;
      })
      .join('')}</div>`;
  }

  onClick(el: HTMLElement): boolean {
    const d = el.dataset;
    const p = this.host.profile;
    if (d.passTab) {
      this.tab = d.passTab as 'pass' | 'challenges';
      this.rerender();
      return true;
    }
    if (d.passClaim) {
      const tier = Number(d.passClaim);
      const track = d.track === 'patron' ? 'patron' : 'free';
      const s = seasonAt();
      const r = track === 'free' ? freeReward(tier, s.index) : patronReward(tier, s.index);
      const res = claimTier(p, tier, track, this.patron);
      if (res === 'ok') this.toast(t('pass.got', { item: r.item ? itemLabel(r.item) : t('pass.ink', { ink: r.ink }) }));
      else if (res === 'patron-only') this.toast(t('pass.patronOnly'));
      this.rerender();
      return true;
    }
    if (d.passJoin) {
      const c = liveChallenges().find((x) => x.id === d.passJoin);
      if (c) {
        joinChallenge(p, c);
        analytics.track('challenge', { id: c.id, step: 'join' });
      }
      this.rerender();
      return true;
    }
    return false;
  }

  onSubmit(form: HTMLFormElement): boolean {
    if (form.dataset.form !== 'pass-redeem') return false;
    const code = String(new FormData(form).get('code') ?? '').trim();
    if (!code) return true;
    void this.host.account.call<{ season: string; patron: boolean }>('/api/store/redeem', 'POST', { code }).then((r) => {
      if (r.ok && r.data) {
        this.patron = r.data.patron;
        this.toast(t('pass.redeemed', { season: r.data.season }));
      } else this.toast(r.reason ?? t('gal.offline'));
      this.rerender();
    });
    return true;
  }
}
