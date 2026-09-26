import type { IncomingMessage, ServerResponse } from 'node:http';

export declare const ACCOUNT_LIMITS: {
  nameMin: number;
  nameMax: number;
  passwordMin: number;
  passwordMax: number;
  saveBytes: number;
  friends: number;
  requests: number;
  clubMembers: number;
  sessionDays: number;
  presenceMs: number;
};
export declare function cleanAccountName(name: unknown): string | null;
export declare function nameKey(name: unknown): string;
export declare function passwordProblem(password: unknown, name?: string): string | null;
export interface AccountUser { id: string; name: string; friends: string[]; requests: string[]; club: string | null; saveAt: number }
export declare function createAccounts(opts: { dataDir: string; isBanned: (name: string) => boolean; now?: () => number }): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  userForToken(token: unknown): AccountUser | null;
  isTaken(name: string): boolean;
  stats(): { accounts: number; clubs: number; online: number };
  flush(): void;
};
