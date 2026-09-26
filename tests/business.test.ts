/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CATALOGUE, Profile } from '../src/gameplay/Profile';
import {
  TIERS,
  XP_PER_TIER,
  buyFeatured,
  challengeProgress,
  claimTier,
  featuredToday,
  freeReward,
  isCosmetic,
  joinChallenge,
  lifetimeXp,
  passState,
  patronReward,
  seasonAt,
  settleChallenge,
  tierReached,
  type SponsorChallenge,
} from '../src/gameplay/SeasonPass';
import { createAccounts } from '../server/accounts.mjs';
import { createStore, normaliseCode, seasonIdAt } from '../server/store.mjs';
import { DEFAULT_CONFIG, activeChallenges, sanitizeConfig } from '../server/admin.mjs';

const DAY = 86400_000;
const NOW = Date.UTC(2026, 8, 26, 12);
const fresh = (): Profile => {
  const p = new Profile();
  p.save = () => {};
  return p;
};

describe('Cosmetic-only rules', () => {
  it('vehicles, tonics and bundles holding them are not cosmetic; looks are', () => {
    for (const i of CATALOGUE) {
      if (i.category === 'vehicle' || i.category === 'tonic') expect(isCosmetic(i), i.id).toBe(false);
    }
    for (const id of ['hat:tophat', 'wrap:camo', 'horn:conch', 'glow:gold', 'print:batik', 'pet:fox']) expect(isCosmetic(CATALOGUE.find((i) => i.id === id)!), id).toBe(true);
  });

  it('every Patron reward in the next 20 seasons is a cosmetic and never ink', () => {
    for (let s = 0; s < 20; s++)
      for (let tier = 1; tier <= TIERS; tier++) {
        const r = patronReward(tier, s);
        expect(r.ink, `S${s} t${tier}`).toBe(0);
        expect(isCosmetic(CATALOGUE.find((i) => i.id === r.item)!), `${r.item}`).toBe(true);
        const f = freeReward(tier, s);
        if (f.item) expect(isCosmetic(CATALOGUE.find((i) => i.id === f.item)!)).toBe(true);
        else expect(f.ink).toBeGreaterThan(0);
      }
  });
});

describe('Seasons', () => {
  it('are 8 weeks from 5 January 2026, and the server agrees with the game', () => {
    expect(seasonAt(Date.UTC(2026, 0, 5)).id).toBe('S1');
    expect(seasonAt(Date.UTC(2026, 0, 5) + 56 * DAY - 1).id).toBe('S1');
    expect(seasonAt(Date.UTC(2026, 0, 5) + 56 * DAY).id).toBe('S2');
    expect(seasonAt(Date.UTC(2025, 5, 1)).id).toBe('S1');
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2029, 0, 1); t += 3.7 * DAY) expect(seasonIdAt(t)).toBe(seasonAt(t).id);
  });
});

describe('Season pass', () => {
  it('counts only what you do after the season starts, and tiers come from season points', () => {
    const p = fresh();
    p.data.stats.laps = 500; // done in earlier seasons
    const before = lifetimeXp(p);
    expect(passState(p, NOW).base).toBe(before);
    expect(tierReached(p, NOW)).toBe(0);
    p.data.stats.laps += Math.ceil((3 * XP_PER_TIER) / 60);
    expect(tierReached(p, NOW)).toBe(3);
  });

  it('claims: locked above your tier, free once, Patron only for Patrons, owned items cost nothing', () => {
    const p = fresh();
    passState(p, NOW);
    p.data.stats.laps = (p.data.stats.laps ?? 0) + Math.ceil((5 * XP_PER_TIER) / 60);
    const ink = p.data.ink;
    expect(claimTier(p, 6, 'free', false, NOW)).toBe('locked');
    expect(claimTier(p, 1, 'free', false, NOW)).toBe('ok');
    expect(p.data.ink).toBe(ink + freeReward(1, seasonAt(NOW).index).ink);
    expect(claimTier(p, 1, 'free', false, NOW)).toBe('claimed');
    expect(claimTier(p, 2, 'patron', false, NOW)).toBe('patron-only');
    const item = patronReward(2, seasonAt(NOW).index).item!;
    const inkBefore = p.data.ink;
    expect(claimTier(p, 2, 'patron', true, NOW)).toBe('ok');
    expect(p.owns(item)).toBe(true);
    expect(p.data.ink).toBe(inkBefore);
    expect(claimTier(p, 5, 'free', false, NOW)).toBe('ok');
    expect(p.owns(freeReward(5, seasonAt(NOW).index).item!)).toBe(true);
  });

  it('a new season starts a fresh pass', () => {
    const p = fresh();
    passState(p, NOW);
    p.data.stats.laps = (p.data.stats.laps ?? 0) + 100;
    claimTier(p, 1, 'free', false, NOW);
    const next = NOW + 60 * DAY;
    const st = passState(p, next);
    expect(st.season).toBe(seasonAt(next).id);
    expect(st.claimed).toEqual([]);
    expect(tierReached(p, next)).toBe(0);
  });
});

