import type { IncomingMessage, ServerResponse } from 'node:http';

export interface AdminConfig {
  company: { name: string; site: string; tagline: string; contact: string; logo?: string };
  links: { coffee: string; fund: string; sponsor: string; custom: { label: string; url: string }[] };
  logoFrequency: number;
  showSponsorCta: boolean;
  maxPlayersPerRoom: number;
  sponsors: { id: string; name: string; url: string; file: string; weight: number; enabled: boolean }[];
}
export declare const DEFAULT_CONFIG: AdminConfig;
export declare const DEFAULT_ADMIN: { email: string; salt: string; hash: string };
export declare function safeUrl(s: unknown): string;
export declare function sanitizeConfig(input: unknown, current: AdminConfig): AdminConfig;
export declare function hashPassword(password: string, salt?: string): { salt: string; hash: string };
export declare function checkPassword(password: string, rec: { salt: string; hash: string }): boolean;
export declare function createAdmin(opts: { dataDir: string; distDir?: string; live: () => { rooms: number; online: number; roomSizes: Record<string, number> }; accounts?: () => { accounts: number; clubs: number; online: number } | null; gallery?: () => { reported(): unknown[]; moderate(id: string, action: 'remove' | 'keep'): boolean; stats(): { roads: number; hidden: number } } | null }): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  maxRoom(): number;
  isBanned(name: string): boolean;
  logChat(room: string, name: string, text: string): void;
};
export declare const REPORT_REASONS: string[];
export interface Report { id: string; at: number; reporter: string; target: string; reason: string; note: string; room: string; chat: string[]; status: 'open' | 'dismissed' | 'banned' }
export declare function sanitizeReport(body: unknown, now?: number): Report | null;
export declare function iceServers(env?: Record<string, string | undefined>, now?: number): { urls: string[]; username?: string; credential?: string }[];
