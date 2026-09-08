import rawSpells from "./data/incantesimi_2024.json";

export interface Spell {
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

interface RawSpell {
  nome_italiano?: string;
  livello?: string;
  tempo_di_lancio?: string;
  gittata?: string;
  componenti?: string;
  durata?: string;
  descrizione?: string;
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
function parseLivello(livelloStr: string): {
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

function buildSpells(): Spell[] {
  const seen = new Set<string>();
  const spells: Spell[] = [];

  for (const item of rawSpells as RawSpell[]) {
    const name = (item.nome_italiano || "").trim();
    if (!name) continue;

    let id = slugify(name);
    // Guarantee uniqueness in the rare case two names collide after slugify.
    let suffix = 2;
    while (seen.has(id)) {
      id = `${slugify(name)}-${suffix++}`;
    }
    seen.add(id);

    const { livello_num, scuola, classi } = parseLivello(item.livello || "");
    spells.push({
      id,
      nome_italiano: name,
      livello: item.livello || "",
      tempo_di_lancio: item.tempo_di_lancio || "",
      gittata: item.gittata || "",
      componenti: item.componenti || "",
      durata: item.durata || "",
      descrizione: item.descrizione || "",
      livello_num,
      scuola,
      classi,
    });
  }

  spells.sort((a, b) =>
    a.nome_italiano.localeCompare(b.nome_italiano, "it", { sensitivity: "base" }),
  );
  return spells;
}

export const SPELLS: Spell[] = buildSpells();

export function getSpellById(id: string): Spell | undefined {
  return SPELLS.find((s) => s.id === id);
}

export interface SpellsMeta {
  scuole: string[];
  classi: string[];
  livelli: number[];
}

export function getMeta(): SpellsMeta {
  const scuole = new Set<string>();
  const classi = new Set<string>();
  const livelli = new Set<number>();
  for (const s of SPELLS) {
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
