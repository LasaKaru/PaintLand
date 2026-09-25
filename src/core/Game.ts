import * as THREE from 'three';
import { Input } from './Input';
import { clamp } from './MathUtil';
import { Random } from './Random';
import { buildChapter1 } from '../road/chapter1';
import { buildRoadMesh } from '../road/RoadMesh';
import { RoadPath, createFrame } from '../road/RoadPath';
import { PaintPipeline } from '../render/PaintPipeline';
import { paintShared } from '../render/PaintMaterial';
import { createSky, createWater, waterUniforms, skyUniforms } from '../render/SkyWater';
import { loadStudio, type StudioSettings } from '../render/StudioSettings';
import { Environment, TIME_PRESETS } from '../world/Environment';
import { Decorator } from '../world/Decorator';
import { DISTRICTS } from '../world/Districts';
import { RoverModel, DEFAULT_ROVER_LOOK, WHEEL_RADIUS, type RoverLook } from '../models/Rover';
import { HumanModel, DEFAULT_HUMAN_LOOK, type HumanLook } from '../models/Human';
import { RoverController, ROVER_TUNING } from '../gameplay/RoverController';
import { HumanController } from '../gameplay/HumanController';
import { Collectibles, type PickupEvent, type TonicId } from '../gameplay/Collectibles';
import { CameraRig } from '../camera/CameraRig';
import { AudioEngine } from '../audio/AudioEngine';
import { Hud } from '../ui/Hud';
import { Studio } from '../ui/Studio';

type GameState = 'loading' | 'title' | 'intro' | 'play' | 'paused';
type PawnMode = 'drive' | 'foot';

const SIM_DT = 1 / 60;

const TONICS: Record<TonicId, { buff: string; drawback: string; duration: number }> = {
  magnet: { buff: 'Note magnet', drawback: 'No boost', duration: 10 },
  feather: { buff: 'High jumps', drawback: 'No brakes', duration: 9 },
  fizzy: { buff: 'Fizzy ink +20%', drawback: 'Wobbly', duration: 8 },
};

interface BestTimes {
  districts: Record<string, number>;
  lap: number | null;
}

