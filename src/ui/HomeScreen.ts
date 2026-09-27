import type { AccountClient, Friend } from '../net/Account';
import type { Profile } from '../gameplay/Profile';
import type { MailClient, Postcard } from '../net/Mail';
import { t } from '../core/i18n';
import { POCKETS } from '../world/Pockets';
import { DEFAULT_HOME, HOME_ROOFS, HOME_WALLS, foundKeepsakes, shownKeepsakes, toggleKeepsake } from '../gameplay/Home';
import { filterChat } from '../net/ChatFilter';

export interface HomeHost {
  account: AccountClient;
  profile: Profile;
  mail: MailClient;
  /** The home layout changed: rebuild it in the world (and tell the server). */
  homeChanged(): void;
  /** Show a friend's home on the plot (null: back to yours); returns an error to show. */
  visitHome(name: string | null): Promise<string | null>;
  visiting(): string | null;
  /** The pinned postcards changed: refresh the pictures on the wall. */
  wallChanged(): void;
  /** The picture waiting to be sent from photo mode (JPEG data URL). */
  pendingPostcard(): string | null;
  clearPostcard(): void;
  /** How strictly chat-like text from others is filtered. */
  chatMode(): 'filtered' | 'on' | 'off';
}

export type HomeMode = 'mailbox' | 'home' | 'postcard';

const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const KEEPSAKE_ICON: Record<string, string> = { picnic: '🧺', shrine: '⛩', easel: '🎨', cats: '🐈', hammock: '🌴', lookout: '🔭', bottle: '🍾', stones: '🪨', campfire: '🔥', books: '📚' };
const WALL_LIMIT = 6;

/**
 * Harbour Town's mailbox (postcards from friends: read, pin to your wall,
 * delete), your home (colours, keepsakes, visiting friends), and sending a
 * photo as a postcard.
 */
export class HomeScreen {
  private cards: Postcard[] | null = null;
  private error = '';
  private friends: Friend[] | null = null;
  private busy = false;

  constructor(
    private readonly host: HomeHost,
    private readonly rerender: () => void,
    private readonly toast: (m: string) => void,
  ) {}

  /** Fetch what the screen needs when it opens. */
  load(mode: HomeMode): void {
    const a = this.host.account;
    if (!a.signedIn) return;
    if (mode === 'mailbox') void this.refreshInbox();
    if ((mode === 'home' || mode === 'postcard') && !this.friends)
      void a.friends().then((r) => {
        this.friends = r.ok && r.data ? r.data.friends : [];
        this.rerender();
      });
  }

  private async refreshInbox(): Promise<void> {
    const r = await this.host.mail.inbox();
    if (typeof r === 'string') {
      this.error = r;
      this.cards = null;
    } else {
      this.error = '';
      this.cards = r;
      // Pictures arrive one by one; redraw as they do.
      for (const c of r) this.watch(c.id);
    }
    this.rerender();
  }

  render(mode: HomeMode): string {
    if (mode === 'postcard') return this.sendView();
    if (mode === 'home') return this.homeView();
    return this.mailboxView();
  }

  private signInFirst(): string {
    return `<p class="menu-hint">${t('mail.signIn')}</p><div class="row"><button class="btn primary" data-nav="account">${t('acct.title')}</button></div>`;
  }

