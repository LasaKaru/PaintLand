import { EMOTES, type Emote } from '../models/Human';
import { t, type StringKey } from '../core/i18n';

const ICONS: Record<Emote, string> = {
  wave: '👋',
  ayubowan: '🙏',
  cheer: '🙌',
  dance: '💃',
  clap: '👏',
  bow: '🙇',
  laugh: '😄',
  sitdown: '🪑',
};

export const emoteLabel = (e: Emote): string => t(`emote.${e}` as StringKey);

/**
 * The emote wheel: eight emotes in a ring. Pick with the mouse, a tap, the
 * number keys 1–8 or Tab/arrows + Enter; Escape (or the emote key again)
 * closes it.
 */
export class EmoteWheel {
  private readonly root = document.createElement('div');
  private onPick: ((e: Emote) => void) | null = null;
  private restoreFocus: HTMLElement | null = null;

  constructor(parent: HTMLElement) {
    this.root.className = 'emote-wheel hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    parent.appendChild(this.root);
    this.root.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-emote]');
      if (b) this.pick(b.dataset.emote as Emote);
      else if (ev.target === this.root) this.close();
    });
    window.addEventListener('keydown', this.onKey, true);
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(onPick: (e: Emote) => void): void {
    this.onPick = onPick;
    this.restoreFocus = document.activeElement as HTMLElement | null;
    const n = EMOTES.length;
    this.root.setAttribute('aria-label', t('emote.title'));
    this.root.innerHTML = `<div class="emote-ring">${EMOTES.map((e, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return `<button class="emote-slot" data-emote="${e}" style="left:calc(50% + ${Math.cos(a) * 118}px);top:calc(50% + ${Math.sin(a) * 118}px)"><span class="emote-icon" aria-hidden="true">${ICONS[e]}</span><span>${emoteLabel(e)}</span><kbd>${i + 1}</kbd></button>`;
    }).join('')}<div class="emote-centre">${t('emote.title')}</div></div>`;
    this.root.classList.remove('hidden');
    this.root.querySelector<HTMLButtonElement>('[data-emote]')?.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    this.onPick = null;
    this.restoreFocus?.focus?.();
  }

  private pick(e: Emote): void {
    const cb = this.onPick;
    this.close();
    cb?.(e);
  }

  private readonly onKey = (ev: KeyboardEvent): void => {
    if (!this.isOpen) return;
    const n = Number(ev.key);
    if (Number.isInteger(n) && n >= 1 && n <= EMOTES.length) this.pick(EMOTES[n - 1]);
    else if (ev.key === 'Escape') this.close();
    else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' || ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
      const slots = [...this.root.querySelectorAll<HTMLButtonElement>('[data-emote]')];
      const i = slots.indexOf(document.activeElement as HTMLButtonElement);
      const step = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : -1;
      slots[(i + step + slots.length) % slots.length]?.focus();
    } else return; // Enter/Space click the focused button; Tab moves focus.
    ev.preventDefault();
    ev.stopImmediatePropagation();
  };
}
