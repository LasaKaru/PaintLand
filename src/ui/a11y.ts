import { t } from '../core/i18n';

let fieldIds = 0;

/**
 * Accessibility pass over freshly rendered menu HTML: tie every field label to
 * its control, name colour swatches and icon buttons, mark which choice is
 * pressed, group segmented controls, and announce toasts.
 */
export function accessible(root: HTMLElement): void {
  for (const field of root.querySelectorAll<HTMLElement>('.field')) {
    const label = field.querySelector(':scope > label');
    const control = field.querySelector<HTMLElement>(':scope input, :scope select, :scope textarea');
    const name = label?.textContent?.trim() ?? '';
    if (label && control && !control.id) {
      control.id = `mf-${++fieldIds}`;
      (label as HTMLLabelElement).htmlFor = control.id;
    }
    const seg = field.querySelector(':scope .seg, :scope .lang-row');
    if (seg && name) {
      seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', name);
    }
  }
  // Swatches: "<section> · colour n" (the section is the heading above them).
  for (const group of root.querySelectorAll<HTMLElement>('.swatches')) {
    let heading = group.previousElementSibling;
    while (heading && heading.tagName !== 'H4') heading = heading.previousElementSibling;
    const section = heading?.textContent?.trim() ?? '';
    group.setAttribute('role', 'group');
    if (section) group.setAttribute('aria-label', section);
    group.querySelectorAll<HTMLElement>('button').forEach((b, i) => {
      if (!b.getAttribute('aria-label') && !b.textContent?.trim()) b.setAttribute('aria-label', t('a11y.colour', { n: i + 1 }));
      b.title = b.getAttribute('aria-label') ?? '';
    });
  }
  for (const b of root.querySelectorAll<HTMLElement>('.swatch, .seg-btn, .item[data-item], .tab, button.quality, .lang-btn, [data-lcolour], [data-ltool], [data-lstamp]'))
    b.setAttribute('aria-pressed', String(b.classList.contains('on') || b.classList.contains('primary')));
  for (const input of root.querySelectorAll<HTMLInputElement>('input:not([id]):not([aria-label])')) {
    const hint = input.placeholder || input.closest('[data-id]')?.getAttribute('data-id') || '';
    if (hint) input.setAttribute('aria-label', hint);
  }
  root.querySelector('[data-id="toast"]')?.setAttribute('role', 'status');
}
