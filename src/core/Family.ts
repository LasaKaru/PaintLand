/**
 * Family settings (parental controls): a parent sets a PIN and chooses what
 * this device may do online. While a PIN is set, the choices can only be
 * changed after entering it. It is a lock for this device, like a console's
 * parental PIN; forgetting it means resetting the game's data on the device.
 */

export interface FamilyLock {
  /** `salt:sha256(salt + pin)` in hex, or null when there is no lock. */
  pin: string | null;
  /** May play online (multiplayer rooms, invites, live races). */
  online: boolean;
  /** May see and send chat (always filtered while locked). */
  chat: boolean;
  /** May use voice chat. */
  voice: boolean;
}

export const DEFAULT_FAMILY: FamilyLock = { pin: null, online: true, chat: true, voice: false };

export const PIN_PATTERN = /^\d{4,8}$/;

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(salt: string, pin: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`)));
}

export async function hashPin(pin: string): Promise<string> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(12)).buffer);
  return `${salt}:${await digest(salt, pin)}`;
}

export async function checkPin(pin: string, stored: string | null): Promise<boolean> {
  if (!stored || !PIN_PATTERN.test(pin)) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return (await digest(salt, pin)) === hash;
}

export function isLocked(f: FamilyLock | undefined): boolean {
  return !!f?.pin;
}

/** What the lock allows, applied to the player's own choices. */
export function familyCaps<T extends { chat: 'filtered' | 'on' | 'off'; voice: boolean; family: FamilyLock }>(o: T): T {
  const f = o.family;
  if (!isLocked(f)) return o;
  if (!f.chat || !f.online) o.chat = 'off';
  else if (o.chat === 'on') o.chat = 'filtered';
  if (!f.voice || !f.online) o.voice = false;
  return o;
}

export function onlineAllowed(f: FamilyLock | undefined): boolean {
  return !isLocked(f) || !!f!.online;
}

/** Wrong PINs: after 5 tries, wait a minute between attempts. */
export class PinGuard {
  private fails = 0;
  private until = 0;

  wait(now = Date.now()): number {
    return Math.max(0, Math.ceil((this.until - now) / 1000));
  }

  record(ok: boolean, now = Date.now()): void {
    if (ok) {
      this.fails = 0;
      this.until = 0;
      return;
    }
    this.fails++;
    if (this.fails >= 5) this.until = now + 60_000;
  }
}
