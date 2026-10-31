import "server-only";
import { pool } from "./db";
import { buildSearchIndex } from "./search-index";
import { getAllMonsters } from "./monsters";
import { isNoSrdSource } from "./card-display";
import { effectiveHidden, PUBLIC_SECTIONS, partId } from "./public-sections";
import { visibilityState } from "./section-visibility";
import { cleanSearchQuery } from "./analytics-stats";
import { withSearchKeys, type SearchWorld } from "./search-insights";
import { searchKeysForIndex } from "./search-english-server";

/**
 * The synonyms (a word searched → a card, PROMPT 31) and the list «Da fare» of «Ricerche senza risultato».
 * Written only from the reserved area (app/actions/admin-statistics.ts); the synonyms reach the public only inside
 * /ricerca-indice.json, the index the search already loads.
 */
let ready: Promise<void> | undefined;
function ensureTables() {
  ready ??= (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_search_synonyms (
      query text PRIMARY KEY, href text NOT NULL, creato_il timestamptz NOT NULL DEFAULT now())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_search_todo (
      query text PRIMARY KEY, creato_il timestamptz NOT NULL DEFAULT now())`);
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}

export type Synonym = { query: string; href: string };
export async function readSynonyms(): Promise<Synonym[]> {
  await ensureTables();
  return (await pool.query<Synonym>("SELECT query, href FROM grimorio_search_synonyms ORDER BY query")).rows;
}
/** A card address of the site: a spell, a creature, another public page. */
const HREF = /^\/[a-z0-9][a-z0-9/_-]{0,200}(?:\?edizione=20(?:14|24))?(?:#[a-z0-9-]{1,60})?$/;
export async function addSynonym(raw: string, href: string): Promise<boolean> {
  const query = cleanSearchQuery(raw);
  if (!query || !HREF.test(href)) return false;
  await ensureTables();
  await pool.query("INSERT INTO grimorio_search_synonyms (query, href) VALUES ($1, $2) ON CONFLICT (query) DO UPDATE SET href = EXCLUDED.href", [query, href]);
  return true;
}
export async function deleteSynonym(query: string) {
  await ensureTables();
  await pool.query("DELETE FROM grimorio_search_synonyms WHERE query = $1", [query]);
}
export async function readTodo(): Promise<string[]> {
  await ensureTables();
  return (await pool.query<{ query: string }>("SELECT query FROM grimorio_search_todo ORDER BY creato_il, query")).rows.map(row => row.query);
}
export async function addTodo(raw: string): Promise<boolean> {
  const query = cleanSearchQuery(raw);
  if (!query) return false;
  await ensureTables();
  await pool.query("INSERT INTO grimorio_search_todo (query) VALUES ($1) ON CONFLICT DO NOTHING", [query]);
  return true;
}
export async function deleteTodo(query: string) {
  await ensureTables();
  await pool.query("DELETE FROM grimorio_search_todo WHERE query = $1", [query]);
}

/** The public index and everything closed, for the reasons of the searches with no result (administrator only). */
export async function searchWorld(): Promise<SearchWorld> {
  const state = await visibilityState();
  const hidden = [...effectiveHidden(state.sections, state.parts), ...state.parts, ...state.cards];
  const [builtIndex, fullIndex, monsters, keys] = await Promise.all([buildSearchIndex(undefined, undefined, hidden), buildSearchIndex(), getAllMonsters(), searchKeysForIndex()]);
  // The public index as served: with the English names «solo ricerca» (PROMPT 37), so a word they find leaves «Ricerche senza risultato».
  const publicIndex = withSearchKeys(builtIndex, keys);
  const hiddenNoSrd = monsters.filter(monster => isNoSrdSource(monster.fonte_scheda) && state.cards.includes(`/mostro/${monster.id}`)).map(monster => `/mostro/${monster.id}`);
  const closed = new Set(effectiveHidden(state.sections, state.parts) as string[]);
  const closedTitles = PUBLIC_SECTIONS.flatMap(section => [
    ...(closed.has(section.key) ? [section.title] : []),
    ...section.parts.filter(part => state.parts.includes(partId(section.key, part.key)) && !/^edizione/i.test(part.key)).map(part => part.title),
  ]);
  return { publicIndex, fullIndex, hiddenNoSrd, closedTitles };
}
