/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccounts } from '../server/accounts.mjs';
import { MAIL_LIMITS, cleanHome, createMail, jpegFromDataUrl } from '../server/mail.mjs';

/** Accounts + postcards over real HTTP, with their own data folder. */
let server: Server;
let base = '';
let dir = '';
let clock = 1_700_000_000_000;

beforeAll(async () => {
  process.env.TRUST_PROXY = '1';
  dir = mkdtempSync(join(tmpdir(), 'inkroads-mail-'));
  let mail: ReturnType<typeof createMail> | null = null;
  const accounts = createAccounts({ dataDir: dir, isBanned: () => false, now: () => clock, onDelete: (uid) => mail?.forget(uid) });
  mail = createMail({ dataDir: dir, userForToken: (t) => accounts.userForToken(t), userByName: (n) => accounts.userByName(n), userById: (id) => accounts.userById(id), now: () => clock });
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    void accounts
      .handle(req, res, url)
      .then((h) => h || mail!.handle(req, res, url))
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
async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${ipN++ % 250}.1`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, type, body: (type.includes('json') ? await res.json() : null) as Record<string, any>, bytes: type.includes('jpeg') ? (await res.arrayBuffer()).byteLength : 0 };
}
const register = async (name: string) => (await call('POST', '/api/account/register', { name, password: 'lotus-pond-42' })).body.token as string;
const befriend = async (a: string, aName: string, b: string, bName: string) => {
  await call('POST', '/api/friends/request', { name: bName }, a);
  await call('POST', '/api/friends/respond', { name: aName, accept: true }, b);
};

/** A tiny but well-formed JPEG as a data URL. */
function jpeg(size = 400): string {
  const b = Buffer.alloc(size, 0x11);
  b[0] = 0xff;
  b[1] = 0xd8;
  b[size - 2] = 0xff;
  b[size - 1] = 0xd9;
  return `data:image/jpeg;base64,${b.toString('base64')}`;
}

describe('postcard rules', () => {
  it('only accepts small JPEGs', () => {
    expect(jpegFromDataUrl(jpeg())).not.toBeNull();
    expect(jpegFromDataUrl(jpeg(MAIL_LIMITS.imageBytes + 10))).toBeNull();
    expect(jpegFromDataUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(jpegFromDataUrl(`data:image/jpeg;base64,${Buffer.alloc(400, 1).toString('base64')}`)).toBeNull();
    expect(jpegFromDataUrl(42)).toBeNull();
  });

  it('keeps homes to known, bounded fields', () => {
    const h = cleanHome({ walls: '#ABCDEF', roof: 'red', keepsakes: ['cats', 'cats', 'bad one', 7, 'easel'], trophies: 1e9, extra: 'x' });
    expect(h).toEqual({ walls: '#abcdef', roof: '#d8463a', keepsakes: ['cats', 'easel'], trophies: 999 });
    expect(cleanHome(null)).toBeNull();
  });
});

describe('postcards and homes', () => {
  it('lets friends send, pin, visit and delete', async () => {
    const asha = await register('Asha');
    const ben = await register('Ben');
    const cara = await register('Cara');
    // Strangers can't send each other postcards.
    expect((await call('POST', '/api/postcards/send', { to: 'Ben', image: jpeg(), text: 'hi' }, asha)).status).toBe(403);
    await befriend(asha, 'Asha', ben, 'Ben');
    const sent = await call('POST', '/api/postcards/send', { to: 'Ben', image: jpeg(), text: 'Greetings from Galle! <b>' }, asha);
    expect(sent.status).toBe(200);
    // …and to yourself (a keepsake for your own wall).
    expect((await call('POST', '/api/postcards/send', { to: 'Asha', image: jpeg(), text: 'me' }, asha)).status).toBe(200);
    expect((await call('POST', '/api/postcards/send', { to: 'Ben', image: 'data:image/png;base64,AAAA' }, asha)).status).toBe(400);
    expect((await call('GET', '/api/postcards')).status).toBe(401);

    const box = await call('GET', '/api/postcards', undefined, ben);
    expect(box.body.cards).toHaveLength(1);
    const card = box.body.cards[0];
    expect(card.from).toBe('Asha');
    expect(card.text).not.toContain('<');
    const pic = await call('GET', `/api/postcards/${card.id}.jpg`, undefined, ben);
    expect(pic.type).toBe('image/jpeg');
    expect(pic.bytes).toBe(400);
    // Someone else can't see it, not even the sender, until it's pinned in a friend's home.
    expect((await call('GET', `/api/postcards/${card.id}.jpg`, undefined, cara)).status).toBe(404);
    expect((await call('GET', `/api/postcards/${card.id}.jpg`, undefined, asha)).status).toBe(404);

    expect((await call('POST', '/api/postcards/pin', { id: card.id, pinned: true }, ben)).status).toBe(200);
    expect((await call('POST', '/api/postcards/pin', { id: card.id, pinned: true }, asha)).status).toBe(404);
    expect((await call('PUT', '/api/home', { home: { walls: '#9fd0c8', keepsakes: ['cats'], trophies: 12 } }, ben)).status).toBe(200);
    const visit = await call('GET', '/api/home/ben', undefined, asha);
    expect(visit.body.home.walls).toBe('#9fd0c8');
    expect(visit.body.cards.map((c: { id: string }) => c.id)).toEqual([card.id]);
    expect((await call('GET', `/api/postcards/${card.id}.jpg`, undefined, asha)).status).toBe(200);
    expect((await call('GET', '/api/home/Ben', undefined, cara)).status).toBe(403);

    expect((await call('POST', '/api/postcards/delete', { id: card.id }, ben)).status).toBe(200);
    expect((await call('GET', '/api/postcards', undefined, ben)).body.cards).toHaveLength(0);
  });

  it('keeps mailboxes and senders within limits', async () => {
    const dev = await register('Devi');
    const eli = await register('Eli');
    await befriend(dev, 'Devi', eli, 'Eli');
    for (let i = 0; i < MAIL_LIMITS.perDay; i++) expect((await call('POST', '/api/postcards/send', { to: 'Eli', image: jpeg(), text: `#${i}` }, dev)).status).toBe(200);
    expect((await call('POST', '/api/postcards/send', { to: 'Eli', image: jpeg() }, dev)).status).toBe(429);
    clock += 86400_000 + 1;
    for (let i = 0; i < 15; i++) await call('POST', '/api/postcards/send', { to: 'Eli', image: jpeg(), text: `more ${i}` }, dev);
    const box = (await call('GET', '/api/postcards', undefined, eli)).body.cards;
    expect(box).toHaveLength(MAIL_LIMITS.inbox);
    expect(box[0].text).toBe('more 14');
    // Pinning stops at six.
    for (let i = 0; i < MAIL_LIMITS.pinned; i++) expect((await call('POST', '/api/postcards/pin', { id: box[i].id, pinned: true }, eli)).status).toBe(200);
    expect((await call('POST', '/api/postcards/pin', { id: box[MAIL_LIMITS.pinned].id, pinned: true }, eli)).status).toBe(400);
  });

  it('deleting an account deletes its postcards and home', async () => {
    const fin = await register('Finn');
    const gia = await register('Gia');
    await befriend(fin, 'Finn', gia, 'Gia');
    await call('POST', '/api/postcards/send', { to: 'Gia', image: jpeg() }, fin);
    await call('PUT', '/api/home', { home: { keepsakes: ['books'] } }, fin);
    const before = readdirSync(join(dir, 'postcards')).length;
    expect((await call('POST', '/api/account/delete', { password: 'lotus-pond-42' }, fin)).status).toBe(200);
    expect((await call('GET', '/api/postcards', undefined, gia)).body.cards).toHaveLength(0);
    expect(readdirSync(join(dir, 'postcards')).length).toBe(before - 1);
  });
});
