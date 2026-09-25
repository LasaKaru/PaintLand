import * as THREE from 'three';
import { Input } from './Input';
import { displaySpeed, loadOptions, saveOptions, type GameOptions } from './Options';
import { clamp } from './MathUtil';
import { createFrame } from '../road/RoadPath';
import { PaintPipeline } from '../render/PaintPipeline';
import { PaintMaterial, paintShared, setWash } from '../render/PaintMaterial';
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
import { CATALOGUE, Profile } from '../gameplay/Profile';
import { CameraRig } from '../camera/CameraRig';
import { Director, type Shot } from '../camera/Director';
import { AudioEngine } from '../audio/AudioEngine';
import { Hud } from '../ui/Hud';
import { Studio } from '../ui/Studio';
import { Menu, type MenuScreen } from '../ui/Menu';
import { NetClient, type PlayerInfo, type PlayerState } from '../net/Net';
import { Particles } from '../render/Particles';
import { PhotoMode } from '../ui/PhotoMode';
import { GhostPlayer, GhostRecorder, loadGhost, saveGhost } from '../gameplay/Ghost';
import { checkTrophies } from '../gameplay/Trophies';
import { Wildlife } from '../world/Wildlife';
import { Hub, HUB_Y, type HubZone } from '../world/Hub';
import { City } from '../world/City';
import type { FreeRoamArea, StuntJump } from '../world/FreeRoamArea';
import { buildBeacon, buildChest, buildPaintPot } from '../models/CityProps';
import { openChest, RARITY_COLOURS, RARITY_NAMES } from '../gameplay/Loot';
import { CHAINS, CITY_MISSIONS, FreeMissionTracker, type MissionEvent } from '../gameplay/CityMissions';
import { districtProgress, inRect, type DistrictProgress, type Stroke } from '../gameplay/Restoration';
import { CHALLENGES, bumpStreak, challengeAmount, challengeProgress, ensureDaily } from '../gameplay/Challenges';
import { PHOTO_SUBJECTS, subjectsInFrame, type PhotoSubject } from '../gameplay/PhotoHunt';
import { MapView, type MapMarker, type MapState } from '../ui/MapView';
import { filterChat } from '../net/ChatFilter';
import { FreeCar, FreeWalker } from '../gameplay/FreeRoam';
import { TouchControls } from '../ui/TouchControls';
import { TRIAL_VERSION, TrialSim, encodeInputs, quantizeInput, type TrialConfig } from '../gameplay/TrialSim';
import { submitRun } from '../net/Leaderboard';
import { HUB_S_OFFSET } from '../net/RemotePlayers';
import { t, type StringKey } from './i18n';
import type { RoverInput } from '../gameplay/RoverController';
import type { RaceMessage } from '../net/Net';
import { RemotePlayers } from '../net/RemotePlayers';

