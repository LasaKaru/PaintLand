import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import { t, type StringKey } from '../core/i18n';
import type { HumanModel, HumanPose } from '../models/Human';
import type { NetClient } from '../net/Net';
import { PaintMaterial } from '../render/PaintMaterial';
import type { LeisureHud, DjAction } from '../ui/LeisureHud';
import type { Season } from '../world/Calendar';
import type { AreaZone } from '../world/FreeRoamArea';
import { AREA_Y } from '../world/FreeRoamArea';
import { buildFishModel, buildFloat, buildLamp, buildRod, danceFloor, djPlace, DJ_STAGES, restPlace, type RestKind } from '../world/Leisure';
import { homeToWorld } from '../world/HomePlot';
import { contestFishFor, FISH, FISHING_SPOTS, fishInk, floatAt, recordCatch, ReelGame, rollFish, rollSize, speciesCaught, type FishDef, type FishingSpot } from './Fishing';
import { LIGHT_SCHEMES, lightLevel, newParty, onDanceFloor, type PartyMsg, type PartyState } from './Party';
import type { Profile } from './Profile';
import { addRest, cleanRest, restedMinutes, REST_RULES, waterPlants, wakeHour, type RestState } from './Rest';

/** What the game lends the leisure activities. */
export interface LeisureHost {
  readonly scene: THREE.Scene;
  readonly audio: AudioEngine;
  readonly profile: Profile;
  readonly net: NetClient;
  readonly hud: LeisureHud;
  human(): HumanModel;
  walker(): { x: number; z: number; place(x: number, z: number, heading: number): void };
  areaId(): string | null;
  hour(): number;
  setHour(h: number): void;
  rain(): number;
  season(): Season;
  /** Reduced motion or calm lighting: softer lights, gentler camera. */
  calm(): boolean;
  easyFishing(): boolean;
  /** May a party be shared with the room (the owner can switch this off)? */
  partyOnline(): boolean;
  /** Is the weekly fishing contest on, and are we signed in? */
  contestOpen(): boolean;
  submitCatch(fish: string, cm: number): void;
  toast(text: string): void;
  loot(title: string, colour: string, name: string, detail: string): void;
  checkTrophies(): void;
  /** Redraw the home (the plants grew). */
  refreshHome(): void;
  releasePointer(): void;
  petName(): string | null;
  hudHidden(hidden: boolean): void;
}

type Activity =
  | { kind: 'fishing'; spot: FishingSpot; game: ReelGame | null; idle: number; show: number; caught: FishDef | null }
  | { kind: 'rest'; what: RestKind; t: number; done: boolean }
  | { kind: 'dj'; stage: string };

const RARITY_COLOURS = ['#9a9a9a', '#4f9a5a', '#4a90c9', '#f4a52a'];
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/**
 * Fishing, resting at home and DJ parties: starting and leaving each one,
 * its input, the pose and camera, and the props in the world.
 */
export class LeisureMode {
  active: Activity | null = null;
  /** The party we are at (as DJ or dancer), if any. */
  party: PartyState | null = null;
  /** Who is DJ: 'me' or a player's id. */
  partyHost: string | null = null;
  private partyHeard = 0;
  private lastFx = { fill: 0, horn: 0, scratch: 0 };
  private sendTimer = 0;
  private danceTime = 0;

  private readonly rod = new THREE.Mesh(buildRod(), new PaintMaterial({ vertexColors: true, flat: true }));
  private readonly float = new THREE.Mesh(buildFloat(), new PaintMaterial({ vertexColors: true, flat: true }));
  private readonly line: THREE.Mesh;
  private readonly linePts = Array.from({ length: 13 }, () => new THREE.Vector3());
  private readonly held = new THREE.Group();
  private readonly lights = new THREE.Group();
  private readonly beams: THREE.Mesh[] = [];
  private readonly floorTiles: THREE.Mesh[] = [];
  private lightStage = '';

