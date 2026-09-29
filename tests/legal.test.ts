import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, sanitizeConfig } from '../server/admin.mjs';
import { DEFAULT_LEGAL, setBrand, brand } from '../src/brand/Brand';
import { donationsShown, legalQuery, needsTerms } from '../src/ui/Legal';

const page = (f: string): string => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');

describe('store release: legal pages', () => {
  it('has Terms of Use, Community Rules, Privacy and licences pages', () => {
    for (const f of ['terms.html', 'rules.html', 'privacy.html', 'licenses.html']) expect(page(f)).toMatch(/<h1>/);
    // The owner's details are filled in by an outside script (the desktop app allows no inline scripts).
    for (const f of ['terms.html', 'rules.html']) {
      expect(page(f)).toContain('<script src="legal.js"></script>');
      expect(page(f)).not.toMatch(/<script>(?!<)/);
    }
    expect(page('terms.html')).toMatch(/data-legal="country"/);
    expect(page('terms.html')).toMatch(/data-legal="age"/);
    expect(page('legal.js')).toContain('textContent');
    expect(page('legal.js')).not.toContain('innerHTML');
  });

  it('lists every shipped dependency in the licences page (run `npm run licenses` after changing them)', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { dependencies: Record<string, string> };
    const html = page('licenses.html');
    for (const name of Object.keys(pkg.dependencies)) expect(html, name).toContain(`>${name}<`);
    expect(html).toContain('>electron<');
  });
});

describe('store release: settings', () => {
  it('the server and the game agree on the legal settings', () => {
    expect(Object.keys(DEFAULT_CONFIG.legal).sort()).toEqual(Object.keys(DEFAULT_LEGAL).sort());
  });

  it('checks what the admin panel sends', () => {
    const c = sanitizeConfig(
      { legal: { entity: 'HelaO2 (Pvt) Ltd', country: 'Sri Lanka', minAge: 99, updated: 'not a date', healthWarning: 0, termsForOnline: true, hideDonationsInApp: false, credits: [{ name: 'Lasantha', role: 'Design' }, { name: '' }, ...Array.from({ length: 60 }, (_, i) => ({ name: `P${i}` }))], extra: 1 } },
      structuredClone(DEFAULT_CONFIG),
    );
    expect(c.legal.entity).toBe('HelaO2 (Pvt) Ltd');
    expect(c.legal.minAge).toBe(21);
    expect(c.legal.updated).toBe(DEFAULT_CONFIG.legal.updated);
    expect(c.legal.healthWarning).toBe(false);
    expect(c.legal.hideDonationsInApp).toBe(false);
    expect(c.legal.credits[0]).toEqual({ name: 'Lasantha', role: 'Design' });
    expect(c.legal.credits.length).toBeLessThanOrEqual(40);
    expect(c.legal).not.toHaveProperty('extra');
    expect(sanitizeConfig({ legal: { updated: '2027-01-15' } }, c).legal.updated).toBe('2027-01-15');
  });

  it('asks for the terms only when the owner wants it', () => {
    const b = brand();
    setBrand({ ...b, legal: { ...DEFAULT_LEGAL, termsForOnline: true } });
    expect(needsTerms()).toBe(true);
    setBrand({ ...b, legal: { ...DEFAULT_LEGAL, termsForOnline: false } });
    expect(needsTerms()).toBe(false);
    setBrand(b);
  });

  it('shows donation links on the web, and passes the owner details to the pages', () => {
    expect(donationsShown()).toBe(true); // not the desktop app
    const q = new URLSearchParams(legalQuery());
    expect(q.get('entity')).toBe(brand().legal.entity);
    expect(q.get('age')).toBe(String(brand().legal.minAge));
  });
});
