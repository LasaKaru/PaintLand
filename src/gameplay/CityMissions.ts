/**
 * Open-world mission chains (docs/06 §8 "missions that flow"): short stories
 * of three missions each, unlocked in order. Every mission is a list of steps
 * — drive somewhere, collect things, hit checkpoints against the clock,
 * deliver in time, land a stunt, take a photo, go on foot — so new missions
 * are data, not code.
 */
export type StepKind = 'goto' | 'collect' | 'checkpoints' | 'deliver' | 'stunt' | 'photo' | 'onfoot';

export interface Target {
  x: number;
  z: number;
  r: number;
}

export interface MissionStep {
  kind: StepKind;
  text: string;
  targets: Target[];
  /** Seconds allowed for this step (checkpoints, deliveries). */
  time?: number;
  /** For stunt steps: the stunt id to land. */
  stunt?: string;
}

export interface ChainMission {
  id: string;
  chain: string;
  title: string;
  giver: string;
  intro: string;
  steps: MissionStep[];
  reward: { ink: number; item?: string };
  requires?: string;
}

/** A free-roam area with mission chains. */
export type ChainArea = 'city' | 'hills' | 'harbour' | 'village';

export const CHAINS: { id: string; name: string; icon: string; blurb: string; area: ChainArea }[] = [
  { id: 'tuktuk', name: 'Tuk-Tuk Tales', icon: '🛺', blurb: 'Nimal needs a driver for his busiest day.', area: 'city' },
  { id: 'palette', name: 'The Painter’s Palette', icon: '🎨', blurb: 'Amaya is out of colours and the city is full of them.', area: 'city' },
  { id: 'stunts', name: 'Stunt School', icon: '🏁', blurb: 'Ravi teaches jumps. Ravi does not teach landings.', area: 'city' },
  { id: 'secrets', name: 'City Secrets', icon: '🗝', blurb: 'An old storyteller knows where the city hides things.', area: 'city' },
  { id: 'ring', name: 'Ring Road Rally', icon: '🛣', blurb: 'Dilan runs the island’s rally club, and the new ring road is his track.', area: 'city' },
  { id: 'tea', name: 'The Tea Trail', icon: '🍃', blurb: 'Malini picks the best tea in the hills, and she needs a fast pair of wheels.', area: 'hills' },
  { id: 'rail', name: 'The Hill Country Line', icon: '🚂', blurb: 'Stationmaster Perera runs the little blue train. Things keep going wrong.', area: 'hills' },
  { id: 'harbour', name: 'Harbour Errands', icon: '⚓', blurb: 'Anura the harbourmaster always has one more job.', area: 'harbour' },
  { id: 'lantern', name: 'Lantern Night', icon: '🏮', blurb: 'Linh is getting the village ready for the lantern festival.', area: 'village' },
];

/** The free-roam area a chain mission is played in. */
export function missionArea(m: ChainMission): ChainArea {
  return CHAINS.find((c) => c.id === m.chain)?.area ?? 'city';
}

const T = (x: number, z: number, r = 8): Target => ({ x, z, r });

