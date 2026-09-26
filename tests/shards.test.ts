/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';
import WebSocket from 'ws';
import { hashRoom, shardConfig, shardFor } from '../server/shards.mjs';

describe('Room sharding rules', () => {
  it('a room always maps to the same shard, spread evenly', () => {
    expect(shardFor('lobby', 1)).toBe(0);
    expect(shardFor('harbour-7', 4)).toBe(shardFor('harbour-7', 4));
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) counts[shardFor(`room-${i}`, 4)]++;
    for (const c of counts) expect(c).toBeGreaterThan(1700);
    expect(hashRoom('abc')).toBe(hashRoom('abc'));
  });

  it('settings: one relay by default; several need a secret and a valid index', () => {
    expect(shardConfig({}).count).toBe(1);
    const urls = 'ws://a:1,ws://b:2';
    expect(() => shardConfig({ RELAY_SHARDS: urls, SHARD_INDEX: '1' })).toThrow(/SHARD_SECRET/);
    expect(() => shardConfig({ RELAY_SHARDS: urls, SHARD_INDEX: '5', SHARD_SECRET: 'x'.repeat(16) })).toThrow(/outside/);
    const c = shardConfig({ RELAY_SHARDS: urls, SHARD_INDEX: '1', SHARD_SECRET: 'x'.repeat(16) });
    expect(c).toMatchObject({ count: 2, index: 1, primary: false, primaryHttp: 'http://a:1' });
  });
});

/** Two real relays: shard 0 (primary) and shard 1. */
describe('Two relays working together', () => {
  const ports = [18801 + Math.floor(Math.random() * 500), 0];
  ports[1] = ports[0] + 1;
  const urls = ports.map((p) => `ws://127.0.0.1:${p}`);
  const procs: ChildProcess[] = [];
  const dirs: string[] = [];
  const SECRET = 'test-secret-0123456789';

  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const dir = mkdtempSync(pathJoin(tmpdir(), `inkroads-shard${i}-`));
      dirs.push(dir);
      const p = spawn(process.execPath, ['server/relay.mjs'], { env: { ...process.env, PORT: String(ports[i]), SHARD_INDEX: String(i), RELAY_SHARDS: urls.join(','), SHARD_SECRET: SECRET, DATA_DIR: dir, TRUST_PROXY: '1' }, stdio: 'pipe' });
      procs.push(p);
      await new Promise<void>((resolve) => p.stdout!.on('data', (d) => String(d).includes('listening') && resolve()));
    }
  }, 20_000);
  afterAll(() => {
    for (const p of procs) p.kill();
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  const roomOn = (shard: number): string => {
    for (let i = 0; ; i++) if (shardFor(`r${i}`, 2) === shard) return `r${i}`;
  };
  /** Connect, follow a move like the game does, and collect messages. */
  function join(room: string, start = urls[0]): Promise<{ ws: WebSocket; msgs: Record<string, unknown>[]; url: string; moved: boolean }> {
    return new Promise((resolve, reject) => {
      let moved = false;
      const go = (url: string): void => {
        const ws = new WebSocket(`${url}/?room=${room}`);
        const msgs: Record<string, unknown>[] = [];
        ws.on('message', (raw) => {
          const data = JSON.parse(String(raw));
          for (const m of Array.isArray(data) ? data : [data]) {
            if (m.t === 'moved') {
              moved = true;
              ws.on('close', () => go(m.url));
              return;
            }
            msgs.push(m);
            if (m.t === 'welcome') resolve({ ws, msgs, url, moved });
          }
        });
        ws.on('error', reject);
      };
      go(start);
    });
  }
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  it('a player who knocks on the wrong relay is sent to the room’s own', async () => {
    const room = roomOn(1);
    const a = await join(room, urls[0]);
    expect(a.moved).toBe(true);
    expect(a.url).toBe(urls[1]);
    const b = await join(room, urls[1]);
    expect(b.moved).toBe(false);
    b.ws.send(JSON.stringify({ t: 'chat', text: 'hello from shard one' }));
    await wait(300);
    expect(a.msgs.some((m) => m.t === 'chat' && m.text === 'hello from shard one')).toBe(true);
    a.ws.close();
    b.ws.close();
  });

  it('names are checked by the primary: accounts verified, guests can’t pose as them', async () => {
    const base = `http://127.0.0.1:${ports[0]}`;
    const reg = await fetch(`${base}/api/account/register`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.44.0.1' }, body: JSON.stringify({ name: 'Anoma', password: 'lotus-pond-42' }) });
    const { token } = (await reg.json()) as { token: string };
    const room = roomOn(1);
    const watcher = await join(room, urls[1]);
    const real = await join(room, urls[1]);
    real.ws.send(JSON.stringify({ t: 'hello', name: 'whoever', acct: token, look: {}, vehicle: 'rover', vlook: {}, chapter: 'hub' }));
    const fake = await join(room, urls[1]);
    fake.ws.send(JSON.stringify({ t: 'hello', name: 'Anoma', look: {}, vehicle: 'rover', vlook: {}, chapter: 'hub' }));
    await wait(600);
    const hellos = watcher.msgs.filter((m) => m.t === 'hello');
    expect(hellos.find((m) => m.verified)?.name).toBe('Anoma');
    expect(hellos.some((m) => m.name === 'Anoma guest' && !m.verified)).toBe(true);
    expect(JSON.stringify(watcher.msgs)).not.toContain(token);
    for (const c of [watcher, real, fake]) c.ws.close();
  });

  it('the other relays can only use the internal API with the secret, and only rooms are served there', async () => {
    const primary = `http://127.0.0.1:${ports[0]}`;
    expect((await fetch(`${primary}/api/internal/bans`)).status).toBe(403);
    expect((await fetch(`${primary}/api/internal/bans`, { headers: { 'x-shard-secret': 'wrong-secret-0123456789' } })).status).toBe(403);
    expect((await fetch(`${primary}/api/internal/bans`, { headers: { 'x-shard-secret': SECRET } })).status).toBe(200);
    const other = await fetch(`http://127.0.0.1:${ports[1]}/api/config`);
    expect(other.status).toBe(421);
    expect(((await other.json()) as { primary: string }).primary).toBe(urls[0]);
  });
});
