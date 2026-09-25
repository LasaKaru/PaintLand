/**
 * Missions (docs/06 §7–8). Each mission is data: who gives it, where, what to
 * do and the reward. The tracker listens to game events and reports progress.
 */

export type MissionKind = 'notes' | 'seal' | 'split' | 'air' | 'deliver' | 'visit' | 'race' | 'stamps' | 'boost';

export interface MissionDef {
  id: string;
  chapter: string;
  title: string;
  giver: { name: string; district: number; offset: number; side: -1 | 1; look: Partial<import('../models/Human').HumanLook> };
  text: string;
  kind: MissionKind;
  /** Kind-specific parameters. */
  district?: number;
  count?: number;
  time?: number;
  reward: { ink: number; item?: string };
}

const g = (name: string, district: number, offset: number, side: -1 | 1, look: MissionDef['giver']['look']): MissionDef['giver'] => ({ name, district, offset, side, look });

export const MISSIONS: MissionDef[] = [
  // ——— Chapter 1 · The Sketch ———
  { id: 'sk-bread', chapter: 'sketch', title: 'Warm Bread Run', giver: g('Chef Amara', 0, 40, 1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'beanie', hair: '#2b2622' }), text: 'The ovens are hot and the Tower café is waiting! Deliver this basket to Topsy Terrace before it cools — 60 seconds.', kind: 'deliver', district: 2, time: 60, reward: { ink: 120, item: 'hat:beret' } },
  { id: 'sk-notes', chapter: 'sketch', title: 'Street Symphony', giver: g('Busker Lio', 0, 110, -1, { top: '#3e6fa8', back: 'guitar', hat: 'cap' }), text: 'Play Biscuit Row’s whole tune for me: collect 24 of its notes in one lap.', kind: 'notes', district: 0, count: 24, reward: { ink: 100 } },
  { id: 'sk-air', chapter: 'sketch', title: 'Paper Wings', giver: g('Kite-maker Suri', 0, 200, 1, { top: '#e8559a', topStyle: 'dress', hat: 'sunhat' }), text: 'Show me you can fly! Stay in the air for 1.5 seconds in a single hop.', kind: 'air', time: 1.5, reward: { ink: 90 } },
  { id: 'sk-seal', chapter: 'sketch', title: 'Songbook Pages', giver: g('Postie Nimal', 0, 280, -1, { top: '#d8463a', back: 'satchel', hat: 'cap' }), text: 'The Songbook is missing pages. Seal 6 phrases anywhere in the Sketch.', kind: 'seal', count: 6, reward: { ink: 150, item: 'back:satchel' } },
  { id: 'sk-split', chapter: 'sketch', title: 'Up the Yellow Wall', giver: g('Climber Tess', 1, 8, 1, { top: '#f4d23b', bottomStyle: 'shorts', back: 'backpack' }), text: 'Race up Mustard Tower in under 9 seconds.', kind: 'split', district: 1, time: 9, reward: { ink: 110 } },
  { id: 'sk-race', chapter: 'sketch', title: 'Race the Painter', giver: g('Painter Kiri', 0, 330, 1, { top: '#9a5bd6', hat: 'beret', glasses: 'round' }), text: 'Beat my coupé to the end of Petal Twist. Ready… go!', kind: 'race', district: 3, reward: { ink: 200, item: 'vehicle:coupe' } },
  // ——— Chapter 2 · Serendib ———
  { id: 'sl-isso', chapter: 'serendib', title: 'Isso Vadai Express', giver: g('Aunty Mala', 0, 60, 1, { top: '#f4d23b', topStyle: 'sari', hair: '#2b2622', hairStyle: 'bun' }), text: 'Fresh isso vadai for the Lotus Tower guards! Get there in 45 seconds.', kind: 'deliver', district: 1, time: 45, reward: { ink: 140 } },
  { id: 'sl-kites', chapter: 'serendib', title: 'Kite Festival', giver: g('Kavindu', 0, 180, -1, { top: '#f6f0e4', topStyle: 'shirt', bottomStyle: 'sarong', bottom: '#3e6fa8' }), text: 'The Galle Face kites dropped their tail ribbons on the road. Collect 5 kite stamps!', kind: 'stamps', district: 0, count: 5, reward: { ink: 120, item: 'hat:straw' } },
  { id: 'sl-lotus', chapter: 'serendib', title: 'Round the Lotus', giver: g('Guide Ruwan', 1, 20, 1, { top: '#4f9a5a', hat: 'cap', glasses: 'sun' }), text: 'Spiral up the Lotus Tower in under 30 seconds.', kind: 'split', district: 1, time: 30, reward: { ink: 150 } },
  { id: 'sl-sigiriya', chapter: 'serendib', title: 'The Painted Maidens', giver: g('Artist Nethmi', 2, 30, -1, { top: '#e8559a', topStyle: 'dress', hat: 'sunhat' }), text: 'Walk to the fresco gallery on Sigiriya on foot — park, hop out and visit the lion paws.', kind: 'visit', district: 2, reward: { ink: 130 } },
  { id: 'sl-tea', chapter: 'serendib', title: 'Tea Pluckers’ Song', giver: g('Leela', 3, 30, 1, { top: '#d8463a', topStyle: 'sari', back: 'satchel' }), text: 'Sing along through the tea hills: 20 notes in Ella in one lap.', kind: 'notes', district: 3, count: 20, reward: { ink: 120, item: 'top:sari' } },
  { id: 'sl-train', chapter: 'serendib', title: 'Beat the Blue Train', giver: g('Station master Dilan', 4, 10, -1, { top: '#2f5aa8', topStyle: 'shirt', hat: 'cap' }), text: 'Cross the Nine Arch Bridge ahead of the train — race to Mirissa!', kind: 'race', district: 4, reward: { ink: 220, item: 'vehicle:tuktuk' } },
  // ——— Chapter 3 · Wonders ———
  { id: 'w-wall', chapter: 'wonders', title: 'Watchtower Relay', giver: g('Guard Mei', 0, 30, 1, { top: '#d8463a', hat: 'cap' }), text: 'Carry the signal flag along the Great Wall to the Colosseum in 40 seconds.', kind: 'deliver', district: 1, time: 40, reward: { ink: 160 } },
  { id: 'w-colosseum', chapter: 'wonders', title: 'Lap of Honour', giver: g('Marcus', 1, 20, -1, { top: '#f6f0e4', topStyle: 'dress', hair: '#6b4a2a' }), text: 'The crowd wants a show: boost for 3 seconds in total inside the Colosseum.', kind: 'boost', district: 1, time: 3, reward: { ink: 140 } },
  { id: 'w-taj', chapter: 'wonders', title: 'Reflections', giver: g('Priya', 2, 30, 1, { top: '#9a5bd6', topStyle: 'sari', glasses: 'round' }), text: 'Seal 3 phrases around the Taj Mahal garden and beyond.', kind: 'seal', count: 3, reward: { ink: 150, item: 'glasses:round' } },
  { id: 'w-machu', chapter: 'wonders', title: 'Llama Lookout', giver: g('Quilla', 3, 20, -1, { top: '#f08a2e', hat: 'beanie', back: 'backpack' }), text: 'Walk up to the citadel on foot and say hello to the llamas.', kind: 'visit', district: 3, reward: { ink: 140 } },
  { id: 'w-rio', chapter: 'wonders', title: 'Arms Wide Open', giver: g('Joana', 4, 20, 1, { top: '#4f9a5a', bottomStyle: 'shorts', hat: 'sunhat' }), text: 'Launch a 2-second hop somewhere in Rio. Fly like the statue!', kind: 'air', time: 2, reward: { ink: 170, item: 'vehicle:buggy' } },
  { id: 'w-petra', chapter: 'wonders', title: 'The Treasury Run', giver: g('Omar', 6, 20, -1, { top: '#c8955a', topStyle: 'shirt', hat: 'none' }), text: 'Race me through the Siq and past the Treasury!', kind: 'race', district: 6, reward: { ink: 250, item: 'vehicle:van' } },
  // ——— Chapter 4 · Lantern Roads ———
  { id: 'l-fox', chapter: 'lanterns', title: 'Fox Messenger', giver: g('Priestess Aiko', 0, 30, 1, { top: '#f6f0e4', topStyle: 'dress', bottom: '#d8463a', hair: '#2b2622', hairStyle: 'bun' }), text: 'Carry this prayer through all the gates and into the bamboo grove in 35 seconds.', kind: 'deliver', district: 1, time: 35, reward: { ink: 170 } },
  { id: 'l-bamboo', chapter: 'lanterns', title: 'Whispering Canes', giver: g('Flautist Ren', 1, 30, -1, { top: '#5c9a32', hat: 'straw' }), text: 'The grove hums a tune. Collect 20 of its notes in one lap.', kind: 'notes', district: 1, count: 20, reward: { ink: 150 } },
  { id: 'l-halong', chapter: 'lanterns', title: 'Dragon’s Back', giver: g('Captain Linh', 2, 40, 1, { top: '#3e6fa8', topStyle: 'shirt', hat: 'cap' }), text: 'Race my junk across the bay — beat me to Hội An!', kind: 'race', district: 2, reward: { ink: 240, item: 'glow:pink' } },
  { id: 'l-lanterns', chapter: 'lanterns', title: 'Light the Street', giver: g('Lantern-maker Mai', 3, 30, -1, { top: '#f4a13b', topStyle: 'dress', hat: 'sunhat' }), text: 'Seal 4 phrases between the lantern street and the mountains.', kind: 'seal', count: 4, reward: { ink: 160, item: 'hat:flowers' } },
  { id: 'l-pass', chapter: 'lanterns', title: 'Over the Pass', giver: g('Sherpa Dawa', 4, 20, 1, { top: '#d8463a', hat: 'beanie', back: 'backpack' }), text: 'Climb the Himalayan switchbacks in under 40 seconds.', kind: 'split', district: 4, time: 40, reward: { ink: 200 } },
  { id: 'l-wave', chapter: 'lanterns', title: 'Ride the Curl', giver: g('Surfer Kai', 5, 20, -1, { top: '#3e86c9', bottomStyle: 'shorts', glasses: 'sun' }), text: 'Boost for 4 seconds in total while riding the Great Wave.', kind: 'boost', district: 5, time: 4, reward: { ink: 220, item: 'glow:green' } },
];

