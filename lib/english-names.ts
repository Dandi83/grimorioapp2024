import names from "./data/nomi-inglesi-srd.json";

/**
 * The official English names of the SRD cards (PROMPT 33): only the name, never the text, read by the search on the
 * server (the index /ricerca-indice.json and the lists of Incantesimi, Bestiario, Oggetti magici). Keyed by the stored
 * id of the card; a card without a certain match (lib/data/nomi-inglesi-srd.json, «senzaCorrispondenza») has none.
 */
export type EnglishKind = "incantesimi" | "mostri" | "oggetti-magici" | "condizioni" | "classi" | "sottoclassi";
type Table = Record<"2014" | "2024", Record<EnglishKind, Record<string, string>>>;
const table = names as unknown as Table;

export function englishName(kind: EnglishKind, edition: "2014" | "2024", id: string): string | undefined {
  return Object.hasOwn(table[edition][kind], id) ? table[edition][kind][id] : undefined;
}
