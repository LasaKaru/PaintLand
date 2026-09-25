export declare const LIMITS: { maxSpeed: number; maxS: number; maxX: number; minH: number; maxH: number; slack: number; name: number; chat: number };
export declare function validateState(msg: unknown, prev: { s: number; chapter: string; at: number } | null, now: number): { ok: true } | { ok: false; reason: string };
export declare function cleanText(text: unknown, max?: number): string | null;
export declare class Strikes {
  constructor(limit?: number, windowMs?: number);
  add(now: number): boolean;
}
export function clientIp(req: { socket?: { remoteAddress?: string }; headers?: Record<string, string | string[] | undefined> }, trustProxy?: boolean): string;
