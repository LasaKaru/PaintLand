export declare function hashRoom(room: string): number;
export declare function shardFor(room: string, count: number): number;
export declare function shardConfig(env?: Record<string, string | undefined>): { count: number; index: number; urls: string[]; primary: boolean; primaryHttp: string; secret: string };
export declare function secretOk(req: { headers: Record<string, string | string[] | undefined> }, secret: string): boolean;
export declare function createShardLink(opts: { primaryHttp: string; secret: string; index: number; fetchImpl?: typeof fetch; now?: () => number }): {
  hello(acct: unknown, name: unknown): Promise<{ name: string; verified: boolean; banned: boolean }>;
  isBanned(name: string): boolean;
  logChat(room: string, name: string, text: string): void;
  reportLive(live: { rooms: number; online: number; roomSizes: Record<string, number> }): Promise<unknown>;
  stop(): void;
};
