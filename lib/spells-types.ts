// Tipi e utility PURE (nessun accesso al DB) — sicure da importare sia lato
// client che lato server.
import originalDescriptionIds from "./data/original-description-ids.json";

export interface Spell {
  edizione?: "2014" | "2024";
  id: string;
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
  livello_num: number; // 0 = Trucchetto, 1-9 = livello, -1 = sconosciuto
  scuola: string;
  classi: string[];
}

// All 49 non-SRD descriptions are original rules summaries. Display-only marker.
export function hasUnverifiedDescription(id: string): boolean {
  return isOriginalDescription(id);
}

const ORIGINAL_DESCRIPTION_IDS = new Set(originalDescriptionIds);

export function isOriginalDescription(id: string): boolean {
  return ORIGINAL_DESCRIPTION_IDS.has(id);
}

export const SCHOOL_KEYWORDS = [
  "Abiurazione",
  "Ammaliamento",
  "Divinazione",
  "Evocazione",
  "Illusione",
  "Invocazione",
  "Necromanzia",
  "Trasmutazione",
] as const;

const LEVEL_RE = /(\d+)\s*[°º]\s*livello/i;
const CLASSES_RE = /\(([^)]+)\)/;

/**
 * Reproduces the backend Python parser: extracts level number, school and
 * classes from strings like
 * "Divinazione di 2° livello (mago, stregone, warlock)".
 */
export function parseLivello(livelloStr: string): {
  livello_num: number;
  scuola: string;
  classi: string[];
} {
  const s = livelloStr || "";

  let scuola = "";
  for (const sk of SCHOOL_KEYWORDS) {
    if (s.toLowerCase().includes(sk.toLowerCase())) {
      scuola = sk;
      break;
    }
  }

  let livello_num = -1;
  if (s.toLowerCase().includes("trucchetto")) {
    livello_num = 0;
  } else {
    const m = LEVEL_RE.exec(s);
    if (m) {
      const n = parseInt(m[1], 10);
      livello_num = Number.isNaN(n) ? -1 : n;
    }
  }

  let classi: string[] = [];
  const m2 = CLASSES_RE.exec(s);
  if (m2) {
    classi = m2[1]
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
  }

  return { livello_num, scuola, classi };
}

/** Stable, URL-safe id derived from the spell name (used for routes + favorites). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface SpellsMeta {
  scuole: string[];
  classi: string[];
  livelli: number[];
}

export type SpellListItem = Pick<Spell, "id" | "nome_italiano" | "livello_num" | "scuola" | "classi"> & {
  /** Shown under the name; short text, never the description. */
  tempo_di_lancio?: string;
  /** Present only when true, to keep the list light. */
  concentrazione?: true;
  rituale?: true;
  /** Only 2014 is stored: every other spell belongs to the 2024 list. */
  edizione?: "2014";
};

/** Light list fields derived from the stored text (duration and casting time are not changed). */
export function spellListFlags(row: { tempo_di_lancio?: string | null; durata?: string | null; livello?: string | null }) {
  return {
    ...(/^\s*concentrazione\b/i.test(row.durata || "") ? { concentrazione: true as const } : {}),
    ...(/\brituale\b/i.test(`${row.tempo_di_lancio || ""} ${row.livello || ""}`) ? { rituale: true as const } : {}),
  };
}

export function computeMeta(list: readonly SpellListItem[]): SpellsMeta {
  const scuole = new Set<string>();
  const classi = new Set<string>();
  const livelli = new Set<number>();
  for (const s of list) {
    if (s.scuola) scuole.add(s.scuola);
    for (const c of s.classi) classi.add(c);
    if (s.livello_num >= 0) livelli.add(s.livello_num);
  }
  return {
    scuole: [...scuole].sort((a, b) => a.localeCompare(b, "it")),
    classi: [...classi].sort((a, b) => a.localeCompare(b, "it")),
    livelli: [...livelli].sort((a, b) => a - b),
  };
}

export function levelLabel(n: number): string {
  return n === 0 ? "Trucchetto" : `${n}° liv.`;
}

export function capitalizeWords(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}
