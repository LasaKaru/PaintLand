/**
 * The campaign: "The Lost Palette" as a numbered journey with a beginning
 * and an end. A prologue in Harbour Town (meet Varna), eight missions — one
 * lost colour per chapter, each chapter's districts being its checkpoints —
 * and a finale at the World's End, where the palette paints the sky and the
 * credits roll. After the end the whole world stays open to play.
 *
 * The eight colour missions can be done in any order once the prologue is
 * done; the finale opens when all eight are home.
 */
import { STORY_PAGES, type StoryState } from './Story';

export type CampaignKind = 'meet' | 'chapter' | 'finale';

export interface CampaignStep {
  id: string;
  kind: CampaignKind;
  /** The chapter to play (chapter missions). */
  chapter?: string;
  /** The free-roam area it happens in (prologue, finale). */
  area?: string;
  title: string;
  brief: string;
  hex: string;
}

export const CAMPAIGN: CampaignStep[] = [
  { id: 'prologue', kind: 'meet', area: 'harbour', title: 'The Storm', brief: 'Varna, the old painter of Harbour Town, has lost her colours in the storm. Find her by the harbour and hear what happened.', hex: '#6f6a8a' },
  ...STORY_PAGES.map((p) => ({ id: `ch-${p.chapter}`, kind: 'chapter' as const, chapter: p.chapter, title: p.title, brief: p.clue, hex: p.hex })),
  { id: 'finale', kind: 'finale', area: 'worldsend', title: 'The Last Page', brief: 'All eight colours are home. Take the palette to the Edge of the World, sit down, and paint the sky.', hex: '#9a7ad8' },
];

export type StepState = 'done' | 'next' | 'open' | 'locked';

export function stepDone(s: StoryState, step: CampaignStep): boolean {
  if (step.kind === 'meet') return s.started;
  if (step.kind === 'chapter') return !!step.chapter && s.found.includes(step.chapter);
  return !!s.finale;
}

/** Index of the next step to play (CAMPAIGN.length when the story is over). */
export function nextStep(s: StoryState): number {
  const i = CAMPAIGN.findIndex((step) => !stepDone(s, step));
  return i < 0 ? CAMPAIGN.length : i;
}

export function stepState(s: StoryState, i: number): StepState {
  const step = CAMPAIGN[i];
  if (!step) return 'locked';
  if (stepDone(s, step)) return 'done';
  if (i === nextStep(s)) return 'next';
  if (step.kind === 'chapter' && s.started) return 'open';
  return 'locked';
}

/** The finale can be played: every colour is home. */
export function finaleReady(s: StoryState): boolean {
  return s.started && STORY_PAGES.every((p) => s.found.includes(p.chapter)) && !s.finale;
}

/** The ending should play at the edge: the finale is ready, or it was interrupted before the credits. */
export function endingDue(s: StoryState): boolean {
  return finaleReady(s) || (!!s.finale && !s.credits);
}

/** "Mission 3" etc.: the prologue and finale have names instead of numbers (null). */
export function missionNumber(i: number): number | null {
  const step = CAMPAIGN[i];
  return step?.kind === 'chapter' ? i : null;
}

/** How far through the story, 0 … 1. */
export function progress(s: StoryState): number {
  return CAMPAIGN.filter((step) => stepDone(s, step)).length / CAMPAIGN.length;
}