type GameState = 'loading' | 'splash' | 'menu' | 'intro' | 'play' | 'paused' | 'photo' | 'hub';
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
  private readonly particles = new Particles();
  private readonly wildlife = new Wildlife();
  private readonly photo: PhotoMode;
  private readonly photoCam = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, anchor: new THREE.Vector3() };
  private readonly ghostRec = new GhostRecorder();
  private ghost: GhostPlayer | null = null;
  private ghostModel: VehicleModel | null = null;
  private lapClean = true;
  private statTimer = 0;
  private lastFx: import('../render/PaintPipeline').FrameFx | null = null;

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
  private resumeSnapshot: { s: number; x: number; v: number; mode: PawnMode; hs: number; hx: number; hub?: HubSpot } | null = null;
  // Harbour Town (free roam).
  private readonly areas = new Map<string, FreeRoamArea>();
  private area: FreeRoamArea | null = null;
  private inHub = false;
  private readonly freeMissions = new FreeMissionTracker();
  private readonly beacons: THREE.Mesh[] = [];
  private readonly pickupMaterial = new PaintMaterial({ vertexColors: true, flat: true });
  /** Sim speed in free roam (slow motion during stunt jumps). */
  private timeScale = 1;
  private stuntAir: StuntJump | null = null;
  private stuntCam = 0;
  // Milestone 8: Colour the City, map, daily brushstrokes, perahera.
  private readonly mapView: MapView;
  private readonly strokeCache = new Map<string, Stroke[]>();
  private districtCache: { area: string; seen: number; list: DistrictProgress[] } | null = null;
  private readonly washShown: number[] = [];
  private districtHere = '';
  private readonly fireworks: { x: number; z: number; y: number; vy: number; delay: number; whistle: boolean }[] = [];
  private readonly torches: THREE.Vector3[] = [];
  private discoverTimer = 0;
  private dailyTimer = 0;
  private peraheraTime = 0;
  private peraheraAnnounced = false;
  private peraheraFirework = 4;
  private pausedFrom: GameState = 'play';
  private readonly hubCar = new FreeCar({ ...tuningFor('rover') });
  private readonly hubWalker = new FreeWalker();
  private readonly hubCam = { yaw: 0, pitch: 0.3, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true };
  private hubZone: HubZone | null = null;
  private readonly touchUi: TouchControls;
  /** Ranked time trial in progress (inputs recorded for server re-simulation). */
  private trial: { sim: TrialSim; inputs: RoverInput[]; config: TrialConfig } | null = null;
  /** Live multiplayer race: everyone in the room runs the same trial lap. */
  private race: { id: string; chapter: string; results: Map<string, { name: string; time: number; verified?: boolean; me: boolean }>; finished: boolean } | null = null;
  private contextLost = false;
  private tipClock = 0;
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
    // The browser can drop the GPU context (driver reset, tab in the background on phones).
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.profile.save();
      this.hud?.notice('The graphics were reset by the browser — repainting…');
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => window.location.reload());

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
    this.touchUi = new TouchControls(container, this.input);
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
      enterHub: () => this.enterHub(undefined, 'harbour'),
      enterCity: () => this.enterHub(undefined, 'city'),
      startCityMission: (id) => this.startCityMission(id),
      cancelCityMission: () => this.freeMissions.cancel(),
      cityMission: () => this.freeMissions.mission?.id ?? null,
      uiSound: () => this.audio.uiClick(),
      startTrial: (id) => this.startTrial(id),
      startRace: (id) => this.startRaceForAll(id),
      handling: () => this.options.handling,
      unlockAudio: () => this.unlockAudio(),
      studio: () => this.settings,
      options: () => this.options,
      settingsChanged: () => this.settingsChanged(),
      input: () => this.input,
      stats: () => `${this.fps.toFixed(0)} fps · ${Math.round(this.pipeline.renderScale * 100)}% render scale · ${this.renderer.info.render.calls} draw calls · ${(this.renderer.info.render.triangles / 1e6).toFixed(2)} M triangles`,
      resume: () => this.resumeFromMenu(),
      canResume: () => this.resumeSnapshot !== null,
    });
    this.net.onChat = (name, text) => this.incomingChat(name, text);
    this.remotes.hidden = (name) => this.options.blocked.includes(name);
    this.mapView = new MapView(container);
    this.mapView.onTravel = (id) => this.fastTravel(id);
    this.mapView.onClose = () => this.closeMap();
    this.mapView.onOpen = () => this.openMap();
    this.net.onRace = (msg, from) => this.onRaceMessage(msg, from);
    this.photo = new PhotoMode(container, {
      studio: () => this.settings,
      studioChanged: () => this.settingsChanged(),
      setTime: (id) => this.env.setPreset(id),
      setWeather: (w) => this.env.setWeather(w),
      capture: (m) => this.capturePhoto(m),
      exit: () => this.exitPhoto(),
    });

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
      if ((this.state === 'play' || this.state === 'hub') && this.mode === 'foot') this.input.requestPointerLock();
    });
  }

  async init(): Promise<void> {
    const step = async (p: number, text: string): Promise<void> => {
      this.hud.setLoading(p, text);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    };
    await step(0.05, 'mixing paint…');
    this.sky = createSky();
    this.scene.add(this.sky, createWater(), this.particles.points, this.wildlife.group);
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
    this.particles.clear();
    this.wildlife.reset(this.world.path.sample(8, this.frame).position);
    this.loadGhostFor(chapter.id);
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
    return { name: this.profile.data.name, look: this.profile.data.look, vehicle: id, vlook: this.profile.vehicleLook(id), chapter: this.inHub ? (this.area?.id === 'city' ? 'city' : 'hub') : this.world.chapter.id };
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
    this.audio.ambienceVolume = s.ambience;
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
    if (room) {
      const clean = room.replace(/[^a-zA-Z0-9_-]/g, '');
      this.net.connect(clean, params.get('server'), this.playerInfo());
      this.hud.pop(t('mp.joining', { room: clean }), window.innerWidth / 2, window.innerHeight * 0.3, 'info');
    }
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
    this.endTrial();
    this.race = null;
    this.hud.raceBoard(null);
    if (this.inHub) {
      this.resumeSnapshot = { s: 8, x: 0, v: 0, mode: 'drive', hs: 0, hx: 0, hub: { x: this.hubCar.x, z: this.hubCar.z, heading: this.hubCar.heading, foot: this.mode === 'foot' ? { x: this.hubWalker.x, z: this.hubWalker.z } : null, area: this.area?.id } };
      this.hud.show('screenPause', false);
      this.input.releasePointerLock();
      void this.audio.ctx?.resume();
      this.leaveHub();
      if (this.mode === 'foot') {
        this.mode = 'drive';
        this.seatHuman();
      }
    } else if (this.state === 'play' || this.state === 'paused') {
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
    this.leaveHub();
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
    if (snap?.hub) {
      this.resumeSnapshot = null;
      this.enterHub(snap.hub);
      return;
    }
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
    this.ghostRec.reset();
    this.lapClean = true;
    this.ghost?.at(0);
  }

  private restartLap(): void {
    if (this.state === 'paused') this.togglePause();
    this.resetRun();
    this.splash = 1;
    this.showDistrict(0);
  }

  private togglePause(): void {
    if (this.state === 'play' || this.state === 'hub') {
      this.pausedFrom = this.state;
      this.state = 'paused';
      this.hud.show('screenPause', true);
      this.input.releasePointerLock();
      void this.audio.ctx?.suspend();
    } else if (this.state === 'paused') {
      this.state = this.pausedFrom;
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
      this.popAtPawn(t('prompt.slowDown'), 'info');
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
    this.audio.door();
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
    this.audio.door();
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
    this.particles.emit('confetti', this.vehicle.root.position.clone().addScaledVector(this.frame.up, 2), _v.copy(this.frame.up).multiplyScalar(7), 80, 7, this.frame.up);
    this.audio.chime(72);
    this.world.people.setGivers(this.world.missions, (id) => this.profile.data.missionsDone.includes(id));
    this.world.people.setMarkers(null, 0, 0);
    this.world.people.removeRival();
    this.missionEndTimer = 3;
  }

  // ————— simulation —————

  private simStep(dt: number): void {
    if (this.trial) {
      this.trialStep(dt);
      return;
    }
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
    if (this.mode === 'drive') this.ghostRec.record(this.lapTime, this.rover.s, this.rover.x, this.rover.h, this.rover.yaw);
    this.trackStats(dt);
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
        this.particles.emit('spark', this.vehicle.root.position.clone().addScaledVector(this.frame.up, 0.8), _v.copy(this.frame.up).multiplyScalar(3), 18, 6, this.frame.up);
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
    if (this.trial) return; // the trial sim decides when the lap ends
    if (this.state !== 'play') {
      this.resetDemo();
      return;
    }
    const lap = this.lapTime;
    const cid = this.world.chapter.id;
    const prevBest = this.profile.data.bestLap[cid] ?? null;
    if (prevBest === null || lap < prevBest) this.profile.data.bestLap[cid] = lap;
    this.profile.addStat('laps');
    if (this.rover.handling === 'realistic') this.profile.addStat('realLaps');
    if (this.ghost && this.lapClean && lap < this.ghost.run.time) this.profile.addStat('ghostBeaten');
    // Save the ghost when this clean lap beats the stored one.
    if (this.lapClean && this.ghostRec.length > 20 && (!this.ghost || lap < this.ghost.run.time)) {
      saveGhost(this.ghostRec.finish(cid, this.profile.data.vehicle, lap));
      this.loadGhostFor(cid);
    }
    this.ghostRec.reset();
    this.lapClean = true;
    this.checkTrophies();
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
    this.lapClean = false;
    this.splash = 1;
    this.rig.snap();
  }

  private onLand(air: number): void {
    this.audio.land(Math.min(1, air));
    if (this.state === 'play') this.input.rumble(Math.min(1, air * 0.5), 90);
    this.rig.addShake(Math.min(0.35, air * 0.2));
    if (air > 0.4) this.particles.emit('dust', this.vehicle.root.position, _v.copy(this.frame.up).multiplyScalar(1.5), Math.min(30, air * 14), 3, this.frame.up);
    if (this.state !== 'play') return;
    this.profile.recordStat('maxAir', air);
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
          if (!this.trial) this.rover.addBoost(0.04);
          if (!playing) break;
          this.songLog.push(n.midi);
          this.combo = Math.min(8, this.comboTimer > 0 ? this.combo + 1 : 1);
          this.comboTimer = 1.2;
          this.score += 10 * this.combo;
          this.profile.data.ink += 1;
          this.missions.onNote(n.district);
          this.profile.addStat('notes');
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
          this.particles.emit('confetti', e.position, _v.copy(this.frame.up).multiplyScalar(5), 30, 5, this.frame.up);
          break;
        }
        case 'bolt':
          if (!this.trial) this.rover.boostMeter = 1;
          this.audio.whoosh();
          if (playing) this.popAt(e.position, 'THUNDER!', 'good');
          break;
        case 'tonic':
          if (this.trial) break;
          this.tonics.set(e.tonic!, TONICS[e.tonic!].duration);
          this.audio.chime(60);
          if (playing) this.popAt(e.position, e.tonic === 'feather' ? 'FEATHER' : e.tonic === 'fizzy' ? 'FIZZY INK!' : 'MAGNET', 'good');
          break;
        case 'pad':
          if (this.trial) {
            this.audio.whoosh();
            break;
          }
          this.rover.v = Math.max(this.rover.v, this.rover.tuning.topSpeed * 1.08);
          this.rover.addBoost(0.1);
          this.audio.whoosh();
          break;
        case 'ramp':
          if (!this.trial) this.rover.launch(8 + this.rover.v * 0.12);
          if (playing) this.popAt(e.position, 'RAMP!', 'info');
          break;
        case 'crate':
          this.audio.thud();
          if (!this.trial) this.rover.v *= 0.94;
          if (playing) this.popAt(e.position, 'CRASH', 'info');
          this.rig.addShake(0.2);
          this.particles.emit('spark', e.position, _v.copy(this.frame.up).multiplyScalar(4), 24, 7, this.frame.up);
          this.input.rumble(0.7, 150);
          break;
      }
    }
    this.events.length = 0;
  }

  // ————— frame loop —————

  private loop = (now: number): void => {
    requestAnimationFrame(this.loop);
    if (this.contextLost) return;
    const cap = this.settings.fpsCap;
    if (cap > 0 && now - this.lastFrame < 1000 / cap - 2) return;
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.05;
    this.time += dt;
    this.renderer.info.reset();
    this.input.poll();
    this.handleGlobalInput(dt);

    if (this.state !== 'paused' && this.state !== 'loading' && this.state !== 'photo' && !this.mapView.open) {
      this.accumulator += this.state === 'hub' ? dt * this.timeScale : dt;
      let steps = 0;
      while (this.accumulator >= SIM_DT && steps < 5) {
        if (this.state === 'play') this.simStep(SIM_DT);
        else if (this.state === 'hub') this.hubStep(SIM_DT);
        else this.demoStep(SIM_DT);
        this.accumulator -= SIM_DT;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;
      if (this.pendingLap) this.finishLap();
      this.handleEvents();
    }
    this.input.clearUnconsumed(['hop', 'interact']);
    this.touchUi.setVisible(this.state === 'play' || this.state === 'hub');
    if (this.state === 'play' || this.state === 'hub') this.onboarding(dt);
    this.dailyTimer -= dt;
    if (this.dailyTimer <= 0 && (this.state === 'play' || this.state === 'hub')) {
      this.dailyTimer = 1;
      this.updateDaily();
    }
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
    if (this.state === 'photo') {
      if (inp.consume('pause') || inp.consume('photo')) this.exitPhoto();
      return;
    }
    if (inp.consume('studio')) this.studio.toggle();
    if (this.mapView.open) {
      if (inp.consume('map') || inp.consume('pause')) this.closeMap();
      inp.takeLook(dt);
      inp.clearUnconsumed();
      return;
    }
    if (this.state !== 'play' && this.state !== 'paused' && this.state !== 'hub') return;
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
    if (this.state === 'hub') {
      this.hubInput(dt);
      return;
    }
    if (this.state !== 'play') return;

    if (inp.consume('camera')) this.cycleCamera();
    if (inp.consume('honk')) this.audio.honk(this.world.districts[this.district].root);
    if (inp.consume('respawn')) {
      if (this.trial) this.startTrial(this.world.chapter.id);
      else this.respawn();
    }
    if (inp.consume('interact')) {
      const giver = this.nearbyGiver();
      if (giver) this.talkTo(giver);
      else if (this.mode === 'drive') this.exitRover();
      else this.enterRover();
    }
    if (inp.consume('photo')) {
      this.enterPhoto();
      return;
    }
    if (inp.consume('drink')) this.drinkTonic();
    if (inp.consume('cycleTonic')) {
      const order: TonicId[] = ['magnet', 'feather', 'fizzy'];
      this.selectedTonic = order[(order.indexOf(this.selectedTonic) + 1) % order.length];
    }
    if (inp.consume('emote')) this.waveTimer = 2.2;
    if (inp.consume('chat') && this.net.connected && this.options.chat !== 'off') {
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
    if (this.inHub && (this.state === 'hub' || this.state === 'paused' || this.state === 'photo')) {
      this.renderHub(dt, alpha);
      return;
    }
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
      this.hud.setPrompt(giver ? t('prompt.talk', { name: giver.giver.name }) : nearCar ? t('prompt.getIn') : null);
    } else {
      this.humanModel.animate(dt, vm.def.seatPose, 0, this.time);
      if (playing) {
        const eye = vm.seat.getWorldPosition(new THREE.Vector3()).addScaledVector(f.up, 0.9);
        this.rig.updateDrive(dt, { s: r.s, x: r.x, h: r.h, yaw: r.yaw, speed: this.rover.v, boosting: this.rover.boosting, eye });
      }
      this.hud.setPrompt(this.state === 'play' && Math.abs(this.rover.v) < 3 && this.lapTime > 2 ? t('prompt.getOut') : null);
    }
    if (this.showcaseTarget === 'vehicle') {
      this.director.showcase = { target: vm.root.position.clone().addScaledVector(f.up, 1.2), distance: 7.5, height: 1.6, up: f.up.clone() };
    }
    if (this.state === 'photo') {
      this.updatePhotoCamera(dt);
    } else if (!playing) {
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
    this.updateGhost();
    if (this.state !== 'photo') {
      this.emitParticles(dt);
      // Fireflies after dark, drifting around the player.
      if (paintShared.uNight.value > 0.6) this.particles.emit('firefly', _v.copy(focus).addScaledVector(this.frame.up, 1.5 + Math.random() * 3).add(_v2.set((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40)), _v3.set(0, 0.2, 0), 6 * dt, 1);
      this.particles.update(dt, this.pipeline.size.height, cam);
      this.wildlife.update(dt, this.time, focus, paintShared.uNight.value);
    }

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
    const dstyle = this.world.districts[this.district]?.style ?? '';
    this.audio.setAmbience({
      night: paintShared.uNight.value,
      rain: this.env.rain,
      nature: /tea|jungle|sigiriya|machu|beach|ella|park|garden|coil|petal/.test(dstyle) ? 0.9 : 0.45,
      coast: clamp(1 - Math.max(0, focus.y - 3) / 45, 0, 1) * (/beach|galleface|coil|lighthouse|spiral/.test(dstyle) ? 1 : 0.5),
      city: /street|town|galleface|lotus|colosseum/.test(dstyle) ? 0.6 : 0.1,
    });
    this.audioFrame(this.mode === 'drive' && playing, this.rover.v, this.rover.boosting, this.mode === 'drive' && playing ? this.input.throttle() : 0, this.mode === 'drive' && (this.rover.sliding || this.rover.drifting) && this.rover.grounded ? 1 : 0);
    this.updateHud(dt, f.up);

    this.splash = Math.max(0, this.splash - dt * 1.4);
    this.borderPulse = Math.max(0, this.borderPulse - dt * 0.8);
    const speedLines = this.mode === 'drive' && playing ? clamp((this.rover.v - 38) / 20, 0, 1) + (this.rover.boosting ? 0.6 : 0) : 0;
    this.updateHeadlights(vm, cam);
    // Depth of field: cinematics focus on what the director looks at.
    let dofAmount = 0;
    let dofFocus = 10;
    if (this.state === 'photo') {
      const ps = this.photo.state;
      dofAmount = ps.blur;
      if (ps.autoFocus) {
        // Focus on whatever is under the centre of the frame (the player, or 30 m ahead).
        const target = this.photo.state.hidePlayer ? cam.position.clone().addScaledVector(cam.getWorldDirection(_v), 30) : focus;
        ps.focus = cam.position.distanceTo(target);
        this.photo.showFocus(ps.focus);
      }
      dofFocus = ps.focus;
    } else if (!playing && this.settings.cinematicDof > 0 && this.settings.realism > 0.2) {
      dofAmount = this.settings.cinematicDof * 0.8;
      dofFocus = cam.position.distanceTo(this.director.focusPoint);
    }
    // Short draw distances get thicker haze so the far plane never shows.
    const hazeBoost = Math.max(1, 3000 / this.settings.drawDistance);
    this.lastFx = {
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
    };
    this.pipeline.render(this.scene, cam, dt, this.time, this.lastFx);
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
    const racing = this.trial && this.race && !this.race.finished ? this.racePosition() : null;
    hud.setMission(racing ? `🏁 ${t('race.position', racing)} · ${this.trial!.sim.time.toFixed(2)} s` : this.trial ? `⏱ ${t('title.trials')} · ${this.trial.config.handling} · ${this.trial.sim.time.toFixed(2)} s · R` : this.missions.active ? this.missions.statusText() : null);
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

  // ————— ranked time trials —————

  private startTrial(chapterId: string, countdown = 3.2): void {
    this.endTrial();
    this.play(chapterId);
    this.missions.cancel();
    this.world.people.removeRival();
    this.world.people.trafficEnabled = false;
    this.tonics.clear();
    const o = this.options;
    const config: TrialConfig = { chapter: chapterId, vehicle: this.profile.data.vehicle, handling: o.handling, gearbox: o.gearbox, autoCruise: o.autoCruise };
    const sim = new TrialSim(this.rover, this.world.items, this.world.path);
    sim.start(config);
    this.trial = { sim, inputs: [], config };
    this.lapTime = 0;
    this.districtTime = 0;
    this.lapClean = true;
    this.ghostRec.reset();
    this.raceCountdown = countdown;
    this.rig.snap();
  }

  private endTrial(): void {
    if (!this.trial) return;
    this.trial = null;
    this.world.people.trafficEnabled = true;
    this.raceCountdown = 0;
  }

  private trialStep(dt: number): void {
    const trial = this.trial!;
    const inp = this.input;
    if (this.raceCountdown > 0) {
      const before = Math.ceil(this.raceCountdown);
      this.raceCountdown -= dt;
      const n = Math.ceil(this.raceCountdown);
      if (n !== before) {
        this.hud.pop(n > 0 ? String(n) : 'GO!', window.innerWidth / 2, window.innerHeight * 0.4, 'big');
        this.audio.chime(n > 0 ? 60 : 72);
      }
      inp.consume('hop');
      this.rover.prevS = this.rover.s;
      this.rover.prevX = this.rover.x;
      this.rover.prevH = this.rover.h;
      this.rover.prevYaw = this.rover.yaw;
      return;
    }
    const input = quantizeInput({ throttle: inp.throttle(), brake: inp.brake(), steer: this.steering(dt), hop: inp.consume('hop'), boost: inp.held('boost'), drift: inp.held('drift'), shiftUp: inp.consume('shiftUp'), shiftDown: inp.consume('shiftDown') });
    trial.inputs.push(input);
    trial.sim.step(input);
    this.events.push(...trial.sim.events);
    trial.sim.events.length = 0;
    this.lapTime = trial.sim.time;
    this.districtTime += dt;
    this.ghostRec.record(this.lapTime, this.rover.s, this.rover.x, this.rover.h, this.rover.yaw);
    this.trackStats(dt);
    this.stepRivals(dt);
    const d = this.world.path.districtAt(this.rover.s);
    if (d !== this.district) this.changeDistrict(d);
    if (trial.sim.finished) this.finishTrial();
  }

  /** Only race rivals move during a trial (none by default); traffic is parked. */
  private stepRivals(dt: number): void {
    this.world.people.step(dt, this.world.items.notes, this.rover.s, this.rover.x);
  }

  private finishTrial(): void {
    const trial = this.trial!;
    const time = trial.sim.time;
    if (this.race && !this.race.finished && this.race.chapter === trial.config.chapter) {
      this.finishRace(trial, time);
      return;
    }
    const cfg = trial.config;
    const key = `${cfg.chapter}:${cfg.handling}`;
    const prev = this.profile.data.trialBest[key] ?? null;
    const best = prev === null || time < prev;
    if (best) this.profile.data.trialBest[key] = time;
    this.profile.addStat('laps');
    this.profile.addStat('trials');
    if (cfg.handling === 'realistic') this.profile.addStat('realLaps');
    if (this.ghost && time < this.ghost.run.time) this.profile.addStat('ghostBeaten');
    if (!this.ghost || time < this.ghost.run.time) {
      saveGhost(this.ghostRec.finish(cfg.chapter, cfg.vehicle, time));
      this.loadGhostFor(cfg.chapter);
    }
    this.profile.save();
    this.checkTrophies();
    const run = { ...cfg, name: this.profile.data.name, time, inputs: encodeInputs(trial.inputs), version: TRIAL_VERSION };
    this.endTrial();
    this.hud.showLapBanner(t('trial.checking', { time: time.toFixed(2), extra: best ? t('trial.pb') : prev !== null ? ` · best ${prev.toFixed(2)}s` : '' }));
    this.audio.chime(76);
    this.particles.emit('confetti', this.vehicle.root.position.clone().addScaledVector(this.frame.up, 2), _v.copy(this.frame.up).multiplyScalar(7), 70, 7, this.frame.up);
    void submitRun(run).then((res) => {
      if (!res) this.hud.showLapBanner(t('trial.offline', { time: time.toFixed(2) }));
      else if (res.ok) this.hud.showLapBanner(res.best === false ? `✓ ${time.toFixed(2)}s · your best still stands` : t('trial.verified', { rank: res.rank ?? '—' }));
      else this.hud.showLapBanner(`Server did not accept the run: ${res.reason ?? 'unknown'}`);
    });
    // Roll on in free play.
    this.rover.reset(8);
    this.rover.v = this.rover.tuning.cruiseFloor;
    this.rover.cruise = true;
    this.lapTime = 0;
    this.districtTime = 0;
    this.district = 0;
    this.world.items.resetLap();
    this.ghostRec.reset();
    this.splash = 1;
    this.rig.snap();
    this.showDistrict(0);
  }

  // ————— live races —————

  /** Anyone in a room can start a race: everyone gets the same chapter and countdown. */
  private startRaceForAll(chapterId: string): void {
    if (!this.net.connected) {
      this.menu.toast(t('race.needRoom'));
      return;
    }
    const msg: RaceMessage = { t: 'race', a: 'start', race: `${this.net.id}-${Date.now().toString(36)}`, chapter: chapterId, delay: 6000 };
    this.net.sendRace(msg);
    this.onRaceMessage(msg, this.profile.data.name);
  }

  private onRaceMessage(msg: RaceMessage, from: string | null): void {
    if (msg.a === 'start') {
      if (!this.world || !chapterById(msg.chapter)) return;
      this.race = { id: msg.race, chapter: msg.chapter, results: new Map(), finished: false };
      this.hud.raceBoard(null);
      this.startTrial(msg.chapter, msg.delay / 1000);
      this.hud.showLapBanner(`🏁 ${t('race.title')} · ${from ?? ''}`);
      return;
    }
    const race = this.race;
    if (!race || msg.race !== race.id) return;
    if (msg.a === 'finish') {
      race.results.set(msg.name + (msg.id ?? ''), { name: msg.name, time: msg.time, verified: msg.verified, me: false });
      this.hud.chatLine('🏁', t('race.finished', { name: msg.name, time: msg.time.toFixed(2) }));
      this.showRaceBoard();
    } else if (msg.a === 'verdict') {
      const mine = [...race.results.values()].find((r) => r.me);
      if (mine) {
        mine.verified = msg.ok;
        if (msg.ok && msg.time !== undefined) mine.time = msg.time;
      }
      this.showRaceBoard();
    }
  }

  private finishRace(trial: { inputs: RoverInput[]; config: TrialConfig }, time: number): void {
    const race = this.race!;
    race.finished = true;
    const name = this.profile.data.name;
    race.results.set('me', { name, time, me: true });
    const run = { ...trial.config, name, time, inputs: encodeInputs(trial.inputs), version: TRIAL_VERSION };
    this.net.sendRace({ t: 'race', a: 'finish', race: race.id, name, time, run });
    this.profile.addStat('races');
    this.endTrial();
    this.hud.showLapBanner(t('race.finished', { name, time: time.toFixed(2) }));
    this.audio.chime(76);
    this.particles.emit('confetti', this.vehicle.root.position.clone().addScaledVector(this.frame.up, 2), _v.copy(this.frame.up).multiplyScalar(7), 70, 7, this.frame.up);
    this.showRaceBoard();
    this.rover.v = Math.min(this.rover.v, 12);
    this.rover.cruise = false;
  }

  private showRaceBoard(): void {
    const race = this.race;
    if (!race) return;
    const rows = [...race.results.values()].sort((a, b) => a.time - b.time).map((r) => {
      const mark = r.verified === true ? ` <small>✓ ${t('race.verified')}</small>` : r.verified === false ? ' <small>?</small>' : '';
      return `${r.me ? '<u>' : ''}${escapeHtml(r.name)}${r.me ? '</u>' : ''} — ${r.time.toFixed(2)}s${mark}`;
    });
    const waiting = race.finished && this.racersInRoom() > race.results.size ? [`<small>${t('race.waiting')}</small>`] : [];
    this.hud.raceBoard(`🏁 ${t('race.results')}`, [...rows, ...waiting]);
  }

  /** Players in this race's chapter (including us). */
  private racersInRoom(): number {
    if (!this.race) return 1;
    return 1 + [...this.net.peers.values()].filter((p) => p.info?.chapter === this.race!.chapter).length;
  }

  /** Live position: peers further along the lap (or already finished) are ahead. */
  private racePosition(): { pos: number; total: number } {
    const race = this.race!;
    let ahead = [...race.results.values()].filter((r) => !r.me).length;
    for (const peer of this.net.peers.values()) {
      if (peer.info?.chapter !== race.chapter) continue;
      if ([...race.results.values()].some((r) => r.name === peer.info?.name)) continue;
      const snap = this.net.sample(peer);
      if (snap && snap.chapter === race.chapter && snap.s > this.rover.s) ahead++;
    }
    return { pos: ahead + 1, total: this.racersInRoom() };
  }

  debugRace(chapter: string): void {
    this.startRaceForAll(chapter);
  }

  debugTrial(chapter: string): void {
    if (this.state === 'splash') this.profile.data.seenIntro = true;
    this.startTrial(chapter);
  }

  // ————— audio mix —————

  private wasBoosting = false;

  /** Music intensity and muffling, engine load, tyre screech, boost ignition. */
  private audioFrame(driving: boolean, speed: number, boosting: boolean, throttle: number, screech: number): void {
    const a = this.audio;
    const target = this.state === 'menu' || this.state === 'intro' ? 0.2 : clamp(Math.abs(speed) / 45 + (boosting ? 0.35 : 0) + (this.race && !this.race.finished ? 0.3 : 0), 0, 1);
    a.intensity += (target - a.intensity) * 0.03;
    a.musicOpen = this.state === 'paused' ? 0.15 : this.state === 'menu' || this.state === 'photo' ? 0.45 : 1;
    a.vehicleExtras(driving ? throttle : 0, driving ? screech : 0, Math.abs(speed));
    if (boosting && !this.wasBoosting) a.boostStart();
    this.wasBoosting = boosting;
  }

  // ————— onboarding —————

  /** First-time tips, each shown once per profile (docs/10 §8). */
  private onboarding(dt: number): void {
    this.tipClock += dt;
    if (this.tipClock < 1.5) return;
    const touch = document.documentElement.classList.contains('touch-ui');
    const p = this.profile;
    const tip = (id: string, text: string): boolean => {
      if (!p.markSeen(`tip:${id}`)) return false;
      this.hud.tip(text, 6, t('tip.label'));
      this.tipClock = -5; // space tips out
      p.save();
      return true;
    };
    if (this.state === 'hub') {
      if (tip('hub', touch ? t('tip.hubTouch') : t('tip.hub'))) return;
      if (tip('map', t('tip.map'))) return;
      if (this.area?.id === 'city' && !tip('city', t('tip.city'))) tip('sketch', t('tip.sketch'));
      return;
    }
    const r = this.rover;
    if (tip('drive', touch ? t('tip.driveTouch') : t('tip.drive'))) return;
    if (this.mode === 'drive' && r.v > 15 && tip('notes', t('tip.notes'))) return;
    if (this.mode === 'drive' && r.v > 20 && this.lapTime > 20 && tip('hop', t('tip.hop', { key: touch ? 'HOP' : 'Space' }))) return;
    if (r.boostMeter > 0.6 && tip('boost', t('tip.boost', { key: touch ? 'BOOST' : 'Shift' }))) return;
    if (this.frame.up.y < 0.3 && tip('gravity', t('tip.gravity'))) return;
    if (this.lapTime > 60 && tip('walk', t('tip.walk', { key: touch ? 'E' : 'F' }))) return;
    if (this.lapTime > 90) tip('settings', t('tip.settings'));
  }

  // ————— free roam: Harbour Town and Serendib City —————

  /** Build an area the first time it is visited. */
  private areaFor(id: string): FreeRoamArea {
    let area = this.areas.get(id);
    if (area) return area;
    area = id === 'city' ? new City(this.hud.labels) : new Hub(this.hud.labels);
    this.scene.add(area.group);
    area.show(false);
    // Areas without their own pickup models get painted pots and chests.
    for (const s of area.secrets) {
      if (s.mesh) continue;
      s.mesh = new THREE.Mesh(buildPaintPot(), this.pickupMaterial);
      s.mesh.position.set(s.x, s.y, s.z);
      area.group.add(s.mesh);
    }
    for (const c of area.chests) {
      if (c.mesh) continue;
      c.mesh = new THREE.Mesh(buildChest(c.tier), this.pickupMaterial);
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.castShadow = true;
      area.group.add(c.mesh);
    }
    this.areas.set(id, area);
    return area;
  }

  /** Hide pots already found and chests already opened today. */
  private refreshPickups(area: FreeRoamArea): void {
    const seen = this.profile.data.seen;
    for (const s of area.secrets) if (s.mesh) s.mesh.visible = !seen.includes(`secret:${s.id}`);
    const day = todayKey();
    for (const c of area.chests) if (c.mesh) c.mesh.visible = !seen.includes(`chest:${c.id}:${day}`);
  }

  private enterHub(at?: HubSpot, areaId?: string): void {
    const id = areaId ?? at?.area ?? this.area?.id ?? 'harbour';
    if (this.area && this.area.id !== id) this.area.show(false);
    const area = this.areaFor(id);
    this.area = area;
    this.menu.show('none');
    this.setShowcase(null);
    this.hud.letterbox(false);
    this.hud.show('screenPause', false);
    this.resumeSnapshot = null;
    this.missions.cancel();
    this.world.people.removeRival();
    this.world.group.visible = false;
    this.rover.v = 0;
    if (this.ghostModel) this.ghostModel.root.visible = false;
    area.show(true);
    this.refreshPickups(area);
    this.inHub = true;
    this.state = 'hub';
    this.hud.setPlaying(true);
    this.hud.setHub(true);
    this.hubCar.tuning = tuningFor(this.profile.data.vehicle);
    this.wireCarEvents();
    const sp = area.spawn;
    this.hubCar.place(at?.x ?? sp.x, at?.z ?? sp.z, at?.heading ?? sp.heading);
    this.mode = 'drive';
    if (at?.foot) {
      this.mode = 'foot';
      this.hubWalker.place(at.foot.x, at.foot.z, 0);
    }
    this.seatHuman();
    this.updateHeadVisibility();
    this.hubCam.snap = true;
    this.hubCam.yaw = this.hubCar.heading;
    this.particles.clear();
    this.wildlife.reset(new THREE.Vector3(sp.x, HUB_Y, sp.z));
    this.unlockAudio();
    const title = area.title();
    this.hud.showDistrictTitle(title.kicker, title.name, title.poem);
    this.profile.markSeen(id === 'harbour' ? 'hub' : `area:${id}`);
    this.timeScale = 1;
    this.stuntAir = null;
    this.remotes.clear();
    if (this.net.connected) this.net.sendHello(this.playerInfo());
  }

  /** Drive (or walk) through a road sign to another area. */
  private travelTo(areaId: string): void {
    if (this.area?.id === areaId) return;
    this.freeMissions.cancel();
    this.splash = 1;
    this.audio.whoosh();
    this.enterHub(undefined, areaId);
  }

  /** Hide the area and show the chapter world again (portals, menu, play). */
  private leaveHub(): void {
    if (!this.inHub) return;
    this.inHub = false;
    this.area?.show(false);
    this.world.group.visible = true;
    this.hud.setHub(false);
    this.hud.setPrompt(null);
    this.hud.objective(null);
    this.hud.compass(null);
    this.hud.counter(null);
    for (const b of this.beacons) b.visible = false;
    this.mapView.show(false);
    this.mapView.showMini(false);
    this.audio.festival = 0;
    setWash([], []);
    this.districtHere = '';
    this.timeScale = 1;
    this.remotes.clear();
    if (this.net.connected) this.net.sendHello(this.playerInfo());
    if (this.state === 'hub') this.state = 'menu';
  }

  /** Mini-turbos, boost pads and stunt jumps talk back through the car. */
  private wireCarEvents(): void {
    const car = this.hubCar;
    car.onMiniTurbo = (charge) => {
      this.audio.boostStart();
      this.popAtPawn(charge > 0.9 ? t('fun.superTurbo') : t('fun.miniTurbo'), 'good');
      this.profile.addStat('miniTurbos');
    };
    car.onPad = () => {
      this.audio.boostStart();
      this.splash = Math.max(this.splash, 0.35);
    };
    car.onRamp = (ramp) => {
      const stunt = this.area?.stunts.find((s) => s.ramp === ramp) ?? null;
      this.stuntAir = stunt;
      if (stunt) this.popAtPawn(`${stunt.name}!`, 'info');
    };
    car.onLand = (air) => {
      this.timeScale = 1;
      const stunt = this.stuntAir;
      this.stuntAir = null;
      this.profile.recordStat('bestAir', air);
      if (!stunt) {
        if (air > 0.8) this.popAtPawn(t('fun.air', { s: air.toFixed(1) }), 'info');
        return;
      }
      const d = Math.hypot(car.x - stunt.land.x, car.z - stunt.land.z);
      if (d > stunt.land.r) {
        this.popAtPawn(t('fun.missed'), 'info');
        return;
      }
      const first = this.profile.markSeen(`stunt:${stunt.id}`);
      const ink = first ? 150 : 25;
      this.profile.earn(ink);
      this.profile.addStat('stunts');
      this.audio.secret();
      this.audio.cheer();
      this.splash = 1;
      this.hud.lootCard(t('fun.stunt'), '#f4d23b', stunt.name, `+${ink} ink${first ? ` · ${t('fun.firstTime')}` : ''}`);
      this.missionEvents(this.freeMissions.onStunt(stunt.id));
    };
  }

  private hubStep(dt: number): void {
    const inp = this.input;
    const area = this.area!;
    // Traffic and people are solid.
    const bodies = area.dynamicBodies();
    for (const b of bodies) area.world.colliders.push({ type: 'circle', x: b.x, z: b.z, r: b.r });
    if (this.mode === 'drive') {
      const steer = clamp(inp.steer() * this.options.steerSensitivity, -1, 1);
      const v0 = this.hubCar.v;
      this.hubCar.step(dt, { throttle: inp.throttle(), brake: inp.brake(), steer, hop: inp.consume('hop'), boost: inp.held('boost'), drift: inp.held('drift') }, area.world);
      if (Math.abs(v0) > 9 && Math.abs(this.hubCar.v) < Math.abs(v0) * 0.6) {
        this.audio.bump();
        this.splash = Math.max(this.splash, 0.3);
      }
      this.profile.addStat('distance', Math.abs(this.hubCar.v) * dt);
      if (this.hubCar.drifting) this.profile.addStat('driftTime', dt);
      // Slow motion on the way down from a stunt ramp.
      this.timeScale = this.stuntAir && !this.hubCar.grounded && this.hubCar.airTime > 0.25 && !this.settings.reducedMotion ? 0.45 : 1;
    } else {
      // The parked car is solid while walking.
      area.world.colliders.push({ type: 'circle', x: this.hubCar.x, z: this.hubCar.z, r: 1.4 });
      const move = inp.moveAxes();
      this.hubWalker.step(dt, { moveX: move.x, moveY: move.y, cameraYaw: this.hubCam.yaw, sprint: inp.held('sprint'), walk: inp.held('crouch'), jump: inp.consume('hop'), faceCamera: false }, area.world);
      area.world.colliders.pop();
    }
    area.world.colliders.length -= bodies.length;
    const p = this.mode === 'foot' ? this.hubWalker : this.hubCar;
    // Drive into a painted gate to enter its chapter, or a road sign to travel.
    const z = area.zoneAt(p.x, p.z);
    if (this.mode === 'drive' && z && this.hubCar.v > 2) {
      if (z.kind === 'portal' && z.chapter) {
        this.play(z.chapter);
        return;
      }
      if (z.kind === 'area' && z.area) {
        this.travelTo(z.area);
        return;
      }
    }
    this.checkPickups(area, p.x, p.z);
    if (this.mode === 'foot') this.profile.addStat('walked', this.hubWalker.speed * dt);
    this.discoverTimer -= dt;
    if (this.discoverTimer <= 0) {
      this.discoverTimer = 0.5;
      this.discover(area, p.x, p.z);
    }
    this.updatePerahera(area, p.x, p.z, dt);
    this.missionEvents(this.freeMissions.update(dt, p.x, p.z, this.mode === 'foot'));
    this.trackStats(dt);
  }

  /** Golden paint pots (found once) and loot chests (once a day each). */
  private checkPickups(area: FreeRoamArea, x: number, z: number): void {
    for (const s of area.secrets) {
      if (!s.mesh?.visible || Math.hypot(x - s.x, z - s.z) > 2.6) continue;
      s.mesh.visible = false;
      if (!this.profile.markSeen(`secret:${s.id}`)) continue;
      this.profile.earn(100);
      this.profile.addStat('secrets');
      this.audio.secret();
      const found = area.secrets.filter((q) => this.profile.data.seen.includes(`secret:${q.id}`)).length;
      this.hud.lootCard(t('loot.secret'), '#f4d23b', t('loot.secretFound', { n: found, total: area.secrets.length }), `+100 ink · ${s.hint}`);
      this.checkTrophies();
    }
    const day = todayKey();
    for (const c of area.chests) {
      if (!c.mesh?.visible || Math.hypot(x - c.x, z - c.z) > 3) continue;
      c.mesh.visible = false;
      const tag = `chest:${c.id}:${day}`;
      // Forget chests opened on earlier days.
      this.profile.data.seen = this.profile.data.seen.filter((s) => !s.startsWith('chest:') || s.endsWith(`:${day}`));
      if (!this.profile.markSeen(tag)) continue;
      this.profile.markSeen(`chestEver:${c.id}`);
      const loot = openChest(this.profile, c.tier);
      this.audio.loot(loot.rarity);
      const name = t(`rarity.${RARITY_NAMES[loot.rarity].toLowerCase()}` as StringKey);
      const what = loot.item ? loot.item.name : `+${loot.ink} ink`;
      this.hud.lootCard(name, RARITY_COLOURS[loot.rarity], what, [loot.item ? `+${loot.ink} ink` : '', loot.tonic ? `+1 ${loot.tonic}` : ''].filter(Boolean).join(' · '));
      this.splash = Math.max(this.splash, 0.6);
      this.checkTrophies();
    }
  }

  /** React to open-world mission progress. */
  private missionEvents(events: MissionEvent[]): void {
    if (!events.length) return;
    const tr = this.freeMissions;
    for (const e of events) {
      if (e === 'target') this.audio.checkpoint();
      else if (e === 'step') {
        this.audio.chime(72);
        if (tr.current) this.popAtPawn(tr.current.text, 'info');
      } else if (e === 'failed') {
        this.audio.blip(180, 0.3, 'sawtooth', 0.05);
        this.popAtPawn(t('cm.failed'), 'info');
      }
    }
    if (events.includes('complete') && tr.mission) {
      const m = tr.mission;
      tr.cancel();
      const first = this.profile.markSeen(`cm:${m.id}`);
      const ink = first ? m.reward.ink : Math.round(m.reward.ink / 4);
      this.profile.earn(ink);
      let detail = `+${ink} ink`;
      if (first && m.reward.item && !this.profile.owns(m.reward.item)) {
        this.profile.data.owned.push(m.reward.item);
        const item = CATALOGUE.find((i) => i.id === m.reward.item);
        if (item) detail += ` · ${item.name}`;
      }
      this.profile.addStat('cityMissions');
      this.profile.save();
      this.audio.fanfare();
      this.hud.lootCard(t('cm.complete'), '#6fbf73', m.title, detail);
      this.checkTrophies();
    }
  }

  /** Start an open-world mission (from the city mission board). */
  private startCityMission(id: string): void {
    const m = CITY_MISSIONS.find((q) => q.id === id);
    if (!m) return;
    const snap = this.resumeSnapshot?.hub;
    this.enterHub(snap?.area === 'city' ? snap : undefined, 'city');
    this.freeMissions.start(m);
    this.hud.lootCard(CHAINS.find((c) => c.id === m.chain)?.name ?? '', '#4a90c9', m.title, m.intro);
    this.audio.chime(67);
  }

  private hubInput(dt: number): void {
    const inp = this.input;
    if (inp.consume('honk')) this.audio.honk(60);
    if (inp.consume('emote')) this.waveTimer = 2.2;
    if (inp.consume('chat') && this.net.connected && this.options.chat !== 'off') {
      this.input.releasePointerLock();
      this.hud.openChat((text) => {
        this.net.chat(text);
        this.hud.chatLine(this.profile.data.name, text);
      });
    }
    if (inp.consume('photo')) {
      this.enterPhoto();
      return;
    }
    if (inp.consume('map')) {
      this.openMap();
      return;
    }
    if (inp.consume('respawn')) {
      const area = this.area!;
      this.mode = 'drive';
      this.seatHuman();
      this.hubCar.place(area.spawn.x, area.spawn.z, area.spawn.heading);
      this.hubCam.snap = true;
      this.splash = 1;
      this.timeScale = 1;
      this.stuntAir = null;
    }
    if (inp.consume('interact')) {
      const zone = this.hubZone;
      if (zone) this.useZone(zone);
      else if (this.mode === 'drive') {
        if (Math.abs(this.hubCar.v) > 4) this.popAtPawn(t('prompt.slowDown'), 'info');
        else {
          this.hubCar.v = 0;
          this.mode = 'foot';
          const right = this.hubCar.heading;
          this.hubWalker.place(this.hubCar.x - Math.cos(right) * 2.4, this.hubCar.z + Math.sin(right) * 2.4, this.hubCar.heading);
          this.hubCam.yaw = this.hubCar.heading;
          this.seatHuman();
          this.updateHeadVisibility();
          this.audio.door();
        }
      } else if (Math.hypot(this.hubWalker.x - this.hubCar.x, this.hubWalker.z - this.hubCar.z) < 4) {
        this.mode = 'drive';
        this.input.releasePointerLock();
        this.seatHuman();
        this.updateHeadVisibility();
        this.audio.door();
      }
    }
    const look = inp.takeLook(dt);
    if (this.mode === 'foot') {
      this.hubCam.yaw -= look.dx * 0.0028;
      this.hubCam.pitch = clamp(this.hubCam.pitch + look.dy * 0.0022, -0.6, 1.2);
    }
  }

  private useZone(zone: HubZone): void {
    if (zone.kind === 'portal' && zone.chapter) this.play(zone.chapter);
    else if (zone.kind === 'area' && zone.area) this.travelTo(zone.area);
    else if (zone.kind === 'garage') this.openMenu('garage');
    else if (zone.kind === 'wardrobe') this.openMenu('wardrobe');
    else if (zone.kind === 'shop') this.openMenu('shop');
    else if (zone.kind === 'missions') this.openMenu(this.area?.id === 'city' ? 'citymissions' : 'missions');
    else if (zone.kind === 'trophies') this.openMenu('trophies');
  }

  /** Beacons over mission targets, the compass and the objective card. */
  private updateMissionHud(px: number, pz: number, cam: THREE.PerspectiveCamera): void {
    const tr = this.freeMissions;
    const targets = tr.targets();
    for (let i = 0; i < Math.max(targets.length, this.beacons.length); i++) {
      let b = this.beacons[i];
      if (!b && targets[i]) {
        b = new THREE.Mesh(buildBeacon('#f4d23b'), this.pickupMaterial);
        this.scene.add(b);
        this.beacons.push(b);
      }
      if (!b) continue;
      const tg = targets[i];
      b.visible = !!tg && this.state !== 'photo';
      if (tg) {
        b.position.set(tg.x, HUB_Y, tg.z);
        b.scale.set(tg.r / 6, 1 + Math.sin(this.time * 3 + i) * 0.05, tg.r / 6);
        b.rotation.y = this.time * 0.6;
      }
    }
    const step = tr.current;
    if (!tr.mission || !step) {
      this.hud.objective(null);
      this.hud.compass(null);
      return;
    }
    const total = step.targets.length;
    const extra = [step.time ? `⏱ ${Math.max(0, tr.timeLeft).toFixed(0)} s` : '', total > 1 ? `${tr.done.size} / ${total}` : '', t('cm.cancelHint')].filter(Boolean).join(' · ');
    this.hud.objective(tr.mission.title, step.text, extra);
    let best = targets[0];
    for (const tg of targets) if (Math.hypot(tg.x - px, tg.z - pz) < Math.hypot(best.x - px, best.z - pz)) best = tg;
    if (!best) {
      this.hud.compass(null);
      return;
    }
    const dir = cam.getWorldDirection(_v);
    const bearing = Math.atan2(best.x - px, -(best.z - pz)) - Math.atan2(dir.x, -dir.z);
    this.hud.compass((bearing * 180) / Math.PI, Math.hypot(best.x - px, best.z - pz));
  }

  private renderHub(dt: number, alpha: number): void {
    const area = this.area!;
    const vm = this.vehicle;
    const car = this.hubCar.lerp(alpha);
    const cam = this.rig.camera;
    vm.root.position.set(car.x, HUB_Y + car.y + 0.02, car.z);
    vm.root.quaternion.setFromAxisAngle(_y, car.heading);
    const steer = this.mode === 'drive' ? this.input.steer() : 0;
    for (const p of vm.steerPivots) p.rotation.y = -steer * 0.45;
    vm.roll(this.hubCar.v * dt);
    vm.body.rotation.z = clamp(this.hubCar.slip * 0.03, -0.07, 0.07);
    vm.body.rotation.x = this.hubCar.braking ? -0.035 : this.hubCar.grounded ? 0 : clamp(-this.hubCar.vy * 0.03, -0.3, 0.3);
    vm.setBrakeLights(this.hubCar.braking);
    vm.setHeadlights(paintShared.uNight.value);
    vm.horn.scale.setScalar(1 + this.audio.beatPulse * 0.08);

    let focus: THREE.Vector3 = vm.root.position;
    const fwd = _v.set(-Math.sin(car.heading), 0, -Math.cos(car.heading));
    const desired = _v2;
    const look = _v3;
    if (this.mode === 'foot') {
      const w = this.hubWalker.lerp(alpha);
      const hm = this.humanModel;
      hm.root.position.set(w.x, HUB_Y + w.y, w.z);
      hm.root.quaternion.setFromAxisAngle(_y, w.heading);
      if (this.waveTimer > 0) this.waveTimer -= dt;
      hm.animate(dt, this.waveTimer > 0 && this.hubWalker.speed < 0.5 ? 'wave' : this.hubWalker.pose, this.hubWalker.speed, this.time);
      if (this.hubWalker.grounded && this.hubWalker.speed > 0.5) {
        this.footstepTimer -= dt * this.hubWalker.speed;
        if (this.footstepTimer <= 0) {
          this.audio.footstep();
          this.footstepTimer = 1.1;
        }
      }
      focus = hm.root.position;
      const yaw = this.hubCam.yaw;
      const pitch = this.hubCam.pitch;
      const dist = 5.2 * this.rig.zoom;
      look.copy(focus).add(_v4.set(0, 1.6, 0));
      desired.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(look);
    } else {
      this.humanModel.animate(dt, vm.def.seatPose, 0, this.time);
      // Pull back and up during a stunt so the landing is in view.
      const stunt = this.stuntAir && !this.hubCar.grounded ? 1 : 0;
      this.stuntCam += (stunt - this.stuntCam) * Math.min(1, dt * 3);
      const back = (8 + this.stuntCam * 6) * this.rig.zoom;
      desired.copy(vm.root.position).addScaledVector(fwd, -back).add(_v4.set(0, (3.2 + this.stuntCam * 4) * this.rig.zoom, 0));
      look.copy(vm.root.position).addScaledVector(fwd, 4 + this.stuntCam * 8).add(_v4.set(0, 1.3, 0));
      this.hubCam.yaw = car.heading;
    }
    if (this.state === 'photo') this.updatePhotoCamera(dt);
    else {
      // Keep the lens out of buildings.
      const lens = { x: desired.x, z: desired.z };
      if (desired.y < HUB_Y + 14) area.world.resolve(lens, 0.6);
      desired.x = lens.x;
      desired.z = lens.z;
      desired.y = Math.max(desired.y, HUB_Y + 0.6);
      const k = this.hubCam.snap ? 1 : 1 - Math.exp(-(this.mode === 'foot' ? 14 : 5) * dt);
      this.hubCam.pos.lerp(desired, k);
      this.hubCam.look.lerp(look, this.hubCam.snap ? 1 : 1 - Math.exp(-10 * dt));
      this.hubCam.snap = false;
      cam.position.copy(this.hubCam.pos);
      cam.up.set(0, 1, 0);
      const burst = this.hubCar.burst > 0 ? 8 : 0;
      cam.fov += (this.settings.fov + Math.min(10, Math.max(0, this.hubCar.v - 18) * 0.5) + burst - cam.fov) * Math.min(1, dt * 6);
      cam.updateProjectionMatrix();
      cam.lookAt(this.hubCam.look);
      cam.updateMatrixWorld();
    }

    this.sky.position.copy(cam.position);
    this.env.update(dt, focus, cam, this.settings.reducedMotion || this.options.calmLighting);
    paintShared.uTime.value = this.time;
    skyUniforms.uTime.value = this.time;
    waterUniforms.uTime.value = this.time;
    const player = this.mode === 'foot' ? { x: this.hubWalker.x, z: this.hubWalker.z } : { x: this.hubCar.x, z: this.hubCar.z };
    area.update(dt * this.timeScale, this.time, player, cam);
    this.updateDistricts(area, player.x, player.z, dt);
    this.updateFireworks(dt);
    if (area.perahera?.active && this.state !== 'paused') {
      const n = area.perahera.torches(this.torches);
      for (let i = 0; i < n; i++) this.particles.emit('flame', this.torches[i], _v5.set(0, 1.2, 0), 30 * dt, 0.25);
    }
    // Pots bob and spin; chests shimmer.
    for (const s of area.secrets) if (s.mesh?.visible) s.mesh.rotation.y = this.time * 1.5;
    if (this.state === 'hub') {
      const back = _v5.copy(fwd).negate();
      const rear = _v6.copy(vm.root.position).addScaledVector(back, 1.7).add(_v4.set(0, 0.3, 0));
      const skid = this.mode === 'drive' && this.hubCar.grounded && (Math.abs(this.hubCar.slip) > 1.2 || this.hubCar.drifting);
      if (skid) this.particles.emit('smoke', rear, _v4.set(0, 0.5, 0), (this.hubCar.drifting ? 50 : 30) * dt, 1.2);
      if (this.hubCar.drifting && this.hubCar.driftCharge > 0.35) this.particles.emit('spark', rear, _v4.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3), (this.hubCar.driftCharge > 0.9 ? 40 : 20) * dt, 0.5);
      if (this.mode === 'drive' && this.env.rain > 0.4 && Math.abs(this.hubCar.v) > 8) this.particles.emit('splash', rear, _v4.set(0, 2.5, 0), 14 * dt, 1.4);
      if (this.hubCar.boosting || this.hubCar.burst > 0) this.particles.emit('exhaust', rear, back.multiplyScalar(6), 40 * dt, 0.6);
      if (paintShared.uNight.value > 0.6) this.particles.emit('firefly', _v4.copy(focus).add(_v5.set((Math.random() - 0.5) * 40, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 40)), _v5.set(0, 0.2, 0), 6 * dt, 1);
    }
    this.particles.update(dt, this.pipeline.size.height, cam);
    this.wildlife.update(dt, this.time, focus, paintShared.uNight.value);
    this.updateHeadlights(vm, cam);

    // Zones and prompts.
    this.hubZone = area.zoneAt(player.x, player.z);
    const nearCar = this.mode === 'foot' && Math.hypot(this.hubWalker.x - this.hubCar.x, this.hubWalker.z - this.hubCar.z) < 4;
    const zoneText = this.hubZone ? (this.hubZone.kind === 'portal' || this.hubZone.kind === 'area' ? t('prompt.enter', { place: area.zoneLabel(this.hubZone).replace('→ ', '') }) : `E · ${area.zoneLabel(this.hubZone)}`) : null;
    this.hud.setPrompt(this.state === 'photo' ? null : zoneText ?? (nearCar ? t('prompt.getIn') : this.mode === 'drive' && Math.abs(this.hubCar.v) < 3 ? t('prompt.getOut') : null));
    this.updateMissionHud(player.x, player.z, cam);
    this.mapView.setArea(area.mapInfo((id) => this.districtState(area).find((d) => d.district.id === id)?.paint ?? 1));
    this.mapView.showMini(this.options.minimap && this.state === 'hub' && !this.hudHidden);
    const ms = this.mapState(area);
    this.mapView.drawMini(ms, this.time);
    this.mapView.draw(ms, this.time);
    if (area.secrets.length) {
      const found = area.secrets.filter((s) => this.profile.data.seen.includes(`secret:${s.id}`)).length;
      this.hud.counter(this.state === 'photo' ? null : `🗝 ${found} / ${area.secrets.length}`);
    } else this.hud.counter(null);
    // Multiplayer: everyone in the same room and the same area sees each other.
    if (this.net.connected) {
      const foot = this.mode === 'foot';
      const chapter = area.id === 'harbour' ? 'hub' : area.id;
      const st: PlayerState = foot
        ? { chapter, mode: 'foot', s: this.hubWalker.z + HUB_S_OFFSET, x: this.hubWalker.x, h: this.hubWalker.y, yaw: this.hubWalker.heading, v: this.hubWalker.speed, pose: this.waveTimer > 0 ? 'wave' : undefined }
        : { chapter, mode: 'drive', s: this.hubCar.z + HUB_S_OFFSET, x: this.hubCar.x, h: this.hubCar.y, yaw: this.hubCar.heading, v: this.hubCar.v };
      this.net.update(dt, st, this.playerInfo());
      this.remotes.update(dt, this.time, this.net, this.world.path, chapter, cam, HUB_Y);
      this.hud.setPlayers([...this.net.peers.values()].map((p) => p.info?.name ?? '…'), this.net.status);
    } else this.hud.setPlayers([], 'offline');
    this.hud.update(dt);
    this.hud.setClock(this.env.clockText(), this.env.bandLabel(), this.env.presetId, this.env.auto, this.env.weatherLabel);
    this.hud.setInk(this.profile.data.ink);
    const kmh = this.mode === 'drive' ? this.hubCar.speedKmh : this.hubWalker.speed * 3.6;
    const title = area.title();
    this.hud.setSpeed(displaySpeed(kmh, this.options.units), this.hubCar.boostMeter, this.hubCar.boosting || this.hubCar.burst > 0, title.name, 0, 'down is down', this.mode === 'foot', this.options.units === 'mph' ? 'mph' : 'km/h');
    const st = this.audio.station;
    this.hud.setRadio(st.freq, st.name, `track ${String(this.audio.trackIndex + 1).padStart(2, '0')} / ${String(st.tracks).padStart(2, '0')}`, this.audio.trackProgress, this.audio.radioOn);
    this.audio.update(this.mode === 'drive' ? Math.abs(this.hubCar.v) : this.hubWalker.speed, this.hubCar.boosting || this.hubCar.burst > 0, this.mode === 'drive' && this.state !== 'paused', this.env.rain, focus.y);
    this.audio.setAmbience({ night: paintShared.uNight.value, rain: this.env.rain, ...area.ambienceAt(player.x, player.z) });
    this.audioFrame(this.mode === 'drive' && this.state === 'hub', Math.abs(this.hubCar.v), this.hubCar.boosting || this.hubCar.burst > 0, this.mode === 'drive' ? this.input.throttle() : 0, this.mode === 'drive' && this.hubCar.grounded && (Math.abs(this.hubCar.slip) > 1.2 || this.hubCar.drifting) ? 1 : 0);

    this.splash = Math.max(0, this.splash - dt * 1.4);
    this.borderPulse = Math.max(0, this.borderPulse - dt * 0.8);
    this.lastFx = {
      fogColor: this.env.fogColor,
      rain: this.env.rain,
      speedLines: this.hubCar.burst > 0 || this.timeScale < 1 ? 0.6 : 0,
      borderPulse: this.borderPulse + this.splash * 0.4,
      splash: this.splash * 0.8,
      sunDir: this.env.sunDirection,
      sunColor: this.env.sunColour,
      fogDensity: this.env.fogDensity * Math.max(1, 3000 / this.settings.drawDistance) * (area.id === 'city' ? 0.5 : 1),
      flash: this.env.flash,
      dofFocus: 10,
      dofAmount: 0,
    };
    this.pipeline.render(this.scene, cam, dt, this.time, this.lastFx);
  }

  debugHubInfo(): Record<string, unknown> {
    return {
      state: this.state,
      inHub: this.inHub,
      area: this.area?.id ?? null,
      mode: this.mode,
      car: { x: +this.hubCar.x.toFixed(2), z: +this.hubCar.z.toFixed(2), y: +this.hubCar.y.toFixed(2), v: +this.hubCar.v.toFixed(2), drifting: this.hubCar.drifting, burst: +this.hubCar.burst.toFixed(2) },
      walker: { x: +this.hubWalker.x.toFixed(2), z: +this.hubWalker.z.toFixed(2) },
      zone: this.hubZone?.kind ?? null,
      menu: this.menu.screen,
      mission: this.freeMissions.mission ? { id: this.freeMissions.mission.id, step: this.freeMissions.step, done: this.freeMissions.done.size } : null,
      ink: this.profile.data.ink,
      stats: { stunts: this.profile.stat('stunts'), chests: this.profile.stat('chests'), secrets: this.profile.stat('secrets'), miniTurbos: this.profile.stat('miniTurbos'), cityMissions: this.profile.stat('cityMissions') },
      timeScale: this.timeScale,
      fps: Math.round(this.fps),
      calls: this.renderer.info.render.calls,
    };
  }

  debugHub(x?: number, z?: number, heading?: number, area?: string): void {
    if (this.state === 'splash') this.profile.data.seenIntro = true;
    this.enterHub(x !== undefined ? { x, z: z ?? 0, heading: heading ?? 0, foot: null, area } : undefined, area);
  }

  /** District paint for the current area, plus a way to mark strokes done (tests). */
  debugDistricts(markDone?: string[]): { id: string; done: number; need: number; total: number; paint: number; shown: number }[] {
    if (markDone) for (const tag of markDone) this.profile.markSeen(tag);
    const area = this.area;
    if (!area) return [];
    return this.districtState(area).map((d, i) => ({ id: d.district.id, done: d.done, need: d.need, total: d.total, paint: d.paint, shown: +(this.washShown[i] ?? 0).toFixed(2) }));
  }

  /** Strokes still to do in a district (tags), for tests. */
  debugStrokes(district: string): string[] {
    const area = this.area;
    const d = area?.districts?.find((q) => q.id === district);
    if (!area || !d) return [];
    return this.strokesFor(area).filter((s) => inRect(d.rect, s.x, s.z)).map((s) => s.tag);
  }

  debugMap(open: boolean): void {
    if (open) this.openMap();
    else this.closeMap();
  }

  debugTime(preset: string): void {
    this.env.setPreset(preset);
    this.env.snap();
  }

  debugDaily(): unknown {
    this.updateDaily();
    return { daily: this.profile.data.daily, streak: this.profile.data.streak };
  }

  debugPerahera(): { active: boolean; centre: { x: number; z: number } | null; festival: number } {
    const pa = this.area?.perahera;
    return { active: !!pa?.active, centre: pa?.active ? pa.centre() : null, festival: +this.audio.festival.toFixed(2) };
  }

  debugCityMission(id: string): void {
    this.startCityMission(id);
  }

  // ————— Colour the City, map, discoveries, daily brushstrokes, photo hunt, perahera —————

  /** Everything in an area that paints its districts, with the profile tag that marks it done. */
  private strokesFor(area: FreeRoamArea): Stroke[] {
    let list = this.strokeCache.get(area.id);
    if (list) return list;
    list = [
      ...area.secrets.map((s) => ({ tag: `secret:${s.id}`, x: s.x, z: s.z })),
      ...area.stunts.map((s) => ({ tag: `stunt:${s.id}`, x: s.ramp.x, z: s.ramp.z })),
      ...area.chests.map((c) => ({ tag: `chestEver:${c.id}`, x: c.x, z: c.z })),
      ...PHOTO_SUBJECTS.filter((p) => p.area === area.id && p.id !== 'perahera' && p.id !== 'skyline').map((p) => ({ tag: `photo:${p.id}`, x: p.x, z: p.z })),
    ];
    if (area.id === 'city')
      for (const m of CITY_MISSIONS) {
        const last = m.steps[m.steps.length - 1];
        const tg = last.targets[last.targets.length - 1];
        list.push({ tag: `cm:${m.id}`, x: tg.x, z: tg.z });
      }
    this.strokeCache.set(area.id, list);
    return list;
  }

  private districtState(area: FreeRoamArea): DistrictProgress[] {
    if (!area.districts) return [];
    const seen = this.profile.data.seen;
    if (this.districtCache && this.districtCache.area === area.id && this.districtCache.seen === seen.length) return this.districtCache.list;
    const list = districtProgress(area.districts, this.strokesFor(area), seen);
    this.districtCache = { area: area.id, seen: seen.length, list };
    return list;
  }

  /** Per frame: blend the sketch wash, notice district changes and newly painted districts. */
  private updateDistricts(area: FreeRoamArea, x: number, z: number, dt: number): void {
    const list = this.districtState(area);
    if (!list.length) {
      setWash([], []);
      return;
    }
    list.forEach((p, i) => {
      const target = 1 - p.paint;
      const cur = this.washShown[i] ?? target;
      this.washShown[i] = cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), dt * 0.35);
      if (p.restored && this.profile.markSeen(`restored:${area.id}:${p.district.id}`)) this.celebrate(p);
    });
    setWash(
      list.map((p) => p.district.rect),
      this.washShown,
    );
    const here = list.find((p) => inRect(p.district.rect, x, z));
    if (here && here.district.id !== this.districtHere) {
      this.districtHere = here.district.id;
      this.hud.districtBanner(here.district.name, here.district.colour, here.paint, here.restored ? '✓' : `${t('district.progress', { n: here.done, total: here.need })} · ${t('district.sketch')}`);
    }
  }

  private celebrate(p: DistrictProgress): void {
    this.profile.earn(300);
    this.profile.addStat('restored');
    this.profile.save();
    this.audio.fanfare();
    this.hud.lootCard(t('district.painted', { name: p.district.name }), p.district.colour, '🎆', '+300 ink');
    const [x0, z0, x1, z1] = p.district.rect;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    for (let i = 0; i < 12; i++) this.launchFirework(cx + (Math.random() - 0.5) * 120, cz + (Math.random() - 0.5) * 120, i * 0.45);
    this.checkTrophies();
  }

  private launchFirework(x: number, z: number, delay = 0): void {
    this.fireworks.push({ x, z, y: 0, vy: 34 + Math.random() * 10, delay, whistle: false });
  }

  /** Rockets rise with a spark trail, then burst into a sphere of colour. */
  private updateFireworks(dt: number): void {
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      if (f.delay > 0) {
        f.delay -= dt;
        continue;
      }
      if (!f.whistle) {
        f.whistle = true;
        this.audio.firework(1.1);
      }
      f.vy -= 22 * dt;
      f.y += f.vy * dt;
      const at = _v4.set(f.x, HUB_Y + f.y, f.z);
      this.particles.emit('spark', at, _v5.set(0, -2, 0), 60 * dt, 0.6);
      if (f.vy < 3) {
        for (let k = 0; k < 90; k++) {
          const u = Math.random() * 2 - 1;
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(1 - u * u);
          this.particles.emit('firework', at, _v5.set(r * Math.cos(a), u, r * Math.sin(a)).multiplyScalar(16 + Math.random() * 4), 1, 1.2);
        }
        this.fireworks.splice(i, 1);
      }
    }
  }

  /** Visit a named place to discover it (a fast-travel point on the map). */
  private discover(area: FreeRoamArea, x: number, z: number): void {
    for (const p of area.places) {
      if (Math.hypot(p.x - x, p.z - z) > 40) continue;
      if (!this.profile.markSeen(`place:${area.id}:${p.id}`)) continue;
      this.profile.earn(25);
      this.profile.addStat('discoveries');
      this.audio.chime(76);
      this.popAtPawn(`📍 ${t('map.discovered', { place: p.name })}`, 'good');
    }
  }

  private openMap(): void {
    if (!this.area || this.state !== 'hub') return;
    this.mapView.show(true);
    this.input.releasePointerLock();
    this.audio.uiClick();
  }

  private closeMap(): void {
    if (!this.mapView.open) return;
    this.mapView.show(false);
    this.audio.uiClick();
  }

  private fastTravel(id: string): void {
    const area = this.area;
    const place = area?.places.find((p) => p.id === id);
    if (!area || !place || !this.profile.data.seen.includes(`place:${area.id}:${id}`)) return;
    if (this.freeMissions.current?.time) {
      this.popAtPawn(t('map.noTravel'), 'info');
      return;
    }
    this.closeMap();
    const spot = { x: place.x, z: place.z };
    area.world.resolve(spot, 2);
    this.mode = 'drive';
    this.seatHuman();
    this.updateHeadVisibility();
    this.hubCar.place(spot.x, spot.z, this.hubCar.heading);
    this.hubCam.snap = true;
    this.splash = 1;
    this.stuntAir = null;
    this.timeScale = 1;
    this.audio.whoosh();
    this.popAtPawn(t('map.travelled', { place: place.name }), 'good');
  }

  /** Markers and progress for the map and minimap. */
  private mapState(area: FreeRoamArea): MapState {
    const seen = this.profile.data.seen;
    const markers: MapMarker[] = [];
    for (const p of area.places) {
      const known = seen.includes(`place:${area.id}:${p.id}`);
      markers.push(known ? { kind: 'place', x: p.x, z: p.z, label: p.name, icon: '📍', travel: p.id } : { kind: 'unknown', x: p.x, z: p.z });
    }
    for (const zn of area.zones) markers.push({ kind: 'zone', x: zn.x, z: zn.z, icon: [...zn.label][0] ?? '•' });
    for (const s of area.stunts) markers.push({ kind: 'stunt', x: s.ramp.x, z: s.ramp.z });
    for (const c of area.chests) if (c.mesh?.visible) markers.push({ kind: 'chest', x: c.x, z: c.z, colour: RARITY_COLOURS[c.tier] });
    for (const s of area.secrets) if (seen.includes(`secret:${s.id}`)) markers.push({ kind: 'secret', x: s.x, z: s.z });
    for (const tg of this.freeMissions.targets()) markers.push({ kind: 'mission', x: tg.x, z: tg.z });
    if (area.perahera?.active) {
      const c = area.perahera.centre();
      markers.push({ kind: 'event', x: c.x, z: c.z, icon: '🐘' });
    }
    for (const peer of this.net.peers.values()) {
      const snap = peer.info && this.net.sample(peer);
      if (snap && snap.chapter === (area.id === 'harbour' ? 'hub' : area.id)) markers.push({ kind: 'peer', x: snap.x, z: snap.s - HUB_S_OFFSET, label: peer.info?.name });
    }
    const p = this.mode === 'foot' ? this.hubWalker : this.hubCar;
    const found = area.secrets.filter((s) => seen.includes(`secret:${s.id}`)).length;
    const places = area.places.filter((q) => seen.includes(`place:${area.id}:${q.id}`)).length;
    return {
      player: { x: p.x, z: p.z, heading: this.mode === 'foot' ? this.hubCam.yaw : this.hubCar.heading },
      markers,
      districts: this.districtState(area).map((d) => ({ name: d.district.name, colour: d.district.colour, paint: d.paint, done: d.done, need: d.need })),
      title: area.title().name,
      subtitle: `📍 ${places}/${area.places.length} · 🗝 ${found}/${area.secrets.length} · ${t('map.hint')}`,
    };
  }

  /** Daily brushstrokes: start the day, pay out finished ones, grow the streak. */
  private updateDaily(): void {
    const p = this.profile;
    const day = todayKey();
    const stat = (k: string): number => p.stat(k);
    const state = ensureDaily(p.data.daily, day, stat);
    p.data.daily = state;
    for (const id of state.ids) {
      if (state.claimed.includes(id)) continue;
      const c = CHALLENGES.find((q) => q.id === id);
      if (!c || challengeProgress(c, state, stat) < c.amount) continue;
      state.claimed.push(id);
      p.earn(c.ink);
      this.audio.secret();
      this.hud.lootCard(t('daily.done'), '#3f9a52', `${c.icon} ${t(`ch.${c.stat}` as StringKey, { n: challengeAmount(c, c.amount) })}`, `+${c.ink} ink`);
      if (state.claimed.length === state.ids.length && p.data.streak.last !== day) {
        p.data.streak = bumpStreak(p.data.streak, day);
        // Streak reward: a better chest every day of the streak (up to legendary).
        const loot = openChest(p, Math.min(3, p.data.streak.count - 1));
        this.audio.loot(loot.rarity);
        window.setTimeout(() => this.hud.lootCard(t('daily.allDone', { n: p.data.streak.count }), RARITY_COLOURS[loot.rarity], loot.item ? loot.item.name : `+${loot.ink} ink`, t(`rarity.${RARITY_NAMES[loot.rarity].toLowerCase()}` as StringKey)), 3400);
      }
      p.save();
      this.checkTrophies();
    }
  }

  /** Photo hunt: which listed sights are in this photo? */
  private photoHunt(): void {
    const area = this.area;
    if (!this.inHub || !area) return;
    const where = (s: PhotoSubject): { x: number; y: number; z: number } | null => {
      if (s.id !== 'perahera') return s;
      if (!area.perahera?.active) return null;
      const c = area.perahera.centre();
      return { x: c.x, y: s.y, z: c.z };
    };
    for (const s of subjectsInFrame(this.rig.camera, area.id, HUB_Y, where)) {
      if (!this.profile.markSeen(`photo:${s.id}`)) continue;
      this.profile.earn(s.ink);
      this.audio.secret();
      this.hud.lootCard(t('hunt.found'), '#4a90c9', `${s.icon} ${s.name}`, `+${s.ink} ink`);
    }
    this.checkTrophies();
  }

  /** The night perahera: drums get louder as you near it; ride along for its blessing. */
  private updatePerahera(area: FreeRoamArea, x: number, z: number, dt: number): void {
    const pa = area.perahera;
    if (!pa?.active) {
      this.peraheraAnnounced = false;
      this.audio.festival += (0 - this.audio.festival) * Math.min(1, dt * 2);
      return;
    }
    const d = pa.distanceTo(x, z);
    this.audio.festival += (Math.max(0, 1 - d / 160) - this.audio.festival) * Math.min(1, dt * 2);
    if (d < 150 && !this.peraheraAnnounced) {
      this.peraheraAnnounced = true;
      this.popAtPawn(`🐘 ${t('perahera.near')}`, 'good');
    }
    if (d < 22) {
      this.peraheraTime += dt;
      if (this.peraheraTime > 20 && this.profile.markSeen(`perahera:${todayKey()}`)) {
        this.profile.earn(200);
        this.profile.addStat('perahera');
        this.audio.fanfare();
        this.hud.lootCard(t('perahera.blessing'), '#f4a13b', '🐘 🥁 🔥', '+200 ink');
        this.checkTrophies();
      }
    }
    // Now and then a firework over the procession.
    this.peraheraFirework -= dt;
    if (this.peraheraFirework <= 0 && d < 250) {
      this.peraheraFirework = 9 + Math.random() * 8;
      const c = pa.centre();
      this.launchFirework(c.x + (Math.random() - 0.5) * 40, c.z + (Math.random() - 0.5) * 40);
    }
  }

  /** Chat line from another player, after the block list and chat setting. */
  private incomingChat(name: string, text: string): void {
    const o = this.options;
    if (o.chat === 'off' || o.blocked.includes(name)) return;
    this.hud.chatLine(name, o.chat === 'filtered' ? filterChat(text) : text);
  }

  // ————— ghosts —————

  private loadGhostFor(chapter: string): void {
    this.ghostModel?.root.removeFromParent();
    this.ghostModel = null;
    const run = loadGhost(chapter);
    this.ghost = run ? new GhostPlayer(run) : null;
    if (!run) return;
    const def = vehicleById(run.vehicle as never);
    const model = new VehicleModel(def, def.defaultLook);
    const ghostVC = new PaintMaterial({ vertexColors: true, flat: true, ghost: true });
    const ghostPlain = new PaintMaterial({ color: '#cfe6ff', ghost: true });
    model.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = mesh.geometry.getAttribute('color') ? ghostVC : ghostPlain;
      mesh.castShadow = false;
    });
    model.root.visible = false;
    this.scene.add(model.root);
    this.ghostModel = model;
  }

  private updateGhost(): void {
    const gm = this.ghostModel;
    if (!gm) return;
    const st = this.state === 'play' && this.mode === 'drive' && this.options.showGhost && this.ghost ? this.ghost.at(this.lapTime) : null;
    gm.root.visible = !!st && Math.abs(st.s - this.rover.s) > 3;
    if (!st || !gm.root.visible) return;
    const f = this.world.path.sample(st.s, this.footFrame);
    const basis = _m.makeBasis(f.right, f.up, _v.copy(f.tangent).negate());
    gm.root.quaternion.setFromRotationMatrix(basis).multiply(_q.setFromAxisAngle(_y, -st.yaw));
    gm.root.position.copy(f.position).addScaledVector(f.right, st.x).addScaledVector(f.up, st.h + 0.02);
  }

  // ————— photo mode —————

  private enterPhoto(): void {
    if (this.state !== 'play' && this.state !== 'hub') return;
    const cam = this.rig.camera;
    this.state = 'photo';
    this.hud.setPlaying(false);
    this.input.releasePointerLock();
    this.photoCam.pos.copy(cam.position);
    const dir = cam.getWorldDirection(_v);
    this.photoCam.yaw = Math.atan2(-dir.x, -dir.z);
    this.photoCam.pitch = Math.asin(clamp(dir.y, -1, 1));
    this.photoCam.anchor.copy(this.mode === 'drive' ? this.vehicle.root.position : this.humanModel.root.position);
    this.photo.open(cam.fov);
    this.audio.blip(880, 0.06, 'triangle', 0.05);
  }

  private exitPhoto(): void {
    if (this.state !== 'photo') return;
    this.photo.close();
    this.state = this.inHub ? 'hub' : 'play';
    this.hud.setPlaying(true);
    this.vehicle.root.visible = true;
    this.humanModel.root.visible = true;
    this.rig.snap();
  }

  /** Fly the photo camera: drag to look, WASD to move, Space/Ctrl up/down, Shift faster. */
  private updatePhotoCamera(dt: number): void {
    const inp = this.input;
    const look = inp.takeLook(dt);
    const pc = this.photoCam;
    pc.yaw -= look.dx * 0.003;
    pc.pitch = clamp(pc.pitch - look.dy * 0.003, -1.5, 1.5);
    const fwd = _v.set(-Math.sin(pc.yaw) * Math.cos(pc.pitch), Math.sin(pc.pitch), -Math.cos(pc.yaw) * Math.cos(pc.pitch));
    const right = _v2.set(Math.cos(pc.yaw), 0, -Math.sin(pc.yaw));
    const speed = (inp.held('sprint') ? 24 : 7) * dt;
    const m = inp.moveAxes();
    pc.pos.addScaledVector(fwd, m.y * speed).addScaledVector(right, m.x * speed);
    if (inp.held('hop')) pc.pos.y += speed;
    if (inp.held('crouch')) pc.pos.y -= speed;
    // Stay near the subject and above the sea.
    const off = _v3.copy(pc.pos).sub(pc.anchor);
    if (off.length() > 90) pc.pos.copy(pc.anchor).addScaledVector(off.normalize(), 90);
    pc.pos.y = Math.max(pc.pos.y, 1.5);
    const cam = this.rig.camera;
    cam.position.copy(pc.pos);
    cam.quaternion.setFromEuler(new THREE.Euler(pc.pitch, pc.yaw, (this.photo.state.roll * Math.PI) / 180, 'YXZ'));
    cam.fov = this.photo.state.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const hide = this.photo.state.hidePlayer;
    this.vehicle.root.visible = !hide;
    this.humanModel.root.visible = !hide;
    inp.clearUnconsumed();
  }

  /** Render one frame at 1×, 2× or 4K and download it as a PNG. */
  private capturePhoto(mult: 1 | 2 | 4): void {
    if (!this.lastFx) return;
    const w0 = window.innerWidth;
    const h0 = window.innerHeight;
    const W = Math.round(mult === 4 ? 3840 : w0 * mult);
    const H = Math.round((W * h0) / w0);
    this.renderer.setSize(W, H, false);
    this.pipeline.forceSize({ width: W, height: H });
    this.pipeline.render(this.scene, this.rig.camera, 0, this.time, this.lastFx);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.renderer.setSize(w0, h0, false);
    this.pipeline.forceSize(null);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paintland-${this.world.chapter.id}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
    a.click();
    this.audio.blip(1200, 0.05, 'square', 0.04);
    this.splash = 0;
    this.borderPulse = 0.2;
    this.profile.addStat('photos');
    if (this.inHub) {
      const p = this.mode === 'foot' ? this.hubWalker : this.hubCar;
      this.missionEvents(this.freeMissions.onPhoto(p.x, p.z));
      this.photoHunt();
    }
    this.checkTrophies();
    this.hud.pop(`Saved ${W}×${H}`, window.innerWidth / 2, window.innerHeight * 0.3, 'good');
  }

  // ————— stats and trophies —————

  private trackStats(dt: number): void {
    const p = this.profile;
    if (this.mode === 'drive') {
      const d = Math.abs(this.rover.v) * dt;
      p.addStat('distance', d);
      p.recordStat('maxSpeed', this.rover.speedKmh);
      if (this.frame.up.y < -0.5) p.addStat('upsideDown', dt);
      if (paintShared.uNight.value > 0.6 && this.env.rain > 0.5) p.addStat('nightRain', d);
    }
    this.statTimer -= dt;
    if (this.statTimer > 0) return;
    this.statTimer = 1;
    p.markSeen(`chapter:${this.world.chapter.id}`);
    if (this.mode === 'drive' && Math.abs(this.rover.v) > 5) p.markSeen(`weather:${this.env.weather}`);
    p.markSeen(`style:${this.settings.realism >= 0.99 ? 'realistic' : this.settings.realism <= 0.01 ? 'watercolour' : 'illustrated'}`);
    if (this.net.peers.size > 0) p.recordStat('multiplayer', 1);
    this.checkTrophies();
  }

  private checkTrophies(): void {
    for (const t of checkTrophies(this.profile)) {
      this.hud.showLapBanner(`${t.icon} Trophy: ${t.name}  +${t.reward} ink`);
      this.audio.chime(79);
      this.particles.emit('confetti', this.vehicle.root.position.clone().addScaledVector(this.frame.up, 3), _v.copy(this.frame.up).multiplyScalar(6), 60, 6, this.frame.up);
    }
  }

  // ————— particles —————

  private emitParticles(dt: number): void {
    const r = this.rover;
    const vm = this.vehicle;
    if (this.mode !== 'drive' || !vm.root.visible) return;
    const f = this.frame;
    const back = _v.set(0, 0, 1).applyQuaternion(vm.root.quaternion);
    const side = _v2.set(1, 0, 0).applyQuaternion(vm.root.quaternion);
    const rear = _v3.copy(vm.root.position).addScaledVector(back, 1.7).addScaledVector(f.up, 0.25);
    const vel = _v4.copy(f.tangent).multiplyScalar(r.v * 0.35);
    if (r.grounded && (r.drifting || r.sliding) && r.v > 12) {
      for (const sx of [-0.9, 0.9]) this.particles.emit('smoke', _v5.copy(rear).addScaledVector(side, sx), vel, 26 * dt, 1.2, f.up);
    }
    if (r.grounded && f.paving === 5 && r.v > 8) this.particles.emit('dust', rear, vel, (r.v / 10) * 6 * dt, 1.5, f.up);
    if (r.grounded && this.env.rain > 0.4 && r.v > 10) {
      for (const sx of [-0.9, 0.9]) this.particles.emit('splash', _v5.copy(rear).addScaledVector(side, sx), _v6.copy(vel).addScaledVector(f.up, 2.5), (r.v / 15) * 12 * dt, 1.4, f.up);
    }
    if (r.boosting) this.particles.emit('exhaust', rear, _v6.copy(back).multiplyScalar(6).add(vel), 40 * dt, 0.6, f.up);
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
    this.env.snap();
    this.rig.snap();
  }

  /** Art style and graphics tier for screenshots (tools/screenshot.mjs STYLE=… QUALITY=…). */
  debugLook(style?: string, quality?: string): void {
    if (style) applyArtStyle(this.settings, style as ArtStyle);
    if (quality) applyQuality(this.settings, quality as QualityLevel);
    this.applySettings();
  }

  debugHandling(model: 'arcade' | 'realistic'): void {
    this.options.handling = model;
    this.applyOptions();
  }

  debugPhoto(): void {
    this.enterPhoto();
  }

  debugInfo(): Record<string, unknown> {
    return { state: this.state, chapter: this.world.chapter.id, s: this.rover.s, v: this.rover.v, mode: this.mode, district: this.district, fps: this.fps, calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, length: this.world.path.length, ink: this.profile.data.ink, mission: this.missions.statusText(), peers: this.net.peers.size, handling: this.rover.handling, gear: this.rover.gear, rpm: Math.round(this.rover.rpm), trophies: this.profile.data.trophies.length, weather: this.env.weather, realism: this.settings.realism };
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

  debugNet(room: string, server?: string): void {
    this.net.connect(room, server ?? null, this.playerInfo());
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
    this.env.snap();
    this.director.script([{ kind: 'landmark', duration: 999, landmark: index }]);
    return this.world.decor.landmarks[index]?.name ?? '?';
  }
}

interface HubSpot {
  x: number;
  z: number;
  heading: number;
  foot: { x: number; z: number } | null;
  area?: string;
}

/** Local calendar day, for daily chests. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _v6 = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
