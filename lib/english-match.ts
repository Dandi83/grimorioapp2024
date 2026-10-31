import { MATCH, matchName, normalizeSearch, type MatchOptions } from "./fuzzy-search";
import { typedLength } from "./highlight";

/**
 * The English name of a list row (PROMPT 33) in the search of a section: the names searched (the Italian one first)
 * and the line «in inglese: …» with the letters found marked (PROMPT 35), shown when the query finds the English name
 * («fire» → «Fire Bolt», «Fireball», «Faerie Fire»), also when it finds the Italian one too (both marked). Not shown
 * for a name written the same in both languages («Lich»), nor for a typo match of the English name when the Italian
 * one is found without typos.
 */
export const namesOf = (name: string, en?: string): string | readonly string[] => (en ? [name, en] : name);

export interface EnglishShown { name: string; start: number; length: number }

export function englishShown(name: string, en: string | undefined, query: string, options: MatchOptions = {}): EnglishShown | undefined {
  if (!en || !normalizeSearch(query) || normalizeSearch(en) === normalizeSearch(name)) return undefined;
  const english = matchName(en, query, options);
  if (!english) return undefined;
  if (english.kind === MATCH.approximate) {
    const italian = matchName(name, query, options);
    if (italian && italian.kind !== MATCH.approximate) return undefined;
  }
  return { name: en, start: english.start, length: english.length ?? typedLength(query) };
}

/** The first English name of a result that the query finds (a result of the Home can have one per edition). */
export function englishOf(name: string, names: readonly string[] | undefined, query: string, options: MatchOptions = {}): EnglishShown | undefined {
  for (const en of names ?? []) {
    const shown = englishShown(name, en, query, options);
    if (shown) return shown;
  }
  return undefined;
}
