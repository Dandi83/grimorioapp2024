/**
 * «I miei personaggi» (PROMPT 62, beta): what the page shows of a «Scheda TPK v1» (lib/shared/scheda-tpk-v1.ts, never
 * changed here) and how it is kept in the browser. Pure helpers, used only by app/personaggi: no database, no server.
 */
import type { Caratteristica, SchedaV1 } from "./shared/scheda-tpk-v1";

export const CLASS_NAMES: Readonly<Record<string, string>> = {
  barbaro: "Barbaro", bardo: "Bardo", chierico: "Chierico", druido: "Druido", guerriero: "Guerriero", ladro: "Ladro",
  mago: "Mago", monaco: "Monaco", paladino: "Paladino", ranger: "Ranger", stregone: "Stregone", warlock: "Warlock",
};
export const SPECIES_NAMES: Readonly<Record<string, string>> = {
  dragonide: "Dragonide", elfo: "Elfo", gnomo: "Gnomo", goliath: "Goliath", halfling: "Halfling", nano: "Nano",
  orco: "Orco", tiefling: "Tiefling", umano: "Umano",
};
/** The option of a species as it follows the name: «Elfo (dei boschi)», «Dragonide (d'oro)». */
export const SPECIES_OPTIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  dragonide: { argento: "d'argento", bianco: "bianco", blu: "blu", bronzo: "di bronzo", nero: "nero", oro: "d'oro", ottone: "d'ottone", rame: "di rame", rosso: "rosso", verde: "verde" },
  elfo: { drow: "drow", alto: "alto elfo", boschi: "dei boschi" },
  gnomo: { foreste: "delle foreste", rocce: "delle rocce" },
  goliath: { nuvole: "delle nuvole", fuoco: "del fuoco", gelo: "del gelo", colline: "delle colline", pietra: "della pietra", tempesta: "della tempesta" },
  tiefling: { abissale: "abissale", ctonio: "ctonio", infernale: "infernale" },
};
export const BACKGROUND_NAMES: Readonly<Record<string, string>> = { accolito: "Accolito", criminale: "Criminale", sapiente: "Sapiente", soldato: "Soldato" };
export const SKILL_NAMES: Readonly<Record<string, string>> = {
  acrobazia: "Acrobazia", "addestrare-animali": "Addestrare Animali", arcano: "Arcano", atletica: "Atletica", furtivita: "Furtività",
  indagare: "Indagare", inganno: "Inganno", intimidire: "Intimidire", intrattenere: "Intrattenere", intuizione: "Intuizione",
  medicina: "Medicina", natura: "Natura", percezione: "Percezione", persuasione: "Persuasione", "rapidita-di-mano": "Rapidità di Mano",
  religione: "Religione", sopravvivenza: "Sopravvivenza", storia: "Storia",
};
export const ABILITIES: readonly { key: Caratteristica; short: string }[] = [
  { key: "for", short: "FOR" }, { key: "des", short: "DES" }, { key: "cos", short: "COS" },
  { key: "int", short: "INT" }, { key: "sag", short: "SAG" }, { key: "car", short: "CAR" },
];

