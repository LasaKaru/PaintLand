import { describe, expect, it } from 'vitest';
import { validateState } from '../server/validate.mjs';
import { brandSpotsFor } from '../src/brand/BrandSpots';
import { PHOTO_SUBJECTS } from '../src/gameplay/PhotoHunt';
import { CHAPTERS } from '../src/world/Chapters';

// The areas add floating labels to the page; a tiny stand-in is enough here.
const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const { Village } = await import('../src/world/Village');
const { Hub } = await import('../src/world/Hub');

const clear = (world: { resolve(p: { x: number; z: number }, r: number): unknown }, x: number, z: number, r = 1.2): boolean => world.resolve({ x, z }, r) === null;

describe('Lantern Village (Hub 3)', () => {
  const village = new Village(fakeEl() as unknown as HTMLElement);
  const hub = new Hub(fakeEl() as unknown as HTMLElement);

  it('has a gate to Lantern Roads and a road back to Harbour Town', () => {
    expect(CHAPTERS.map((c) => c.id)).toContain('lanterns');
    const portal = village.zones.find((z) => z.kind === 'portal');
    expect(portal?.chapter).toBe('lanterns');
    expect(village.zones.find((z) => z.kind === 'area')?.area).toBe('harbour');
    expect(hub.zones.find((z) => z.area === 'village')).toBeTruthy();
    for (const k of ['garage', 'wardrobe', 'shop', 'missions']) expect(village.zones.some((z) => z.kind === k)).toBe(true);
  });

  it('keeps the spawn, zone centres and pickups free of walls', () => {
    expect(clear(village.world, village.spawn.x, village.spawn.z)).toBe(true);
    for (const z of village.zones) expect(clear(village.world, z.x, z.z), z.label).toBe(true);
    for (const s of village.secrets) expect(clear(village.world, s.x, s.z, 0.6), s.id).toBe(true);
    for (const c of village.chests) expect(clear(village.world, c.x, c.z, 0.8), c.id).toBe(true);
    const zb = hub.zones.find((z) => z.area === 'village')!;
    expect(clear(hub.world, zb.x, zb.z)).toBe(true);
  });

  it('has a stunt jump, brand boards and photo subjects', () => {
    expect(village.stunts.length).toBeGreaterThan(0);
    const spots = brandSpotsFor('village');
    expect(spots.length).toBeGreaterThanOrEqual(4);
    for (const s of spots) expect(clear(village.world, s.x, s.z, 0.4), `${s.x},${s.z}`).toBe(true);
    expect(PHOTO_SUBJECTS.filter((p) => p.area === 'village').length).toBeGreaterThanOrEqual(2);
  });

  it('the server accepts village positions inside its bounds only', () => {
    const state = (x: number, z: number, v = 10) => ({ chapter: 'village', mode: 'drive', s: z + 1000, x, h: 0, yaw: 0, v });
    expect(validateState(state(100, -100), null, 0).ok).toBe(true);
    expect(validateState(state(200, 0), null, 0).ok).toBe(false);
  });
});

describe('Livery painter', async () => {
  const L = await import('../src/gameplay/Livery');
  it('round-trips pictures through short share codes', () => {
    const px = L.presetLivery('number', 7);
    const code = L.encodeLivery(px);
    expect(code.startsWith('L1.')).toBe(true);
    expect(code.length).toBeLessThan(200);
    expect(L.decodeLivery(code)).toEqual(px);
    expect(L.encodeLivery(L.emptyLivery())).toBe('');
    // A worst-case picture (no two neighbours alike) still fits the limit.
    const noisy = L.emptyLivery().map((_, i) => (i * 7 + (i >> 5)) % 16);
    const big = L.encodeLivery(noisy);
    expect(big.length).toBeLessThanOrEqual(L.LIVERY_MAX_CODE);
    expect(L.decodeLivery(big)).toEqual(noisy);
  });

  it('rejects bad or hostile codes', () => {
    for (const bad of [null, 42, '', 'L2.AAAA', 'L1.!!!!', 'L1.A', 'L1.' + 'A'.repeat(800), 'L1.8A', { toString: () => 'L1.' }]) expect(L.decodeLivery(bad)).toBeNull();
    // Too short (does not fill the picture) and too long (overflows it).
    expect(L.decodeLivery(L.encodeLivery(L.presetLivery('racer')).slice(0, 12))).toBeNull();
    expect(L.decodeLivery(L.encodeLivery(L.presetLivery('racer')) + 'AAAA')).toBeNull();
  });

  it('fills, stamps and keeps colours in the paint box', () => {
    const px = L.emptyLivery();
    L.fillLivery(px, 0, 0, 5);
    expect(px.every((v) => v === 5)).toBe(true);
    L.stampLivery(px, 'heart', 16, 8);
    expect(px.some((v) => v === 3)).toBe(true);
    for (const s of L.LIVERY_STAMPS) {
      const q = L.emptyLivery();
      L.stampLivery(q, s, 16, 8);
      expect(L.isEmptyLivery(q), s).toBe(false);
      expect(Math.max(...q)).toBeLessThan(L.LIVERY_PALETTE.length);
    }
  });
});