  constructor(private readonly host: LeisureHost) {
    // Along the forearm, tipped up so the rod points forward and up when the arm is out in front.
    this.rod.rotation.set(-2.38, 0, 0);
    // The line is a thin tube (a 1-pixel line would vanish under the watercolour filter).
    this.line = new THREE.Mesh(new THREE.BufferGeometry(), new PaintMaterial({ color: '#2b2622' }));
    this.line.frustumCulled = false;
    this.float.scale.setScalar(2);
    this.float.visible = this.line.visible = this.held.visible = this.lights.visible = false;
    host.scene.add(this.float, this.line, this.held, this.lights);
    host.hud.onDj = (a) => this.djAction(a);
    host.hud.onFilter = (v) => {
      if (!this.party || this.partyHost !== 'me') return;
      this.party.filter = v;
      this.sendParty();
    };
    host.hud.onRecord = (station, track, party) => this.pickRecord(station, track, party);
    host.net.onParty = (from, name, msg) => this.heard(from, name, msg);
  }

  private get rest(): RestState {
    const d = this.host.profile.data;
    return (d.rest = cleanRest(d.rest));
  }

  /** Stand in a leisure ring and press E. */
  start(zone: AreaZone): boolean {
    if (this.active) return true;
    if (zone.kind === 'fishing') {
      const spot = FISHING_SPOTS.find((s) => s.id === zone.spot);
      if (!spot) return false;
      this.host.walker().place(spot.x, spot.z, spot.yaw);
      this.active = { kind: 'fishing', spot, game: null, idle: 0, show: 0, caught: null };
      this.host.human().hold(this.rod);
      this.host.hud.setTip(t('fish.cast'));
      if (this.host.profile.markSeen('fished')) this.host.checkTrophies();
      return true;
    }
    if (zone.kind === 'rest' && zone.spot) {
      const what = zone.spot as RestKind;
      if (what === 'pet' && !this.host.petName()) {
        this.host.toast(t('rest.noPet'));
        return true;
      }
      if (what === 'records') {
        this.host.releasePointer();
        this.host.hud.showRecords(this.host.audio.stationNames, { station: this.host.audio.stationIndex, track: this.host.audio.trackIndex });
        return true;
      }
      const p = restPlace(what);
      this.host.walker().place(p.x, p.z, p.yaw);
      this.active = { kind: 'rest', what, t: 0, done: false };
      this.host.hud.setTip(t(`restTip.${what}` as StringKey));
      if (what === 'bed') {
        this.host.hud.setSleep(true);
        this.host.hudHidden(true);
      }
      if (what === 'plants') this.water();
      if (what === 'tea') this.host.audio.blip(660, 0.25, 'sine', 0.04);
      return true;
    }
    if (zone.kind === 'dj' && zone.spot) {
      if (this.party && this.partyHost !== 'me') {
        this.host.toast(t('dj.busy'));
        return true;
      }
      this.startDj(zone.spot);
      return true;
    }
    return false;
  }

  /** Leave whatever we are doing (moving away, R, or the menu). */
  stop(): void {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.host.hud.setTip(null);
    this.host.hud.setMeter(null);
    if (a.kind === 'fishing') {
      this.host.human().hold(null);
      this.float.visible = this.line.visible = this.held.visible = false;
      if (a.game?.phase === 'reel') this.host.toast(t('fish.gotAway'));
    } else if (a.kind === 'rest') {
      if (a.what === 'bed') {
        this.host.hud.setSleep(false);
        this.host.hudHidden(false);
      }
    } else if (a.kind === 'dj') {
      this.host.hud.showDj(null, [], 0);
      this.endParty();
    }
  }

  /** Input for this frame: E pressed, E held, and whether the player tried to move away. Returns true when handled. */
  input(pressed: boolean, held: boolean, leave: boolean): boolean {
    const a = this.active;
    if (!a) return false;
    if (a.kind === 'dj') {
      if (leave) this.stop();
      return true;
    }
    if (a.kind === 'rest') {
      // Sleeping can't be cut short (it's only a few seconds); everything else ends when you move.
      if ((leave || pressed) && (a.what !== 'bed' || a.done)) this.stop();
      return true;
    }
    // Fishing.
    if (leave) {
      this.stop();
      return true;
    }
    if (!a.game) {
      if (pressed && a.show <= 0) this.cast(a);
      return true;
    }
    this.pressedNow = pressed;
    this.heldNow = held;
    return true;
  }
  private pressedNow = false;
  private heldNow = false;

