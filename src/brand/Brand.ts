import { api, apiUrl } from '../net/Api';

/** Branding shown in the game, edited in the admin panel (server/admin.mjs keeps the same shape). */
export interface BrandConfig {
  company: { name: string; site: string; tagline: string; contact: string; logo?: string };
  links: { coffee: string; fund: string; sponsor: string; custom: { label: string; url: string }[] };
  logoFrequency: number;
  showSponsorCta: boolean;
  sponsors: { id: string; name: string; url: string; weight: number; image: string }[];
}

export const COMPANY_LOGO = 'brand/helao2-logo.jpg';

export const DEFAULT_BRAND: BrandConfig = {
  company: { name: 'HelaO2', site: 'https://helao2.com', tagline: 'Presents', contact: 'support@helao2.com' },
  links: { coffee: '', fund: '', sponsor: 'mailto:support@helao2.com?subject=Sponsor%20Inkroads', custom: [] },
  logoFrequency: 0.35,
  showSponsorCta: true,
  sponsors: [],
};

/** One picture that can go on a board in the world. */
export interface BrandLogo {
  id: string;
  kind: 'company' | 'sponsor' | 'cta';
  name: string;
  url: string;
  image: string;
  weight: number;
}

const CACHE = 'paintland.brand';
let current: BrandConfig = readCache() ?? DEFAULT_BRAND;
const listeners: ((b: BrandConfig) => void)[] = [];

function readCache(): BrandConfig | null {
  try {
    const raw = localStorage.getItem(CACHE);
    return raw ? { ...DEFAULT_BRAND, ...(JSON.parse(raw) as BrandConfig) } : null;
  } catch {
    return null;
  }
}

export function brand(): BrandConfig {
  return current;
}

export function onBrandChange(fn: (b: BrandConfig) => void): void {
  listeners.push(fn);
}

export function setBrand(b: BrandConfig): void {
  current = { ...DEFAULT_BRAND, ...b, company: { ...DEFAULT_BRAND.company, ...b.company }, links: { ...DEFAULT_BRAND.links, ...b.links } };
  try {
    localStorage.setItem(CACHE, JSON.stringify(current));
  } catch {
    /* storage blocked */
  }
  for (const fn of listeners) fn(current);
}

/** Fetch the live branding (keeps the cached copy when the server is away). */
export async function loadBrand(): Promise<void> {
  const res = await api<BrandConfig>('/api/config', { timeout: 4000 });
  if (res.ok && res.data?.company) setBrand(res.data);
}

/**
 * The pool of pictures for boards: the company logo (weighted by how often the
 * owner wants it), every enabled sponsor, and — while there is room for more
 * sponsors — an "advertise here" card with the contact address.
 */
export function logoPool(b: BrandConfig = current): BrandLogo[] {
  const pool: BrandLogo[] = [];
  const sponsors = b.sponsors.filter((s) => s.weight > 0);
  const others = sponsors.length + (b.showSponsorCta ? 1 : 0);
  const f = Math.min(1, Math.max(0, b.logoFrequency));
  // The company share of all boards is roughly logoFrequency.
  const companyWeight = f >= 1 || others === 0 ? 1 : (f / (1 - f)) * Math.max(1, sponsors.reduce((s, x) => s + x.weight, 0) + (b.showSponsorCta ? 1 : 0));
  if (f > 0) pool.push({ id: 'helao2', kind: 'company', name: b.company.name, url: b.company.site, image: b.company.logo ? apiUrl(b.company.logo) : COMPANY_LOGO, weight: companyWeight });
  for (const s of sponsors) pool.push({ id: s.id, kind: 'sponsor', name: s.name, url: s.url, image: apiUrl(s.image), weight: s.weight });
  if (b.showSponsorCta) pool.push({ id: 'cta', kind: 'cta', name: b.company.contact, url: `mailto:${b.company.contact}?subject=Advertise%20in%20Inkroads`, image: '', weight: Math.max(0.6, 2 - sponsors.length * 0.4) });
  return pool;
}

/** Weighted pick with a 0..1 random number. */
export function pickLogo(pool: readonly BrandLogo[], r: number): BrandLogo | null {
  const total = pool.reduce((s, l) => s + l.weight, 0);
  if (total <= 0) return null;
  let x = r * total;
  for (const l of pool) {
    x -= l.weight;
    if (x < 0) return l;
  }
  return pool[pool.length - 1];
}
