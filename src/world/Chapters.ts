import type { RoadPath } from '../road/RoadPath';
import type { Random } from '../core/Random';
import type { DistrictDef } from './Districts';
import type { Decorator } from './Decorator';
import { SKETCH } from './chapters/sketch';
import { SERENDIB } from './chapters/serendib';
import { WONDERS } from './chapters/wonders';

/**
 * A chapter is one continuous route of districts plus its wider world
 * (docs/04 §1). Only one chapter is loaded at a time.
 */
export interface ChapterDef {
  id: 'sketch' | 'serendib' | 'wonders';
  name: string;
  kicker: string;
  blurb: string;
  districts: DistrictDef[];
  /** Time-of-day preset when the chapter loads. */
  startPreset: string;
  /** Sealed phrases needed to unlock (0 = open from the start). */
  unlockPhrases: number;
  buildRoute(): RoadPath;
  /** Dress everything that is not along the road: islands, mountains, clouds. */
  background(d: Decorator, rnd: Random): void;
}

export const CHAPTERS: ChapterDef[] = [SKETCH, SERENDIB, WONDERS];

export function chapterById(id: string): ChapterDef {
  return CHAPTERS.find((c) => c.id === id) ?? SKETCH;
}
