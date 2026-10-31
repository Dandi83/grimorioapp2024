import reviewNames from "./data/nomi-da-rivedere.json";
import { normalizeSearch } from "./fuzzy-search";

/**
 * English names «solo ricerca» of the NO SRD cards (PROMPT 37): the official English name of the manual a summary
 * comes from, used only to find the card searching in English, never shown. Pure: the reserved area validates with
 * it, the public index gets only searchKey().
 */
export type SearchEnglishKind = "incantesimo" | "mostro";

/**
 * Proper names and trademarks never accepted, not even typed by hand: the list of «Nomi da rivedere»
 * (lib/data/nomi-da-rivedere.json) and the product identity of the PROMPT. Whole words, any case («Tasha's» is
 * refused, «Hideous Laughter» is not); «Otto» only with its capital, as in «Nomi da rivedere».
 */
const EXTRA = ["Jallarzi", "Yuan-ti", "Displacer Beast", "Carrion Crawler", "Umber Hulk", "Kenku", "Slaad", "Neogi", "Kuo-toa"];
export const PROTECTED_NAMES: readonly { nome: string; maiuscola?: boolean }[] = [...reviewNames.nomi, ...EXTRA.map(nome => ({ nome }))];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MATCHERS = PROTECTED_NAMES.map(({ nome, maiuscola }) => ({
  nome,
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])${nome.split(/[\s-]+/).map(escape).join("[\\s\\-]*")}(?![\\p{L}\\p{N}])`, maiuscola ? "u" : "iu"),
}));

/** The protected names in an English name, each once. */
export function protectedNamesIn(name: string): string[] {
  return MATCHERS.filter(({ pattern }) => pattern.test(name)).map(({ nome }) => nome);
}

/** The key of the public index: lowercase, no accents, apostrophes and dashes as spaces (lib/fuzzy-search.ts). */
export const searchKey = (name: string) => normalizeSearch(name);

export const SEARCH_ENGLISH_MAX = 80;

/** null when the name can be saved; else the message of the reserved area. An empty name removes it. */
export function searchEnglishError(name: string): string | null {
  const text = name.trim();
  if (!text) return null;
  if (text.length > SEARCH_ENGLISH_MAX) return `Il nome inglese è troppo lungo (massimo ${SEARCH_ENGLISH_MAX} caratteri).`;
  if (!/\p{L}/u.test(text) || /[<>{}[\]\\]/.test(text)) return "Il nome inglese può contenere solo lettere, numeri, spazi, apostrofi e trattini.";
  const found = protectedNamesIn(text);
  if (found.length) {
    return `«${found.join("», «")}» è un nome protetto e non si può usare. Scrivi solo la parte non protetta del nome (es. «Hideous Laughter», non «Tasha's Hideous Laughter»).`;
  }
  return null;
}
