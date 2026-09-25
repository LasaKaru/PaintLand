import { cleanText, validateState } from '../../server/validate.mjs';
import type { TrialRun } from '../gameplay/TrialSim';
import type { HumanLook } from '../models/Human';
import type { VehicleId, VehicleLook } from '../models/Vehicles';

/** What each player shares about themselves (docs/09 §3). */
export interface PlayerInfo {
  name: string;
  look: HumanLook;
  vehicle: VehicleId;
  vlook: VehicleLook;
  chapter: string;
}

export interface PlayerState {
  chapter: string;
  mode: 'drive' | 'foot';
  s: number;
  x: number;
  h: number;
  yaw: number;
  v: number;
  pose?: string;
}

export type NetMessage =
  | { t: 'welcome'; id: string; room: string; peers: number }
  | ({ t: 'hello'; id: string } & PlayerInfo)
  | ({ t: 'state'; id: string; time: number } & PlayerState)
  | { t: 'chat'; id: string; text: string }
  | { t: 'emote'; id: string; emote: string }
  | { t: 'bye'; id: string }
  | RaceMessage;

/** Live races (docs/09 §1): start, finish (with inputs for server re-simulation), verdict. */
export type RaceMessage =
  | { t: 'race'; id?: string; a: 'start'; race: string; chapter: string; delay: number }
  | { t: 'race'; id?: string; a: 'finish'; race: string; name: string; time: number; verified?: boolean; run?: TrialRun }
  | { t: 'race'; a: 'verdict'; race: string; ok: boolean; time?: number; reason?: string };

interface Transport {
  send(msg: object): void;
  close(): void;
  onMessage: (msg: NetMessage) => void;
  onStatus: (status: string) => void;
}

/** Same-browser multiplayer through a BroadcastChannel: open two tabs and play together. */
class TabTransport implements Transport {
  private channel: BroadcastChannel;
  onMessage: (msg: NetMessage) => void = () => {};
  onStatus: (status: string) => void = () => {};

  constructor(room: string, private readonly id: string) {
    this.channel = new BroadcastChannel(`paintland:${room}`);
    this.channel.onmessage = (e: MessageEvent) => this.onMessage(e.data as NetMessage);
    setTimeout(() => this.onStatus(`tabs · room ${room}`), 0);
  }

  send(msg: object): void {
    this.channel.postMessage({ ...msg, id: this.id });
  }

  close(): void {
    this.send({ t: 'bye' });
    this.channel.close();
  }
}

/** Online multiplayer through the relay server (server/relay.mjs). */
class SocketTransport implements Transport {
  private socket: WebSocket;
  private retry = 0;
  private closed = false;
  onMessage: (msg: NetMessage) => void = () => {};
  onStatus: (status: string) => void = () => {};

  constructor(private readonly url: string, private readonly room: string) {
    this.socket = this.open();
  }

  private open(): WebSocket {
    const ws = new WebSocket(`${this.url}${this.url.includes('?') ? '&' : '?'}room=${encodeURIComponent(this.room)}`);
    ws.onopen = () => {
      this.retry = 0;
      this.onStatus(`online · room ${this.room}`);
    };
    ws.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(String(e.data)) as NetMessage);
      } catch {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      if (this.closed) return;
      this.onStatus('reconnecting…');
      const wait = Math.min(10000, 1000 * 2 ** this.retry++);
      setTimeout(() => {
        if (!this.closed) this.socket = this.open();
      }, wait);
    };
    ws.onerror = () => this.onStatus('connection problem');
    return ws;
  }

  send(msg: object): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(msg));
  }

  close(): void {
    this.closed = true;
    this.socket.close();
  }
}

export interface RemoteSnapshot extends PlayerState {
  time: number;
  received: number;
}

export interface RemotePeer {
  id: string;
  info: PlayerInfo | null;
  snapshots: RemoteSnapshot[];
  lastSeen: number;
  chat: { text: string; until: number } | null;
}

/**
 * The multiplayer client. Sends our state ~12 times a second, keeps a short
 * buffer of each peer's states for smooth interpolation, and forgets peers
 * that go quiet (docs/09 §3).
 */
export class NetClient {
  readonly id = Math.random().toString(36).slice(2, 10);
  readonly peers = new Map<string, RemotePeer>();
  status = 'offline';
  room = '';
  private transport: Transport | null = null;
  private sendTimer = 0;
  private helloTimer = 0;
  onChat: ((name: string, text: string) => void) | null = null;
  /** Race messages from other players (and the server's verdict on ours). */
  onRace: ((msg: RaceMessage, fromName: string | null) => void) | null = null;
  onPeersChanged: (() => void) | null = null;

  get connected(): boolean {
    return this.transport !== null;
  }

