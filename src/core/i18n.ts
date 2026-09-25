import en from './locales/en';

/**
 * Localisation (docs/10 §6). English is built in; every other language is a
 * lazily-loaded module in `locales/` (only the chosen one is downloaded).
 * Missing strings fall back to English, `{name}` placeholders are filled from
 * `vars`, and right-to-left languages flip the page direction.
 *
 * Translations are first drafts and must be reviewed by native speakers before release.
 */
export type StringKey = keyof typeof en;
export type Locale = Partial<Record<StringKey, string>>;

export const LANGS = [
  { id: 'en', name: 'English' },
  { id: 'zh', name: '简体中文' },
  { id: 'hi', name: 'हिन्दी' },
  { id: 'es', name: 'Español' },
  { id: 'ar', name: 'العربية', rtl: true },
  { id: 'fr', name: 'Français' },
  { id: 'bn', name: 'বাংলা' },
  { id: 'pt', name: 'Português' },
  { id: 'ru', name: 'Русский' },
  { id: 'ur', name: 'اردو', rtl: true },
  { id: 'id', name: 'Bahasa Indonesia' },
  { id: 'de', name: 'Deutsch' },
  { id: 'ja', name: '日本語' },
  { id: 'tr', name: 'Türkçe' },
  { id: 'ko', name: '한국어' },
  { id: 'vi', name: 'Tiếng Việt' },
  { id: 'it', name: 'Italiano' },
  { id: 'fa', name: 'فارسی', rtl: true },
  { id: 'pl', name: 'Polski' },
  { id: 'nl', name: 'Nederlands' },
  { id: 'th', name: 'ไทย' },
  { id: 'sw', name: 'Kiswahili' },
  { id: 'ta', name: 'தமிழ்' },
  { id: 'si', name: 'සිංහල' },
] as const satisfies readonly { id: string; name: string; rtl?: boolean }[];

export type Lang = (typeof LANGS)[number]['id'];

const loaders = import.meta.glob<{ default: Locale }>('./locales/*.ts');
const loaded: Partial<Record<Lang, Locale>> = { en };

const KEY = 'paintland.lang';
let current: Lang = detect();
const listeners: (() => void)[] = [];

function isLang(v: string | null | undefined): v is Lang {
  return !!v && LANGS.some((l) => l.id === v);
}

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const n of nav) {
    const code = n?.toLowerCase().split('-')[0];
    if (isLang(code)) return code;
  }
  return 'en';
}

export function lang(): Lang {
  return current;
}

export function isRtl(l: Lang = current): boolean {
  return LANGS.some((x) => x.id === l && 'rtl' in x && x.rtl);
}

/** Load a language's strings (once). */
export async function loadLang(l: Lang): Promise<void> {
  if (loaded[l]) return;
  const load = loaders[`./locales/${l}.ts`];
  if (!load) return;
  loaded[l] = (await load()).default;
}

/** Switch language: loads its strings, then updates the page and every listener. */
export async function setLang(l: Lang): Promise<void> {
  await loadLang(l);
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l;
    document.documentElement.dir = isRtl(l) ? 'rtl' : 'ltr';
  }
  for (const fn of listeners) fn();
}

export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

/** Translate `key`, filling `{placeholders}`. Falls back to English. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  let s: string = loaded[current]?.[key] ?? en[key];
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** For tests and tools: the English source strings. */
export function englishStrings(): Record<StringKey, string> {
  return en;
}
