/**
 * Homebrew creatures (proposed by the community or made in the admin area): the guided form, its checks
 * and the sheet it becomes. Pure rules, no database: used by the form, the server and the tests.
 *
 * The form keeps plain text (never HTML from the visitor). The sheet is built here in the format of the SRD
 * sheets of the chosen edition, so components/monster-sheet.tsx shows it exactly like them:
 * - 2024 (and «Entrambe»): Iniziativa, proficiency bonus, saving throws for all six abilities, one «Immunità»
 *   line, bonus actions, effects with «Fallimento» and «Successo»;
 * - 2014: saving throws only where proficient, damage and condition immunities apart, no bonus actions.
 */

import { HABITATS, normalizeHabitats } from "./habitats";
import { abilityMod, parseGs, SIZES, TYPE_KEYWORDS, type Monster } from "./monsters-types";

export const HOMEBREW_EDITIONS = ["2024", "2014", "entrambe"] as const;
export type HomebrewEdition = (typeof HOMEBREW_EDITIONS)[number];
export const HOMEBREW_EDITION_LABEL: Record<HomebrewEdition, string> = { "2024": "2024", "2014": "2014", entrambe: "Entrambe" };

export const ABILITY_KEYS = ["forza", "destrezza", "costituzione", "intelligenza", "saggezza", "carisma"] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];
export const ABILITY_SHORT: Record<AbilityKey, string> = { forza: "For", destrezza: "Des", costituzione: "Cos", intelligenza: "Int", saggezza: "Sag", carisma: "Car" };

export const ENTRY_BLOCKS = ["tratti", "azioni", "azioni_bonus", "reazioni", "azioni_leggendarie"] as const;
export type EntryBlock = (typeof ENTRY_BLOCKS)[number];
export const BLOCK_LABEL: Record<EntryBlock, { title: string; singular: string }> = {
  tratti: { title: "Tratti", singular: "Tratto" },
  azioni: { title: "Azioni", singular: "Azione" },
  azioni_bonus: { title: "Azioni bonus", singular: "Azione bonus" },
  reazioni: { title: "Reazioni", singular: "Reazione" },
  azioni_leggendarie: { title: "Azioni leggendarie", singular: "Azione leggendaria" },
};
/** Blocks of each format: the 2014 SRD sheets have no bonus actions. */
export function blocksOf(edition: HomebrewEdition): EntryBlock[] {
  return edition === "2014" ? ENTRY_BLOCKS.filter(block => block !== "azioni_bonus") : [...ENTRY_BLOCKS];
}

export const CHALLENGE_RATINGS = ["0", "1/8", "1/4", "1/2", ...Array.from({ length: 30 }, (_, i) => String(i + 1))] as const;
export const HOMEBREW_TYPES = TYPE_KEYWORDS;
export const HOMEBREW_ALIGNMENTS = ["legale buono", "neutrale buono", "caotico buono", "legale neutrale", "neutrale", "caotico neutrale", "legale malvagio", "neutrale malvagio", "caotico malvagio", "senza allineamento", "qualsiasi allineamento"] as const;

export interface HomebrewEntry { nome: string; testo: string }

/** What the form sends and what is stored: plain text only. */
export interface HomebrewDraft {
  edizione: HomebrewEdition;
  nome: string;
  taglia: string;
  tipo: string;
  allineamento: string;
  ca: number;
  ca_nota: string;
  pf: number;
  dadi_vita: string;
  velocita: string;
  forza: number; destrezza: number; costituzione: number; intelligenza: number; saggezza: number; carisma: number;
  /** Abilities with proficiency in the saving throw. */
  ts_competenti: AbilityKey[];
  abilita: string;
  vulnerabilita: string;
  resistenze: string;
  immunita_danni: string;
  immunita_condizioni: string;
  /** Special senses ("scurovisione 18 m"); passive Perception is added on the sheet. */
  sensi: string;
  linguaggi: string;
  habitat: string[];
  grado_sfida: string;
  tratti: HomebrewEntry[];
  azioni: HomebrewEntry[];
  azioni_bonus: HomebrewEntry[];
  reazioni: HomebrewEntry[];
  azioni_leggendarie: HomebrewEntry[];
  /** What the creature is and how it behaves, at the top of the sheet (PROMPT 20); optional, absent on older cards. */
  descrizione?: string;
}

export const EMPTY_DRAFT: HomebrewDraft = {
  edizione: "2024", nome: "", taglia: "Media", tipo: "Mostruosità", allineamento: "neutrale", ca: 12, ca_nota: "", pf: 10, dadi_vita: "3d8",
  velocita: "9 m", forza: 10, destrezza: 10, costituzione: 10, intelligenza: 10, saggezza: 10, carisma: 10, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [],
  grado_sfida: "1", tratti: [], azioni: [{ nome: "", testo: "" }], azioni_bonus: [], reazioni: [], azioni_leggendarie: [], descrizione: "",
};

