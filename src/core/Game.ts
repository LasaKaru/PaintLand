import * as THREE from 'three';
import { Input } from './Input';
import { displaySpeed, loadOptions, saveOptions, type GameOptions } from './Options';
import { clamp } from './MathUtil';
import { createFrame } from '../road/RoadPath';
import { PaintPipeline } from '../render/PaintPipeline';
import { paintShared } from '../render/PaintMaterial';
import { createSky, createWater, waterUniforms, skyUniforms } from '../render/SkyWater';
import { applyArtStyle, applyQuality, loadStudio, saveStudio, type ArtStyle, type QualityLevel, type StudioSettings } from '../render/StudioSettings';
import { Environment, TIME_PRESETS, type WeatherId } from '../world/Environment';
import { CHAPTERS, chapterById } from '../world/Chapters';
import { World } from '../world/World';
import { VehicleModel, vehicleById, tuningFor } from '../models/Vehicles';
import { HumanModel } from '../models/Human';
import { RoverController } from '../gameplay/RoverController';
import { HumanController } from '../gameplay/HumanController';
import { Autopilot } from '../gameplay/Autopilot';
import type { PickupEvent, TonicId } from '../gameplay/Collectibles';
import { MISSIONS, MissionTracker, type MissionDef } from '../gameplay/Missions';
import { Profile } from '../gameplay/Profile';
import { CameraRig } from '../camera/CameraRig';
import { Director, type Shot } from '../camera/Director';
import { AudioEngine } from '../audio/AudioEngine';
import { Hud } from '../ui/Hud';
import { Studio } from '../ui/Studio';
import { Menu, type MenuScreen } from '../ui/Menu';
import { NetClient, type PlayerInfo, type PlayerState } from '../net/Net';
import { RemotePlayers } from '../net/RemotePlayers';

type GameState = 'loading' | 'splash' | 'menu' | 'intro' | 'play' | 'paused';
type PawnMode = 'drive' | 'foot';

const SIM_DT = 1 / 60;

const TONICS: Record<TonicId, { buff: string; drawback: string; duration: number }> = {
  magnet: { buff: 'Note magnet', drawback: 'No boost', duration: 10 },
  feather: { buff: 'High jumps', drawback: 'No brakes', duration: 9 },
  fizzy: { buff: 'Fizzy ink +20%', drawback: 'Wobbly', duration: 8 },
};

const INTRO: Shot[] = [
  { kind: 'landmark', duration: 6, landmark: 0, line: 'Once, a painter drew a little town in the margin of a sketchbook…' },
  { kind: 'chaseLow', duration: 5, line: '…and a rover with a brass gramophone to drive through it.' },
  { kind: 'drone', duration: 5, line: 'But the painter forgot which way was down, and the streets folded up into the sky.' },
  { kind: 'flyby', duration: 5, line: 'Every road became a line of music; every note, a place to go.' },
  { kind: 'landmark', duration: 6, landmark: 1, line: 'Now the pages are turning — Colombo, Sigiriya, Rome, Agra, Rio, Petra…' },
  { kind: 'orbit', duration: 5, line: 'Paint the road. Then drive up it.' },
];


