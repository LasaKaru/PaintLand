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
  /** Master volume for ambience (Settings → Audio). */
  volume: number;
}

export class Ambience {
  private readonly bus: GainNode;
  private readonly waveGain: GainNode;
  private readonly waveFilter: BiquadFilterNode;
  private readonly leafGain: GainNode;
  private readonly cricketGain: GainNode;
  private readonly cityGain: GainNode;
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
