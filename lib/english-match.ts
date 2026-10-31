import { compareMatches, matchName, normalizeSearch, type MatchOptions } from "./fuzzy-search";

/**
 * The English name of a list row (PROMPT 33) in the search of a section: the names searched (the Italian one first)
 * and the line «in inglese: …», shown only when the query finds the row by its English name better than by the
 * Italian one («bless» → Benedizione, never under «Benedizione» searched in Italian).
 */
export const namesOf = (name: string, en?: string): string | readonly string[] => (en ? [name, en] : name);

export function englishShown(name: string, en: string | undefined, query: string, options: MatchOptions = {}): string | undefined {
  if (!en || !normalizeSearch(query)) return undefined;
  const english = matchName(en, query, options);
  if (!english) return undefined;
  const italian = matchName(name, query, options);
  return !italian || compareMatches(english, italian) < 0 ? en : undefined;
}
