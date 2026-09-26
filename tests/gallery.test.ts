/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccounts } from '../server/accounts.mjs';
import { checkRoadCode, createGallery, themeFor, weekOf } from '../server/gallery.mjs';
import { decodeRoad, defaultRoad, encodeRoad } from '../src/creator/CustomRoad';

let server: Server;
let base = '';
let dir = '';
let clock = Date.UTC(2026, 8, 23, 12); // a Wednesday
let gallery: ReturnType<typeof createGallery>;

beforeAll(async () => {
  process.env.TRUST_PROXY = '1';
  dir = mkdtempSync(join(tmpdir(), 'inkroads-gallery-'));
  const accounts = createAccounts({ dataDir: dir, isBanned: () => false, now: () => clock });
  gallery = createGallery({ dataDir: dir, userForToken: (t) => accounts.userForToken(t), isBanned: () => false, now: () => clock });
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    void accounts
      .handle(req, res, url)
      .then((h) => h || gallery.handle(req, res, url))
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

let n = 0;
async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.7.${n++ % 250}.1`, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
}
const player = async (name: string) => (await call('POST', '/api/account/register', { name, password: 'watercolour-9' })).body.token as string;
const road = (name: string, len = 120) => encodeRoad({ ...defaultRoad(), name, pieces: [{ k: 'straight', a: len, b: 0 }, { k: 'left', a: 60, b: 80 }, { k: 'straight', a: 90, b: 0 }] });

describe('Road gallery', () => {
  it('checks codes the same way the game reads them', () => {
    const code = road('Kandy lake loop');
    expect(decodeRoad(code)?.name).toBe('Kandy lake loop');
    expect(checkRoadCode(code)?.name).toBe('Kandy lake loop');
    expect(checkRoadCode('R1.nope!')).toBeNull();
    expect(checkRoadCode('hello')).toBeNull();
    expect(checkRoadCode(`R1.${Buffer.from('[1,2]').toString('base64url')}`)).toBeNull();
  });

  it('weeks and themes', () => {
    expect(weekOf(Date.UTC(2026, 8, 23)).key).toBe('2026-W39');
    expect(weekOf(Date.UTC(2026, 0, 1)).key).toBe('2026-W01');
    expect(weekOf(Date.UTC(2026, 8, 27, 23)).key).toBe('2026-W39'); // Sunday night, same week
    expect(weekOf(Date.UTC(2026, 8, 28)).key).toBe('2026-W40');
    expect(themeFor(Date.UTC(2026, 8, 23))).not.toBe(themeFor(Date.UTC(2026, 8, 30)));
  });

  it('publish (signed in only), rate, play, top list, no self-rating, daily limit', async () => {
    expect((await call('POST', '/api/gallery/publish', { code: road('Anon') })).status).toBe(401);
    const maker = await player('Maker');
    const pub = await call('POST', '/api/gallery/publish', { code: road('Sigiriya sprint') }, maker);
    expect(pub.status).toBe(200);
    const id = pub.body.id as string;
    expect((await call('POST', '/api/gallery/publish', { code: road('Sigiriya sprint') }, maker)).status).toBe(409);
    expect((await call('POST', '/api/gallery/rate', { id, stars: 5 }, maker)).status).toBe(400);
    const raters = [await player('Rater One'), await player('Rater Two'), await player('Rater Three')];
    for (const [i, t] of raters.entries()) expect((await call('POST', '/api/gallery/rate', { id, stars: [5, 4, 5][i] }, t)).status).toBe(200);
    expect((await call('POST', '/api/gallery/rate', { id, stars: 9 }, raters[0])).status).toBe(400);
    await call('POST', '/api/gallery/play', { id });
    const list = await call('GET', '/api/gallery?sort=top', undefined, raters[0]);
    expect(list.body.roads[0]).toMatchObject({ title: 'Sigiriya sprint', author: 'Maker', count: 3, avg: 4.67, plays: 1, myStars: 5, mine: false });
    for (let i = 0; i < 9; i++) await call('POST', '/api/gallery/publish', { code: road(`Extra ${i}`, 100 + i) }, maker);
    expect((await call('POST', '/api/gallery/publish', { code: road('One too many', 300) }, maker)).status).toBe(429);
  });

  it('weekly contest: this week’s top, last week’s winners need 3 ratings', async () => {
    const c = await call('GET', '/api/gallery/contest');
    expect(c.body.week).toBe('2026-W39');
    expect(c.body.top[0].title).toBe('Sigiriya sprint');
    clock += 7 * 86400_000;
    const next = await call('GET', '/api/gallery/contest');
    expect(next.body.week).toBe('2026-W40');
    expect(next.body.winners.week).toBe('2026-W39');
    expect(next.body.winners.list.map((w: { title: string }) => w.title)).toEqual(['Sigiriya sprint']);
    expect(next.body.top).toEqual([]);
  });

  it('three reports hide a road until an admin keeps it; makers can delete their own', async () => {
    const maker = await player('Painter');
    const id = (await call('POST', '/api/gallery/publish', { code: road('Rude road', 222) }, maker)).body.id as string;
    for (const name of ['Rep A', 'Rep B', 'Rep C']) await call('POST', '/api/gallery/report', { id }, await player(name));
    expect((await call('GET', '/api/gallery?sort=new')).body.roads.some((r: { id: string }) => r.id === id)).toBe(false);
    expect(gallery.reported().find((r) => r.id === id)).toMatchObject({ reports: 3, hidden: true });
    gallery.moderate(id, 'keep');
    expect((await call('GET', '/api/gallery?sort=new')).body.roads.some((r: { id: string }) => r.id === id)).toBe(true);
    expect((await call('POST', '/api/gallery/delete', { id }, await player('Stranger'))).status).toBe(403);
    expect((await call('POST', '/api/gallery/delete', { id }, maker)).status).toBe(200);
  });
});
