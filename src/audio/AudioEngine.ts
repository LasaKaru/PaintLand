import { SCALES, type DistrictDef } from '../world/Districts';
import { Ambience, type AmbienceParams } from './Ambience';

/** Radio stations (docs/07 §4). Each is a procedural arrangement style. */
export interface Station {
  freq: string;
  name: string;
  style: 'lofi' | 'acoustic' | 'ambient' | 'island';
  tracks: number;
}

export const STATIONS: Station[] = [
  { freq: '88.3', name: 'Paper Kite FM', style: 'lofi', tracks: 8 },
  { freq: '92.1', name: 'Harbour Hum', style: 'acoustic', tracks: 8 },
  { freq: '97.7', name: 'Midnight Ink', style: 'ambient', tracks: 6 },
  { freq: '101.4', name: 'Serendib Beat', style: 'island', tracks: 8 },
];

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Chord roots as scale degrees; one chord per bar. Several progressions = "tracks". */
const PROGRESSIONS = [
  [0, 5, 3, 4],
  [0, 3, 5, 4],
  [5, 3, 0, 4],
  [0, 4, 5, 3],
  [3, 4, 0, 0],
  [0, 2, 3, 4],
  [5, 4, 3, 4],
  [0, 5, 1, 4],
];

/**
 * All sound: a beat clock, the procedural radio (backing band in the
 * district's key), music-box notes quantised to the beat, engine, wind, rain
 * and UI/SFX blips (docs/07). Pure Web Audio; starts on the first user gesture.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private noteBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private engineOsc!: OscillatorNode;
  private engineOsc2!: OscillatorNode;
  private engineGain!: GainNode;
  private engineFilter!: BiquadFilterNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private rainGain!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private engineSub!: OscillatorNode;
  private intakeFilter!: BiquadFilterNode;
  private intakeGain!: GainNode;
  private screechGain!: GainNode;
  private screechFilter!: BiquadFilterNode;
  private ambience: Ambience | null = null;
  /** 0..1 how intense the music plays (speed, races, boosts). */
  intensity = 0;
  /** 1 = full, lower = muffled (menus, pause, under bridges). */
  musicOpen = 1;
  ambienceVolume = 0.7;

  radioOn = true;
  stationIndex = 0;
  trackIndex = 0;
  private def: DistrictDef | null = null;
  private pendingDef: DistrictDef | null = null;
  private bpm = 90;
  private step = 0; // 16th notes since start
  private nextStepTime = 0;
  private timer: number | null = null;
  private lastNoteSlot = -1;
  /** 0..1 progress through the current "track" (for the radio card). */
  trackProgress = 0;
  /** Beat pulse 0..1 (for the gramophone horn). */
  beatPulse = 0;
  private lastBeatTime = 0;

  musicVolume = 0.7;
  noteVolume = 0.8;
  engineVolume = 0.35;
  windVolume = 0.5;

  get started(): boolean {
    return this.ctx !== null;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.ratio.value = 12;
    this.master.connect(limiter).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.4);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.35;
    this.reverb.connect(reverbGain).connect(this.master);

    this.musicBus = ctx.createGain();
    // Music goes through a low-pass that opens with intensity (and closes in menus).
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 9000;
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.musicBus.connect(this.reverb);
    this.noteBus = ctx.createGain();
    this.noteBus.connect(this.master);
    this.noteBus.connect(this.reverb);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Engine: two detuned saws through a low-pass.
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 380;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain).connect(this.sfxBus);
    this.engineOsc.start();
    this.engineOsc2.start();
    // A sub-octave for weight and a noisy intake that opens up with throttle.
    this.engineSub = ctx.createOscillator();
    this.engineSub.type = 'sine';
    const subGain = ctx.createGain();
    subGain.gain.value = 0.6;
    this.engineSub.connect(subGain).connect(this.engineFilter);
    this.engineSub.start();
    const intake = ctx.createBufferSource();
    intake.buffer = this.noise;
    intake.loop = true;
    this.intakeFilter = ctx.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.Q.value = 4;
    this.intakeGain = ctx.createGain();
    this.intakeGain.gain.value = 0;
    intake.connect(this.intakeFilter).connect(this.intakeGain).connect(this.sfxBus);
    intake.start();
    // Tyre screech: squeezed noise with a warble, only while sliding.
    const screech = ctx.createBufferSource();
    screech.buffer = this.noise;
    screech.loop = true;
    this.screechFilter = ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.value = 1500;
    this.screechFilter.Q.value = 9;
    this.screechGain = ctx.createGain();
    this.screechGain.gain.value = 0;
    screech.connect(this.screechFilter).connect(this.screechGain).connect(this.sfxBus);
    screech.start();

    // Wind and rain beds from looped noise.
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.sfxBus);
    wind.start();

    const rain = ctx.createBufferSource();
    rain.buffer = this.noise;
    rain.loop = true;
    rain.playbackRate.value = 0.7;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 2500;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(rainFilter).connect(this.rainGain).connect(this.sfxBus);
    rain.start();

    // The living world: birds, crickets, sea, city.
    const ambBus = ctx.createGain();
    ambBus.connect(this.master);
    this.ambience = new Ambience(ctx, ambBus, this.noise, this.reverb);

    this.nextStepTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  /** Where the player is, for the ambience beds (see Ambience). */
  setAmbience(p: Omit<AmbienceParams, 'volume'>): void {
    this.ambience?.set({ ...p, volume: this.ambienceVolume });
  }

  /** Engine load and tyre screech, every frame while driving. */
  vehicleExtras(throttle: number, screech: number, speed: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.intakeGain.gain.setTargetAtTime(this.engineVolume * 0.05 * throttle * Math.min(1, 0.3 + speed / 40), t, 0.08);
    this.screechGain.gain.setTargetAtTime(this.engineVolume * 0.09 * screech, t, 0.05);
    this.screechFilter.frequency.setTargetAtTime(1300 + Math.sin(t * 23) * 180 + speed * 6, t, 0.03);
  }

  /** Change key and tempo at the next bar line (docs/07 §2). */
  setDistrict(def: DistrictDef): void {
    if (!this.def) {
      this.def = def;
      this.bpm = def.bpm;
    } else this.pendingDef = def;
  }

  toggleRadio(): void {
    this.radioOn = !this.radioOn;
  }

  nextTrack(): void {
    this.trackIndex = (this.trackIndex + 1) % STATIONS[this.stationIndex].tracks;
    this.step = Math.ceil(this.step / 16) * 16;
  }

  nextStation(): void {
    this.stationIndex = (this.stationIndex + 1) % STATIONS.length;
    this.trackIndex = 0;
    this.radioOn = true;
    this.blip(880, 0.05, 'triangle', 0.08);
  }

  get station(): Station {
    return STATIONS[this.stationIndex];
  }

  private get sixteenth(): number {
    return 60 / this.bpm / 4;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.def) return;
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      if (this.step % 16 === 0 && this.pendingDef) {
        this.def = this.pendingDef;
        this.bpm = this.def.bpm;
        this.pendingDef = null;
      }
      this.playStep(this.step, this.nextStepTime);
      const swing = this.station.style === 'lofi' && this.step % 2 === 0 ? 1.12 : this.station.style === 'lofi' ? 0.88 : 1;
      this.nextStepTime += this.sixteenth * swing;
      this.step++;
    }
    const barsPerTrack = 32;
    this.trackProgress = (this.step % (barsPerTrack * 16)) / (barsPerTrack * 16);
    if (this.step % (barsPerTrack * 16) === 0 && this.step > 0) this.trackIndex = (this.trackIndex + 1) % this.station.tracks;
  }

  private chordDegrees(bar: number): number[] {
    const prog = PROGRESSIONS[(this.trackIndex + this.stationIndex * 3) % PROGRESSIONS.length];
    const root = prog[bar % prog.length];
    return [root, root + 2, root + 4, root + 6];
  }

  private degreeMidi(degree: number, octaveShift = 0): number {
    const def = this.def!;
    const scale = SCALES[def.scale];
    const oct = Math.floor(degree / 7);
    const idx = ((degree % 7) + 7) % 7;
    return def.root + (oct + octaveShift) * 12 + scale[idx];
  }

  private playStep(step: number, t: number): void {
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const chord = this.chordDegrees(bar);
    if (s16 % 4 === 0) this.lastBeatTime = t;

    // The pad always plays (quietly with the radio off) so notes have a bed.
    if (s16 === 0) {
      const padLevel = this.radioOn ? 0.05 : 0.025;
      for (const d of chord.slice(0, 3)) this.pad(midiToHz(this.degreeMidi(d, -1)), t, (60 / this.bpm) * 4, padLevel);
    }
    if (!this.radioOn) return;
    const style = this.station.style;

    if (style === 'lofi') {
      if (s16 === 0 || s16 === 10) this.kick(t);
      if (s16 === 4 || s16 === 12) this.snare(t);
      if (s16 % 2 === 0) this.hat(t, s16 % 4 === 2 ? 0.05 : 0.03);
      if (s16 === 0 || s16 === 8) this.bass(midiToHz(this.degreeMidi(chord[0], -2)), t, 0.45);
      if (s16 % 4 === 2) this.pluck(midiToHz(this.degreeMidi(chord[(s16 / 2 + bar) % 4], 0)), t, 0.035, 'sine');
    } else if (style === 'acoustic') {
      if (s16 % 2 === 0) this.pluck(midiToHz(this.degreeMidi(chord[[0, 2, 1, 2, 3, 2, 1, 2][s16 / 2]], 0)), t, 0.05, 'triangle');
      if (s16 === 0) this.bass(midiToHz(this.degreeMidi(chord[0], -2)), t, 0.8);
      if (s16 % 4 === 2) this.shaker(t);
    } else if (style === 'island') {
      // Serendib Beat: a four-on-the-floor with rabana-style hand drums and a bright arpeggio.
      if (s16 % 4 === 0) this.kick(t);
      if (s16 === 4 || s16 === 12) this.clap(t);
      if (s16 % 2 === 1) this.hat(t, 0.04);
      if ([0, 3, 6, 10, 13].includes(s16)) this.handDrum(t, s16 === 0 || s16 === 10 ? 'low' : 'high');
      if (s16 % 4 === 0 || s16 === 7 || s16 === 14) this.bass(midiToHz(this.degreeMidi(chord[s16 === 14 ? 2 : 0], -2)), t, 0.22);
      const arp = [0, 1, 2, 3, 2, 1, 2, 3];
      if (s16 % 2 === 0) this.pluck(midiToHz(this.degreeMidi(chord[arp[(s16 / 2 + bar) % 8]], 1)), t, 0.03, 'square', 0.25);
    } else {
      if (s16 === 0 || s16 === 8) this.pluck(midiToHz(this.degreeMidi(chord[bar % 4] + 7, 0)), t, 0.03, 'sine', 2.5);
    }
    // Intensity layers: extra drive when the ride gets fast (any station).
    if (this.intensity > 0.55 && style !== 'island') {
      if (s16 % 2 === 1) this.hat(t, 0.025 * this.intensity);
      if (s16 % 8 === 4) this.handDrum(t, 'high');
    }
    if (this.intensity > 0.8 && s16 % 4 === 0 && style === 'ambient') this.kick(t);
  }

  /** Time of the next 1/8 beat (with 1/16 fallback when the slot is taken). */
  private quantised(): number {
    const ctx = this.ctx!;
    const now = ctx.currentTime + 0.01;
    const eighth = this.sixteenth * 2;
    const base = this.nextStepTime - (this.step % 2) * this.sixteenth;
    let slot = Math.ceil((now - base) / eighth);
    let when = base + slot * eighth;
    if (slot === this.lastNoteSlot) {
      slot += 0.5;
      when = base + slot * eighth;
    }
    this.lastNoteSlot = slot;
    return Math.max(when, now);
  }

  /** A collected note: music box, pitch in key, on the beat (docs/07 §3). */
  playNote(midi: number, velocity = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = this.quantised();
    const f = midiToHz(midi + 12);
    const out = ctx.createGain();
    out.gain.value = 0.16 * this.noteVolume * velocity;
    out.connect(this.noteBus);
    const partials: [number, number, number][] = [
      [1, 1, 1.4],
      [2.0, 0.35, 0.8],
      [3.0, 0.14, 0.5],
      [4.16, 0.08, 0.3],
    ];
    for (const [mul, gain, decay] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  /** Phrase sealed: a little rising arpeggio. */
  chime(rootMidi: number): void {
    [0, 4, 7, 12].forEach((iv, i) => setTimeout(() => this.playNote(rootMidi + iv, 0.8), i * 70));
  }

  // ————— instruments —————

  private pad(freq: number, t: number, dur: number, level: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * this.musicVolume, t + 0.4);
    g.gain.setValueAtTime(level * this.musicVolume, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
    filter.connect(g).connect(this.musicBus);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 0.5);
    }
  }

  private pluck(freq: number, t: number, level: number, type: OscillatorType, decay = 0.6): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * this.musicVolume, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  private bass(freq: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * this.musicVolume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32 * this.musicVolume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.3);
  }

  private clap(t: number): void {
    for (const d of [0, 0.012, 0.024]) this.noiseHit(t + d, 'bandpass', 1400, 0.09 * this.musicVolume, 0.12);
  }

  /** A rabana / tabla-like hand drum: a pitched thump with a skin slap. */
  private handDrum(t: number, kind: 'low' | 'high'): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f0 = kind === 'low' ? 110 : 260;
    o.frequency.setValueAtTime(f0 * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18 * this.musicVolume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'low' ? 0.35 : 0.16));
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.4);
    this.noiseHit(t, 'highpass', 3000, 0.03 * this.musicVolume, 0.04);
  }

  // ————— game SFX (milestone 7) —————

  /** Car door: a latch click and a thud. */
  door(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, 'highpass', 2500, 0.06, 0.03, this.sfxBus);
    this.noiseHit(t + 0.03, 'lowpass', 280, 0.22, 0.18, this.sfxBus);
  }

  /** Loot chest: a sparkle that grows with rarity (0 common … 3 legendary). */
  loot(rarity: number): void {
    const base = [72, 74, 76, 79][rarity] ?? 72;
    const steps = [0, 4, 7, 12, 16, 19].slice(0, 3 + rarity);
    steps.forEach((iv, i) => setTimeout(() => this.playNote(base + iv, 0.7 + rarity * 0.1), i * (rarity >= 3 ? 90 : 70)));
    if (rarity >= 2 && this.ctx) this.noiseHit(this.ctx.currentTime + 0.3, 'highpass', 6000, 0.05, 0.8, this.sfxBus);
  }

  /** A secret found: a little mysterious motif. */
  secret(): void {
    [0, 3, 7, 10, 14].forEach((iv, i) => setTimeout(() => this.playNote(69 + iv, 0.8), i * 110));
  }

  /** Checkpoint passed. */
  checkpoint(): void {
    this.blip(988, 0.07, 'square', 0.05);
    setTimeout(() => this.blip(1319, 0.1, 'square', 0.05), 70);
  }

  /** Boost ignition: whoosh plus a rising tone. */
  boostStart(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noiseHit(t, 'bandpass', 1200, 0.15, 0.6, this.sfxBus);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** A crowd-ish burst of claps (stunts). */
  cheer(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 14; i++) this.noiseHit(t + Math.random() * 0.6, 'bandpass', 1200 + Math.random() * 900, 0.05, 0.1, this.sfxBus);
  }

  /** Bumping into something solid. */
  bump(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, 'lowpass', 220, 0.3, 0.25, this.sfxBus);
    this.noiseHit(t, 'bandpass', 2400, 0.05, 0.08, this.sfxBus);
  }

  /** Mission complete: a short rising fanfare. */
  fanfare(): void {
    [[60, 0], [64, 120], [67, 240], [72, 380], [76, 380], [79, 380]].forEach(([n, d]) => setTimeout(() => this.playNote(n, 0.9), d));
  }

  /** Festival drums nearby (0..1): the perahera's davul and thammattama. */
  festival = 0;
  private festivalNext = 0;
  private festivalStep = 0;

  private festivalDrums(t: number): void {
    const level = this.festival * this.ambienceVolume;
    if (level < 0.02) {
      this.festivalNext = t;
      return;
    }
    // A driving 12/8 pattern: deep davul, sharp thammattama, a cymbal on the off-beats.
    const step = 60 / 132 / 3;
    if (this.festivalNext < t) this.festivalNext = t + 0.02;
    while (this.festivalNext < t + 0.12) {
      const at = this.festivalNext;
      const i = this.festivalStep % 12;
      if (i === 0 || i === 6 || i === 9) this.drumHit(at, 95, 0.32 * level, 0.35);
      if (i === 3 || i === 5 || i === 8 || i === 11) this.drumHit(at, 330, 0.18 * level, 0.09);
      if (i % 3 === 2) this.noiseHit(at, 'highpass', 6500, 0.05 * level, 0.18, this.sfxBus);
      this.festivalNext += step;
      this.festivalStep++;
    }
  }

  private drumHit(t: number, f0: number, level: number, decay: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0 * 1.7, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + decay + 0.05);
    this.noiseHit(t, 'bandpass', f0 * 8, level * 0.25, 0.04, this.sfxBus);
  }

  /** Firework: a rising whistle, then a boom and crackle `delay` seconds later. */
  firework(delay = 1.1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(2600, t + delay * 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + delay + 0.05);
    this.noiseHit(t + delay, 'lowpass', 180, 0.4, 0.9, this.sfxBus);
    for (let i = 0; i < 16; i++) this.noiseHit(t + delay + 0.15 + Math.random() * 0.9, 'highpass', 4000 + Math.random() * 3000, 0.04, 0.05, this.sfxBus);
  }

  /** Soft click for menus. */
  uiClick(): void {
    this.blip(1500, 0.025, 'triangle', 0.03);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, level: number, dur: number, bus?: GainNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus ?? this.musicBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  private snare(t: number): void {
    this.noiseHit(t, 'bandpass', 1800, 0.12 * this.musicVolume, 0.16);
  }

  private hat(t: number, level: number): void {
    this.noiseHit(t, 'highpass', 7000, level * this.musicVolume, 0.05);
  }

  private shaker(t: number): void {
    this.noiseHit(t, 'highpass', 5000, 0.04 * this.musicVolume, 0.09);
  }

  // ————— effects —————

  blip(freq: number, dur: number, type: OscillatorType = 'sine', level = 0.1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  hop(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(260, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.2);
  }

  land(strength: number): void {
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime, 'lowpass', 300, 0.15 * strength, 0.2, this.sfxBus);
  }

  thud(): void {
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime, 'lowpass', 600, 0.2, 0.25, this.sfxBus);
  }

  whoosh(): void {
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime, 'bandpass', 900, 0.18, 0.5, this.sfxBus);
  }

  /** Rolling thunder: low noise with a long tail, quieter and later when far away. */
  thunder(distance: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900 / (1 + distance), t);
    f.frequency.exponentialRampToValueAtTime(90, t + 2.5);
    const g = ctx.createGain();
    const level = 0.45 / (0.6 + distance);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.05 + distance * 0.1);
    g.gain.exponentialRampToValueAtTime(level * 0.4, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3 + distance);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + 3.2 + distance);
  }

  /** A short clunk on a gear change (realistic handling). */
  gearShift(): void {
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime, 'bandpass', 400, 0.05, 0.08, this.sfxBus);
  }

  honk(midi: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const iv of [0, 4]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = midiToHz(midi + iv);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.02);
      g.gain.setValueAtTime(0.05, t + 0.25);
      g.gain.linearRampToValueAtTime(0, t + 0.32);
      o.connect(f).connect(g).connect(this.sfxBus);
      o.start(t);
      o.stop(t + 0.35);
    }
  }

  footstep(): void {
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime, 'bandpass', 1200 + Math.random() * 400, 0.05, 0.06, this.sfxBus);
  }

  /** Continuous beds, called every frame. */
  update(speed: number, boosting: boolean, driving: boolean, rain: number, height: number, rpm?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const hum = driving ? this.engineVolume * 0.06 : 0;
    this.engineGain.gain.setTargetAtTime(hum * (0.5 + Math.min(1, speed / 50) * 0.7), t, 0.1);
    // Realistic handling drives the pitch from engine rpm (gear changes drop it).
    const f = rpm !== undefined ? 28 + rpm * 0.013 + (boosting ? 20 : 0) : 38 + speed * 1.6 + (boosting ? 30 : 0);
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f * 0.5 + 1.5, t, 0.08);
    this.engineSub.frequency.setTargetAtTime(f * 0.25, t, 0.08);
    this.intakeFilter.frequency.setTargetAtTime(f * 6, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(300 + speed * 12 + (boosting ? 500 : 0), t, 0.1);
    const windLevel = this.windVolume * (Math.min(1, speed / 60) * 0.12 + Math.min(1, height / 250) * 0.05);
    this.windGain.gain.setTargetAtTime(windLevel, t, 0.3);
    this.windFilter.frequency.setTargetAtTime(300 + speed * 18, t, 0.3);
    this.rainGain.gain.setTargetAtTime(rain * 0.06, t, 0.5);
    this.musicBus.gain.setTargetAtTime(1, t, 0.3);
    this.noteBus.gain.setTargetAtTime(1, t, 0.3);
    // Music opens up as the ride gets intense; muffled when musicOpen drops (menus, pause).
    this.musicFilter.frequency.setTargetAtTime((1200 + this.intensity * 9000) * this.musicOpen + 250, t, 0.4);
    this.ambience?.update(1 / 60);
    this.festivalDrums(t);
    if (!driving) {
      this.intakeGain.gain.setTargetAtTime(0, t, 0.1);
      this.screechGain.gain.setTargetAtTime(0, t, 0.05);
    }

    // Beat pulse for the gramophone horn.
    const beat = 60 / this.bpm;
    const since = t - this.lastBeatTime;
    this.beatPulse = this.radioOn ? Math.max(0, 1 - Math.abs(since) / (beat * 0.5)) : 0;
  }

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    void this.ctx?.close();
  }
}

function makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}