export const CITY_MISSIONS: ChainMission[] = [
  // ————— Tuk-Tuk Tales —————
  {
    id: 'tt-1', chain: 'tuktuk', title: 'First fare', giver: 'Nimal the driver',
    intro: 'A passenger is waiting at Pettah market. Pick them up and get them to the Lotus Tower — quickly, they have a meeting!',
    steps: [
      { kind: 'goto', text: 'Pick up the passenger at Pettah market', targets: [T(260, -150)] },
      { kind: 'deliver', text: 'Drop them at the Lotus Tower', targets: [T(-160, -128)], time: 75 },
    ],
    reward: { ink: 120 },
  },
  {
    id: 'tt-2', chain: 'tuktuk', title: 'Rush hour', giver: 'Nimal the driver', requires: 'tt-1',
    intro: 'Five stops across the Fort before the offices close. Weave through the traffic!',
    steps: [{ kind: 'checkpoints', text: 'Hit every stop in order', targets: [T(-100, 20), T(-340, 20), T(-340, -340), T(20, -340), T(140, -100)], time: 110 }],
    reward: { ink: 200, item: 'decal:stripes' },
  },
  {
    id: 'tt-3', chain: 'tuktuk', title: 'Temple run', giver: 'Nimal the driver', requires: 'tt-2',
    intro: 'A family on the beach wants to reach the white stupa for the evening pooja. It is a long way north.',
    steps: [
      { kind: 'goto', text: 'Collect the family on the beach', targets: [T(-300, 505)] },
      { kind: 'deliver', text: 'Get them to the white stupa', targets: [T(60, -572, 10)], time: 120 },
    ],
    reward: { ink: 320 },
  },
  // ————— The Painter's Palette —————
  {
    id: 'pp-1', chain: 'palette', title: 'Colours of the park', giver: 'Amaya the painter',
    intro: 'Find five spilt paint pots around the lake park. Any order!',
    steps: [{ kind: 'collect', text: 'Collect the paint pots', targets: [T(420, -470, 6), T(590, -440, 6), T(600, -170, 6), T(420, -120, 6), T(560, -30, 6)] }],
    reward: { ink: 150 },
  },
  {
    id: 'pp-2', chain: 'palette', title: 'The tower portrait', giver: 'Amaya the painter', requires: 'pp-1',
    intro: 'Amaya wants a reference photo of the Lotus Tower. Walk up close and take one (press P, then save).',
    steps: [
      { kind: 'onfoot', text: 'Walk to the Lotus Tower plaza', targets: [T(-160, -120, 10)] },
      { kind: 'photo', text: 'Take a photo here (P, then Save)', targets: [T(-160, -120, 30)] },
    ],
    reward: { ink: 180, item: 'hat:helmet' },
  },
  {
    id: 'pp-3', chain: 'palette', title: 'Sea blues', giver: 'Amaya the painter', requires: 'pp-2',
    intro: 'The best blues are on the beach. Collect six shells of colour along the shore, then bring them to the pier.',
    steps: [
      { kind: 'collect', text: 'Collect coloured shells on the beach', targets: [T(-560, 515, 6), T(-380, 525, 6), T(-200, 515, 6), T(0, 525, 6), T(180, 515, 6), T(420, 525, 6)] },
      { kind: 'deliver', text: 'Bring them to the pier', targets: [T(300, 540, 8)], time: 60 },
    ],
    reward: { ink: 300 },
  },
  // ————— Stunt School —————
  {
    id: 'ss-1', chain: 'stunts', title: 'Over the bus', giver: 'Ravi the stuntman',
    intro: 'Lesson one: hit the pink ramp in the stunt park at speed and land on the yellow circle.',
    steps: [{ kind: 'stunt', text: 'Land the “Over the bus” jump', targets: [T(-520, 372, 9)], stunt: 'stunt-bus' }],
    reward: { ink: 150 },
  },
  {
    id: 'ss-2', chain: 'stunts', title: 'Pad to pad', giver: 'Ravi the stuntman', requires: 'ss-1',
    intro: 'Lesson two: chain the boost pads down the west side — checkpoints, against the clock.',
    steps: [{ kind: 'checkpoints', text: 'Race through the checkpoints', targets: [T(-460, 380), T(-460, -160), T(-620, -200), T(-620, 260), T(-340, 300)], time: 80 }],
    reward: { ink: 220, item: 'spoiler:lip' },
  },
  {
    id: 'ss-3', chain: 'stunts', title: 'Lake leap', giver: 'Ravi the stuntman', requires: 'ss-2',
    intro: 'Final exam: jump the lake from the west shore ramp — boost hard! Ravi will be watching. From very far away.',
    steps: [{ kind: 'stunt', text: 'Land the “Lake leap”', targets: [T(570, -300, 9)], stunt: 'stunt-lake' }],
    reward: { ink: 400 },
  },
  // ————— City Secrets —————
  {
    id: 'cs-1', chain: 'secrets', title: 'Market whispers', giver: 'Old Siri the storyteller',
    intro: 'On foot, visit the three quiet corners of the old town where stories are told.',
    steps: [{ kind: 'onfoot', text: 'Walk to the story corners', targets: [T(200, -440, 6), T(360, -30, 6), T(170, 120, 6)] }],
    reward: { ink: 140 },
  },
  {
    id: 'cs-2', chain: 'secrets', title: 'The hidden pots', giver: 'Old Siri the storyteller', requires: 'cs-1',
    intro: 'Golden paint pots are hidden all over the city. Siri remembers three of them.',
    steps: [{ kind: 'collect', text: 'Find the pots Siri remembers', targets: [T(210, -30, 5), T(-400, -400, 5), T(330, 250, 5)] }],
    reward: { ink: 200, item: 'back:backpack' },
  },
  {
    id: 'cs-3', chain: 'secrets', title: 'View from the hill', giver: 'Old Siri the storyteller', requires: 'cs-2',
    intro: 'Climb to the white stupa and look back over the whole city. Take a photo for Siri.',
    steps: [
      { kind: 'goto', text: 'Go up to the white stupa', targets: [T(60, -572, 12)] },
      { kind: 'photo', text: 'Take a photo of the city', targets: [T(60, -572, 40)] },
    ],
    reward: { ink: 350 },
  },
  // ————— The Tea Trail (Tea Hills) —————
  {
    id: 'te-1', chain: 'tea', title: 'Morning pick', giver: 'Malini the tea picker',
    intro: 'Only the top two leaves and a bud! Walk between the terrace rows and pick from four bushes, then take the basket to the tea factory.',
    steps: [
      { kind: 'onfoot', text: 'Pick tea between the terrace rows', targets: [T(22, -40.5, 4), T(-30, -49.5, 4), T(34, -58.5, 4), T(-18, -67.5, 4)] },
      { kind: 'goto', text: 'Take the basket to the tea factory', targets: [T(84, -70, 8)] },
    ],
    reward: { ink: 150 },
  },
  {
    id: 'te-2', chain: 'tea', title: 'Fresh to the train', giver: 'Malini the tea picker', requires: 'te-1',
    intro: 'The first chests of the season are packed. Get them from the factory to the station platform before the train leaves!',
    steps: [
      { kind: 'goto', text: 'Collect the tea chests at the factory', targets: [T(84, -70, 8)] },
      { kind: 'deliver', text: 'Deliver them to the station platform', targets: [T(50, 30, 8)], time: 55 },
    ],
    reward: { ink: 230, item: 'hat:straw' },
  },
  {
    id: 'te-3', chain: 'tea', title: 'Tea for the town', giver: 'Malini the tea picker', requires: 'te-2',
    intro: 'Every shop on the main street wants a packet of the new tea. Five stops, in order, against the clock.',
    steps: [{ kind: 'checkpoints', text: 'Deliver to every shop in order', targets: [T(46, -9, 6), T(90, 5, 6), T(-60, -5, 6), T(-96, 5, 6), T(0, -12, 6)], time: 70 }],
    reward: { ink: 320 },
  },
  // ————— The Hill Country Line (Tea Hills) —————
  {
    id: 'rl-1', chain: 'rail', title: 'Lost luggage', giver: 'Stationmaster Perera',
    intro: 'The morning train shook four suitcases loose. They are all over town. Find them, any order.',
    steps: [{ kind: 'collect', text: 'Find the lost suitcases', targets: [T(-100, 56, 5), T(-20, 48, 5), T(98, 34, 5), T(-60, 18, 5)] }],
    reward: { ink: 160 },
  },
  {
    id: 'rl-2', chain: 'rail', title: 'Tea-bush leap', giver: 'Stationmaster Perera', requires: 'rl-1',
    intro: 'The level crossing is jammed. Perera says the quickest way over is the tea-bush ramp by the lake. He is not joking.',
    steps: [{ kind: 'stunt', text: 'Land the tea-bush leap', targets: [T(-70, 50, 9)], stunt: 'hills-leap' }],
    reward: { ink: 220, item: 'glow:green' },
  },
  {
    id: 'rl-3', chain: 'rail', title: 'Postcard from the falls', giver: 'Stationmaster Perera', requires: 'rl-2',
    intro: 'The railway wants a new poster. Go to the waterfall and take the photo everyone will see at the station.',
    steps: [
      { kind: 'goto', text: 'Go to the waterfall', targets: [T(-92, -58, 10)] },
      { kind: 'photo', text: 'Take a photo of the falls (P, then Save)', targets: [T(-92, -58, 34)] },
    ],
    reward: { ink: 300 },
  },
  // ————— Harbour Errands (Harbour Town) —————
  {
    id: 'hb-1', chain: 'harbour', title: 'Fish for the café', giver: 'Anura the harbourmaster',
    intro: 'The morning catch is in! Pick it up from the harbour stalls and rush it to the café tables before it gets warm.',
    steps: [
      { kind: 'goto', text: 'Pick up the fish at the harbour stalls', targets: [T(-36, 50, 7)] },
      { kind: 'deliver', text: 'Rush it to the café tables', targets: [T(26, 24, 6)], time: 30 },
    ],
    reward: { ink: 120 },
  },
  {
    id: 'hb-2', chain: 'harbour', title: 'Open the gates', giver: 'Anura the harbourmaster', requires: 'hb-1',
    intro: 'Every morning someone has to check the painted gates. Today that someone is you. Against the clock!',
    steps: [{ kind: 'checkpoints', text: 'Visit every gate in order', targets: [T(0, -96, 8), T(-96, 0, 8), T(96, 0, 8), T(0, 30, 8)], time: 60 }],
    reward: { ink: 200 },
  },
  {
    id: 'hb-3', chain: 'harbour', title: 'Lighthouse at sunset', giver: 'Anura the harbourmaster', requires: 'hb-2',
    intro: 'Walk down to the quay by the lighthouse and take a picture for the harbour office wall.',
    steps: [
      { kind: 'onfoot', text: 'Walk to the quay by the lighthouse', targets: [T(60, 62, 6)] },
      { kind: 'photo', text: 'Photograph the lighthouse (P, then Save)', targets: [T(60, 62, 30)] },
    ],
    reward: { ink: 260, item: 'hat:flowers' },
  },
  // ————— Lantern Night (Lantern Village) —————
  {
    id: 'ln-1', chain: 'lantern', title: 'Lantern paper', giver: 'Linh the lantern maker',
    intro: 'The wind scattered Linh’s coloured paper all over the village. Bring back four sheets.',
    steps: [{ kind: 'collect', text: 'Collect the lantern paper', targets: [T(60, -5, 5), T(-70, 5, 5), T(0, -70, 5), T(-50, -60, 5)] }],
    reward: { ink: 130 },
  },
  {
    id: 'ln-2', chain: 'lantern', title: 'Light the gates', giver: 'Linh the lantern maker', requires: 'ln-1',
    intro: 'Race up the torii tunnel lighting every lantern post, then round to the pagoda garden.',
    steps: [{ kind: 'checkpoints', text: 'Light the lanterns in order', targets: [T(0, -30, 6), T(0, -60, 6), T(0, -90, 6), T(45, -30, 7), T(80, -64, 7)], time: 60 }],
    reward: { ink: 210, item: 'roof:lanterns' },
  },
  {
    id: 'ln-3', chain: 'lantern', title: 'Pagoda at dusk', giver: 'Linh the lantern maker', requires: 'ln-2',
    intro: 'The lanterns are lit. Walk into the pagoda garden and take the photo for the festival poster.',
    steps: [
      { kind: 'onfoot', text: 'Walk into the pagoda garden', targets: [T(45, -34, 6)] },
      { kind: 'photo', text: 'Photograph the pagoda (P, then Save)', targets: [T(45, -40, 30)] },
    ],
    reward: { ink: 280 },
  },
  // ————— Ring Road Rally —————
  {
    id: 'rr-1', chain: 'ring', title: 'Coast highway sprint', giver: 'Dilan the rally driver',
    intro: 'Marine Drive is four lanes now and it runs all the way to the ring. From the pier to the eastern end of the coast highway, flat out!',
    steps: [
      { kind: 'goto', text: 'Meet Dilan by the pier', targets: [T(300, 470)] },
      { kind: 'checkpoints', text: 'Race along the coast highway', targets: [T(500, 476), T(700, 476), T(740, 440)], time: 45 },
    ],
    reward: { ink: 180 },
  },
  {
    id: 'rr-2', chain: 'ring', title: 'Through the tea hills', giver: 'Dilan the rally driver', requires: 'rr-1',
    intro: 'Up the east road through the tea hills, across the whole northern ring, and down the west road. Mind the tuk-tuks.',
    steps: [{ kind: 'checkpoints', text: 'Hit every gate on the northern loop', targets: [T(380, -600), T(380, -780), T(0, -790), T(-460, -780), T(-460, -600)], time: 120 }],
    reward: { ink: 280, item: 'decal:checker' },
  },
  {
    id: 'rr-3', chain: 'ring', title: 'The full lap', giver: 'Dilan the rally driver', requires: 'rr-2',
    intro: 'The big one: one lap of the whole ring road, five and a half kilometres, past the paddy fields and back along the sea.',
    steps: [
      { kind: 'goto', text: 'Line up at the western end of the coast highway', targets: [T(-740, 470)] },
      { kind: 'checkpoints', text: 'Lap the ring road', targets: [T(-740, -100), T(-740, -780), T(0, -790), T(740, -780), T(740, -100), T(740, 470), T(0, 476)], time: 300 },
    ],
    reward: { ink: 500, item: 'spoiler:twin' },
  },
];

