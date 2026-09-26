// Container entry point. Hosts that mount a persistent disk (Render, Fly…)
// often mount it owned by root. If we start as root, give the data folder to
// the unprivileged `node` user, then drop root for good before the server
// starts. Started as a normal user (docker compose sets `user: node`), this
// does nothing extra.
import { chownSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = process.env.DATA_DIR ?? '/data';
const UID = 1000; // the `node` user in the official Node images
const GID = 1000;

function chownTree(dir) {
  chownSync(dir, UID, GID);
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) chownTree(p);
    else chownSync(p, UID, GID);
  }
}

if (typeof process.getuid === 'function' && process.getuid() === 0) {
  try {
    mkdirSync(dataDir, { recursive: true });
    chownTree(dataDir);
  } catch (err) {
    console.error(`[start] could not prepare ${dataDir}: ${err instanceof Error ? err.message : err}`);
  }
  process.setgid(GID);
  process.setuid(UID);
  if (process.getuid() === 0) throw new Error('refusing to run the server as root');
  console.log(`[start] data in ${dataDir}; running as uid ${process.getuid()}`);
}

await import('./relay.mjs');
