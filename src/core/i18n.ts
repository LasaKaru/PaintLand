/**
 * Localisation (docs/10 §6). Strings are keyed; each key has English, Sinhala
 * and Tamil. Missing translations fall back to English, so new text never
 * breaks the UI. `{name}` placeholders are filled from `vars`.
 *
 * Sinhala and Tamil drafts should be reviewed by native speakers before release.
 */
export type Lang = 'en' | 'si' | 'ta';

export const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'si', name: 'සිංහල' },
  { id: 'ta', name: 'தமிழ்' },
];

type Entry = { en: string; si?: string; ta?: string };

const STRINGS = {
  // Main menu
  'menu.resume': { en: '▶ Resume', si: '▶ නැවත අරඹන්න', ta: '▶ தொடரவும்' },
  'menu.play': { en: '▶ Play · {chapter}', si: '▶ ක්‍රීඩා කරන්න · {chapter}', ta: '▶ விளையாடு · {chapter}' },
  'menu.hub': { en: '⚓ Harbour Town · free roam', si: '⚓ වරාය නගරය · නිදහසේ සැරිසරන්න', ta: '⚓ துறைமுக நகரம் · சுதந்திரமாக சுற்றுங்கள்' },
  'menu.chapters': { en: 'Chapters', si: 'පරිච්ඡේද', ta: 'அத்தியாயங்கள்' },
  'menu.trials': { en: '⏱ Time trials · leaderboard', si: '⏱ කාල තරඟ · ප්‍රමුඛ පුවරුව', ta: '⏱ நேரப் போட்டி · தரவரிசை' },
  'menu.missions': { en: 'Missions', si: 'මෙහෙයුම්', ta: 'பணிகள்' },
  'menu.wardrobe': { en: 'Wardrobe', si: 'ඇඳුම් කබඩ්', ta: 'உடை அலமாரி' },
  'menu.garage': { en: 'Garage', si: 'ගරාජය', ta: 'கேரேஜ்' },
  'menu.shop': { en: 'Shop & inventory', si: 'සාප්පුව සහ බඩු', ta: 'கடை மற்றும் சரக்கு' },
  'menu.multiplayer': { en: 'Multiplayer', si: 'බහු ක්‍රීඩක', ta: 'பல்வீரர்' },
  'menu.trophies': { en: 'Trophies · {n}/{total}', si: 'කුසලාන · {n}/{total}', ta: 'கோப்பைகள் · {n}/{total}' },
  'menu.settings': { en: 'Settings', si: 'සැකසුම්', ta: 'அமைப்புகள்' },
  'menu.intro': { en: 'Watch the intro', si: 'හැඳින්වීම නරඹන්න', ta: 'அறிமுகத்தைப் பாருங்கள்' },
  'menu.credits': { en: 'Credits', si: 'ස්තූතිය', ta: 'நன்றி' },
  'menu.now': { en: 'Now showing', si: 'දැන් පෙන්වන්නේ', ta: 'இப்போது காட்டப்படுவது' },
  'menu.back': { en: '← Back', si: '← ආපසු', ta: '← பின்செல்' },
  'menu.sealed': { en: '{n} phrases sealed', si: 'ගී ඛණ්ඩ {n}ක් සම්පූර්ණයි', ta: '{n} இசைத் தொடர்கள் முடிந்தன' },
  'menu.language': { en: 'Language', si: 'භාෂාව', ta: 'மொழி' },
  // Splash
  'splash.banner': { en: 'Drive the song · walk the page · paint the world', si: 'ගීතය පදවන්න · පිටුවේ ඇවිදින්න · ලෝකය පින්තාරු කරන්න', ta: 'பாடலை ஓட்டு · பக்கத்தில் நட · உலகை வரை' },
  'splash.press': { en: 'Press any key to begin', si: 'ආරම්භ කිරීමට ඕනෑම යතුරක් ඔබන්න', ta: 'தொடங்க எந்த விசையையும் அழுத்தவும்' },
  // Screen titles
  'title.settings': { en: 'Settings', si: 'සැකසුම්', ta: 'அமைப்புகள்' },
  'title.trials': { en: 'Time trials', si: 'කාල තරඟ', ta: 'நேரப் போட்டிகள்' },
  'title.trophies': { en: 'Trophies · {n} of {total}', si: 'කුසලාන · {total} න් {n}', ta: 'கோப்பைகள் · {total} இல் {n}' },
  // Settings tabs and choices
  'set.graphics': { en: 'Graphics', si: 'ග්‍රැෆික්ස්', ta: 'வரைகலை' },
  'set.look': { en: 'Look', si: 'පෙනුම', ta: 'தோற்றம்' },
  'set.controls': { en: 'Controls', si: 'පාලන', ta: 'கட்டுப்பாடுகள்' },
  'set.driving': { en: 'Driving', si: 'රිය පැදවීම', ta: 'ஓட்டுதல்' },
  'set.audio': { en: 'Audio', si: 'ශබ්ද', ta: 'ஒலி' },
  'set.access': { en: 'Accessibility', si: 'ප්‍රවේශ්‍යතාව', ta: 'அணுகல்தன்மை' },
  'q.low': { en: 'Low', si: 'අඩු', ta: 'குறைவு' },
  'q.medium': { en: 'Medium', si: 'මධ්‍යම', ta: 'நடுத்தரம்' },
  'q.high': { en: 'High', si: 'ඉහළ', ta: 'உயர்' },
  'q.ultra': { en: 'Ultra', si: 'අති ඉහළ', ta: 'மிக உயர்' },
  'q.custom': { en: 'Custom', si: 'අභිරුචි', ta: 'தனிப்பயன்' },
  'art.watercolour': { en: 'Watercolour', si: 'දිය සායම්', ta: 'நீர்வண்ணம்' },
  'art.illustrated': { en: 'Illustrated', si: 'චිත්‍රිත', ta: 'சித்திரம்' },
  'art.realistic': { en: 'Realistic', si: 'යථාර්ථවාදී', ta: 'யதார்த்தம்' },
  // Prompts
  'prompt.getIn': { en: 'F · Get in', si: 'F · වාහනයට නගින්න', ta: 'F · வாகனத்தில் ஏறு' },
  'prompt.getOut': { en: 'F · Get out and walk', si: 'F · බැස ඇවිදින්න', ta: 'F · இறங்கி நட' },
  'prompt.slowDown': { en: 'Slow down to get out', si: 'බැසීමට වේගය අඩු කරන්න', ta: 'இறங்க வேகத்தைக் குறைக்கவும்' },
  'prompt.talk': { en: 'E · Talk to {name}', si: 'E · {name} සමඟ කතා කරන්න', ta: 'E · {name} உடன் பேசு' },
  'prompt.enter': { en: 'E · Enter {place} (or drive through)', si: 'E · {place} වෙත ඇතුළු වන්න (හෝ හරහා පදවන්න)', ta: 'E · {place} உள்ளே செல் (அல்லது ஓட்டிச் செல்)' },
  // Hub
  'hub.kicker': { en: 'Home port', si: 'නිවහන් වරාය', ta: 'சொந்தத் துறைமுகம்' },
  'hub.name': { en: 'Harbour Town', si: 'වරාය නගරය', ta: 'துறைமுக நகரம்' },
  'hub.poem': { en: 'Drive or walk anywhere · painted gates lead to every chapter', si: 'ඕනෑම තැනකට යන්න · දොරටු පරිච්ඡේද වෙත', ta: 'எங்கும் செல்லுங்கள் · வாயில்கள் அத்தியாயங்களுக்கு' },
  'zone.garage': { en: '🔧 Garage', si: '🔧 ගරාජය', ta: '🔧 கேரேஜ்' },
  'zone.wardrobe': { en: '👒 Wardrobe', si: '👒 ඇඳුම් කබඩ්', ta: '👒 உடை அலமாரி' },
  'zone.shop': { en: '🧪 Shop', si: '🧪 සාප්පුව', ta: '🧪 கடை' },
  'zone.missions': { en: '📋 Mission board', si: '📋 මෙහෙයුම් පුවරුව', ta: '📋 பணிப் பலகை' },
  'zone.trophies': { en: '🏆 Trophy hall', si: '🏆 කුසලාන ශාලාව', ta: '🏆 கோப்பை மண்டபம்' },
  // Tips
  'tip.label': { en: 'Tip', si: 'ඉඟිය', ta: 'குறிப்பு' },
  'tip.hub': { en: 'W A S D to drive · E at a glowing ring opens the garage, wardrobe or shop · drive through a painted gate to start a chapter', si: 'පැදවීමට W A S D · දිලිසෙන වළල්ලක දී E ඔබා ගරාජය, ඇඳුම් හෝ සාප්පුව විවෘත කරන්න · පරිච්ඡේදයක් ඇරඹීමට පින්තාරු කළ දොරටුවක් හරහා පදවන්න', ta: 'ஓட்ட W A S D · ஒளிரும் வளையத்தில் E அழுத்தி கேரேஜ், உடை அல்லது கடையைத் திறக்கவும் · அத்தியாயத்தைத் தொடங்க வண்ண வாயில் வழியாக ஓட்டவும்' },
  'tip.hubTouch': { en: 'Drive with the stick and GO · E at a glowing ring opens the garage, wardrobe or shop', si: 'දණ්ඩ සහ GO මඟින් පදවන්න · දිලිසෙන වළල්ලක දී E ඔබන්න', ta: 'குச்சி மற்றும் GO மூலம் ஓட்டவும் · ஒளிரும் வளையத்தில் E அழுத்தவும்' },
  'tip.drive': { en: 'Hold W to drive, A / D to steer — the rover keeps rolling on its own', si: 'පැදවීමට W තදකර ගන්න, හැරවීමට A / D — රෝවරය තනිවම ඉදිරියට යයි', ta: 'ஓட்ட W அழுத்திப் பிடிக்கவும், திருப்ப A / D — ரோவர் தானாகவே உருளும்' },
  'tip.driveTouch': { en: 'Hold GO to drive, steer with the stick', si: 'පැදවීමට GO තදකර ගන්න, දණ්ඩෙන් හරවන්න', ta: 'ஓட்ட GO அழுத்திப் பிடிக்கவும், குச்சியால் திருப்பவும்' },
  'tip.notes': { en: 'Drive through the floating notes: they play this street’s melody. A whole phrase gets sealed ✓', si: 'පාවෙන ස්වර හරහා පදවන්න: ඒවා මේ වීදියේ තනුව වාදනය කරයි. සම්පූර්ණ ඛණ්ඩයක් මුද්‍රා තැබේ ✓', ta: 'மிதக்கும் இசைக்குறிகள் வழியாக ஓட்டுங்கள்: அவை இந்த வீதியின் மெட்டை இசைக்கும். முழுத் தொடர் முத்திரையிடப்படும் ✓' },
  'tip.hop': { en: 'Space to hop — clean landings give a speed kick', si: 'පැනීමට Space — පිරිසිදු ගොඩබෑමකින් වේගය වැඩිවේ', ta: 'தாவ Space — சுத்தமான தரையிறக்கம் வேகம் தரும்' },
  'tip.boost': { en: 'Your boost is full — hold Shift', si: 'ඔබේ බූස්ට් පිරී ඇත — Shift තදකර ගන්න', ta: 'உங்கள் பூஸ்ட் நிறைந்துள்ளது — Shift அழுத்திப் பிடிக்கவும்' },
  'tip.gravity': { en: 'The road is your gravity: walls and ceilings are just more road. Hold on!', si: 'මාර්ගයම ඔබේ ගුරුත්වාකර්ෂණයයි: බිත්ති සහ සිවිලිම් තවත් මාර්ගයක් පමණි. තදින් අල්ලා ගන්න!', ta: 'சாலையே உங்கள் ஈர்ப்பு: சுவர்களும் கூரைகளும் இன்னும் சாலைதான். பிடித்துக்கொள்ளுங்கள்!' },
  'tip.walk': { en: 'Stop and press F to get out and walk. P opens photo mode', si: 'නතර කර F ඔබා බැස ඇවිදින්න. P ඡායාරූප ප්‍රකාරය විවෘත කරයි', ta: 'நிறுத்தி F அழுத்தி இறங்கி நடக்கவும். P புகைப்பட முறையைத் திறக்கும்' },
  'tip.settings': { en: 'Menu → Settings: graphics quality, a realistic art style, realistic handling and key rebinding', si: 'මෙනුව → සැකසුම්: ග්‍රැෆික් ගුණත්වය, යථාර්ථවාදී පෙනුම, යථාර්ථවාදී පැදවීම සහ යතුරු වෙනස් කිරීම', ta: 'மெனு → அமைப்புகள்: வரைகலைத் தரம், யதார்த்தத் தோற்றம், யதார்த்த ஓட்டுதல், விசை மாற்றம்' },
  // Trials and banners
  'trial.checking': { en: '⏱ {time}s{extra} — checking with the server…', si: '⏱ {time}s{extra} — සේවාදායකය සමඟ පරීක්ෂා කරමින්…', ta: '⏱ {time}s{extra} — சேவையகத்துடன் சரிபார்க்கிறது…' },
  'trial.pb': { en: ' · personal best!', si: ' · පෞද්ගලික හොඳම!', ta: ' · சொந்த சாதனை!' },
  'trial.verified': { en: '✓ Verified by re-simulation · rank #{rank}', si: '✓ නැවත අනුකරණයෙන් තහවුරු විය · ස්ථානය #{rank}', ta: '✓ மறு-உருவகத்தால் உறுதி செய்யப்பட்டது · இடம் #{rank}' },
  'trial.offline': { en: '⏱ {time}s saved on this device (leaderboard server offline)', si: '⏱ {time}s මෙම උපාංගයේ සුරකින ලදී (ප්‍රමුඛ පුවරු සේවාදායකය නොමැත)', ta: '⏱ {time}s இந்தச் சாதனத்தில் சேமிக்கப்பட்டது (தரவரிசை சேவையகம் இல்லை)' },
  'trial.start': { en: '⏱ Start time trial', si: '⏱ කාල තරඟය අරඹන්න', ta: '⏱ நேரப் போட்டியைத் தொடங்கு' },
  'trial.best': { en: 'Your best ({handling})', si: 'ඔබේ හොඳම ({handling})', ta: 'உங்கள் சிறந்தது ({handling})' },
  // Pause
  'pause.title': { en: 'Paused', si: 'විරාමයි', ta: 'இடைநிறுத்தம்' },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

const KEY = 'paintland.lang';
let current: Lang = detect();
const listeners: (() => void)[] = [];

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.some((l) => l.id === saved)) return saved;
  } catch {
    /* storage blocked */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : '';
  if (nav.startsWith('si')) return 'si';
  if (nav.startsWith('ta')) return 'ta';
  return 'en';
}

export function lang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  for (const fn of listeners) fn();
}

export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

/** Translate `key`, filling `{placeholders}`. Falls back to English. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  const e: Entry = STRINGS[key];
  let s = e[current] ?? e.en;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** For tests: every key and its languages. */
export function allStrings(): Record<string, Entry> {
  return STRINGS;
}