describe('More character customisation', async () => {
  const { CATALOGUE } = await import('../src/gameplay/Profile');
  const { HumanModel } = await import('../src/models/Human');
  it('offers eyes, mouths, face details and accessories, some free and some to find', () => {
    for (const cat of ['eyes', 'mouth', 'facial', 'acc'] as const) {
      const items = CATALOGUE.filter((i) => i.category === cat);
      expect(items.length, cat).toBeGreaterThanOrEqual(5);
      expect(items.some((i) => i.price === 0 && !i.loot), cat).toBe(true);
    }
    expect(CATALOGUE.filter((i) => i.loot && ['eyes', 'acc', 'hat'].includes(i.category)).length).toBeGreaterThanOrEqual(4);
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(CATALOGUE.length);
  });

  it('builds every face, detail, accessory and new hat', () => {
    const base = { skin: '#f0c7a6', hair: '#2b2622', hairStyle: 'bob', top: '#d8463a', bottom: '#3e6fa8', shoes: '#2b2622', scarf: null } as const;
    for (const i of CATALOGUE.filter((c) => ['eyes', 'mouth', 'facial', 'acc', 'hat', 'back'].includes(c.category))) {
      const field = i.category === 'facial' ? 'face' : i.category;
      expect(() => new HumanModel({ ...base, hat: 'none', [field]: i.value } as never), i.id).not.toThrow();
    }
  });
});

describe('Adaptive quality and the benchmark', async () => {
  const { AdaptiveGovernor, ADAPTIVE_MAX } = await import('../src/render/Adaptive');
  const { scoreBenchmark } = await import('../src/render/Benchmark');
  it('sheds effects only once resolution is at its floor, and brings them back with headroom', () => {
    const g = new AdaptiveGovernor();
    for (let i = 0; i < 10; i++) g.step(1 / 20, 0.8);
    expect(g.level).toBe(0); // resolution still has room to drop
    g.step(1 / 20, 0.55);
    expect(g.level).toBe(0); // one slow window is not enough
    g.step(1 / 20, 0.55);
    expect(g.level).toBe(1);
    expect(g.off('shafts')).toBe(true);
    expect(g.off('ao')).toBe(false);
    for (let i = 0; i < 40; i++) g.step(1 / 15, 0.55);
    expect(g.level).toBe(ADAPTIVE_MAX);
    for (let i = 0; i < 3; i++) g.step(1 / 90, 1);
    expect(g.level).toBe(ADAPTIVE_MAX);
    g.step(1 / 90, 1);
    expect(g.level).toBe(ADAPTIVE_MAX - 1);
    g.reset();
    expect(g.level).toBe(0);
  });

  it('scores runs and recommends a preset', () => {
    expect(scoreBenchmark(Array(300).fill(1 / 120)).recommend).toBe('ultra');
    expect(scoreBenchmark(Array(300).fill(1 / 60)).recommend).toBe('high');
    const spiky = [...Array(285).fill(1 / 60), ...Array(15).fill(1 / 20)];
    const r = scoreBenchmark(spiky);
    expect(r.lowFps).toBeCloseTo(20, 0);
    expect(r.recommend).toBe('medium');
    expect(scoreBenchmark(Array(300).fill(1 / 25)).recommend).toBe('low');
    expect(scoreBenchmark([]).recommend).toBe('low');
  });
});

describe('Deploy: client address behind the HTTPS proxy', async () => {
  const { clientIp } = await import('../server/validate.mjs');
  const req = (xff?: string) => ({ socket: { remoteAddress: '172.18.0.3' }, headers: xff ? { 'x-forwarded-for': xff } : {} });
  it('ignores X-Forwarded-For unless the proxy is trusted, then uses the entry the proxy added', () => {
    expect(clientIp(req('1.2.3.4') as never, false)).toBe('172.18.0.3');
    expect(clientIp(req('1.2.3.4') as never, true)).toBe('1.2.3.4');
    // A client forging the header cannot pick its own address.
    expect(clientIp(req('6.6.6.6, 1.2.3.4') as never, true)).toBe('1.2.3.4');
    expect(clientIp(req() as never, true)).toBe('172.18.0.3');
    // Two trusted hops (e.g. a CDN in front of the host's load balancer).
    expect(clientIp(req('6.6.6.6, 1.2.3.4, 10.0.0.9') as never, 2)).toBe('1.2.3.4');
    expect(clientIp(req('1.2.3.4') as never, 3)).toBe('1.2.3.4');
  });
});

