import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AccountUser } from './accounts.mjs';

export declare const PHOTO_LIMITS: { imageBytes: number; caption: number; votes: number; hideAfterReports: number; keepWeeks: number };
export declare function photoFromDataUrl(url: unknown): Buffer | null;
export declare function pickWinner<T extends { hidden: boolean; votes: unknown[]; at: number }>(entries: T[]): T | null;
export declare function createPhotos(opts: { dataDir: string; userForToken: (token: string) => AccountUser | null; isBanned: (name: string) => boolean; now?: () => number }): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  forget(uid: string): void;
  stats(): { entries: number };
  flush(): void;
};