export const LIMITS = { nome: 60, short: 160, entryName: 60, entryText: 1500, entries: 12, nickname: 40, motivo: 500, descrizione: 600 } as const;
/** The whole JSON of a proposal: enough for a big creature, small enough for the database and the antispam. */
export const PROPOSAL_MAX_BYTES = 48 * 1024;

const DICE = /^(\d{1,2})d(4|6|8|10|12|20)(?:\s*([+-])\s*(\d{1,3}))?$/;

/** Plain text: no control characters, no tags, no angle brackets; spaces collapsed on one line. */
export function plainText(value: unknown, max: number, multiline = false): string | null {
  if (typeof value !== "string") return null;
  let text = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "");
  text = multiline ? text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : text.replace(/\s+/g, " ").trim();
  if (/[<>]/.test(text)) return null;
  return Array.from(text).length > max ? null : text;
}

function intIn(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^-?\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

type DraftCheck = { ok: true; draft: HomebrewDraft } | { ok: false; error: string };

/** The server check of a draft: lengths, numbers, choices, plain text. The first problem found is returned. */
export function parseDraft(input: unknown): DraftCheck {
  if (!input || typeof input !== "object") return { ok: false, error: "Scheda non valida." };
  const data = input as Record<string, unknown>;
  const fail = (error: string): DraftCheck => ({ ok: false, error });
  const edizione = data.edizione;
  if (!(HOMEBREW_EDITIONS as readonly unknown[]).includes(edizione)) return fail("Scegli l’edizione.");
  const nome = plainText(data.nome, LIMITS.nome);
  if (!nome || Array.from(nome).length < 2) return fail("Scrivi il nome della creatura (da 2 a 60 caratteri).");
  if (!(SIZES as readonly unknown[]).includes(data.taglia)) return fail("Scegli la taglia.");
  if (!(HOMEBREW_TYPES as readonly string[]).includes(data.tipo as string)) return fail("Scegli il tipo.");
  if (!(HOMEBREW_ALIGNMENTS as readonly unknown[]).includes(data.allineamento)) return fail("Scegli l’allineamento.");
  const ca = intIn(data.ca, 1, 30);
  if (ca === null) return fail("Classe armatura: un numero da 1 a 30.");
  const pf = intIn(data.pf, 1, 999);
  if (pf === null) return fail("Punti ferita: un numero da 1 a 999.");
  const dadi = plainText(data.dadi_vita, 20);
  if (!dadi || !DICE.test(dadi)) return fail("Dadi vita: per esempio 6d8 + 18.");
  const scores: Partial<Record<AbilityKey, number>> = {};
  for (const key of ABILITY_KEYS) {
    const score = intIn(data[key], 1, 30);
    if (score === null) return fail(`${ABILITY_SHORT[key]}: un punteggio da 1 a 30.`);
    scores[key] = score;
  }
  const ts = Array.isArray(data.ts_competenti) ? data.ts_competenti : [];
  if (ts.some(key => !(ABILITY_KEYS as readonly unknown[]).includes(key))) return fail("Tiri salvezza non validi.");
  if (!(CHALLENGE_RATINGS as readonly unknown[]).includes(data.grado_sfida)) return fail("Scegli il grado di sfida.");
  const texts: Record<string, string> = {};
  for (const key of ["ca_nota", "velocita", "abilita", "vulnerabilita", "resistenze", "immunita_danni", "immunita_condizioni", "sensi", "linguaggi"] as const) {
    const text = plainText(data[key] ?? "", LIMITS.short);
    if (text === null) return fail(`Il campo «${FIELD_LABEL[key]}» è troppo lungo o contiene caratteri non ammessi (< >).`);
    texts[key] = text;
  }
  if (!texts.velocita) return fail("Scrivi la velocità (per esempio 9 m).");
  const habitat = Array.isArray(data.habitat) ? data.habitat : [];
  if (habitat.some(item => !(HABITATS as readonly unknown[]).includes(item))) return fail("Habitat non valido.");
  const blocks: Partial<Record<EntryBlock, HomebrewEntry[]>> = {};
  for (const block of ENTRY_BLOCKS) {
    const list = Array.isArray(data[block]) ? data[block] as unknown[] : [];
    if (list.length > LIMITS.entries) return fail(`${BLOCK_LABEL[block].title}: al massimo ${LIMITS.entries} voci.`);
    const entries: HomebrewEntry[] = [];
    for (const item of list) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const name = plainText(entry.nome ?? "", LIMITS.entryName);
      const text = plainText(entry.testo ?? "", LIMITS.entryText, true);
      if (name === null || text === null) return fail(`${BLOCK_LABEL[block].title}: testo troppo lungo o con caratteri non ammessi (< >).`);
      if (!name && !text) continue;
      if (!text) return fail(`${BLOCK_LABEL[block].title}: scrivi la descrizione di «${name}».`);
      entries.push({ nome: name, testo: text });
    }
    blocks[block] = edizione === "2014" && block === "azioni_bonus" ? [] : entries;
  }
  if (!blocks.azioni?.length) return fail("Aggiungi almeno un’azione.");
  // Optional (PROMPT 21): the cards and proposals saved before have none.
  const descrizione = plainText(data.descrizione ?? "", LIMITS.descrizione, true);
  if (descrizione === null) return fail(`Descrizione: al massimo ${LIMITS.descrizione} caratteri, senza < >.`);
  return {
    ok: true,
    draft: {
      edizione: edizione as HomebrewEdition, nome, taglia: data.taglia as string, tipo: data.tipo as string, allineamento: data.allineamento as string,
      ca, ca_nota: texts.ca_nota, pf, dadi_vita: dadi.replace(/\s*([+-])\s*/, " $1 "), velocita: texts.velocita,
      ...(scores as Record<AbilityKey, number>),
      ts_competenti: ABILITY_KEYS.filter(key => ts.includes(key)),
      abilita: texts.abilita, vulnerabilita: texts.vulnerabilita, resistenze: texts.resistenze, immunita_danni: texts.immunita_danni,
      immunita_condizioni: texts.immunita_condizioni, sensi: texts.sensi, linguaggi: texts.linguaggi,
      habitat: normalizeHabitats(habitat), grado_sfida: data.grado_sfida as string,
      tratti: blocks.tratti!, azioni: blocks.azioni!, azioni_bonus: blocks.azioni_bonus!, reazioni: blocks.reazioni!, azioni_leggendarie: blocks.azioni_leggendarie!,
      ...(descrizione ? { descrizione } : {}),
    },
  };
}