/**
 * The game: owns the world, the pawns, the fixed-step simulation and the frame
 * loop (docs/11 §2). Simulation runs at 60 Hz and rendering interpolates.
 * Menus, the intro and the live cinematic all run on the same world.
 */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly settings: StudioSettings = loadStudio();
  private readonly options: GameOptions = loadOptions();
  private readonly pipeline: PaintPipeline;
  private readonly input: Input;
  private readonly audio = new AudioEngine();
  private readonly hud: Hud;
  private readonly menu: Menu;
  private readonly profile = new Profile();
  private readonly net = new NetClient();
  private readonly remotes: RemotePlayers;
  private studio!: Studio;
  private env!: Environment;
  private world!: World;
  private rig!: CameraRig;
  private director!: Director;
  private rover!: RoverController;
  private vehicle!: VehicleModel;
  private human!: HumanController;
  private humanModel!: HumanModel;
  private readonly demo = new Autopilot({ speed: 36, lane: 0, followNotes: true, showOff: true });
  private readonly missions = new MissionTracker();
  private sky!: THREE.Mesh;

  private state: GameState = 'loading';
  private mode: PawnMode = 'drive';
  private accumulator = 0;
  private time = 0;
  private lastFrame = performance.now();
  private readonly frame = createFrame();
  private readonly footFrame = createFrame();

  // Run state.
  private lapTime = 0;
  private lapNo = 1;
  private districtTime = 0;
  private district = 0;
  private districtClean = true;
  private score = 0;
  private combo = 1;
  private comboTimer = 0;
  private songLog: number[] = [];
  private readonly tonics = new Map<TonicId, number>();
  private selectedTonic: TonicId = 'magnet';
  private steerSmoothed = 0;
  private splash = 0;
  private borderPulse = 0;
  private pendingLap = false;
  private footstepTimer = 0;
  private fps = 60;
  private hudHidden = false;
  private waveTimer = 0;
  private raceCountdown = 0;
  private missionEndTimer = 0;
  private saveTimer = 0;
  private resumeSnapshot: { s: number; x: number; v: number; mode: PawnMode; hs: number; hx: number } | null = null;
  private showcaseTarget: 'character' | 'vehicle' | null = null;
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
      onStart: () => this.play(this.world.chapter.id),
      onResume: () => this.togglePause(),
      onRestart: () => this.restartLap(),
      onHelp: () => this.hud.show('screenHelp', true),
      onLook: () => this.openMenu(),
      onTitle: () => this.openMenu(),
    });
    this.remotes = new RemotePlayers(this.scene, this.hud.labels);
    this.menu = new Menu(container, {
      profile: this.profile,
      chapters: CHAPTERS,
      currentChapter: () => this.world.chapter,
      missions: () => this.world.missions,
      play: (id) => this.play(id),
      startMission: (m) => this.startMissionFromMenu(m),
      lookChanged: () => this.buildPawnModels(),
      vehicleChanged: () => this.buildPawnModels(),
      showcase: (t) => this.setShowcase(t),
      netStatus: () => ({ status: this.net.status, room: this.net.room, players: [...this.net.peers.values()].map((p) => p.info?.name ?? '…') }),
      netConnect: (room, server) => this.net.connect(room, server, this.playerInfo()),
      netDisconnect: () => this.net.disconnect(),
      openStudio: () => this.studio.toggle(),
      openControls: () => this.hud.show('screenHelp', true),
      watchIntro: () => this.startIntro(),
      unlockAudio: () => this.unlockAudio(),
      studio: () => this.settings,
      options: () => this.options,
      settingsChanged: () => this.settingsChanged(),
      input: () => this.input,
      stats: () => `${this.fps.toFixed(0)} fps · ${Math.round(this.pipeline.renderScale * 100)}% render scale · ${this.renderer.info.render.calls} draw calls · ${(this.renderer.info.render.triangles / 1e6).toFixed(2)} M triangles`,
      resume: () => this.resumeFromMenu(),
      canResume: () => this.resumeSnapshot !== null,
    });
    this.net.onChat = (name, text) => this.hud.chatLine(name, text);

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', () => {
      if (this.state === 'splash' && this.menu.screen === 'splash') {
        this.unlockAudio();
        this.afterSplash();
      }
    });
    this.menu.root.addEventListener('click', () => {
      if (this.state === 'splash' && this.menu.screen !== 'splash') this.afterSplash();
    });
    this.renderer.domElement.addEventListener('click', () => {
      if (this.state === 'play' && this.mode === 'foot') this.input.requestPointerLock();
    });
  }

  async init(): Promise<void> {
    const step = async (p: number, text: string): Promise<void> => {
      this.hud.setLoading(p, text);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    };
    await step(0.05, 'mixing paint…');
    this.sky = createSky();
    this.scene.add(this.sky, createWater());
    this.env = new Environment(this.scene);
    this.env.onThunder = (d) => {
      this.audio.thunder(d);
      this.rig?.addShake(0.12 / (0.5 + d));
    };
    await step(0.15, 'sketching the chapter…');
    this.loadChapter(this.profile.data.chapter);
    await step(0.85, 'tuning the gramophone…');
    this.studio = new Studio(this.settings, {
      onChange: () => this.applySettings(),
      onPlaySong: () => this.playMySong(),
      onRandomLook: () => this.openMenu('wardrobe'),
      stats: () => `${this.fps.toFixed(0)} fps · ${Math.round(this.pipeline.renderScale * 100)}% · ${this.renderer.info.render.calls} calls`,
    });
    this.applySettings();
    this.resize();
    await step(1, 'ready');
    this.director.update(0.016, 0, { s: this.rover.s, x: 0, h: 0, position: this.vehicle.root.position.clone() });
    this.renderer.compile(this.scene, this.rig.camera);
    this.hud.show('loading', false);
    this.hud.show('screenTitle', false);
    this.state = 'splash';
    this.hud.setPlaying(false);
    this.menu.show('splash');
    requestAnimationFrame(this.loop);
  }

  // ————— chapters and pawns —————

  private loadChapter(id: string): void {
    const chapter = chapterById(id);
    if (this.world?.chapter.id === chapter.id) return;
    this.world?.dispose();
    this.world = new World(chapter);
    this.scene.add(this.world.group);
    this.profile.data.chapter = chapter.id;
    this.profile.save();
    this.env.setPreset(chapter.startPreset);

    this.rover = new RoverController(this.world.path, {
      onHop: () => this.audio.hop(),
      onLand: (air) => this.onLand(air),
      onBump: () => {
        this.audio.thud();
        this.rig.addShake(0.15);
        this.input.rumble(0.5, 120);
      },
      onLap: () => (this.pendingLap = true),
      onShift: () => this.audio.gearShift(),
    });
    this.rover.tuning = tuningFor(this.profile.data.vehicle);
    this.rover.reset(8);
    this.applyOptions();
    this.human = new HumanController(this.world.path);
    this.mode = 'drive';

    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const prev = this.rig;
    this.rig = new CameraRig(this.world.path, this.world.decor.blockers, aspect);
    if (prev) {
      this.rig.driveMode = prev.driveMode;
      this.rig.footMode = prev.footMode;
      this.rig.zoom = prev.zoom;
    }
    this.director = new Director(this.rig.camera, this.world.path, this.world.decor.landmarks, this.world.decor.blockers);
    this.director.onCut = () => (this.borderPulse = 0.12);
    this.director.attract();
    this.buildPawnModels();
    this.applySettings();
    this.world.people.setGivers(this.world.missions, (mid) => this.profile.data.missionsDone.includes(mid));
    this.missions.cancel();
    this.district = 0;
    this.audio.setDistrict(chapter.districts[0]);
    this.remotes.clear();
  }

  private buildPawnModels(): void {
    this.vehicle?.root.removeFromParent();
    this.humanModel?.root.removeFromParent();
    const def = vehicleById(this.profile.data.vehicle);
    this.vehicle = new VehicleModel(def, this.profile.vehicleLook(def.id));
    this.humanModel = new HumanModel(this.profile.data.look);
    this.scene.add(this.vehicle.root);
    this.rover.tuning = tuningFor(def.id);
    this.seatHuman();
    this.updateHeadVisibility();
    if (this.net.connected) this.net.sendHello(this.playerInfo());
  }

  private seatHuman(): void {
    this.humanModel.root.removeFromParent();
    const h = this.profile.data.look.height ?? 1;
    if (this.mode === 'drive' && this.showcaseTarget !== 'character') {
      this.vehicle.seat.add(this.humanModel.root);
      this.humanModel.root.position.set(0, -0.45, 0);
      this.humanModel.root.quaternion.identity();
      this.humanModel.root.scale.setScalar(0.85 * h);
    } else {
      this.scene.add(this.humanModel.root);
      this.humanModel.root.scale.setScalar(h);
    }
  }

  private playerInfo(): PlayerInfo {
    const id = this.profile.data.vehicle;
    return { name: this.profile.data.name, look: this.profile.data.look, vehicle: id, vlook: this.profile.vehicleLook(id), chapter: this.world.chapter.id };
  }

  private applySettings(): void {
    const s = this.settings;
    if (this.rig) {
      this.rig.baseFov = s.fov;
      this.rig.rollFollow = s.reducedMotion ? Math.min(0.5, s.cameraRoll) : s.cameraRoll;
      this.rig.shake = s.reducedMotion ? 0 : s.cameraShake;
    }
    paintShared.uHatch.value = s.hatching;
    paintShared.uRealism.value = s.realism;
    this.env?.setShadows(s.shadowQuality, s.shadowDistance, s.softShadows);
    if (this.rig) {
      this.rig.camera.far = s.drawDistance;
      this.rig.camera.updateProjectionMatrix();
    }
    // The sky dome sits just inside the far plane.
    this.sky?.scale.setScalar((s.drawDistance * 0.9) / 3000);
    this.audio.musicVolume = s.musicVolume;
    this.audio.noteVolume = s.musicBox;
    this.audio.engineVolume = s.engineHum;
    this.audio.windVolume = s.wind;
    this.applyOptions();
    this.pipeline.setSize(window.innerWidth, window.innerHeight);
  }

  /** Controls, driving model, units, weather and accessibility (Settings → Controls / Driving / Access). */
  private applyOptions(): void {
    const o = this.options;
    document.documentElement.style.setProperty('--hud-scale', String(o.hudScale));
    this.input.mouseSensitivity = o.mouseSensitivity;
    this.input.invertY = o.invertY;
    this.input.padLookSensitivity = o.padLookSensitivity;
    this.input.deadzone = o.padDeadzone;
    this.input.vibration = o.vibration;
    if (this.rover) {
      this.rover.handling = o.handling;
      this.rover.gearbox = o.gearbox;
      this.rover.autoCruise = o.autoCruise;
    }
    if (this.env) {
      this.env.autoWeather = o.autoWeather;
      this.env.dayMinutes = o.dayMinutes;
    }
    this.pipeline.colourBlind = ['none', 'protan', 'deutan', 'tritan'].indexOf(o.colourBlind);
  }

  /** Save and apply everything the Settings screens touched. */
  private settingsChanged(): void {
    saveStudio(this.settings);
    saveOptions(this.options);
    this.applySettings();
    this.studio?.refresh();
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

  // ————— flow: splash → intro → menu → play —————

  private unlockAudio(): void {
    this.audio.start();
    this.audio.setDistrict(this.world.chapter.districts[this.district] ?? this.world.chapter.districts[0]);
  }

  private afterSplash(): void {
    if (this.state !== 'splash') return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) this.net.connect(room.replace(/[^a-zA-Z0-9_-]/g, ''), params.get('server'), this.playerInfo());
    if (!this.profile.data.seenIntro) this.startIntro();
    else this.openMenu();
  }

  private startIntro(): void {
    this.state = 'intro';
    this.menu.show('none');
    this.hud.setPlaying(false);
    this.resetDemo();
    this.director.script(INTRO);
  }

  private endIntro(): void {
    this.profile.data.seenIntro = true;
    this.profile.save();
    this.hud.letterbox(false);
    this.director.attract();
    this.openMenu();
  }

  private openMenu(screen: MenuScreen = 'main'): void {
    if (this.state === 'play' || this.state === 'paused') {
      this.resumeSnapshot = { s: this.rover.s, x: this.rover.x, v: this.rover.v, mode: this.mode, hs: this.human.s, hx: this.human.x };
      this.hud.show('screenPause', false);
      this.input.releasePointerLock();
      void this.audio.ctx?.resume();
    }
    this.state = 'menu';
    this.hud.setPlaying(false);
    this.hud.letterbox(false);
    this.hud.setPrompt(null);
    if (this.mode === 'foot') this.enterRover(true);
    this.resetDemo();
    this.director.attract();
    this.menu.show(screen);
  }

  private resetDemo(): void {
    this.rover.reset(8);
    this.rover.cruise = true;
    this.rover.v = 20;
    this.world.items.resetLap();
    this.tonics.clear();
    this.district = 0;
  }

  private play(chapterId: string): void {
    this.loadChapter(chapterId);
    this.resumeSnapshot = null;
    this.menu.show('none');
    this.setShowcase(null);
    this.hud.letterbox(false);
    this.state = 'play';
    this.hud.setPlaying(true);
    this.rig.snap();
    this.resetRun();
    this.showDistrict(0);
    this.unlockAudio();
  }

  private resumeFromMenu(): void {
    const snap = this.resumeSnapshot;
    this.menu.show('none');
    this.setShowcase(null);
    this.state = 'play';
    this.hud.setPlaying(true);
    if (snap) {
      this.rover.reset(snap.s);
      this.rover.x = snap.x;
      this.rover.v = snap.v;
      this.rover.cruise = true;
      if (snap.mode === 'foot') {
        this.exitRover(true);
        this.human.place(snap.hs, snap.hx, 0);
      }
    }
    this.resumeSnapshot = null;
    this.rig.snap();
  }

  private startMissionFromMenu(m: MissionDef): void {
    this.play(m.chapter);
    const g = this.world.people.givers.find((x) => x.mission.id === m.id);
    if (!g) return;
    this.rover.reset(Math.max(8, g.s - 12));
    this.rover.x = g.x > 0 ? 2.5 : -2.5;
    this.exitRover(true);
    this.human.place(g.s - 2.5, g.x * 0.85, 0);
    this.rig.snap();
    this.talkTo(m);
  }

  private setShowcase(t: 'character' | 'vehicle' | null): void {
    this.showcaseTarget = t;
    if (!t) {
      this.director.showcase = null;
      this.director.forceCut();
      this.seatHuman();
      return;
    }
    this.rover.reset(14);
    this.rover.v = 0;
    this.rover.cruise = false;
    this.seatHuman();
    this.director.forceCut();
  }

  private resetRun(): void {
    if (this.mode === 'foot') this.enterRover(true);
    this.rover.reset(8);
    this.lapTime = 0;
    this.districtTime = 0;
    this.district = 0;
    this.districtClean = true;
    this.score = 0;
    this.combo = 1;
    this.songLog = [];
    this.tonics.clear();
    this.world.items.resetLap();
    this.world.people.removeRival();
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

  private updateHeadVisibility(): void {
    if (!this.humanModel || !this.rig) return;
    const inside = this.state === 'play' && (this.mode === 'foot' ? this.rig.footMode === 'first' : this.rig.driveMode === 'cockpit');
    this.humanModel.setHeadVisible(!inside);
  }

  private playMySong(): void {
    this.audio.start();
    this.songLog.slice(-64).forEach((m, i) => setTimeout(() => this.audio.playNote(m, 0.9), i * 230));
  }

  // ————— pawn switching —————

  private exitRover(force = false): void {
    if (!force && Math.abs(this.rover.v) > 4) {
      this.popAtPawn('Slow down to get out', 'info');
      return;
    }
    this.rover.v = 0;
    this.rover.cruise = false;
    this.mode = 'foot';
    const f = this.world.path.sample(this.rover.s, this.frame);
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

  // ————— missions —————

  private nearbyGiver(): MissionDef | null {
    if (this.mode !== 'foot') return null;
    for (const g of this.world.people.givers) {
      if (Math.abs(g.s - this.human.s) < 3.5 && Math.abs(g.x - this.human.x) < 3.2) return g.mission;
    }
    return null;
  }

  private talkTo(m: MissionDef): void {
    const done = this.profile.data.missionsDone.includes(m.id);
    this.input.releasePointerLock();
    this.hud.showDialog(m.giver.name, `${m.text}${done ? ' (You did this already — it pays again!)' : ''}  Reward: ${m.reward.ink} ink.`, () => this.acceptMission(m));
  }

  private acceptMission(m: MissionDef): void {
    this.missions.start(m);
    this.world.people.setMarkers(null, 0, 0);
    this.world.people.removeRival();
    this.missionEndTimer = 0;
    if (m.kind === 'stamps') this.world.people.setMarkers('stamp', m.district ?? 0, m.count ?? 5);
    if (m.kind === 'visit') {
      const lm = this.world.decor.landmarks.find((l) => l.district === m.district);
      this.world.people.setMarkers('visit', m.district ?? 0, 1, lm?.s);
    }
    if (m.kind !== 'visit' && m.kind !== 'stamps' && m.kind !== 'seal' && m.kind !== 'air' && this.mode === 'foot') this.enterRover(true);
    if (m.kind === 'race') {
      this.rover.v = 0;
      this.rover.cruise = false;
      const rivalX = this.rover.x > 0 ? this.rover.x - 3.5 : this.rover.x + 3.5;
      const speed = this.rover.tuning.topSpeed * 0.86;
      this.world.people.spawnRival(this.rover.s, rivalX, speed, m.id === 'sk-race' ? 'coupe' : m.id === 'sl-train' ? 'tuktuk' : 'buggy');
      this.raceCountdown = 3.2;
    }
    this.hud.pop('Mission accepted!', window.innerWidth / 2, window.innerHeight * 0.35, 'big');
    this.audio.chime(67);
  }

  private completeMission(): void {
    const a = this.missions.active;
    if (!a) return;
    const m = a.mission;
    this.profile.data.ink += m.reward.ink;
    if (m.reward.item && !this.profile.owns(m.reward.item)) this.profile.data.owned.push(m.reward.item);
    if (!this.profile.data.missionsDone.includes(m.id)) this.profile.data.missionsDone.push(m.id);
    this.profile.save();
    this.hud.showLapBanner(`Mission complete! +${m.reward.ink} ink`);
    this.audio.chime(72);
    this.world.people.setGivers(this.world.missions, (id) => this.profile.data.missionsDone.includes(id));
    this.world.people.setMarkers(null, 0, 0);
    this.world.people.removeRival();
    this.missionEndTimer = 3;
  }

  // ————— simulation —————

  private simStep(dt: number): void {
    const inp = this.input;
    const items = this.world.items;
    const people = this.world.people;
    if (this.raceCountdown > 0) {
      const before = Math.ceil(this.raceCountdown);
      this.raceCountdown -= dt;
      const n = Math.ceil(this.raceCountdown);
      if (n !== before) this.hud.pop(n > 0 ? String(n) : 'GO!', window.innerWidth / 2, window.innerHeight * 0.4, 'big');
      if (this.raceCountdown <= 0) this.missions.started = true;
    }
    const frozen = this.raceCountdown > 0;
    if (this.mode === 'drive') {
      const feather = this.tonics.has('feather');
      this.rover.mods.noBoost = this.tonics.has('magnet');
      this.rover.mods.noBrakes = feather;
      this.rover.mods.highJumps = feather;
      this.rover.mods.speedMul = this.tonics.has('fizzy') ? 1.2 : 1;
      this.rover.mods.wobbly = this.tonics.has('fizzy');
      if (!frozen) this.rover.step(dt, { throttle: inp.throttle(), brake: inp.brake(), steer: this.steering(dt), hop: inp.consume('hop'), boost: inp.held('boost'), drift: inp.held('drift'), shiftUp: inp.consume('shiftUp'), shiftDown: inp.consume('shiftDown') });
      if (this.rover.sliding) this.input.rumble(0.15, 40);
      items.collect({ s: this.rover.s, x: this.rover.x, h: this.rover.h, radiusS: 2.4, radiusX: 1.9, magnet: this.tonics.has('magnet'), driving: true }, this.events);
      if (this.rover.boosting) this.missions.onBoost(this.district, dt);
      this.collideWithTraffic();
    } else {
      const move = inp.moveAxes();
      this.human.step(dt, { moveX: move.x, moveY: move.y, cameraYaw: this.rig.orbitYaw, sprint: inp.held('sprint'), walk: inp.held('crouch'), jump: inp.consume('hop'), faceCamera: this.rig.footMode === 'first' });
      items.collect({ s: this.human.s, x: this.human.x, h: this.human.h, radiusS: 0.9, radiusX: 0.9, magnet: this.tonics.has('magnet'), driving: false }, this.events);
      this.rover.prevS = this.rover.s;
      this.rover.prevX = this.rover.x;
      this.rover.prevH = this.rover.h;
      this.rover.prevYaw = this.rover.yaw;
    }
    if (!frozen) people.step(dt, items.notes, this.rover.s, this.rover.x);
    this.checkMarkers();
    this.checkRace();

    for (const [id, t] of this.tonics) {
      if (t - dt <= 0) this.tonics.delete(id);
      else this.tonics.set(id, t - dt);
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 1;
    this.missions.tick(dt);
    if (this.missionEndTimer > 0) {
      this.missionEndTimer -= dt;
      if (this.missionEndTimer <= 0) this.missions.cancel();
    } else if (this.missions.active?.done) this.completeMission();
    else if (this.missions.active?.failed) {
      this.missionEndTimer = 4;
      this.world.people.removeRival();
      this.audio.blip(220, 0.3, 'triangle', 0.08);
    }

    this.lapTime += dt;
    this.districtTime += dt;
    const s = this.mode === 'drive' ? this.rover.s : this.human.s;
    const d = this.world.path.districtAt(s);
    if (d !== this.district) this.changeDistrict(d);
  }

  /** Player steering with sensitivity, smoothing and the optional centring assist. */
  private steering(dt: number): number {
    const o = this.options;
    const raw = clamp(this.input.steer() * o.steerSensitivity, -1, 1);
    const rate = 40 - o.steerSmoothing * 34;
    this.steerSmoothed += (raw - this.steerSmoothed) * Math.min(1, rate * dt);
    let steer = this.steerSmoothed;
    if (o.steerAssist > 0 && Math.abs(raw) < 0.05) {
      steer += clamp((-this.rover.x / 6) * o.steerAssist, -0.35, 0.35);
    }
    return clamp(steer, -1, 1);
  }

  /** AI cars and the Nine Arch train are solid: bump off them. */
  private collideWithTraffic(): void {
    const r = this.rover;
    const hits: { s: number; x: number; hl: number; hw: number }[] = [
      ...this.world.people.cars.map((c) => ({ s: c.ctrl.s, x: c.ctrl.x, hl: 2.2, hw: 1.1 })),
      ...this.world.decor.movers.map((m) => ({ s: m.s, x: m.x, hl: m.halfLength, hw: m.halfWidth })),
    ];
    for (const o of hits) {
      const ds = r.s - o.s;
      const dx = r.x - o.x;
      if (Math.abs(ds) < o.hl + 2.1 && Math.abs(dx) < o.hw + 1.1 && r.h < 2.5) {
        r.x = o.x + Math.sign(dx || 1) * (o.hw + 1.15);
        r.vx = Math.sign(dx || 1) * 4;
        if (ds < 0) r.v *= 0.85;
        this.audio.thud();
        this.rig.addShake(0.25);
        this.input.rumble(0.8, 180);
      }
    }
  }

  private checkMarkers(): void {
    const px = this.mode === 'drive' ? this.rover.x : this.human.x;
    const ps = this.mode === 'drive' ? this.rover.s : this.human.s;
    const ph = this.mode === 'drive' ? this.rover.h : this.human.h;
    for (const m of this.world.people.markers) {
      if (m.taken) continue;
      const visit = m.kind === 'visit';
      const near = Math.abs(m.s - ps) < (visit ? 4 : 2.6) && Math.abs(m.x - px) < (visit ? 4 : 2.2) && Math.abs(m.h - ph - 1) < 3.5;
      if (!near) continue;
      if (visit && this.mode !== 'foot') continue;
      m.taken = true;
      this.audio.chime(76);
      if (m.kind === 'stamp') this.missions.onStamp();
      else this.missions.onVisit();
    }
  }

  private checkRace(): void {
    const a = this.missions.active;
    if (a?.mission.kind !== 'race' || !this.missions.started || a.done || a.failed) return;
    const span = this.world.path.spanOf(a.mission.district ?? 0);
    const rival = this.world.people.rival;
    if (!span || !rival) return;
    if (this.rover.s >= span.end) this.missions.onRaceFinish(true);
    else if (rival.ctrl.s >= span.end) this.missions.onRaceFinish(false);
  }

  private changeDistrict(d: number): void {
    const defs = this.world.districts;
    const prev = defs[this.district];
    if (d === this.district + 1 && this.districtClean && this.mode === 'drive') {
      const t = this.districtTime;
      const key = `${this.world.chapter.id}:${prev.id}`;
      const bestT = this.profile.data.bestDistrict[key] ?? null;
      this.hud.showSplit(prev.name, t, bestT === null ? null : t - bestT);
      if (bestT === null || t < bestT) this.profile.data.bestDistrict[key] = t;
      this.missions.onSplit(this.district, t);
    }
    this.district = d;
    this.districtTime = 0;
    this.districtClean = this.mode === 'drive';
    this.missions.onEnterDistrict(d);
    this.showDistrict(d);
  }

  private showDistrict(d: number): void {
    const def = this.world.districts[d];
    if (this.state === 'play') this.hud.showDistrictTitle(def.kicker, def.name, def.poem);
    this.audio.setDistrict(def);
  }

  private finishLap(): void {
    this.pendingLap = false;
    if (this.state !== 'play') {
      this.resetDemo();
      return;
    }
    const lap = this.lapTime;
    const cid = this.world.chapter.id;
    const prevBest = this.profile.data.bestLap[cid] ?? null;
    if (prevBest === null || lap < prevBest) this.profile.data.bestLap[cid] = lap;
    this.profile.earn(25);
    this.hud.showLapBanner(prevBest === null || lap < prevBest ? `New best lap! ${lap.toFixed(2)}s` : `Lap ${this.lapNo} · ${lap.toFixed(2)}s`);
    this.lapNo++;
    const v = this.rover.v;
    this.rover.reset(8);
    this.rover.v = Math.max(v, this.rover.tuning.cruiseFloor);
    this.rover.cruise = true;
    this.lapTime = 0;
    this.districtTime = 0;
    this.district = 0;
    this.districtClean = true;
    this.world.items.resetLap();
    this.splash = 1;
    this.rig.snap();
    this.showDistrict(0);
  }

  private respawn(): void {
    const span = this.world.path.spanOf(this.district);
    const s = Math.max(8, (span?.start ?? 0) + 4);
    if (this.mode === 'foot') this.human.place(s, 0, 0);
    else {
      this.rover.reset(s);
      this.rover.v = this.rover.tuning.cruiseFloor;
      this.rover.cruise = true;
    }
    this.districtClean = false;
    this.splash = 1;
    this.rig.snap();
  }

  private onLand(air: number): void {
    this.audio.land(Math.min(1, air));
    if (this.state === 'play') this.input.rumble(Math.min(1, air * 0.5), 90);
    this.rig.addShake(Math.min(0.35, air * 0.2));
    if (this.state !== 'play') return;
    this.missions.onAir(air);
    if (air > 0.5) {
      const pts = Math.round(air * 20);
      this.score += pts * 10;
      this.popAtPawn(`AIR +${pts}`, 'good');
      this.borderPulse = Math.min(0.3, air * 0.15);
    }
  }

  private handleEvents(): void {
    const playing = this.state === 'play';
    for (const e of this.events) {
      switch (e.type) {
        case 'note': {
          const n = e.note!;
          this.audio.playNote(n.midi);
          this.rover.addBoost(0.04);
          if (!playing) break;
          this.songLog.push(n.midi);
          this.combo = Math.min(8, this.comboTimer > 0 ? this.combo + 1 : 1);
          this.comboTimer = 1.2;
          this.score += 10 * this.combo;
          this.profile.data.ink += 1;
          this.missions.onNote(n.district);
          break;
        }
        case 'sealed': {
          const air = this.mode === 'drive' && !this.rover.grounded;
          this.audio.chime(this.world.districts[e.phrase!.district].root + 12);
          if (!playing) break;
          this.score += air ? 400 : 200;
          this.profile.data.ink += 10;
          this.profile.markSealed(this.world.chapter.id, this.world.items.phrases.indexOf(e.phrase!));
          this.missions.onSeal();
          this.popAt(e.position, air ? `AIR ${this.rover.airTime.toFixed(1)}s · SEALED` : 'SEALED ✓', 'big');
          break;
        }
        case 'bolt':
          this.rover.boostMeter = 1;
          this.audio.whoosh();
          if (playing) this.popAt(e.position, 'THUNDER!', 'good');
          break;
        case 'tonic':
          this.tonics.set(e.tonic!, TONICS[e.tonic!].duration);
          this.audio.chime(60);
          if (playing) this.popAt(e.position, e.tonic === 'feather' ? 'FEATHER' : e.tonic === 'fizzy' ? 'FIZZY INK!' : 'MAGNET', 'good');
          break;
        case 'pad':
          this.rover.v = Math.max(this.rover.v, this.rover.tuning.topSpeed * 1.08);
          this.rover.addBoost(0.1);
          this.audio.whoosh();
          break;
        case 'ramp':
          this.rover.launch(8 + this.rover.v * 0.12);
          if (playing) this.popAt(e.position, 'RAMP!', 'info');
          break;
        case 'crate':
          this.audio.thud();
          this.rover.v *= 0.94;
          if (playing) this.popAt(e.position, 'CRASH', 'info');
          this.rig.addShake(0.2);
          break;
      }
    }
    this.events.length = 0;
  }

  // ————— frame loop —————

  private loop = (now: number): void => {
    requestAnimationFrame(this.loop);
    const cap = this.settings.fpsCap;
    if (cap > 0 && now - this.lastFrame < 1000 / cap - 2) return;
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.05;
    this.time += dt;
    this.renderer.info.reset();
    this.input.poll();
    this.handleGlobalInput(dt);

    if (this.state !== 'paused' && this.state !== 'loading') {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= SIM_DT && steps < 5) {
        if (this.state === 'play') this.simStep(SIM_DT);
        else this.demoStep(SIM_DT);
        this.accumulator -= SIM_DT;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;
      if (this.pendingLap) this.finishLap();
      this.handleEvents();
    }
    this.input.clearUnconsumed(['hop', 'interact']);
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.saveTimer = 5;
      this.profile.save();
    }
    this.render(dt, this.accumulator / SIM_DT);
  };

  /** Autopilot driving for the menu cinematic and the intro. */
  private demoStep(dt: number): void {
    if (this.showcaseTarget) {
      this.rover.prevS = this.rover.s;
      this.rover.prevX = this.rover.x;
      this.rover.prevH = this.rover.h;
      return;
    }
    const input = this.demo.drive(this.rover, this.world.items.notes, dt, this.world.people.obstacles());
    this.rover.step(dt, input);
    this.world.items.collect({ s: this.rover.s, x: this.rover.x, h: this.rover.h, radiusS: 2.4, radiusX: 1.9, magnet: false, driving: true }, this.events);
    this.world.people.step(dt, this.world.items.notes, this.rover.s, this.rover.x);
    const d = this.world.path.districtAt(this.rover.s);
    if (d !== this.district) {
      this.district = d;
      this.audio.setDistrict(this.world.districts[d]);
    }
  }

  private handleGlobalInput(dt: number): void {
    const inp = this.input;
    if (this.hud.chatOpen) {
      inp.clearUnconsumed();
      return;
    }
    if (this.hud.dialogOpen) {
      if (inp.consume('interact') || inp.consume('hop')) this.hud.closeDialog(true);
      if (inp.consume('pause')) this.hud.closeDialog(false);
      return;
    }
    if (this.state === 'intro') {
      if (inp.consume('hop') || inp.consume('pause') || inp.consume('interact')) this.director.skip();
      return;
    }
    if (this.state === 'menu') {
      if (inp.consume('pause')) {
        if (this.menu.screen !== 'main') this.menu.show('main');
        else if (this.resumeSnapshot) this.resumeFromMenu();
      }
      return;
    }
    if (inp.consume('studio')) this.studio.toggle();
    if (this.state !== 'play' && this.state !== 'paused') return;
    if (inp.consume('pause')) {
      if (this.mode === 'foot' && this.input.isPointerLocked) this.input.releasePointerLock();
      else this.togglePause();
    }
    if (inp.consume('hud')) {
      this.hudHidden = !this.hudHidden;
      this.hud.root.classList.toggle('hud-hidden', this.hudHidden);
    }
    for (let i = 0; i < TIME_PRESETS.length && i < 7; i++) if (inp.consume(`time${i + 1}` as 'time1')) this.env.setPreset(TIME_PRESETS[i].id);
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
    if (inp.consume('honk')) this.audio.honk(this.world.districts[this.district].root);
    if (inp.consume('respawn')) this.respawn();
    if (inp.consume('interact')) {
      const giver = this.nearbyGiver();
      if (giver) this.talkTo(giver);
      else if (this.mode === 'drive') this.exitRover();
      else this.enterRover();
    }
    if (inp.consume('photo')) {
      this.hudHidden = !this.hudHidden;
      this.hud.root.classList.toggle('hud-hidden', this.hudHidden);
    }
    if (inp.consume('drink')) this.drinkTonic();
    if (inp.consume('cycleTonic')) {
      const order: TonicId[] = ['magnet', 'feather', 'fizzy'];
      this.selectedTonic = order[(order.indexOf(this.selectedTonic) + 1) % order.length];
    }
    if (inp.consume('emote')) this.waveTimer = 2.2;
    if (inp.consume('chat') && this.net.connected) {
      this.input.releasePointerLock();
      this.hud.openChat((text) => {
        this.net.chat(text);
        this.hud.chatLine(this.profile.data.name, text);
      });
    }
    const look = inp.takeLook(dt);
    if (this.mode === 'foot') {
      this.rig.orbitYaw += look.dx * 0.0028;
      this.rig.orbitPitch = clamp(this.rig.orbitPitch + look.dy * 0.0022, -0.9, 1.25);
    }
  }

  private drinkTonic(): void {
    const t = this.selectedTonic;
    if (!this.profile.useTonic(t)) {
      this.popAtPawn('None left — buy tonics in the shop', 'info');
      return;
    }
    this.tonics.set(t, TONICS[t].duration);
    this.audio.chime(64);
    this.popAtPawn(`${TONICS[t].buff}!`, 'good');
  }

  private render(dt: number, alpha: number): void {
    const playing = this.state === 'play' || this.state === 'paused';
    const r = this.rover.lerpState(alpha);
    const path = this.world.path;
    const f = path.sample(r.s, this.frame);

    // Vehicle transform in the road frame.
    const vm = this.vehicle;
    const basis = _m.makeBasis(f.right, f.up, _v.copy(f.tangent).negate());
    vm.root.quaternion.setFromRotationMatrix(basis).multiply(_q.setFromAxisAngle(_y, -r.yaw));
    vm.root.position.copy(f.position).addScaledVector(f.right, r.x).addScaledVector(f.up, r.h + 0.02);
    const steer = this.mode === 'drive' && playing ? this.input.steer() : clamp(this.rover.vx * 0.1, -1, 1);
    for (const p of vm.steerPivots) p.rotation.y = -steer * 0.35;
    vm.roll(this.rover.v * dt);
    vm.body.position.y = -this.rover.squash * 0.18 + Math.sin(this.time * 18) * 0.012 * Math.min(1, this.rover.v / 20);
    vm.body.rotation.z = clamp(-this.rover.vx * 0.012, -0.08, 0.08);
    // Weight transfer: the nose dips under braking and lifts under power.
    vm.body.rotation.x = clamp(this.rover.longAccel * 0.0035, -0.06, 0.05) + (this.rover.boosting ? 0.02 : 0);
    vm.horn.scale.setScalar(1 + this.audio.beatPulse * 0.08);
    vm.antenna.rotation.x = Math.sin(this.time * 9) * 0.08 * Math.min(1, this.rover.v / 15) - this.rover.v * 0.003;
    vm.setBrakeLights(this.rover.braking);
    vm.setHeadlights(paintShared.uNight.value);

    let focus: THREE.Vector3 = vm.root.position;
    const cam = this.rig.camera;
    if (this.showcaseTarget === 'character') {
      // Stand beside the parked vehicle for the wardrobe.
      const hs = path.sample(r.s + 1.5, this.footFrame);
      const hb = _m.makeBasis(hs.right, hs.up, _v.copy(hs.tangent).negate());
      this.humanModel.root.quaternion.setFromRotationMatrix(hb).multiply(_q.setFromAxisAngle(_y, Math.PI * 0.85));
      this.humanModel.root.position.copy(hs.position).addScaledVector(hs.right, r.x - 3);
      this.humanModel.animate(dt, 'idle', 0, this.time);
      this.director.showcase = { target: this.humanModel.root.position.clone().addScaledVector(hs.up, 1.0), distance: 3.4, height: 0.4, up: hs.up.clone() };
      focus = this.humanModel.root.position;
    } else if (this.mode === 'foot') {
      const hs = this.human.lerpState(alpha);
      const hf = path.sample(hs.s, this.footFrame);
      const hb = _m.makeBasis(hf.right, hf.up, _v.copy(hf.tangent).negate());
      this.humanModel.root.quaternion.setFromRotationMatrix(hb).multiply(_q.setFromAxisAngle(_y, -hs.heading));
      this.humanModel.root.position.copy(hf.position).addScaledVector(hf.right, hs.x).addScaledVector(hf.up, hs.h);
      if (this.waveTimer > 0) this.waveTimer -= dt;
      this.humanModel.animate(dt, this.waveTimer > 0 && this.human.speed < 0.5 ? 'wave' : this.human.pose, this.human.speed, this.time);
      if (this.human.grounded && this.human.speed > 0.5) {
        this.footstepTimer -= dt * this.human.speed;
        if (this.footstepTimer <= 0) {
          this.audio.footstep();
          this.footstepTimer = 1.1;
        }
      }
      const eye = this.humanModel.head.getWorldPosition(new THREE.Vector3()).addScaledVector(hf.up, 0.25);
      if (playing) this.rig.updateFoot(dt, { s: hs.s, x: hs.x, h: hs.h, yaw: hs.heading, speed: this.human.speed, boosting: false, eye });
      focus = this.humanModel.root.position;
      const giver = this.nearbyGiver();
      const nearCar = Math.abs(this.human.s - this.rover.s) < 4 && Math.abs(this.human.x - this.rover.x) < 4;
      this.hud.setPrompt(giver ? `E · Talk to ${giver.giver.name}` : nearCar ? 'F · Get in' : null);
    } else {
      this.humanModel.animate(dt, vm.def.seatPose, 0, this.time);
      if (playing) {
        const eye = vm.seat.getWorldPosition(new THREE.Vector3()).addScaledVector(f.up, 0.9);
        this.rig.updateDrive(dt, { s: r.s, x: r.x, h: r.h, yaw: r.yaw, speed: this.rover.v, boosting: this.rover.boosting, eye });
      }
      this.hud.setPrompt(this.state === 'play' && Math.abs(this.rover.v) < 3 && this.lapTime > 2 ? 'F · Get out and walk' : null);
    }
    if (this.showcaseTarget === 'vehicle') {
      this.director.showcase = { target: vm.root.position.clone().addScaledVector(f.up, 1.2), distance: 7.5, height: 1.6, up: f.up.clone() };
    }
    if (!playing) {
      this.director.update(dt, this.time, { s: r.s, x: r.x, h: r.h, position: vm.root.position.clone() });
      if (this.state === 'intro') {
        this.hud.letterbox(true, this.director.currentLine ?? '');
        if (this.director.done) this.endIntro();
      }
    }

    // World.
    this.sky.position.copy(cam.position);
    this.env.update(dt, focus, cam, this.settings.reducedMotion || this.options.calmLighting);
    paintShared.uTime.value = this.time;
    skyUniforms.uTime.value = this.time;
    waterUniforms.uTime.value = this.time;
    this.world.decor.update(this.time, dt);
    const focusS = this.mode === 'foot' ? this.human.s : r.s;
    this.world.items.update(dt, this.time, focusS, f.up);
    this.world.people.update(dt, this.time, focusS, this.mode === 'foot' ? this.human.x : r.x, alpha);

    // Multiplayer.
    if (this.net.connected) {
      const st: PlayerState =
        this.mode === 'drive'
          ? { chapter: this.world.chapter.id, mode: 'drive', s: this.rover.s, x: this.rover.x, h: this.rover.h, yaw: this.rover.yaw, v: this.rover.v }
          : { chapter: this.world.chapter.id, mode: 'foot', s: this.human.s, x: this.human.x, h: this.human.h, yaw: this.human.heading, v: this.human.speed, pose: this.waveTimer > 0 ? 'wave' : undefined };
      this.net.update(dt, st, this.playerInfo());
      this.remotes.update(dt, this.time, this.net, path, this.world.chapter.id, cam);
      this.hud.setPlayers([...this.net.peers.values()].map((p) => p.info?.name ?? '…'), this.net.status);
    } else this.hud.setPlayers([], 'offline');

    this.audio.update(this.mode === 'drive' ? this.rover.v : this.human.speed, this.rover.boosting, this.mode === 'drive' && this.state !== 'paused', this.env.rain, focus.y, this.rover.handling === 'realistic' ? this.rover.rpm : undefined);
    this.updateHud(dt, f.up);

    this.splash = Math.max(0, this.splash - dt * 1.4);
    this.borderPulse = Math.max(0, this.borderPulse - dt * 0.8);
    const speedLines = this.mode === 'drive' && playing ? clamp((this.rover.v - 38) / 20, 0, 1) + (this.rover.boosting ? 0.6 : 0) : 0;
    this.updateHeadlights(vm, cam);
    // Depth of field: cinematics focus on what the director looks at.
    let dofAmount = 0;
    let dofFocus = 10;
    if (!playing && this.settings.cinematicDof > 0 && this.settings.realism > 0.2) {
      dofAmount = this.settings.cinematicDof * 0.8;
      dofFocus = cam.position.distanceTo(this.director.focusPoint);
    }
    // Short draw distances get thicker haze so the far plane never shows.
    const hazeBoost = Math.max(1, 3000 / this.settings.drawDistance);
    this.pipeline.render(this.scene, cam, dt, this.time, {
      fogColor: this.env.fogColor,
      rain: this.env.rain,
      speedLines: Math.min(1, speedLines),
      borderPulse: this.borderPulse + this.splash * 0.4,
      splash: this.splash * 0.8,
      sunDir: this.env.sunDirection,
      sunColor: this.env.sunColour,
      fogDensity: this.env.fogDensity * hazeBoost,
      flash: this.env.flash,
      dofFocus,
      dofAmount,
    });
  }

  /** Headlight cone for the shader, in view space: on after dusk and in murky weather. */
  private updateHeadlights(vm: VehicleModel, cam: THREE.PerspectiveCamera): void {
    const on = Math.max(clamp((paintShared.uNight.value - 0.3) / 0.5, 0, 1), this.env.grey > 0.2 ? 0.6 : 0);
    paintShared.uHeadOn.value = on;
    if (on <= 0) return;
    const fwd = _v.set(0, 0, -1).applyQuaternion(vm.root.quaternion);
    const up = _v2.set(0, 1, 0).applyQuaternion(vm.root.quaternion);
    paintShared.uHeadPos.value.copy(vm.root.position).addScaledVector(up, 0.9).addScaledVector(fwd, 2.3).applyMatrix4(cam.matrixWorldInverse);
    paintShared.uHeadDir.value.copy(fwd).addScaledVector(up, -0.12).normalize().transformDirection(cam.matrixWorldInverse);
  }

  private updateHud(dt: number, roadUp: THREE.Vector3): void {
    const hud = this.hud;
    hud.update(dt);
    const totals = this.world.items.totals();
    hud.setClock(this.env.clockText(), this.env.bandLabel(), this.env.presetId, this.env.auto, this.env.weatherLabel);
    hud.setStatus(totals.notes, totals.noteTotal, this.env.bandLabel(), this.settings.vibe);
    const st = this.audio.station;
    hud.setRadio(st.freq, st.name, `track ${String(this.audio.trackIndex + 1).padStart(2, '0')} / ${String(st.tracks).padStart(2, '0')}`, this.audio.trackProgress, this.audio.radioOn);
    if (this.state !== 'play' && this.state !== 'paused') return;
    const defs = this.world.districts;
    hud.setTimer(true, defs[this.district].name, this.districtTime, this.lapTime, this.profile.data.bestLap[this.world.chapter.id] ?? null, this.lapNo);
    hud.setScore(this.score, this.combo);
    hud.setInk(this.profile.data.ink);
    hud.setBag(this.profile.data.tonics, this.selectedTonic);
    hud.setMission(this.missions.active ? this.missions.statusText() : null);
    const s = this.mode === 'drive' ? this.rover.s : this.human.s;
    const current = this.world.items.notes.find((n) => n.s > s && !n.collected)?.phrase ?? this.world.items.phrases.length - 1;
    hud.setSongbook(this.world.items.phrases, current, totals.notes, totals.noteTotal, totals.sealed);
    const cam = this.rig.camera;
    const camRight = _v.set(1, 0, 0).applyQuaternion(cam.quaternion);
    const camUp = _v2.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const down = _v3.copy(roadUp).negate();
    const angle = (Math.atan2(down.dot(camRight), down.dot(camUp)) * 180) / Math.PI;
    const label = roadUp.y > 0.7 ? 'down is down' : roadUp.y < -0.7 ? 'upside down' : 'sideways';
    const kmh = this.mode === 'drive' ? this.rover.speedKmh : this.human.speed * 3.6;
    const gear = this.mode === 'drive' && this.rover.handling === 'realistic' ? `${this.rover.v < -0.3 ? 'R' : this.rover.gear} · ${Math.round(this.rover.rpm / 100) * 100} rpm` : undefined;
    hud.setSpeed(displaySpeed(kmh, this.options.units), this.rover.boostMeter, this.rover.boosting, defs[this.district].name, angle, label, this.mode === 'foot', this.options.units === 'mph' ? 'mph' : 'km/h', gear);
    hud.setTonics([...this.tonics].map(([id, t]) => ({ buff: TONICS[id].buff, drawback: TONICS[id].drawback, remaining: t, total: TONICS[id].duration })));
  }

  private popAt(world: THREE.Vector3, text: string, kind: 'good' | 'info' | 'big'): void {
    const p = world.clone().project(this.rig.camera);
    if (p.z > 1) return;
    const x = clamp((p.x * 0.5 + 0.5) * window.innerWidth, 80, window.innerWidth - 80);
    const y = clamp((-p.y * 0.5 + 0.5) * window.innerHeight - 30, 80, window.innerHeight - 180);
    this.hud.pop(text, x, y, kind);
  }

  private popAtPawn(text: string, kind: 'good' | 'info' | 'big'): void {
    const target = this.mode === 'drive' ? this.vehicle.root.position : this.humanModel.root.position;
    this.popAt(target.clone().addScaledVector(this.frame.up, 3), text, kind);
  }

  // ————— development hooks (tools/*.mjs) —————

  debugJump(s: number, preset?: string, weather?: string | boolean, chapter?: string): void {
    if (chapter && chapter !== this.world.chapter.id) this.play(chapter);
    if (this.state !== 'play') this.play(this.world.chapter.id);
    if (this.mode === 'foot') this.enterRover(true);
    this.rover.reset(s);
    this.rover.v = this.rover.tuning.cruiseFloor;
    this.rover.cruise = true;
    const d = this.world.path.districtAt(s);
    if (d !== this.district) this.changeDistrict(d);
    if (preset) this.env.setPreset(preset);
    if (weather !== undefined) this.env.setWeather(typeof weather === 'string' ? (weather as WeatherId) : weather ? 'rain' : 'clear');
    this.rig.snap();
  }

  /** Art style and graphics tier for screenshots (tools/screenshot.mjs STYLE=… QUALITY=…). */
  debugLook(style?: string, quality?: string): void {
    if (style) applyArtStyle(this.settings, style as ArtStyle);
    if (quality) applyQuality(this.settings, quality as QualityLevel);
    this.applySettings();
  }

  debugInfo(): Record<string, unknown> {
    return { state: this.state, chapter: this.world.chapter.id, s: this.rover.s, v: this.rover.v, mode: this.mode, district: this.district, fps: this.fps, calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, length: this.world.path.length, ink: this.profile.data.ink, mission: this.missions.statusText(), peers: this.net.peers.size };
  }

  debugWalk(): void {
    this.rover.v = 0;
    this.exitRover();
  }

  debugMenu(screen: string): void {
    if (this.state === 'splash') {
      this.unlockAudio();
      this.profile.data.seenIntro = true;
    }
    this.openMenu(screen as MenuScreen);
  }

  debugIntro(): void {
    this.startIntro();
  }

  debugMission(id: string): void {
    const m = MISSIONS.find((x) => x.id === id);
    if (m) this.startMissionFromMenu(m);
  }

  debugNet(room: string): void {
    this.net.connect(room, null, this.playerInfo());
  }

  debugChapter(id: string): void {
    this.loadChapter(id);
  }

  /** Film one landmark with the director's crane shot (menu background, no menu). */
  debugLandmark(chapter: string, index: number, preset?: string): string {
    this.loadChapter(chapter);
    this.state = 'menu';
    this.menu.show('none');
    this.hud.setPlaying(false);
    if (preset) this.env.setPreset(preset);
    this.director.script([{ kind: 'landmark', duration: 999, landmark: index }]);
    return this.world.decor.landmarks[index]?.name ?? '?';
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);