export function missionsFor(chapter: string): MissionDef[] {
  return MISSIONS.filter((m) => m.chapter === chapter);
}

export interface MissionStatus {
  mission: MissionDef;
  label: string;
  progress: number;
  goal: number;
  timeLeft: number | null;
  failed: boolean;
  done: boolean;
}

/**
 * Tracks the one active mission. The game feeds it events; it answers with a
 * status line for the HUD and flips `done` or `failed`.
 */
export class MissionTracker {
  active: MissionStatus | null = null;
  /** For deliveries and races: has the run started? */
  started = false;

  start(m: MissionDef): void {
    const goal = m.kind === 'visit' || m.kind === 'deliver' || m.kind === 'race' || m.kind === 'split' || m.kind === 'air' ? 1 : m.kind === 'boost' ? m.time ?? 3 : m.count ?? 1;
    this.active = { mission: m, label: m.title, progress: 0, goal, timeLeft: m.kind === 'deliver' ? m.time ?? 60 : null, failed: false, done: false };
    this.started = m.kind !== 'race';
  }

  cancel(): void {
    this.active = null;
    this.started = false;
  }

  private bump(amount = 1): void {
    const a = this.active;
    if (!a || a.done || a.failed) return;
    a.progress = Math.min(a.goal, a.progress + amount);
    if (a.progress >= a.goal) a.done = true;
  }

