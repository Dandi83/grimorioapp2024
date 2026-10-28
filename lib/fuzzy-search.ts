// Search tolerant of accents, capitals and typos: pure functions, used by every search of the site (the Home
// panel, the lists of spells, creatures, equipment, magic items, manual) on the data already in the browser.

/** «Evocazióne», «Dell’Aria», «Mezzo-Orco» → «evocazione», «dell aria», «mezzo orco»: case, accents, apostrophes and dashes ignored. */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`‘\-–—_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Typos allowed in a word: none under 4 letters, 1 from 4 to 7, 2 from 8. */
export function allowedTypos(length: number): number {
  return length < 4 ? 0 : length < 8 ? 1 : 2;
}

// Three rows of the distance table, reused at every call (a keystroke compares thousands of words).
let rowsBuffer = [new Int32Array(64), new Int32Array(64), new Int32Array(64)];

/**
 * Damerau-Levenshtein distance (optimal string alignment: two swapped letters are one typo), stopped as soon as
 * it is over max (then max + 1 is returned). prefix: the distance from the closest start of b (a word still being
 * typed: «fuoc» → «fuoco»), only starts from max letters shorter to max letters longer than a.
 */
export function typoDistance(a: string, b: string, max = Infinity, prefix = false): number {
  if (a === b) return 0;
  if (prefix && b.length > a.length + max) b = b.slice(0, a.length + max);
  if (!prefix && Math.abs(a.length - b.length) > max) return max + 1;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  if (rowsBuffer[0].length <= b.length) rowsBuffer = [0, 1, 2].map(() => new Int32Array(b.length * 2 + 1));
  let [prevPrev, prev, row] = rowsBuffer;
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    row[0] = i;
    let best = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const bj = b.charCodeAt(j - 1);
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (ai === bj ? 0 : 1));
      if (i > 1 && j > 1 && ai === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bj) value = Math.min(value, prevPrev[j - 2] + 1);
      row[j] = value;
      if (value < best) best = value;
    }
    if (best > max) return max + 1;
    [prevPrev, prev, row] = [prev, row, prevPrev];
  }
  if (!prefix) return prev[b.length];
  let best = prev[b.length];
  for (let j = Math.max(1, a.length - (Number.isFinite(max) ? max : a.length)); j < b.length; j++) best = Math.min(best, prev[j]);
  return best;
}

/** How a name matches: exact, starts with, contains, approximate (typos); lower is better. */
export const MATCH = { exact: 0, start: 1, contains: 2, approximate: 3 } as const;
export type MatchKind = (typeof MATCH)[keyof typeof MATCH];
export interface NameMatch { kind: MatchKind; /** Typos of an approximate match (0 for the others). */ typos: number; /** Where the query starts in the folded name (-1 for an approximate match). */ start: number }

interface Prepared { folded: string; words: string[]; masks: number[] }
/** The letters a–z of a word as bits: a letter of the query missing from a word costs at least one typo. */
function letterMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i) - 97;
    if (code >= 0 && code < 26) mask |= 1 << code;
  }
  return mask;
}
function bitCount(value: number): number {
  let count = 0;
  for (; value; value &= value - 1) count++;
  return count;
}
const prepared = new Map<string, Prepared>();
/** The folded name and its words, kept between keystrokes (the catalog has a few thousand names). */
function prepare(name: string): Prepared {
  let entry = prepared.get(name);
  if (!entry) {
    const folded = normalizeSearch(name);
    const words = folded.split(" ").filter(Boolean);
    entry = { folded, words, masks: words.map(letterMask) };
    if (prepared.size > 20000) prepared.clear();
    prepared.set(name, entry);
  }
  return entry;
}

/** Prepares the names before the first keystroke (when the list or the index arrives). */
export function prepareNames(names: Iterable<string>): void {
  for (const name of names) prepare(name);
}

/**
 * The match of a name for a query (both folded here), or null. wordStart: «contains» only at the start of a word
 * («dra» in «Forma di drago», not «ago» in «drago»), as the search of the Home always did.
 *
 * Approximate: every word of the query matches a different word of the name in the same order, each with at most
 * allowedTypos(its length) typos (none under 4 letters). The last word may be still being typed: compared with the
 * start of the name word too («fuoc» → «fuoco»).
 */
let lastQuery = "", lastFolded = "", lastWords: string[] = [], lastMasks: number[] = [];
/** The folded query and its words, computed once per keystroke for every name of the list. */
function foldQuery(query: string): [string, string[]] {
  if (query !== lastQuery) {
    lastQuery = query;
    lastFolded = normalizeSearch(query);
    lastWords = lastFolded.split(" ").filter(Boolean);
    lastMasks = lastWords.map(letterMask);
  }
  return [lastFolded, lastWords];
}

export function matchName(name: string, query: string, options: { wordStart?: boolean } = {}): NameMatch | null {
  const [q, queryWords] = foldQuery(query);
  if (!q) return null;
  const { folded, words, masks } = prepare(name);
  if (folded === q) return { kind: MATCH.exact, typos: 0, start: 0 };
  if (folded.startsWith(q)) return { kind: MATCH.start, typos: 0, start: 0 };
  let from = 0;
  for (;;) {
    const at = folded.indexOf(q, from);
    if (at < 0) break;
    if (!options.wordStart || folded[at - 1] === " ") return { kind: MATCH.contains, typos: 0, start: at };
    from = at + 1;
  }
  const typos = approximateTypos(queryWords, words, masks);
  return typos === null ? null : { kind: MATCH.approximate, typos, start: -1 };
}

function approximateTypos(query: string[], words: string[], masks: number[]): number | null {
  if (!query.some(word => word.length >= 4)) return null;
  let total = 0;
  let next = 0;
  for (let i = 0; i < query.length; i++) {
    const word = query[i], max = allowedTypos(word.length), last = i === query.length - 1;
    let found = -1, best = max + 1;
    for (let j = next; j < words.length && best > 0; j++) {
      const target = words[j];
      if (bitCount(lastMasks[i] & ~masks[j]) > max) continue;
      const distance = typoDistance(word, target, max, last && target.length > word.length);
      if (distance < best) { best = distance; found = j; }
    }
    if (found < 0) return null;
    total += best;
    next = found + 1;
  }
  return total;
}

/** Exact, then starts with, then contains, then approximate (fewest typos first); ties keep the given order. */
export function compareMatches(a: NameMatch, b: NameMatch): number {
  return a.kind - b.kind || a.typos - b.typos;
}

type NameOf<T> = (row: T) => string | readonly string[];
function bestMatch<T>(row: T, query: string, nameOf: NameOf<T>, options: { wordStart?: boolean }): NameMatch | null {
  const names = nameOf(row);
  let match: NameMatch | null = null;
  for (const name of typeof names === "string" ? [names] : names) {
    const candidate = matchName(name, query, options);
    if (candidate && (!match || compareMatches(candidate, match) < 0)) match = candidate;
  }
  return match;
}

/**
 * A list searched: the rows found exactly (exact, starts with, contains) and the approximate ones, always apart and
 * after. groupOf: a list shown in groups (spells by level, creatures by challenge) keeps its groups, best matches
 * first inside each; rows of the same kind keep the order of the list. suggestion: «Forse cercavi», the best
 * approximate row when none is found exactly.
 */
export function searchList<T>(rows: readonly T[], query: string, nameOf: NameOf<T>, options: { wordStart?: boolean; groupOf?: (row: T) => unknown } = {}): { exact: T[]; approximate: T[]; suggestion: T | null } {
  if (!normalizeSearch(query)) return { exact: [...rows], approximate: [], suggestion: null };
  const groups = new Map<unknown, number>();
  const exact: { row: T; match: NameMatch; order: number; group: number }[] = [];
  const approximate: { row: T; match: NameMatch; order: number }[] = [];
  rows.forEach((row, order) => {
    const key = options.groupOf?.(row);
    if (!groups.has(key)) groups.set(key, groups.size);
    const match = bestMatch(row, query, nameOf, options);
    if (!match) return;
    if (match.kind === MATCH.approximate) approximate.push({ row, match, order });
    else exact.push({ row, match, order, group: groups.get(key)! });
  });
  exact.sort((a, b) => a.group - b.group || compareMatches(a.match, b.match) || a.order - b.order);
  approximate.sort((a, b) => compareMatches(a.match, b.match) || a.order - b.order);
  return { exact: exact.map(entry => entry.row), approximate: approximate.map(entry => entry.row), suggestion: !exact.length && approximate.length ? approximate[0].row : null };
}

/** The rows of a flat list that match the query, best first: exact, starts with, contains, then approximate. */
export function searchRows<T>(rows: readonly T[], query: string, nameOf: NameOf<T>, options: { wordStart?: boolean } = {}): T[] {
  const { exact, approximate } = searchList(rows, query, nameOf, options);
  return [...exact, ...approximate];
}

/**
 * «Forse cercavi»: the best approximate name when nothing matches exactly, starts with or contains the query;
 * otherwise null.
 */
export function didYouMean<T>(rows: readonly T[], query: string, nameOf: (row: T) => string, options: { wordStart?: boolean } = {}): string | null {
  if (!normalizeSearch(query)) return null;
  let best: { name: string; match: NameMatch } | null = null;
  for (const row of rows) {
    const name = nameOf(row), match = matchName(name, query, options);
    if (!match) continue;
    if (match.kind !== MATCH.approximate) return null;
    if (!best || compareMatches(match, best.match) < 0) best = { name, match };
  }
  return best?.name ?? null;
}
