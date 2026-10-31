import { matchName, normalizeSearch } from "./fuzzy-search";

/**
 * Where each letter of the searched form of a name (normalizeSearch: lowercase, no accents, apostrophes and dashes as
 * spaces, one space between words) sits in the name as written. «Thieves’ Tools» is «thieves tools»: the «t» of
 * «tools» is the 9th letter searched and the 10th written.
 */
export function foldIndex(text: string): number[] {
  const out: number[] = [];
  let space = -1;
  for (let i = 0; i < text.length; i++) {
    let folded = text[i].toLocaleLowerCase("it").normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/['’`‘\-–—_/]/.test(folded)) folded = " ";
    for (const letter of folded) {
      if (/\s/.test(letter)) { if (out.length && space < 0) space = i; continue; }
      if (space >= 0) { out.push(space); space = -1; }
      out.push(i);
    }
  }
  return out;
}

/** The part of the name to mark, as [from, to) in the name as written; null when nothing is marked (a typo match). */
export function markRange(text: string, start: number, length: number): [number, number] | null {
  if (start < 0 || length <= 0) return null;
  const map = foldIndex(text);
  if (start >= map.length) return null;
  const end = Math.min(start + length, map.length) - 1;
  return [map[start], map[end] + 1];
}

/** The length to mark when the match does not say it: the query as searched. */
export const typedLength = (query: string) => normalizeSearch(query).length;

/** The part of a list name found by the query (lib/fuzzy-search.ts, the rules of the search of the list), or null. */
export function nameMark(name: string, query: string, options: { wordStart?: boolean; settled?: boolean } = {}): { start: number; length: number } | null {
  if (!normalizeSearch(query)) return null;
  const match = matchName(name, query, options);
  return match && match.start >= 0 ? { start: match.start, length: match.length ?? typedLength(query) } : null;
}