  private cast(a: Extract<Activity, { kind: 'fishing' }>): void {
    const h = this.host;
    const w = { water: a.spot.water, area: a.spot.area, hour: h.hour(), season: h.season(), rain: h.rain() };
    const def = rollFish(w, Math.random());
    a.game = new ReelGame(def, Math.random, h.easyFishing());
    a.caught = null;
    h.audio.whoosh();
    setTimeout(() => this.active === a && h.audio.plop(), 450);
    h.hud.setTip(t('fish.wait'));
    const f = floatAt(a.spot);
    this.float.position.set(f.x, this.surface(a.spot), f.z);
    this.float.visible = this.line.visible = true;
  }

  /** Height of the water under the float. */
  private surface(s: FishingSpot): number {
    const pond: Record<string, number> = { 'vl-koi': 0.12, 'ct-lake': 0.22, 'we-lake': 0.23 };
    return pond[s.id] !== undefined ? AREA_Y + pond[s.id] : 0.05;
  }

  update(dt: number, time: number): void {
    const a = this.active;
    this.updateParty(dt, time);
    this.host.hud.setRested(restedMinutes(this.host.profile.data.rest, Date.now()));
    if (!a) return;
    if (a.kind === 'fishing') this.fishStep(a, dt, time);
    else if (a.kind === 'rest') this.restStep(a, dt);
  }

  private fishStep(a: Extract<Activity, { kind: 'fishing' }>, dt: number, time: number): void {
    const h = this.host;
    if (a.show > 0) {
      a.show -= dt;
      this.held.visible = a.show > 0;
      if (this.held.visible) {
        h.human().root.getWorldPosition(_a);
        this.held.position.set(_a.x, _a.y + 1.9 + Math.sin(time * 3) * 0.05, _a.z);
        this.held.rotation.y = time * 0.8;
      }
      if (a.show <= 0) h.hud.setTip(t('fish.cast'));
      return;
    }
    const g = a.game;
    if (!g) return;
    const before = g.phase;
    const phase = g.step(dt, this.pressedNow, this.heldNow);
    this.pressedNow = false;
    // The float: bobbing, nibbles, a dip on the bite, dragged about while reeling.
    const f = floatAt(a.spot);
    const bob = Math.sin(time * 2.2) * 0.04;
    const dip = phase === 'bite' ? 0.25 : g.nibble * 0.08;
    const pull = phase === 'reel' ? (g.fish - 0.5) * 2.4 : 0;
    this.float.position.set(f.x + Math.cos(a.spot.yaw) * pull, this.surface(a.spot) + bob - dip, f.z - Math.sin(a.spot.yaw) * pull);
    if (before !== phase) {
      if (phase === 'bite') {
        h.audio.splash();
        h.hud.setTip(t('fish.strike'));
      } else if (phase === 'reel') {
        h.hud.setTip(t('fish.reel'));
      } else if (phase === 'caught') this.landed(a, g);
      else if (phase === 'lost') {
        h.hud.setTip(t(g.why.escaped === 'slow' ? 'fish.tooSlow' : 'fish.gotAway'));
        this.endCast(a, 1.2);
      }
    }
    if (phase === 'reel') {
      if (this.heldNow && Math.random() < dt * 14) h.audio.reelClick();
      h.hud.setMeter({ fish: g.fish, bar: g.bar, size: g.barSize, progress: g.progress, holding: g.holding, icon: g.def.icon });
    } else h.hud.setMeter(null);
    this.drawLine();
  }

  private endCast(a: Extract<Activity, { kind: 'fishing' }>, show: number): void {
    a.game = null;
    a.show = show;
    this.float.visible = this.line.visible = false;
    this.host.hud.setMeter(null);
  }

