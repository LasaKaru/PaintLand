/**
 * The living soundscape (docs/07 §1 "world layer"), all procedural Web Audio:
 * birdsong by day (several species of chirp), crickets and frogs at night,
 * sea waves and gulls on the coast, leaves in the wind near trees, and a city
 * hum with distant horns downtown. The game describes where the player is
 * (how natural, coastal or urban; time; rain) and each layer fades to match.
 */
export interface AmbienceParams {
  /** 0 day … 1 night. */
  night: number;
  rain: number;
  /** 0..1 how much greenery is around (parks, hills, tea, jungle). */
  nature: number;
  /** 0..1 how close the sea is. */
  coast: number;
  /** 0..1 how urban (downtown streets). */
  city: number;
  /** 0..1 how close a waterfall or river is (rushing water). */
  water?: number;
  /** 0..1 how exposed the spot is (gusty wind on edges, hilltops and in the air). */
  wind?: number;
  /** 0..1 a quiet moment (viewpoints, the World's End): a soft pad and wind chimes. */
  calm?: number;
  /** 0..1 how many townspeople are around (a soft murmur of voices). */
  crowd?: number;
  /** 0..1 how many of them are talking, laughing or cheering (chatter and laughs). */
  chatter?: number;
  /** 0..1 people walking nearby (soft footsteps on the street). */
  steps?: number;
  /** How the locals talk: the pace and pitch of the made-up chatter. */
  voice?: 'lanka' | 'japan' | 'mixed';
  /** 0..1 how close a kottu stall is (the clang of the blades on the griddle). */
  kottu?: number;
  /** Master volume for ambience (Settings → Audio). */
  volume: number;
}