/** The names the page needs, read on the server from the Grimorio's own files (app/personaggi/page.tsx). */
export interface CharacterNames {
  /** Public spell id (the /spell/<id> address) → name, 2024 SRD. */
  spells: Record<string, string>;
  /** Feat id (/talenti/<id>) → name. */
  feats: Record<string, string>;
  /** Class id → name of its SRD 5.2.1 subclass. */
  subclasses: Record<string, string>;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const className = (id: string) => CLASS_NAMES[id] ?? capital(id);
export const backgroundName = (id: string) => BACKGROUND_NAMES[id] ?? capital(id);
export const skillName = (id: string) => SKILL_NAMES[id] ?? capital(id.replace(/-/g, " "));
/** «Elfo (dei boschi)», «Umano». */
export function speciesLabel(sheet: Pick<SchedaV1, "sp" | "so">): string {
  const name = SPECIES_NAMES[sheet.sp] ?? capital(sheet.sp);
  const option = sheet.so ? SPECIES_OPTIONS[sheet.sp]?.[sheet.so] ?? sheet.so : "";
  return option ? `${name} (${option})` : name;
}
export function subclassName(sheet: Pick<SchedaV1, "sc">, names: CharacterNames): string | null {
  if (!sheet.sc) return null;
  const [klass, rest] = sheet.sc.split("/");
  return names.subclasses[klass] ?? capital((rest ?? "").replace(/-/g, " "));
}
/** «Druido · Elfo (dei boschi) · 3° livello» (the cards of the list). */
export const cardLine = (sheet: SchedaV1) => `${className(sheet.c)} · ${speciesLabel(sheet)} · ${sheet.l}° livello`;

/**
 * The final scores: base (For Des Cos Int Sag Car) + the background bonus, + the «Aumento dei punteggi di
 * caratteristica» feats when the sheet has them (from the 4th level). A score never goes over 20.
 */
export function finalAbilities(sheet: Pick<SchedaV1, "base" | "bb" | "ft">): Record<Caratteristica, number> {
  const out = {} as Record<Caratteristica, number>;
  ABILITIES.forEach(({ key }, index) => {
    let value = (sheet.base[index] ?? 10) + (sheet.bb[key] ?? 0);
    for (const feat of sheet.ft ?? []) if (feat.id === "aumento-dei-punteggi-di-caratteristica" && typeof feat.p?.[key] === "number") value += feat.p[key] as number;
    out[key] = Math.min(20, value);
  });
  return out;
}
export const modifier = (score: number) => Math.floor((score - 10) / 2);
/** «+3», «+0», «−1» (the minus sign). */
export const signed = (value: number) => (value < 0 ? `−${Math.abs(value)}` : `+${value}`);
/** Metres with the comma: 10.5 → «10,5». */
export const metres = (value: number) => String(Math.round(value * 10) / 10).replace(".", ",");

/** Every spell of the sheet, without repeats: species cantrip, cantrips, prepared, book, feat spells. */
export function sheetSpells(sheet: SchedaV1): string[] {
  const fromFeats = (sheet.ft ?? []).flatMap(feat => [feat.p?.tr, feat.p?.inc].flat()).filter((id): id is string => typeof id === "string");
  return [...new Set([sheet.st, ...sheet.tr, ...sheet.pr, ...(sheet.lb ?? []), ...fromFeats].filter((id): id is string => typeof id === "string" && id.length > 0))];
}

/* ------------------------------------------------------------------ saving in the browser */

export const STORAGE_KEY = "grimorio.characters.v1";
/** A saved character: the sheet as it came (with calc), when it was saved and the local id the Grimorio gives it. */
export interface SavedCharacter { id: string; savedAt: string; sheet: SchedaV1 }
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

const isSaved = (value: unknown): value is SavedCharacter =>
  !!value && typeof value === "object" && typeof (value as SavedCharacter).id === "string" && typeof (value as SavedCharacter).savedAt === "string"
  && !!(value as SavedCharacter).sheet && typeof (value as SavedCharacter).sheet === "object";

/** The saved characters; null when the browser does not let the page read its storage (private window, blocked). */
export function readCharacters(storage: Storage | null): SavedCharacter[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isSaved) : [];
  } catch {
    return null;
  }
}
/** true when written. */
export function writeCharacters(storage: Storage | null, list: SavedCharacter[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
/** A saved character with the same name and class (case and spaces aside), the one «Sostituisci» would replace. */
export function sameCharacter(list: SavedCharacter[], sheet: SchedaV1): SavedCharacter | undefined {
  const key = (s: SchedaV1) => `${s.n.trim().toLocaleLowerCase("it")}|${s.c}`;
  return list.find(item => key(item.sheet) === key(sheet));
}
export function newLocalId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
