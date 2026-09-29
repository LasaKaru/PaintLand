import type { IncomingMessage, ServerResponse } from 'node:http';

export interface AdminConfig {
  company: { name: string; site: string; tagline: string; contact: string; logo?: string };
  links: { coffee: string; fund: string; sponsor: string; custom: { label: string; url: string }[] };
  logoFrequency: number;
  showSponsorCta: boolean;
  maxPlayersPerRoom: number;
  sponsors: { id: string; name: string; url: string; file: string; weight: number; enabled: boolean }[];
  challenges?: AdminChallenge[];
  legal: AdminLegal;
  features: { fishingContest: boolean; party: boolean };
}
export interface AdminLegal { entity: string; country: string; minAge: number; updated: string; healthWarning: boolean; termsForOnline: boolean; hideDonationsInApp: boolean; credits: { name: string; role: string }[] }
export interface AdminChallenge { id: string; sponsorId: string; title: string; text: string; kind: string; target: number; ink: number; item: string; start: number; end: number; enabled: boolean }
export declare const CHALLENGE_KINDS: string[];
export declare function activeChallenges(config: AdminConfig, now?: number): { id: string; title: string; text: string; kind: string; target: number; ink: number; item?: string; end: number; sponsor: { name: string; url: string; image: string } }[];
export declare const DEFAULT_CONFIG: AdminConfig;
export declare const DEFAULT_ADMIN: { email: string; salt: string; hash: string };
export declare function safeUrl(s: unknown): string;
export declare function sanitizeConfig(input: unknown, current: AdminConfig): AdminConfig;
/** Frame rates under this count as a slow play minute on the dashboard. */
export declare const SLOW_FPS: number;
/** An error's group key: the message plus the top stack frame without build hashes or line numbers. */
export declare function crashSignature(msg: string, top: string): string;
export declare function crashId(msg: string, top: string): string;
export declare function hashPassword(password: string, salt?: string): { salt: string; hash: string };
export declare function checkPassword(password: string, rec: { salt: string; hash: string }): boolean;
export declare function createAdmin(opts: { dataDir: string; distDir?: string; live: () => { rooms: number; online: number; roomSizes: Record<string, number> }; accounts?: () => { accounts: number; clubs: number; online: number } | null; gallery?: () => { reported(): unknown[]; moderate(id: string, action: 'remove' | 'keep'): boolean; stats(): { roads: number; hidden: number } } | null; store?: () => import('./store.mjs').Store | null; photos?: () => { recent(): unknown[]; moderate(id: string, action: 'hide' | 'show' | 'remove'): boolean; image(id: string): string | null } | null }): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  maxRoom(): number;
  features(): { fishingContest: boolean; party: boolean };
  isBanned(name: string): boolean;
  bannedList(): string[];
  logChat(room: string, name: string, text: string): void;
};
export declare const REPORT_REASONS: string[];
export interface Report { id: string; at: number; reporter: string; target: string; reason: string; note: string; room: string; chat: string[]; status: 'open' | 'dismissed' | 'banned' }
export declare function sanitizeReport(body: unknown, now?: number): Report | null;
export declare function iceServers(env?: Record<string, string | undefined>, now?: number): { urls: string[]; username?: string; credential?: string }[];
