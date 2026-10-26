// Subclasses written by the administrator (official ones not in the SRD, in their own words): the shape of
// the draft, the server check and the empty draft of a class. Pure, safe in client code and tests: the texts
// are plain, the page adds layout and links through the display chain of every card (lib/card-display.ts).

import { CLASS_IDS, type ClassEdition, type ClassId } from "./classes-types";
import { plainText } from "./homebrew-types";

export interface SubclassEntry { nome: string; testo: string }
export interface SubclassFeature { livello: number; nome: string; testo: string; voci: SubclassEntry[] }
export interface SubclassDraft { classe: ClassId; edizione: ClassEdition; nome: string; descrizione: string; privilegi: SubclassFeature[] }

export const SUBCLASS_LIMITS = { nome: 80, descrizione: 4000, featureName: 80, featureText: 6000, entryName: 80, entryText: 3000, features: 20, entries: 15 } as const;

/** The address of an added subclass: its class and its name ("guerriero--guerriero-psionico"), unique. */
export function subclassBaseId(classe: ClassId, nome: string): string {
  const slug = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "sottoclasse";
  return `${classe}--${slug}`;
}
export const isSubclassId = (id: unknown): id is string => typeof id === "string" && /^[a-z]+--[a-z0-9-]{1,70}$/.test(id) && (CLASS_IDS as readonly string[]).includes(id.split("--")[0]);
export const subclassClass = (id: string) => id.split("--")[0] as ClassId;

/**
 * A new subclass of a class: one feature at each level of the SRD subclasses of that class and edition
 * (lib/data «livelliSottoclasse»), name and text empty. The app writes no name and no text.
 */
export function emptySubclass(classe: ClassId, edizione: ClassEdition, levels: readonly number[]): SubclassDraft {
  return { classe, edizione, nome: "", descrizione: "", privilegi: levels.map(livello => ({ livello, nome: "", testo: "", voci: [] })) };
}

type SubclassCheck = { ok: true; draft: SubclassDraft } | { ok: false; error: string };

/** The server check of a draft: class, edition, lengths, plain text, levels 1–20. The first problem found is returned. */
export function parseSubclassDraft(input: unknown): SubclassCheck {
  if (!input || typeof input !== "object") return { ok: false, error: "Sottoclasse non valida." };
  const data = input as Record<string, unknown>;
  const fail = (error: string): SubclassCheck => ({ ok: false, error });
  if (typeof data.classe !== "string" || !(CLASS_IDS as readonly string[]).includes(data.classe)) return fail("Classe sconosciuta.");
  if (data.edizione !== "2024" && data.edizione !== "2014") return fail("Edizione sconosciuta.");
  const nome = plainText(data.nome, SUBCLASS_LIMITS.nome);
  if (!nome) return fail("Scrivi il nome della sottoclasse (testo semplice, al massimo 80 caratteri).");
  const descrizione = plainText(data.descrizione ?? "", SUBCLASS_LIMITS.descrizione, true);
  if (descrizione === null) return fail("Testo introduttivo troppo lungo o con caratteri non ammessi (< e >).");
  if (!Array.isArray(data.privilegi) || data.privilegi.length > SUBCLASS_LIMITS.features) return fail(`Al massimo ${SUBCLASS_LIMITS.features} privilegi.`);
  const privilegi: SubclassFeature[] = [];
  for (const [index, raw] of data.privilegi.entries()) {
    const feature = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const where = `Privilegio ${index + 1}`;
    const livello = typeof feature.livello === "number" ? feature.livello : Number(feature.livello);
    if (!Number.isInteger(livello) || livello < 1 || livello > 20) return fail(`${where}: il livello va da 1 a 20.`);
    const featureName = plainText(feature.nome ?? "", SUBCLASS_LIMITS.featureName);
    const testo = plainText(feature.testo ?? "", SUBCLASS_LIMITS.featureText, true);
    if (featureName === null || testo === null) return fail(`${where}: testo troppo lungo o con caratteri non ammessi (< e >).`);
    if (!Array.isArray(feature.voci ?? []) || ((feature.voci as unknown[]) ?? []).length > SUBCLASS_LIMITS.entries) return fail(`${where}: al massimo ${SUBCLASS_LIMITS.entries} voci.`);
    const voci: SubclassEntry[] = [];
    for (const [j, rawEntry] of ((feature.voci as unknown[]) ?? []).entries()) {
      const entry = (rawEntry && typeof rawEntry === "object" ? rawEntry : {}) as Record<string, unknown>;
      const entryName = plainText(entry.nome ?? "", SUBCLASS_LIMITS.entryName);
      const entryText = plainText(entry.testo ?? "", SUBCLASS_LIMITS.entryText, true);
      if (entryName === null || entryText === null) return fail(`${where}, voce ${j + 1}: testo troppo lungo o con caratteri non ammessi (< e >).`);
      if (entryName || entryText) voci.push({ nome: entryName, testo: entryText });
    }
    privilegi.push({ livello, nome: featureName, testo, voci });
  }
  return { ok: true, draft: { classe: data.classe as ClassId, edizione: data.edizione, nome, descrizione, privilegi } };
}

/** Paragraphs of a plain text (blank lines between them). */
export const paragraphs = (text: string) => text.split(/\n\s*\n/).map(part => part.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
