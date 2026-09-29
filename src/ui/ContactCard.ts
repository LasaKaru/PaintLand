import { t } from '../core/i18n';

/** The address (and subject) in a mailto: link, or null if it is not one. */
export function parseMailto(url: string): { email: string; subject: string } | null {
  if (!/^mailto:/i.test(url)) return null;
  const rest = url.slice(7);
  const q = rest.indexOf('?');
  const email = decodeURIComponent(q < 0 ? rest : rest.slice(0, q)).trim();
  let subject = '';
  if (q >= 0) {
    const m = /(?:^|&)subject=([^&]*)/i.exec(rest.slice(q + 1));
    if (m) {
      try {
        subject = decodeURIComponent(m[1].replace(/\+/g, ' '));
      } catch {
        subject = m[1];
      }
    }
  }
  return /^[^\s@<>"]+@[^\s@<>"]+$/.test(email) ? { email, subject } : null;
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Show the support / sponsorship address in the game instead of opening a
 * mail program or browser: the address, what to write about, and a Copy button.
 */
export function showContactCard(email: string, subject = ''): void {
  document.querySelector('.contact-dialog')?.remove();
  const d = document.createElement('dialog');
  d.className = 'contact-dialog';
  d.innerHTML = `<form method="dialog">
      <h3 class="hand" tabindex="-1" autofocus>✉ ${esc(t('contact.title'))}</h3>
      <p>${esc(t('contact.body'))}</p>
      <p class="contact-email"><code>${esc(email)}</code></p>
      ${subject ? `<p class="menu-hint">${esc(t('contact.subject', { subject }))}</p>` : ''}
      <div class="contact-actions">
        <button type="button" class="btn primary" data-copy>📋 ${esc(t('contact.copy'))}</button>
        <button class="btn">✕ ${esc(t('priv.close'))}</button>
      </div>
    </form>`;
  document.body.appendChild(d);
  const copy = d.querySelector<HTMLButtonElement>('[data-copy]')!;
  copy.addEventListener('click', () => {
    const done = (): void => {
      copy.textContent = `✓ ${t('contact.copied')}`;
    };
    const fallback = (): void => {
      // Select the address so it can be copied by hand.
      const code = d.querySelector('code');
      if (code) window.getSelection()?.selectAllChildren(code);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(email).then(done, fallback);
    else fallback();
  });
  d.addEventListener('close', () => d.remove());
  d.showModal();
}
