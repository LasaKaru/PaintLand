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
  { id: 'secrets-20', name: 'Keen Eye', text: 'Find 20 golden paint pots.', icon: '🗝', reward: 200, progress: stat('secrets', 20) },
  { id: 'stunts-6', name: 'Daredevil', text: 'Land all 6 stunt jumps in Serendib City.', icon: '🏁', reward: 250, progress: seenCount('stunt:', 6) },
  { id: 'legendary-1', name: 'Lucky Dip', text: 'Open a chest with legendary loot.', icon: '🎁', reward: 100, progress: stat('legendary', 1) },
  { id: 'city-missions-12', name: 'City Legend', text: 'Finish all 12 city missions.', icon: '🗺', reward: 500, progress: seenCount('cm:', 12) },
  { id: 'restore-8', name: 'Painter of Serendib', text: 'Paint all 8 districts of Serendib City.', icon: '🖌', reward: 800, progress: seenCount('restored:city:', 8) },
  { id: 'hunt-10', name: 'Shutterbug', text: 'Photograph all 10 sights of the photo hunt.', icon: '📸', reward: 300, progress: seenCount('photo:', 10) },
  { id: 'streak-7', name: 'Seven Brushstrokes', text: 'Finish every daily brushstroke 7 days in a row.', icon: '☀', reward: 400, progress: (p) => [Math.min(7, p.data.streak?.count ?? 0), 7] },
  { id: 'perahera-1', name: 'Festival Night', text: 'Ride along with the night perahera.', icon: '🐘', reward: 150, progress: stat('perahera', 1) },
  // ————— the 2.0 trophies: every part of the game has a few —————
  ...[
    ['sketch', 'The Sketch', '✏'],
    ['serendib', 'Serendib', '🐘'],
    ['wonders', 'Wonders of the Sketchbook', '🏛'],
    ['lanterns', 'Lantern Roads', '🏮'],
    ['postcards', 'Postcards', '💌'],
  ].map(([id, name, icon]) => ({ id: `lap-${id}`, name: `Finished: ${name}`, text: `Finish a lap of ${name}.`, icon, reward: 80, progress: (p: Profile): [number, number] => [p.data.bestLap[id] !== undefined ? 1 : 0, 1] })),
  { id: 'chapters-5', name: 'Every Page Turned', text: 'Finish a lap of all five chapters.', icon: '📖', reward: 400, progress: (p) => [['sketch', 'serendib', 'wonders', 'lanterns', 'postcards'].filter((c) => p.data.bestLap[c] !== undefined).length, 5] },
  { id: 'laps-50', name: 'Road Regular', text: 'Finish 50 laps.', icon: '🛞', reward: 250, progress: stat('laps', 50) },
  { id: 'laps-100', name: 'Centurion', text: 'Finish 100 laps.', icon: '💯', reward: 500, progress: stat('laps', 100) },
  { id: 'notes-5000', name: 'Symphony', text: 'Collect 5,000 notes.', icon: '🎻', reward: 400, progress: stat('notes', 5000) },
  { id: 'phrases-50', name: 'Composer', text: 'Seal 50 phrases.', icon: '🎹', reward: 250, progress: (p) => [Math.min(50, p.totalSealed()), 50] },
  { id: 'distance-10', name: 'Sunday Drive', text: 'Drive 10 km.', icon: '🚗', reward: 50, progress: (p) => [Math.min(10, Math.floor(p.stat('distance') / 1000)), 10] },
  { id: 'distance-250', name: 'Round the Island', text: 'Drive 250 km.', icon: '🗺', reward: 400, progress: (p) => [Math.min(250, Math.floor(p.stat('distance') / 1000)), 250] },
  { id: 'distance-1000', name: 'A Thousand Brushstrokes', text: 'Drive 1,000 km.', icon: '🌍', reward: 1000, progress: (p) => [Math.min(1000, Math.floor(p.stat('distance') / 1000)), 1000] },
  { id: 'walk-1', name: 'Stretch Your Legs', text: 'Walk 1 km.', icon: '🚶', reward: 40, progress: (p) => [Math.min(1, Math.floor(p.stat('walked') / 1000)), 1] },
  { id: 'walk-10', name: 'Wanderer', text: 'Walk 10 km.', icon: '🥾', reward: 200, progress: (p) => [Math.min(10, Math.floor(p.stat('walked') / 1000)), 10] },
  { id: 'air-4', name: 'Paper Crane', text: 'Stay in the air for 4 seconds.', icon: '🕊', reward: 120, progress: (p) => [p.stat('maxAir') >= 4 ? 1 : 0, 1] },
  { id: 'speed-250', name: 'Wet Ink Streak', text: 'Reach 250 km/h.', icon: '⚡', reward: 150, progress: (p) => [p.stat('maxSpeed') >= 250 ? 1 : 0, 1] },
  { id: 'upside-600', name: 'Ceiling Painter', text: 'Drive upside down for 10 minutes in total.', icon: '🙃', reward: 300, progress: stat('upsideDown', 600) },
  { id: 'drift-60', name: 'Sideways', text: 'Drift for a minute in total.', icon: '🌀', reward: 60, progress: stat('driftTime', 60) },
  { id: 'drift-600', name: 'Drift King', text: 'Drift for 10 minutes in total.', icon: '👑', reward: 300, progress: stat('driftTime', 600) },
  { id: 'turbo-10', name: 'Mini-Turbo', text: 'Fire 10 drift mini-turbos.', icon: '🔥', reward: 60, progress: stat('miniTurbos', 10) },
  { id: 'turbo-100', name: 'Turbo Artist', text: 'Fire 100 drift mini-turbos.', icon: '🚀', reward: 250, progress: stat('miniTurbos', 100) },
  { id: 'stunts-25', name: 'Stunt Double', text: 'Land 25 stunt jumps.', icon: '🤸', reward: 250, progress: stat('stunts', 25) },
  { id: 'photo-50', name: 'Gallery Wall', text: 'Take 50 photos.', icon: '🖼', reward: 200, progress: stat('photos', 50) },
  { id: 'hunt-all', name: 'Postcard Collector', text: 'Photograph every sight of the photo hunt.', icon: '📮', reward: 400, progress: seenCount('photo:', 12) },
  { id: 'missions-30', name: 'Everyone’s Hero', text: 'Complete 30 chapter missions.', icon: '🦸', reward: 600, progress: (p) => [Math.min(30, p.data.missionsDone.length), 30] },
  { id: 'places-10', name: 'Explorer', text: 'Discover 10 named places in the free-roam towns.', icon: '📍', reward: 100, progress: seenCount('place:', 10) },
  { id: 'places-25', name: 'Cartographer', text: 'Discover 25 named places.', icon: '🧭', reward: 300, progress: seenCount('place:', 25) },
  { id: 'secrets-all', name: 'Golden Touch', text: 'Find every golden paint pot (28).', icon: '✨', reward: 500, progress: seenCount('secret:', 28) },
  { id: 'chests-10', name: 'Treasure Hunter', text: 'Open 10 different loot chests.', icon: '🧰', reward: 150, progress: seenCount('chestEver:', 10) },
  { id: 'pockets-1', name: 'Off the Map', text: 'Find a hidden pocket.', icon: '🔎', reward: 50, progress: seenCount('pocket:', 1) },
  { id: 'pockets-10', name: 'Nooks and Crannies', text: 'Find 10 hidden pockets.', icon: '🗝', reward: 250, progress: seenCount('pocket:', 10) },
  { id: 'pockets-20', name: 'Nothing Left Hidden', text: 'Find all 20 hidden pockets.', icon: '🏆', reward: 600, progress: seenCount('pocket:', 20) },
  { id: 'restore-all', name: 'Colour Everywhere', text: 'Paint 12 districts back to colour.', icon: '🌈', reward: 500, progress: seenCount('restored:', 12) },
  { id: 'streak-30', name: 'A Month of Mornings', text: 'Keep a 30-day daily brushstroke streak.', icon: '📅', reward: 1000, progress: (p) => [Math.min(30, p.data.streak?.count ?? 0), 30] },
  { id: 'trials-5', name: 'Against the Clock', text: 'Set 5 ranked time trial times.', icon: '⏱', reward: 150, progress: stat('trials', 5) },
  { id: 'races-1', name: 'Green Flag', text: 'Finish a live race against other players.', icon: '🏎', reward: 80, progress: stat('races', 1) },
  { id: 'races-20', name: 'Racing Season', text: 'Finish 20 live races.', icon: '🏁', reward: 400, progress: stat('races', 20) },
  { id: 'multi-10', name: 'Regular', text: 'Play online in 10 different sessions.', icon: '🌐', reward: 150, progress: stat('multiplayer', 10) },
  { id: 'emote-1', name: 'Ayubowan!', text: 'Greet someone with an emote.', icon: '🙏', reward: 30, progress: stat('emotes', 1) },
  { id: 'emote-all', name: 'Body Language', text: 'Use all eight emotes.', icon: '💃', reward: 120, progress: seenCount('emote:', 8) },
  { id: 'group-photo', name: 'Squad Goals', text: 'Take a group photo.', icon: '👥', reward: 80, progress: stat('groupPhotos', 1) },
  { id: 'contest-1', name: 'Friendly Rivals', text: 'Take part in a drift or stunt contest.', icon: '🏁', reward: 60, progress: stat('contests', 1) },
  { id: 'contest-win', name: 'Champion', text: 'Win a contest against other players.', icon: '🥇', reward: 200, progress: stat('contestWins', 1) },
  { id: 'paint-splash', name: 'Team Colours', text: 'Finish a co-op paint splash.', icon: '🎨', reward: 120, progress: stat('paintSplashes', 1) },
  { id: 'convoy', name: 'Follow the Leader', text: 'Earn 50 ink in convoys.', icon: '🚙', reward: 100, progress: stat('convoyInk', 50) },
  { id: 'publish-1', name: 'Road Builder', text: 'Publish a road to the gallery.', icon: '🛣', reward: 100, progress: stat('published', 1) },
  { id: 'rate-10', name: 'Critic', text: 'Rate 10 roads in the gallery.', icon: '⭐', reward: 80, progress: stat('ratings', 10) },
  { id: 'contest-road', name: 'Road of the Week', text: 'Place in the weekly road contest.', icon: '🏅', reward: 300, progress: seenCount('contest:', 1) },
  { id: 'mural-1', name: 'Street Artist', text: 'Paint a mural wall.', icon: '🖌', reward: 60, progress: (p) => [Math.min(1, Object.keys(p.data.murals ?? {}).length), 1] },
  { id: 'mural-6', name: 'Muralist', text: 'Paint all six mural walls.', icon: '🏙', reward: 300, progress: (p) => [Math.min(6, Object.keys(p.data.murals ?? {}).length), 6] },
  { id: 'livery', name: 'Custom Job', text: 'Paint a livery on a vehicle.', icon: '🚘', reward: 60, progress: (p) => [Object.values(p.data.vehicleLooks).some((l) => !!l?.livery) ? 1 : 0, 1] },
  { id: 'stickers-1', name: 'Sticky Fingers', text: 'Fill a page of the sticker book.', icon: '📒', reward: 100, progress: seenCount('stickers:', 1) },
  { id: 'stickers-all', name: 'Scrapbook', text: 'Fill every page of the sticker book.', icon: '📚', reward: 800, progress: seenCount('stickers:', 6) },
  { id: 'garage-5', name: 'Car Park', text: 'Own five vehicles.', icon: '🅿', reward: 200, progress: (p) => [Math.min(5, p.data.owned.filter((id) => id.startsWith('vehicle:')).length), 5] },
  { id: 'garage-all', name: 'Full Garage', text: 'Own all ten vehicles.', icon: '🏎', reward: 800, progress: (p) => [Math.min(10, p.data.owned.filter((id) => id.startsWith('vehicle:')).length), 10] },
  { id: 'sailor', name: 'Paper Sailor', text: 'Float out to sea in the paper boat.', icon: '⛵', reward: 100, progress: seenCount('sailed', 1) },
  { id: 'parts-10', name: 'Tuner', text: 'Own 10 garage parts that cost ink.', icon: '🔧', reward: 150, progress: (p) => [Math.min(10, CATALOGUE.filter((i) => PARTS.has(i.category) && i.price > 0 && p.owns(i.id)).length), 10] },
  { id: 'chrome', name: 'Mirror Finish', text: 'Paint a vehicle chrome.', icon: '🪞', reward: 80, progress: (p) => [Object.values(p.data.vehicleLooks).some((l) => l?.finish === 'chrome') ? 1 : 0, 1] },
  { id: 'wardrobe-30', name: 'Fashion Plate', text: 'Own 30 clothing items that cost ink.', icon: '👗', reward: 300, progress: (p) => [Math.min(30, CATALOGUE.filter((i) => CLOTHES.has(i.category) && i.price > 0 && p.owns(i.id)).length), 30] },
  { id: 'outfits-3', name: 'Quick Change', text: 'Save three outfits.', icon: '💾', reward: 60, progress: (p) => [Math.min(3, p.data.outfits?.length ?? 0), 3] },
  { id: 'lanka-pack', name: 'Island Style', text: 'Own the Sri Lankan outfit pack.', icon: '🇱🇰', reward: 80, progress: (p) => [p.owns('pack:lanka') ? 1 : 0, 1] },
  { id: 'pet', name: 'Best Friend', text: 'Adopt a pet.', icon: '🐾', reward: 80, progress: (p) => [p.data.owned.some((id) => id.startsWith('pet:') && id !== 'pet:none') ? 1 : 0, 1] },
  { id: 'pets-all', name: 'Menagerie', text: 'Own all three pets.', icon: '🦊', reward: 400, progress: (p) => [Math.min(3, p.data.owned.filter((id) => id.startsWith('pet:') && id !== 'pet:none').length), 3] },
  { id: 'festival-1', name: 'Festive', text: 'Visit the towns during a festival.', icon: '🏮', reward: 100, progress: seenCount('festival:', 1) },
  { id: 'festival-3', name: 'All the Festivals', text: 'See Vesak, New Year and Diwali decorations.', icon: '🪔', reward: 300, progress: seenCount('festival:', 3) },
  { id: 'kyoto-night', name: 'Lantern Lane', text: 'Drive through Kyoto by night.', icon: '🌙', reward: 60, progress: seenCount('district:kyoto-night', 1) },
  { id: 'monsoon', name: 'Monsoon Driver', text: 'Drive through Kandy and Ella in the rain.', icon: '☔', reward: 120, progress: (p) => [['district:kandy', 'district:ella'].filter((k) => p.data.seen.includes(k)).length, 2] },
  { id: 'pyramids', name: 'Old Wonders', text: 'Drive past the pyramids of Giza.', icon: '🐫', reward: 60, progress: seenCount('district:nile', 1) },
  { id: 'wealthy', name: 'Ink Well', text: 'Have 5,000 ink at once.', icon: '💧', reward: 200, progress: (p) => [Math.min(5000, p.data.ink), 5000] },
];

const PARTS = new Set(['roof', 'decal', 'spoiler', 'glow', 'finish', 'wheels', 'exhaust', 'engine', 'horn']);

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
