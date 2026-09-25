import { SCALES, type DistrictDef } from '../world/Districts';

/** Radio stations (docs/07 §4). Each is a procedural arrangement style. */
export interface Station {
  freq: string;
  name: string;
  style: 'lofi' | 'acoustic' | 'ambient';
  tracks: number;
}

export const STATIONS: Station[] = [
  { freq: '88.3', name: 'Paper Kite FM', style: 'lofi', tracks: 8 },
  { freq: '92.1', name: 'Harbour Hum', style: 'acoustic', tracks: 8 },
  { freq: '97.7', name: 'Midnight Ink', style: 'ambient', tracks: 6 },
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
    this.musicBus.connect(this.master);
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

    this.nextStepTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
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
    } else {
      if (s16 === 0 || s16 === 8) this.pluck(midiToHz(this.degreeMidi(chord[bar % 4] + 7, 0)), t, 0.03, 'sine', 2.5);
    }
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
  update(speed: number, boosting: boolean, driving: boolean, rain: number, height: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const hum = driving ? this.engineVolume * 0.06 : 0;
    this.engineGain.gain.setTargetAtTime(hum * (0.5 + Math.min(1, speed / 50) * 0.7), t, 0.1);
    const f = 38 + speed * 1.6 + (boosting ? 30 : 0);
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f * 0.5 + 1.5, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(300 + speed * 12 + (boosting ? 500 : 0), t, 0.1);
    const windLevel = this.windVolume * (Math.min(1, speed / 60) * 0.12 + Math.min(1, height / 250) * 0.05);
    this.windGain.gain.setTargetAtTime(windLevel, t, 0.3);
    this.windFilter.frequency.setTargetAtTime(300 + speed * 18, t, 0.3);
    this.rainGain.gain.setTargetAtTime(rain * 0.06, t, 0.5);
    this.musicBus.gain.setTargetAtTime(1, t, 0.3);
    this.noteBus.gain.setTargetAtTime(1, t, 0.3);

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
