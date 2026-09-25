/**
 * Chat safety on the client (docs/09 §7): a light word filter, on by
 * default, that masks common insults before a line is shown. The relay
 * already strips control characters and limits length; this is the
 * "filtered" setting players and parents can turn stricter (chat off) or
 * looser (unfiltered).
 */
export type ChatMode = 'filtered' | 'on' | 'off';

// Kept short on purpose: stems that are offensive in any context. Matching
// ignores case, accents, repeated letters and common digit swaps.
const STEMS = ['fuck', 'shit', 'bitch', 'cunt', 'pussy', 'asshole', 'bastard', 'slut', 'whore', 'nigg', 'fag', 'retard', 'idiot', 'stupid', 'mierda', 'scheisse', 'merde', 'cazzo', 'blyat'];

const SWAPS: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/** Lower-case, strip accents, undo digit swaps and squeeze repeated letters. */
export function normalise(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[013457@$!]/g, (c) => SWAPS[c] ?? c)
    .replace(/(.)\1+/g, '$1');
}

const SQUEEZED = STEMS.map((s) => normalise(s));

export function isRude(word: string): boolean {
  const n = normalise(word);
  return n.length > 1 && SQUEEZED.some((s) => n.includes(s));
}

/** Mask rude words with dots, keeping the first letter and the length. */
export function filterChat(text: string): string {
  return text.replace(/[\p{L}\p{N}@$!]*[\p{L}\p{N}]/gu, (w) => (isRude(w) ? w[0] + '•'.repeat(Math.max(2, w.length - 1)) : w));
}