const FIELD_LABEL: Record<string, string> = {
  ca_nota: "Nota della CA", velocita: "Velocità", abilita: "Abilità", vulnerabilita: "Vulnerabilità", resistenze: "Resistenze",
  immunita_danni: "Immunità ai danni", immunita_condizioni: "Immunità alle condizioni", sensi: "Sensi", linguaggi: "Linguaggi",
};

/** Proficiency bonus from the challenge rating (5e rule: +2 up to GS 4, then +1 every 4). */
export function proficiency(gs: string): number {
  return 2 + (Math.max(0, Math.ceil(Math.max(parseGs(gs), 0)) - 1) >> 2);
}

const XP: Record<string, string> = {
  "0": "10", "1/8": "25", "1/4": "50", "1/2": "100", "1": "200", "2": "450", "3": "700", "4": "1.100", "5": "1.800", "6": "2.300", "7": "2.900",
  "8": "3.900", "9": "5.000", "10": "5.900", "11": "7.200", "12": "8.400", "13": "10.000", "14": "11.500", "15": "13.000", "16": "15.000",
  "17": "18.000", "18": "20.000", "19": "22.000", "20": "25.000", "21": "33.000", "22": "41.000", "23": "50.000", "24": "62.000",
  "25": "75.000", "26": "90.000", "27": "105.000", "28": "120.000", "29": "135.000", "30": "155.000",
};
/** Experience of a challenge rating, as printed on the SRD sheets. */
const experienceOf = (gs: string) => XP[gs] ?? "";

const FEMININE_TYPES = new Set(["Aberrazione", "Bestia", "Melma", "Mostruosità"]);
/** «Mostruosità Grande», «Drago Medio»: the size agrees with the type, as on the SRD subtitle line. */
function sizeFor(taglia: string, tipo: string): string {
  return FEMININE_TYPES.has(tipo) || /e$/.test(taglia) ? taglia : taglia.replace(/a$/, "o");
}