  onNote(district: number): void {
    const a = this.active;
    if (a?.mission.kind === 'notes' && a.mission.district === district) this.bump();
  }

  onSeal(): void {
    if (this.active?.mission.kind === 'seal') this.bump();
  }

  onStamp(): void {
    if (this.active?.mission.kind === 'stamps') this.bump();
  }

  onAir(seconds: number): void {
    const a = this.active;
    if (a?.mission.kind === 'air' && seconds >= (a.mission.time ?? 1)) this.bump();
  }

  onSplit(district: number, time: number): void {
    const a = this.active;
    if (a?.mission.kind === 'split' && a.mission.district === district) {
      if (time <= (a.mission.time ?? 10)) this.bump();
      else a.label = `${a.mission.title} — ${time.toFixed(1)}s, try again!`;
    }
  }

  onEnterDistrict(district: number): void {
    const a = this.active;
    if (a?.mission.kind === 'deliver' && district === a.mission.district) this.bump();
  }

  onBoost(district: number, dt: number): void {
    const a = this.active;
    if (a?.mission.kind === 'boost' && a.mission.district === district) this.bump(dt);
  }

  onVisit(): void {
    if (this.active?.mission.kind === 'visit') this.bump();
  }

  /** Race: `playerAhead` once the rival or player crosses the district end. */
  onRaceFinish(playerWon: boolean): void {
    const a = this.active;
    if (a?.mission.kind !== 'race') return;
    if (playerWon) this.bump();
    else a.failed = true;
  }

  tick(dt: number): void {
    const a = this.active;
    if (!a || a.done || a.failed || a.timeLeft === null) return;
    a.timeLeft -= dt;
    if (a.timeLeft <= 0) {
      a.timeLeft = 0;
      a.failed = true;
    }
  }

  statusText(): string {
    const a = this.active;
    if (!a) return '';
    if (a.done) return `✓ ${a.mission.title} — complete!`;
    if (a.failed) return `✗ ${a.mission.title} — failed. Talk to ${a.mission.giver.name} to retry.`;
    const bits: string[] = [a.label];
    if (a.goal > 1 && a.mission.kind !== 'boost') bits.push(`${Math.floor(a.progress)}/${a.goal}`);
    if (a.mission.kind === 'boost') bits.push(`${a.progress.toFixed(1)}/${a.goal}s`);
    if (a.timeLeft !== null) bits.push(`${a.timeLeft.toFixed(0)}s left`);
    if (a.mission.kind === 'race' && !this.started) bits.push('get in and drive to start');
    return bits.join(' · ');
  }
}
