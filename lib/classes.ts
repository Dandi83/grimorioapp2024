import data2024 from "./data/srd-classes-5.2.1-it.json";
import type { ClassData, ClassEdition, ClassFeature } from "./classes-types";

/**
 * The twelve classes of the Compendio (/classi), one entry per class with its editions. The 2024
 * texts come from lib/data/srd-classes-5.2.1-it.json, built by scripts/transcribe-classes-2024.py
 * from the «Classi» entries of the 2024 manual (tests/classes-2024.cjs checks every text against the
 * manual fingerprints). Server only: the pages render the texts, the browser never loads this module.
 */

export const CLASS_IDS = ["barbaro", "bardo", "chierico", "druido", "guerriero", "ladro", "mago", "monaco", "paladino", "ranger", "stregone", "warlock"] as const;
export type ClassId = (typeof CLASS_IDS)[number];

/** Colour of each class (cards, header of the sheet), approved by Daniele. */
export const CLASS_COLORS: Record<ClassId, string> = {
  barbaro: "#8A3A1F", bardo: "#74386A", chierico: "#7E5E12", druido: "#3C6638", guerriero: "#7A1F2B", ladro: "#3D4750",
  mago: "#2D4C7A", monaco: "#2F6461", paladino: "#3A5F86", ranger: "#4E6131", stregone: "#8E3459", warlock: "#4B2E5E",
};

export interface ClassEntry { id: ClassId; editions: Partial<Record<ClassEdition, ClassData>> }

export const classEntries: ClassEntry[] = CLASS_IDS.map(id => ({
  id,
  editions: { "2024": (data2024.classi as ClassData[]).find(card => card.id === id)! },
}));

export const isClassId = (value: string): value is ClassId => (CLASS_IDS as readonly string[]).includes(value);
export const classHref = (id: string) => `/classi/${id}`;

/** The printed value of a row of «Tratti del …», by the start of its label. */
export function trait(card: ClassData, label: string): string | undefined {
  return card.tratti.voci.find(voce => voce.etichetta.startsWith(label))?.valore;
}

/** «D10» from «D10 per ogni livello da guerriero». */
export const hitDie = (card: ClassData) => /^D\d+/i.exec(trait(card, "Dado Vita") ?? "")?.[0].toUpperCase();
export const primaryAbilities = (card: ClassData) => trait(card, "Caratteristiche primarie");

export interface LevelRow {
  livello: number;
  /** The «Privilegi di classe» cell of the table, as printed. */
  nomi: string;
  privilegi: ClassFeature[];
  /** Features of the subclass gained at this level. */
  sottoclasse: ClassFeature[];
}

/** One row per level: the names printed in the table and the features described in the text. */
export function levelRows(card: ClassData): LevelRow[] {
  const column = card.tabella.colonne.findIndex(name => name.startsWith("Privilegi"));
  return card.tabella.righe.map(row => {
    const livello = Number.parseInt(row[0], 10);
    return {
      livello,
      nomi: row[column],
      privilegi: card.privilegi.filter(feature => feature.livello === livello),
      sottoclasse: card.sottoclasse.privilegi.filter(feature => feature.livello === livello),
    };
  });
}

/** «del guerriero», «dello stregone»: the article the manual uses before the class name. */
export const ofClass = (name: string) => `${/^(?:s[^aeiou]|z|gn|ps|x)/i.test(name) ? "dello" : "del"} ${name.toLowerCase()}`;
