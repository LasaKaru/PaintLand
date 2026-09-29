import type { Random } from '../core/Random';
import type { TownLife, TownPerson } from '../world/TownLife';

/** What kind of passenger: in a hurry, an elder who likes a gentle ride, or a chatterbox. */
export type Mood = 'hurry' | 'gentle' | 'chatty' | 'tourist' | 'funny';

export interface Destination {
  name: string;
  x: number;
  z: number;
}

export interface Fare {
  person: TownPerson;
  mood: Mood;
  to: Destination;
  /** Straight-line distance at pickup (metres). */
  dist: number;
  /** Seconds since pickup. */
  time: number;
  /** 0..1: how smooth the ride has been (gentle passengers notice). */
  comfort: number;
  /** Seconds until the passenger says something. */
  line: number;
  /** A tourist's photo stop on the way (a named place), and whether you stopped there. */
  stop: Destination | null;
  stopDone: boolean;
  /** Which joke the funny passenger tells next. */
  joke: number;
}

export type SayKey = 'taxi.hurry' | 'taxi.gentle' | 'taxi.chatty' | 'taxi.faster' | 'taxi.careful' | 'taxi.tourist' | 'taxi.joke1' | 'taxi.joke2' | 'taxi.joke3';

export type TaxiEvent =
  | { kind: 'hail'; person: TownPerson }
  | { kind: 'pickup'; fare: Fare }
  | { kind: 'say'; key: SayKey; fare: Fare; params?: Record<string, string> }
  | { kind: 'photo'; fare: Fare }
  | { kind: 'arrived'; fare: Fare; stars: number; pay: number; tip: number }
  | { kind: 'cancel'; fare: Fare };

/** The car, as the taxi sees it each step. */
export interface TaxiCar {
  x: number;
  z: number;
  /** Speed (m/s, signed). */
  v: number;
  grounded: boolean;
}

/** Where a passenger can be dropped: within this many metres of the place, nearly stopped. */
export const DROP_RADIUS = 10;

/**
 * Taxi rides in the towns (docs/06 "things to do"): now and then someone
 * waves your car down. Stop next to them and press E; drive them to the named
 * place they ask for; stop there to let them out. They pay a fare by distance
 * and tip by how the ride suited them: fast for someone in a hurry, smooth for
 * an elder, and any chatty passenger just enjoys the company.
 */
export class Taxi {
  hail: TownPerson | null = null;
  fare: Fare | null = null;
  /** Seconds before someone else may wave you down. */
  cool = 12;
  private lastV = 0;
  private complainCool = 0;
  private stopTime = 0;

  constructor(private readonly rnd: Random) {}

  /** Pay for a finished ride: fare by distance, tip by stars (1–5); a tuk-tuk earns a bigger tip. */
  static pay(dist: number, stars: number, tuk = false): { pay: number; tip: number } {
    const pay = Math.round(15 + dist * 0.08);
    return { pay, tip: Math.round(pay * 0.6 * ((stars - 1) / 4) * (tuk ? 1.25 : 1)) };
  }

  /** Driving a tuk-tuk: people wave you down more often (and tip a little more). */
  tuk = false;

  /** Stars for a ride, from the passenger's point of view. */
  static stars(f: Fare): number {
    if (f.mood === 'hurry') {
      const par = f.dist / 11 + 12;
      return Math.max(1, Math.min(5, Math.round(5 - Math.max(0, f.time - par) / (par * 0.25))));
    }
    if (f.mood === 'gentle') return Math.max(1, Math.min(5, Math.round(1 + f.comfort * 4)));
    // Tourists want their photo stop.
    if (f.mood === 'tourist') return f.stopDone ? 5 : 2;
    return f.comfort > 0.4 ? 5 : 4;
  }

  /** Close enough (and slow enough) to pick up the one waving? */
  canPickUp(car: TaxiCar): boolean {
    return !!this.hail && !this.fare && Math.abs(car.v) < 3 && Math.hypot(this.hail.body.x - car.x, this.hail.body.z - car.z) < 5.5;
  }

  /** Stopped at the destination? */
  atDestination(car: TaxiCar): boolean {
    return !!this.fare && Math.abs(car.v) < 2.5 && Math.hypot(this.fare.to.x - car.x, this.fare.to.z - car.z) < DROP_RADIUS;
  }

