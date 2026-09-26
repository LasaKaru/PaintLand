import { describe, expect, it } from 'vitest';
import { LANGS, englishStrings, isRtl, loadLang, setLang, t, type Lang, type Locale } from '../src/core/i18n';

const locales = import.meta.glob<{ default: Locale }>('../src/core/locales/*.ts', { eager: true });
const holes = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe('Localisation (24 languages)', () => {
  it('has a file for every language in the picker', () => {
    for (const l of LANGS) expect(locales[`../src/core/locales/${l.id}.ts`], l.id).toBeTruthy();
    expect(LANGS.length).toBe(24);
  });

  it('every language translates every string, keeping placeholders and key names', () => {
    const en = englishStrings();
    const keys = Object.keys(en) as (keyof typeof en)[];
    for (const l of LANGS) {
      const loc = locales[`../src/core/locales/${l.id}.ts`].default;
      for (const k of keys) {
        const s = loc[k];
        expect(s, `${l.id} ${k}`).toBeTruthy();
        expect(holes(s!), `${l.id} ${k} placeholders`).toBe(holes(en[k]));
        // Keyboard letters shown in prompts must survive translation.
        for (const key of ['F ·', 'E ·', 'W A S D']) if (en[k].includes(key)) expect(s, `${l.id} ${k} keeps "${key}"`).toContain(key);
      }
      // No stray keys.
      for (const k of Object.keys(loc)) expect(keys, `${l.id} unknown key ${k}`).toContain(k);
    }
  });

  it('non-English languages are actually translated (not copies of English)', () => {
    const en = englishStrings();
    for (const l of LANGS) {
      if (l.id === 'en') continue;
      const loc = locales[`../src/core/locales/${l.id}.ts`].default;
      // Words many languages share with English: T-shirt, clothing names from South Asia,
      // an exclamation and a hairstyle. They may stay the same without counting.
      const international = new Set(['item.top:tee', 'item.top:sari', 'item.bottom:sarong', 'item.facial:bindi', 'item.mouth:o', 'item.hair:bob', 'item.roof:kayak', 'emote.ayubowan', 'wr.presetOsariya', 'acct.club', 'acct.password', 'acct.title', 'fest.vesak', 'fest.diwali', 'season.winter']);
      const same = (Object.keys(en) as (keyof typeof en)[]).filter((k) => loc[k] === en[k] && !international.has(k));
      // A few more words (Garage, Ultra, Audio, Tip…) are the same in some languages; most must differ.
      expect(same.length, `${l.id} identical to English: ${same.join(', ')}`).toBeLessThan(10);
    }
  });

  it('loads languages on demand, fills placeholders and knows right-to-left scripts', async () => {
    await loadLang('ja');
    await setLang('ja');
    expect(t('menu.settings')).toBe('設定');
    expect(t('menu.trophies', { n: 3, total: 22 })).toContain('3/22');
    for (const [l, word] of [['de', 'Einstellungen'], ['es', 'Ajustes'], ['hi', 'सेटिंग्स'], ['ar', 'الإعدادات'], ['zh', '设置']] as [Lang, string][]) {
      await setLang(l);
      expect(t('menu.settings')).toBe(word);
    }
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('ur')).toBe(true);
    expect(isRtl('fa')).toBe(true);
    expect(isRtl('ja')).toBe(false);
    await setLang('en');
    expect(t('menu.play', { chapter: 'Serendib' })).toBe('▶ Play · Serendib');
  });
});
