import "server-only";
import { PAGE_NAMES } from "./feedback-input";
import { SEARCH_SOURCES } from "./search-index";
import { spellHref, spellIdOfPath } from "./spell-public-id";

let names: Promise<Map<string, string>> | undefined;
let builtAt = 0;

/** Card names by address (and edition), from the same registry as the search in Home. */
async function cardNames(): Promise<Map<string, string>> {
  if (!names || Date.now() - builtAt > 5 * 60 * 1000) {
    builtAt = Date.now();
    names = (async () => {
      const map = new Map<string, string>();
      for (const source of SEARCH_SOURCES) {
        for (const row of await source.rows(process.env.VERCEL_ENV)) {
          const path = row.href.split("?")[0];
          if (row.edizione) map.set(`${path}|${row.edizione}`, row.nome);
          if (!map.has(path)) map.set(path, row.nome);
        }
      }
      return map;
    })().catch(error => { names = undefined; throw error; });
  }
  return names;
}

/** «Palla di fuoco» for /spell/palla-di-fuoco; null when the page has no known name. */
export async function pageName(path: string | null, edition: string | null): Promise<string | null> {
  if (!path) return null;
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  // A report sent from an old spell address (with a proper name) names the card of its new address.
  const spell = spellIdOfPath(path);
  if (spell) path = spellHref(spell);
  try {
    const map = await cardNames();
    return map.get(`${path}|${edition}`) ?? map.get(path) ?? null;
  } catch {
    return null;
  }
}
