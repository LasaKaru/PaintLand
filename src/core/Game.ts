import { settleChallenges } from '../ui/PassScreen';
import { POCKETS, POCKET_INK, POCKET_REACH } from '../world/Pockets';
import * as THREE from 'three';
import { Input } from './Input';
import { displaySpeed, loadOptions, saveOptions, type GameOptions } from './Options';
import { clamp } from './MathUtil';
import { createFrame } from '../road/RoadPath';
import { PaintPipeline } from '../render/PaintPipeline';
import { PaintMaterial, paintShared, setWash } from '../render/PaintMaterial';
import { createGalaxySky, createSky, createWater, galaxyUniforms, waterUniforms, skyUniforms } from '../render/SkyWater';
import { applyArtStyle, applyQuality, loadStudio, saveStudio, type ArtStyle, type QualityLevel, type StudioSettings } from '../render/StudioSettings';
import { Environment, TIME_PRESETS, type WeatherId } from '../world/Environment';
import { CHAPTERS, chapterById, setCustomChapter } from '../world/Chapters';
import { encodeRoad, roadChapter, type CustomRoad } from '../creator/CustomRoad';
import { World } from '../world/World';
import { VehicleModel, vehicleById, tuningFor } from '../models/Vehicles';
import { DEFAULT_HUMAN_LOOK, HumanModel, type HumanLook } from '../models/Human';
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
import { Village } from '../world/Village';
import { Voice } from '../net/Voice';
import { seatRider, unseatRider } from '../models/Rider';
import { api } from '../net/Api';
import { itemLabel } from '../ui/names';
import { familyCaps, onlineAllowed } from './Family';
import { BENCH_MEASURE, BENCH_SPOTS, BENCH_WARMUP, scoreBenchmark, type BenchmarkResult } from '../render/Benchmark';
import { Hub, HUB_Y, type HubZone } from '../world/Hub';
import { defaultEngine, defaultHorn } from '../audio/VehicleSounds';
import { EmoteWheel } from '../ui/EmoteWheel';
import { Pet, isPet } from '../models/Pets';
import type { Emote } from '../models/Human';
import type { GroupPhotoInvite } from '../net/Net';
import { AccountClient } from '../net/Account';
import { ModelKit } from '../models/ModelKit';
import { paintMural } from '../world/Murals';
import { applySeason, resolveFestival, resolveSeason, type Festival } from '../world/Calendar';
import { buildFestivalDecor } from '../world/FestivalDecor';
import { CONTEST_INK, PAINT_INK, acceptScore, convoyTick, driftPoints, dropsNear, leaderTick, newContest, newConvoy, newPaintEvent, paintDrops, standings, stuntPoints, takeDrop, type Contest, type ContestMode, type PaintEvent, type TogetherMsg } from '../gameplay/Together';
import { defaultServer } from '../net/Leaderboard';
import { City } from '../world/City';
import type { FreeRoamArea, StuntJump } from '../world/FreeRoamArea';
import { buildBeacon, buildChest, buildPaintPot } from '../models/CityProps';
import { openChest, RARITY_COLOURS, RARITY_NAMES } from '../gameplay/Loot';
import { CHAINS, CITY_MISSIONS, FreeMissionTracker, missionArea, type MissionEvent } from '../gameplay/CityMissions';
import { districtProgress, inRect, type DistrictProgress, type Stroke } from '../gameplay/Restoration';
import { CHALLENGES, bumpStreak, challengeAmount, challengeProgress, ensureDaily } from '../gameplay/Challenges';
import { PHOTO_SUBJECTS, subjectsInFrame, type PhotoSubject } from '../gameplay/PhotoHunt';
import { MapView, type MapMarker, type MapState } from '../ui/MapView';
import { filterChat } from '../net/ChatFilter';
import { BrandBoards, resetBrandTextures } from '../brand/BrandBoards';
import { brandSpotsFor, routeSpots } from '../brand/BrandSpots';
import { loadBrand, onBrandChange, type BrandLogo } from '../brand/Brand';
import { clearPainted } from '../brand/Watercolour';
import { analytics } from '../net/Analytics';
import { reportError } from '../net/CrashReporter';
import { FrameGuard, SafePoint, StuckWatch, finite, freeSpot } from './Guard';
import { AdminPanel } from '../ui/Admin';
import { FreeCar, FreeWalker } from '../gameplay/FreeRoam';
import { TouchControls } from '../ui/TouchControls';
import { TRIAL_VERSION, TrialSim, encodeInputs, quantizeInput, type TrialConfig } from '../gameplay/TrialSim';
import { submitRun } from '../net/Leaderboard';
import { HUB_S_OFFSET } from '../net/RemotePlayers';
import { t, type StringKey } from './i18n';
import type { RoverInput } from '../gameplay/RoverController';
import type { DistrictDef } from '../world/Districts';
import type { RaceMessage } from '../net/Net';
import { RemotePlayers } from '../net/RemotePlayers';
import { MailClient, postcardImage, type VisitedHome } from '../net/Mail';
import { SkyBrush } from '../gameplay/SkyBrush';
import { STORY_END_INK, STORY_ENDING, STORY_INK, STORY_INTRO, STORY_PAGES, findColour, nextPage, storyState } from '../gameplay/Story';
import { CAMPAIGN, endingDue, finaleReady } from '../gameplay/Campaign';
import { checkCheckpoint, type Checkpoint } from '../gameplay/Checkpoint';
import { cleanLantern, type LanternDesign } from '../ui/FestivalGames';
import { photoUrl, type ContestState } from '../ui/ContestScreen';
import { DEFAULT_HOME, homeForServer, shownKeepsakes } from '../gameplay/Home';
import { Hub as HarbourHub } from '../world/Hub';
import { Hills } from '../world/Hills';
import { WorldsEnd } from '../world/WorldsEnd';
import { CourseRun, Glider, courseInk, makeCourse, type Airspace, type Course, type GliderEvent } from '../gameplay/Glider';
import { buildBench } from '../models/Props';
import { PLANE_SEAT, buildFlightRing, buildPaperPlane, buildParachute, buildPlaneStand } from '../models/PaperPlane';
import { CarDrop, aheadOf } from '../gameplay/CarDrop';
import { BATTLE, PaintBattle, PaintGrid, TEAM_COLOURS, TEAM_TRAIL, botStep, landingPoint, makeBots, splitTeams, throwVelocity, type BattleSetup, type Bot, type Team } from '../gameplay/PaintBattle';
import type { PocketKind } from '../world/Pockets';
import { DOTS_PER_MESSAGE, TrailBrush, TrailLayer, TrailStore, nearestTrailColour, packDots, type TrailDot } from '../gameplay/PaintTrail';

type GameState = 'loading' | 'splash' | 'menu' | 'intro' | 'play' | 'paused' | 'photo' | 'hub';
type PawnMode = 'drive' | 'foot';

const SIM_DT = 1 / 60;

