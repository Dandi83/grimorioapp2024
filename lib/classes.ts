import data2014 from "./data/srd-classes-5.1-it.json";
import data2024 from "./data/srd-classes-5.2.1-it.json";
import type { ClassData, ClassEdition, ClassFeature } from "./classes-types";

/**
 * The twelve classes of the Compendio (/classi), one entry per class with its editions. The 2024
 * texts come from lib/data/srd-classes-5.2.1-it.json, built by scripts/transcribe-classes-2024.py
 * from the «Classi» entries of the 2024 manual (tests/classes-2024.cjs checks every text against the
 * manual fingerprints); the 2014 texts from lib/data/srd-classes-5.1-it.json, transcribed from the
 * SRD 5.1 PDF by scripts/transcribe-srd51-classes.py (tests/classes-2014.cjs). Server only: the pages
 * render the texts, the browser never loads this module.
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
  editions: {
    "2024": (data2024.classi as unknown as ClassData[]).find(card => card.id === id)!,
    "2014": (data2014.classi as unknown as ClassData[]).find(card => card.id === id)!,
  },
}));

export const isClassId = (value: string): value is ClassId => (CLASS_IDS as readonly string[]).includes(value);
export const classHref = (id: string) => `/classi/${id}`;

/** The labels of the same trait in the two editions (2024 «Tratti del …», 2014 «Competenze»). */
export const TRAITS = {
  dado: ["Dado Vita", "Dadi Vita", "Dadi vita"],
  primarie: ["Caratteristiche primarie"],
  tiri: ["Competenze nei tiri salvezza", "Tiri Salvezza"],
  armi: ["Competenza nelle armi", "Armi"],
  armature: ["Competenza nelle armature", "Armature"],
  abilita: ["Competenze nelle abilità", "Competenza nelle abilità", "Abilità"],
  strumenti: ["Competenze negli strumenti", "Competenza negli strumenti", "Strumenti"],
  equipaggiamento: ["Equipaggiamento iniziale", "Equipaggiamento"],
  pf1: ["Punti ferita al 1° livello", "Punti Ferita al 1° Livello"],
  pfDopo: ["Punti ferita ai livelli successivi", "Punti Ferita ai Livelli Successivi"],
} as const;

/** The printed value of a trait, whatever the edition calls it. */
export function trait(card: ClassData, key: keyof typeof TRAITS): string | undefined {
  const labels: readonly string[] = TRAITS[key];
  return card.tratti.voci.find(voce => labels.includes(voce.etichetta))?.valore;
}

/** «D10» from «D10 per ogni livello da guerriero» (2024), «1d10» from «1d10 per ogni livello…» (2014). */
export const hitDie = (card: ClassData) => /^(?:D\d+|\d+d\d+)/i.exec(trait(card, "dado") ?? "")?.[0];
export const primaryAbilities = (card: ClassData) => trait(card, "primarie");
/** Classes that cast spells: the spell list (2024) or a feature «Incantesimi» / «Magia del Patto» (2014). */
export const castsSpells = (card: ClassData) => !!card.incantesimi || card.privilegi.some(feature => ["Incantesimi", "Magia del Patto"].includes(feature.titolo));

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