  private mailboxView(): string {
    if (!this.host.account.signedIn) return this.signInFirst();
    if (this.error) return `<p class="menu-hint">${esc(this.error)}</p><button class="btn" data-home="reload">↻</button>`;
    if (!this.cards) return `<p class="menu-hint">…</p>`;
    if (!this.cards.length) return `<p class="menu-hint">${t('mail.empty')}</p>`;
    const pinned = this.cards.filter((c) => c.pinned).length;
    const filtered = this.host.chatMode() !== 'on';
    const rows = this.cards
      .map((c) => {
        const img = this.picSrc(c.id);
        const text = filtered ? filterChat(c.text) : c.text;
        return `<div class="card postcard ${c.pinned ? 'pinned' : ''}">
          ${img ? `<img src="${img}" alt="${esc(t('mail.from', { name: c.from }))}">` : '<div class="postcard-blank">✉</div>'}
          <div><b>${esc(t('mail.from', { name: c.from }))}</b> <small>${new Date(c.at).toLocaleDateString()}</small>${text ? `<p>${esc(text)}</p>` : ''}</div>
          <div class="row"><button class="btn small ${c.pinned ? 'primary' : ''}" data-home-pin="${c.id}" aria-pressed="${c.pinned}">📌 ${c.pinned ? t('mail.unpin') : t('mail.pin')}</button><button class="btn small" data-home-delete="${c.id}" aria-label="${t('mail.delete')}">🗑</button></div>
        </div>`;
      })
      .join('');
    return `<p class="menu-hint">${t('mail.hint', { n: pinned, max: WALL_LIMIT })}</p><div class="postcard-list">${rows}</div>`;
  }

  /** The loaded picture's address, if it has arrived. */
  private picSrc(id: string): string | null {
    const src = this.loaded.get(id);
    if (!src) this.watch(id);
    return src ?? null;
  }

  private readonly loaded = new Map<string, string>();
  private watch(id: string): void {
    void this.host.mail.picture(id).then((img) => {
      if (img && !this.loaded.has(id)) {
        this.loaded.set(id, img.src);
        this.rerender();
      }
    });
  }

  private homeView(): string {
    const p = this.host.profile;
    const layout = p.data.home ?? DEFAULT_HOME;
    const visiting = this.host.visiting();
    const found = foundKeepsakes(p.data.seen);
    const shown = shownKeepsakes(layout, p.data.seen);
    const swatch = (key: 'walls' | 'roof', c: string): string => `<button class="swatch ${layout[key] === c ? 'on' : ''}" style="--c:${c}" data-home-colour="${key}" data-value="${c}" aria-label="${c}" aria-pressed="${layout[key] === c}"></button>`;
    const kinds = [...new Set(POCKETS.map((q) => q.kind))];
    const keepsakes = kinds
      .map((k) => {
        const have = found.includes(k);
        const on = shown.includes(k);
        return have
          ? `<button class="sticker got keepsake ${on ? 'on' : ''}" data-home-keepsake="${k}" aria-pressed="${on}"><b aria-hidden="true">${KEEPSAKE_ICON[k] ?? '★'}</b><small>${t(`keep.${k}` as 'keep.cats')}</small></button>`
          : `<span class="sticker"><b aria-hidden="true">?</b><small>${t('st.unknown')}</small></span>`;
      })
      .join('');
    const friends = !this.host.account.signedIn
      ? `<p class="menu-hint">${t('home.signIn')}</p>`
      : !this.friends
        ? '<p class="menu-hint">…</p>'
        : this.friends.length
          ? `<div class="row wrap">${this.friends.map((f) => `<button class="btn small" data-home-visit="${esc(f.name)}">🏡 ${esc(f.name)}</button>`).join('')}</div>`
          : `<p class="menu-hint">${t('home.noFriends')}</p>`;
    return `${visiting ? `<div class="card"><b>${esc(t('home.visiting', { name: visiting }))}</b> <button class="btn small primary" data-home-visit="">${t('home.back')}</button></div>` : ''}
      <p class="menu-hint">${t('home.hint')}</p>
      <h4>${t('home.walls')}</h4><div class="swatches">${HOME_WALLS.map((c) => swatch('walls', c)).join('')}</div>
      <h4>${t('home.roof')}</h4><div class="swatches">${HOME_ROOFS.map((c) => swatch('roof', c)).join('')}</div>
      <h4>${t('home.keepsakes', { n: found.length, total: kinds.length })}</h4><div class="sticker-grid">${keepsakes}</div>
      <p class="menu-hint">${t('home.trophies', { n: p.data.trophies.length })}</p>
      <div class="row"><button class="btn" data-nav="mailbox">📬 ${t('mail.title')}</button></div>
      <h4>${t('home.visit')}</h4>${friends}`;
  }

