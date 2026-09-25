import type { TrialRun } from '../gameplay/TrialSim';

export interface BoardEntry {
  name: string;
  time: number;
  vehicle: string;
  at: number;
}

/**
 * The HTTP side of the relay (server/relay.mjs): the ranked time-trial board.
 * The server address comes from the Multiplayer screen (ws://host:port);
 * without one we try the page's own host on port 8787.
 */
export function serverHttpUrl(): string {
  let ws: string | null = null;
  try {
    ws = localStorage.getItem('paintland.server');
  } catch {
    /* storage blocked */
  }
  const base = ws || import.meta.env.VITE_SERVER_WS || `ws://${location.hostname || 'localhost'}:8787`;
  return base.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/$/, '');
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await p(ctl.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchBoard(chapter: string, handling: string): Promise<{ enabled: boolean; entries: BoardEntry[] } | null> {
  const url = `${serverHttpUrl()}/leaderboard?chapter=${encodeURIComponent(chapter)}&handling=${handling}`;
  return withTimeout(async (signal) => (await fetch(url, { signal })).json() as Promise<{ enabled: boolean; entries: BoardEntry[] }>, 2500);
}

export function submitRun(run: TrialRun): Promise<{ ok: boolean; rank?: number | null; best?: boolean; reason?: string; time?: number } | null> {
  return withTimeout(
    async (signal) =>
      (await fetch(`${serverHttpUrl()}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(run), signal })).json() as Promise<{ ok: boolean; rank?: number | null; reason?: string }>,
    15000,
  );
}
