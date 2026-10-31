// «Ricerche senza risultato» (PROMPT 31): why a search found nothing, the synonyms of the reserved area and the list
// «Da fare». Pure functions here (tests/insights.cjs); the database and the indexes in lib/search-insights-server.ts.
import { fold, rowsOf, search, suggestionOf, type SearchIndex } from "./search";
import { MATCH } from "./fuzzy-search";
import type { SearchReason } from "./analytics-stats";

/** What the classification reads: the public index, the full one (hidden sections, parts and cards too). */
export type SearchWorld = {
  publicIndex: SearchIndex;
  fullIndex: SearchIndex;
  /** Addresses of the hidden NO SRD creatures (the eye of the reserved area). */
  hiddenNoSrd: string[];
  /** Titles of the public sections and parts «In arrivo» or hidden (e.g. «Classi»). */
  closedTitles: string[];
};

/** The rows found with no typo. */
function exactRows(index: SearchIndex, query: string) {
  return search(index, rowsOf(index), query, { limit: 1000 }).flatMap(group => group.rows).filter(row => row.kind !== MATCH.approximate);
}

/**
 * A search that now finds a card by its official English name (PROMPT 33): it leaves «Ricerche senza risultato»,
 * also with the searches of before (they were made when the English names were not in the index).
 */
export function foundInEnglish(query: string, index: SearchIndex): boolean {
  return exactRows(index, query).some(row => row.english || row.hidden);
}

/**
 * Why a search gave 0 results, when it can be told, in this order: a hidden NO SRD creature («mostro non SRD»); a
 * section or part not open yet («sezione in arrivo»); a name of one edition only («manca in 2014» / «manca in 2024»,
 * the lists of one edition say 0); a typo with «Forse cercavi» («errore? → …»). null: no reason found.
 */
export function classifySearch(query: string, world: SearchWorld): SearchReason | null {
  const visible = new Set(exactRows(world.publicIndex, query).map(row => row.href));
  const closed = exactRows(world.fullIndex, query).filter(row => !visible.has(row.href));
  if (closed.some(row => world.hiddenNoSrd.includes(row.href))) return { kind: "non-srd" };
  const folded = fold(query).trim();
  if (closed.length || world.closedTitles.some(title => fold(title).includes(folded) && folded.length >= 3)) return { kind: "in-arrivo" };
  const found = exactRows(world.publicIndex, query);
  if (found.length && found.every(row => row.solo === "2014")) return { kind: "manca", edition: "2024" };
  if (found.length && found.every(row => row.solo === "2024")) return { kind: "manca", edition: "2014" };
  if (!found.length) {
    const suggestion = suggestionOf(search(world.publicIndex, rowsOf(world.publicIndex), query));
    if (suggestion) return { kind: "errore", suggestion };
  }
  return null;
}

/**
 * The synonyms in the index served to the public: each word on the row of its card (by its address). A synonym wins
 * over an English name written the same way (PROMPT 33): that English name leaves the index.
 */
export function withSynonyms(index: SearchIndex, synonyms: { query: string; href: string }[]): SearchIndex {
  const syn: [string, number][] = [];
  for (const { query, href } of synonyms) {
    const at = index.rows.findIndex(row => row[3] === href || row[4] === href);
    if (at >= 0) syn.push([query, at]);
  }
  if (!syn.length) return index;
  const words = new Set(syn.map(([query]) => fold(query).trim()));
  const en = index.en?.filter(([name]) => !words.has(fold(name).trim()));
  const k = index.k?.filter(([key]) => !words.has(fold(key).trim()));
  return { ...index, syn, ...(en ? { en } : {}), ...(k ? { k } : {}) };
}

/**
 * The English names «solo ricerca» approved in the reserved area (PROMPT 37), on the rows of their cards (by the
 * address: a spell or a creature, either edition): only the normalized key, never the name as written. A card not in
 * the index (hidden, of a hidden section) gets nothing.
 */
export function withSearchKeys(index: SearchIndex, keys: { href: string; key: string }[]): SearchIndex {
  const k: [string, number][] = [];
  for (const { href, key } of keys) {
    const at = index.rows.findIndex(row => row[3] === href || row[4] === href || row[3] === `${href}?edizione=2014`);
    if (at >= 0 && key && !k.some(([other, place]) => other === key && place === at)) k.push([key, at]);
  }
  return k.length ? { ...index, k } : index;
}