  private sendView(): string {
    const img = this.host.pendingPostcard();
    if (!img) return `<p class="menu-hint">${t('mail.noPicture')}</p>`;
    if (!this.host.account.signedIn) return `<img class="postcard-preview" src="${img}" alt="">${this.signInFirst()}`;
    const me = this.host.account.name ?? '';
    const options = [...(this.friends ?? []).map((f) => f.name), me].map((n) => `<option value="${esc(n)}">${esc(n === me ? t('mail.toMe') : n)}</option>`).join('');
    return `<img class="postcard-preview" src="${img}" alt="${t('mail.preview')}">
      <form data-form="postcard" class="stack">
        <label>${t('mail.to')} <select name="to" class="text-input">${options}</select></label>
        <label>${t('mail.message')} <input name="text" class="text-input" maxlength="140" placeholder="${t('mail.placeholder')}"></label>
        <div class="row"><button class="btn primary" type="submit" ${this.busy ? 'disabled' : ''}>💌 ${t('mail.send')}</button></div>
      </form>
      <p class="menu-hint">${t('mail.sendHint')}</p>`;
  }

  onClick(el: HTMLElement): boolean {
    const d = el.dataset;
    const p = this.host.profile;
    if (d.home === 'reload') {
      void this.refreshInbox();
      return true;
    }
    if (d.homePin) {
      const card = this.cards?.find((c) => c.id === d.homePin);
      if (!card) return true;
      void this.host.mail.pin(card.id, !card.pinned).then((err) => {
        if (err) this.toast(err);
        else {
          card.pinned = !card.pinned;
          this.host.wallChanged();
        }
        this.rerender();
      });
      return true;
    }
    if (d.homeDelete) {
      const id = d.homeDelete;
      void this.host.mail.remove(id).then((err) => {
        if (err) this.toast(err);
        else {
          const was = this.cards?.find((c) => c.id === id)?.pinned;
          this.cards = this.cards?.filter((c) => c.id !== id) ?? null;
          if (was) this.host.wallChanged();
        }
        this.rerender();
      });
      return true;
    }
    if (d.homeColour) {
      const layout = p.data.home ?? DEFAULT_HOME;
      p.data.home = { ...layout, [d.homeColour]: d.value };
      p.save();
      this.host.homeChanged();
      this.rerender();
      return true;
    }
    if (d.homeKeepsake) {
      p.data.home = toggleKeepsake(p.data.home ?? DEFAULT_HOME, d.homeKeepsake as never, p.data.seen);
      p.save();
      this.host.homeChanged();
      this.rerender();
      return true;
    }
    if (d.homeVisit !== undefined) {
      void this.host.visitHome(d.homeVisit || null).then((err) => {
        if (err) this.toast(err);
        this.rerender();
      });
      return true;
    }
    return false;
  }

  onSubmit(form: HTMLFormElement): boolean {
    if (form.dataset.form !== 'postcard') return false;
    const img = this.host.pendingPostcard();
    const f = new FormData(form);
    const to = String(f.get('to') ?? '');
    if (!img || !to || this.busy) return true;
    this.busy = true;
    this.rerender();
    void this.host.mail.send(to, img, String(f.get('text') ?? '').slice(0, 140)).then((err) => {
      this.busy = false;
      if (err) this.toast(err);
      else {
        this.toast(t('mail.sent', { name: to === this.host.account.name ? t('mail.toMe') : to }));
        this.host.profile.addStat('postcards');
        this.host.clearPostcard();
        if (to === this.host.account.name) this.cards = null;
      }
      this.rerender();
    });
    return true;
  }
}
