import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AccountUser } from './accounts.mjs';

export declare const MAIL_LIMITS: { imageBytes: number; text: number; inbox: number; pinned: number; perDay: number; keepsakes: number };
export interface StoredHome { walls: string; roof: string; keepsakes: string[]; trophies: number }
export declare function cleanHome(home: unknown): StoredHome | null;
export declare function jpegFromDataUrl(url: unknown): Buffer | null;
export declare function createMail(opts: {
  dataDir: string;
  userForToken: (token: string) => AccountUser | null;
  userByName: (name: string) => AccountUser | null;
  userById: (id: string) => AccountUser | null;
  now?: () => number;
}): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  forget(uid: string): void;
  stats(): { postcards: number; homes: number };
  flush(): void;
};