export type MissionEvent = 'target' | 'step' | 'complete' | 'failed';

/** Runs one chain mission at a time. The game feeds positions and events; it gets back progress events. */
export class FreeMissionTracker {
  mission: ChainMission | null = null;
  step = 0;
  /** Targets done in the current step (by index). */
  done = new Set<number>();
  timeLeft = 0;

  start(m: ChainMission): void {
    this.mission = m;
    this.step = 0;
    this.beginStep();
  }

  cancel(): void {
    this.mission = null;
  }

  get current(): MissionStep | null {
    return this.mission?.steps[this.step] ?? null;
  }

  /** Targets still to reach (checkpoints: only the next one). */
  targets(): Target[] {
    const s = this.current;
    if (!s) return [];
    if (s.kind === 'checkpoints') {
      const next = s.targets.findIndex((_, i) => !this.done.has(i));
      return next >= 0 ? [s.targets[next]] : [];
    }
    return s.targets.filter((_, i) => !this.done.has(i));
  }

  private beginStep(): void {
    this.done.clear();
    this.timeLeft = this.current?.time ?? 0;
  }

  private advance(out: MissionEvent[]): void {
    this.step++;
    if (!this.mission || this.step >= this.mission.steps.length) {
      out.push('complete');
      return;
    }
    this.beginStep();
    out.push('step');
  }