const TONICS: Record<TonicId, { buff: StringKey; drawback: StringKey; duration: number }> = {
  magnet: { buff: 'tonic.magnet.buff', drawback: 'tonic.magnet.down', duration: 10 },
  feather: { buff: 'tonic.feather.buff', drawback: 'tonic.feather.down', duration: 9 },
  fizzy: { buff: 'tonic.fizzy.buff', drawback: 'tonic.fizzy.down', duration: 8 },
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
  private readonly voice = new Voice({
    selfId: () => this.net.selfId,
    send: (msg) => this.net.sendRtc(msg),
    nameOf: (id) => this.net.peers.get(id)?.info?.name,
    isBlocked: (name) => this.options.blocked.includes(name),
  });
  private readonly voicePill: HTMLDivElement;
  private readonly chatHistory: { name: string; text: string }[] = [];
  private customKey = 'custom';
  private bench: { spot: number; t: number; frames: number[]; snapshot: StudioSettings; done: (r: BenchmarkResult) => void } | null = null;
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
  /** The sea, and the galaxy sky that replaces sky and sea at the World's End. */
  private water!: THREE.Mesh;
  private galaxy!: THREE.Mesh;
  /** The light before entering the World's End (put back on leaving). */
  private worldsEndEnv: { preset: string; auto: boolean } | null = null;
  /** Sitting on a bench with a view (a 'viewpoint' zone). */
  private viewing: { zone: HubZone; t: number; hudWas: boolean } | null = null;
  private readonly viewLook = { yaw: 0, pitch: 0 };
  private benches: THREE.Group | null = null;
  private readonly particles = new Particles();
  private readonly wildlife = new Wildlife();
  private readonly photo: PhotoMode;
  /** Photo mode's weather brush. */
  private readonly skyBrush = new SkyBrush();
  private brushing = false;
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
  /** The emote playing while waveTimer runs (sitdown lasts until you move). */
  private emoteName: Emote = 'wave';
  private emoteWheel!: EmoteWheel;
  private pet: Pet | null = null;
  private groupInvite!: HTMLDivElement;
  private pendingInvite: { from: string; at: GroupPhotoInvite; until: number } | null = null;
  private photoCountdown!: HTMLDivElement;
  private groupShotTimer = 0;
  // Paint the road: your trail (saved here), everyone's dabs in this place, and the batch to send.
  private readonly trailStore = new TrailStore();
  private readonly trailBrush = new TrailBrush();
  private readonly trailLayer = new TrailLayer();
  private readonly remoteTrails = new Map<string, TrailDot[]>();
  private trailPlaceId: string | null = null;
  private trailOut: TrailDot[] = [];
  private trailSendTimer = 0;
  private trailSaveTimer = 0;
  private trailPeers = 0;
  /** Playing together: a contest, a paint splash and a convoy (gameplay/Together.ts). */
  private contest: Contest | null = null;
  private contestSent = 0;
  private contestShowUntil = 0;
  private paintEvent: PaintEvent | null = null;
  /** Paint battle (gameplay/PaintBattle.ts): the rules, bots in a solo game, and what's drawn. */
  private battle: PaintBattle | null = null;
  private battleHost = '';
  private battleBots: { bot: Bot; model: HumanModel }[] = [];
  private readonly battlePaint = new TrailLayer(8000);
  private balloonMeshes: THREE.Mesh[] = [];
  private battleAim: THREE.Mesh | null = null;
  private battleShowUntil = 0;
  private battleResult: [number, number] | null = null;
  private battleDab = 0;
  private paintMeshes: THREE.Mesh[] = [];
  private readonly convoy = newConvoy();
  private convoyPing = 0;
  private togetherHud!: HTMLDivElement;
  private togetherHudAt = 0;
  /** What "Join" on the invite banner does (null = join the group photo). */
  private inviteAction: (() => void) | null = null;
  /** Player account (cloud save, friends, clubs); optional. */
  readonly account = new AccountClient();
  readonly mail = new MailClient(this.account);
  /** A photo waiting to be sent as a postcard (JPEG data URL). */
  private postcardImg: string | null = null;
  /** A friend's home being visited (shown on your plot until you go back). */
  private visitingHome: VisitedHome | null = null;
  private homeSync = 0;
  /** A photo waiting to be entered in the contest (JPEG data URL). */
  private contestImg: string | null = null;
  private winnerCheckedAt = -Infinity;
  private cloudPulled = false;
  /** Festival decorations built per area (removed when the festival or setting changes). */
  private festivalDecor = new Map<string, { festival: Festival; group: THREE.Group }>();
  private festivalGreeted: Festival | null = null;
  /** The time/weather the current district set, to undo when leaving it. */
  private districtEnv: { preset?: string; weather?: string } | null = null;
  /** The mural board being painted. */
  private muralId: string | null = null;
  private cloudDue = 0;
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
  /** Staying alive: frame errors, bad positions and getting stuck (core/Guard.ts). */
  private readonly frameGuard = new FrameGuard();
  private readonly safePoint = new SafePoint();
  private readonly stuck = new StuckWatch();
  private crashCard: HTMLDivElement | null = null;
  /** Calling the car: it drops from the sky on a paper parachute (gameplay/CarDrop.ts). */
  private readonly carDrop = new CarDrop();
  private chute: THREE.Mesh | null = null;
  private chuteFold = 1;
  private callHold = 0;
  /** The paper plane (flight mode): its physics, the ring course in progress, and the meshes. */
  private readonly glider = new Glider();
  private flight: { run: CourseRun; from: { x: number; z: number; heading: number } } | null = null;
  private readonly courses = new Map<string, Course>();
  private planeMesh: THREE.Mesh | null = null;
  private planeStand: THREE.Group | null = null;
  private readonly ringMeshes: THREE.Mesh[] = [];
  private gliderSpace: Airspace | null = null;
  /** Sim speed in free roam (slow motion during stunt jumps). */
  private timeScale = 1;
  private stuntAir: StuntJump | null = null;
  private stuntCam = 0;
  // Milestone 8: Colour the City, map, daily brushstrokes, perahera.
  private readonly mapView: MapView;
  private readonly admin: AdminPanel;
  private readonly strokeCache = new Map<string, Stroke[]>();
  private districtCache: { area: string; seen: number; list: DistrictProgress[] } | null = null;
  private readonly washShown: number[] = [];
  private districtHere = '';
  private readonly fireworks: { x: number; z: number; y: number; vy: number; delay: number; whistle: boolean }[] = [];
  private readonly torches: THREE.Vector3[] = [];
  private discoverTimer = 0;
  /** Seconds to the next quiet free-roam checkpoint. */
  private cpTimer = 30;
  /** Varna, the painter (Harbour Town): her figure and easel. */
  private varna: THREE.Group | null = null;
  /** The ending is playing. */
  private ending = false;
  /** The ending's pending lines and credits, cancelled if the player leaves. */
  private endingTimers: ReturnType<typeof setTimeout>[] = [];
  private dailyTimer = 0;
  private peraheraTime = 0;
  private peraheraAnnounced = false;
  private peraheraFirework = 4;
  // Branding: company and sponsor boards in the world, and play statistics.
  private readonly areaBoards = new Map<string, BrandBoards>();
  private routeBoards: BrandBoards | null = null;
  private nearBoard: BrandLogo | null = null;
  private beatTimer = 60;
  private readonly bootAt = performance.now();
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
    this.pipeline.onAdapt = () => this.applySettings();
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
      account: this.account,
      currentMural: () => this.muralId,
      clearTrails: () => this.clearTrails(),
      soundtrack: () => this.audio.studio,
      mail: this.mail,
      homeChanged: () => this.refreshHome(true),
      visitHome: (name) => this.visitHome(name),
      visiting: () => this.visitingHome?.name ?? null,
      wallChanged: () => this.refreshWall(),
      pendingPostcard: () => this.postcardImg,
      clearPostcard: () => (this.postcardImg = null),
      chatMode: () => this.options.chat,
      lanterns: () => this.profile.data.lanterns ?? [],
      saveLantern: (d) => {
        const p = this.profile;
        p.data.lanterns = [...(p.data.lanterns ?? []), d].slice(-3);
        // Ink once a day for a new lantern.
        if (p.markSeen(`lantern-day:${new Date().toDateString()}`)) p.data.ink += 60;
        p.markSeen('lantern');
        p.save();
        this.refreshHome(true);
        this.checkTrophies();
      },
      removeLantern: (i) => {
        const p = this.profile;
        p.data.lanterns = (p.data.lanterns ?? []).filter((_, k) => k !== i);
        p.save();
        this.refreshHome(true);
      },
      potReward: (pots) => {
        const ink = pots * 20 * (resolveFestival(this.options.festival) === 'avurudu' ? 2 : 1);
        this.profile.data.ink += ink;
        this.profile.addStat('pots', pots);
        this.profile.save();
        this.checkTrophies();
        return ink;
      },
      sound: (f, d) => this.audio.blip(f, d ?? 0.08, 'triangle', 0.05),
      pendingEntry: () => this.contestImg,
      clearEntry: () => (this.contestImg = null),
      together: (kind) => this.startTogether(kind),
      togetherState: () => ({ roam: !!this.roamChapter(), online: this.net.connected, convoy: this.convoy.leading ? 'leading' : this.convoy.leader ? 'following' : null, busy: !!this.contest || !!this.paintEvent || !!this.battle }),
      stickerAreas: () => [...this.areas.values()].map((a) => ({ id: a.id, name: a.title().name, places: a.places, secrets: a.secrets })),
      muralChanged: () => this.paintMurals(),
      socialAllowed: () => onlineAllowed(this.options.family),
      localSummary: () => ({ ink: this.profile.data.ink, trophies: this.profile.data.trophies.length }),
      useCloudSave: () => this.useCloudSave(),
      keepDeviceSave: async () => {
        await this.account.push(this.profile.data, true);
      },
      syncNow: () => this.cloudSync(),
      joinRoom: (room) => {
        if (!onlineAllowed(this.options.family)) return false;
        let server: string | null = null;
        try {
          server = localStorage.getItem('paintland.server');
        } catch {
          /* storage blocked */
        }
        this.net.connect(room, server || defaultServer(), this.playerInfo());
        void this.syncVoice();
        return true;
      },
      chapters: CHAPTERS,
      currentChapter: () => this.world.chapter,
      missions: () => this.world.missions,
      play: (id) => this.play(id),
      startMission: (m) => this.startMissionFromMenu(m),
      lookChanged: () => this.buildPawnModels(),
      vehicleChanged: () => this.buildPawnModels(),
      previewHorn: () => {
        this.unlockAudio();
        this.audio.honk(60);
      },
      showcase: (t) => this.setShowcase(t),
      netStatus: () => ({ status: this.net.status, room: this.net.room, players: [...this.net.peers.values()].map((p) => p.info?.name ?? '…') }),
      netConnect: (room, server) => {
        if (!onlineAllowed(this.options.family)) return false;
        this.net.connect(room, server, this.playerInfo());
        void this.syncVoice();
        return true;
      },
      netDisconnect: () => {
        this.voice.disable();
        this.net.disconnect();
      },
      voiceMuted: (name) => [...this.net.peers.values()].some((p) => p.info?.name === name && this.voice.muted.has(p.id)),
      reportPlayer: (name, reason, note, block) => this.reportPlayer(name, reason, note, block),
      toggleVoiceMute: (name) => {
        for (const p of this.net.peers.values()) if (p.info?.name === name) this.voice.setMuted(p.id, !this.voice.muted.has(p.id));
      },
      openStudio: () => this.studio.toggle(),
      openControls: () => this.hud.show('screenHelp', true),
      watchIntro: () => this.startIntro(),
      enterHub: () => this.enterHub(undefined, 'harbour'),
      enterCity: () => this.enterHub(undefined, 'city'),
      enterVillage: () => this.enterHub(undefined, 'village'),
      enterHills: () => this.enterHub(undefined, 'hills'),
      enterWorldsEnd: () => this.enterHub(undefined, 'worldsend'),
      runBenchmark: (done: (r: BenchmarkResult) => void) => this.runBenchmark(done),
      testRoad: (road: CustomRoad) => this.testRoad(road),
      startCityMission: (id) => this.startCityMission(id),
      cancelCityMission: () => this.freeMissions.cancel(),
      cityMission: () => this.freeMissions.mission?.id ?? null,
      freeArea: () => (this.inHub && this.area ? this.area.id : null),
      uiSound: () => this.audio.uiClick(),
      startTrial: (id) => this.startTrial(id),
      startRace: (id) => this.startRaceForAll(id),
      handling: () => this.options.handling,
      unlockAudio: () => this.unlockAudio(),
      studio: () => this.settings,
      options: () => this.options,
      settingsChanged: () => this.settingsChanged(),
      loadLut: (text) => this.pipeline.luts.loadCube(text),
      lutCustom: () => this.pipeline.luts.custom?.title ?? null,
      input: () => this.input,
      stats: () => `${this.fps.toFixed(0)} fps · ${Math.round(this.pipeline.renderScale * 100)}% render scale · ${this.renderer.info.render.calls} draw calls · ${(this.renderer.info.render.triangles / 1e6).toFixed(2)} M triangles`,
      resume: () => this.resumeFromMenu(),
      canResume: () => this.resumeSnapshot !== null,
      checkpoint: () => checkCheckpoint(this.profile.data.checkpoint)?.label ?? null,
      continueGame: () => this.continueGame(),
      playCampaign: (i) => this.playCampaign(i),
      openAdmin: () => this.admin.show(),
    });
    this.admin = new AdminPanel(container);
    this.net.onChat = (name, text) => this.incomingChat(name, text);
    this.remotes.hidden = (name) => this.options.blocked.includes(name);
    this.remotes.speaking = (id) => this.voice.speaking(id);
    this.net.onRtc = (from, msg) => void this.voice.onMessage(from, msg).catch(() => this.voice.drop(from));
    this.voicePill = document.createElement('div');
    this.voicePill.className = 'voice-pill';
    this.voicePill.setAttribute('role', 'status');
    container.appendChild(this.voicePill);
    this.mapView = new MapView(container);
    this.mapView.onTravel = (id) => this.fastTravel(id);
    this.mapView.onClose = () => this.closeMap();
    this.mapView.onOpen = () => this.openMap();
    this.net.onRace = (msg, from) => this.onRaceMessage(msg, from);
    this.net.onGroupPhoto = (from, name, at) => this.onGroupPhotoInvite(from, name, at);
    this.net.onTrail = (_from, name, place, dots) => this.onRemoteTrail(name, place, dots);
    this.scene.add(this.trailLayer.group);
    this.scene.add(this.battlePaint.group);
    // Keep the trail when the tab or app closes between autosaves.
    addEventListener('pagehide', () => this.trailStore.save());
    document.addEventListener('visibilitychange', () => document.hidden && this.trailStore.save());
    this.net.onTogether = (from, name, msg) => this.onTogether(from, name, msg);
    this.remotes.badge = (id) => {
      const team = this.battle?.teams.get(id);
      return team === undefined ? '' : `<b style="color:${TEAM_COLOURS[team]}">●</b> `;
    };
    this.togetherHud = document.createElement('div');
    this.togetherHud.className = 'together-hud hidden';
    this.togetherHud.setAttribute('role', 'status');
    this.togetherHud.setAttribute('aria-live', 'polite');
    container.appendChild(this.togetherHud);
    // Signed-in players prove their name to the relay (never sent in tab rooms).
    this.net.accountToken = () => this.account.token;
    this.profile.onChange(() => {
      if (this.account.signedIn && !this.cloudDue) this.cloudDue = performance.now() + 20_000;
    });
    window.setInterval(() => this.accountTick(), 5000);
    if (this.account.signedIn)
      window.setTimeout(() => {
        void this.cloudSync().then((r) => {
          if (r === 'conflict') this.menu.toast(t('acct.conflictToast'));
        });
      }, 3000);
    this.emoteWheel = new EmoteWheel(container);
    this.groupInvite = document.createElement('div');
    this.groupInvite.className = 'group-invite hidden';
    this.groupInvite.setAttribute('role', 'status');
    container.appendChild(this.groupInvite);
    this.groupInvite.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (b?.dataset.gp === 'join') {
        const act = this.inviteAction;
        if (act) {
          this.hideGroupInvite();
          act();
        } else this.joinGroupPhoto();
      } else if (b) this.hideGroupInvite();
    });
    this.photoCountdown = document.createElement('div');
    this.photoCountdown.className = 'photo-countdown hidden';
    this.photoCountdown.setAttribute('aria-live', 'assertive');
    container.appendChild(this.photoCountdown);
    this.photo = new PhotoMode(container, {
      studio: () => this.settings,
      studioChanged: () => this.settingsChanged(),
      setTime: (id) => this.env.setPreset(id),
      setWeather: (w) => this.env.setWeather(w),
      capture: (m) => this.capturePhoto(m),
      exit: () => this.exitPhoto(),
      groupPhoto: () => this.startGroupPhoto(),
      postcard: () => this.makePostcard(),
      contest: () => this.makeContestEntry(),
      brush: (kind) => (this.skyBrush.kind = kind),
      brushSize: (v) => (this.skyBrush.size = v),
      brushClear: () => this.skyBrush.clear(),
    });
    this.scene.add(this.skyBrush.particles.points);
    void this.audio.loadSoundtrack();
    // Painting weather into the photo: drag on the picture while a brush is chosen.
    const canvas = this.renderer.domElement;
    const paintAt = (e: PointerEvent): void => {
      const r = canvas.getBoundingClientRect();
      const n = this.skyBrush.paint(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, this.rig.camera);
      if (n && this.skyBrush.painted > 300) this.profile.markSeen('brush');
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== 'photo' || !this.skyBrush.kind) return;
      this.brushing = true;
      canvas.setPointerCapture?.(e.pointerId);
      paintAt(e);
    });
    canvas.addEventListener('pointermove', (e) => this.brushing && this.state === 'photo' && paintAt(e));
    const stop = (): void => {
      if (this.brushing) this.checkTrophies();
      this.brushing = false;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

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
    analytics.enabled = this.options.analytics;
    analytics.start({
      lang: document.documentElement.lang,
      device: matchMedia('(pointer: coarse)').matches ? 'touch' : 'desktop',
      quality: this.settings.quality,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    onBrandChange(() => {
      clearPainted();
      resetBrandTextures();
      for (const b of this.areaBoards.values()) void b.refresh();
      void this.routeBoards?.refresh();
      this.menu.refreshBrand();
    });
    void loadBrand();
    this.sky = createSky();
    this.water = createWater();
    this.galaxy = createGalaxySky();
    this.scene.add(this.sky, this.galaxy, this.water, this.particles.points, this.wildlife.group);
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
    this.applyCalendar();
    this.resize();
    await step(1, 'ready');
    this.director.update(0.016, 0, { s: this.rover.s, x: 0, h: 0, position: this.vehicle.root.position.clone() });
    this.renderer.compile(this.scene, this.rig.camera);
    // Let the "presents" card finish painting in before the title.
    const shown = performance.now() - this.bootAt;
    if (shown < 2600) await new Promise((r) => setTimeout(r, 2600 - shown));
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
    if (this.world?.chapter === chapter) return;
    this.world?.dispose();
    this.world = new World(chapter);
    this.scene.add(this.world.group);
    this.routeBoards = new BrandBoards(`route:${chapter.id}`, routeSpots(this.world.path), chapter.id.length * 31 + 5);
    this.world.group.add(this.routeBoards.group);
    void this.routeBoards.refresh();
    // A Road Studio test drive is not remembered as the chapter to resume.
    if (chapter.id !== 'custom') {
      this.profile.data.chapter = chapter.id;
      this.profile.save();
    }
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
    this.loadGhostFor(this.lapKey());
  }

  // ————— emotes, pets and group photos —————

  private toggleEmoteWheel(): void {
    if (this.emoteWheel.isOpen) {
      this.emoteWheel.close();
      return;
    }
    if (this.mode !== 'foot') {
      this.popAtPawn(t('emote.onFoot'), 'info');
      return;
    }
    this.input.releasePointerLock();
    this.emoteWheel.open((e) => this.startEmote(e));
  }

  startEmote(e: Emote): void {
    this.emoteName = e;
    this.profile.addStat('emotes');
    this.profile.markSeen(`emote:${e}`);
    this.waveTimer = e === 'sitdown' ? Infinity : e === 'dance' ? 6 : 2.8;
  }

  /** Emotes stop when you walk off (sitting down lasts until then). */
  private tickEmote(dt: number, speed: number): void {
    if (speed > 0.5) this.waveTimer = 0;
    else if (this.waveTimer > 0) this.waveTimer -= dt;
  }

  /** The pet trots after you on foot and waits in the car while you drive. */
  private updatePet(dt: number, owner: THREE.Object3D): void {
    const pet = this.pet;
    if (!pet) return;
    pet.root.visible = owner.visible;
    const fwd = _v4.set(0, 0, -1).applyQuaternion(owner.quaternion);
    pet.update(dt, owner.position, Math.atan2(-fwd.x, -fwd.z), this.time);
  }

  private hidePet(): void {
    if (!this.pet) return;
    this.pet.root.visible = false;
    this.pet.reset();
  }

  // ————— paint the road —————

  /** Where a trail belongs: the chapter being driven or the free-roam area (null: nowhere, e.g. a Road Studio test). */
  private trailPlace(): string | null {
    if (this.inHub) return this.roamChapter();
    const id = this.world.chapter.id;
    return id === 'custom' ? null : id;
  }

  private toggleTrail(): void {
    const on = !this.trailBrush.on;
    if (on && !this.trailPlace()) return;
    this.trailBrush.on = on;
    this.menu.toast(on ? t('trail.on') : t('trail.off'));
    if (on) this.profile.addStat('trails');
    else this.trailStore.save();
  }

  /** Dabs paint as you drive; they are saved every few seconds and sent to the room once a second. */
  private tickTrail(dt: number): void {
    const place = this.trailPlace();
    if (place !== this.trailPlaceId) {
      this.trailStore.save();
      this.trailPlaceId = place;
      this.trailOut = [];
      this.trailLayer.set(place ? [...(this.remoteTrails.get(place) ?? []), ...this.trailStore.dots(place)] : []);
    }
    if (!place) return;
    const driving = (this.state === 'play' || this.state === 'hub') && this.mode === 'drive';
    const grounded = this.inHub ? this.hubCar.grounded : this.rover.grounded;
    const speed = Math.abs(this.inHub ? this.hubCar.v : this.rover.v);
    const root = this.vehicle.root;
    root.updateMatrixWorld();
    const pos = _v4.setFromMatrixPosition(root.matrixWorld);
    const up = _v3.setFromMatrixColumn(root.matrixWorld, 1).normalize();
    const own = this.options.trailColour;
    const colour = own >= 0 ? own : nearestTrailColour(this.profile.vehicleLook(this.profile.data.vehicle).body);
    const dot = driving && speed > 1 ? this.trailBrush.update(pos, up, grounded, colour, speed) : this.trailBrush.update(pos, up, false, colour, 0);
    if (dot) {
      this.trailStore.add(place, dot);
      this.trailLayer.add(dot);
      this.profile.addStat('trailDots');
      if (this.net.connected) this.trailOut.push(dot);
    }
    // Someone new in the room: show them the end of our trail here too.
    const peers = this.net.connected ? this.net.peers.size : 0;
    if (peers > this.trailPeers) this.trailOut = [...this.trailStore.dots(place).slice(-DOTS_PER_MESSAGE * 4), ...this.trailOut];
    this.trailPeers = peers;
    this.trailSendTimer -= dt;
    if (this.trailOut.length && this.trailSendTimer <= 0 && this.net.connected) {
      this.trailSendTimer = 0.25;
      this.net.trail(place, packDots(this.trailOut.splice(0, DOTS_PER_MESSAGE)));
    }
    this.trailSaveTimer -= dt;
    if (this.trailSaveTimer <= 0) {
      this.trailSaveTimer = 5;
      this.trailStore.save();
    }
  }

  private onRemoteTrail(name: string, place: string, dots: TrailDot[]): void {
    if (this.options.blocked.includes(name)) return;
    const list = this.remoteTrails.get(place) ?? [];
    list.push(...dots);
    if (list.length > this.trailLayer.capacity / 2) list.splice(0, list.length - this.trailLayer.capacity / 2);
    this.remoteTrails.set(place, list);
    if (place === this.trailPlaceId) for (const d of dots) this.trailLayer.add(d);
  }

  private clearTrails(): number {
    const n = this.trailStore.total;
    this.trailStore.clear();
    this.trailLayer.set(this.trailPlaceId ? this.remoteTrails.get(this.trailPlaceId) ?? [] : []);
    return n;
  }

  // ————— postcards and your home —————

  private harbourHome(): HarbourHub | null {
    const a = this.areas.get('harbour');
    return a instanceof HarbourHub ? a : null;
  }

  /** Rebuild the home on its plot (yours, or the friend's you are visiting); push yours to the server. */
  private refreshHome(changed: boolean): void {
    const hub = this.harbourHome();
    const p = this.profile;
    const layout = p.data.home ?? DEFAULT_HOME;
    const v = this.visitingHome;
    hub?.home.set(
      v
        ? { walls: v.home.walls, roof: v.home.roof, keepsakes: v.home.keepsakes as PocketKind[], trophies: v.home.trophies, owner: t('home.of', { name: v.name }) }
        : { walls: layout.walls, roof: layout.roof, keepsakes: shownKeepsakes(layout, p.data.seen), trophies: p.data.trophies.length, owner: t('home.of', { name: p.data.name }), lanterns: (p.data.lanterns ?? []).map(cleanLantern).filter((l): l is LanternDesign => !!l) },
    );
    this.refreshWall();
    // Tell the server (friends visit what it has), at most every few seconds.
    if (changed && this.account.signedIn && !v) {
      clearTimeout(this.homeSync);
      this.homeSync = window.setTimeout(() => void this.mail.saveHome(homeForServer(layout, p.data.seen, p.data.trophies.length)), 1500);
    }
  }

  /** The postcards pinned on the wall of the home being shown. */
  private refreshWall(): void {
    const hub = this.harbourHome();
    if (!hub) return;
    const v = this.visitingHome;
    const load = (ids: string[]) =>
      Promise.all(ids.slice(0, 6).map((id) => this.mail.picture(id))).then((pics) => {
        // Still showing the same home?
        if (this.visitingHome === v) hub.home.setPictures(pics);
      });
    if (v) void load(v.cards.map((c) => c.id));
    else if (this.account.signedIn)
      void this.mail.inbox().then((r) => {
        if (typeof r !== 'string') void load(r.filter((c) => c.pinned).map((c) => c.id));
      });
    else hub.home.setPictures([]);
  }

  private async visitHome(name: string | null): Promise<string | null> {
    if (!name) {
      this.visitingHome = null;
      this.refreshHome(false);
      return null;
    }
    const r = await this.mail.visit(name);
    if (typeof r === 'string') return r;
    this.visitingHome = r;
    this.refreshHome(false);
    this.profile.markSeen(`visit:${r.name.toLowerCase()}`);
    this.checkTrophies();
    // Walk them over: the home is in Harbour Town.
    this.menu.show('none');
    this.enterHub({ area: 'harbour', x: -68, z: 30, heading: Math.PI, foot: null }, 'harbour');
    return null;
  }

  /** Photo mode → Enter the contest: a 960 × 600 picture, then the entry form. */
  private makeContestEntry(): void {
    if (!this.lastFx) return;
    this.pipeline.render(this.scene, this.rig.camera, 0, this.time, this.lastFx);
    this.contestImg = postcardImage(this.renderer.domElement, 0.8, 960, 600, 225_000);
    this.exitPhoto();
    this.openMenu('contest');
  }

  /**
   * Last week's winning photo on a billboard in Serendib City (and one in
   * Harbour Town), with the photographer's name. Checked at most every 10 minutes.
   */
  private async refreshWinnerBoard(force = false): Promise<void> {
    if (!force && performance.now() - this.winnerCheckedAt < 600_000) return;
    this.winnerCheckedAt = performance.now();
    const r = await api<ContestState & { ok: boolean }>('/api/photos');
    const w = r.ok ? r.data?.winner : null;
    const boards = ['city', 'harbour'].map((id) => this.areaBoards.get(id)).filter((b): b is BrandBoards => !!b);
    if (!w) {
      for (const b of boards) b.feature(0, null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photoUrl(w.id);
    try {
      await img.decode();
    } catch {
      return;
    }
    for (const b of boards) {
      const [bw, bh] = b.boardSize(0) ?? [4, 2.5];
      b.feature(0, winnerPicture(img, w.name, w.caption, bw / bh, t('pc.boardTitle')));
    }
  }

  /** Photo mode → Postcard: render the frame small and open the send form. */
  private makePostcard(): void {
    if (!this.lastFx) return;
    this.pipeline.render(this.scene, this.rig.camera, 0, this.time, this.lastFx);
    this.postcardImg = postcardImage(this.renderer.domElement);
    this.exitPhoto();
    this.openMenu('postcard');
  }

  /** The free-roam area id other players see (as in PlayerState.chapter). */
  private roamChapter(): string | null {
    return this.inHub && this.area ? (this.area.id === 'harbour' ? 'hub' : this.area.id) : null;
  }

  /** Photo mode → Group photo: line the camera up in front of you, invite everyone near, count down, snap. */
  private startGroupPhoto(): void {
    const chapter = this.roamChapter();
    if (!chapter || this.mode !== 'foot' || this.state !== 'photo') {
      this.menu.toast(t('group.needFoot'));
      return;
    }
    const w = this.hubWalker;
    if (this.net.connected) this.net.groupPhoto({ chapter, x: w.x, z: w.z, yaw: w.heading });
    // Camera 7 m in front, a little above head height, looking back at you.
    const pc = this.photoCam;
    const fx = -Math.sin(w.heading);
    const fz = -Math.cos(w.heading);
    pc.pos.set(w.x + fx * 7, HUB_Y + w.y + 2.4, w.z + fz * 7);
    pc.yaw = w.heading + Math.PI;
    pc.pitch = -0.1;
    this.startEmote('cheer');
    this.groupShotTimer = 6;
    this.profile.addStat('groupPhotos');
  }

  private tickGroupPhoto(dt: number): void {
    if (this.groupShotTimer <= 0) return;
    this.groupShotTimer -= dt;
    const n = Math.ceil(this.groupShotTimer);
    // 3 · 2 · 1 over the last three seconds (before that, others have time to join).
    this.photoCountdown.textContent = String(n);
    this.photoCountdown.classList.toggle('hidden', this.groupShotTimer <= 0 || n > 3);
    if (this.groupShotTimer <= 1.2 && this.waveTimer < 1.5) this.startEmote('cheer');
    if (this.groupShotTimer <= 0) {
      this.photoCountdown.classList.add('hidden');
      if (this.state === 'photo') this.capturePhoto(1);
    }
  }

  private onGroupPhotoInvite(from: string, name: string, at: GroupPhotoInvite): void {
    const o = this.options;
    if (o.blocked.includes(name) || this.roamChapter() !== at.chapter) return;
    const me = this.mode === 'foot' ? this.hubWalker : this.hubCar;
    if (Math.hypot(me.x - at.x, me.z - at.z) > 80) return;
    this.pendingInvite = { from, at, until: performance.now() + 8000 };
    this.inviteAction = null;
    this.groupInvite.innerHTML = `<span>📸 ${escapeHtml(t('group.invite', { name }))}</span><button class="btn primary" data-gp="join">${t('group.join')}</button><button class="btn" data-gp="no" aria-label="${t('group.dismiss')}">✕</button>`;
    this.groupInvite.classList.remove('hidden');
    window.setTimeout(() => {
      if (this.pendingInvite && performance.now() >= this.pendingInvite.until) this.hideGroupInvite();
    }, 8100);
  }

  private hideGroupInvite(): void {
    this.pendingInvite = null;
    this.inviteAction = null;
    this.groupInvite.classList.add('hidden');
  }

  /** Stand in the group beside the photographer (a spot picked from our id so friends don't pile up). */
  private joinGroupPhoto(): void {
    const inv = this.pendingInvite;
    this.hideGroupInvite();
    if (!inv || this.roamChapter() !== inv.at.chapter || this.state !== 'hub') return;
    if (this.mode === 'drive') {
      if (Math.abs(this.hubCar.v) > 4 || this.hubCar.y < -0.5) return;
      this.mode = 'foot';
      this.seatHuman();
      this.updateHeadVisibility();
    }
    const spots = [[1.3, 0], [-1.3, 0], [2.6, 0], [-2.6, 0], [0.65, 1.3], [-0.65, 1.3], [1.95, 1.3], [-1.95, 1.3]];
    let h = 0;
    for (const c of this.net.selfId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const [side, back] = spots[h % spots.length];
    const { x, z, yaw } = inv.at;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    this.hubWalker.place(x + rx * side + Math.sin(yaw) * back, z + rz * side + Math.cos(yaw) * back, yaw);
    this.hubCam.yaw = yaw;
    this.hubCam.snap = true;
    this.pet?.reset();
    this.startEmote('cheer');
  }

  /** Seasons tint leaves and grass; festivals dress the current free-roam area. */
  private applyCalendar(): void {
    applySeason(resolveSeason(this.options.season));
    const festival = resolveFestival(this.options.festival);
    const area = this.inHub ? this.area : null;
    for (const [id, d] of this.festivalDecor) {
      if (d.festival === festival) continue;
      d.group.removeFromParent();
      d.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      this.festivalDecor.delete(id);
    }
    if (!area || !festival) return;
    if (!this.festivalDecor.has(area.id)) {
      const group = buildFestivalDecor(festival, area);
      area.group.add(group);
      this.festivalDecor.set(area.id, { festival, group });
    }
    this.profile.markSeen(`festival:${festival}`);
    if (this.festivalGreeted !== festival) {
      this.festivalGreeted = festival;
      this.hud.lootCard(t(`fest.${festival}`), '#f4d23b', t(`fest.${festival}.hi`), t('fest.decorated'));
    }
  }

  /** Show this player's murals on the boards of the current area. */
  private paintMurals(): void {
    for (const b of this.area?.murals ?? []) paintMural(b, this.profile.data.murals?.[b.id] ?? null);
  }

  // ————— account: cloud save and presence —————

  /** Pull once after signing in, then push this device's progress (asks when both changed). */
  private async cloudSync(): Promise<'ok' | 'conflict' | 'offline'> {
    const a = this.account;
    if (!a.signedIn) return 'offline';
    if (!this.cloudPulled) {
      this.cloudPulled = true;
      if (await a.pull()) {
        if (!this.profile.isFresh()) return 'conflict';
        this.useCloudSave();
        return 'ok';
      }
    }
    const r = await a.push(this.profile.data);
    if (r === 'ok') this.cloudDue = 0;
    return r;
  }

  private useCloudSave(): void {
    const save = this.account.acceptCloud();
    if (!save) return;
    this.profile.replace(save);
    this.paintMurals();
    this.cloudDue = 0;
    this.buildPawnModels();
    if (this.menu.screen !== 'none') this.menu.show(this.menu.screen);
  }

  /** Every few seconds: upload changes (at most every 20 s) and tell friends we're around. */
  private accountTick(): void {
    const a = this.account;
    if (!a.signedIn) return;
    const now = performance.now();
    if (this.cloudDue && now >= this.cloudDue && !a.conflict) {
      this.cloudDue = 0;
      void this.cloudSync().then((r) => {
        if (r === 'conflict') this.menu.toast(t('acct.conflictToast'));
      });
    }
    if (now - this.presenceAt > 60_000 && onlineAllowed(this.options.family)) {
      this.presenceAt = now;
      a.presence(this.net.connected ? this.net.room : null);
    }
  }
  private presenceAt = -Infinity;

  // ————— playing together: convoys, contests, paint splashes —————

  private showInvite(text: string, join: () => void): void {
    this.pendingInvite = null;
    this.groupInvite.innerHTML = `<span>${escapeHtml(text)}</span><button class="btn primary" data-gp="join">${t('group.join')}</button><button class="btn" data-gp="no" aria-label="${t('group.dismiss')}">✕</button>`;
    this.groupInvite.classList.remove('hidden');
    this.inviteAction = join;
    const shown = this.groupInvite.innerHTML;
    window.setTimeout(() => {
      if (this.groupInvite.innerHTML === shown) this.hideGroupInvite();
    }, 10_000);
  }

  /** Menu → Multiplayer → Play together. Returns a message to show, or null. */
  private startTogether(kind: 'convoy' | ContestMode | 'paint' | 'battle'): string | null {
    const chapter = this.roamChapter();
    if (!chapter) return t('tg.needRoam');
    if (kind === 'convoy') {
      if (!this.net.connected) return t('tg.needRoom');
      if (this.convoy.leading) {
        this.convoy.leading = false;
        this.convoy.followers.clear();
        this.net.together({ type: 'convoy', on: false, chapter });
        return t('tg.convoyEnded');
      }
      this.convoy.leader = null;
      this.convoy.leading = true;
      this.convoy.nextLeaderPay = 0;
      this.net.together({ type: 'convoy', on: true, chapter });
      return t('tg.convoyLead');
    }
    if (this.contest || this.paintEvent || this.battle) return t('tg.busy');
    const id = `${kind}-${Math.random().toString(36).slice(2, 10)}`;
    if (kind === 'battle') {
      const p = this.mode === 'foot' ? this.hubWalker : this.hubCar;
      const me = this.selfBattleId();
      // Friends in the same place play; alone (or offline), bots fill two teams of three.
      const friends = this.net.connected ? [...this.net.peers.values()].filter((q) => q.info?.chapter === chapter && !this.options.blocked.includes(q.info?.name ?? '')).map((q) => q.id).slice(0, 15) : [];
      const setup: BattleSetup = friends.length
        ? { id, cx: p.x, cz: p.z, teams: splitTeams([me, ...friends]) }
        : { id, cx: p.x, cz: p.z, teams: [[me, 0]] };
      this.beginBattle(setup, me, friends.length === 0);
      if (friends.length) this.net.together({ type: 'battle', id, chapter, cx: p.x, cz: p.z, teams: setup.teams });
      return t('pb.soon');
    }
    if (kind === 'paint') {
      const p = this.mode === 'foot' ? this.hubWalker : this.hubCar;
      const seed = Math.floor(Math.random() * 2 ** 30);
      this.beginPaint(id, seed, p.x, p.z, this.net.peers.size + 1);
      if (this.net.connected) this.net.together({ type: 'paint', id, seed, chapter, cx: p.x, cz: p.z });
      return t('tg.paintSoon');
    }
    this.contest = newContest(id, kind, this.time);
    if (this.net.connected) this.net.together({ type: 'contest', id, mode: kind, chapter });
    return t('tg.contestSoon');
  }

  private beginPaint(id: string, seed: number, cx: number, cz: number, players: number): void {
    const area = this.area!;
    const drops = paintDrops(seed, cx, cz, (x, z) => area.world.resolve({ x, z }, 1.2) === null);
    this.paintEvent = newPaintEvent(id, drops, this.time, players);
    const colours = ['#d8463a', '#f4d23b', '#3e6fa8', '#e8559a', '#5dbb3f'];
    this.clearPaintMeshes();
    this.paintMeshes = drops.map((d, i) => {
      const m = new THREE.Mesh(
        new ModelKit().cylinder(0.45, 0.4, 0.6, 10, colours[i % colours.length], { position: [0, 0.3, 0], nightGlow: 1 }).cylinder(0.47, 0.47, 0.08, 10, '#2b2622', { position: [0, 0.62, 0] }).blob(0.3, colours[i % colours.length], { position: [0, 0.75, 0], scale: [1, 0.5, 1], detail: 0 }).build(0.01, i),
        this.pickupMaterial,
      );
      m.position.set(d.x, HUB_Y, d.z);
      this.scene.add(m);
      return m;
    });
  }

  private clearPaintMeshes(): void {
    for (const m of this.paintMeshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    this.paintMeshes = [];
  }

  private onTogether(from: string, name: string, msg: TogetherMsg): void {
    const chapter = this.roamChapter();
    if (this.options.blocked.includes(name)) return;
    switch (msg.type) {
      case 'convoy':
        if (!msg.on) {
          if (this.convoy.leader === from) {
            this.convoy.leader = null;
            this.menu.toast(t('tg.convoyOver', { name }));
          }
          return;
        }
        if (msg.chapter !== chapter || this.convoy.leading) return;
        this.showInvite(`🚗 ${t('tg.convoyInvite', { name })}`, () => {
          this.convoy.leader = from;
          this.convoy.leaderName = name;
          this.convoy.close = 0;
        });
        return;
      case 'ping':
        if (this.convoy.leading && msg.leader === this.net.selfId) this.convoy.followers.set(from, this.time);
        return;
      case 'contest':
        if (msg.chapter !== chapter || this.contest || this.paintEvent) return;
        this.showInvite(`🏁 ${t(msg.mode === 'drift' ? 'tg.driftInvite' : 'tg.stuntInvite', { name })}`, () => {
          if (!this.contest && this.roamChapter() === msg.chapter) this.contest = newContest(msg.id, msg.mode, this.time);
        });
        return;
      case 'score':
        if (this.contest?.id === msg.id) acceptScore(this.contest, name, msg.score, this.time);
        return;
      case 'paint':
        if (msg.chapter !== chapter || this.contest || this.paintEvent) return;
        this.showInvite(`🎨 ${t('tg.paintInvite', { name })}`, () => {
          if (!this.paintEvent && this.roamChapter() === msg.chapter) this.beginPaint(msg.id, msg.seed, msg.cx, msg.cz, this.net.peers.size + 1);
        });
        return;
      case 'take':
        if (this.paintEvent?.id === msg.id && takeDrop(this.paintEvent, msg.drop, false, this.time)) this.paintMeshes[msg.drop]?.removeFromParent();
        return;
      case 'battle': {
        const me = this.selfBattleId();
        if (msg.chapter !== chapter || this.contest || this.paintEvent || this.battle || !msg.teams.some(([id]) => id === me)) return;
        this.showInvite(`🎈 ${t('pb.invite', { name })}`, () => {
          if (!this.battle && this.roamChapter() === msg.chapter) this.beginBattle({ id: msg.id, cx: msg.cx, cz: msg.cz, teams: msg.teams }, from, false);
        });
        return;
      }
      case 'shot': {
        const b = this.battle;
        if (!b || b.setup.id !== msg.id) return;
        // The throw has to start near where that player really is.
        const peer = this.net.peers.get(from);
        const snap = peer ? this.net.sample(peer) : null;
        if (!snap || Math.hypot(snap.x - msg.x, snap.s - HUB_S_OFFSET - msg.z) > 8) return;
        b.throw(from, { x: msg.x, y: msg.y, z: msg.z }, { x: msg.vx, y: msg.vy, z: msg.vz }, this.time);
        return;
      }
      case 'result':
        // The host's count settles it, so everyone sees the same winner.
        if (this.battle?.setup.id === msg.id && from === this.battleHost) this.battleResult = [msg.pink / 1000, msg.teal / 1000];
        return;
      case 'splatted': {
        const b = this.battle;
        if (!b || b.setup.id !== msg.id || !b.teams.has(from)) return;
        b.out.set(from, BATTLE.respawn);
        if (msg.by === this.selfBattleId()) {
          b.hits++;
          this.audio.chime(76);
          this.popAtPawn(t('pb.gotThem', { name }), 'good');
        }
        return;
      }
    }
  }

  private contestLanding(air: number): void {
    const c = this.contest;
    if (!c || c.mode !== 'stunt' || this.time < c.startAt || this.time > c.endAt) return;
    const pts = stuntPoints(air);
    if (pts) {
      c.mine += pts;
      this.popAtPawn(`+${pts}`, 'good');
    }
  }

  /** Per frame in a free-roam area. */
  private togetherTick(dt: number): void {
    const now = this.time;
    const drive = this.mode === 'drive';
    const me = drive ? this.hubCar : this.hubWalker;
    // Contest.
    const c = this.contest;
    if (c && !c.done) {
      if (c.mode === 'drift' && drive && now >= c.startAt && now <= c.endAt) c.mine += driftPoints(dt, Math.abs(this.hubCar.v), this.hubCar.drifting);
      if (this.net.connected && now >= c.startAt && now - this.contestSent > 2) {
        this.contestSent = now;
        this.net.together({ type: 'score', id: c.id, score: Math.round(c.mine) });
      }
      if (now > c.endAt + 2) {
        c.done = true;
        const table = standings(c, this.profile.data.name);
        const won = table[0].me && table.length > 1 && table[0].score > 0;
        const ink = CONTEST_INK.part + (won ? CONTEST_INK.win : 0);
        this.profile.addStat('contests');
        if (won) this.profile.addStat('contestWins');
        this.profile.earn(ink);
        this.checkTrophies();
        this.audio.cheer();
        this.hud.lootCard(t(c.mode === 'drift' ? 'tg.drift' : 'tg.stunt'), '#f4d23b', won ? t('tg.youWon') : t('tg.place', { n: table.findIndex((r) => r.me) + 1 }), `+${ink} ink`);
        this.contestShowUntil = now + 8;
      }
    } else if (c && now > this.contestShowUntil) this.contest = null;
    // Paint splash.
    const e = this.paintEvent;
    if (e && !e.done) {
      for (const i of dropsNear(e, me.x, me.z, drive ? 2.6 : 1.6)) {
        if (!takeDrop(e, i, true, now)) continue;
        this.paintMeshes[i]?.removeFromParent();
        this.audio.chime(72 + (e.mine % 5) * 2);
        if (this.net.connected) this.net.together({ type: 'take', id: e.id, drop: i });
      }
      for (const [i, m] of this.paintMeshes.entries()) if (m.parent) m.rotation.y = now * 1.5 + i;
      if (e.team >= e.target || now > e.endAt) {
        e.done = true;
        const success = e.team >= e.target;
        if (success) {
          this.profile.addStat('paintSplashes');
          this.profile.earn(PAINT_INK);
          this.checkTrophies();
          this.audio.cheer();
          this.splash = 1;
        }
        this.hud.lootCard(t('tg.paint'), '#e8559a', success ? t('tg.paintDone') : t('tg.paintMissed'), success ? `+${PAINT_INK} ink` : `${e.team}/${e.target}`);
        window.setTimeout(() => {
          if (this.paintEvent === e) {
            this.paintEvent = null;
            this.clearPaintMeshes();
          }
        }, 6000);
      }
    }
    this.battleTick(dt);
    // Convoy.
    const cv = this.convoy;
    if (cv.leader) {
      const peer = this.net.peers.get(cv.leader);
      const snap = peer ? this.net.sample(peer) : null;
      if (!peer || !snap || snap.chapter !== this.roamChapter()) {
        if (!peer) cv.leader = null;
      } else {
        const dist = Math.hypot(snap.x - me.x, snap.s - HUB_S_OFFSET - me.z);
        const ink = convoyTick(cv, dt, dist, drive ? Math.abs(this.hubCar.v) : 0);
        if (ink) {
          this.profile.earn(ink);
          this.profile.addStat('convoyInk', ink);
          this.popAtPawn(`🚗 +${ink}`, 'good');
        }
        if (dist < 40 && now - this.convoyPing > 10) {
          this.convoyPing = now;
          this.net.together({ type: 'ping', leader: cv.leader });
        }
      }
    }
    const lead = leaderTick(cv, now);
    if (lead) {
      this.profile.earn(lead);
      this.popAtPawn(`🚗 +${lead}`, 'good');
    }
    this.drawTogetherHud(me);
  }

  private drawTogetherHud(me: { x: number; z: number }): void {
    if (this.time - this.togetherHudAt < 0.25) return;
    this.togetherHudAt = this.time;
    const now = this.time;
    const lines: string[] = [];
    const c = this.contest;
    if (c) {
      const title = t(c.mode === 'drift' ? 'tg.drift' : 'tg.stunt');
      const left = now < c.startAt ? t('tg.startsIn', { s: Math.ceil(c.startAt - now) }) : c.done ? t('tg.finished') : t('tg.timeLeft', { s: Math.ceil(c.endAt - now) });
      const rows = standings(c, this.profile.data.name)
        .slice(0, 4)
        .map((r, i) => `<li class="${r.me ? 'me' : ''}">${i + 1}. ${escapeHtml(r.name)} <b>${r.score}</b></li>`)
        .join('');
      lines.push(`<div><b>🏁 ${title}</b> · ${left}<ol>${rows}</ol></div>`);
    }
    const e = this.paintEvent;
    if (e) {
      const left = now < e.startAt ? t('tg.startsIn', { s: Math.ceil(e.startAt - now) }) : e.done ? t('tg.finished') : t('tg.timeLeft', { s: Math.ceil(e.endAt - now) });
      const pct = Math.min(100, Math.round((100 * e.team) / e.target));
      lines.push(`<div><b>🎨 ${t('tg.paint')}</b> · ${left}<div class="tg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${e.target}" aria-valuenow="${e.team}"><i style="width:${pct}%"></i></div><small>${t('tg.team', { n: e.team, target: e.target, mine: e.mine })}</small></div>`);
    }
    const b = this.battle;
    if (b) {
      const left = now < b.startAt ? t('tg.startsIn', { s: Math.ceil(b.startAt - now) }) : b.done ? t('tg.finished') : t('tg.timeLeft', { s: Math.ceil(b.endAt - now) });
      const [pa, pb] = this.battleResult ?? b.shares();
      const my = b.teams.get(this.selfBattleId()) ?? 0;
      const tank = Math.round(b.tank * 100);
      lines.push(`<div><b>🎈 ${t('pb.title')}</b> · ${left}<div class="tg-bar pb-bar"><i style="width:${(pa * 100).toFixed(1)}%;background:${TEAM_COLOURS[0]}"></i><i style="width:${(pb * 100).toFixed(1)}%;background:${TEAM_COLOURS[1]};margin-left:auto"></i></div><small>${t('pb.score', { pink: Math.round(pa * 100), teal: Math.round(pb * 100) })} · ${t(my === 0 ? 'pb.youPink' : 'pb.youTeal')} · 🎈 ${tank}% · ${t('pb.hits', { n: b.hits })}</small></div>`);
    }
    if (this.convoy.leading) lines.push(`<div>🚗 ${t('tg.leading', { n: [...this.convoy.followers.values()].filter((at) => now - at < 30).length })}</div>`);
    else if (this.convoy.leader) {
      const peer = this.net.peers.get(this.convoy.leader);
      const snap = peer ? this.net.sample(peer) : null;
      const d = snap ? Math.round(Math.hypot(snap.x - me.x, snap.s - HUB_S_OFFSET - me.z)) : null;
      lines.push(`<div>🚗 ${t('tg.following', { name: escapeHtml(this.convoy.leaderName) })}${d !== null ? ` · ${d} m` : ''}</div>`);
    }
    const html = lines.join('');
    this.togetherHud.classList.toggle('hidden', !html || this.state === 'photo');
    if (this.togetherHud.innerHTML !== html) this.togetherHud.innerHTML = html;
  }

  /** Leaving free roam ends what was going on. */
  private endTogether(): void {
    if (this.convoy.leading && this.net.connected) this.net.together({ type: 'convoy', on: false, chapter: 'hub' });
    this.convoy.leading = false;
    this.convoy.leader = null;
    this.contest = null;
    this.paintEvent = null;
    this.clearPaintMeshes();
    this.endBattle();
    this.togetherHud.classList.add('hidden');
  }

  /** Free-roam handling for the current vehicle; amphibious ones may head out to sea. */
  private fitHubCar(): void {
    const def = vehicleById(this.profile.data.vehicle);
    this.hubCar.tuning = tuningFor(def.id);
    const seaZ = this.area?.seaZ;
    this.hubCar.water = def.amphibious && seaZ !== undefined ? { edge: seaZ, level: -HUB_Y - 0.6, maxZ: seaZ + 90 } : null;
    if (!this.hubCar.water && this.hubCar.y < 0) {
      // Swapped to a land vehicle at sea: back to the quay.
      const sp = this.area!.spawn;
      this.hubCar.place(sp.x, sp.z, sp.heading);
    }
  }

  private buildPawnModels(): void {
    this.vehicle?.root.removeFromParent();
    this.humanModel?.root.removeFromParent();
    const def = vehicleById(this.profile.data.vehicle);
    this.vehicle = new VehicleModel(def, this.profile.vehicleLook(def.id));
    this.humanModel = new HumanModel(this.profile.data.look);
    this.scene.add(this.vehicle.root);
    this.pet?.root.removeFromParent();
    const petKind = this.profile.data.look.pet;
    this.pet = isPet(petKind) ? new Pet(petKind) : null;
    if (this.pet) {
      this.pet.root.visible = false;
      this.scene.add(this.pet.root);
    }
    this.rover.tuning = tuningFor(def.id);
    const vlook = this.profile.vehicleLook(def.id);
    this.audio.setVehicleSounds(vlook.engine ?? defaultEngine(def.id), vlook.horn ?? defaultHorn(def.id));
    if (this.inHub) this.fitHubCar();
    this.seatHuman();
    this.updateHeadVisibility();
    if (this.net.connected) this.net.sendHello(this.playerInfo());
  }

  private seatHuman(): void {
    this.humanModel.root.removeFromParent();
    const h = this.profile.data.look.height ?? 1;
    if (this.mode === 'drive' && this.showcaseTarget !== 'character') {
      seatRider(this.vehicle, this.humanModel, h);
    } else {
      this.scene.add(this.humanModel.root);
      unseatRider(this.humanModel, h);
    }
  }

  private playerInfo(): PlayerInfo {
    const id = this.profile.data.vehicle;
    return { name: this.profile.data.name, look: this.profile.data.look, vehicle: id, vlook: this.profile.vehicleLook(id), chapter: this.inHub ? (this.area && this.area.id !== 'harbour' ? this.area.id : 'hub') : this.world.chapter.id };
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
    const shed = this.pipeline?.adaptive.off('shadows') ?? false;
    this.env?.setShadows(shed ? Math.min(s.shadowQuality, 1) : s.shadowQuality, shed ? Math.min(s.shadowDistance, 55) : s.shadowDistance, s.softShadows && !shed);
    if (this.rig) {
      this.rig.camera.far = this.drawDistance();
      this.rig.camera.updateProjectionMatrix();
    }
    // The sky dome sits just inside the far plane.
    this.sky?.scale.setScalar((this.drawDistance() * 0.9) / 3000);
    this.galaxy?.scale.setScalar((this.drawDistance() * 0.88) / 2900);
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

  /** Send a player report to the game's admins; optionally block them here too. */
  private async reportPlayer(name: string, reason: string, note: string, block: boolean): Promise<boolean> {
    if (block && !this.options.blocked.includes(name)) {
      this.options.blocked = [...this.options.blocked, name];
      this.settingsChanged();
    }
    const chat = this.chatHistory.filter((c) => c.name === name).slice(-10).map((c) => c.text);
    const res = await api('/api/report', { method: 'POST', body: { reporter: this.profile.data.name, target: name, reason, note, room: this.net.room, chat } });
    return res.ok;
  }

  /** Voice chat follows the setting while connected; if the microphone is refused, the setting turns off. */
  private async syncVoice(): Promise<void> {
    this.voice.setVolume(this.options.voiceVolume);
    if (this.options.voice && this.net.connected && !this.voice.enabled) {
      const ok = await this.voice.enable();
      if (!ok) {
        this.options.voice = false;
        saveOptions(this.options);
        this.menu.toast(t('voice.denied'));
      }
    } else if ((!this.options.voice || !this.net.connected) && this.voice.enabled) this.voice.disable();
  }

  /** Per frame: push-to-talk, level meters, hang up on players who left or were blocked. */
  private updateVoice(): void {
    const v = this.voice;
    this.touchUi.setVoice(v.enabled);
    if (!v.enabled) {
      this.voicePill.style.display = 'none';
      return;
    }
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    v.setTalking(this.input.held('talk') && !typing && (this.state === 'play' || this.state === 'hub'));
    v.update();
    v.prune((id) => {
      const name = this.net.peers.get(id)?.info?.name;
      return this.net.peers.has(id) && !(name && this.options.blocked.includes(name));
    });
    const text = v.talking ? `🎙 ${t('voice.talking')}` : `🎧 ${t('voice.on', { n: v.connectedCount() })}`;
    if (this.voicePill.textContent !== text) this.voicePill.textContent = text;
    this.voicePill.classList.toggle('talking', v.talking);
    this.voicePill.style.display = this.state === 'play' || this.state === 'hub' ? 'block' : 'none';
  }

  /** Best laps and ghosts are kept per chapter, and per road for Road Studio roads. */
  private lapKey(): string {
    return this.world.chapter.id === 'custom' ? this.customKey : this.world.chapter.id;
  }

  /** Road Studio: drive the road being built. */
  testRoad(road: CustomRoad): void {
    const code = encodeRoad(road);
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
    this.customKey = `custom:${(h >>> 0).toString(36)}`;
    setCustomChapter(roadChapter(road));
    this.play('custom');
  }

  /** Graphics benchmark: drive three stretches of the road at High, fixed resolution, and score it. */
  runBenchmark(done: (r: BenchmarkResult) => void): void {
    if (this.bench) return;
    const snapshot = JSON.parse(JSON.stringify(this.settings)) as StudioSettings;
    applyQuality(this.settings, 'high');
    this.settings.autoResolution = false;
    this.pipeline.adaptive.reset();
    this.applySettings();
    this.bench = { spot: -1, t: 0, frames: [], snapshot, done };
    this.benchNext();
  }

  private benchNext(): void {
    const b = this.bench!;
    b.spot++;
    b.t = 0;
    if (b.spot >= BENCH_SPOTS.length) {
      Object.assign(this.settings, b.snapshot);
      this.applySettings();
      const result = scoreBenchmark(b.frames);
      this.bench = null;
      analytics.track('benchmark', { avg: result.avgFps, low: result.lowFps, rec: result.recommend });
      this.openMenu('settings');
      b.done(result);
      return;
    }
    this.debugJump(this.world.path.length * BENCH_SPOTS[b.spot], 'golden', false);
  }

  private benchStep(dt: number): void {
    const b = this.bench!;
    b.t += dt;
    if (b.t > BENCH_WARMUP) b.frames.push(dt);
    if (b.t > BENCH_WARMUP + BENCH_MEASURE) this.benchNext();
  }

  /** Draw distance in use: the setting, trimmed when adaptive quality sheds it. */
  private drawDistance(): number {
    return this.settings.drawDistance * (this.pipeline?.adaptive.off('distance') ? 0.7 : 1);
  }

  /** Save and apply everything the Settings screens touched. */
  private settingsChanged(): void {
    familyCaps(this.options);
    if (!onlineAllowed(this.options.family) && this.net.connected) {
      this.voice.disable();
      this.net.disconnect();
    }
    saveStudio(this.settings);
    saveOptions(this.options);
    void this.syncVoice();
    this.applySettings();
    this.applyCalendar();
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
      if (onlineAllowed(this.options.family)) this.net.connect(clean, params.get('server'), this.playerInfo());
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
    analytics.track('play', { id: chapterId });
    this.hud.closeDialog(false);
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
    this.saveChapterCheckpoint(0, false);
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
    const a = this.missions.active;
    for (const g of this.world.people.givers) {
      // Their mission is already under way: E gets you back in the car instead of starting it over.
      if (a && a.mission.id === g.mission.id && !a.done && !a.failed) continue;
      if (Math.abs(g.s - this.human.s) < 3.5 && Math.abs(g.x - this.human.x) < 3.2) return g.mission;
    }
    return null;
  }

  private talkTo(m: MissionDef): void {
    const done = this.profile.data.missionsDone.includes(m.id);
    this.input.releasePointerLock();
    this.hud.showDialog(m.giver.name, `${m.text}${done ? ` ${t('mission.again')}` : ''}  ${t('mission.reward', { n: m.reward.ink })}`, () => this.acceptMission(m));
  }

  private acceptMission(m: MissionDef): void {
    this.missions.start(m);
    this.world.people.setMarkers(null, 0, 0);
    this.world.people.removeRival();
    this.missionEndTimer = 0;
    if (m.kind === 'stamps') this.world.people.setMarkers('stamp', m.district ?? 0, m.count ?? 5);
    // Sealing N phrases must stay possible after a long drive has sealed most of them: open them up again
    // (the Songbook in the profile keeps what was ever sealed).
    if (m.kind === 'seal') {
      const phrases = this.world.items.phrases;
      if (phrases.filter((p) => !p.sealed).length < (m.count ?? 1)) for (const p of phrases) p.sealed = false;
    }
    if (m.kind === 'visit') {
      const lm = this.world.decor.landmarks.find((l) => l.district === m.district);
      this.world.people.setMarkers('visit', m.district ?? 0, 1, lm?.s);
    }
    // Everything but a visit is done at the wheel: straight back into the car.
    if (m.kind !== 'visit' && this.mode === 'foot') this.enterRover(true);
    if (m.kind === 'race') {
      this.rover.v = 0;
      this.rover.cruise = false;
      const rivalX = this.rover.x > 0 ? this.rover.x - 3.5 : this.rover.x + 3.5;
      const speed = this.rover.tuning.topSpeed * 0.86;
      this.world.people.spawnRival(this.rover.s, rivalX, speed, m.id === 'sk-race' ? 'coupe' : m.id === 'sl-train' ? 'tuktuk' : 'buggy');
      this.raceCountdown = 3.2;
    }
    this.hud.pop(t('mis.accepted'), window.innerWidth / 2, window.innerHeight * 0.35, 'big');
    this.audio.chime(67);
  }

  private completeMission(): void {
    const a = this.missions.active;
    if (!a) return;
    const m = a.mission;
    this.profile.data.ink += m.reward.ink;
    if (m.reward.item && !this.profile.owns(m.reward.item)) this.profile.data.owned.push(m.reward.item);
    if (!this.profile.data.missionsDone.includes(m.id)) this.profile.data.missionsDone.push(m.id);
    analytics.track('mission', { id: m.id });
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
      if (n !== before) this.hud.pop(n > 0 ? String(n) : t('race.go'), window.innerWidth / 2, window.innerHeight * 0.4, 'big');
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
    const forward = d > this.district;
    this.district = d;
    this.districtTime = 0;
    this.districtClean = this.mode === 'drive';
    this.missions.onEnterDistrict(d);
    this.showDistrict(d);
    if (forward) this.saveChapterCheckpoint(d, true);
  }

  private showDistrict(d: number): void {
    const def = this.world.districts[d];
    // Some districts have their own time or weather (Kyoto by night, Kandy in the rain).
    const prev = this.districtEnv;
    if (def.preset) this.env.setPreset(def.preset);
    else if (prev?.preset) this.env.setPreset(this.world.chapter.startPreset);
    if (def.weather) this.env.setWeather(def.weather);
    else if (prev?.weather) this.env.setWeather('clear');
    this.districtEnv = def.preset || def.weather ? { preset: def.preset, weather: def.weather } : null;
    if (this.state === 'play' && this.world.chapter.id !== 'custom') this.profile.markSeen(`district:${def.id}`);
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
    const cid = this.lapKey();
    const prevBest = this.profile.data.bestLap[cid] ?? null;
    if (prevBest === null || lap < prevBest) this.profile.data.bestLap[cid] = lap;
    this.profile.addStat('laps');
    if (this.rover.handling === 'realistic') this.profile.addStat('realLaps');
    // Story mode: a lap brings this chapter's lost colour home.
    const story = storyState(this.profile.data);
    const got = findColour(story, this.world.chapter.id);
    if (got) {
      this.profile.data.story = story;
      this.profile.earn(got.done ? STORY_INK + STORY_END_INK : STORY_INK);
      this.hud.lootCard(`📖 ${t('story.foundKicker')}`, got.page.hex, got.page.colour, got.done ? t('story.allFound') : t('story.readJournal', { n: story.found.length, total: 8 }));
      this.audio.chime(72);
      const n = CAMPAIGN.findIndex((c) => c.chapter === this.world.chapter.id);
      setTimeout(() => this.hud.stamp(t('camp.missionDone', { n }), got.done ? t('camp.finaleOpen') : got.page.colour, got.page.hex), 1200);
      this.profile.save();
    }
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
          this.popAt(e.position, air ? t('fx.airSealed', { n: this.rover.airTime.toFixed(1) }) : t('fx.sealed'), 'big');
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

  /** Video capture (tools/trailer.mjs): frames advance only through debugStep, by exactly this much. */
  private captureDt: number | null = null;

  private loop = (now: number): void => {
    requestAnimationFrame(this.loop);
    if (this.contextLost) return;
    if (this.captureDt !== null) {
      this.lastFrame = now;
      return;
    }
    const cap = this.settings.fpsCap;
    if (cap > 0 && now - this.lastFrame < 1000 / cap - 2) return;
    const rawDt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (this.frameGuard.halted) return;
    try {
      this.tick(rawDt);
    } catch (err) {
      this.frameError(err);
    }
  };

  /**
   * An error while running a frame. One is skipped; several in a row put the
   * player back somewhere safe; if that doesn't help either, the game stops
   * and offers to try again, go to the menu, or reload (progress is saved).
   */
  private frameError(err: unknown): void {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error(e);
    reportError(e.message, 'frame', e.stack ?? '', false);
    const action = this.frameGuard.fail(performance.now() / 1000);
    if (action === 'recover') this.safeRecover();
    else if (action === 'halt') this.showCrashCard();
  }

  /** Undo whatever might be broken and put the player somewhere safe. Each step may fail on its own. */
  private safeRecover(): void {
    const attempt = (fn: () => void): void => {
      try {
        fn();
      } catch (e) {
        reportError(e instanceof Error ? e.message : String(e), 'recover', e instanceof Error ? e.stack ?? '' : '', false);
      }
    };
    attempt(() => this.profile.save());
    attempt(() => this.stopFlight());
    attempt(() => this.endBattle());
    attempt(() => {
      if (this.state === 'photo') this.exitPhoto();
    });
    attempt(() => {
      this.timeScale = 1;
      this.accumulator = 0;
      this.stuntAir = null;
    });
    attempt(() => {
      if (this.inHub && this.area) {
        const sp = this.area.spawn;
        this.mode = 'drive';
        this.hubCar.place(sp.x, sp.z, sp.heading);
        this.hubCar.v = 0;
        this.seatHuman();
        this.hubCam.snap = true;
      } else if (this.state === 'play') this.respawn();
    });
    this.safePoint.clear();
    attempt(() => this.menu.toast(t('safe.recovered')));
  }

  /** The last resort: stop drawing and let the player choose. */
  private showCrashCard(): void {
    try {
      this.profile.save();
    } catch {
      /* storage may be full */
    }
    this.crashCard?.remove();
    const card = document.createElement('div');
    card.className = 'card crash-card';
    card.setAttribute('role', 'alertdialog');
    card.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:440px;z-index:9999;text-align:center';
    card.innerHTML = `<h2 class="hand">${escapeHtml(t('safe.crashTitle'))}</h2><p>${escapeHtml(t('safe.crashText'))}</p>
      <div class="row wrap" style="justify-content:center;gap:8px"><button class="btn primary" data-crash="again">${escapeHtml(t('safe.tryAgain'))}</button><button class="btn" data-crash="menu">${escapeHtml(t('safe.toMenu'))}</button><button class="btn" data-crash="reload">${escapeHtml(t('safe.reload'))}</button></div>`;
    card.addEventListener('click', (ev) => {
      const what = (ev.target as HTMLElement).closest<HTMLElement>('[data-crash]')?.dataset.crash;
      if (!what) return;
      if (what === 'reload') {
        window.location.reload();
        return;
      }
      card.remove();
      this.crashCard = null;
      this.frameGuard.reset();
      this.safeRecover();
      if (what === 'menu') {
        try {
          this.leaveHub();
          this.openMenu('main');
        } catch (e) {
          reportError(e instanceof Error ? e.message : String(e), 'crash-menu', '', true);
          window.location.reload();
        }
      }
    });
    document.body.appendChild(card);
    this.crashCard = card;
    card.querySelector<HTMLButtonElement>('[data-crash="again"]')?.focus();
  }

  /**
   * After each simulation step: positions must be real numbers inside the
   * world. A bad one goes back to the last safe spot. Players pushing and
   * going nowhere get a hint, then are lifted free.
   */
  private watchdog(dt: number): void {
    if (this.inHub && this.area) {
      const area = this.area;
      if (this.flight) {
        const g = this.glider;
        if (!finite(g.x, g.y, g.z, g.speed, g.heading)) this.endFlight('reset');
        return;
      }
      const foot = this.mode === 'foot';
      const p = foot ? this.hubWalker : this.hubCar;
      const b = area.world.bounds;
      const farZ = area.seaZ !== undefined ? area.seaZ + 150 : b.maxZ + 60;
      const bad = !finite(p.x, p.y, p.z, p.heading) || (!foot && !finite(this.hubCar.v)) || p.y < -30 || p.x < b.minX - 60 || p.x > b.maxX + 60 || p.z < b.minZ - 60 || p.z > farZ;
      if (bad) {
        const s = this.safePoint.last ?? { x: area.spawn.x, y: 0, z: area.spawn.z, heading: area.spawn.heading };
        if (foot) this.hubWalker.place(s.x, s.z, s.heading);
        else {
          this.hubCar.place(s.x, s.z, s.heading);
          this.hubCar.v = 0;
        }
        this.safePoint.clear();
        this.stuck.reset(s.x, s.z);
        this.hubCam.snap = true;
        this.menu.toast(t('safe.back'));
        return;
      }
      this.safePoint.update(dt, { x: p.x, y: p.y, z: p.z, heading: p.heading }, foot ? this.hubWalker.grounded : this.hubCar.grounded && !this.hubCar.afloat);
      const inp = this.input;
      const m = inp.moveAxes();
      const out = (this.battle?.out.get(this.selfBattleId()) ?? 0) > 0;
      const wants = this.state === 'hub' && !out && (foot ? Math.hypot(m.x, m.y) > 0.3 : inp.throttle() > 0.3 || inp.brake() > 0.3);
      const st = this.stuck.update(dt, p.x, p.z, wants);
      if (st === 'hint') this.popAtPawn(t('safe.stuckHint'), 'info');
      else if (st === 'free') {
        // A clear spot a little behind the way you face.
        const r = foot ? 0.6 : 1.8;
        const bx = p.x + Math.sin(p.heading) * 3;
        const bz = p.z + Math.cos(p.heading) * 3;
        const spot = freeSpot(bx, bz, (x, z) => area.world.resolve({ x, z }, r + 0.4) === null && x > b.minX + 2 && x < b.maxX - 2 && z > b.minZ + 2 && z < b.maxZ - 2);
        if (spot) {
          if (foot) this.hubWalker.place(spot.x, spot.z, p.heading);
          else {
            this.hubCar.place(spot.x, spot.z, p.heading);
            this.hubCar.v = 0;
          }
          this.hubCam.snap = true;
          this.menu.toast(t('safe.unstuck'));
        }
      }
    } else if (this.state === 'play') {
      const r = this.rover;
      const h = this.human;
      if (!finite(r.s, r.x, r.h, r.v) || (this.mode === 'foot' && !finite(h.s, h.x, h.h))) {
        this.respawn();
        this.menu.toast(t('safe.back'));
      }
    }
  }

  /** Capture mode on (fps) or off (null): the game then moves only when debugStep is called. */
  debugCapture(fps: number | null): void {
    this.captureDt = fps ? 1 / fps : null;
  }

  /** Advance and draw exactly n frames at the capture rate. */
  debugStep(n = 1): void {
    for (let i = 0; i < n; i++) this.tick(this.captureDt ?? 1 / 30);
  }

  private tick(rawDt: number): void {
    const dt = Math.min(0.1, rawDt);
    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.05;
    this.time += dt;
    // The benchmark times real frames (dt is capped for the simulation).
    if (this.bench) this.benchStep(Math.min(1, rawDt));
    this.updateVoice();
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
        if (this.state === 'play' || this.state === 'hub') this.watchdog(SIM_DT);
        this.accumulator -= SIM_DT;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;
      if (this.pendingLap) this.finishLap();
      this.handleEvents();
    }
    this.input.clearUnconsumed(['hop', 'interact']);
    this.touchUi.setVisible(this.state === 'play' || this.state === 'hub');
    this.touchUi.setFoot(this.inHub && this.state === 'hub' && this.mode === 'foot' && !this.flight);
    if (this.state === 'play' || this.state === 'hub') this.onboarding(dt);
    this.beatTimer -= dt;
    if (this.beatTimer <= 0) {
      this.beatTimer = 60;
      if (this.state === 'play' || this.state === 'hub' || this.state === 'paused' || this.state === 'photo') analytics.track('beat', { sec: 60, fps: Math.round(this.fps), where: this.inHub ? this.area?.id : this.world.chapter.id });
    }
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
  }

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
        if (this.menu.screen === 'livery') this.menu.show('garage');
        else if (this.menu.screen !== 'main') this.menu.show('main');
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
    if (inp.consume('trail')) this.toggleTrail();
    this.tickTrail(dt);
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
    if (inp.consume('emote')) this.toggleEmoteWheel();
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
    const tonic = this.selectedTonic;
    if (!this.profile.useTonic(tonic)) {
      this.popAtPawn(t('tonic.none'), 'info');
      return;
    }
    this.tonics.set(tonic, TONICS[tonic].duration);
    this.audio.chime(64);
    this.popAtPawn(`${t(TONICS[tonic].buff)}!`, 'good');
  }

  private render(dt: number, alpha: number): void {
    // The pet only shows while you're on foot (updatePet shows it again).
    if (this.mode !== 'foot' && this.pet?.root.visible) this.hidePet();
    this.tickGroupPhoto(dt);
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
      this.tickEmote(dt, this.human.speed);
      this.humanModel.animate(dt, this.waveTimer > 0 ? this.emoteName : this.human.pose, this.human.speed, this.time);
      this.updatePet(dt, this.humanModel.root);
      if (this.human.grounded && this.human.speed > 0.5) {
        this.footstepTimer -= dt * this.human.speed;
        if (this.footstepTimer <= 0) {
          this.audio.footstep(this.human.speed > 4.5);
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
          : { chapter: this.world.chapter.id, mode: 'foot', s: this.human.s, x: this.human.x, h: this.human.h, yaw: this.human.heading, v: this.human.speed, pose: this.waveTimer > 0 ? this.emoteName : undefined };
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
      // Waterfall districts roar; high roads get windy.
      water: /ella|fall|chute|inkfall|cascade/.test(dstyle) ? 0.6 : 0,
      wind: clamp((focus.y - 30) / 90, 0, 0.8),
      calm: 0,
    });
    this.audio.calm = 0;
    this.audioFrame(this.mode === 'drive' && playing, this.rover.v, this.rover.boosting, this.mode === 'drive' && playing ? this.input.throttle() : 0, this.mode === 'drive' && (this.rover.sliding || this.rover.drifting) && this.rover.grounded ? 1 : 0);
    this.updateHud(dt, f.up);

    this.splash = Math.max(0, this.splash - dt * 1.4);
    this.borderPulse = Math.max(0, this.borderPulse - dt * 0.8);
    const speedLines = this.mode === 'drive' && playing ? clamp((this.rover.v - 38) / 20, 0, 1) + (this.rover.boosting ? 0.6 : 0) : 0;
    this.updateHeadlights(vm, cam);
    this.routeBoards?.update(dt, this.time, cam, vm.root.position);
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
    const hazeBoost = Math.max(1, 3000 / this.drawDistance());
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
    hud.setRadio(st.freq, st.name, this.audio.trackLabel, this.audio.trackProgress, this.audio.radioOn);
    if (this.state !== 'play' && this.state !== 'paused') return;
    const defs = this.world.districts;
    hud.setTimer(true, defs[this.district].name, this.districtTime, this.lapTime, this.profile.data.bestLap[this.lapKey()] ?? null, this.lapNo);
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
    hud.setTonics([...this.tonics].map(([id, left]) => ({ buff: t(TONICS[id].buff), drawback: t(TONICS[id].drawback), remaining: left, total: TONICS[id].duration })));
  }

  private popAt(world: THREE.Vector3, text: string, kind: 'good' | 'info' | 'big'): void {
    const p = world.clone().project(this.rig.camera);
    if (p.z > 1) return;
    const x = clamp((p.x * 0.5 + 0.5) * window.innerWidth, 80, window.innerWidth - 80);
    const y = clamp((-p.y * 0.5 + 0.5) * window.innerHeight - 30, 80, window.innerHeight - 180);
    this.hud.pop(text, x, y, kind);
  }

  private popAtPawn(text: string, kind: 'good' | 'info' | 'big'): void {
    const target = this.flight && this.planeMesh ? this.planeMesh.position : this.mode === 'drive' ? this.vehicle.root.position : this.humanModel.root.position;
    this.popAt(target.clone().addScaledVector(this.frame.up, 3), text, kind);
  }

  // ————— ranked time trials —————

  private startTrial(chapterId: string, countdown = 3.2): void {
    analytics.track('trial', { id: chapterId });
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
        this.hud.pop(n > 0 ? String(n) : t('race.go'), window.innerWidth / 2, window.innerHeight * 0.4, 'big');
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
    this.hud.showLapBanner(t('trial.checking', { time: time.toFixed(2), extra: best ? t('trial.pb') : prev !== null ? t('trial.prevBest', { time: prev.toFixed(2) }) : '' }));
    this.audio.chime(76);
    this.particles.emit('confetti', this.vehicle.root.position.clone().addScaledVector(this.frame.up, 2), _v.copy(this.frame.up).multiplyScalar(7), 70, 7, this.frame.up);
    void submitRun(run).then((res) => {
      if (!res) this.hud.showLapBanner(t('trial.offline', { time: time.toFixed(2) }));
      else if (res.ok) this.hud.showLapBanner(res.best === false ? t('trial.stillBest', { time: time.toFixed(2) }) : t('trial.verified', { rank: res.rank ?? '—' }));
      else this.hud.showLapBanner(t('trial.rejected', { reason: res.reason ?? '?' }));
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
    analytics.track('race', { id: chapterId });
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
    area = id === 'city' ? new City(this.hud.labels) : id === 'village' ? new Village(this.hud.labels) : id === 'hills' ? new Hills(this.hud.labels) : id === 'worldsend' ? new WorldsEnd(this.hud.labels) : new Hub(this.hud.labels);
    this.scene.add(area.group);
    if (area instanceof HarbourHub) queueMicrotask(() => this.refreshHome(false));
    // Company and sponsor boards, with solid posts.
    const spots = brandSpotsFor(id);
    const boards = new BrandBoards(id, spots, id === 'city' ? 7 : 3);
    for (const sp of spots) {
      const yaw = sp.yaw ?? 0;
      const half = (sp.style === 'banner' ? 2.3 : 1.87) * (sp.scale ?? 1);
      for (const k of [-1, 1]) area.world.circle(sp.x + Math.cos(yaw) * half * k, sp.z - Math.sin(yaw) * half * k, 0.35);
    }
    if (id === 'city') boards.addBlimp(-100, -150, 240, 75);
    area.group.add(boards.group);
    this.areaBoards.set(id, boards);
    void boards.refresh();
    if (id === 'city' || id === 'harbour') queueMicrotask(() => void this.refreshWinnerBoard(true));
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
    // A question from somewhere else (a mission offer, Varna) doesn't follow you here.
    this.hud.closeDialog(false);
    // A new area: events from the old one end (their paint pots and scores belong there).
    if (this.area && this.paintEvent) this.endTogether();
    // Leaving a district with its own weather or time (Kandy's rain, Kyoto's night) puts them back.
    if (this.districtEnv) {
      if (this.districtEnv.weather) this.env.setWeather('clear');
      if (this.districtEnv.preset) this.env.setPreset(this.world.chapter.startPreset);
      this.districtEnv = null;
    }
    const id = areaId ?? at?.area ?? this.area?.id ?? 'harbour';
    this.stopFlight();
    if (this.area && this.area.id !== id) this.area.show(false);
    const area = this.areaFor(id);
    this.area = area;
    this.endViewing();
    this.applyWorldsEnd(id === 'worldsend');
    this.placeBenches(area);
    void this.refreshWinnerBoard();
    // A free-roam mission belongs to its own town.
    if (this.freeMissions.mission && missionArea(this.freeMissions.mission) !== id) this.freeMissions.cancel();
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
    this.placePlaneStand(area);
    this.inHub = true;
    this.state = 'hub';
    this.hud.setPlaying(true);
    this.hud.setHub(true);
    this.fitHubCar();
    this.paintMurals();
    this.applyCalendar();
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
    analytics.track('area', { id });
    this.profile.markSeen(id === 'harbour' ? 'hub' : `area:${id}`);
    this.timeScale = 1;
    this.stuntAir = null;
    this.remotes.clear();
    if (this.net.connected) this.net.sendHello(this.playerInfo());
    this.placeVarna(area);
    this.cpTimer = 30;
    this.saveAreaCheckpoint(false);
  }

  /** Drive (or walk) through a road sign to another area. */
  private travelTo(areaId: string): void {
    if (this.area?.id === areaId) return;
    this.freeMissions.cancel();
    this.splash = 1;
    this.audio.whoosh();
    // Arrive at the road back to where we came from, pointing into the new area.
    const from = this.area?.id;
    const back = this.areaFor(areaId).zones.find((z) => z.kind === 'area' && z.area === from);
    if (!back) return this.enterHub(undefined, areaId);
    const len = Math.hypot(back.x, back.z) || 1;
    const step = back.r + 5;
    const x = back.x - (back.x / len) * step;
    const z = back.z - (back.z / len) * step;
    this.enterHub({ x, z, heading: Math.atan2(x, z), foot: null, area: areaId }, areaId);
  }

  /** Hide the area and show the chapter world again (portals, menu, play). */
  private leaveHub(): void {
    if (!this.inHub) return;
    this.inHub = false;
    this.stopFlight();
    this.endViewing();
    this.cancelEnding();
    this.carDrop.active = false;
    this.applyWorldsEnd(false);
    if (this.planeStand) this.planeStand.visible = false;
    if (this.benches) this.benches.visible = false;
    this.endTogether();
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
      this.contestLanding(air);
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
    this.togetherTick(dt);
    if (this.flight) {
      this.hubZone = null;
      this.flightStep(dt, area);
      return;
    }
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
      // The parked car is solid while walking (once it has landed, if it was called).
      area.world.colliders.push({ type: 'circle', x: this.hubCar.x, z: this.hubCar.z, r: this.carDrop.active ? 0 : 1.4 });
      const out = (this.battle?.out.get(this.selfBattleId()) ?? 0) > 0 || !!this.viewing;
      const move = out ? { x: 0, y: 0 } : inp.moveAxes();
      this.hubWalker.step(dt, { moveX: move.x, moveY: move.y, cameraYaw: this.hubCam.yaw, sprint: inp.held('sprint'), walk: inp.held('crouch'), jump: inp.consume('hop'), faceCamera: false }, area.world);
      area.world.colliders.pop();
    }
    area.world.colliders.length -= bodies.length;
    if (this.carDrop.update(dt, this.time)) this.carLanded();
    const p = this.mode === 'foot' ? this.hubWalker : this.hubCar;
    // Drive into a painted gate to enter its chapter, or a road sign to travel.
    const z = area.zoneAt(p.x, p.z);
    // Kept here as well as in the drawing code, so E works even on a frame that failed to draw.
    this.hubZone = z;
    // (Not during an open-world mission: rushing past a gate mustn't whisk you off to another place.
    // E at the gate still goes.)
    if (this.mode === 'drive' && z && this.hubCar.v > 2 && !this.freeMissions.mission) {
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
    this.cpTimer -= dt;
    if (this.cpTimer <= 0) {
      this.cpTimer = 30;
      this.saveAreaCheckpoint(false);
    }
    // The finale: sitting at the Edge of the World with all eight colours.
    if (this.viewing) this.viewing.t += dt;
    if (this.viewing?.zone.view?.id === 'we-edge' && this.viewing.t > 3 && !this.ending && endingDue(storyState(this.profile.data))) this.startEnding();
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
    for (const pk of area.pockets) {
      if (Math.hypot(x - pk.x, z - pk.z) > POCKET_REACH) continue;
      if (!this.profile.markSeen(`pocket:${pk.def.id}`)) continue;
      this.profile.earn(POCKET_INK);
      this.audio.secret();
      const all = POCKETS.filter((q) => this.profile.data.seen.includes(`pocket:${q.id}`)).length;
      this.hud.lootCard(t('loot.pocket'), '#9a5bd6', pk.def.name, `+${POCKET_INK} ink · ${t('loot.pocketFound', { n: all, total: POCKETS.length })}`);
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
      const what = loot.item ? itemLabel(loot.item) : `+${loot.ink} ink`;
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
        if (item) detail += ` · ${itemLabel(item)}`;
      }
      this.profile.addStat('cityMissions');
      analytics.track('cityMission', { id: m.id });
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
    const where = missionArea(m);
    const snap = this.resumeSnapshot?.hub;
    this.enterHub(snap?.area === where ? snap : undefined, where);
    this.freeMissions.start(m);
    this.hud.lootCard(CHAINS.find((c) => c.id === m.chain)?.name ?? '', '#4a90c9', m.title, m.intro);
    this.audio.chime(67);
  }

  private hubInput(dt: number): void {
    const inp = this.input;
    if (this.viewing) {
      if (inp.consume('photo')) return this.enterPhoto();
      const m = inp.moveAxes();
      if (inp.consume('interact') || inp.consume('hop') || inp.consume('respawn') || Math.hypot(m.x, m.y) > 0.5) this.endViewing();
      else {
        // A little look around with the mouse or right stick.
        const look = inp.takeLook(dt);
        this.viewLook.yaw = clamp(this.viewLook.yaw - look.dx * 0.002, -0.7, 0.7);
        this.viewLook.pitch = clamp(this.viewLook.pitch - look.dy * 0.0015, -0.35, 0.45);
      }
      return;
    }
    if (this.flight) {
      if (inp.consume('photo')) return this.enterPhoto();
      if (inp.consume('map')) return this.openMap();
      // R: back to the launch ring. E: jump down (a paper plane lands anywhere soft).
      if (inp.consume('respawn')) this.endFlight('reset');
      else if (inp.consume('interact')) this.endFlight('landed');
      inp.consume('hop');
      inp.takeLook(dt);
      return;
    }
    if (inp.consume('honk')) this.audio.honk(60);
    if (inp.consume('emote')) this.toggleEmoteWheel();
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
    // Call the car: K, or hold E / Y for a moment on foot away from anything to use.
    if (inp.consume('callCar')) this.callCar();
    if (this.mode === 'foot' && inp.held('interact') && !this.hubZone && Math.hypot(this.hubWalker.x - this.hubCar.x, this.hubWalker.z - this.hubCar.z) >= 4) {
      this.callHold += dt;
      if (this.callHold > 0.8) {
        this.callHold = -1e9; // once per hold
        this.callCar();
      }
    } else if (!inp.held('interact')) this.callHold = 0;
    if (inp.consume('interact')) {
      const zone = this.hubZone;
      if (zone) this.useZone(zone);
      else if (this.mode === 'drive') {
        if (Math.abs(this.hubCar.v) > 4) this.popAtPawn(t('prompt.slowDown'), 'info');
        else if (this.hubCar.y < -0.5) this.popAtPawn(t('prompt.onWater'), 'info');
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
      } else if (Math.hypot(this.hubWalker.x - this.hubCar.x, this.hubWalker.z - this.hubCar.z) >= 4 && this.nearBoard) {
        this.visitBrand(this.nearBoard);
      } else if (Math.hypot(this.hubWalker.x - this.hubCar.x, this.hubWalker.z - this.hubCar.z) < 4 && !this.carDrop.active) {
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
    else if (zone.kind === 'missions') {
      const here = this.area?.id ?? null;
      this.menu.boardArea = here;
      this.openMenu(CHAINS.some((c) => c.area === here) ? 'citymissions' : 'missions');
    }
    else if (zone.kind === 'trophies') this.openMenu('trophies');
    else if (zone.kind === 'mailbox') this.openMenu('mailbox');
    else if (zone.kind === 'home') this.openMenu('home');
    else if (zone.kind === 'launch') this.startFlight(zone);
    else if (zone.kind === 'viewpoint') this.enterViewpoint(zone);
    else if (zone.kind === 'story') this.talkToVarna();
    else if (zone.kind === 'mural' && zone.mural) {
      this.muralId = zone.mural;
      this.openMenu('mural');
    }
  }

  // ————— paint battle —————

  private selfBattleId(): string {
    return this.net.selfId || 'me';
  }

  /** Set up a paint battle: the arena, teams (and bots in a solo game), and send everyone to their base. */
  private beginBattle(setup: BattleSetup, host: string, withBots: boolean): void {
    const area = this.area;
    if (!area) return;
    this.endBattle();
    const grid = new PaintGrid(setup.cx, setup.cz, BATTLE.radius, (x, z) => area.world.resolve({ x, z }, 0.3) === null);
    const me = this.selfBattleId();
    const teams = new Map(setup.teams);
    if (withBots) {
      const seed = Math.floor(Math.random() * 1000);
      const probe = new PaintBattle({ ...setup, teams: [] }, grid, this.time);
      const bots = [...makeBots(2, 0, probe.base(0), seed), ...makeBots(3, 1, probe.base(1), seed)];
      for (const bot of bots) {
        teams.set(bot.id, bot.team);
        const look: HumanLook = { ...DEFAULT_HUMAN_LOOK, top: TEAM_COLOURS[bot.team], hair: ['#2b2622', '#6b3b2a', '#c8452e', '#e3c07a'][bot.name.length % 4], hat: 'none', pet: 'none' };
        const model = new HumanModel(look);
        this.scene.add(model.root);
        this.battleBots.push({ bot, model });
      }
    }
    this.battle = new PaintBattle({ ...setup, teams: [...teams] }, grid, this.time);
    this.battleHost = host;
    this.battleResult = null;
    this.battlePaint.set([]);
    this.battleDab = 0;
    for (const { bot } of this.battleBots) {
      const p = { x: bot.x, z: bot.z };
      area.world.resolve(p, 0.5);
      bot.x = p.x;
      bot.z = p.z;
    }
    // Out of the car, and off to your team's side.
    if (this.flight) this.stopFlight();
    const team = teams.get(me) ?? 0;
    this.sendToBase(team);
    this.touchUi?.setBattle(true);
    this.audio.chime(64);
    this.hud.lootCard(t('pb.title'), TEAM_COLOURS[team], t(team === 0 ? 'pb.youPink' : 'pb.youTeal'), t('pb.how'));
  }

  private sendToBase(team: Team): void {
    const b = this.battle;
    const area = this.area;
    if (!b || !area) return;
    const base = b.base(team);
    const p = { x: base.x + (Math.random() - 0.5) * 4, z: base.z + (Math.random() - 0.5) * 4 };
    area.world.resolve(p, 0.6);
    const face = Math.atan2(-(b.grid.cx - p.x), -(b.grid.cz - p.z));
    if (this.mode === 'drive') {
      this.hubCar.v = 0;
      this.mode = 'foot';
      this.seatHuman();
      this.updateHeadVisibility();
    }
    this.hubWalker.place(p.x, p.z, face);
    this.hubCam.yaw = face;
    this.hubCam.snap = true;
  }

  private endBattle(): void {
    this.battle = null;
    for (const { model } of this.battleBots) model.root.removeFromParent();
    this.battleBots = [];
    for (const m of this.balloonMeshes) m.visible = false;
    if (this.battleAim) this.battleAim.visible = false;
    this.battlePaint.set([]);
    this.touchUi?.setBattle(false);
  }

  /** Where your throw goes: the way the camera faces, higher when you look up. */
  private aimVelocity(): { x: number; y: number; z: number } {
    return throwVelocity(this.hubCam.yaw, 0.55 - this.hubCam.pitch * 0.7);
  }

  private battleTick(dt: number): void {
    const b = this.battle;
    const area = this.area;
    if (!b || !area) return;
    const now = this.time;
    const me = this.selfBattleId();
    const w = this.hubWalker;
    const myTeam = b.teams.get(me) ?? 0;
    // Your throws (held: one every BATTLE.gap seconds while the tank lasts).
    const wantThrow = this.input.consume('fire') || this.input.held('fire');
    if (wantThrow && this.mode === 'foot' && !this.flight && this.state === 'hub') {
      const from = { x: w.x, y: w.y + 1.6, z: w.z };
      const v = this.aimVelocity();
      if (b.throw(me, from, v, now, true)) {
        this.humanModel.play('throw', 0.06);
        this.audio.blip(520, 0.06, 'triangle', 0.05);
        if (this.net.connected && b.teams.size > this.battleBots.length + 1) this.net.together({ type: 'shot', id: b.setup.id, x: from.x, y: from.y, z: from.z, vx: v.x, vy: v.y, vz: v.z });
      }
    }
    // Bots (solo games): walk, dodge, throw.
    const rnd = Math.random;
    for (const { bot, model } of this.battleBots) {
      if (!b.live(now) || (b.out.get(bot.id) ?? 0) > 0) continue;
      const enemies = [...(bot.team !== myTeam && this.mode === 'foot' ? [{ x: w.x, z: w.z }] : []), ...this.battleBots.filter((o) => o.bot.team !== bot.team && (b.out.get(o.bot.id) ?? 0) <= 0).map((o) => o.bot)];
      const step = botStep(bot, b, enemies, dt, rnd);
      const p = { x: bot.x + step.dx * 4.2 * dt, z: bot.z + step.dz * 4.2 * dt };
      area.world.resolve(p, 0.4);
      if (b.grid.inside(p.x, p.z)) {
        bot.x = p.x;
        bot.z = p.z;
      } else bot.goal = null;
      if (step.throw && b.throw(bot.id, { x: bot.x, y: 1.6, z: bot.z }, step.throw, now)) {
        bot.heading = Math.atan2(-step.throw.x, -step.throw.z);
        model.play('throw', 0.06);
      }
    }
    // Balloons fly; they can hit you and the bots here (friends decide for themselves).
    const targets = [...(this.mode === 'foot' ? [{ id: me, team: myTeam, x: w.x, z: w.z }] : []), ...this.battleBots.map(({ bot }) => ({ id: bot.id, team: bot.team, x: bot.x, z: bot.z }))];
    // After the whistle the paint is frozen, so the count everyone sees stays put.
    for (const e of b.done ? [] : b.update(dt, targets, { id: me, x: w.x, z: w.z })) {
      if (e.kind === 'splat') {
        this.battlePaint.add({ x: e.x, y: HUB_Y + 0.02 + (this.battleDab++ % 400) * 0.0004, z: e.z, nx: 0, ny: 1, nz: 0, c: TEAM_TRAIL[e.team], r: BATTLE.splat });
        this.particles.emit('splash', _v5.set(e.x, HUB_Y + 0.3, e.z), _v4.set(0, 3, 0), 12, 0.5);
        if (Math.hypot(e.x - w.x, e.z - w.z) < 25) this.audio.blip(160 + Math.random() * 60, 0.08, 'sine', 0.05);
        continue;
      }
      if (e.victim === me) {
        b.splatted++;
        this.splash = 1;
        this.audio.bump();
        this.popAtPawn(t('pb.splatted'), 'info');
        if (this.net.connected && b.teams.size > this.battleBots.length + 1) this.net.together({ type: 'splatted', id: b.setup.id, by: e.by });
        this.sendToBase(myTeam);
      } else {
        const bb = this.battleBots.find((o) => o.bot.id === e.victim);
        if (bb) {
          const base = b.base(bb.bot.team);
          bb.bot.x = base.x + (Math.random() - 0.5) * 4;
          bb.bot.z = base.z + (Math.random() - 0.5) * 4;
          bb.bot.goal = null;
        }
      }
      if (e.by === me) {
        b.hits++;
        this.audio.chime(76);
        this.popAtPawn(t('pb.hit'), 'good');
      }
    }
    // The end: the host's count is the one everyone shows.
    if (!b.done && now > b.endAt + 1) {
      b.done = true;
      b.balloons.length = 0;
      const shares = b.shares();
      if (this.battleHost === me && this.net.connected && b.teams.size > this.battleBots.length + 1) this.net.together({ type: 'result', id: b.setup.id, pink: Math.round(shares[0] * 1000), teal: Math.round(shares[1] * 1000) });
      window.setTimeout(() => this.finishBattle(b), this.battleHost === me ? 0 : 2500);
    }
    if (b.done && now > this.battleShowUntil && this.battleShowUntil > 0) {
      this.battleShowUntil = 0;
      this.endBattle();
    }
  }

  private finishBattle(b: PaintBattle): void {
    if (this.battle !== b) return;
    const [pa, pb] = (this.battleResult ??= b.shares());
    const my = b.teams.get(this.selfBattleId()) ?? 0;
    const win = pa === pb ? null : pa > pb ? 0 : 1;
    const won = win === my;
    const ink = BATTLE.ink.part + (won ? BATTLE.ink.win : 0);
    this.profile.earn(ink);
    this.profile.addStat('battles');
    if (won) this.profile.addStat('battleWins');
    this.profile.addStat('battleHits', b.hits);
    this.profile.save();
    this.checkTrophies();
    if (won) {
      this.audio.cheer();
      this.splash = 1;
    }
    const title = win === null ? t('pb.draw') : t(win === 0 ? 'pb.pinkWins' : 'pb.tealWins');
    this.hud.lootCard(t('pb.title'), win === null ? '#f4d23b' : TEAM_COLOURS[win], title, `${t('pb.score', { pink: Math.round(pa * 100), teal: Math.round(pb * 100) })} · +${ink} ink`);
    this.battleShowUntil = this.time + 8;
  }

  /** Balloons in the air, the bots, and where your throw would land. */
  private drawBattle(dt: number): void {
    const b = this.battle;
    if (!b) return;
    while (this.balloonMeshes.length < b.balloons.length) {
      const m = new THREE.Mesh(new ModelKit().blob(0.28, '#ffffff', { detail: 1 }).build(0), this.pickupMaterial);
      this.scene.add(m);
      this.balloonMeshes.push(m);
    }
    this.balloonMeshes.forEach((m, i) => {
      const bl = b.balloons[i];
      m.visible = !!bl;
      if (!bl) return;
      if (m.userData.team !== bl.team) {
        m.geometry.dispose();
        m.geometry = new ModelKit().blob(0.28, TEAM_COLOURS[bl.team], { detail: 1 }).build(0);
        m.userData.team = bl.team;
      }
      m.position.set(bl.x, HUB_Y + bl.y, bl.z);
    });
    for (const { bot, model } of this.battleBots) {
      const out = (b.out.get(bot.id) ?? 0) > 0;
      model.root.position.set(bot.x, HUB_Y, bot.z);
      model.root.rotation.set(0, bot.heading, 0);
      model.root.visible = !out || Math.floor(this.time * 8) % 2 === 0;
      model.animate(dt, b.live(this.time) && !out ? 'run' : 'idle', b.live(this.time) ? 4 : 0, this.time);
    }
    // The landing spot of your next throw.
    if (!this.battleAim) {
      this.battleAim = new THREE.Mesh(new ModelKit().cylinder(0.9, 0.9, 0.05, 20, '#ffffff', { nightGlow: 1 }).build(0), this.pickupMaterial);
      this.scene.add(this.battleAim);
    }
    const aim = this.mode === 'foot' && b.live(this.time) && this.state === 'hub';
    this.battleAim.visible = aim;
    if (aim) {
      const w = this.hubWalker;
      const land = landingPoint({ x: w.x, y: w.y + 1.6, z: w.z }, this.aimVelocity());
      this.battleAim.position.set(land.x, HUB_Y + 0.08, land.z);
      this.battleAim.scale.setScalar(0.8 + Math.sin(this.time * 6) * 0.1);
    }
  }

  // ————— checkpoints and the campaign —————

  /** Remember where to continue from (and, when `announce`, stamp it on screen). */
  private saveCheckpoint(cp: Checkpoint, announce: { title: string; sub: string; colour: string } | null): void {
    this.profile.data.checkpoint = cp;
    this.profile.save();
    if (announce) {
      this.hud.stamp(announce.title, announce.sub, announce.colour);
      this.audio.stamp();
    }
  }

  /** The start of a district in a chapter (not during trials or races). */
  private saveChapterCheckpoint(district: number, announce: boolean): void {
    if (this.trial || this.race || this.state !== 'play') return;
    const def = this.world.districts[district];
    if (!def) return;
    this.saveCheckpoint(
      { kind: 'chapter', chapter: this.world.chapter.id, district, label: `${this.world.chapter.name} · ${def.name}`, at: Date.now() },
      announce ? { title: t('cp.cleared'), sub: def.name, colour: def.walls[0] ?? '#e8559a' } : null,
    );
  }

  /** Where you are in a town (a safe spot only: grounded, not flying, not in a battle). */
  private saveAreaCheckpoint(announce: boolean, place = ''): void {
    const area = this.area;
    if (!area || !this.inHub || this.flight || this.battle) return;
    const foot = this.mode === 'foot';
    const p = foot ? this.hubWalker : this.hubCar;
    if (!finite(p.x, p.z, p.heading) || (foot ? !this.hubWalker.grounded : !this.hubCar.grounded || this.hubCar.afloat)) return;
    this.saveCheckpoint(
      { kind: 'area', area: area.id, x: p.x, z: p.z, heading: p.heading, foot, label: place ? `${area.title().name} · ${place}` : area.title().name, at: Date.now() },
      announce ? { title: t('cp.cleared'), sub: place || area.title().name, colour: '#3e86c9' } : null,
    );
  }

  /** Menu → Continue: back to the last checkpoint (even after closing the game). */
  private continueGame(): boolean {
    const cp = checkCheckpoint(this.profile.data.checkpoint);
    if (!cp) return false;
    if (cp.kind === 'chapter') {
      if (!CHAPTERS.some((c) => c.id === cp.chapter)) return false;
      this.play(cp.chapter);
      const span = this.world.path.spanOf(cp.district);
      if (span && cp.district > 0) {
        this.rover.reset(span.start + 4);
        this.rover.v = this.rover.tuning.cruiseFloor;
        this.rover.cruise = true;
        this.district = cp.district;
        this.districtClean = false;
        this.lapClean = false;
        this.showDistrict(cp.district);
        this.rig.snap();
      }
    } else {
      if (!['harbour', 'city', 'village', 'hills', 'worldsend'].includes(cp.area)) return false;
      this.enterHub({ x: cp.foot ? cp.x + Math.cos(cp.heading) * 3 : cp.x, z: cp.foot ? cp.z - Math.sin(cp.heading) * 3 : cp.z, heading: cp.heading, foot: cp.foot ? { x: cp.x, z: cp.z } : null, area: cp.area }, cp.area);
    }
    this.hud.stamp(t('cp.back'), cp.label, '#5dbb3f');
    return true;
  }

  /** Campaign map → play a step: meet Varna, a chapter's colour, or the finale. */
  private playCampaign(i: number): void {
    const step = CAMPAIGN[i];
    if (!step) return;
    if (step.kind === 'chapter' && step.chapter) {
      const pr = this.profile;
      if (!pr.data.story?.started) pr.data.story = { ...storyState(pr.data), started: true };
      this.play(step.chapter);
      this.hud.showDistrictTitle(t('camp.mission', { n: i }), step.title, step.brief);
    } else if (step.kind === 'meet') this.enterHub({ x: 16, z: 34, heading: Math.PI, foot: { x: 16, z: 40 }, area: 'harbour' }, 'harbour');
    else this.enterHub({ x: 6, z: 70, heading: Math.PI, foot: { x: 0, z: 78 }, area: 'worldsend' }, 'worldsend');
  }

  /** Varna with her easel by the harbour (Harbour Town only). */
  private placeVarna(area: FreeRoamArea): void {
    const zone = area.zones.find((z) => z.kind === 'story');
    if (!zone) {
      if (this.varna) this.varna.visible = false;
      return;
    }
    if (!this.varna) {
      const g = new THREE.Group();
      const look: HumanLook = { ...DEFAULT_HUMAN_LOOK, skin: '#c89a78', hair: '#e8e2d8', hairStyle: 'bun', top: '#9a7ad8', topStyle: 'dress', bottom: '#6f5aa8', bottomStyle: 'maxi', scarf: '#f4d23b', hat: 'none', height: 0.95, pet: 'none' };
      const model = new HumanModel(look);
      model.animate(0, 'idle', 0, 0);
      g.add(model.root);
      const easel = new ModelKit()
        .box(0.08, 1.8, 0.08, '#7a5a3a', { position: [-0.45, 0.9, 0.1], rotation: [0.15, 0, 0.1] })
        .box(0.08, 1.8, 0.08, '#7a5a3a', { position: [0.45, 0.9, 0.1], rotation: [0.15, 0, -0.1] })
        .box(1.1, 0.8, 0.04, '#f6f0e4', { position: [0, 1.3, 0.02], rotation: [0.15, 0, 0] })
        .box(1.0, 0.7, 0.02, '#e8559a', { position: [0, 1.3, -0.01], rotation: [0.15, 0, 0], nightGlow: 0.2 })
        .build(0.01);
      const em = new THREE.Mesh(easel, this.pickupMaterial);
      em.position.set(1.4, 0, 0.4);
      em.rotation.y = -0.5;
      g.add(em);
      this.varna = g;
      this.scene.add(g);
    }
    this.varna.visible = true;
    this.varna.position.set(zone.x, HUB_Y, zone.z + 2.6);
    this.varna.rotation.y = 0;
  }

  /** Talking to Varna: the prologue, a hint for the next colour, or the way to the finale. */
  private talkToVarna(): void {
    const pr = this.profile;
    const s = storyState(pr.data);
    this.audio.chime(64);
    if (!s.started) {
      this.hud.showDialog('Varna', STORY_INTRO, () => {
        pr.data.story = { ...storyState(pr.data), started: true };
        pr.save();
        this.saveAreaCheckpoint(false);
        this.hud.stamp(t('camp.prologueDone'), `${t('camp.mission', { n: 1 })}: ${CAMPAIGN[1].title}`, '#9a7ad8');
        this.audio.fanfare();
        this.checkTrophies();
      });
      return;
    }
    if (s.finale) {
      this.hud.showDialog('Varna', t('camp.varnaThanks'), () => {});
      return;
    }
    if (finaleReady(s)) {
      this.hud.showDialog('Varna', t('camp.varnaFinale'), () => {});
      return;
    }
    const next = nextPage(s);
    this.hud.showDialog('Varna', next ? `${t('camp.varnaNext', { n: s.found.length, total: STORY_PAGES.length })} ${next.clue}` : t('camp.varnaFinale'), () => {});
  }

  /** The ending: the palette paints the sky over the World's End, then the credits. */
  private startEnding(): void {
    this.cancelEnding();
    this.ending = true;
    const pr = this.profile;
    const first = !storyState(pr.data).finale;
    pr.data.story = { ...storyState(pr.data), finale: true };
    if (first) pr.earn(500);
    pr.save();
    this.saveAreaCheckpoint(false);
    this.checkTrophies();
    this.audio.fanfare();
    // Eight rockets, one for each colour, over the edge of the world.
    for (let i = 0; i < 24; i++) this.launchFirework(-70 + (i % 8) * 20, 130 + Math.random() * 40, 1 + i * 0.6);
    // The story's last lines in the cinematic bars (the viewpoint had hidden the HUD).
    this.hud.root.classList.remove('hud-hidden');
    const lines = STORY_ENDING.split(/(?<=[.!?”])\s+/).filter(Boolean);
    lines.forEach((line, i) => this.endingTimers.push(setTimeout(() => this.ending && this.hud.letterbox(true, line), 1500 + i * 5000)));
    this.endingTimers.push(setTimeout(() => this.showTheEnd(), 1500 + lines.length * 5000 + 1500));
  }

  /** Stop an ending in progress (the player left): no more lines, no card. */
  private cancelEnding(): void {
    for (const id of this.endingTimers) clearTimeout(id);
    this.endingTimers = [];
    document.querySelectorAll('.the-end').forEach((el) => el.remove());
    if (this.ending) this.hud.letterbox(false);
    this.ending = false;
  }

  private showTheEnd(): void {
    if (!this.ending) return;
    this.endingTimers = [];
    this.hud.letterbox(false);
    this.profile.data.story = { ...storyState(this.profile.data), credits: true };
    this.profile.save();
    const el = document.createElement('div');
    el.className = 'the-end';
    el.setAttribute('role', 'dialog');
    const credits = [
      t('end.credits1'),
      'Inkroads',
      'HelaO2',
      t('end.credits2'),
      t('end.credits3'),
      t('end.credits4'),
      t('end.thanks'),
    ];
    el.innerHTML = `<div class="end-card"><h1>${escapeHtml(t('end.title'))}</h1>
      <div class="palette-row">${STORY_PAGES.map((p) => `<i style="background:${p.hex}" title="${escapeHtml(p.colour)}"></i>`).join('')}</div>
      <div class="roll"><div>${credits.map((c) => `<p>${escapeHtml(c)}</p>`).join('')}</div></div>
      <button class="btn primary" data-end="keep">${escapeHtml(t('end.keep'))}</button></div>`;
    el.querySelector('[data-end="keep"]')?.addEventListener('click', () => {
      el.remove();
      this.ending = false;
      this.hud.stamp(t('end.keep'), t('end.keepSub'), '#9a7ad8');
    });
    document.body.appendChild(el);
    (el.querySelector('[data-end="keep"]') as HTMLButtonElement | null)?.focus();
  }

  // ————— the World's End and viewpoints —————

  /** Galaxy for sky and sea, and a clear night, while at the World's End; the old light back after. */
  private applyWorldsEnd(on: boolean): void {
    this.galaxy.visible = on;
    this.sky.visible = !on;
    this.water.visible = !on;
    if (on && !this.worldsEndEnv) {
      this.worldsEndEnv = { preset: this.env.presetId, auto: this.env.auto };
      this.env.setAuto(false);
      this.env.setWeather('clear');
      this.env.setPreset('night');
    } else if (!on && this.worldsEndEnv) {
      const e = this.worldsEndEnv;
      this.worldsEndEnv = null;
      this.env.setPreset(e.preset);
      this.env.setAuto(e.auto);
    }
  }

  /** A bench at every viewpoint in this area, facing the view. */
  private placeBenches(area: FreeRoamArea): void {
    if (this.benches) {
      this.benches.removeFromParent();
      for (const c of this.benches.children) (c as THREE.Mesh).geometry?.dispose();
    }
    const geo = buildBench();
    const g = new THREE.Group();
    for (const z of area.zones) {
      if (z.kind !== 'viewpoint' || !z.view) continue;
      const m = new THREE.Mesh(geo, this.pickupMaterial);
      m.position.set(z.x, HUB_Y, z.z);
      m.rotation.y = z.view.yaw;
      m.scale.setScalar(1.3);
      g.add(m);
    }
    this.benches = g;
    this.scene.add(g);
  }

  /** Sit on the bench: the HUD goes, the camera slowly takes in the view. */
  private enterViewpoint(zone: HubZone): void {
    if (!zone.view || this.viewing || !this.area) return;
    if (this.mode === 'drive') {
      if (Math.abs(this.hubCar.v) > 4) {
        this.popAtPawn(t('prompt.slowDown'), 'info');
        return;
      }
      this.hubCar.v = 0;
      this.mode = 'foot';
      this.seatHuman();
      this.updateHeadVisibility();
    }
    this.hubWalker.place(zone.x, zone.z, zone.view.yaw);
    this.viewLook.yaw = this.viewLook.pitch = 0;
    this.viewing = { zone, t: 0, hudWas: this.hudHidden };
    this.hudHidden = true;
    this.hud.root.classList.add('hud-hidden');
    this.audio.settle();
    this.menu.toast(`${this.area.zoneLabel(zone)} · ${t('view.hint')}`);
    if (this.profile.markSeen(`view:${zone.view.id}`)) this.checkTrophies();
  }

  private endViewing(): void {
    const v = this.viewing;
    if (!v) return;
    this.viewing = null;
    this.hudHidden = v.hudWas;
    this.hud.root.classList.toggle('hud-hidden', this.hudHidden);
    this.hubCam.yaw = (v.zone.view?.yaw ?? this.hubCam.yaw) + Math.PI;
    this.hubCam.pitch = 0.15;
    this.profile.addStat('viewSeconds', Math.round(v.t));
  }

  /** The slow camera at a viewpoint: behind the bench, drifting and easing out, looking along the view. */
  private viewpointCamera(desired: THREE.Vector3, look: THREE.Vector3): void {
    const v = this.viewing!;
    const view = v.zone.view!;
    const calm = this.settings.reducedMotion ? 0.3 : 1;
    const yaw = view.yaw + Math.sin(v.t * 0.045) * 0.22 * calm + this.viewLook.yaw;
    const pitch = view.pitch + Math.sin(v.t * 0.031) * 0.04 * calm + this.viewLook.pitch;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const ease = Math.min(v.t, 25) / 25;
    const back = 3.2 + ease * 2.2 * calm;
    desired.set(v.zone.x - fx * back, HUB_Y + 1.9 + ease * 0.8 * calm, v.zone.z - fz * back);
    look.set(v.zone.x + fx * 40, HUB_Y + 1.4 + Math.tan(pitch) * 40, v.zone.z + fz * 40);
  }

  // ————— calling the car —————

  /** Drop the car out of the sky a few metres in front of you. */
  private callCar(): void {
    const area = this.area;
    if (!area || !this.inHub || this.state !== 'hub' || this.mode !== 'foot' || this.flight) return;
    if (this.battle?.live(this.time)) {
      this.popAtPawn(t('drop.notNow'), 'info');
      return;
    }
    if (!this.carDrop.ready(this.time)) return;
    const w = this.hubWalker;
    const b = area.world.bounds;
    const sea = area.seaZ;
    const want = aheadOf(w.x, w.z, this.hubCam.yaw);
    const spot = freeSpot(want.x, want.z, (x, z) => area.world.resolve({ x, z }, 2.4) === null && x > b.minX + 3 && x < b.maxX - 3 && z > b.minZ + 3 && z < b.maxZ - 3 && (sea === undefined || z < sea - 3) && Math.hypot(x - w.x, z - w.z) > 3, 24);
    if (!spot) {
      this.popAtPawn(t('drop.noRoom'), 'info');
      return;
    }
    // Facing the same way you look, so you can hop in and go.
    this.hubCar.place(spot.x, spot.z, this.hubCam.yaw);
    this.hubCar.v = 0;
    this.carDrop.start(spot.x, spot.z, this.hubCam.yaw);
    this.chuteFold = 0;
    this.audio.whoosh();
    this.popAtPawn(t('drop.coming'), 'good');
    this.profile.addStat('carDrops');
    this.checkTrophies();
  }

  private carLanded(): void {
    this.audio.bump();
    this.input.rumble(0.5, 120);
    this.splash = Math.max(this.splash, 0.25);
    const p = _v5.set(this.hubCar.x, HUB_Y + 0.3, this.hubCar.z);
    for (let i = 0; i < 3; i++) this.particles.emit('dust', p, _v4.set((Math.random() - 0.5) * 4, 1.5, (Math.random() - 0.5) * 4), 30, 1.4);
  }

  /** The parachute over a falling car, folding away once it lands. */
  private drawChute(dt: number, carPos: THREE.Vector3): void {
    const falling = this.carDrop.active;
    if (!falling && this.chuteFold >= 1) {
      if (this.chute) this.chute.visible = false;
      return;
    }
    if (!this.chute) {
      this.chute = new THREE.Mesh(buildParachute(), this.pickupMaterial);
      this.scene.add(this.chute);
    }
    if (!falling) this.chuteFold = Math.min(1, this.chuteFold + dt * 1.6);
    const c = this.chute;
    c.visible = this.inHub && this.chuteFold < 1;
    c.position.copy(carPos).add(_v6.set(0, 1.4, 0));
    c.rotation.set(0, this.hubCar.heading, this.carDrop.sway(this.time) * 0.6);
    // Once down, the canopy sinks and crumples onto the car.
    const s = 1 - this.chuteFold;
    c.scale.set(1 + this.chuteFold * 0.3, Math.max(0.05, s), 1 + this.chuteFold * 0.3);
  }

  // ————— the paper plane —————

  /** The ring course over an area (the same every time). */
  private courseFor(area: FreeRoamArea): Course {
    let c = this.courses.get(area.id);
    if (!c) {
      const b = area.world.bounds;
      const start = area.zones.find((z) => z.kind === 'launch') ?? area.spawn;
      c = makeCourse(b, start, area.id.length, area.id === 'city' ? 50 : 22);
      this.courses.set(area.id, c);
    }
    return c;
  }

  /** What the plane flies over: the area, and the open sea past a quay. */
  private airspaceFor(area: FreeRoamArea): Airspace {
    const b = area.world.bounds;
    const sea = area.seaZ;
    const maxZ = sea !== undefined ? Math.max(b.maxZ, sea + 80) : b.maxZ;
    return {
      bounds: { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ },
      resolve: (p, r) => area.world.resolve(p, r, maxZ),
      ground: (_x, z) => (sea !== undefined && z > sea ? { y: -HUB_Y - 0.6, water: true } : { y: 0, water: false }),
      // Serendib City's towers are much taller than the town houses.
      roof: area.id === 'city' ? 40 : undefined,
    };
  }

  /** The plane waiting on its stand at this area's launch ring. */
  private placePlaneStand(area: FreeRoamArea): void {
    const zone = area.zones.find((z) => z.kind === 'launch');
    if (!this.planeStand) {
      this.planeStand = new THREE.Group();
      this.planeStand.add(new THREE.Mesh(buildPlaneStand(), this.pickupMaterial));
      const parked = new THREE.Mesh(buildPaperPlane(), this.pickupMaterial);
      parked.position.set(0, 1.45, 0);
      parked.rotation.x = 0.12;
      this.planeStand.add(parked);
      this.scene.add(this.planeStand);
    }
    this.planeStand.visible = !!zone;
    if (!zone) return;
    // Beside the ring, facing the first ring of the course.
    const first = this.courseFor(area).rings[0];
    const heading = Math.atan2(-(first.x - zone.x), -(first.z - zone.z));
    this.planeStand.position.set(zone.x + Math.cos(heading) * (zone.r + 2), HUB_Y, zone.z - Math.sin(heading) * (zone.r + 2));
    this.planeStand.rotation.y = heading;
  }

  /** Climb aboard at a launch ring: a gust throws the plane up toward the first ring. */
  private startFlight(zone: HubZone): void {
    const area = this.area;
    if (!area || this.flight) return;
    if (this.mode === 'drive' && Math.abs(this.hubCar.v) > 4) {
      this.popAtPawn(t('prompt.slowDown'), 'info');
      return;
    }
    this.hubCar.v = 0;
    const course = this.courseFor(area);
    const first = course.rings[0];
    const heading = Math.atan2(-(first.x - zone.x), -(first.z - zone.z));
    this.gliderSpace = this.airspaceFor(area);
    this.glider.launch(zone.x, area.id === 'city' ? 55 : 28, zone.z, heading);
    this.flight = { run: new CourseRun(course), from: { x: zone.x, z: zone.z, heading } };
    if (!this.planeMesh) {
      this.planeMesh = new THREE.Mesh(buildPaperPlane(), this.pickupMaterial);
      this.scene.add(this.planeMesh);
    }
    this.planeMesh.visible = true;
    const h = this.profile.data.look.height ?? 1;
    this.humanModel.root.removeFromParent();
    unseatRider(this.humanModel, h);
    this.planeMesh.add(this.humanModel.root);
    this.humanModel.root.position.copy(PLANE_SEAT);
    this.humanModel.play('pilot', 0.3);
    this.hidePet();
    this.showRings(course);
    if (this.planeStand) this.planeStand.visible = false;
    this.hubCam.snap = true;
    this.splash = 0.8;
    this.audio.whoosh();
    this.freeMissions.cancel();
    this.hud.lootCard(t('fly.title'), '#f6f0e4', t('fly.intro'), t('fly.controls'));
    if (this.profile.markSeen('flown')) this.checkTrophies();
  }

  private showRings(course: Course | null): void {
    const n = course?.rings.length ?? 0;
    while (this.ringMeshes.length < n) {
      const m = new THREE.Mesh(buildFlightRing('#f4d23b', 5.5), this.pickupMaterial);
      this.scene.add(m);
      this.ringMeshes.push(m);
    }
    this.ringMeshes.forEach((m, i) => {
      const ring = course?.rings[i];
      m.visible = !!ring;
      if (!ring) return;
      m.position.set(ring.x, HUB_Y + ring.y, ring.z);
      m.rotation.set(0, ring.heading, 0);
      m.scale.setScalar(ring.r / 5.5);
    });
  }

  /** Stop flying without landing anywhere (leaving the area, a menu). */
  private stopFlight(): void {
    if (!this.flight) return;
    this.flight = null;
    this.glider.flying = false;
    if (this.planeMesh) this.planeMesh.visible = false;
    this.showRings(null);
    this.hud.objective(null);
    this.hud.compass(null);
    this.humanModel.root.removeFromParent();
    this.scene.add(this.humanModel.root);
    this.humanModel.stop('pilot');
  }

  /** Down again: on your feet where you landed, or back at the launch ring. */
  private endFlight(how: GliderEvent | 'reset'): void {
    const f = this.flight;
    const area = this.area;
    if (!f || !area) return;
    const g = this.glider;
    this.stopFlight();
    this.mode = 'foot';
    const spot = { x: g.x, z: g.z };
    const safe = how === 'landed' && !area.world.resolve({ ...spot }, 0.6, area.world.bounds.maxZ) && this.gliderSpace?.ground(g.x, g.z).water !== true;
    if (safe) this.hubWalker.place(spot.x, spot.z, g.heading);
    else this.hubWalker.place(f.from.x, f.from.z, f.from.heading);
    this.hubCam.yaw = safe ? g.heading : f.from.heading;
    this.hubCam.snap = true;
    this.seatHuman();
    this.updateHeadVisibility();
    this.placePlaneStand(area);
    if (how === 'landed') {
      this.humanModel.play('land', 0.08);
      this.audio.chime(67);
      this.popAtPawn(t('fly.landed'), 'good');
      if (g.airTime > 5) this.profile.addStat('landings');
    } else if (how === 'crashed' || how === 'splash') {
      this.audio.bump();
      this.splash = 1;
      this.popAtPawn(t(how === 'splash' ? 'fly.splash' : 'fly.crashed'), 'info');
    }
    this.checkTrophies();
  }

  private flightStep(dt: number, area: FreeRoamArea): void {
    const f = this.flight!;
    const g = this.glider;
    const inp = this.input;
    const move = inp.moveAxes();
    const space = (this.gliderSpace ??= this.airspaceFor(area));
    const events = g.step(dt, { pitch: move.y, roll: move.x, gust: inp.held('boost') || inp.held('sprint') }, space, f.run.course.thermals);
    this.profile.addStat('flown', g.speed * dt);
    for (const e of events) {
      if (e === 'bump') {
        this.audio.bump();
        this.splash = Math.max(this.splash, 0.4);
      } else if (e === 'stall') this.popAtPawn(t('fly.stall'), 'info');
    }
    for (const e of f.run.update(dt, g)) {
      if (e.kind === 'ring') {
        this.audio.chime(60 + e.index * 2);
        this.splash = Math.max(this.splash, 0.3);
        const m = this.ringMeshes[e.index];
        if (m) m.visible = false;
      } else this.finishCourse(area, e.time);
    }
    // Skim low over a golden pot to pick it up.
    if (g.altitude(space) < 4) this.checkPickups(area, g.x, g.z);
    this.discoverTimer -= dt;
    if (this.discoverTimer <= 0) {
      this.discoverTimer = 0.5;
      this.discover(area, g.x, g.z);
    }
    this.trackStats(dt);
    const down = events.find((e) => e === 'landed' || e === 'crashed' || e === 'splash');
    if (down) this.endFlight(down);
  }

  private finishCourse(area: FreeRoamArea, time: number): void {
    const bests = (this.profile.data.flightBest ??= {});
    const prev = bests[area.id];
    const first = prev === undefined;
    const best = first || time < prev;
    if (best) bests[area.id] = Math.round(time * 100) / 100;
    const ink = courseInk(first, best && !first);
    this.profile.earn(ink);
    this.profile.addStat('courses');
    this.profile.save();
    this.audio.fanfare();
    this.hud.lootCard(t('fly.course'), '#f4d23b', `${time.toFixed(1)} s${best && !first ? ` · ${t('fly.best')}` : ''}`, `+${ink} ink`);
    this.checkTrophies();
  }

  /** The plane in the air and the chase camera behind it; returns the focus point. */
  private renderPlane(dt: number, alpha: number, desired: THREE.Vector3, look: THREE.Vector3): THREE.Vector3 {
    const p = this.glider.lerp(alpha);
    const m = this.planeMesh!;
    m.position.set(p.x, HUB_Y + p.y, p.z);
    m.rotation.set(p.pitch, p.heading, -p.roll, 'YXZ');
    this.humanModel.animate(dt, 'idle', 0, this.time);
    const fwd = _v4.set(-Math.sin(p.heading), 0, -Math.cos(p.heading));
    const back = 9 * this.rig.zoom;
    desired.copy(m.position).addScaledVector(fwd, -back).add(_v5.set(0, 2.6 * this.rig.zoom - Math.sin(p.pitch) * back, 0));
    look.copy(m.position).addScaledVector(fwd, 10).add(_v5.set(0, 1 + Math.sin(p.pitch) * 10, 0));
    this.hubCam.yaw = p.heading;
    // The ring you need next bobs gently.
    const next = this.flight?.run.next ?? 0;
    const ring = this.ringMeshes[next];
    if (ring?.visible) ring.rotation.z = Math.sin(this.time * 2) * 0.15;
    // Streaks of wind off the wingtips at speed.
    if (this.glider.speed > 24 || this.glider.gusting) {
      const side = _v6.set(Math.cos(p.heading), 0, -Math.sin(p.heading));
      for (const s of [-1, 1]) this.particles.emit('spark', _v5.copy(m.position).addScaledVector(side, s * 2.6).addScaledVector(fwd, 2), STILL, 12 * dt, 0.3);
    }
    return m.position;
  }

  /** Rings to go, the clock, height, and the compass to the next ring. */
  private updateFlightHud(cam: THREE.PerspectiveCamera): void {
    const f = this.flight!;
    const g = this.glider;
    const rings = f.run.course.rings;
    const alt = Math.max(0, Math.round(g.altitude(this.gliderSpace ?? this.airspaceFor(this.area!))));
    const best = this.profile.data.flightBest?.[this.area!.id];
    const extra = [f.run.running ? `⏱ ${f.run.time.toFixed(1)} s` : '', best !== undefined ? `${t('fly.best')} ${best.toFixed(1)} s` : '', `⬆ ${alt} m`, t('fly.hint')].filter(Boolean).join(' · ');
    this.hud.objective(t('fly.title'), f.run.finished ? t('fly.done') : t('fly.rings', { n: f.run.next, total: rings.length }), extra);
    for (const b of this.beacons) b.visible = false;
    const ring = rings[f.run.next];
    if (!ring) {
      this.hud.compass(null);
      return;
    }
    const dir = cam.getWorldDirection(_v);
    const bearing = Math.atan2(ring.x - g.x, -(ring.z - g.z)) - Math.atan2(dir.x, -dir.z);
    this.hud.compass((bearing * 180) / Math.PI, Math.hypot(ring.x - g.x, ring.y - g.y, ring.z - g.z));
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
    const bob = this.hubCar.afloat ? Math.sin(this.time * 1.7) * 0.06 : 0;
    if (this.hubCar.afloat && this.profile.markSeen('sailed')) this.checkTrophies();
    vm.root.position.set(car.x, HUB_Y + car.y + 0.02 + bob + this.carDrop.height, car.z);
    vm.root.quaternion.setFromAxisAngle(_y, car.heading);
    if (this.carDrop.active) vm.root.rotateZ(this.carDrop.sway(this.time));
    this.drawChute(dt, vm.root.position);
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
    if (this.flight) {
      focus = this.renderPlane(dt, alpha, desired, look);
    } else if (this.mode === 'foot') {
      const w = this.hubWalker.lerp(alpha);
      const hm = this.humanModel;
      hm.root.position.set(w.x, HUB_Y + w.y, w.z);
      hm.root.quaternion.setFromAxisAngle(_y, w.heading);
      this.tickEmote(dt, this.hubWalker.speed);
      hm.animate(dt, this.viewing ? 'sit' : this.waveTimer > 0 ? this.emoteName : this.hubWalker.pose, this.hubWalker.speed, this.time);
      this.updatePet(dt, hm.root);
      if (this.hubWalker.grounded && this.hubWalker.speed > 0.5) {
        this.footstepTimer -= dt * this.hubWalker.speed;
        if (this.footstepTimer <= 0) {
          // Grass and earth in the green towns sound duller than city stone.
          this.audio.footstep(this.hubWalker.speed > 4.5, area.id === 'village' || area.id === 'hills' || area.id === 'worldsend');
          this.footstepTimer = 1.1;
        }
      }
      focus = hm.root.position;
      const yaw = this.hubCam.yaw;
      const pitch = this.hubCam.pitch;
      const dist = 5.2 * this.rig.zoom;
      look.copy(focus).add(_v4.set(0, 1.6, 0));
      desired.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(look);
      if (this.viewing) this.viewpointCamera(desired, look);
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
      // Out at sea (paper boat) the lens may follow over the water.
      const sea = this.mode === 'drive' ? this.hubCar.water : null;
      if (desired.y < HUB_Y + 14) area.world.resolve(lens, 0.6, sea?.maxZ);
      desired.x = lens.x;
      desired.z = lens.z;
      desired.y = Math.max(desired.y, HUB_Y + (sea ? this.hubCar.groundAt(lens.z) + 2.4 : 0) + 0.6);
      const k = this.hubCam.snap ? 1 : 1 - Math.exp(-(this.flight ? 7 : this.mode === 'foot' ? 14 : 5) * dt);
      this.hubCam.pos.lerp(desired, k);
      this.hubCam.look.lerp(look, this.hubCam.snap ? 1 : 1 - Math.exp(-10 * dt));
      this.hubCam.snap = false;
      cam.position.copy(this.hubCam.pos);
      cam.up.set(0, 1, 0);
      const burst = this.hubCar.burst > 0 ? 8 : 0;
      const calm = this.viewing ? -10 : 0;
      cam.fov += (this.settings.fov + calm + Math.min(10, Math.max(0, this.hubCar.v - 18) * 0.5) + burst - cam.fov) * Math.min(1, dt * (this.viewing ? 1.5 : 6));
      cam.updateProjectionMatrix();
      cam.lookAt(this.hubCam.look);
      cam.updateMatrixWorld();
    }

    this.sky.position.copy(cam.position);
    this.galaxy.position.copy(cam.position);
    galaxyUniforms.uTime.value = this.time;
    this.env.update(dt, focus, cam, this.settings.reducedMotion || this.options.calmLighting);
    paintShared.uTime.value = this.time;
    skyUniforms.uTime.value = this.time;
    waterUniforms.uTime.value = this.time;
    const player = this.flight ? { x: this.glider.x, z: this.glider.z } : this.mode === 'foot' ? { x: this.hubWalker.x, z: this.hubWalker.z } : { x: this.hubCar.x, z: this.hubCar.z };
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
    this.hubZone = this.flight ? null : area.zoneAt(player.x, player.z);
    const nearCar = this.mode === 'foot' && !this.carDrop.active && Math.hypot(this.hubWalker.x - this.hubCar.x, this.hubWalker.z - this.hubCar.z) < 4;
    const boards = this.areaBoards.get(area.id);
    const here = _v6.set(player.x, HUB_Y, player.z);
    boards?.update(dt, this.time, cam, here);
    this.nearBoard = this.mode === 'foot' && !nearCar && !this.hubZone ? boards?.nearest(here) ?? null : null;
    const zoneText = this.hubZone ? (this.hubZone.kind === 'portal' || this.hubZone.kind === 'area' ? t(this.freeMissions.mission ? 'prompt.enterOnly' : 'prompt.enter', { place: area.zoneLabel(this.hubZone).replace('→ ', '') }) : `E · ${area.zoneLabel(this.hubZone)}`) : null;
    const boardText = this.nearBoard ? t('brand.visit', { name: this.nearBoard.kind === 'cta' ? t('brand.advertise') : this.nearBoard.name }) : null;
    this.hud.setPrompt(this.state === 'photo' || this.flight ? null : zoneText ?? (nearCar ? t('prompt.getIn') : boardText ?? (this.mode === 'drive' && Math.abs(this.hubCar.v) < 3 && this.hubCar.y > -0.5 ? t('prompt.getOut') : null)));
    this.drawBattle(dt);
    if (this.flight) this.updateFlightHud(cam);
    else this.updateMissionHud(player.x, player.z, cam);
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
      const g = this.glider;
      const st: PlayerState = this.flight
        ? { chapter, mode: 'fly', s: g.z + HUB_S_OFFSET, x: g.x, h: Math.min(78, g.y), yaw: g.heading, v: g.speed }
        : foot
        ? { chapter, mode: 'foot', s: this.hubWalker.z + HUB_S_OFFSET, x: this.hubWalker.x, h: this.hubWalker.y, yaw: this.hubWalker.heading, v: this.hubWalker.speed, pose: this.waveTimer > 0 ? this.emoteName : undefined }
        : { chapter, mode: 'drive', s: this.hubCar.z + HUB_S_OFFSET, x: this.hubCar.x, h: this.hubCar.y, yaw: this.hubCar.heading, v: this.hubCar.v };
      this.net.update(dt, st, this.playerInfo());
      this.remotes.update(dt, this.time, this.net, this.world.path, chapter, cam, HUB_Y);
      this.hud.setPlayers([...this.net.peers.values()].map((p) => p.info?.name ?? '…'), this.net.status);
    } else this.hud.setPlayers([], 'offline');
    this.hud.update(dt);
    this.hud.setClock(this.env.clockText(), this.env.bandLabel(), this.env.presetId, this.env.auto, this.env.weatherLabel);
    this.hud.setInk(this.profile.data.ink);
    const kmh = this.flight ? this.glider.speed * 3.6 : this.mode === 'drive' ? this.hubCar.speedKmh : this.hubWalker.speed * 3.6;
    const title = area.title();
    const gusting = this.flight ? this.glider.gusting : this.hubCar.boosting || this.hubCar.burst > 0;
    this.hud.setSpeed(displaySpeed(kmh, this.options.units), this.flight ? this.glider.gust : this.hubCar.boostMeter, gusting, title.name, 0, 'down is down', this.mode === 'foot' && !this.flight, this.options.units === 'mph' ? 'mph' : 'km/h');
    const st = this.audio.station;
    this.hud.setRadio(st.freq, st.name, this.audio.trackLabel, this.audio.trackProgress, this.audio.radioOn);
    this.audio.update(this.flight ? this.glider.speed : this.mode === 'drive' ? Math.abs(this.hubCar.v) : this.hubWalker.speed, gusting, this.mode === 'drive' && !this.flight && this.state !== 'paused', this.env.rain, focus.y);
    // A quiet moment on a bench, calm at the World's End; wind when flying high.
    const calm = this.viewing ? 1 : area.id === 'worldsend' ? 0.45 : 0;
    const amb = area.ambienceAt(player.x, player.z);
    const flyWind = this.flight ? clamp(this.glider.y / 50, 0.2, 1) : 0;
    this.audio.calm = calm;
    this.audio.setAmbience({ night: paintShared.uNight.value, rain: this.env.rain, ...amb, wind: Math.max(amb.wind ?? 0, flyWind), calm });
    this.audioFrame(this.mode === 'drive' && !this.flight && this.state === 'hub', Math.abs(this.hubCar.v), this.hubCar.boosting || this.hubCar.burst > 0, this.mode === 'drive' ? this.input.throttle() : 0, this.mode === 'drive' && this.hubCar.grounded && (Math.abs(this.hubCar.slip) > 1.2 || this.hubCar.drifting) ? 1 : 0);

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
      fogDensity: this.env.fogDensity * Math.max(1, 3000 / this.drawDistance()) * (area.id === 'city' ? 0.5 : area.id === 'village' ? 0.7 : area.id === 'hills' ? 1.4 : area.id === 'worldsend' ? 0.45 : 1),
      flash: this.env.flash,
      dofFocus: 10,
      dofAmount: 0,
      // A bench's own mood while sitting; the World's End has a dreamy grade unless you chose one.
      lut: this.viewing?.zone.view?.lut ?? (area.id === 'worldsend' && this.settings.lut === 'none' ? 'dream' : undefined),
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

  /** Board positions in an area (tests): face direction as yaw. */
  debugBrandSpots(id: string): { x: number; z: number; yaw: number }[] {
    return brandSpotsFor(id).map((s) => ({ x: s.x, z: s.z, yaw: s.yaw ?? 0 }));
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
    analytics.track('restore', { id: p.district.id });
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
      this.saveAreaCheckpoint(true, p.name);
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
    for (const pk of area.pockets) if (seen.includes(`pocket:${pk.def.id}`)) markers.push({ kind: 'zone', x: pk.x, z: pk.z, icon: '✨' });
    for (const tg of this.freeMissions.targets()) markers.push({ kind: 'mission', x: tg.x, z: tg.z });
    if (area.perahera?.active) {
      const c = area.perahera.centre();
      markers.push({ kind: 'event', x: c.x, z: c.z, icon: '🐘' });
    }
    for (const peer of this.net.peers.values()) {
      const snap = peer.info && this.net.sample(peer);
      if (snap && snap.chapter === (area.id === 'harbour' ? 'hub' : area.id)) markers.push({ kind: 'peer', x: snap.x, z: snap.s - HUB_S_OFFSET, label: peer.info?.name });
    }
    const ring = this.flight?.run.course.rings[this.flight.run.next];
    if (ring) markers.push({ kind: 'mission', x: ring.x, z: ring.z });
    const p = this.flight ? this.glider : this.mode === 'foot' ? this.hubWalker : this.hubCar;
    const found = area.secrets.filter((s) => seen.includes(`secret:${s.id}`)).length;
    const places = area.places.filter((q) => seen.includes(`place:${area.id}:${q.id}`)).length;
    return {
      player: { x: p.x, z: p.z, heading: this.flight ? this.glider.heading : this.mode === 'foot' ? this.hubCam.yaw : this.hubCar.heading },
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
        window.setTimeout(() => this.hud.lootCard(t('daily.allDone', { n: p.data.streak.count }), RARITY_COLOURS[loot.rarity], loot.item ? itemLabel(loot.item) : `+${loot.ink} ink`, t(`rarity.${RARITY_NAMES[loot.rarity].toLowerCase()}` as StringKey)), 3400);
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

  /** Open a board's link (company site, sponsor, or the advertising contact). */
  private visitBrand(logo: BrandLogo): void {
    if (!logo.url) return;
    analytics.track('sponsor_click', { id: logo.id });
    this.input.releasePointerLock();
    window.open(logo.url, '_blank', 'noopener');
  }

  /** Chat line from another player, after the block list and chat setting. */
  private incomingChat(name: string, text: string): void {
    // Kept (unfiltered, last 50 lines) only so a report can include what was said.
    this.chatHistory.push({ name, text });
    if (this.chatHistory.length > 50) this.chatHistory.shift();
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
    this.skyBrush.clear();
    this.skyBrush.kind = null;
    this.brushing = false;
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
    // While a weather brush is chosen, dragging paints instead of looking around.
    if (this.skyBrush.kind) look.dx = look.dy = 0;
    this.skyBrush.update(this.pipeline.size.height, this.rig.camera);
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
    for (const c of settleChallenges(p)) this.hud.lootCard(t('pass.chComplete'), '#3e9fd8', c.title, [c.ink ? `+${c.ink} ink` : '', c.item ? itemLabel(c.item) : ''].filter(Boolean).join(' · '));
  }

  private checkTrophies(): void {
    for (const t of checkTrophies(this.profile)) {
      analytics.track('trophy', { id: t.id });
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

  /** Season and festival for films and screenshots (tools/trailer.mjs). */
  debugCalendar(season?: string, festival?: string): void {
    if (season) (this.options as { season: string }).season = season;
    if (festival) (this.options as { festival: string }).festival = festival;
    this.applyCalendar();
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

  /** Leave photo mode (films and tests). */
  debugPhotoExit(): void {
    if (this.state === 'photo') this.exitPhoto();
  }

  /**
   * Render a piece of the procedural score to a WebM (Opus) data URL
   * (tools/render-music.mjs): a station's band in a district's key and tempo.
   */
  async debugRenderMusic(station: number, district: DistrictDef, seconds: number): Promise<string | null> {
    this.unlockAudio();
    const a = this.audio;
    a.stationIndex = station;
    a.trackIndex = 0;
    a.radioOn = true;
    a.setDistrict(district);
    const blob = await a.record(seconds);
    if (!blob) return null;
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });
  }

  /** Paint trail state, for tests. */
  debugTrail(): { on: boolean; place: string | null; saved: number; shown: number; remote: number } {
    const place = this.trailPlaceId;
    return { on: this.trailBrush.on, place, saved: place ? this.trailStore.dots(place).length : 0, shown: this.trailLayer.size, remote: place ? this.remoteTrails.get(place)?.length ?? 0 : 0 };
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
    if (!onlineAllowed(this.options.family)) return;
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
const STILL = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** The photo of the week, cropped to a billboard's shape, with a caption strip. */
function winnerPicture(img: HTMLImageElement, name: string, caption: string, aspect: number, title: string): HTMLCanvasElement {
  const H = 512;
  const W = Math.round(H * aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return c;
  const strip = Math.round(H * 0.2);
  const scale = Math.max(W / img.width, (H - strip) / img.height);
  g.drawImage(img, (W - img.width * scale) / 2, (H - strip - img.height * scale) / 2, img.width * scale, img.height * scale);
  g.fillStyle = '#f6f0e4';
  g.fillRect(0, H - strip, W, strip);
  g.fillStyle = '#2b2622';
  g.textBaseline = 'middle';
  g.font = `600 ${Math.round(strip * 0.36)}px "Patrick Hand", "Noto Sans", sans-serif`;
  g.fillText(`🏆 ${title} · ${name}`, 16, H - strip * 0.66, W - 32);
  g.font = `${Math.round(strip * 0.28)}px "Noto Sans", sans-serif`;
  if (caption) g.fillText(caption, 16, H - strip * 0.26, W - 32);
  return c;
}

