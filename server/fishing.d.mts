import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AccountUser } from './accounts.mjs';

export declare const FISHING_LIMITS: { board: number; keepWeeks: number; gapMs: number };
export declare function createFishing(opts: { dataDir: string; userForToken: (token: string) => AccountUser | null; isBanned: (name: string) => boolean; enabled?: () => boolean; now?: () => number }): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  forget(uid: string): void;
  stats(): { fish: string; anglers: number };
  flush(): void;
};
