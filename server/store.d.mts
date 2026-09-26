import type { IncomingMessage, ServerResponse } from 'node:http';

export declare const STORE_LIMITS: { codesPerBatch: number; codes: number; redeemPerHour: number };
export declare function seasonIdAt(t: number): string;
export declare function normaliseCode(s: unknown): string;
export interface Store {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  grant(uid: string, kind: 'patron', season: string, source: string): boolean;
  isPatron(uid: string, season?: string): boolean;
  makeCodes(count: number, season?: string): { ok: true; season: string; codes: string[] } | { ok: false; reason: string };
  grantByName(name: string, season?: string): { ok: true; granted: boolean; name: string; season: string } | { ok: false; reason: string };
  codeStats(): { current: string; seasons: { season: string; issued: number; redeemed: number }[]; patrons: Record<string, number> };
  flush(): void;
}
export declare function createStore(opts: { dataDir: string; userForToken: (t: string) => { id: string; name: string } | null; userByName: (n: string) => { id: string; name: string } | null; now?: () => number }): Store;