  /** Let the one waving in, and pick where they want to go (60–350 m away). */
  pickUp(life: TownLife, places: readonly Destination[], car: TaxiCar): Fare | null {
    const p = this.hail;
    if (!p) return null;
    const far = places.filter((q) => {
      const d = Math.hypot(q.x - car.x, q.z - car.z);
      return d > 60 && d < 350;
    });
    const choice = far.length ? far : places.filter((q) => Math.hypot(q.x - car.x, q.z - car.z) > 30);
    if (!choice.length) return null;
    const to = this.rnd.pick(choice);
    life.board(p);
    const mood: Mood = p.kind === 'elder' ? 'gentle' : this.rnd.pick(['hurry', 'chatty', 'gentle', 'tourist', 'funny', 'hurry', 'tourist'] as Mood[]);
    // A tourist asks to stop for a photo at another place on the way.
    const others = places.filter((q) => q !== to && Math.hypot(q.x - car.x, q.z - car.z) > 30 && Math.hypot(q.x - to.x, q.z - to.z) > 30);
    const stop = mood === 'tourist' && others.length ? others.reduce((a, q) => (Math.hypot(q.x - (car.x + to.x) / 2, q.z - (car.z + to.z) / 2) < Math.hypot(a.x - (car.x + to.x) / 2, a.z - (car.z + to.z) / 2) ? q : a)) : null;
    this.fare = { person: p, mood: stop || mood !== 'tourist' ? mood : 'chatty', to, dist: Math.hypot(to.x - car.x, to.z - car.z), time: 0, comfort: 1, line: 6, stop, stopDone: false, joke: 0 };
    this.hail = null;
    this.lastV = car.v;
    return this.fare;
  }

  /** Let the passenger out here (paid) — or cancel the ride (unpaid) when `paid` is false. */
  dropOff(life: TownLife, car: TaxiCar, paid: boolean): TaxiEvent | null {
    const f = this.fare;
    if (!f) return null;
    life.alight(f.person, car.x + 1.8, car.z);
    this.fare = null;
    this.cool = this.rnd.range(15, 35);
    if (!paid) return { kind: 'cancel', fare: f };
    const stars = Taxi.stars(f);
    return { kind: 'arrived', fare: f, stars, ...Taxi.pay(f.dist, stars, this.tuk) };
  }

  /** Stop waiting for (or ignore) the one waving. */
  forgetHail(): void {
    this.hail = null;
  }

  /** One step: someone may hail you; a passenger notices how you drive and talks. */
  step(dt: number, life: TownLife, car: TaxiCar, allowed: boolean): TaxiEvent[] {
    const out: TaxiEvent[] = [];
    this.complainCool -= dt;
    const f = this.fare;
    if (f) {
      f.time += dt;
      f.line -= dt;
      // Hard braking or acceleration, going too fast, flying off a jump: a gentle ride it isn't.
      const accel = Math.abs(car.v - this.lastV) / Math.max(dt, 1e-3);
      let jolt = 0;
      if (accel > 14) jolt += (accel - 14) * 0.002;
      if (Math.abs(car.v) > 16) jolt += dt * 0.05;
      if (!car.grounded) jolt += dt * 0.4;
      f.comfort = Math.max(0, f.comfort - jolt * (f.mood === 'gentle' ? 1 : 0.4));
      if (jolt > 0.02 && this.complainCool <= 0 && f.mood === 'gentle') {
        out.push({ kind: 'say', key: 'taxi.careful', fare: f });
        this.complainCool = 6;
      }
      if (f.mood === 'hurry' && Math.abs(car.v) < 4 && f.time > 8 && this.complainCool <= 0 && f.line <= 0) {
        out.push({ kind: 'say', key: 'taxi.faster', fare: f });
        this.complainCool = 10;
        f.line = 10;
      } else if (f.line <= 0) {
        if (f.mood === 'funny') {
          out.push({ kind: 'say', key: (['taxi.joke1', 'taxi.joke2', 'taxi.joke3'] as SayKey[])[f.joke % 3], fare: f });
          f.joke++;
        } else if (f.mood === 'tourist' && f.stop && !f.stopDone) out.push({ kind: 'say', key: 'taxi.tourist', fare: f, params: { place: f.stop.name } });
        else out.push({ kind: 'say', key: f.mood === 'hurry' ? 'taxi.hurry' : f.mood === 'gentle' ? 'taxi.gentle' : 'taxi.chatty', fare: f });
        f.line = f.mood === 'chatty' || f.mood === 'funny' ? this.rnd.range(7, 11) : this.rnd.range(14, 22);
      }
      // The tourist's photo stop: pull up there for a moment.
      if (f.stop && !f.stopDone && Math.abs(car.v) < 2.5 && Math.hypot(f.stop.x - car.x, f.stop.z - car.z) < DROP_RADIUS) {
        this.stopTime += dt;
        if (this.stopTime > 1.2) {
          f.stopDone = true;
          out.push({ kind: 'photo', fare: f });
        }
      } else this.stopTime = 0;
    }
    this.lastV = car.v;
    // The one waving gave up (or walked off).
    if (this.hail && (this.hail.act !== 'hail' || this.hail.benched)) this.hail = null;
    if (!allowed || f) return out;
    this.cool -= dt;
    if (!this.hail && this.cool <= 0 && Math.abs(car.v) > 1) {
      this.cool = this.rnd.range(20, 40) * (this.tuk ? 0.5 : 1);
      const p = life.pickHail(car);
      if (p) {
        this.hail = p;
        out.push({ kind: 'hail', person: p });
      }
    }
    return out;
  }
}
