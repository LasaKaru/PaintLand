import { api, type ApiResult } from './Api';

/**
 * Player accounts (server/accounts.mjs): sign in to keep your progress in the
 * cloud across devices, add friends and join a club. Playing without an
 * account keeps working exactly as before (a local save only).
 */
const KEY = 'paintland.account';

export interface AccountUser {
  name: string;
  created: number;
  saveAt: number;
  club: { name: string; tag: string } | null;
  friends: number;
  requests: number;
}

export interface Friend {
  name: string;
  online: boolean;
  room: string | null;
  club: string | null;
}

export interface ClubInfo {
  name: string;
  tag: string;
  motto: string;
  members: number;
  owner: string;
  list?: { name: string; online: boolean; owner: boolean }[];
}

/** What to do when this device and the cloud both have progress. */
export interface SaveConflict {
  cloud: Record<string, unknown>;
  at: number;
}

interface Stored {
  token: string;
  name: string;
  /** The cloud save's timestamp this device last synced with. */
  base: number;
}

export class AccountClient {
  private stored: Stored | null = null;
  user: AccountUser | null = null;
  conflict: SaveConflict | null = null;
  lastSync = 0;
  private lastPushed = '';
  syncing = false;
  onChange: (() => void) | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? (JSON.parse(raw) as Stored) : null;
      if (s && typeof s.token === 'string' && /^[a-f0-9]{64}$/.test(s.token)) this.stored = s;
    } catch {
      /* storage blocked */
    }
  }

  get signedIn(): boolean {
    return !!this.stored;
  }

  get name(): string | null {
    return this.stored?.name ?? null;
  }

  /** Session token for the relay, so other players see a verified name. */
  get token(): string | null {
    return this.stored?.token ?? null;
  }

  private persist(): void {
    try {
      if (this.stored) localStorage.setItem(KEY, JSON.stringify(this.stored));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
    this.onChange?.();
  }

  private call<T>(path: string, method = 'GET', body?: unknown): Promise<ApiResult<T & { reason?: string }>> {
    return api<T & { reason?: string }>(path, { method, body, token: this.stored?.token }).then((r) => {
      // The session ended (signed out elsewhere, password changed, banned).
      if (r.status === 401 && this.stored && !path.startsWith('/api/account/login')) {
        this.stored = null;
        this.user = null;
        this.persist();
      }
      return r;
    });
  }

  async register(name: string, password: string): Promise<string | null> {
    return this.signIn('/api/account/register', name, password);
  }

  async login(name: string, password: string): Promise<string | null> {
    return this.signIn('/api/account/login', name, password);
  }

  private async signIn(path: string, name: string, password: string): Promise<string | null> {
    const r = await api<{ token: string; user: AccountUser; reason?: string }>(path, { method: 'POST', body: { name, password } });
    if (!r.ok || !r.data?.token) return r.reason ?? 'Could not sign in.';
    this.stored = { token: r.data.token, name: r.data.user.name, base: 0 };
    this.user = r.data.user;
    this.persist();
    return null;
  }

  async logout(): Promise<void> {
    if (this.stored) await this.call('/api/account/logout', 'POST', {});
    this.stored = null;
    this.user = null;
    this.conflict = null;
    this.persist();
  }

  async refresh(): Promise<AccountUser | null> {
    if (!this.stored) return null;
    const r = await this.call<{ user: AccountUser }>('/api/account/me');
    if (r.ok && r.data) this.user = r.data.user;
    this.onChange?.();
    return this.user;
  }

  async changePassword(current: string, next: string): Promise<string | null> {
    const r = await this.call('/api/account/password', 'POST', { current, next });
    return r.ok ? null : (r.reason ?? 'Could not change the password.');
  }

  async deleteAccount(password: string): Promise<string | null> {
    const r = await this.call('/api/account/delete', 'POST', { password });
    if (!r.ok) return r.reason ?? 'Could not delete the account.';
    this.stored = null;
    this.user = null;
    this.persist();
    return null;
  }

  // ————— cloud save —————

  /**
   * First sync after signing in on this device: returns the cloud save when
   * there is one this device hasn't seen (the player chooses which to keep).
   */
  async pull(): Promise<SaveConflict | null> {
    if (!this.stored) return null;
    const r = await this.call<{ save: Record<string, unknown> | null; at: number }>('/api/account/save');
    if (!r.ok || !r.data) return null;
    if (r.data.save && r.data.at > this.stored.base) {
      this.conflict = { cloud: r.data.save, at: r.data.at };
      this.onChange?.();
      return this.conflict;
    }
    return null;
  }

  /** Upload this device's progress. `force` overwrites a newer cloud copy (the player chose "keep this device"). */
  async push(save: object, force = false): Promise<'ok' | 'conflict' | 'offline'> {
    if (!this.stored || this.syncing) return 'offline';
    if (this.conflict && !force) return 'conflict';
    // Nothing changed since the last upload: don't bump the cloud copy (other devices would see a conflict).
    const text = JSON.stringify(save);
    if (!force && text === this.lastPushed) return 'ok';
    this.syncing = true;
    try {
      const r = await this.call<{ at: number; save?: Record<string, unknown> }>('/api/account/save', 'PUT', { save, base: this.stored.base, force });
      if (r.status === 409 && r.data?.save) {
        this.conflict = { cloud: r.data.save, at: r.data.at };
        this.onChange?.();
        return 'conflict';
      }
      if (!r.ok || !r.data) return 'offline';
      this.stored.base = r.data.at;
      this.lastPushed = text;
      this.conflict = null;
      this.lastSync = Date.now();
      this.persist();
      return 'ok';
    } finally {
      this.syncing = false;
    }
  }

  /** The player picked the cloud copy: this device now follows it. */
  acceptCloud(): Record<string, unknown> | null {
    if (!this.stored || !this.conflict) return null;
    const save = this.conflict.cloud;
    this.stored.base = this.conflict.at;
    this.lastPushed = '';
    this.conflict = null;
    this.lastSync = Date.now();
    this.persist();
    return save;
  }

  // ————— friends and clubs —————

  presence(room: string | null): void {
    if (this.stored) void this.call('/api/account/presence', 'POST', { room });
  }

  friends(): Promise<ApiResult<{ friends: Friend[]; requests: string[]; sent: string[] }>> {
    return this.call('/api/friends');
  }

  friendAction(action: 'request' | 'respond' | 'remove', name: string, accept?: boolean): Promise<ApiResult<{ friends?: boolean }>> {
    return this.call(`/api/friends/${action}`, 'POST', { name, accept });
  }

  myClub(): Promise<ApiResult<{ club: ClubInfo | null }>> {
    return this.call('/api/clubs/mine');
  }

  findClubs(q: string): Promise<ApiResult<{ clubs: ClubInfo[] }>> {
    return this.call(`/api/clubs?q=${encodeURIComponent(q)}`);
  }

  clubAction(action: 'create' | 'join' | 'leave' | 'kick', body: Record<string, string> = {}): Promise<ApiResult<{ club?: ClubInfo }>> {
    return this.call(`/api/clubs/${action}`, 'POST', body);
  }
}

/** The room a club meets in (multiplayer). */
export const clubRoom = (tag: string): string => `club-${tag.toLowerCase()}`;