describe('Road Studio (creator tool v1)', async () => {
  const C = await import('../src/creator/CustomRoad');
  const { Decorator } = await import('../src/world/Decorator');
  const { Collectibles } = await import('../src/gameplay/Collectibles');

  it('round-trips roads through share codes and rejects bad ones', () => {
    const road = C.defaultRoad();
    const code = C.encodeRoad(road);
    expect(code.startsWith('R1.')).toBe(true);
    expect(C.decodeRoad(code)).toEqual(C.sanitizeRoad(road));
    for (const bad of [null, 7, '', 'R2.xx', 'R1.!!', 'R1.' + 'A'.repeat(3000), 'R1.' + btoa('{"a":1}'), 'R1.' + btoa('[1,2,3,4,5,[99,1]]')]) expect(C.decodeRoad(bad)).toBeNull();
    // Out-of-range values are clamped, text is cleaned.
    const odd = C.sanitizeRoad({ name: '<b>x</b>'.repeat(9), width: 99, pieces: [{ k: 'straight', a: 1e9, b: 0 }, { k: 'left', a: -5, b: 1 }] });
    expect(odd.name).not.toContain('<');
    expect(odd.width).toBe(14);
    expect(odd.pieces[0].a).toBe(400);
    expect(odd.pieces[1]).toEqual({ k: 'left', a: 10, b: 20 });
  });

  it('builds a drivable, dressed chapter for every scene style', () => {
    const pieces = C.PIECE_KINDS.filter((k) => k !== 'scene').map((k) => C.newPiece(k));
    for (let i = 0; i < C.ROAD_STYLES.length; i++) {
      const road = C.sanitizeRoad({ name: 'Test', style: i, pieces });
      const chapter = C.roadChapter(road);
      const path = chapter.buildRoute();
      expect(path.length, C.ROAD_STYLES[i].name).toBeGreaterThan(400);
      const d = new Decorator(path, chapter);
      expect(() => d.build(), C.ROAD_STYLES[i].style).not.toThrow();
      expect(new Collectibles(path, chapter.districts).notes.length).toBeGreaterThan(0);
    }
  });

  it('turns scene pieces into districts and reports stats', () => {
    const road = C.defaultRoad();
    const stats = C.roadStats(road);
    expect(stats.scenes).toBe(2);
    expect(stats.length).toBeGreaterThan(500);
    expect(stats.outline.length).toBeGreaterThan(50);
    expect(stats.warnings).not.toContain('underwater');
    const deep = C.sanitizeRoad({ pieces: [C.newPiece('dive'), { k: 'dive', a: 25, b: 300 }] });
    expect(C.roadStats(deep).warnings).toContain('underwater');
  });
});

describe('Voice chat signalling', async () => {
  const { checkRtc } = await import('../server/validate.mjs');
  it('keeps only known fields and routes offers to one player', () => {
    expect(checkRtc({ t: 'rtc', a: 'hi', evil: 1 })).toEqual({ t: 'rtc', a: 'hi' });
    expect(checkRtc({ t: 'rtc', a: 'hi', to: 'abc123' })).toEqual({ t: 'rtc', a: 'hi', to: 'abc123' });
    expect(checkRtc({ t: 'rtc', a: 'offer', to: 'abc123', sdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1', x: 'y' })).toEqual({ t: 'rtc', a: 'offer', to: 'abc123', sdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1' });
    expect(checkRtc({ t: 'rtc', a: 'ice', to: 'abc', cand: { candidate: 'candidate:1 1 udp 1 127.0.0.1 5000 typ host', sdpMid: '0', sdpMLineIndex: 0, junk: 1 } })).toEqual({
      t: 'rtc', a: 'ice', to: 'abc', cand: { candidate: 'candidate:1 1 udp 1 127.0.0.1 5000 typ host', sdpMid: '0', sdpMLineIndex: 0 },
    });
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      { t: 'rtc', a: 'dance' },
      { t: 'rtc', a: 'offer', sdp: 'v=0' }, // no target
      { t: 'rtc', a: 'offer', to: 'a b', sdp: 'v=0' },
      { t: 'rtc', a: 'offer', to: 'abc', sdp: '<script>' },
      { t: 'rtc', a: 'answer', to: 'abc', sdp: 'v=0' + 'x'.repeat(13000) },
      { t: 'rtc', a: 'ice', to: 'abc', cand: { candidate: 'x'.repeat(700) } },
      { t: 'rtc', a: 'ice', to: 'abc', cand: 'nope' },
    ])
      expect(checkRtc(bad)).toBeNull();
  });
});

