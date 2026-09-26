import type { IncomingMessage, ServerResponse } from 'node:http';

export declare const GALLERY_LIMITS: { codeMax: number; perDay: number; pageSize: number; maxRoads: number; hideAfterReports: number };
export declare const THEMES: string[];
export declare function weekOf(t: number): { key: string; endsAt: number; index: number };
export declare function themeFor(t: number): string;
export declare function checkRoadCode(code: unknown): { name: string } | null;
export declare function score(r: { ratings: Record<string, number> }): number;
export declare function createGallery(opts: { dataDir: string; userForToken: (t: string) => { id: string; name: string } | null; isBanned: (n: string) => boolean; now?: () => number }): {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean>;
  reported(): { id: string; title: string; author: string; reports: number; hidden: boolean; code: string }[];
  moderate(id: string, action: 'remove' | 'keep'): boolean;
  stats(): { roads: number; hidden: number };
  flush(): void;
};
