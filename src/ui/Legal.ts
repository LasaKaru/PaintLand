import { brand, inDesktopApp } from '../brand/Brand';
import { t } from '../core/i18n';

/** The legal pages in public/, each opened over the game in a dialog. */
export type LegalDoc = 'privacy' | 'terms' | 'rules' | 'licenses';

const TITLE: Record<LegalDoc, 'priv.link' | 'legal.terms' | 'legal.rules' | 'legal.licenses'> = { privacy: 'priv.link', terms: 'legal.terms', rules: 'legal.rules', licenses: 'legal.licenses' };
const HEALTH_SEEN = 'paintland.healthSeen';
const TERMS_ACCEPTED = 'paintland.termsAccepted';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: asked again next time */
  }
}

/** The owner's details for the pages (public/legal.js writes them in as plain text). */
export function legalQuery(): string {
  const b = brand();
  const q = new URLSearchParams({ entity: b.legal.entity, country: b.legal.country, age: String(b.legal.minAge), updated: b.legal.updated });
  if (b.company.contact) q.set('contact', b.company.contact);
  return q.toString();
}

/**
 * A modal dialog. Focus starts on its heading (autofocus), not a button, so the
 * key press that opened it (Enter on the splash or a menu item) cannot also answer it.
 */
function dialog(className: string, html: string): HTMLDialogElement {
  document.querySelector(`.${className}`)?.remove();
  const d = document.createElement('dialog');
  d.className = className;
  d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return d;
}

/** A legal page in a dialog over the game (it also works inside the desktop app). */
export function showDoc(doc: LegalDoc): void {
  dialog('privacy-dialog', `<form method="dialog"><button class="btn small" aria-label="${t('priv.close')}">✕ ${t('priv.close')}</button></form><iframe src="${doc}.html?${esc(legalQuery())}" title="${esc(t(TITLE[doc]))}"></iframe>`);
}

/** The health and photosensitivity notice. */
export function showHealthWarning(onClose?: () => void): void {
  const d = dialog(
    'legal-dialog health-dialog',
    `<form method="dialog">
      <h3 class="hand" tabindex="-1" autofocus>⚠ ${esc(t('health.title'))}</h3>
      <p>${esc(t('health.photo'))}</p>
      <p>${esc(t('health.stop'))}</p>
      <p>${esc(t('health.breaks'))}</p>
      <p class="menu-hint">${esc(t('health.settings'))}</p>
      <div class="contact-actions"><button class="btn primary">${esc(t('health.ok'))}</button></div>
    </form>`,
  );
  d.addEventListener('close', () => onClose?.());
}

/** The first time the game starts (if the owner has the notice on). */
export function maybeHealthWarning(): void {
  if (!brand().legal.healthWarning || get(HEALTH_SEEN)) return;
  showHealthWarning(() => set(HEALTH_SEEN, '1'));
}

/** True when online features should first ask for the current terms. */
export function needsTerms(): boolean {
  const l = brand().legal;
  return l.termsForOnline && get(TERMS_ACCEPTED) !== l.updated;
}

/**
 * Before the first online feature: the Terms of Use and Community Rules, and
 * an "I agree". Declining keeps the offline game fully playable.
 */
export function requireTerms(onAccept: () => void): void {
  if (!needsTerms()) return onAccept();
  const l = brand().legal;
  const d = dialog(
    'legal-dialog terms-dialog',
    `<form method="dialog">
      <h3 class="hand" tabindex="-1" autofocus>🤝 ${esc(t('terms.title'))}</h3>
      <p>${esc(t('terms.body'))}</p>
      <div class="row wrap"><button type="button" class="btn small" data-doc="terms">📜 ${esc(t('legal.terms'))}</button><button type="button" class="btn small" data-doc="rules">🌿 ${esc(t('legal.rules'))}</button><button type="button" class="btn small" data-doc="privacy">🔒 ${esc(t('priv.link'))}</button></div>
      <label class="check"><input type="checkbox" name="agree"> ${esc(t('terms.agree', { age: l.minAge }))}</label>
      <div class="contact-actions"><button class="btn" value="no">${esc(t('terms.notNow'))}</button><button class="btn primary" value="yes" data-accept disabled>${esc(t('terms.accept'))}</button></div>
    </form>`,
  );
  const accept = d.querySelector<HTMLButtonElement>('[data-accept]')!;
  d.querySelector<HTMLInputElement>('input[name="agree"]')!.addEventListener('change', (e) => {
    accept.disabled = !(e.target as HTMLInputElement).checked;
  });
  for (const b of d.querySelectorAll<HTMLButtonElement>('[data-doc]')) b.addEventListener('click', () => showDoc(b.dataset.doc as LegalDoc));
  d.addEventListener('close', () => {
    if (d.returnValue !== 'yes') return;
    set(TERMS_ACCEPTED, l.updated);
    onAccept();
  });
}

/** Coffee and funding links are hidden in the desktop (Steam) app when the owner says so. */
export function donationsShown(): boolean {
  return !(inDesktopApp() && brand().legal.hideDonationsInApp);
}

interface DesktopBridge {
  quit?: () => Promise<unknown>;
}

/** The desktop app can be closed from the menu. */
export function canQuit(): boolean {
  return typeof (globalThis as { paintlandDesktop?: DesktopBridge }).paintlandDesktop?.quit === 'function';
}

export function quitApp(): void {
  void (globalThis as { paintlandDesktop?: DesktopBridge }).paintlandDesktop?.quit?.();
}
