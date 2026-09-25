import type { RoadPath } from '../road/RoadPath';
import type { Random } from '../core/Random';
import type { DistrictDef } from './Districts';
import type { Decorator } from './Decorator';
import { SKETCH } from './chapters/sketch';
import { SERENDIB } from './chapters/serendib';
import { WONDERS } from './chapters/wonders';
import { LANTERNS } from './chapters/lanterns';

/**
 * A chapter is one continuous route of districts plus its wider world
 * (docs/04 §1). Only one chapter is loaded at a time.
 */
export interface ChapterDef {
  id: 'sketch' | 'serendib' | 'wonders' | 'lanterns' | 'custom';
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

export const CHAPTERS: ChapterDef[] = [SKETCH, SERENDIB, WONDERS, LANTERNS];

/** The road being test-driven from the Road Studio (not in the chapter list). */
let custom: ChapterDef | null = null;

export function setCustomChapter(def: ChapterDef | null): void {
  custom = def;
}

export function chapterById(id: string): ChapterDef {
  if (id === 'custom' && custom) return custom;
  return CHAPTERS.find((c) => c.id === id) ?? SKETCH;
}
