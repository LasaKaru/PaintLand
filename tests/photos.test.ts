/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccounts } from '../server/accounts.mjs';
import { PHOTO_LIMITS, createPhotos, photoFromDataUrl, pickWinner } from '../server/photos.mjs';

let server: Server;
let base = '';
let dir = '';
let clock = Date.UTC(2026, 8, 21, 12); // a Monday afternoon
let svc: ReturnType<typeof createPhotos>;

beforeAll(async () => {
  process.env.TRUST_PROXY = '1';
  dir = mkdtempSync(join(tmpdir(), 'inkroads-photos-'));
  let photos: ReturnType<typeof createPhotos> | null = null;
  const accounts = createAccounts({ dataDir: dir, isBanned: () => false, now: () => clock, onDelete: (uid) => photos?.forget(uid) });
  photos = createPhotos({ dataDir: dir, userForToken: (t) => accounts.userForToken(t), isBanned: () => false, now: () => clock });
  svc = photos;
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    void accounts.handle(req, res, url).then((h) => h || photos!.handle(req, res, url)).then((h) => {
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
async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.8.${ipN++ % 250}.1`, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, type, body: (type.includes('json') ? await res.json() : null) as Record<string, any> };
}
const register = async (name: string) => {
  const r = await call('POST', '/api/account/register', { name, password: 'lotus-pond-42' });
  if (!r.body?.token) throw new Error(`register ${name}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token as string;
};
function jpeg(size = 400): string {
  const b = Buffer.alloc(size, 0x22);
  b[0] = 0xff;
  b[1] = 0xd8;
  b[size - 2] = 0xff;
  b[size - 1] = 0xd9;
  return `data:image/jpeg;base64,${b.toString('base64')}`;
}

describe('photo contest rules', () => {
  it('checks pictures and picks winners fairly', () => {
    expect(photoFromDataUrl(jpeg())).not.toBeNull();
    expect(photoFromDataUrl(jpeg(PHOTO_LIMITS.imageBytes + 1))).toBeNull();
    const e = (id: string, votes: number, at: number, hidden = false) => ({ id, votes: Array(votes).fill('x'), at, hidden });
    expect(pickWinner([e('a', 2, 5), e('b', 2, 3), e('c', 1, 1)])?.id).toBe('b');
    expect(pickWinner([e('a', 9, 1, true), e('b', 1, 2)])?.id).toBe('b');
    expect(pickWinner([e('a', 0, 1)])).toBeNull();
  });
});

describe('weekly photo contest', () => {
  it('takes one entry each, 3 votes each, and crowns a winner for next week', async () => {
    const [ana, bo, cy, di] = [await register('Ana'), await register('Bodhi'), await register('Cyra'), await register('Dilan')];
    expect((await call('POST', '/api/photos/enter', { image: jpeg(), caption: 'x' })).status).toBe(401);
    const a1 = (await call('POST', '/api/photos/enter', { image: jpeg(), caption: 'Sunset <i>' }, ana)).body.id;
    // A second entry replaces the first.
    const a2 = (await call('POST', '/api/photos/enter', { image: jpeg(), caption: 'Golden Gate at dusk' }, ana)).body.id;
    const b1 = (await call('POST', '/api/photos/enter', { image: jpeg(), caption: 'Tuk-tuk trail' }, bo)).body.id;
    let list = (await call('GET', '/api/photos')).body;
    expect(list.entries.map((e: { id: string }) => e.id).sort()).toEqual([a2, b1].sort());
    expect(list.theme).toBeTruthy();
    expect((await call('GET', `/api/photos/${a1}.jpg`)).status).toBe(404);
    expect((await call('GET', `/api/photos/${a2}.jpg`)).type).toBe('image/jpeg');

    expect((await call('POST', '/api/photos/vote', { id: a2 }, ana)).status).toBe(400); // own
    for (const t of [bo, cy, di]) expect((await call('POST', '/api/photos/vote', { id: a2 }, t)).status).toBe(200);
    expect((await call('POST', '/api/photos/vote', { id: b1 }, cy)).status).toBe(200);
    list = (await call('GET', '/api/photos', undefined, cy)).body;
    expect(list.entries[0]).toMatchObject({ id: a2, votes: 3, voted: true });
    expect(list.myVotes).toBe(2);

    // Next week: Ana's photo is last week's winner.
    clock += 7 * 86400_000;
    const next = (await call('GET', '/api/photos')).body;
    expect(next.entries).toHaveLength(0);
    expect(next.winner).toMatchObject({ id: a2, name: 'Ana', caption: 'Golden Gate at dusk' });
    expect((await call('GET', `/api/photos/${a2}.jpg`)).status).toBe(200);
  });

  it('hides reported entries and forgets deleted accounts', async () => {
    const [ed, fa, gu, ha] = [await register('Edda'), await register('Farah'), await register('Gus'), await register('Hana')];
    const e1 = (await call('POST', '/api/photos/enter', { image: jpeg() }, ed)).body.id;
    for (const t of [fa, gu, ha]) await call('POST', '/api/photos/report', { id: e1 }, t);
    expect((await call('GET', '/api/photos')).body.entries.find((e: { id: string }) => e.id === e1)).toBeUndefined();
    const f1 = (await call('POST', '/api/photos/enter', { image: jpeg() }, fa)).body.id;
    expect((await call('POST', '/api/account/delete', { password: 'lotus-pond-42' }, fa)).status).toBe(200);
    expect((await call('GET', `/api/photos/${f1}.jpg`)).status).toBe(404);
  });
});

describe('photo contest moderation (admin)', () => {
  it('lists entries, shows a reported one again for good, hides and removes', async () => {
    const [ev, fo, ga, ha] = [await register('Evi'), await register('Foxy'), await register('Gala'), await register('Hari')];
    const id = (await call('POST', '/api/photos/enter', { image: jpeg(), caption: 'Lotus at noon' }, ev)).body.id as string;
    for (const t of [fo, ga, ha]) await call('POST', '/api/photos/report', { id }, t);
    const row = svc.recent().find((e) => e.id === id)!;
    expect(row).toMatchObject({ name: 'Evi', reports: 3, hidden: true });
    expect(svc.image(id)).toMatch(/^data:image\/jpeg;base64,/);
    // Shown again by the admin: more reports don't hide it.
    expect(svc.moderate(id, 'show')).toBe(true);
    const z = await register('Zara');
    await call('POST', '/api/photos/report', { id }, z);
    expect(svc.recent().find((e) => e.id === id)!.hidden).toBe(false);
    expect(svc.moderate(id, 'hide')).toBe(true);
    expect((await call('GET', `/api/photos/${id}.jpg`)).status).toBe(404);
    expect(svc.moderate(id, 'remove')).toBe(true);
    expect(svc.recent().some((e) => e.id === id)).toBe(false);
    expect(svc.image(id)).toBeNull();
    expect(svc.moderate('nope', 'remove')).toBe(false);
  });
});