  /** Per sim step. `onFoot` gates on-foot steps; photo and stunt steps finish through their own calls. */
  update(dt: number, x: number, z: number, onFoot: boolean): MissionEvent[] {
    const out: MissionEvent[] = [];
    const s = this.current;
    if (!s) return out;
    if (s.time) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        out.push('failed');
        this.mission = null;
        return out;
      }
    }
    if (s.kind === 'photo' || s.kind === 'stunt') return out;
    if (s.kind === 'onfoot' && !onFoot) return out;
    const list = s.kind === 'checkpoints' ? [s.targets.findIndex((_, i) => !this.done.has(i))] : s.targets.map((_, i) => i).filter((i) => !this.done.has(i));
    for (const i of list) {
      if (i < 0) continue;
      const tg = s.targets[i];
      if (Math.hypot(x - tg.x, z - tg.z) < tg.r) {
        this.done.add(i);
        out.push('target');
      }
    }
    if (this.done.size >= s.targets.length) this.advance(out);
    return out;
  }

  /** The player took a photo at (x, z). */
  onPhoto(x: number, z: number): MissionEvent[] {
    const out: MissionEvent[] = [];
    const s = this.current;
    if (s?.kind !== 'photo') return out;
    if (s.targets.some((tg) => Math.hypot(x - tg.x, z - tg.z) < tg.r)) this.advance(out);
    return out;
  }

  /** The player landed a stunt jump. */
  onStunt(id: string): MissionEvent[] {
    const out: MissionEvent[] = [];
    const s = this.current;
    if (s?.kind === 'stunt' && s.stunt === id) this.advance(out);
    return out;
  }
}

/** Is a chain mission available (its previous mission done)? */
export function missionUnlocked(m: ChainMission, done: readonly string[]): boolean {
  return !m.requires || done.includes(m.requires);
}