describe('Featured shop', () => {
  it('six looks-only items a day at 25 % off, the same all day, none you own', () => {
    const p = fresh();
    const a = featuredToday(p, NOW);
    expect(a.length).toBe(6);
    expect(featuredToday(p, NOW + 3600_000).map((f) => f.item.id)).toEqual(a.map((f) => f.item.id));
    expect(featuredToday(p, NOW + DAY).map((f) => f.item.id)).not.toEqual(a.map((f) => f.item.id));
    for (const f of a) {
      expect(isCosmetic(f.item)).toBe(true);
      expect(f.price).toBe(Math.round(f.item.price * 0.75));
      expect(p.owns(f.item.id)).toBe(false);
    }
    p.data.ink = 10_000;
    expect(buyFeatured(p, a[0].item.id, NOW)).toBe('ok');
    expect(p.data.ink).toBe(10_000 - a[0].price);
    expect(featuredToday(p, NOW).some((f) => f.item.id === a[0].item.id)).toBe(false);
    expect(buyFeatured(p, 'vehicle:coupe', NOW)).toBe('gone');
  });
});

describe('Sponsor challenges', () => {
  const ch = (over: Partial<SponsorChallenge> = {}): SponsorChallenge => ({ id: 'abc123', sponsor: { name: 'Tea Co', url: 'https://example.com' }, title: 'Tea run', text: '', kind: 'laps', target: 5, ink: 300, item: 'wrap:stars', end: NOW + 7 * DAY, ...over });

  it('count from joining, pay once, and never give a vehicle', () => {
    const p = fresh();
    p.data.stats.laps = 40;
    const c = ch();
    expect(challengeProgress(p, c)).toBe(0);
    joinChallenge(p, c);
    expect(challengeProgress(p, c)).toBe(0);
    p.data.stats.laps = 43;
    expect(challengeProgress(p, c)).toBe(3);
    expect(settleChallenge(p, c, NOW)).toBe(false);
    p.data.stats.laps = 50;
    const ink = p.data.ink;
    expect(settleChallenge(p, c, NOW)).toBe(true);
    expect(p.data.ink).toBe(ink + 300);
    expect(p.owns('wrap:stars')).toBe(true);
    expect(settleChallenge(p, c, NOW)).toBe(false);

    const v = ch({ id: 'veh999', item: 'vehicle:coupe' });
    joinChallenge(p, v);
    p.data.stats.laps = 60;
    expect(settleChallenge(p, v, NOW)).toBe(true);
    expect(p.owns('vehicle:coupe')).toBe(false);
  });

  it('pay nothing after they end', () => {
    const p = fresh();
    const c = ch({ id: 'late01', end: NOW - 1 });
    joinChallenge(p, c);
    p.data.stats.laps = (p.data.stats.laps ?? 0) + 10;
    expect(settleChallenge(p, c, NOW)).toBe(false);
  });

  it('the server keeps only well-formed challenges for real sponsors, and shows running ones', () => {
    const base = { ...structuredClone(DEFAULT_CONFIG), sponsors: [{ id: 'sp1', name: 'Tea Co', url: 'https://tea.example', file: 'sp1.png', weight: 1, enabled: true }] };
    const c = sanitizeConfig(
      {
        challenges: [
          { sponsorId: 'sp1', title: 'Tea run', kind: 'laps', target: 5, ink: 99999, item: 'wrap:stars', start: NOW - DAY, end: NOW + DAY, enabled: true },
          { sponsorId: 'nope', title: 'Ghost', kind: 'laps', target: 5, ink: 10, start: 0, end: NOW + DAY, enabled: true },
          { sponsorId: 'sp1', title: 'Bad kind', kind: 'teleport', target: 5, ink: 10, enabled: true },
          { sponsorId: 'sp1', title: 'Later', kind: 'stunts', target: 3, ink: 10, item: '<script>', start: NOW + 5 * DAY, end: NOW + 9 * DAY, enabled: true },
          { sponsorId: 'sp1', title: 'Off', kind: 'photos', target: 3, ink: 10, start: 0, end: NOW + DAY, enabled: false },
        ],
      },
      base,
    );
    expect(c.challenges!.map((x) => x.title)).toEqual(['Tea run', 'Later', 'Off']);
    expect(c.challenges![0].ink).toBe(1000);
    // Every challenge gets a real, unique id (never the text "undefined").
    for (const x of c.challenges!) expect(x.id).toMatch(/^[a-f0-9]{10}$/);
    expect(new Set(c.challenges!.map((x) => x.id)).size).toBe(3);
    expect(live0Id(c)).toBeTruthy();
    expect(c.challenges![1].item).toBe('');
    const live = activeChallenges(c, NOW);
    expect(live.map((x) => x.title)).toEqual(['Tea run']);
    expect(live[0].sponsor).toEqual({ name: 'Tea Co', url: 'https://tea.example', image: '/api/brand/sp1.png' });
    c.sponsors[0].enabled = false;
    expect(activeChallenges(c, NOW)).toEqual([]);
  });
});