  connect(room: string, serverUrl: string | null, info: PlayerInfo): void {
    this.disconnect();
    this.room = room;
    const t: Transport = serverUrl ? new SocketTransport(serverUrl, room) : new TabTransport(room, this.id);
    t.onStatus = (s) => (this.status = s);
    t.onMessage = (m) => this.receive(m, info);
    this.transport = t;
    this.sendHello(info);
  }

  disconnect(): void {
    this.transport?.close();
    this.transport = null;
    this.peers.clear();
    this.status = 'offline';
    this.onPeersChanged?.();
  }

  sendHello(info: PlayerInfo): void {
    this.transport?.send({ t: 'hello', ...info });
  }

  sendRace(msg: RaceMessage): void {
    this.transport?.send(msg);
  }

  chat(text: string): void {
    this.transport?.send({ t: 'chat', text: text.slice(0, 120) });
  }

  private receive(m: NetMessage, info: PlayerInfo): void {
    if (m.t === 'welcome') {
      this.sendHello(info);
      return;
    }
    if (m.t === 'race' && m.a === 'verdict') {
      this.onRace?.(m, null);
      return;
    }
    const pid = 'id' in m ? m.id : undefined;
    if (!pid || pid === this.id) return;
    let peer = this.peers.get(pid);
    if (!peer && m.t !== 'bye') {
      peer = { id: pid, info: null, snapshots: [], lastSeen: performance.now(), chat: null };
      this.peers.set(pid, peer);
      // Introduce ourselves to newcomers.
      this.sendHello(info);
      this.onPeersChanged?.();
    }
    if (!peer) return;
    peer.lastSeen = performance.now();
    switch (m.t) {
      case 'hello':
        peer.info = { name: cleanText(m.name, 20) ?? 'Painter', look: m.look, vehicle: m.vehicle, vlook: m.vlook, chapter: m.chapter };
        this.onPeersChanged?.();
        break;
      case 'state': {
        // Defence in depth: tab rooms have no server, so check peers here too.
        const last = peer.snapshots[peer.snapshots.length - 1];
        const now = performance.now();
        if (!validateState(m, last ? { s: last.s, chapter: last.chapter, at: last.received } : null, now).ok) break;
        peer.snapshots.push({ ...m, received: now });
        if (peer.snapshots.length > 30) peer.snapshots.shift();
        break;
      }
      case 'chat': {
        const text = cleanText(m.text);
        if (!text) break;
        peer.chat = { text, until: performance.now() + 6000 };
        this.onChat?.(peer.info?.name ?? 'someone', peer.chat.text);
        break;
      }
      case 'race':
        if (typeof m.race !== 'string' || m.race.length > 40) break;
        if (m.a === 'finish') {
          delete m.run; // inputs are only for the server
          if (typeof m.time !== 'number' || !Number.isFinite(m.time) || m.time <= 0) break;
          m.name = cleanText(m.name, 20) ?? peer.info?.name ?? 'Painter';
        }
        if (m.a === 'start' && (typeof m.chapter !== 'string' || typeof m.delay !== 'number')) break;
        this.onRace?.(m, peer.info?.name ?? null);
        break;
      case 'bye':
        this.peers.delete(m.id);
        this.onPeersChanged?.();
        break;
    }
  }

  /** Call every frame with our current state. */
  update(dt: number, state: PlayerState, info: PlayerInfo): void {
    if (!this.transport) return;
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = 1 / 12;
      this.transport.send({ t: 'state', time: performance.now(), ...state });
    }
    this.helloTimer -= dt;
    if (this.helloTimer <= 0) {
      this.helloTimer = 5;
      this.sendHello(info);
    }
    const now = performance.now();
    for (const [id, p] of this.peers) {
      if (now - p.lastSeen > 6000) {
        this.peers.delete(id);
        this.onPeersChanged?.();
      }
    }
  }

  /** Interpolated state of a peer, drawn ~150 ms in the past for smoothness. */
  sample(peer: RemotePeer): RemoteSnapshot | null {
    const snaps = peer.snapshots;
    if (snaps.length === 0) return null;
    const renderTime = performance.now() - 150;
    for (let i = snaps.length - 1; i > 0; i--) {
      const a = snaps[i - 1];
      const b = snaps[i];
      if (a.received <= renderTime && b.received >= renderTime) {
        const t = (renderTime - a.received) / Math.max(1, b.received - a.received);
        return { ...b, s: a.s + (b.s - a.s) * t, x: a.x + (b.x - a.x) * t, h: a.h + (b.h - a.h) * t, yaw: a.yaw + (b.yaw - a.yaw) * t };
      }
    }
    return snaps[snaps.length - 1];
  }
}
