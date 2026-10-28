// Search of the whole Grimorio: pure functions, safe in client components and tests.
import { MATCH, matchName, normalizeSearch, type MatchKind } from "./fuzzy-search";
// The index (lib/search-index.ts, served at /ricerca-indice.json) holds only name, short label and address.

/** Compact index: sections, then one row per result. */
export interface SearchIndex {
  v: 1;
  /** Section key, title shown as group heading and filter. */
  sections: { k: SearchSectionKey; t: string }[];
  /**
   * [section position, name, label, address, address of the 2014 edition when the same name has its own
   * page (else empty), the only edition the result exists in (none: both editions, or edition-free)].
   */
  rows: [number, string, string, string, string?, ("2024" | "2014")?][];
}

export type SearchSectionKey = "incantesimi" | "mostri" | "classi" | "equipaggiamento" | "oggetti-magici" | "condizioni" | "manuale";

interface SearchRow { section: SearchSectionKey; nome: string; label: string; href: string; href2014?: string; solo?: "2024" | "2014" }

/** start: where the query starts in the name, -1 for an approximate match (a typo, lib/fuzzy-search.ts). */
export interface SearchMatch extends SearchRow { start: number; kind: MatchKind; typos: number }

/** exact: the rows found without typos (counted in the statistics of the searches; the others are «Risultati simili»). */
export interface SearchGroup { section: SearchSectionKey; title: string; total: number; exact: number; rows: SearchMatch[] }

const GROUP_LIMIT = 8;

/** Case, accents and apostrophes ignored: "Dell’Aria" → "dell aria". */
export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, " ");
}

/** Where the query starts a word of the name, or -1: "dra" matches "Forma di drago" at 9. */
export function matchStart(name: string, query: string): number {
  const q = fold(query).trim().replace(/\s+/g, " ");
  if (!q) return -1;
  const folded = fold(name);
  let from = 0;
  for (;;) {
    const at = folded.indexOf(q, from);
    if (at < 0) return -1;
    if (at === 0 || !/[\p{L}\p{N}]/u.test(folded[at - 1])) return at;
    from = at + 1;
  }
}

export function rowsOf(index: SearchIndex): SearchRow[] {
  return index.rows.map(([section, nome, label, href, href2014, solo]) => ({
    section: index.sections[section].k, nome, label, href, ...(href2014 ? { href2014 } : {}), ...(solo === "2024" || solo === "2014" ? { solo } : {}),
  }));
}

/**
 * The results of «la tua edizione» (in both editions, edition-free, or only in it) and those that
 * exist only in the other edition («Cerca anche nel 2014»).
 */
export function splitByEdition(rows: SearchRow[], edition: "2024" | "2014"): { own: SearchRow[]; other: SearchRow[] } {
  const own: SearchRow[] = [];
  const other: SearchRow[] = [];
  for (const row of rows) (row.solo && row.solo !== edition ? other : own).push(row);
  return { own, other };
}

/**
 * Results grouped by section in index order: the exact name first, then names starting with the query, then those
 * with a word starting with it, then the approximate ones (typos, lib/fuzzy-search.ts), each kind A–Z; accents and
 * capitals ignored; at most `limit` rows per group unless the group is expanded. One character is enough.
 */
export function search(index: SearchIndex, rows: SearchRow[], query: string, options: { section?: SearchSectionKey; expanded?: SearchSectionKey[]; limit?: number } = {}): SearchGroup[] {
  const limit = options.limit ?? GROUP_LIMIT;
  if (!normalizeSearch(query)) return [];
  const found = new Map<SearchSectionKey, SearchMatch[]>();
  for (const row of rows) {
    if (options.section && row.section !== options.section) continue;
    const match = matchName(row.nome, query, { wordStart: true });
    if (!match) continue;
    const list = found.get(row.section) ?? [];
    list.push({ ...row, ...match });
    found.set(row.section, list);
  }
  return index.sections.filter(section => found.has(section.k)).map(section => {
    const all = found.get(section.k)!.sort((a, b) => a.kind - b.kind || a.typos - b.typos || a.nome.localeCompare(b.nome, "it"));
    return { section: section.k, title: section.t, total: all.length, exact: all.filter(row => row.kind !== MATCH.approximate).length, rows: options.expanded?.includes(section.k) ? all : all.slice(0, limit) };
  });
}

/**
 * «Forse cercavi»: when no result matches the query exactly (only typos), the closest name; otherwise null.
 */
export function suggestionOf(groups: SearchGroup[]): string | null {
  let best: SearchMatch | null = null;
  for (const group of groups)
    for (const row of group.rows) {
      if (row.kind !== MATCH.approximate) return null;
      if (!best || row.typos < best.typos) best = row;
    }
  return best?.nome ?? null;
}

/**
 * The address of a row for «la tua edizione»: the 2014 page only when it is the chosen one. A 2024-only
 * result of a page shared by the editions (Compendio) opens on 2024 even while the user plays 2014.
 */
export function rowHref(row: SearchRow, chosen: string | null | undefined): string {
  if (chosen === "2014" && row.href2014) return row.href2014;
  if (chosen === "2014" && row.solo === "2024" && !/^\/(spell|mostro|manuale)\//.test(row.href) && !row.href.includes("?")) {
    const [path, hash] = row.href.split("#");
    return `${path}?edizione=2024${hash ? `#${hash}` : ""}`;
  }
  return row.href;
}

/** First word of the label of a homebrew creature: the search panel shows it as the «Homebrew» pill. */
export const HOMEBREW_LABEL = "Homebrew";
