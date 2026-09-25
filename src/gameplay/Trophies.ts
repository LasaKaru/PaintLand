import { CATALOGUE, type Profile } from './Profile';

const CLOTHES = new Set(['hair', 'hat', 'top', 'bottom', 'glasses', 'back']);

/** One trophy: `progress` returns [current, target] from the profile. */
export interface TrophyDef {
  id: string;
  name: string;
  text: string;
  icon: string;
  reward: number;
  progress: (p: Profile) => [number, number];
}

const stat = (key: string, target: number) => (p: Profile): [number, number] => [Math.min(target, p.stat(key)), target];
const seenCount = (prefix: string, target: number) => (p: Profile): [number, number] => [Math.min(target, p.data.seen.filter((t) => t.startsWith(prefix)).length), target];

/**
 * Trophies (docs/06 §6, docs/12 §3). Every trophy is data plus a progress
 * function over lifetime stats, so the menu can show "7 / 10" bars and the game
 * only has to bump counters.
 */
export const TROPHIES: TrophyDef[] = [
  { id: 'first-lap', name: 'First Stroke', text: 'Finish a lap of any chapter.', icon: '🏁', reward: 30, progress: stat('laps', 1) },
  { id: 'ten-laps', name: 'Well Travelled', text: 'Finish 10 laps.', icon: '🛞', reward: 120, progress: stat('laps', 10) },
  { id: 'notes-100', name: 'Humming Along', text: 'Collect 100 notes.', icon: '♪', reward: 40, progress: stat('notes', 100) },
  { id: 'notes-1000', name: 'Full Orchestra', text: 'Collect 1,000 notes.', icon: '🎼', reward: 200, progress: stat('notes', 1000) },
  { id: 'phrases-10', name: 'Songwriter', text: 'Seal 10 phrases.', icon: '✓', reward: 60, progress: (p) => [Math.min(10, p.totalSealed()), 10] },
  { id: 'air-2', name: 'Paper Plane', text: 'Stay in the air for 2 seconds.', icon: '🪁', reward: 50, progress: (p) => [p.stat('maxAir') >= 2 ? 1 : 0, 1] },
  { id: 'speed-200', name: 'Wet Paint', text: 'Reach 200 km/h.', icon: '💨', reward: 60, progress: (p) => [p.stat('maxSpeed') >= 200 ? 1 : 0, 1] },
  { id: 'upside-60', name: 'Which Way Is Down?', text: 'Drive upside down for 60 seconds in total.', icon: '🙃', reward: 80, progress: stat('upsideDown', 60) },
  { id: 'distance-50', name: 'Long Brush', text: 'Drive 50 km.', icon: '🛣', reward: 150, progress: (p) => [Math.min(50, Math.floor(p.stat('distance') / 1000)), 50] },
  { id: 'missions-5', name: 'Helping Hand', text: 'Complete 5 missions.', icon: '🤝', reward: 80, progress: (p) => [Math.min(5, p.data.missionsDone.length), 5] },
  { id: 'missions-18', name: 'Everyone’s Friend', text: 'Complete all 18 missions.', icon: '🌟', reward: 400, progress: (p) => [Math.min(18, p.data.missionsDone.length), 18] },
  { id: 'chapters-3', name: 'World Tour', text: 'Drive in all three chapters.', icon: '🗺', reward: 100, progress: seenCount('chapter:', 3) },
  { id: 'weather-5', name: 'Four Seasons (and a Storm)', text: 'Drive in all five kinds of weather.', icon: '⛈', reward: 80, progress: seenCount('weather:', 5) },
  { id: 'styles-3', name: 'Change of Brush', text: 'Try all three art styles.', icon: '🎨', reward: 40, progress: seenCount('style:', 3) },
  { id: 'photo-1', name: 'Say Cheese', text: 'Take a photo in photo mode.', icon: '📷', reward: 30, progress: stat('photos', 1) },
  { id: 'photo-10', name: 'Sketchbook Full', text: 'Take 10 photos.', icon: '🖼', reward: 80, progress: stat('photos', 10) },
  { id: 'ghost-beat', name: 'Faster Than Yourself', text: 'Beat your own ghost to the finish.', icon: '👻', reward: 80, progress: stat('ghostBeaten', 1) },
  { id: 'night-rain', name: 'Night Owl', text: 'Drive 2 km at night in the rain.', icon: '🌧', reward: 60, progress: (p) => [Math.min(2, Math.floor(p.stat('nightRain') / 1000)), 2] },
  { id: 'realistic-lap', name: 'Stick Shift', text: 'Finish a lap with realistic handling.', icon: '⚙', reward: 80, progress: stat('realLaps', 1) },
  { id: 'friends', name: 'Painting Party', text: 'Drive with another player online.', icon: '👋', reward: 50, progress: stat('multiplayer', 1) },
  { id: 'wardrobe', name: 'Dressed Up', text: 'Own 10 clothing items that cost ink.', icon: '👒', reward: 60, progress: (p) => [Math.min(10, CATALOGUE.filter((i) => CLOTHES.has(i.category) && i.price > 0 && p.owns(i.id)).length), 10] },
  { id: 'garage', name: 'Collector', text: 'Own three vehicles.', icon: '🚗', reward: 100, progress: (p) => [Math.min(3, p.data.owned.filter((id) => id.startsWith('vehicle:')).length), 3] },
];

export function trophyUnlocked(p: Profile, t: TrophyDef): boolean {
  const [a, b] = t.progress(p);
  return a >= b;
}

/**
 * Check every trophy and unlock the ones that just completed.
 * Returns the newly unlocked trophies (the caller shows a toast and pays the reward).
 */
export function checkTrophies(p: Profile): TrophyDef[] {
  const fresh: TrophyDef[] = [];
  for (const t of TROPHIES) {
    if (p.data.trophies.includes(t.id)) continue;
    if (!trophyUnlocked(p, t)) continue;
    p.data.trophies.push(t.id);
    p.data.ink += t.reward;
    fresh.push(t);
  }
  if (fresh.length) p.save();
  return fresh;
}