  /** A fish is landed: the book, ink, a card, the contest. */
  private landed(a: Extract<Activity, { kind: 'fishing' }>, g: ReelGame): void {
    const h = this.host;
    const d = g.def;
    const cm = rollSize(d.id, Math.random());
    const book = (h.profile.data.fish ??= {});
    const { first, record } = recordCatch(book, d.id, cm);
    const ink = fishInk(d, cm);
    const got = ink > 0 ? h.profile.earn(ink) : 0;
    h.profile.addStat(d.junk ? 'junk' : 'fish');
    if (d.rarity === 3) h.profile.addStat('legendaryFish');
    h.profile.recordStat('bigFish', Math.round(cm));
    h.profile.save();
    const name = t(`fishName.${d.id}` as StringKey);
    const rarity = t(`fishRarity.${d.rarity}` as StringKey);
    const parts = [d.junk ? t('fish.junk') : `${cm.toFixed(1)} cm`, d.release ? t('fish.released') : got ? `+${got} ink` : '', first ? t('fish.new') : record ? t('fish.record') : ''].filter(Boolean);
    h.loot(d.junk ? t('fish.tidy') : rarity, RARITY_COLOURS[d.rarity], `${d.icon} ${name}`, parts.join(' · '));
    h.audio.loot(d.junk ? 0 : d.rarity);
    // Hold the catch up for a moment.
    this.held.clear();
    if (!d.junk) {
      const colour = ['#9fb7c9', '#6fae4a', '#4a90c9', '#f4a52a'][d.rarity];
      const m = new THREE.Mesh(buildFishModel(d.id === 'koi' || d.id === 'goldkoi' || d.id === 'goldfish' ? '#f08a2e' : d.id === 'moonkoi' ? '#c9b8f0' : d.id === 'inkfish' ? '#2b2622' : colour, '#f6f0e4'), new PaintMaterial({ vertexColors: true, flat: true }));
      m.scale.setScalar(Math.min(1.2, 0.3 + cm / 150));
      this.held.add(m);
    }
    this.held.visible = !d.junk;
    if (h.contestOpen() && d.id === contestFishFor(Date.now())) h.submitCatch(d.id, cm);
    if (speciesCaught(book) === FISH.filter((f) => !f.junk).length && h.profile.markSeen('fishbook-full')) h.toast(t('fish.bookFull'));
    h.checkTrophies();
    h.hud.setTip(null);
    this.endCast(a, 2.4);
  }