/**
 * The game: owns the world, the pawns, the fixed-step simulation and the
 * frame loop (docs/11 §2). Simulation runs at a fixed 60 Hz and rendering
 * interpolates between ticks.
 */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly settings: StudioSettings = loadStudio();
  private readonly pipeline: PaintPipeline;
  private readonly input: Input;
  private readonly audio = new AudioEngine();
  private readonly hud: Hud;
  private studio!: Studio;
  private env!: Environment;
  private path!: RoadPath;
  private decor!: Decorator;
  private items!: Collectibles;
  private rig!: CameraRig;
  private rover!: RoverController;
  private roverModel!: RoverModel;
  private human!: HumanController;
  private humanModel!: HumanModel;
  private roverLook: RoverLook = loadJson('paintland.rover.v1', DEFAULT_ROVER_LOOK);
  private humanLook: HumanLook = loadJson('paintland.human.v1', DEFAULT_HUMAN_LOOK);

  private state: GameState = 'loading';
  private mode: PawnMode = 'drive';
  private accumulator = 0;
  private time = 0;
  private lastFrame = performance.now();
  private readonly frame = createFrame();
  private readonly footFrame = createFrame();

  // Race and score.
  private lapTime = 0;
  private lapNo = 1;
  private districtTime = 0;
  private district = 0;
  private districtClean = true;
  private best: BestTimes = loadJson('paintland.best.v1', { districts: {}, lap: null });
  private score = 0;
  private combo = 1;
  private comboTimer = 0;
  private songLog: number[] = [];
  private readonly tonics = new Map<TonicId, number>();
  private splash = 0;
  private borderPulse = 0;
  private pendingLap = false;
  private footstepTimer = 0;
  private fps = 60;
  private hudHidden = false;

  private readonly events: PickupEvent[] = [];

  constructor(container: HTMLElement) {
    THREE.ColorManagement.enabled = false;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(1);
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);
    this.pipeline = new PaintPipeline(this.renderer, this.settings);
    this.input = new Input(this.renderer.domElement);

    this.hud = new Hud(container, {
      onTimePreset: (id) => this.env.setPreset(id),
      onAuto: () => this.env.setAuto(!this.env.auto),
      onRain: () => this.env.toggleRain(),
      onRadio: () => this.audio.toggleRadio(),
      onNextSong: () => this.audio.nextTrack(),
      onBand: () => this.audio.nextStation(),
      onCamera: () => this.cycleCamera(),
      onStudio: () => this.studio.toggle(),
      onPause: () => this.togglePause(),
      onStart: (radio) => this.startPlaying(radio),
      onResume: () => this.togglePause(),
      onRestart: () => this.restartLap(),
      onHelp: () => this.hud.show('screenHelp', true),
      onLook: () => this.randomLook(),
      onTitle: () => this.toIntro(),
    });

    window.addEventListener('resize', () => this.resize());
    this.renderer.domElement.addEventListener('click', () => {
      if (this.state === 'play' && this.mode === 'foot') this.input.requestPointerLock();
    });
  }

  async init(): Promise<void> {
    const step = async (p: number, text: string): Promise<void> => {
      this.hud.setLoading(p, text);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    };
    await step(0.05, 'sketching the road…');
    this.path = buildChapter1();
    this.scene.add(createSky(), createWater());
    this.env = new Environment(this.scene);
    await step(0.2, 'folding paper streets…');
    this.scene.add(buildRoadMesh(this.path));
    await step(0.35, 'painting houses…');
    this.decor = new Decorator(this.path);
    this.scene.add(this.decor.build());
    await step(0.7, 'writing melodies…');
    this.items = new Collectibles(this.path);
    this.scene.add(this.items.group);
    await step(0.8, 'tuning the gramophone…');

    this.rover = new RoverController(this.path, {
      onHop: () => this.audio.hop(),
      onLand: (air) => this.onLand(air),
      onBump: () => {
        this.audio.thud();
        this.rig.addShake(0.15);
      },
      onLap: () => (this.pendingLap = true),
    });
    this.rover.reset(8);
    this.human = new HumanController(this.path);
    this.buildPawnModels();

    this.rig = new CameraRig(this.path, this.decor.blockers, window.innerWidth / window.innerHeight);
    this.studio = new Studio(this.settings, {
      onChange: () => this.applySettings(),
      onPlaySong: () => this.playMySong(),
      onRandomLook: () => this.randomLook(),
      stats: () => `${this.fps.toFixed(0)} fps · ${Math.round(this.pipeline.renderScale * 100)}% · ${this.renderer.info.render.calls} calls`,
    });
    this.applySettings();
    this.resize();
    await step(1, 'ready');

    // Warm up shaders so the first frames don't hitch.
    this.rig.updateOrbit(0.016, 0, 20);
    this.renderer.compile(this.scene, this.rig.camera);

    this.hud.show('loading', false);
    this.state = 'title';
    this.hud.show('screenTitle', true);
    requestAnimationFrame(this.loop);
  }

  // ————— setup helpers —————

  private buildPawnModels(): void {
    if (this.roverModel) this.scene.remove(this.roverModel.root);
    if (this.humanModel) this.humanModel.root.removeFromParent();
    this.roverModel = new RoverModel(this.roverLook);
    this.humanModel = new HumanModel(this.humanLook);
    this.scene.add(this.roverModel.root);
    this.seatHuman();
  }

  private seatHuman(): void {
    this.humanModel.root.removeFromParent();
    if (this.mode === 'drive') {
      this.roverModel.seat.add(this.humanModel.root);
      this.humanModel.root.position.set(0, -0.45, 0);
      this.humanModel.root.rotation.set(0, 0, 0);
      this.humanModel.root.scale.setScalar(0.85);
    } else {
      this.scene.add(this.humanModel.root);
      this.humanModel.root.scale.setScalar(1);
    }
  }

  private applySettings(): void {
    const s = this.settings;
    this.rig.baseFov = s.fov;
    this.rig.rollFollow = s.reducedMotion ? Math.min(0.5, s.cameraRoll) : s.cameraRoll;
    this.rig.shake = s.reducedMotion ? 0 : s.cameraShake;
    paintShared.uHatch.value = s.hatching;
    this.audio.musicVolume = s.musicVolume;
    this.audio.noteVolume = s.musicBox;
    this.audio.engineVolume = s.engineHum;
    this.audio.windVolume = s.wind;
    this.pipeline.setSize(window.innerWidth, window.innerHeight);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.pipeline.setSize(w, h);
    if (this.rig) {
      this.rig.camera.aspect = w / h;
      this.rig.camera.updateProjectionMatrix();
    }
  }

  // ————— state changes —————

  private toIntro(): void {
    if (this.state !== 'title') return;
    this.state = 'intro';
    this.hud.show('screenTitle', false);
    this.hud.show('screenIntro', true);
  }

  private startPlaying(radio: boolean): void {
    this.audio.start();
    this.audio.radioOn = radio;
    this.audio.setDistrict(DISTRICTS[0]);
    this.hud.show('screenIntro', false);
    this.hud.show('screenTitle', false);
    this.state = 'play';
    this.hud.setPlaying(true);
    this.rig.snap();
    this.resetRun();
    this.showDistrict(0);
  }

  private resetRun(): void {
    this.rover.reset(8);
    this.lapTime = 0;
    this.districtTime = 0;
    this.district = 0;
    this.districtClean = true;
    this.score = 0;
    this.combo = 1;
    this.songLog = [];
    this.tonics.clear();
    this.items.resetLap();
    if (this.mode === 'foot') this.enterRover(true);
  }

  private restartLap(): void {
    if (this.state === 'paused') this.togglePause();
    this.resetRun();
    this.splash = 1;
    this.showDistrict(0);
  }

  private togglePause(): void {
    if (this.state === 'play') {
      this.state = 'paused';
      this.hud.show('screenPause', true);
      this.input.releasePointerLock();
      void this.audio.ctx?.suspend();
    } else if (this.state === 'paused') {
      this.state = 'play';
      this.hud.show('screenPause', false);
      this.hud.show('screenHelp', false);
      void this.audio.ctx?.resume();
    }
  }

  private cycleCamera(): void {
    const label = this.mode === 'drive' ? this.rig.cycleDrive() : this.rig.cycleFoot();
    this.hud.setCameraLabel(label.charAt(0).toUpperCase() + label.slice(1));
    this.updateHeadVisibility();
  }

  /** Hide the character's head whenever the camera sits inside it. */
  private updateHeadVisibility(): void {
    const inside = this.mode === 'foot' ? this.rig.footMode === 'first' : this.rig.driveMode === 'cockpit';
    this.humanModel.setHeadVisible(!inside);
  }

  private randomLook(): void {
    const rnd = new Random((Math.random() * 1e9) | 0);
    const bodies = ['#efe8d8', '#bfd9e8', '#f2c6b4', '#c9e0b8', '#f4e1a6', '#e9b8c8', '#d8d4ee'];
    const wings = ['#d8463a', '#2f8f86', '#3e6fa8', '#f08a2e', '#9a5bd6'];
    this.roverLook = {
      body: rnd.pick(bodies),
      trim: rnd.pick(['#8c8a94', '#6a6f8a', '#9a7a5a']),
      wing: rnd.pick(wings),
      hubs: rnd.pick(['#f2b632', '#f6f0e4', '#d8463a', '#3e6fa8']),
      roofLoad: rnd.pick(['gramophone', 'boombox', 'flowers'] as const),
    };
    this.humanLook = {
      skin: rnd.pick(['#f0c7a6', '#d9a57e', '#b27b52', '#8a5a3a', '#f6d8c0', '#6b4630']),
      hair: rnd.pick(['#c8452e', '#2b2622', '#6b4a2a', '#e8c872', '#9a5bd6', '#3e6fa8']),
      hairStyle: rnd.pick(['bob', 'bun', 'short', 'curly'] as const),
      top: rnd.pick(['#4f9a5a', '#d8463a', '#f4d23b', '#3e6fa8', '#e8559a', '#f6f0e4']),
      bottom: rnd.pick(['#3f5f9a', '#2b2622', '#c8955a', '#6a6f8a']),
      shoes: rnd.pick(['#2b2622', '#d8463a', '#f6f0e4']),
      scarf: rnd.chance(0.5) ? rnd.pick(['#f4d23b', '#e8559a', '#2f8f86']) : null,
      hat: rnd.pick(['none', 'none', 'straw', 'beret'] as const),
    };
    saveJson('paintland.rover.v1', this.roverLook);
    saveJson('paintland.human.v1', this.humanLook);
    this.buildPawnModels();
    this.updateHeadVisibility();
    this.audio.chime(72);
  }

  private playMySong(): void {
    this.audio.start();
    const notes = this.songLog.slice(-64);
    notes.forEach((m, i) => setTimeout(() => this.audio.playNote(m, 0.9), i * 230));
  }

  // ————— pawn switching —————

  private exitRover(): void {
    if (Math.abs(this.rover.v) > 4) {
      this.popAtPawn('Slow down to get out', 'info');
      return;
    }
    this.rover.v = 0;
    this.rover.cruise = false;
    this.mode = 'foot';
    // Step out on the driver's side (left) unless the rover is against the left kerb.
    const f = this.path.sample(this.rover.s, this.frame);
    const side = this.rover.x < -f.width / 2 + 4 ? 1 : -1;
    this.human.place(this.rover.s - 0.3, this.rover.x + side * 2.4, 0);
    this.rig.orbitYaw = 0;
    this.rig.orbitPitch = 0.25;
    this.seatHuman();
    this.rig.snap();
    this.hud.setCameraLabel(this.rig.footMode === 'first' ? 'First' : 'Third');
    this.updateHeadVisibility();
    this.audio.blip(520, 0.08, 'triangle', 0.06);
  }

  private enterRover(force = false): void {
    const ds = Math.abs(this.human.s - this.rover.s);
    const dx = Math.abs(this.human.x - this.rover.x);
    if (!force && (ds > 4 || dx > 4)) return;
    this.mode = 'drive';
    this.input.releasePointerLock();
    this.seatHuman();
    this.updateHeadVisibility();
    this.rig.snap();
    this.hud.setCameraLabel(this.rig.driveMode.charAt(0).toUpperCase() + this.rig.driveMode.slice(1));
    this.audio.blip(660, 0.08, 'triangle', 0.06);
  }

  // ————— simulation —————

  private simStep(dt: number): void {
    const inp = this.input;
    if (this.mode === 'drive') {
      const feather = this.tonics.has('feather');
      this.rover.mods.noBoost = this.tonics.has('magnet');
      this.rover.mods.noBrakes = feather;
      this.rover.mods.highJumps = feather;
      this.rover.mods.speedMul = this.tonics.has('fizzy') ? 1.2 : 1;
      this.rover.mods.wobbly = this.tonics.has('fizzy');
      this.rover.step(dt, {
        throttle: inp.throttle(),
        brake: inp.brake(),
        steer: inp.steer(),
        hop: inp.consume('hop'),
        boost: inp.held('boost'),
        drift: inp.held('drift'),
      });
      this.items.collect(
        { s: this.rover.s, x: this.rover.x, h: this.rover.h, radiusS: 2.4, radiusX: 1.9, magnet: this.tonics.has('magnet'), driving: true },
        this.events,
      );
    } else {
      const move = inp.moveAxes();
      this.human.step(dt, {
        moveX: move.x,
        moveY: move.y,
        cameraYaw: this.rig.orbitYaw,
        sprint: inp.held('sprint'),
        walk: inp.held('crouch'),
        jump: inp.consume('hop'),
        faceCamera: this.rig.footMode === 'first',
      });
      this.items.collect(
        { s: this.human.s, x: this.human.x, h: this.human.h, radiusS: 0.9, radiusX: 0.9, magnet: this.tonics.has('magnet'), driving: false },
        this.events,
      );
      this.rover.prevS = this.rover.s;
      this.rover.prevX = this.rover.x;
      this.rover.prevH = this.rover.h;
      this.rover.prevYaw = this.rover.yaw;
    }

    // Tonic timers.
    for (const [id, t] of this.tonics) {
      if (t - dt <= 0) this.tonics.delete(id);
      else this.tonics.set(id, t - dt);
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 1;

    // Clock and district splits (driving only counts toward the time trial).
    this.lapTime += dt;
    this.districtTime += dt;
    const s = this.mode === 'drive' ? this.rover.s : this.human.s;
    const d = this.path.districtAt(s);
    if (d !== this.district) this.changeDistrict(d);
  }

  private changeDistrict(d: number): void {
    const prev = DISTRICTS[this.district];
    if (d === this.district + 1 && this.districtClean && this.mode === 'drive') {
      const t = this.districtTime;
      const bestT = this.best.districts[prev.id] ?? null;
      this.hud.showSplit(prev.name, t, bestT === null ? null : t - bestT);
      if (bestT === null || t < bestT) {
        this.best.districts[prev.id] = t;
        saveJson('paintland.best.v1', this.best);
      }
    }
    this.district = d;
    this.districtTime = 0;
    this.districtClean = this.mode === 'drive';
    this.showDistrict(d);
  }

  private showDistrict(d: number): void {
    const def = DISTRICTS[d];
    this.hud.showDistrictTitle(def.kicker, def.name, def.poem);
    this.audio.setDistrict(def);
  }

  private finishLap(): void {
    this.pendingLap = false;
    const lap = this.lapTime;
    const prevBest = this.best.lap;
    if (prevBest === null || lap < prevBest) {
      this.best.lap = lap;
      saveJson('paintland.best.v1', this.best);
    }
    const last = DISTRICTS[this.district];
    const bestT = this.best.districts[last.id] ?? null;
    this.hud.showSplit(last.name, this.districtTime, bestT === null ? null : this.districtTime - bestT);
    if (bestT === null || this.districtTime < bestT) this.best.districts[last.id] = this.districtTime;
    this.hud.showLapBanner(prevBest === null || lap < prevBest ? `New best lap! ${lap.toFixed(2)}s` : `Lap ${this.lapNo} · ${lap.toFixed(2)}s`);
    this.lapNo++;
    const v = this.rover.v;
    this.rover.reset(8);
    this.rover.v = Math.max(v, ROVER_TUNING.cruiseFloor);
    this.rover.cruise = true;
    this.lapTime = 0;
    this.districtTime = 0;
    this.district = 0;
    this.districtClean = true;
    this.items.resetLap();
    this.splash = 1;
    this.rig.snap();
    this.showDistrict(0);
  }

  private respawn(): void {
    const span = this.path.spanOf(this.district);
    const s = Math.max(8, (span?.start ?? 0) + 4);
    if (this.mode === 'foot') this.human.place(s, 0, 0);
    else {
      this.rover.reset(s);
      this.rover.v = ROVER_TUNING.cruiseFloor;
      this.rover.cruise = true;
    }
    this.districtClean = false;
    this.splash = 1;
    this.rig.snap();
  }

  private onLand(air: number): void {
    this.audio.land(Math.min(1, air));
    this.rig.addShake(Math.min(0.35, air * 0.2));
    if (air > 0.5) {
      const pts = Math.round(air * 20);
      this.score += pts * 10;
      this.popAtPawn(`AIR +${pts}`, 'good');
      this.borderPulse = Math.min(0.3, air * 0.15);
    }
  }

  private handleEvents(): void {
    for (const e of this.events) {
      switch (e.type) {
        case 'note': {
          const n = e.note!;
          this.audio.playNote(n.midi);
          this.songLog.push(n.midi);
          this.rover.addBoost(0.04);
          this.combo = Math.min(8, this.comboTimer > 0 ? this.combo + 1 : 1);
          this.comboTimer = 1.2;
          this.score += 10 * this.combo;
          break;
        }
        case 'sealed': {
          const air = this.mode === 'drive' && !this.rover.grounded;
          this.audio.chime(DISTRICTS[e.phrase!.district].root + 12);
          this.score += air ? 400 : 200;
          this.popAt(e.position, air ? `AIR ${this.rover.airTime.toFixed(1)}s · SEALED` : 'SEALED ✓', 'big');
          break;
        }
        case 'bolt':
          this.rover.boostMeter = 1;
          this.audio.whoosh();
          this.popAt(e.position, 'THUNDER!', 'good');
          break;
        case 'tonic': {
          const t = TONICS[e.tonic!];
          this.tonics.set(e.tonic!, t.duration);
          this.audio.chime(60);
          this.popAt(e.position, e.tonic === 'feather' ? 'FEATHER' : e.tonic === 'fizzy' ? 'FIZZY INK!' : 'MAGNET', 'good');
          break;
        }
        case 'pad':
          this.rover.v = Math.max(this.rover.v, ROVER_TUNING.topSpeed * 1.08);
          this.rover.addBoost(0.1);
          this.audio.whoosh();
          break;
        case 'ramp':
          this.rover.launch(8 + this.rover.v * 0.12);
          this.popAt(e.position, 'RAMP!', 'info');
          break;
        case 'crate':
          this.audio.thud();
          this.rover.v *= 0.94;
          this.popAt(e.position, 'CRASH', 'info');
          this.rig.addShake(0.2);
          break;
      }
    }
    this.events.length = 0;
  }

  // ————— frame loop —————

  private loop = (now: number): void => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.05;
    this.time += dt;
    this.renderer.info.reset();
    this.input.poll();
    this.handleGlobalInput();

    if (this.state === 'play') {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= SIM_DT && steps < 5) {
        this.simStep(SIM_DT);
        this.accumulator -= SIM_DT;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;
      if (this.pendingLap) this.finishLap();
      this.handleEvents();
    }
    // Keep jump/hop presses buffered for the next sim tick (high-refresh screens render frames with no tick).
    this.input.clearUnconsumed(['hop', 'interact']);
    this.render(dt, this.accumulator / SIM_DT);
  };

  private handleGlobalInput(): void {
    const inp = this.input;
    if (this.state === 'title' && (inp.consume('hop') || inp.consume('interact'))) {
      this.toIntro();
      return;
    }
    if (this.state === 'intro' && inp.consume('hop')) {
      this.startPlaying((this.hud.root.querySelector('[data-id="radioCheck"]') as HTMLInputElement).checked);
      return;
    }
    if (inp.consume('studio')) this.studio.toggle();
    if (inp.consume('pause')) {
      if (this.mode === 'foot' && this.input.isPointerLocked) this.input.releasePointerLock();
      else this.togglePause();
    }
    if (inp.consume('hud')) {
      this.hudHidden = !this.hudHidden;
      this.hud.root.classList.toggle('hud-hidden', this.hudHidden);
    }
    for (let i = 0; i < TIME_PRESETS.length && i < 7; i++) {
      if (inp.consume(`time${i + 1}` as 'time1')) this.env.setPreset(TIME_PRESETS[i].id);
    }
    if (inp.consume('time8')) this.env.setAuto(!this.env.auto);
    if (inp.consume('weather')) this.env.toggleRain();
    if (inp.consume('radio')) this.audio.toggleRadio();
    if (inp.consume('nextSong')) this.audio.nextTrack();
    if (inp.consume('band')) this.audio.nextStation();
    if (inp.consume('fovDown')) this.settings.fov = Math.max(55, this.settings.fov - 5);
    if (inp.consume('fovUp')) this.settings.fov = Math.min(110, this.settings.fov + 5);
    this.rig.baseFov = this.settings.fov;
    const wheel = inp.takeWheel();
    if (wheel) this.rig.zoom = clamp(this.rig.zoom * (wheel > 0 ? 1.1 : 0.9), 0.6, 2.2);

    if (this.state !== 'play') return;
    if (inp.consume('camera')) this.cycleCamera();
    if (inp.consume('honk')) this.audio.honk(DISTRICTS[this.district].root);
    if (inp.consume('respawn')) this.respawn();
    if (inp.consume('interact')) {
      if (this.mode === 'drive') this.exitRover();
      else this.enterRover();
    }
    if (inp.consume('photo')) {
      this.hudHidden = !this.hudHidden;
      this.hud.root.classList.toggle('hud-hidden', this.hudHidden);
    }
    // On-foot look.
    const look = inp.takeLook(1 / 60);
    if (this.mode === 'foot') {
      this.rig.orbitYaw += look.dx * 0.0028;
      this.rig.orbitPitch = clamp(this.rig.orbitPitch + look.dy * 0.0022, -0.9, 1.25);
    }
  }

  private render(dt: number, alpha: number): void {
    const playing = this.state === 'play' || this.state === 'paused';
    const r = this.rover.lerpState(playing ? alpha : 1);
    const f = this.path.sample(r.s, this.frame);

    // Rover transform in the road frame.
    const rm = this.roverModel;
    const basis = _m.makeBasis(f.right, f.up, _v.copy(f.tangent).negate());
    rm.root.quaternion.setFromRotationMatrix(basis).multiply(_q.setFromAxisAngle(_y, -r.yaw));
    rm.root.position.copy(f.position).addScaledVector(f.right, r.x).addScaledVector(f.up, r.h + 0.02);
    const steer = this.mode === 'drive' ? this.input.steer() : 0;
    for (const p of rm.steerPivots) p.rotation.y = -steer * 0.35;
    for (const w of rm.wheels) w.rotation.x -= (this.rover.v * dt) / WHEEL_RADIUS;
    rm.body.position.y = -this.rover.squash * 0.18 + Math.sin(this.time * 18) * 0.012 * Math.min(1, this.rover.v / 20);
    rm.body.rotation.z = clamp(-this.rover.vx * 0.012, -0.08, 0.08);
    rm.body.rotation.x = this.rover.braking ? -0.035 : this.rover.boosting ? 0.03 : 0;
    const pulse = this.audio.beatPulse;
    rm.horn.scale.setScalar(1 + pulse * 0.08);
    rm.antenna.rotation.x = Math.sin(this.time * 9) * 0.08 * Math.min(1, this.rover.v / 15) - this.rover.v * 0.003;
    rm.setBrakeLights(this.rover.braking);
    rm.setHeadlights(paintShared.uNight.value);

    // Human transform.
    let focus: THREE.Vector3;
    if (this.mode === 'foot') {
      const hs = this.human.lerpState(playing ? alpha : 1);
      const hf = this.path.sample(hs.s, this.footFrame);
      const hb = _m.makeBasis(hf.right, hf.up, _v.copy(hf.tangent).negate());
      this.humanModel.root.quaternion.setFromRotationMatrix(hb).multiply(_q.setFromAxisAngle(_y, -hs.heading));
      this.humanModel.root.position.copy(hf.position).addScaledVector(hf.right, hs.x).addScaledVector(hf.up, hs.h);
      this.humanModel.animate(dt, this.human.pose, this.human.speed, this.time);
      if (this.human.grounded && this.human.speed > 0.5) {
        this.footstepTimer -= dt * this.human.speed;
        if (this.footstepTimer <= 0) {
          this.audio.footstep();
          this.footstepTimer = 1.1;
        }
      }
      const eye = this.humanModel.head.getWorldPosition(new THREE.Vector3()).addScaledVector(hf.up, 0.25);
      if (this.state === 'play' || this.state === 'paused') {
        this.rig.updateFoot(dt, { s: hs.s, x: hs.x, h: hs.h, yaw: hs.heading, speed: this.human.speed, boosting: false, eye });
      }
      focus = this.humanModel.root.position;
      const near = Math.abs(this.human.s - this.rover.s) < 4 && Math.abs(this.human.x - this.rover.x) < 4;
      this.hud.setPrompt(near ? 'F · Get in the rover' : null);
    } else {
      this.humanModel.animate(dt, 'sit', 0, this.time);
      focus = rm.root.position;
      if (this.state === 'play' || this.state === 'paused') {
        const eye = rm.seat.getWorldPosition(new THREE.Vector3()).addScaledVector(f.up, 0.9);
        this.rig.updateDrive(dt, { s: r.s, x: r.x, h: r.h, yaw: r.yaw, speed: this.rover.v, boosting: this.rover.boosting, eye });
      }
      this.hud.setPrompt(this.state === 'play' && Math.abs(this.rover.v) < 3 && this.lapTime > 2 ? 'F · Get out and walk' : null);
    }
    if (this.state === 'title' || this.state === 'intro') this.rig.updateOrbit(dt, this.time, this.rover.s + 6);

    // World.
    const cam = this.rig.camera;
    this.scene.children.find((c) => c.name === 'sky')?.position.copy(cam.position);
    this.env.update(dt, focus, cam, this.settings.reducedMotion);
    paintShared.uTime.value = this.time;
    skyUniforms.uTime.value = this.time;
    waterUniforms.uTime.value = this.time;
    this.decor.update(this.time);
    this.items.update(dt, this.time, this.mode === 'drive' ? r.s : this.human.s, f.up);

    // Audio beds.
    const height = focus.y;
    this.audio.update(this.mode === 'drive' ? this.rover.v : this.human.speed, this.rover.boosting, this.mode === 'drive' && playing, this.env.rain, height);

    // HUD.
    this.updateHud(dt, f.up);

    this.splash = Math.max(0, this.splash - dt * 1.4);
    this.borderPulse = Math.max(0, this.borderPulse - dt * 0.8);
    const speedLines = this.mode === 'drive' ? clamp((this.rover.v - 38) / 20, 0, 1) + (this.rover.boosting ? 0.6 : 0) : 0;
    this.pipeline.render(this.scene, cam, dt, this.time, {
      fogColor: this.env.fogColor,
      rain: this.env.rain,
      speedLines: Math.min(1, speedLines),
      borderPulse: this.borderPulse + this.splash * 0.4,
      splash: this.splash * 0.8,
    });
  }

  private updateHud(dt: number, roadUp: THREE.Vector3): void {
    const hud = this.hud;
    hud.update(dt);
    const totals = this.items.totals();
    hud.setClock(this.env.clockText(), this.env.bandLabel(), this.env.presetId, this.env.auto, this.env.weather === 'rain');
    hud.setStatus(totals.notes, totals.noteTotal, this.env.bandLabel(), this.settings.vibe);
    const st = this.audio.station;
    hud.setRadio(st.freq, st.name, `track ${String(this.audio.trackIndex + 1).padStart(2, '0')} / ${String(st.tracks).padStart(2, '0')}`, this.audio.trackProgress, this.audio.radioOn);
    if (this.state !== 'play' && this.state !== 'paused') return;

    hud.setTimer(true, DISTRICTS[this.district].name, this.districtTime, this.lapTime, this.best.lap, this.lapNo);
    hud.setScore(this.score, this.combo);
    const s = this.mode === 'drive' ? this.rover.s : this.human.s;
    const current = this.items.notes.find((n) => n.s > s && !n.collected)?.phrase ?? this.items.phrases.length - 1;
    hud.setSongbook(this.items.phrases, current, totals.notes, totals.noteTotal, totals.sealed);

    // Gravity compass: where "down" points on screen.
    const cam = this.rig.camera;
    const camRight = _v.set(1, 0, 0).applyQuaternion(cam.quaternion);
    const camUp = _v2.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const down = _v3.copy(roadUp).negate();
    const angle = (Math.atan2(down.dot(camRight), down.dot(camUp)) * 180) / Math.PI;
    const label = roadUp.y > 0.7 ? 'down is down' : roadUp.y < -0.7 ? 'upside down' : 'sideways';
    const kmh = this.mode === 'drive' ? this.rover.speedKmh : this.human.speed * 3.6;
    hud.setSpeed(kmh, this.rover.boostMeter, this.rover.boosting, DISTRICTS[this.district].name, angle, label, this.mode === 'foot');
    hud.setTonics([...this.tonics].map(([id, t]) => ({ buff: TONICS[id].buff, drawback: TONICS[id].drawback, remaining: t, total: TONICS[id].duration })));
  }

  /** Development hook: jump the rover to distance `s` and start playing (used by tools/screenshot.mjs). */
  debugJump(s: number, preset?: string, rain?: boolean): void {
    if (this.state !== 'play') this.startPlaying(false);
    if (this.mode === 'foot') this.enterRover(true);
    this.rover.reset(s);
    this.rover.v = ROVER_TUNING.cruiseFloor;
    this.rover.cruise = true;
    const d = this.path.districtAt(s);
    if (d !== this.district) this.changeDistrict(d);
    if (preset) this.env.setPreset(preset);
    if (rain !== undefined && (this.env.weather === 'rain') !== rain) this.env.toggleRain();
    this.rig.snap();
  }

  debugInfo(): Record<string, unknown> {
    return { state: this.state, lapTime: this.lapTime, throttle: this.input.throttle(), s: this.rover.s, v: this.rover.v, mode: this.mode, district: this.district, fps: this.fps, calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, length: this.path.length };
  }

  debugWalk(): void {
    this.rover.v = 0;
    this.exitRover();
  }

  private popAt(world: THREE.Vector3, text: string, kind: 'good' | 'info' | 'big'): void {
    const p = world.clone().project(this.rig.camera);
    if (p.z > 1) return;
    const x = clamp((p.x * 0.5 + 0.5) * window.innerWidth, 80, window.innerWidth - 80);
    const y = clamp((-p.y * 0.5 + 0.5) * window.innerHeight - 30, 80, window.innerHeight - 180);
    this.hud.pop(text, x, y, kind);
  }

  private popAtPawn(text: string, kind: 'good' | 'info' | 'big'): void {
    const target = this.mode === 'drive' ? this.roverModel.root.position : this.humanModel.root.position;
    this.popAt(target.clone().addScaledVector(this.frame.up, 3), text, kind);
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    /* storage blocked */
  }
  return structuredClone(fallback);
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked */
  }
}