const live0Id = (c: Parameters<typeof activeChallenges>[0]): string | undefined => activeChallenges(c, NOW)[0]?.id;

describe('Patron entitlements (server)', () => {
  let server: Server;
  let base = '';
  let dir = '';
  let clock = NOW;
  let store: ReturnType<typeof createStore>;
  let accounts: ReturnType<typeof createAccounts>;

  beforeAll(async () => {
    process.env.TRUST_PROXY = '1';
    dir = mkdtempSync(join(tmpdir(), 'inkroads-store-'));
    accounts = createAccounts({ dataDir: dir, isBanned: () => false, now: () => clock });
    store = createStore({ dataDir: dir, userForToken: (t) => accounts.userForToken(t), userByName: (n) => accounts.userByName(n), now: () => clock });
    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://x');
      void accounts
        .handle(req, res, url)
        .then((h) => h || store.handle(req, res, url))
        .then((h) => {
          if (!h) {
            res.writeHead(404);
            res.end();
          }
        });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const a = server.address();
    base = `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`;
  });
  afterAll(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  let ipN = 1;
  async function call(method: string, path: string, body?: unknown, token?: string, ip = `10.9.${ipN++}.1`) {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
  }
  const register = async (name: string) => (await call('POST', '/api/account/register', { name, password: 'lotus-pond-42' })).body.token as string;

  it('codes are one-use, stored only as hashes, and unlock this season', async () => {
    const tok = await register('Nimali');
    const other = await register('Kasun');
    expect((await call('GET', '/api/store/me')).status).toBe(401);
    expect((await call('GET', '/api/store/me', undefined, tok)).body.patron).toBe(false);
    const made = store.makeCodes(3);
    expect(made.ok).toBe(true);
    const codes = (made as { codes: string[] }).codes;
    expect(codes.length).toBe(3);
    expect(codes[0]).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    store.flush();
    const saved = readFileSync(join(dir, 'store.json'), 'utf8');
    for (const c of codes) expect(saved).not.toContain(normaliseCode(c));

    expect((await call('POST', '/api/store/redeem', { code: 'WRONG-CODE-1234' }, tok)).status).toBe(404);
    const ok = await call('POST', '/api/store/redeem', { code: codes[0].toLowerCase().replace(/-/g, ' ') }, tok);
    expect(ok.status).toBe(200);
    expect(ok.body.season).toBe(seasonIdAt(clock));
    expect((await call('GET', '/api/store/me', undefined, tok)).body.patron).toBe(true);
    expect((await call('POST', '/api/store/redeem', { code: codes[0] }, other)).status).toBe(409);
    expect((await call('GET', '/api/store/me', undefined, other)).body.patron).toBe(false);

    // Next season: not a Patron any more until a new code or grant.
    const uid = accounts.userByName('Nimali')!.id;
    expect(store.isPatron(uid, seasonIdAt(clock + 60 * DAY))).toBe(false);
  });

  it('admin grants by name go through the same hook; stats count them', async () => {
    await register('Tharu');
    expect(store.grantByName('nobody-here').ok).toBe(false);
    const g = store.grantByName('tharu');
    expect(g.ok && g.granted).toBe(true);
    expect(store.grantByName('Tharu')).toMatchObject({ ok: true, granted: false });
    const st = store.codeStats();
    expect(st.current).toBe(seasonIdAt(clock));
    expect(st.patrons[st.current]).toBe(2);
    expect(st.seasons[0]).toMatchObject({ issued: 3, redeemed: 1 });
  });

  it('guessing codes is rate-limited per address', async () => {
    const tok = await register('Guesser');
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await call('POST', '/api/store/redeem', { code: `NOPE${i}` }, tok, '10.99.0.1')).status;
    expect(last).toBe(429);
  });
});