  /** The fishing line from the rod tip to the float, sagging a little. */
  private drawLine(): void {
    if (!this.line.visible) return;
    this.rod.updateWorldMatrix(true, false);
    const tip = _a.set(0, 2.6, 0).applyMatrix4(this.rod.matrixWorld);
    const end = _b.copy(this.float.position).add(new THREE.Vector3(0, 0.2, 0));
    const reeling = this.active?.kind === 'fishing' && this.active.game?.phase === 'reel';
    const n = this.linePts.length;
    this.linePts.forEach((pt, i) => {
      const k = i / (n - 1);
      const sag = Math.sin(k * Math.PI) * (reeling ? 0.1 : 0.8);
      pt.set(tip.x + (end.x - tip.x) * k, tip.y + (end.y - tip.y) * k - sag, tip.z + (end.z - tip.z) * k);
    });
    this.line.geometry.dispose();
    this.line.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(this.linePts), 16, 0.03, 4, false);
  }

  // ————— resting —————

  private restStep(a: Extract<Activity, { kind: 'rest' }>, dt: number): void {
    const h = this.host;
    a.t += dt;
    const now = Date.now();
    if (a.done) return;
    if (a.what === 'sofa' && a.t > REST_RULES.sofaSeconds) {
      a.done = true;
      const m = addRest(this.rest, REST_RULES.minutes.sofa, now);
      h.toast(t('rest.restedNow', { min: Math.round(m) }));
      h.profile.addStat('sofa');
      h.profile.save();
      h.checkTrophies();
    } else if (a.what === 'tea' && a.t > 4) {
      a.done = true;
      const m = addRest(this.rest, REST_RULES.minutes.tea, now);
      h.toast(t('rest.teaDone', { min: Math.round(m) }));
      h.profile.addStat('teas');
      h.profile.save();
      h.checkTrophies();
    } else if (a.what === 'pet' && a.t > 2.5) {
      a.done = true;
      addRest(this.rest, REST_RULES.minutes.pet, now);
      h.toast(t('rest.petted', { name: h.petName() ?? '' }));
      h.audio.chime(76);
      h.profile.addStat('pets');
      h.profile.save();
      h.checkTrophies();
    } else if (a.what === 'plants' && a.t > 3) {
      a.done = true;
    } else if (a.what === 'bed' && a.t > 3.5) {
      // Asleep: the clock moves on while the screen is dark, then you wake up well rested.
      a.done = true;
      const wake = wakeHour(h.hour());
      h.setHour(wake);
      const m = addRest(this.rest, REST_RULES.minutes.bed, now);
      h.profile.addStat('sleeps');
      h.profile.save();
      h.hud.setSleep(false);
      h.hudHidden(false);
      h.toast(t(wake === 7 ? 'rest.morning' : 'rest.evening', { min: Math.round(m) }));
      h.checkTrophies();
    }
  }

  private water(): void {
    const h = this.host;
    const day = new Date().toISOString().slice(0, 10);
    const r = waterPlants(this.rest, day);
    if (!r.ok) {
      h.toast(t('rest.wateredToday'));
      return;
    }
    let msg = t(r.grew ? (this.rest.plants.stage >= 3 ? 'rest.bloom' : 'rest.grew') : 'rest.watered');
    if (r.bloomInk) msg += ` · +${h.profile.earn(r.bloomInk)} ink`;
    h.toast(msg);
    h.profile.save();
    if (r.grew) h.refreshHome();
    h.checkTrophies();
  }

  private pickRecord(station: number, track: number, party: boolean): void {
    const h = this.host;
    h.audio.tune(station, track);
    h.audio.scratch();
    h.hud.showRecords(null);
    if (party) this.startDj('home');
    else h.toast(t('rec.playing', { name: h.audio.stationNames[h.audio.stationIndex] ?? '' }));
  }

  // ————— DJ parties —————

  private startDj(stage: string): void {
    const h = this.host;
    const place = stage === 'home' ? restPlace('records') : djPlace(stage);
    if (place) h.walker().place(place.x, place.z, place.yaw);
    this.party = newParty(stage, h.audio.stationIndex, h.audio.trackIndex);
    this.partyHost = 'me';
    this.active = { kind: 'dj', stage };
    h.releasePointer();
    this.renderDj();
    h.hud.setTip(t('dj.tip'));
    h.audio.airHorn();
    if (h.profile.markSeen('dj')) h.checkTrophies();
    this.sendParty();
  }

  private renderDj(): void {
    const h = this.host;
    const crowd = this.partyHost === 'me' && h.partyOnline() ? [...h.net.peers.values()].length : 0;
    h.hud.showDj(this.party, h.audio.stationNames, crowd);
  }

  /** A DJ button or key (1–5). */
  djAction(a: DjAction): void {
    const p = this.party;
    const h = this.host;
    if (!p || this.partyHost !== 'me') return;
    const stations = h.audio.stationNames.length;
    if (a === 'leave') return this.stop();
    if (a === 'station-' || a === 'station+') {
      p.station = (p.station + (a === 'station+' ? 1 : -1) + stations) % stations;
      p.track = 0;
      h.audio.tune(p.station, p.track);
      h.audio.scratch();
    } else if (a === 'track-' || a === 'track+') {
      p.track = Math.max(0, p.track + (a === 'track+' ? 1 : -1));
      h.audio.tune(p.station, p.track);
      p.track = h.audio.trackIndex;
    } else if (a === 'fill') p.fill++;
    else if (a === 'horn') p.horn++;
    else if (a === 'scratch') p.scratch++;
    else if (a === 'echo') p.echo = p.echo > 0 ? 0 : 0.6;
    else if (a === 'lights') p.scheme = (p.scheme + 1) % LIGHT_SCHEMES.length;
    this.playFx(p);
    this.renderDj();
    this.sendParty();
  }

  /** Play effects whose counters moved on. */
  private playFx(p: PartyState): void {
    const a = this.host.audio;
    if (p.fill !== this.lastFx.fill) a.djFill();
    if (p.horn !== this.lastFx.horn) a.airHorn();
    if (p.scratch !== this.lastFx.scratch) a.scratch();
    this.lastFx = { fill: p.fill, horn: p.horn, scratch: p.scratch };
    a.dj.filter = p.filter;
    a.dj.echo = p.echo;
  }

  private sendParty(): void {
    const p = this.party;
    if (!p || this.partyHost !== 'me' || !this.host.partyOnline() || !this.host.net.connected) return;
    this.host.net.party({ a: 'state', ...p });
    this.sendTimer = 2;
  }

  private endParty(): void {
    const h = this.host;
    if (this.party && this.partyHost === 'me' && h.partyOnline() && h.net.connected) h.net.party({ a: 'end', stage: this.party.stage });
    if (this.party && this.partyHost === 'me' && this.party.stage !== 'home') h.profile.addStat('djSets');
    this.party = null;
    this.partyHost = null;
    h.audio.dj.filter = 0;
    h.audio.dj.echo = 0;
    this.lights.visible = false;
    h.checkTrophies();
  }

  /** A party message from another player. */
  private heard(from: string, name: string, msg: PartyMsg): void {
    const h = this.host;
    if (!h.partyOnline()) return;
    if (this.partyHost === 'me') return; // we are DJ ourselves
    if (msg.a === 'end') {
      if (this.partyHost === from) this.endParty();
      return;
    }
    // Only parties at a stage in the same town (a home party is private).
    const stage = DJ_STAGES.find((s) => s.id === msg.stage);
    if (!stage || stage.area !== h.areaId()) return;
    const fresh = this.partyHost !== from;
    this.partyHost = from;
    this.partyHeard = 0;
    const { a: _a, ...state } = msg;
    if (fresh) {
      this.lastFx = { fill: state.fill, horn: state.horn, scratch: state.scratch };
      h.toast(t('dj.started', { name }));
    }
    if (fresh || !this.party || this.party.station !== state.station || this.party.track !== state.track) h.audio.tune(state.station, state.track);
    this.party = state;
    this.playFx(state);
  }

  private updateParty(dt: number, time: number): void {
    const h = this.host;
    const p = this.party;
    if (p && this.partyHost !== 'me') {
      // A DJ who went quiet (left the room) ends the party.
      this.partyHeard += dt;
      if (this.partyHeard > 8 || !h.net.connected) this.endParty();
    }
    if (p && this.partyHost === 'me') {
      this.sendTimer -= dt;
      if (this.sendTimer <= 0) this.sendParty();
    }
    this.drawLights(time);
    // Dancing counts toward a trophy.
    if (this.dancing()) {
      this.danceTime += dt;
      if (this.danceTime > 5) {
        h.profile.addStat('danced', this.danceTime);
        this.danceTime = 0;
        h.checkTrophies();
      }
    }
  }

  /** Should the player dance (idle on the dance floor while a party is on)? */
  dancing(): boolean {
    const p = this.party;
    if (!p || this.active) return false;
    const w = this.host.walker();
    const floor = p.stage === 'home' ? null : danceFloor(p.stage);
    return onDanceFloor(w.x, w.z, floor);
  }

  /** Stage lights over the dance floor: beams and floor tiles pulsing with the music. */
  private drawLights(time: number): void {
    const p = this.party;
    const area = this.host.areaId();
    const stage = p ? DJ_STAGES.find((s) => s.id === p.stage && s.area === area) : null;
    if (!p || !stage) {
      this.lights.visible = false;
      return;
    }
    if (this.lightStage !== stage.id) this.buildLights(stage);
    this.lights.visible = true;
    const beat = this.host.audio.beat;
    const calm = this.host.calm();
    const level = lightLevel(time, beat.bpm, calm, beat.phase);
    const cols = LIGHT_SCHEMES[p.scheme];
    // (Everything in the world uses the paint material: the renderer's passes read its outputs.)
    this.beams.forEach((b, i) => {
      const m = b.material as PaintMaterial;
      m.color.set(cols[i % cols.length]);
      m.emissiveStrength = 0.4 + 0.6 * level;
      // Beams sweep slowly (not at all with reduced motion).
      b.rotation.z = calm ? 0 : Math.sin(time * 0.6 + i * 1.3) * 0.35;
    });
    this.floorTiles.forEach((tile, i) => {
      const m = tile.material as PaintMaterial;
      m.color.set(cols[(i + beat.bar) % cols.length]);
      m.emissiveStrength = 0.15 + 0.75 * level * ((i + beat.bar) % 2 ? 0.6 : 1);
    });
  }

  private buildLights(stage: { id: string; x: number; z: number; yaw: number }): void {
    for (const o of [...this.lights.children]) {
      this.lights.remove(o);
      (o as THREE.Mesh).geometry?.dispose();
    }
    this.beams.length = this.floorTiles.length = 0;
    this.lightStage = stage.id;
    this.lights.position.set(stage.x, AREA_Y, stage.z);
    this.lights.rotation.y = stage.yaw;
    const lamp = buildLamp();
    for (let i = 0; i < 5; i++) {
      const lx = -3.2 + i * 1.6;
      const can = new THREE.Mesh(lamp, new PaintMaterial({ vertexColors: true, flat: true }));
      can.position.set(lx, 4.1, 0.6);
      this.lights.add(can);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.2, 16, 1, true).translate(0, -2.1, 0), new PaintMaterial({ color: '#ffffff', emissive: 0.6, ghost: true, side: THREE.DoubleSide }));
      const pivot = new THREE.Group();
      pivot.position.set(lx, 3.9, 0.6);
      pivot.rotation.x = -0.55;
      pivot.add(beam);
      this.lights.add(pivot);
      this.beams.push(beam);
    }
    // A chequered dance floor in front of the stage.
    for (let x = -3; x <= 3; x++)
      for (let z = 0; z < 5; z++) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 1.9), new PaintMaterial({ color: '#ffffff', emissive: 0.3 }));
        tile.position.set(x * 2, 0.06, -3.2 - z * 2);
        this.lights.add(tile);
        this.floorTiles.push(tile);
      }
  }

  // ————— pose and camera —————

  /** The pose to draw (null = the usual). */
  pose(): HumanPose | null {
    const a = this.active;
    if (!a) return this.dancing() ? 'dance' : null;
    if (a.kind === 'fishing') return a.game?.phase === 'reel' ? 'reel' : 'fish';
    if (a.kind === 'dj') return 'dj';
    return a.what === 'sofa' ? 'sit' : a.what === 'bed' ? 'sleep' : a.what === 'tea' ? 'sip' : a.what === 'records' ? 'idle' : 'tend';
  }

  /** How far to lift the character (lying on the bed). */
  lift(): number {
    const a = this.active;
    return a?.kind === 'rest' && a.what === 'bed' ? 0.95 : 0;
  }

  /** A calm camera for the activity (false = the usual follow camera). */
  camera(desired: THREE.Vector3, look: THREE.Vector3, playerY: number): boolean {
    const a = this.active;
    if (!a) return false;
    const w = this.host.walker();
    if (a.kind === 'fishing') {
      const f = floatAt(a.spot);
      const bx = w.x - f.x;
      const bz = w.z - f.z;
      const d = Math.hypot(bx, bz) || 1;
      // Behind and to one side, high enough to see over the quay to the float.
      desired.set(w.x + (bx / d) * 4.6 + (bz / d) * 3.2, playerY + 4.2, w.z + (bz / d) * 4.6 - (bx / d) * 3.2);
      look.set(f.x * 0.75 + w.x * 0.25, playerY - 0.6, f.z * 0.75 + w.z * 0.25);
      return true;
    }
    if (a.kind === 'rest') {
      // Look into the house from beyond its open front, a little up.
      const p = restPlace(a.what);
      const o0 = homeToWorld(0, 0);
      const o1 = homeToWorld(0, 1);
      const ox = o1.x - o0.x;
      const oz = o1.z - o0.z;
      desired.set(p.x + ox * 7, playerY + 3.2, p.z + oz * 7);
      look.set(p.x, playerY + (a.what === 'bed' ? 1.4 : 1.1), p.z);
      return true;
    }
    if (a.kind === 'dj') {
      const d = this.party?.stage === 'home' ? null : DJ_STAGES.find((s) => s.id === a.stage);
      if (!d) return false;
      // From the dance floor, a little to one side, looking at the DJ behind the decks.
      const fx = -Math.sin(d.yaw);
      const fz = -Math.cos(d.yaw);
      const dj = djPlace(d.id)!;
      desired.set(d.x + fx * 7.5 + fz * 2.5, playerY + 2.3, d.z + fz * 7.5 - fx * 2.5);
      look.set(dj.x, playerY + 1.5, dj.z);
      return true;
    }
    return false;
  }

  /** The pose shared with other players. */
  sharedPose(): string | undefined {
    const p = this.pose();
    return p && p !== 'sit' && p !== 'idle' ? p : undefined;
  }
}