describe('Safety: reports and voice relay', async () => {
  const { sanitizeReport, iceServers } = await import('../server/admin.mjs');
  it('cleans player reports and rejects bad ones', () => {
    const r = sanitizeReport({ target: 'Bad<b>Guy</b>', reason: 'chat', note: 'x'.repeat(900), chat: Array(30).fill('hello'), reporter: 'Amara', room: 'r1', evil: 1 }, 5);
    expect(r).toMatchObject({ reason: 'chat', reporter: 'Amara', room: 'r1', status: 'open', at: 5 });
    // Same cleaning as player names in the relay (shown escaped in the admin panel).
    expect(r!.target).toBe('Bad<b>Guy</b>');
    expect(r!.note.length).toBeLessThanOrEqual(300);
    expect(r!.chat.length).toBe(10);
    expect('evil' in r!).toBe(false);
    expect(sanitizeReport({ target: 'x', reason: 'spam' })).toBeNull();
    expect(sanitizeReport({ reason: 'chat' })).toBeNull();
    expect(sanitizeReport(null)).toBeNull();
  });

  it('issues short-lived TURN passwords the coturn way, and falls back to STUN only', async () => {
    const now = 1_700_000_000_000;
    const list = iceServers({ TURN_URLS: 'turn:a:3478, turn:a:3478?transport=tcp', TURN_SECRET: 's3cret' }, now);
    expect(list[0].urls).toEqual(['stun:stun.l.google.com:19302']);
    const turn = list[1];
    expect(turn.urls).toEqual(['turn:a:3478', 'turn:a:3478?transport=tcp']);
    expect(turn.username).toBe(`${now / 1000 + 6 * 3600}:inkroads`);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('s3cret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(turn.username!)));
    expect(turn.credential).toBe(btoa(String.fromCharCode(...mac)));
    expect(iceServers({}, now)).toEqual([{ urls: ['stun:stun.l.google.com:19302'] }]);
    expect(iceServers({ STUN_URLS: '' }, now)).toEqual([]);
    expect(iceServers({ TURN_URLS: 'turn:x', TURN_USERNAME: 'u', TURN_CREDENTIAL: 'p', STUN_URLS: '' })).toEqual([{ urls: ['turn:x'], username: 'u', credential: 'p' }]);
  });
});

describe('Family settings (parental controls)', async () => {
  const F = await import('../src/core/Family');
  it('stores only a salted hash and checks the PIN', async () => {
    const stored = await F.hashPin('4821');
    expect(stored).not.toContain('4821');
    expect(await F.checkPin('4821', stored)).toBe(true);
    expect(await F.checkPin('4822', stored)).toBe(false);
    expect(await F.checkPin('48', stored)).toBe(false);
    expect(await F.hashPin('4821')).not.toBe(stored);
  });

  it('caps chat, voice and online play while locked', () => {
    const o = (family: Partial<import('../src/core/Family').FamilyLock>) => ({ chat: 'on' as const, voice: true, family: { ...F.DEFAULT_FAMILY, pin: 'x:y', ...family } });
    expect(F.familyCaps(o({ chat: true, voice: true }))).toMatchObject({ chat: 'filtered', voice: true });
    expect(F.familyCaps(o({ chat: false, voice: false }))).toMatchObject({ chat: 'off', voice: false });
    expect(F.familyCaps(o({ online: false, chat: true, voice: true }))).toMatchObject({ chat: 'off', voice: false });
    expect(F.onlineAllowed({ ...F.DEFAULT_FAMILY, pin: 'x:y', online: false })).toBe(false);
    // Without a PIN nothing is capped.
    expect(F.familyCaps({ chat: 'on', voice: true, family: { ...F.DEFAULT_FAMILY, chat: false } })).toMatchObject({ chat: 'on', voice: true });
  });

  it('slows down PIN guessing', () => {
    const g = new F.PinGuard();
    for (let i = 0; i < 4; i++) g.record(false, 0);
    expect(g.wait(0)).toBe(0);
    g.record(false, 0);
    expect(g.wait(0)).toBe(60);
    expect(g.wait(61_000)).toBe(0);
  });
});
