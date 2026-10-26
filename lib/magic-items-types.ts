// Pure types and helpers of the Oggetti magici section: safe in client components.
// The list carries names and the printed type line only; item texts stay on the server.

export type MagicItemEdition = "2014" | "2024";

/** The nine types printed at the start of the italic line under the name. */
export const MAGIC_ITEM_TYPES = [
  "Oggetto meraviglioso", "Arma", "Armatura", "Anello", "Pozione", "Bacchetta", "Bastone", "Verga", "Pergamena",
] as const;
export type MagicItemType = (typeof MAGIC_ITEM_TYPES)[number];

/** Rarity filters: the printed rarities, masculine as in the manual's rarity table; "rarità variabile" is Variabile. */
export const MAGIC_ITEM_RARITIES = ["Comune", "Non comune", "Raro", "Molto raro", "Leggendario", "Variabile"] as const;
export type MagicItemRarity = (typeof MAGIC_ITEM_RARITIES)[number];
/** Printed rarity outside the filters: the artifact of the list ("manufatto"). */
export type MagicItemRarityChip = MagicItemRarity | "Manufatto";

export const ATTUNEMENT_FILTERS = ["Richiesta", "Non richiesta"] as const;
export type AttunementFilter = (typeof ATTUNEMENT_FILTERS)[number];

/**
 * Rarities named in the printed rarity text, in table order: "rara" is Raro, "non comune (+1), rara (+2)
 * o molto rara (+3)" is Non comune, Raro and Molto raro, "rarità variabile" is Variabile.
 */
export function rarityCategories(printed: string): MagicItemRarityChip[] {
  const text = printed.toLowerCase();
  if (text.includes("rarità variabile")) return ["Variabile"];
  if (text.includes("manufatto")) return ["Manufatto"];
  const found = new Set<MagicItemRarity>();
  for (const match of text.matchAll(/non comune|molto rar[oa]|leggendari[oa]|comune|rar[oa]/g)) {
    const word = match[0];
    found.add(word === "non comune" ? "Non comune" : word === "comune" ? "Comune" : word.startsWith("molto") ? "Molto raro" : word.startsWith("leggendari") ? "Leggendario" : "Raro");
  }
  return MAGIC_ITEM_RARITIES.filter(rarity => found.has(rarity));
}

/** Light row of the list: no texts. */
export interface MagicItemListRow {
  id: string;
  href: string;
  nome: string;
  tipo: MagicItemType;
  /** Printed rarity, as in the type line: "rara", "non comune (+1), rara (+2) o molto rara (+3)". */
  rarita: string;
  rarita_categorie: MagicItemRarityChip[];
  sintonia: boolean;
}

export interface MagicItemFilters { rarita: MagicItemRarity[]; tipo: MagicItemType[]; sintonia: AttunementFilter[] }
export const NO_MAGIC_ITEM_FILTERS: MagicItemFilters = { rarita: [], tipo: [], sintonia: [] };

/** "o" inside the same filter, "e" between different filters. */
function matchesMagicItem(row: MagicItemListRow, filters: MagicItemFilters): boolean {
  if (filters.rarita.length && !row.rarita_categorie.some(rarity => (filters.rarita as string[]).includes(rarity))) return false;
  if (filters.tipo.length && !filters.tipo.includes(row.tipo)) return false;
  if (filters.sintonia.length && !filters.sintonia.includes(row.sintonia ? "Richiesta" : "Non richiesta")) return false;
  return true;
}

/** Name search: case, accents and apostrophes ignored. */
export const foldName = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, " ");

export function searchMagicItems(rows: MagicItemListRow[], query: string, filters: MagicItemFilters): MagicItemListRow[] {
  const needle = foldName(query.trim());
  return rows.filter(row => (!needle || foldName(row.nome).includes(needle)) && matchesMagicItem(row, filters));
}

// Filters in the address: ?rarita=raro,molto-raro&tipo=anello&sintonia=richiesta (slugs of the labels).
const slugOf = (label: string) => label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
const fromSlugs = <T extends string>(value: string | null, options: readonly T[]) => {
  const slugs = (value || "").split(",").map(part => part.trim()).filter(Boolean);
  return options.filter(option => slugs.includes(slugOf(option)));
};

export function magicItemFiltersFromParams(params: URLSearchParams): MagicItemFilters {
  return {
    rarita: fromSlugs(params.get("rarita"), MAGIC_ITEM_RARITIES),
    tipo: fromSlugs(params.get("tipo"), MAGIC_ITEM_TYPES),
    sintonia: fromSlugs(params.get("sintonia"), ATTUNEMENT_FILTERS),
  };
}

/** The address search of the filters and the query; other parameters (edizione) are kept. */
export function magicItemSearch(current: string, filters: MagicItemFilters, query: string): string {
  const params = new URLSearchParams(current);
  const set = (name: string, values: readonly string[]) => (values.length ? params.set(name, values.map(slugOf).join(",")) : params.delete(name));
  set("rarita", filters.rarita);
  set("tipo", filters.tipo);
  set("sintonia", filters.sintonia);
  if (query.trim()) params.set("q", query.trim());
  else params.delete("q");
  const text = params.toString().replace(/%2C/g, ",");
  return text ? `?${text}` : "";
}
