// Search of the whole Grimorio: pure functions, safe in client components and tests.
// The index (lib/search-index.ts, served at /ricerca-indice.json) holds only name, short label and address.

/** Compact index: sections, then one row per result. */
export interface SearchIndex {
  v: 1;
  /** Section key, title shown as group heading and filter, storage key of the edition chosen in that section. */
  sections: { k: SearchSectionKey; t: string; e: string }[];
  /** [section position, name, label, address, address of the 2014 edition when the same name has its own page]. */
  rows: [number, string, string, string, string?][];
}

export type SearchSectionKey = "incantesimi" | "mostri" | "classi" | "equipaggiamento" | "oggetti-magici" | "condizioni" | "manuale";

export interface SearchRow { section: SearchSectionKey; nome: string; label: string; href: string; href2014?: string }

export interface SearchMatch extends SearchRow { start: number }

export interface SearchGroup { section: SearchSectionKey; title: string; total: number; rows: SearchMatch[] }

export const GROUP_LIMIT = 8;

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
  return index.rows.map(([section, nome, label, href, href2014]) => ({
    section: index.sections[section].k, nome, label, href, ...(href2014 ? { href2014 } : {}),
  }));
}

/**
 * Results grouped by section in index order: names starting with the query first, then A–Z;
 * at most `limit` rows per group unless the group is expanded. One character is enough.
 */
export function search(index: SearchIndex, rows: SearchRow[], query: string, options: { section?: SearchSectionKey; expanded?: SearchSectionKey[]; limit?: number } = {}): SearchGroup[] {
  const limit = options.limit ?? GROUP_LIMIT;
  if (!fold(query).trim()) return [];
  const found = new Map<SearchSectionKey, SearchMatch[]>();
  for (const row of rows) {
    if (options.section && row.section !== options.section) continue;
    const start = matchStart(row.nome, query);
    if (start < 0) continue;
    const list = found.get(row.section) ?? [];
    list.push({ ...row, start });
    found.set(row.section, list);
  }
  return index.sections.filter(section => found.has(section.k)).map(section => {
    const all = found.get(section.k)!.sort((a, b) => Number(a.start !== 0) - Number(b.start !== 0) || a.nome.localeCompare(b.nome, "it"));
    return { section: section.k, title: section.t, total: all.length, rows: options.expanded?.includes(section.k) ? all : all.slice(0, limit) };
  });
}

/** The address of a row for the edition chosen in its section: the 2014 page only when it is the chosen one. */
export function rowHref(row: SearchRow, chosen: string | null | undefined): string {
  return chosen === "2014" && row.href2014 ? row.href2014 : row.href;
}
