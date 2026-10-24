import type { CardSource } from "./card-display";
import animalIds from "./data/srd-animal-ids.json";
const ANIMAL_IDS = new Set(animalIds);
export function isSrdAnimal(monster: {id:string}) { return ANIMAL_IDS.has(monster.id); }
/** The collection of a creature in the Bestiario: Mostri, Animali or Homebrew. */
export function collectionOf(monster: {id:string; homebrew?: unknown}): "mostri" | "animali" | "homebrew" {
  return monster.homebrew ? "homebrew" : ANIMAL_IDS.has(monster.id) ? "animali" : "mostri";
}

// Tipi e utility PURE per i mostri (nessun accesso al DB) — sicure sia lato
// client che lato server.

export interface MonsterProvenance {
  document: string;
  edition: string;
  sourceUrl: string;
  page: number;
}

export interface Monster {
  edizione?: "2014" | "2024";
  id: string;
  nome: string;
  tipo: string;
  taglia: string;
  allineamento: string;
  grado_sfida: string;
  px: string;
  classe_armatura: string;
  iniziativa?: string;
  sottotitolo_fonte?: string;
  azioni_bonus?: string;
  attrezzatura?: string;
  immunita?: string;
  bonus_competenza?: string;
  punti_ferita: string;
  velocita: string;
  forza: number;
  destrezza: number;
  costituzione: number;
  intelligenza: number;
  saggezza: number;
  carisma: number;
  tiri_salvezza: string;
  abilita: string;
  vulnerabilita: string;
  resistenze: string;
  immunita_danni: string;
  immunita_condizioni: string;
  sensi: string;
  linguaggi: string;
  tratti: string;
  azioni: string;
  reazioni: string;
  azioni_leggendarie: string;
  descrizione: string;
  gs_num: number; // valore numerico del grado sfida per l'ordinamento
  provenienza?: MonsterProvenance;
  habitat?: string[];
  /** Sheet that exists only in the project files, not in the database. */
  solo_progetto?: boolean;
  /** A homebrew creature (lib/homebrew.ts): its edition, and its author (null: made by the Grimorio). */
  homebrew_edizione?: "2014" | "2024" | "entrambe";
  homebrew_autore?: string | null;
  /** The licence a homebrew card shows (lib/homebrew.ts homebrewLicense); null: none accepted. */
  homebrew_licenza?: string | null;
  /** The label of the card: «SRD 5.2.1», «SRD 5.1», «Aggiunta da te», «Homebrew»; none for an SRD sheet edited. */
  fonte_scheda?: CardSource;
}

export const SIZES = [
  "Minuscola",
  "Piccola",
  "Media",
  "Grande",
  "Enorme",
  "Mastodontica",
] as const;

// Categorie principali di tipo creatura (parola prima dell'eventuale parentesi).
export const TYPE_KEYWORDS = [
  "Aberrazione",
  "Bestia",
  "Celestiale",
  "Costrutto",
  "Drago",
  "Elementale",
  "Folletto",
  "Immondo",
  "Gigante",
  "Umanoide",
  "Melma",
  "Mostruosità",
  "Vegetale",
  "Non morto",
] as const;

/** Old names of two categories, still in saved filters and old addresses (?tipo=Fata). */
const OLD_TYPE_NAMES: Record<string, string> = { Fata: "Folletto", Pianta: "Vegetale" };

/** A Tipo filter with the current names: «Fata» → «Folletto», «Pianta» → «Vegetale», no repeats. */
export function currentTypeNames(types: readonly string[]): string[] {
  return [...new Set(types.map(type => OLD_TYPE_NAMES[type] ?? type))];
}

/** Converte un grado sfida testuale ("1/4", "0", "5") in un numero ordinabile. */
export function parseGs(gs: string): number {
  const s = (gs || "").trim();
  if (!s) return -1;
  if (s.includes("/")) {
    const [a, b] = s.split("/").map((x) => parseFloat(x));
    if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) return a / b;
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? -1 : n;
}

/** Categoria di tipo (prima parola nota) da "Umanoide (goblinoide)" -> "Umanoide". */
export function typeCategory(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (t.includes("bestie")) return "Bestia";
  if (/non mort[oi]/.test(t)) return "Non morto";
  for (const k of TYPE_KEYWORDS) {
    if (t.includes(k.toLowerCase())) return k;
  }
  return tipo ? tipo.split(/[\s(]/)[0] : "";
}

/** Modificatore di caratteristica formattato ("+2", "-1"). */
export function abilityMod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

/** Id URL-safe derivato dal nome (route + preferiti). */
export function monsterSlugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface MonstersMeta {
  taglie: string[];
  tipi: string[];
  gradi: string[];
}

export type MonsterListItem = Pick<Monster, "id" | "nome" | "tipo" | "taglia" | "grado_sfida" | "gs_num" | "habitat"> & {
  /** Rules edition of the sheet, used by the 2024 | 2014 selector. */
  edizione: "2014" | "2024";
  /** Hidden from the public with the eye of the admin area: present only in the administrator's lists and in Preferiti. */
  nascosta?: true;
  /** A homebrew creature: shown only in the «Homebrew» collection, with its author (null: «del Grimorio»). */
  homebrew?: true;
  autore?: string | null;
  /** A homebrew for both editions: listed in 2014 and in 2024 (edizione is "2024", its format). */
  entrambe?: true;
};

/** List rows carry only what the catalog shows and filters on, never the full sheet. */
export function toMonsterListItem({ id, nome, tipo, taglia, grado_sfida, gs_num, habitat, edizione }: MonsterListItem): MonsterListItem {
  return { id, nome, tipo, taglia, grado_sfida, gs_num, edizione, ...(habitat?.length ? { habitat } : {}) };
}

export function computeMonstersMeta(list: readonly MonsterListItem[]): MonstersMeta {
  const taglie = new Set<string>();
  const tipi = new Set<string>();
  const gradi = new Set<string>();
  for (const m of list) {
    if (m.taglia) taglie.add(m.taglia);
    const cat = typeCategory(m.tipo);
    if (cat) tipi.add(cat);
    if (m.grado_sfida) gradi.add(m.grado_sfida);
  }
  const sizeRank = (t: string) => {
    const i = (SIZES as readonly string[]).indexOf(t);
    return i < 0 ? 999 : i;
  };
  return {
    taglie: [...taglie].sort((a, b) => sizeRank(a) - sizeRank(b)),
    tipi: [...tipi].sort((a, b) => a.localeCompare(b, "it")),
    gradi: [...gradi].sort((a, b) => parseGs(a) - parseGs(b)),
  };
}

export function gsLabel(gs: string): string {
  return gs ? `GS ${gs}` : "GS —";
}

// Colori accento per categoria di tipo (coerenti con la palette del brand).
export const typeColors: Record<string, string> = {
  Aberrazione: "#8E5EA8",
  Bestia: "#6BA85E",
  Celestiale: "#D4AF37",
  Costrutto: "#5F5F5F",
  Drago: "#C74848",
  Elementale: "#4C6B8A",
  Folletto: "#B85C8A",
  Immondo: "#A83E3E",
  Gigante: "#C97A3E",
  Umanoide: "#7A6BA8",
  Melma: "#6BA88A",
  "Mostruosità": "#B8863E",
  Vegetale: "#5EA86B",
  "Non morto": "#7A7A7A",
};

export function monsterColor(tipo: string): string {
  return typeColors[typeCategory(tipo)] ?? "#D4AF37";
}
