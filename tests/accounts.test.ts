/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanAccountName, createAccounts, passwordProblem } from '../server/accounts.mjs';

/** The accounts API over real HTTP on a random local port, with its own data folder. */
let server: Server;
let base = '';
let dir = '';
let banned = new Set<string>();
let accounts: ReturnType<typeof createAccounts>;
let clock = 1_700_000_000_000;

beforeAll(async () => {
  // The test client sends X-Forwarded-For so each call can come from its own address.
  process.env.TRUST_PROXY = '1';
  dir = mkdtempSync(join(tmpdir(), 'inkroads-accounts-'));
  accounts = createAccounts({ dataDir: dir, isBanned: (n) => banned.has(n.toLowerCase()), now: () => clock });
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    void accounts.handle(req, res, url).then((h) => {
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
async function call(method: string, path: string, body?: unknown, token?: string, ip = '10.0.0.1') {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
}
const register = async (name: string, password = 'lotus-pond-42') => (await call('POST', '/api/account/register', { name, password }, undefined, `10.1.${ipN++}.1`)).body.token as string;

describe('Account rules', () => {
  it('names and passwords', () => {
    expect(cleanAccountName('Amaya')).toBe('Amaya');
    expect(cleanAccountName('සුනිල්')).toBe('සුනිල්');
    expect(cleanAccountName('ab')).toBeNull();
    expect(cleanAccountName('<script>')).toBeNull();
    expect(cleanAccountName(' dot.')).toBeNull();
    expect(passwordProblem('short')).toMatch(/at least/);
    expect(passwordProblem('amaya-rocks-99', 'Amaya')).toMatch(/name/);
    expect(passwordProblem('aaaaaaaaaa')).toMatch(/easy/);
    expect(passwordProblem('lotus-pond-42', 'Amaya')).toBeNull();
  });
});

describe('Accounts API', () => {
  it('registers, never stores the password or token in plain text, and signs in', async () => {
    const r = await call('POST', '/api/account/register', { name: 'Amaya', password: 'lotus-pond-42' }, undefined, '10.2.0.1');
    expect(r.status).toBe(200);
    expect(r.body.token).toMatch(/^[a-f0-9]{64}$/);
    expect((await call('POST', '/api/account/register', { name: 'amaya', password: 'another-pass-1' }, undefined, '10.2.0.2')).status).toBe(409);
    accounts.flush();
    const raw = readFileSync(join(dir, 'accounts.json'), 'utf8');
    expect(raw).not.toContain('lotus-pond-42');
    expect(raw).not.toContain(r.body.token);
    const login = await call('POST', '/api/account/login', { name: 'AMAYA', password: 'lotus-pond-42' });
    expect(login.status).toBe(200);
    expect((await call('GET', '/api/account/me', undefined, login.body.token)).body.user.name).toBe('Amaya');
    expect((await call('GET', '/api/account/me', undefined, 'f'.repeat(64))).status).toBe(401);
    // Logging out ends that session only.
    await call('POST', '/api/account/logout', {}, login.body.token);
    expect((await call('GET', '/api/account/me', undefined, login.body.token)).status).toBe(401);
    expect((await call('GET', '/api/account/me', undefined, r.body.token)).status).toBe(200);
    expect(accounts.userForToken(r.body.token)?.name).toBe('Amaya');
    expect(accounts.isTaken('AMAYA')).toBe(true);
  });

  it('limits sign-ups per address and locks an account after repeated wrong passwords', async () => {
    const ip = '10.3.0.1';
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await call('POST', '/api/account/register', { name: `Spam${i}x`, password: 'lotus-pond-42' }, undefined, ip)).status);
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes[5]).toBe(429);
    await register('Lockme');
    for (let i = 0; i < 10; i++) expect((await call('POST', '/api/account/login', { name: 'Lockme', password: 'wrong-guess-1' }, undefined, `10.4.${i}.1`)).status).toBe(401);
    // Even the right password waits out the lock.
    expect((await call('POST', '/api/account/login', { name: 'Lockme', password: 'lotus-pond-42' }, undefined, '10.5.0.1')).status).toBe(429);
    clock += 16 * 60_000;
    expect((await call('POST', '/api/account/login', { name: 'Lockme', password: 'lotus-pond-42' }, undefined, '10.5.0.1')).status).toBe(200);
  });

  it('cloud saves: round trip, conflict when another device saved first, size limit', async () => {
    const t = await register('Saver');
    expect((await call('GET', '/api/account/save', undefined, t)).body.save).toBeNull();
    const first = await call('PUT', '/api/account/save', { save: { ink: 50, name: 'Saver' }, base: 0 }, t);
    expect(first.status).toBe(200);
    const at = first.body.at as number;
    // Phone saves on top of the latest copy.
    clock += 1000;
    const second = await call('PUT', '/api/account/save', { save: { ink: 80 }, base: at }, t);
    expect(second.status).toBe(200);
    // The laptop still thinks the first save is the latest: it gets the newer copy back.
    const stale = await call('PUT', '/api/account/save', { save: { ink: 10 }, base: at }, t);
    expect(stale.status).toBe(409);
    expect(stale.body.save).toEqual({ ink: 80 });
    expect((await call('GET', '/api/account/save', undefined, t)).body.save).toEqual({ ink: 80 });
    expect((await call('PUT', '/api/account/save', { save: { blob: 'x'.repeat(300_000) }, base: 0 }, t)).status).toBe(413);
    expect((await call('PUT', '/api/account/save', { save: [1, 2], base: 0 }, t)).status).toBe(400);
  });

  it('friends: request, accept, presence with the room, remove', async () => {
    const a = await register('Nimal');
    const b = await register('Kasun');
    expect((await call('POST', '/api/friends/request', { name: 'kasun' }, a)).status).toBe(200);
    expect((await call('GET', '/api/friends', undefined, b)).body.requests).toEqual(['Nimal']);
    expect((await call('GET', '/api/friends', undefined, a)).body.sent).toEqual(['Kasun']);
    await call('POST', '/api/friends/respond', { name: 'Nimal', accept: true }, b);
    await call('POST', '/api/account/presence', { room: 'harbour-fun' }, b);
    const list = (await call('GET', '/api/friends', undefined, a)).body.friends;
    expect(list).toEqual([{ name: 'Kasun', online: true, room: 'harbour-fun', club: null }]);
    // Presence fades after two minutes.
    clock += 3 * 60_000;
    expect((await call('GET', '/api/friends', undefined, a)).body.friends[0].online).toBe(false);
    await call('POST', '/api/friends/remove', { name: 'Kasun' }, a);
    expect((await call('GET', '/api/friends', undefined, b)).body.friends).toEqual([]);
    expect((await call('POST', '/api/friends/request', { name: 'Nobody here' }, a)).status).toBe(404);
  });

  it('clubs: create, join by tag, owner hand-over, kick, public list', async () => {
    const owner = await register('Chamari');
    const m1 = await register('Dilan');
    const m2 = await register('Eshan');
    const made = await call('POST', '/api/clubs/create', { name: 'Kandy Kites', tag: 'kk', motto: 'Up the hill!' }, owner);
    expect(made.status).toBe(200);
    expect(made.body.club.tag).toBe('KK');
    expect((await call('POST', '/api/clubs/create', { name: 'Other', tag: 'KK' }, m1)).status).toBe(409);
    await call('POST', '/api/clubs/join', { tag: 'kk' }, m1);
    await call('POST', '/api/clubs/join', { tag: 'KK' }, m2);
    expect((await call('GET', '/api/clubs/mine', undefined, m1)).body.club.members).toBe(3);
    expect((await call('POST', '/api/clubs/kick', { name: 'Eshan' }, m1)).status).toBe(403);
    expect((await call('POST', '/api/clubs/kick', { name: 'Eshan' }, owner)).status).toBe(200);
    await call('POST', '/api/clubs/leave', {}, owner);
    const mine = (await call('GET', '/api/clubs/mine', undefined, m1)).body.club;
    expect(mine.owner).toBe('Dilan');
    expect((await call('GET', '/api/clubs?q=kites')).body.clubs[0]).toMatchObject({ name: 'Kandy Kites', tag: 'KK', members: 1 });
  });

  it('banned names cannot sign in or register, and deleting an account removes everything', async () => {
    const t = await register('Bad Actor');
    banned.add('bad actor');
    expect((await call('POST', '/api/account/login', { name: 'Bad Actor', password: 'lotus-pond-42' }, undefined, '10.9.0.1')).status).toBe(403);
    expect(accounts.userForToken(t)).toBeNull();
    banned = new Set();
    const g = await register('Goner');
    const f = await register('Friendly');
    await call('PUT', '/api/account/save', { save: { ink: 1 }, base: 0 }, g);
    await call('POST', '/api/friends/request', { name: 'Friendly' }, g);
    await call('POST', '/api/friends/respond', { name: 'Goner', accept: true }, f);
    expect((await call('POST', '/api/account/delete', { password: 'nope-nope-1' }, g)).status).toBe(401);
    expect((await call('POST', '/api/account/delete', { password: 'lotus-pond-42' }, g)).status).toBe(200);
    expect((await call('GET', '/api/friends', undefined, f)).body.friends).toEqual([]);
    expect(accounts.isTaken('Goner')).toBe(false);
    expect(readdirSync(join(dir, 'saves')).length).toBeGreaterThan(0);
    expect(accounts.userForToken(g)).toBeNull();
  });
});
