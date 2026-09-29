// Fish sizes and the weekly fishing contest's rotation, shared by the game
// (src/gameplay/Fishing.ts) and the server (server/fishing.mjs), so both
// agree on what a real catch can measure.

/** Smallest and largest size of each fish, in centimetres. */
export const FISH_SIZES = {
  sardine: [12, 24],
  mackerel: [25, 45],
  seer: [50, 140],
  parrot: [25, 70],
  puffer: [15, 45],
  squid: [20, 60],
  tuna: [60, 200],
  lobster: [25, 60],
  sailfish: [150, 300],
  tilapia: [15, 40],
  carp: [30, 90],
  catfish: [30, 110],
  snakehead: [30, 90],
  trout: [25, 70],
  eel: [40, 120],
  goldfish: [8, 25],
  koi: [30, 80],
  goldkoi: [40, 90],
  turtle: [15, 35],
  moonkoi: [50, 110],
  inkfish: [60, 160],
  boot: [25, 32],
  bottle: [20, 30],
};

/** The fish of the weekly contest, one after another (common enough that everyone has a chance). */
export const CONTEST_ROTATION = ['seer', 'carp', 'koi', 'mackerel', 'catfish', 'trout', 'parrot', 'tilapia', 'squid', 'snakehead'];

/** This week's contest fish, from the week's index (see server/gallery.mjs weekOf). */
export function contestFish(weekIndex) {
  const n = CONTEST_ROTATION.length;
  return CONTEST_ROTATION[((weekIndex % n) + n) % n];
}

/** A size the game could really have caught for this fish (tenths of a centimetre), or null. */
export function checkCatch(fish, cm) {
  const range = typeof fish === 'string' && Object.hasOwn(FISH_SIZES, fish) ? FISH_SIZES[fish] : null;
  if (!range || typeof cm !== 'number' || !Number.isFinite(cm)) return null;
  const v = Math.round(cm * 10) / 10;
  return v >= range[0] && v <= range[1] ? v : null;
}
