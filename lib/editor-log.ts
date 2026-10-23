import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool } from "./db";
import * as schema from "./db/schema";

/**
 * Log of the spell and creature editors. Their records are database rows changed in place;
 * every saved change is logged field by field (before → after) and can be undone from
 * /admin/registro, only while the field still holds the logged value (no later edit is lost).
 */

export type EditorSection = "incantesimi" | "mostri";

/** Fields of each table that the editors change, with the integer ones. */
export const EDITOR_FIELDS: Record<EditorSection, { columns: readonly string[]; integers: readonly string[]; label: Record<string, string> }> = {
  incantesimi: {
    columns: ["nome_italiano", "livello", "tempo_di_lancio", "gittata", "componenti", "durata", "descrizione"],
    integers: [],
    label: { nome_italiano: "nome", livello: "livello", tempo_di_lancio: "tempo di lancio", gittata: "gittata", componenti: "componenti", durata: "durata", descrizione: "descrizione" },
  },
  mostri: {
    columns: ["nome", "tipo", "taglia", "allineamento", "grado_sfida", "px", "classe_armatura", "punti_ferita", "velocita", "forza", "destrezza", "costituzione", "intelligenza", "saggezza", "carisma",
      "tiri_salvezza", "abilita", "vulnerabilita", "resistenze", "immunita_danni", "immunita_condizioni", "sensi", "linguaggi", "tratti", "azioni", "reazioni", "azioni_leggendarie", "descrizione"],
    integers: ["forza", "destrezza", "costituzione", "intelligenza", "saggezza", "carisma"],
    label: { grado_sfida: "grado di sfida", classe_armatura: "classe armatura", punti_ferita: "punti ferita", velocita: "velocità", tiri_salvezza: "tiri salvezza", abilita: "abilità", vulnerabilita: "vulnerabilità", immunita_danni: "immunità ai danni", immunita_condizioni: "immunità alle condizioni", azioni_leggendarie: "azioni leggendarie", px: "PE" },
  },
};

export interface EditorLogRow {
  id: string; sezione: EditorSection; scheda_id: string; campo: string; valore_prima: string; valore_dopo: string; creata_il: Date | string; annullata_il: Date | string | null;
}

let tableReady: Promise<void> | undefined;
/** Additive migration: created before the first logged save. */
export function ensureEditorLogTable() {
  if (!tableReady) tableReady = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_editor_log (
    id uuid PRIMARY KEY,
    sezione text NOT NULL CHECK (sezione IN ('incantesimi', 'mostri')),
    scheda_id text NOT NULL,
    campo text NOT NULL,
    valore_prima text NOT NULL,
    valore_dopo text NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now(),
    annullata_il timestamptz
  )`).then(() => undefined).catch(error => { tableReady = undefined; throw error; });
  return tableReady;
}

/** The log never blocks a save: if its table cannot be prepared, the editor saves without logging. */
export async function editorLogReady(): Promise<boolean> {
  try {
    await ensureEditorLogTable();
    return true;
  } catch {
    console.warn("[registro] Tabella del registro non disponibile: modifica salvata senza registrazione.");
    return false;
  }
}

const asText = (value: unknown) => (value === null || value === undefined ? "" : String(value));

/** Rows to log: the editor's fields whose value changes. */
export function editorChanges(sezione: EditorSection, before: Record<string, unknown>, after: Record<string, unknown>) {
  return EDITOR_FIELDS[sezione].columns
    .filter(column => column in after && asText(before[column]) !== asText(after[column]))
    .map(column => ({ campo: column, valore_prima: asText(before[column]), valore_dopo: asText(after[column]) }));
}

type Database = NodePgDatabase<typeof schema>;
const tableOf = (sezione: EditorSection) => (sezione === "incantesimi" ? schema.spells : schema.monsters);

/** Inside the editor's transaction, before its update: logs the fields that change. */
export async function logEditorSave(database: Database, sezione: EditorSection, id: string, after: object) {
  const table = tableOf(sezione);
  const [before] = await database.select().from(table).where(eq(table.id, id)).limit(1);
  if (!before) return;
  const changes = editorChanges(sezione, before as Record<string, unknown>, after as Record<string, unknown>);
  if (changes.length) await database.insert(schema.editorLog).values(changes.map(change => ({ id: randomUUID(), sezione, scheda_id: id, ...change })));
}

export async function allEditorLog(): Promise<EditorLogRow[]> {
  await ensureEditorLogTable();
  const { rows } = await pool.query<EditorLogRow>("SELECT * FROM grimorio_editor_log ORDER BY creata_il DESC, id");
  return rows;
}

export type UndoResult = { ok: true; row: EditorLogRow } | { ok: false; error: string };

/**
 * Puts the value before the change back, only if the field still holds the logged value.
 * afterUndo runs in the same transaction (a spell card back to its file values drops its row).
 */
export async function undoEditorChange(database: Database, id: string, afterUndo?: (database: Database, row: EditorLogRow) => Promise<void>): Promise<UndoResult> {
  const [row] = await database.select().from(schema.editorLog).where(eq(schema.editorLog.id, id)).limit(1);
  if (!row || row.annullata_il) return { ok: false, error: "Modifica non trovata o già annullata." };
  const sezione = row.sezione as EditorSection;
  const fields = EDITOR_FIELDS[sezione];
  if (!fields || !fields.columns.includes(row.campo)) return { ok: false, error: "Campo non modificabile." };
  const table = tableOf(sezione);
  const [current] = await database.select().from(table).where(eq(table.id, row.scheda_id)).limit(1);
  if (!current) return { ok: false, error: "La scheda non esiste più." };
  if (asText((current as Record<string, unknown>)[row.campo]) !== row.valore_dopo) {
    return { ok: false, error: "Il campo è stato modificato di nuovo dopo: annulla prima la modifica più recente." };
  }
  const value = fields.integers.includes(row.campo) ? Number.parseInt(row.valore_prima, 10) : row.valore_prima;
  await database.update(table).set({ [row.campo]: value, updated_at: new Date() } as never).where(eq(table.id, row.scheda_id));
  await database.update(schema.editorLog).set({ annullata_il: new Date() }).where(eq(schema.editorLog.id, id));
  if (afterUndo) await afterUndo(database, { ...row, sezione } as EditorLogRow);
  return { ok: true, row: { ...row, sezione } as EditorLogRow };
}
