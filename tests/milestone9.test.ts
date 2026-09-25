import { describe, expect, it } from 'vitest';
import { checkPassword, DEFAULT_ADMIN, DEFAULT_CONFIG, hashPassword, safeUrl, sanitizeConfig } from '../server/admin.mjs';
import { DEFAULT_BRAND, logoPool, pickLogo, type BrandConfig } from '../src/brand/Brand';

describe('Admin server: passwords and settings', () => {
  it('checks passwords against a salted hash, never the plain text', () => {
    const rec = hashPassword('www111');
    expect(rec.hash).not.toContain('www111');
    expect(checkPassword('www111', rec)).toBe(true);
    expect(checkPassword('www112', rec)).toBe(false);
    expect(checkPassword('', rec)).toBe(false);
    // Same password, new salt → different hash.
    expect(hashPassword('www111').hash).not.toBe(rec.hash);
  });

  it('the shipped default login is the owner’s, stored only as a hash', () => {
    expect(DEFAULT_ADMIN.email).toBe('lasantha@helao2.com');
    expect(JSON.stringify(DEFAULT_ADMIN)).not.toContain('www111');
    expect(checkPassword('www111', DEFAULT_ADMIN)).toBe(true);
    expect(checkPassword('WWW111', DEFAULT_ADMIN)).toBe(false);
  });

  it('only lets http(s) and mailto links into the game', () => {
    expect(safeUrl('https://buymeacoffee.com/helao2')).toBe('https://buymeacoffee.com/helao2');
    expect(safeUrl('mailto:support@helao2.com')).toBe('mailto:support@helao2.com');
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('data:text/html,hi')).toBe('');
    expect(safeUrl('not a url')).toBe('');
  });

  it('sanitises a config from the panel: clamps numbers, drops bad links, keeps uploads server-side', () => {
    const current = structuredClone(DEFAULT_CONFIG);
    current.sponsors = [{ id: 'a1', name: 'Tea', url: '', file: 'a1.png', weight: 1, enabled: true }];
    const c = sanitizeConfig(
      {
        company: { name: '  HelaO2 Labs  ', site: 'javascript:x', tagline: 'Presents', contact: 'support@helao2.com' },
        links: { coffee: 'https://buymeacoffee.com/x', fund: 'ftp://x', custom: Array.from({ length: 12 }, (_, i) => ({ label: `L${i}`, url: 'https://x.dev' })) },
        logoFrequency: 7,
        maxPlayersPerRoom: 500,
        sponsors: [{ id: 'a1', name: 'Tea Co', weight: 99, enabled: false, file: '../../etc/passwd' }, { id: 'new', name: 'Sneaky', file: 'x.png' }],
      },
      current,
    );
    expect(c.company.name).toBe('HelaO2 Labs');
    expect(c.company.site).toBe('');
    expect(c.links.coffee).toBe('https://buymeacoffee.com/x');
    expect(c.links.fund).toBe('');
    expect(c.links.custom).toHaveLength(8);
    expect(c.logoFrequency).toBe(1);
    expect(c.maxPlayersPerRoom).toBe(64);
    expect(c.sponsors).toHaveLength(1);
    expect(c.sponsors[0]).toMatchObject({ name: 'Tea Co', weight: 10, enabled: false, file: 'a1.png' });
  });
});

describe('Brand boards: which logo goes where', () => {
  const withSponsors = (n: number, f: number, cta = true): BrandConfig => ({
    ...DEFAULT_BRAND,
    logoFrequency: f,
    showSponsorCta: cta,
    sponsors: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `S${i}`, url: '', weight: 1, image: `/api/brand/s${i}.png` })),
  });
  const share = (b: BrandConfig, id: string): number => {
    const pool = logoPool(b);
    let hits = 0;
    for (let i = 0; i < 2000; i++) if (pickLogo(pool, (i + 0.5) / 2000)?.id === id) hits++;
    return hits / 2000;
  };

  it('the company logo takes about the share the admin sets', () => {
    for (const f of [0.2, 0.35, 0.6]) expect(share(withSponsors(3, f), 'helao2')).toBeCloseTo(f, 1);
    expect(share(withSponsors(3, 0), 'helao2')).toBe(0);
    expect(share(withSponsors(0, 1, false), 'helao2')).toBe(1);
  });

  it('empty sponsor slots advertise the contact email', () => {
    const pool = logoPool(withSponsors(0, 0.35));
    const cta = pool.find((l) => l.kind === 'cta')!;
    expect(cta.name).toBe('support@helao2.com');
    expect(cta.url).toContain('mailto:support@helao2.com');
    expect(logoPool(withSponsors(0, 0.35, false)).some((l) => l.kind === 'cta')).toBe(false);
  });

  it('sponsors with weight 0 never show', () => {
    const b = withSponsors(2, 0.3);
    b.sponsors[1].weight = 0;
    expect(logoPool(b).some((l) => l.id === 's1')).toBe(false);
  });
});
