import "server-only";
import { cache } from "react";

import { asc, eq } from "drizzle-orm";

import { db } from "./db";
import { getContentEditions } from "./content-editions";
import { spells as spellsTable } from "./db/schema";
import { parseLivello, type Spell } from "./spells-types";
import { applySrdDescription, getSrdSource } from "./srd-descriptions";
import { applyOriginalDescription, getOriginalSource } from "./original-descriptions";
import { previewSpellRows, previewSpellById } from "./srd-additions";
import { getLegacySpellSource, isLegacySpellId, legacySpellById, withLegacySpells } from "./srd-spells-2014";
import { repairCatalogSpell } from "./spell-catalog-repairs";
import { MERGED_SPELL_IDS } from "./monster-id-aliases";
import { spellName } from "./spell-name";
import { repairSpellText } from "./spell-text-repairs";
import type { CardSource } from "./card-display";
import srdSpellIndex from "./data/spell-reference-index.json";
import legacySpellIndex from "./data/spell-reference-index-2014.json";
import originalIds from "./data/original-description-ids.json";

// Re-export pure helpers/types so existing imports from "@/lib/spells"
// keep working. The DB access below is server-only.
export * from "./spells-types";

interface RawRow {
  id: string;
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
}

/** The cards of the project files (SRD 2024 and 2014, original summaries): the others were added in the reserved area. */
const FILE_SPELL_IDS = new Set([...srdSpellIndex.map(spell => spell.id), ...legacySpellIndex.spells.map(spell => spell.id), ...originalIds]);

const ORIGINAL_IDS = new Set<string>(originalIds);

/**
 * The label of a card: its verified source, «Aggiunta da te» for a card made here, none for an SRD card edited.
 * An original summary stays «Sintesi originale» (NO SRD) also once edited: its spell is not in the SRD.
 */
export function spellCardSource(spell: Pick<Spell, "id" | "descrizione"> & Partial<Spell>): CardSource | undefined {
  if (getLegacySpellSource(spell)) return "SRD 5.1";
  if (getSrdSource(spell.id, spell.descrizione)) return "SRD 5.2.1";
  if (getOriginalSource(spell.id, spell.descrizione) || ORIGINAL_IDS.has(spell.id)) return "Sintesi originale";
  return FILE_SPELL_IDS.has(spell.id) || spellFileRow(spell.id) ? undefined : "Aggiunta da te";
}

function toSpell(r: RawRow, repair = true): Spell {
  // The reserved area edits the stored values, so it never sees the display-only repairs.
  r = applyOriginalDescription(applySrdDescription(repair ? repairCatalogSpell(r) : r));
  if (repair) r = { ...r, descrizione: repairSpellText(r.id, r.descrizione) };
  const { livello_num, scuola, classi } = parseLivello(r.livello || "");
  const spell: Spell = {
    edizione: isLegacySpellId(r.id) ? "2014" : getSrdSource(r.id, r.descrizione) || getOriginalSource(r.id, r.descrizione) ? "2024" : undefined,
    id: r.id,
    nome_italiano: r.nome_italiano,
    livello: r.livello || "",
    tempo_di_lancio: r.tempo_di_lancio || "",
    gittata: r.gittata || "",
    componenti: r.componenti || "",
    durata: r.durata || "",
    descrizione: r.descrizione || "",
    livello_num,
    scuola,
    classi,
  };
  const fonte_scheda = spellCardSource(spell);
  return fonte_scheda ? { ...spell, fonte_scheda } : spell;
}

/** A spell card read from the project files (2014 SRD 5.1, SRD 2024 additions) where the site shows them. */
export function spellFileRow(id: string, environment = process.env.VERCEL_ENV): RawRow | undefined {
  return legacySpellById(id, environment) ?? previewSpellById(id, environment);
}

/**
 * The catalog of the reserved area: the same cards as the public list (database rows and the cards of
 * the project files, merged duplicates left out), with the stored values the editor changes, not the
 * display-only repairs. Cards still only in the files are marked: their first real save creates the row.
 */
export async function getAdminSpells(): Promise<Spell[]> {
  const [rows, editions] = await Promise.all([db.select().from(spellsTable).orderBy(asc(spellsTable.sort_key)), getContentEditions("spell")]);
  const stored = new Set(rows.map(row => row.id));
  const environment = process.env.VERCEL_ENV;
  return withLegacySpells(previewSpellRows(rows.filter(row => !(row.id in MERGED_SPELL_IDS)), environment), environment)
    .map(row => {
      const spell = toSpell(row, false);
      const fonte = getLegacySpellSource(spell) ? "SRD 5.1" as const : getSrdSource(spell.id, spell.descrizione) ? "SRD 5.2.1" as const : undefined;
      const origine = fonte ?? (getOriginalSource(spell.id, spell.descrizione) || ORIGINAL_IDS.has(spell.id) ? "Sintesi originale" as const : "Aggiunta da te" as const);
      return {
        ...spell, edizione: editions.get(row.id) ?? spell.edizione, ...(fonte ? { fonte } : {}), origine,
        nome_mostrato: spellName(repairCatalogSpell(row).nome_italiano, editions.get(row.id) ?? spell.edizione),
        ...(stored.has(row.id) ? {} : { da_file: true as const }),
      };
    })
    // The same order in both editions: by the name shown.
    .sort((a, b) => a.nome_mostrato.localeCompare(b.nome_mostrato, "it"));
}

const SPELL_FILE_FIELDS = ["nome_italiano", "livello", "tempo_di_lancio", "gittata", "componenti", "durata", "descrizione"] as const;

/**
 * After an undo: a card of the project files whose row holds again exactly the file values loses that
 * row, so the site reads the file as before the first change (and shows its SRD source again).
 */
export async function dropSpellRowLikeFile(database: Pick<typeof db, "select" | "delete">, id: string): Promise<boolean> {
  const file = spellFileRow(id);
  if (!file) return false;
  const [row] = await database.select().from(spellsTable).where(eq(spellsTable.id, id)).limit(1);
  if (!row || !SPELL_FILE_FIELDS.every(field => (row[field] ?? "") === (file[field] ?? ""))) return false;
  await database.delete(spellsTable).where(eq(spellsTable.id, id));
  return true;
}

export async function getAllSpells(): Promise<Spell[]> {
  const [rows, editions] = await Promise.all([db
    .select()
    .from(spellsTable)
    .orderBy(asc(spellsTable.sort_key)), getContentEditions("spell")]);
  const environment = process.env.VERCEL_ENV;
  return withLegacySpells(previewSpellRows(rows, environment), environment)
    .map(row => {
      const spell = toSpell(row);
      return { ...spell, edizione: editions.get(row.id) ?? spell.edizione };
    });
}

// Deduplicate metadata/page reads without retaining stale administrative edits.
export const getSpellById = cache(async (id: string): Promise<Spell | undefined> => {
  const [rows, editions] = await Promise.all([db
    .select()
    .from(spellsTable)
    .where(eq(spellsTable.id, id))
    .limit(1), getContentEditions("spell", id)]);
  const row = rows[0] ?? previewSpellById(id, process.env.VERCEL_ENV) ?? legacySpellById(id, process.env.VERCEL_ENV);
  if (!row) return undefined;
  const spell = toSpell(row);
  return { ...spell, edizione: editions.get(id) ?? spell.edizione };
});
