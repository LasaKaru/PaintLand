import type { AccountClient } from './Account';
import { apiUrl } from './Api';

/** A postcard in your mailbox (server/mail.mjs). */
export interface Postcard {
  id: string;
  from: string;
  text: string;
  at: number;
  pinned: boolean;
}

export interface VisitedHome {
  name: string;
  home: { walls: string; roof: string; keepsakes: string[]; trophies: number };
  cards: Postcard[];
}

/** Postcard pictures are small: 640 × 400 JPEG, well under the server's 90 KB. */
export const POSTCARD_W = 640;
export const POSTCARD_H = 400;

/** Shrink a rendered frame to a postcard-sized JPEG data URL (cropped to fill). */
export function postcardImage(source: HTMLCanvasElement, quality = 0.72): string {
  const c = document.createElement('canvas');
  c.width = POSTCARD_W;
  c.height = POSTCARD_H;
  const g = c.getContext('2d');
  if (!g) return '';
  const scale = Math.max(POSTCARD_W / source.width, POSTCARD_H / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  g.drawImage(source, (POSTCARD_W - w) / 2, (POSTCARD_H - h) / 2, w, h);
  let url = c.toDataURL('image/jpeg', quality);
  // A very busy picture: squeeze a little harder.
  if (url.length > 115_000) url = c.toDataURL('image/jpeg', 0.5);
  return url;
}

/** Postcards and homes over the account's session. Pictures are fetched once and kept. */
export class MailClient {
  private readonly pictures = new Map<string, Promise<HTMLImageElement | null>>();

  constructor(private readonly account: AccountClient) {}

  async inbox(): Promise<Postcard[] | string> {
    const r = await this.account.call<{ cards: Postcard[] }>('/api/postcards');
    return r.ok && r.data ? r.data.cards : r.reason ?? 'offline';
  }

  async send(to: string, image: string, text: string): Promise<string | null> {
    const r = await this.account.call('/api/postcards/send', 'POST', { to, image, text });
    return r.ok ? null : r.reason ?? 'offline';
  }

  async pin(id: string, pinned: boolean): Promise<string | null> {
    const r = await this.account.call('/api/postcards/pin', 'POST', { id, pinned });
    return r.ok ? null : r.reason ?? 'offline';
  }

  async remove(id: string): Promise<string | null> {
    this.pictures.delete(id);
    const r = await this.account.call('/api/postcards/delete', 'POST', { id });
    return r.ok ? null : r.reason ?? 'offline';
  }

  async saveHome(home: object): Promise<boolean> {
    return (await this.account.call('/api/home', 'PUT', { home })).ok;
  }

  async visit(name: string): Promise<VisitedHome | string> {
    const r = await this.account.call<VisitedHome>(`/api/home/${encodeURIComponent(name)}`);
    return r.ok && r.data ? r.data : r.reason ?? 'offline';
  }

  /** A postcard's picture (needs the session, so it's fetched rather than linked). */
  picture(id: string): Promise<HTMLImageElement | null> {
    let p = this.pictures.get(id);
    if (!p) {
      p = this.fetchPicture(id);
      this.pictures.set(id, p);
    }
    return p;
  }

  private async fetchPicture(id: string): Promise<HTMLImageElement | null> {
    const token = this.account.token;
    if (!token || !/^[0-9a-f-]{36}$/.test(id)) return null;
    try {
      const res = await fetch(apiUrl(`/api/postcards/${id}.jpg`), { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) {
        this.pictures.delete(id);
        return null;
      }
      const url = URL.createObjectURL(await res.blob());
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      this.pictures.delete(id);
      return null;
    }
  }
}
