import type { Random } from '../core/Random';
import type { RegionId } from '../world/Peoples';
import type { Kind } from '../world/TownLife';

/** Hello in the local language (kept as the locals say it, whatever language the game is in). */
export const GREETINGS: Record<RegionId, string[]> = {
  lanka: ['Ayubowan', 'Vanakkam'],
  india: ['Namaste', 'Vanakkam', 'Sat Sri Akal'],
  japan: ['Konnichiwa'],
  korea: ['Annyeonghaseyo'],
  china: ['Nǐ hǎo'],
  seasia: ['Sawasdee', 'Xin chào', 'Selamat pagi'],
  himalaya: ['Tashi delek', 'Namaste'],
  mena: ['Marhaba', 'Salaam'],
  europe: ['Hallo', 'Bonjour', 'Hello', 'Hola', 'Ciao'],
  americas: ['Hello', 'Hi there', 'Hola', 'Bonjour'],
  oceania: ["G'day", 'Kia ora'],
  mixed: ['Hello', 'Hi there', 'Hola', 'Bonjour', 'Namaste', 'Konnichiwa', 'Marhaba', 'Jambo', 'Ayubowan'],
};

export type TalkKey =
  | 'talk.busker'
  | 'talk.child'
  | 'talk.rain'
  | 'talk.sun'
  | 'talk.morning'
  | 'talk.evening'
  | 'talk.night'
  | 'talk.car'
  | 'talk.secret'
  | 'talk.place';

export interface TalkLine {
  hello: string;
  key: TalkKey;
  params: Record<string, string>;
}

/** What's going on around the person the player talks to. */
export interface TalkContext {
  region: RegionId;
  kind: Kind;
  busker: boolean;
  hour: number;
  rain: number;
  /** The player's car is parked close by. */
  carNear: boolean;
  /** A named place near something still hidden (a golden pot or a chest), if any. */
  secretNear: string | null;
  /** Places in town to recommend. */
  places: string[];
}

/**
 * A short line from a townsperson (docs/06 "talk to anyone"): a hello in the
 * local language, then something about the weather, the time of day, your
 * car, a place worth seeing, or a hint about something hidden nearby.
 */
export function talkLine(ctx: TalkContext, rnd: Random): TalkLine {
  const hello = ctx.hour >= 4 && ctx.hour < 11 && ctx.region === 'japan' ? 'Ohayō' : rnd.pick(GREETINGS[ctx.region]);
  const line = (key: TalkKey, params: Record<string, string> = {}): TalkLine => ({ hello, key, params });
  if (ctx.busker) return line('talk.busker');
  if (ctx.kind === 'child') return line('talk.child');
  if (ctx.secretNear && rnd.chance(0.4)) return line('talk.secret', { place: ctx.secretNear });
  if (ctx.rain > 0.3) return line('talk.rain');
  if (ctx.carNear && rnd.chance(0.35)) return line('talk.car');
  if (ctx.places.length && rnd.chance(0.35)) return line('talk.place', { place: rnd.pick(ctx.places) });
  const h = ctx.hour;
  if (h >= 11 && h < 15 && rnd.chance(0.5)) return line('talk.sun');
  if (h >= 5 && h < 11) return line('talk.morning');
  if (h >= 17 && h < 21) return line('talk.evening');
  if (h >= 21 || h < 5) return line('talk.night');
  return line(ctx.places.length ? 'talk.place' : 'talk.morning', ctx.places.length ? { place: rnd.pick(ctx.places) } : {});
}