const LABELS = /(Tiro per colpire (?:in mischia o a distanza|in mischia|a distanza):|Attacco con (?:arma|incantesimo) (?:da mischia o a distanza|da mischia|a distanza):|Colpito o mancato:|Colpito:|Mancato:|Fallimento o successo:|Fallimento:|Successo:|Primo fallimento:|Secondo fallimento:|Tiro salvezza su (?:Forza|Destrezza|Costituzione|Intelligenza|Saggezza|Carisma):)/g;
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One block of the sheet: «<strong>Nome.</strong> testo», paragraphs apart, rule labels in italics as on the SRD sheets. */
export function entriesHtml(entries: readonly HomebrewEntry[]): string {
  return entries.map(entry => {
    const body = escape(entry.testo).replace(LABELS, "<em>$1</em>").replace(/\n+/g, "<br>");
    const title = entry.nome ? `<strong>${escape(entry.nome.replace(/\.\s*$/, ""))}.</strong> ` : "";
    return `${title}${body}`;
  }).join("<br><br>");
}

/** The description: plain text, paragraphs apart. */
export function descriptionHtml(text: string | undefined): string {
  return text ? escape(text).split(/\n{2,}/).map(part => part.replace(/\n/g, "<br>")).join("<br><br>") : "";
}

// The typographic minus «−» of the SRD sheets (PROMPT 22), only when the sheet is drawn: the saved drafts stay as written.
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
export const typographicMinus = (text: string) => text.replace(/(^|[\s(,;:/])-(?=\d)/g, "$1−");

/** The sheet of a draft, in the format of its edition («Entrambe» uses the 2024 one). */
export function draftToMonster(draft: HomebrewDraft, id: string): Monster {
  const legacy = draft.edizione === "2014";
  const prof = proficiency(draft.grado_sfida);
  const mod = (key: AbilityKey) => Math.floor((draft[key] - 10) / 2);
  const saves = ABILITY_KEYS.filter(key => !legacy || draft.ts_competenti.includes(key))
    .map(key => `${ABILITY_SHORT[key]} ${signed(mod(key) + (draft.ts_competenti.includes(key) ? prof : 0))}`).join(", ");
  const perception = /Percezione\s*([+\-−]\d+)/i.exec(draft.abilita);
  const passive = 10 + (perception ? Number(perception[1]) : mod("saggezza"));
  const sensi = [`Percezione passiva ${passive}`, draft.sensi].filter(Boolean).join(legacy ? ", " : "; ");
  const immunities = [draft.immunita_danni, draft.immunita_condizioni].filter(Boolean).join("; ");
  const dex = mod("destrezza");
  return {
    id, nome: draft.nome, tipo: draft.tipo, taglia: draft.taglia, allineamento: draft.allineamento,
    sottotitolo_fonte: `${draft.tipo} ${sizeFor(draft.taglia, draft.tipo)}, ${draft.allineamento}`,
    grado_sfida: draft.grado_sfida, px: experienceOf(draft.grado_sfida), gs_num: parseGs(draft.grado_sfida),
    classe_armatura: draft.ca_nota ? `${draft.ca} (${draft.ca_nota})` : String(draft.ca),
    punti_ferita: `${draft.pf} (${draft.dadi_vita})`, velocita: draft.velocita,
    forza: draft.forza, destrezza: draft.destrezza, costituzione: draft.costituzione, intelligenza: draft.intelligenza, saggezza: draft.saggezza, carisma: draft.carisma,
    tiri_salvezza: saves, abilita: typographicMinus(draft.abilita), vulnerabilita: draft.vulnerabilita, resistenze: draft.resistenze,
    immunita_danni: legacy ? draft.immunita_danni : "", immunita_condizioni: legacy ? draft.immunita_condizioni : "",
    ...(legacy ? {} : { immunita: immunities, iniziativa: `${signed(dex)} (${10 + dex})`, bonus_competenza: signed(prof), azioni_bonus: entriesHtml(draft.azioni_bonus) }),
    sensi, linguaggi: draft.linguaggi || "—",
    tratti: entriesHtml(draft.tratti), azioni: entriesHtml(draft.azioni), reazioni: entriesHtml(draft.reazioni), azioni_leggendarie: entriesHtml(draft.azioni_leggendarie),
    descrizione: descriptionHtml(draft.descrizione), habitat: draft.habitat, edizione: legacy ? "2014" : "2024",
  };
}

/** The text of the actions, for the format check and the challenge check. */
export function draftActionText(draft: HomebrewDraft): string {
  return ENTRY_BLOCKS.flatMap(block => draft[block]).map(entry => `${entry.nome}. ${entry.testo}`).join("\n");
}

const FORMAT_2024 = /\b(?:Fallimento|Successo)\s*:|Tiro per colpire (?:in mischia|a distanza)/i;
const FORMAT_2014 = /Attacco con (?:arma|incantesimo) (?:da mischia|a distanza)|al tiro per colpire/i;

/** «2024» or «2014» when the actions are written in the other edition's format; undefined when they agree. */
export function mismatchedFormat(draft: Pick<HomebrewDraft, "edizione"> & { text: string }): "2024" | "2014" | undefined {
  if (draft.edizione === "2014" && FORMAT_2024.test(draft.text)) return "2024";
  if (draft.edizione !== "2014" && FORMAT_2014.test(draft.text) && !FORMAT_2024.test(draft.text)) return "2014";
  return undefined;
}
/** The words found, for the hint («Fallimento:», «Tiro per colpire in mischia»…). */
export function formatWords(text: string, format: "2024" | "2014"): string[] {
  const pattern = format === "2024" ? /\b(?:Fallimento|Successo)\s*:|Tiro per colpire (?:in mischia|a distanza)/gi : /Attacco con (?:arma|incantesimo) (?:da mischia|a distanza)|al tiro per colpire/gi;
  return [...new Set((text.match(pattern) ?? []).map(word => word.replace(/\s*:$/, ":")))];
}

/** Lower case, no accents, letters and digits only: for the similar-name check. */
export function foldName(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** A catalog creature whose name is the same, almost the same (1–2 letters) or contains it as a whole word. */
export function similarName(name: string, catalog: readonly string[]): string | undefined {
  const folded = foldName(name);
  if (folded.length < 3) return undefined;
  return catalog.find(other => {
    const target = foldName(other);
    if (target === folded) return true;
    if (Math.abs(target.length - folded.length) <= 2 && distance(target, folded) <= (folded.length > 6 ? 2 : 1)) return true;
    return target.length >= 4 && new RegExp(`(?:^| )${target}(?: |$)`).test(folded);
  });
}

/** Id of a homebrew card: always «homebrew-…», never one of an SRD sheet. */
export function homebrewId(nome: string): string {
  return `homebrew-${foldName(nome).replace(/ /g, "-").slice(0, 60) || "creatura"}`;
}
export const isHomebrewId = (id: string) => id.startsWith("homebrew-");

/** The author line: «di Nick» in the lists, «Proposta da Nick» on the card; the administrator's are «del Grimorio». */
export function authorLine(autore: string | null | undefined, where: "list" | "card"): string {
  // Ours: the «Dalla redazione» pill says it all (no author line in the lists).
  if (!autore) return where === "list" ? "" : "Dalla redazione";
  return where === "list" ? `di ${autore}` : `Proposta da ${autore}`;
}

/** Modifier of a score, for the editor. */
export const modifier = abilityMod;

/** The licence of the homebrew creatures (proposed and of the Grimorio), as it is saved with each one. */
export const HOMEBREW_LICENSE = "CC BY-NC-SA 4.0";
export const HOMEBREW_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it";

interface ProposalInput { draft: HomebrewDraft; nickname: string; email: string | null; licenza: string }
type ProposalParse = { ok: true; value: ProposalInput; spam: boolean; token: string } | { ok: false; error: string };

// Practical email check, the same as the reports form (lib/feedback-input.ts).
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** What the form «Proponi una creatura» sends. The honeypot field «sito» is invisible to people. */
export function parseProposal(body: unknown): ProposalParse {
  if (!body || typeof body !== "object") return { ok: false, error: "Richiesta non valida." };
  const data = body as Record<string, unknown>;
  const checked = parseDraft(data.scheda);
  if (!checked.ok) return checked;
  const nickname = plainText(data.nickname, LIMITS.nickname);
  if (!nickname || Array.from(nickname).length < 2) return { ok: false, error: "Scrivi il tuo nickname (da 2 a 40 caratteri): comparirà sulla scheda." };
  let email: string | null = null;
  if (data.email !== undefined && data.email !== null && data.email !== "") {
    const written = plainText(data.email, 254);
    if (written === null || (written && !EMAIL.test(written))) return { ok: false, error: "Email non valida: controllala o lasciala vuota." };
    email = written || null;
  }
  if (data.originale !== true) return { ok: false, error: "Conferma che la creatura è una tua creazione originale." };
  if (data.autorizza !== true) return { ok: false, error: `Pubblica la creatura con licenza ${HOMEBREW_LICENSE} e autorizza Il Grimorio.App a pubblicarla e a modificarla.` };
  // The version of the licence shown next to the box: a page opened before it was there sends none.
  if (data.licenza !== HOMEBREW_LICENSE) return { ok: false, error: `Ricarica la pagina: la seconda casella ora indica la licenza ${HOMEBREW_LICENSE}.` };
  return { ok: true, spam: typeof data.sito === "string" && data.sito.trim() !== "", token: typeof data.token === "string" ? data.token : "", value: { draft: checked.draft, nickname, email, licenza: HOMEBREW_LICENSE } };
}