/** The calm pad's chords (MIDI notes, five voices each), changing slowly. */
export const CALM_CHORDS = [
  [48, 55, 64, 71, 74], // Cmaj9
  [45, 52, 60, 67, 71], // Am9
  [41, 48, 57, 64, 67], // Fmaj9
  [43, 50, 59, 62, 69], // G6/9
];
const hz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export class Ambience {
  private readonly bus: GainNode;
  private readonly waveGain: GainNode;
  private readonly waveFilter: BiquadFilterNode;
  private readonly leafGain: GainNode;
  private readonly cricketGain: GainNode;
  private readonly cityGain: GainNode;
  private readonly waterGain: GainNode;
  private readonly waterFilter: BiquadFilterNode;
  private readonly windGain: GainNode;
  private readonly windFilter: BiquadFilterNode;
  private readonly padGain: GainNode;
  private readonly murmurGain: GainNode;
  private readonly murmurFilter: BiquadFilterNode;
  private nextSyllable = 0;
  private kottuStep = 0;
  private nextStep = 0;
  private nextKottu = 0;
  private nextLaugh = 0;
  private readonly padVoices: OscillatorNode[] = [];
  private chord = 0;
  private nextChord = 0;
  private nextChime = 0;
  private nextOwl = 0;
  private gust = 0;
  private p: AmbienceParams = { night: 0, rain: 0, nature: 0.5, coast: 0, city: 0, volume: 0.7 };
  private nextBird = 0;
  private nextGull = 0;
  private nextFrog = 0;
  private nextHorn = 0;
  private swell = 0;

  constructor(private readonly ctx: AudioContext, out: AudioNode, private readonly noise: AudioBuffer, reverb: AudioNode) {
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(out);
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    this.bus.connect(wet).connect(reverb);

    // Sea: brown-ish noise through a low-pass whose gain swells like breaking waves.
    const sea = this.loop(0.35);
    this.waveFilter = ctx.createBiquadFilter();
    this.waveFilter.type = 'lowpass';
    this.waveFilter.frequency.value = 600;
    this.waveGain = ctx.createGain();
    this.waveGain.gain.value = 0;
    sea.connect(this.waveFilter).connect(this.waveGain).connect(this.bus);

    // Leaves: high, airy noise, fluttering.
    const leaves = this.loop(1.3);
    const leafFilter = ctx.createBiquadFilter();
    leafFilter.type = 'highpass';
    leafFilter.frequency.value = 3500;
    this.leafGain = ctx.createGain();
    this.leafGain.gain.value = 0;
    leaves.connect(leafFilter).connect(this.leafGain).connect(this.bus);

    // Crickets: a 4.4 kHz tone chopped by two fast LFOs into chirps.
    const cricket = ctx.createOscillator();
    cricket.frequency.value = 4400;
    const chop = ctx.createGain();
    chop.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 28;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(chop.gain);
    const pulse = ctx.createOscillator();
    pulse.type = 'square';
    pulse.frequency.value = 1.6;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.5;
    pulse.connect(pulseDepth).connect(chop.gain);
    this.cricketGain = ctx.createGain();
    this.cricketGain.gain.value = 0;
    cricket.connect(chop).connect(this.cricketGain).connect(this.bus);
    for (const o of [cricket, lfo, pulse]) o.start();

    // City: low rumble of traffic and air conditioners.
    const city = this.loop(0.2);
    const cityFilter = ctx.createBiquadFilter();
    cityFilter.type = 'lowpass';
    cityFilter.frequency.value = 220;
    this.cityGain = ctx.createGain();
    this.cityGain.gain.value = 0;
    city.connect(cityFilter).connect(this.cityGain).connect(this.bus);

    // Crowd: a murmur of far-off voices (noise through a vowel-like band that wanders).
    const murmur = this.loop(0.8);
    this.murmurFilter = ctx.createBiquadFilter();
    this.murmurFilter.type = 'bandpass';
    this.murmurFilter.frequency.value = 650;
    this.murmurFilter.Q.value = 1.2;
    this.murmurGain = ctx.createGain();
    this.murmurGain.gain.value = 0;
    murmur.connect(this.murmurFilter).connect(this.murmurGain).connect(this.bus);

    // Waterfalls and rivers: broad rushing noise, a little brighter than the sea.
    const water = this.loop(1.0);
    const waterHp = ctx.createBiquadFilter();
    waterHp.type = 'highpass';
    waterHp.frequency.value = 250;
    this.waterFilter = ctx.createBiquadFilter();
    this.waterFilter.type = 'lowpass';
    this.waterFilter.frequency.value = 2600;
    this.waterGain = ctx.createGain();
    this.waterGain.gain.value = 0;
    water.connect(waterHp).connect(this.waterFilter).connect(this.waterGain).connect(this.bus);

    // Wind on exposed places: low noise that gusts.
    const wind = this.loop(0.45);
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 420;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.bus);

    // The calm pad: five soft triangle voices through a gentle low-pass, mostly reverb.
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1100;
    this.padGain.connect(padFilter).connect(this.bus);
    const padWet = ctx.createGain();
    padWet.gain.value = 0.8;
    padFilter.connect(padWet).connect(reverb);
    for (const m of CALM_CHORDS[0]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(m);
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(this.padGain);
      o.start();
      this.padVoices.push(o);
    }
  }

  private loop(rate: number): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(0, Math.random() * 1.5);
    return src;
  }

  set(params: AmbienceParams): void {
    this.p = params;
  }

  /** Called every frame: smooth the beds, schedule one-shot calls. */
  update(dt: number): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const p = this.p;
    const v = p.volume;
    const day = 1 - p.night;
    const dry = 1 - p.rain * 0.8;
    // Waves swell every ~7 s.
    this.swell += dt;
    const wave = 0.55 + 0.45 * Math.max(0, Math.sin((this.swell / 7) * Math.PI * 2));
    this.waveGain.gain.setTargetAtTime(p.coast * 0.22 * wave * v, t, 0.4);
    this.waveFilter.frequency.setTargetAtTime(350 + wave * 700, t, 0.4);
    this.leafGain.gain.setTargetAtTime(p.nature * 0.025 * (0.6 + 0.4 * Math.sin(this.swell * 1.3)) * v, t, 0.3);
    this.cricketGain.gain.setTargetAtTime(Math.max(0, p.night - 0.4) * p.nature * 0.012 * dry * v, t, 0.8);
    this.cityGain.gain.setTargetAtTime(p.city * 0.12 * v, t, 0.6);
    // The crowd murmur rises and falls like people talking over each other.
    const crowd = p.crowd ?? 0;
    this.murmurGain.gain.setTargetAtTime(crowd * 0.05 * (0.75 + 0.25 * Math.sin(this.swell * 2.3)) * v, t, 0.5);
    this.murmurFilter.frequency.setTargetAtTime(500 + 350 * (0.5 + 0.5 * Math.sin(this.swell * 1.7) * Math.sin(this.swell * 0.61)), t, 0.2);
    const chatter = p.chatter ?? 0;
    if (t > this.nextSyllable) {
      this.nextSyllable = t + 0.25 + Math.random() * (2.4 - chatter * 2);
      if (chatter > 0.05) this.babble(t, chatter * v);
    }
    // Kottu: two blades on a hot griddle, a fast rolling rhythm with accents.
    const kottu = p.kottu ?? 0;
    if (kottu > 0.02 && t > this.nextKottu) {
      this.nextKottu = t + 0.13;
      this.kottuStep = (this.kottuStep + 1) % 16;
      const accent = this.kottuStep % 4 === 0 ? 1 : this.kottuStep % 2 ? 0.45 : 0.7;
      if (this.kottuStep !== 7 && this.kottuStep !== 15) this.clang(t, kottu * kottu * accent * v, this.kottuStep % 2);
    }
    // Footsteps of the people walking by, a soft scuff now and then.
    const steps = p.steps ?? 0;
    if (steps > 0.05 && t > this.nextStep) {
      this.nextStep = t + 0.12 + Math.random() * (0.9 - steps * 0.7);
      this.footstep(t, steps * v * (1 - p.rain * 0.3));
    }
    if (t > this.nextLaugh) {
      this.nextLaugh = t + 4 + Math.random() * 8;
      if (chatter > 0.3 && Math.random() < chatter) this.laugh(t, chatter * v);
    }
    // Rushing water, with a slow flutter.
    const water = p.water ?? 0;
    this.waterGain.gain.setTargetAtTime(water * water * 0.16 * (0.9 + 0.1 * Math.sin(this.swell * 3.1)) * v, t, 0.3);
    this.waterFilter.frequency.setTargetAtTime(1800 + water * 1600, t, 0.5);
    // Gusts: a slow random walk.
    this.gust = Math.max(0, Math.min(1, this.gust + (Math.random() - 0.5) * dt * 1.2));
    const wind = p.wind ?? 0;
    this.windGain.gain.setTargetAtTime(wind * (0.03 + 0.07 * this.gust) * v, t, 0.6);
    this.windFilter.frequency.setTargetAtTime(300 + this.gust * 500, t, 0.8);
    // The calm pad fades in and drifts through its chords.
    const calm = p.calm ?? 0;
    this.padGain.gain.setTargetAtTime(calm * 0.022 * v, t, 1.5);
    if (calm > 0.05 && t > this.nextChord) {
      this.nextChord = t + 10 + Math.random() * 4;
      this.chord = (this.chord + 1) % CALM_CHORDS.length;
      CALM_CHORDS[this.chord].forEach((m, i) => this.padVoices[i]?.frequency.setTargetAtTime(hz(m), t, 2.5));
    }
    if (calm > 0.25 && t > this.nextChime) {
      this.nextChime = t + 2.5 + Math.random() * 6;
      this.chime(t, calm * v);
    }
    if (t > this.nextOwl) {
      this.nextOwl = t + 9 + Math.random() * 14;
      if (p.night > 0.7 && p.nature > 0.5 && p.rain < 0.3) this.owl(t, p.nature * v);
    }

    if (t > this.nextBird) {
      this.nextBird = t + 0.6 + Math.random() * (3.5 - p.nature * 2.2);
      if (day > 0.5 && p.rain < 0.5 && p.nature > 0.15) this.bird(t, p.nature * v);
    }
    if (t > this.nextGull) {
      this.nextGull = t + 4 + Math.random() * 9;
      if (day > 0.5 && p.coast > 0.3) this.gull(t, p.coast * v);
    }
    if (t > this.nextFrog) {
      this.nextFrog = t + 0.8 + Math.random() * 2.5;
      if (p.night > 0.6 && p.nature > 0.3) this.frog(t, p.nature * v);
    }
    if (t > this.nextHorn) {
      this.nextHorn = t + 5 + Math.random() * 12;
      if (p.city > 0.4) this.distantHorn(t, p.city * v);
    }
  }

  /** One of four songbird patterns: trills, sweeps, two-note calls, warbles. */
  private bird(t: number, level: number): void {
    const ctx = this.ctx;
    const kind = Math.floor(Math.random() * 4);
    const base = 2200 + Math.random() * 2200;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.bus);
    const notes = kind === 0 ? 5 + Math.floor(Math.random() * 6) : kind === 1 ? 2 : kind === 2 ? 2 : 4;
    for (let i = 0; i < notes; i++) {
      const start = t + i * (kind === 0 ? 0.07 : kind === 2 ? 0.28 : 0.12);
      const dur = kind === 0 ? 0.05 : kind === 1 ? 0.18 : 0.14;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = kind === 2 ? base * (i === 0 ? 1 : 0.8) : base * (1 + (Math.random() - 0.5) * 0.2);
      o.frequency.setValueAtTime(f0, start);
      o.frequency.exponentialRampToValueAtTime(kind === 1 ? f0 * 1.7 : kind === 3 ? f0 * (0.7 + Math.random() * 0.6) : f0 * 0.85, start + dur);
      // Fast vibrato gives the "tweet" texture.
      const vib = ctx.createOscillator();
      vib.frequency.value = 40 + Math.random() * 40;
      const vibDepth = ctx.createGain();
      vibDepth.gain.value = f0 * 0.04;
      vib.connect(vibDepth).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.03 * level, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(pan);
      o.start(start);
      vib.start(start);
      o.stop(start + dur + 0.02);
      vib.stop(start + dur + 0.02);
    }
  }

  /** A wind chime: one note of a pentatonic scale, long and soft. */
  private chime(t: number, level: number): void {
    const ctx = this.ctx;
    const notes = [72, 74, 76, 79, 81, 84, 86];
    const f = hz(notes[Math.floor(Math.random() * notes.length)]);
    for (const [mult, amp] of [[1, 1], [2.76, 0.25], [5.4, 0.08]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.012 * level * amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + 3.6);
    }
  }

  /** An owl at night: "hoo … hoo-hoo". */
  private owl(t: number, level: number): void {
    const ctx = this.ctx;
    [0, 0.55, 0.8].forEach((d, i) => {
      const start = t + d;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(i === 0 ? 420 : 390, start);
      o.frequency.linearRampToValueAtTime(i === 0 ? 380 : 360, start + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.02 * level, start + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, start + (i === 0 ? 0.45 : 0.25));
      o.connect(g).connect(this.bus);
      o.start(start);
      o.stop(start + 0.5);
    });
  }

  /** Seagull: a falling, nasal "kee-ow". */
  private gull(t: number, level: number): void {
    const ctx = this.ctx;
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
      const start = t + i * 0.35;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1400, start);
      o.frequency.exponentialRampToValueAtTime(700, start + 0.3);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.025 * level, start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      o.connect(f).connect(g).connect(this.bus);
      o.start(start);
      o.stop(start + 0.35);
    }
  }

  /** Frog: a short low croak with a wobble. */
  private frog(t: number, level: number): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(140 + Math.random() * 60, t);
    const am = ctx.createOscillator();
    am.frequency.value = 30;
    const amDepth = ctx.createGain();
    amDepth.gain.value = 0.5;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02 * level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    am.connect(amDepth).connect(g.gain);
    o.connect(f).connect(g).connect(this.bus);
    o.start(t);
    am.start(t);
    o.stop(t + 0.25);
    am.stop(t + 0.25);
  }

  /** A far-away car horn, filtered and quiet. */
  /** A soft footstep: a short burst of filtered noise. */
  private footstep(t: number, level: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500 + Math.random() * 700;
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02 * level, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    src.connect(f).connect(g).connect(pan).connect(this.bus);
    src.start(t, Math.random() * 1.5, 0.09);
  }

  /** A few made-up syllables: nobody's words, just the sound of a conversation (paced like the local speech). */
  private babble(t: number, level: number): void {
    const ctx = this.ctx;
    // Sri Lanka: quick, lilting syllables; Japan: softer, higher, shorter phrases; a port town: a mix.
    const voice = this.p.voice ?? 'mixed';
    const pace = voice === 'lanka' ? 0.75 : voice === 'japan' ? 0.9 : 1;
    const lift = voice === 'japan' ? 1.15 : voice === 'lanka' ? 1.05 : 1;
    const soft = voice === 'japan' ? 0.75 : 1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    pan.connect(this.bus);
    const pitch = (120 + Math.random() * 160) * lift;
    const n = voice === 'lanka' ? 3 + Math.floor(Math.random() * 5) : voice === 'japan' ? 2 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 4);
    let at = t;
    for (let i = 0; i < n; i++) {
      const dur = (0.07 + Math.random() * 0.1) * pace;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      // A lilt: the pitch rises and falls through the phrase.
      const f0 = pitch * (0.9 + Math.random() * 0.25) * (voice === 'lanka' ? 1 + Math.sin((i / n) * Math.PI) * 0.12 : 1);
      o.frequency.setValueAtTime(f0, at);
      o.frequency.linearRampToValueAtTime(f0 * (0.85 + Math.random() * 0.3), at + dur);
      // A vowel: one formant band, different each syllable.
      const form = ctx.createBiquadFilter();
      form.type = 'bandpass';
      form.frequency.value = 500 + Math.random() * 1400;
      form.Q.value = 5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.018 * level * soft, at + 0.02);
      g.gain.linearRampToValueAtTime(0, at + dur);
      o.connect(form).connect(g).connect(pan);
      o.start(at);
      o.stop(at + dur + 0.02);
      at += dur + (0.02 + Math.random() * 0.06) * pace;
    }
  }

  /** Animal calls: a dog's woof, a cat's meow, a crow's caw, a cow's moo, an elephant's trumpet. */
  animal(call: 'bark' | 'meow' | 'caw' | 'moo' | 'trumpet', level: number): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.2 - 0.6;
    pan.connect(this.bus);
    const voice = (type: OscillatorType, at: number, dur: number, f: [number, number, number], form: number, q: number, gain: number, vib = 0): void => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f[0], at);
      o.frequency.linearRampToValueAtTime(f[1], at + dur * 0.4);
      o.frequency.linearRampToValueAtTime(f[2], at + dur);
      if (vib) {
        const v = ctx.createOscillator();
        v.frequency.value = 6;
        const vd = ctx.createGain();
        vd.gain.value = vib;
        v.connect(vd).connect(o.frequency);
        v.start(at);
        v.stop(at + dur);
      }
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = form;
      bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(gain * level, at + Math.min(0.03, dur * 0.2));
      g.gain.setValueAtTime(gain * level, at + dur * 0.7);
      g.gain.linearRampToValueAtTime(0, at + dur);
      o.connect(bp).connect(g).connect(pan);
      o.start(at);
      o.stop(at + dur + 0.02);
    };
    switch (call) {
      case 'bark':
        for (let i = 0; i < (Math.random() < 0.5 ? 1 : 2); i++) voice('sawtooth', t + i * 0.22, 0.12, [420, 520, 300], 900, 1.5, 0.05);
        break;
      case 'meow':
        voice('triangle', t, 0.55, [520, 780, 460], 1300, 2, 0.035);
        break;
      case 'caw':
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) voice('sawtooth', t + i * 0.32, 0.22, [760, 700, 560], 1500, 3, 0.03);
        break;
      case 'moo':
        voice('sawtooth', t, 1.3, [105, 140, 95], 420, 1.2, 0.06);
        break;
      case 'trumpet':
        voice('sawtooth', t, 0.9, [340, 720, 640], 1100, 1.5, 0.05, 25);
        break;
    }
  }

  /** One metal blade striking the griddle. */
  private clang(t: number, level: number, which: number): void {
    const ctx = this.ctx;
    for (const [f, g0] of [[1850 + which * 230, 0.05], [2970 + which * 180, 0.03], [4410, 0.015]] as [number, number][]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(g0 * level, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  /** A child's giggle (higher and quicker than a laugh). */
  giggle(level: number): void {
    this.laugh(this.ctx.currentTime, level * 1.4, 1.9);
  }

  /** "Ha-ha-ha": quick falling syllables. */
  private laugh(t: number, level: number, pitch = 1): void {
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.2 - 0.6;
    pan.connect(this.bus);
    const f0 = (220 + Math.random() * 180) * pitch;
    for (let i = 0; i < 4; i++) {
      const at = t + (i * 0.14) / Math.sqrt(pitch);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0 * (1 - i * 0.05), at);
      o.frequency.linearRampToValueAtTime(f0 * (0.9 - i * 0.05), at + 0.09);
      const form = ctx.createBiquadFilter();
      form.type = 'bandpass';
      form.frequency.value = 900;
      form.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.022 * level, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, at + 0.1);
      o.connect(form).connect(g).connect(pan);
      o.start(at);
      o.stop(at + 0.12);
    }
  }

  private distantHorn(t: number, level: number): void {
    const ctx = this.ctx;
    const f0 = 380 + Math.random() * 180;
    for (const [mul, when] of [[1, 0], [1.25, 0]] as [number, number][]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f0 * mul;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + when);
      g.gain.linearRampToValueAtTime(0.012 * level, t + when + 0.02);
      g.gain.setValueAtTime(0.012 * level, t + when + 0.3);
      g.gain.linearRampToValueAtTime(0, t + when + 0.4);
      o.connect(f).connect(g).connect(this.bus);
      o.start(t + when);
      o.stop(t + when + 0.45);
    }
  }
}
