import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { pool } from "./db";
import type { ContentOverride } from "./content-overrides-apply";

/**
 * Manual corrections made in the admin area. Every change is a new row (nothing is
 * overwritten): undoing sets annullata_il, so the whole history stays in the log.
 */

export const OVERRIDES_TAG = "content-overrides";

let tableReady: Promise<void> | undefined;
/** Additive migration: the table is created by the first correction saved (never by a public page). */
export function ensureOverridesTable() {
  if (!tableReady) tableReady = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_content_overrides (
    id uuid PRIMARY KEY,
    sezione text NOT NULL,
    scheda_id text NOT NULL,
    edizione text NOT NULL CHECK (edizione IN ('2014', '2024')),
    campo text NOT NULL,
    valore_originale text NOT NULL,
    valore_nuovo text NOT NULL,
    motivo text NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now(),
    creata_da text NOT NULL,
    annullata_il timestamptz
  )`).then(() => undefined).catch(error => { tableReady = undefined; throw error; });
  return tableReady;
}

const MISSING_TABLE = "42P01";

async function readActive(): Promise<ContentOverride[]> {
  try {
    const { rows } = await pool.query<ContentOverride>("SELECT * FROM grimorio_content_overrides WHERE annullata_il IS NULL ORDER BY creata_il");
    // Dates as text: the result goes through the data cache.
    return rows.map(row => ({ ...row, creata_il: new Date(row.creata_il).toISOString() }));
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return [];
    throw error;
  }
}

const cachedActive = unstable_cache(readActive, ["content-overrides-active"], { tags: [OVERRIDES_TAG], revalidate: 300 });

/**
 * The corrections in force, for the public pages. If the database cannot be read the pages show
 * the original values (and a warning is logged): a correction never makes a page fail.
 */
export async function activeOverrides(sezione?: string): Promise<ContentOverride[]> {
  try {
    const rows = await cachedActive();
    return sezione ? rows.filter(row => row.sezione === sezione) : rows;
  } catch {
    console.warn("[correzioni] Database non leggibile: mostro i valori originali.");
    return [];
  }
}

/** The whole log for the admin area (not cached). */
export async function allOverrides(): Promise<ContentOverride[]> {
  await ensureOverridesTable();
  const { rows } = await pool.query<ContentOverride>("SELECT * FROM grimorio_content_overrides ORDER BY creata_il DESC, id");
  return rows;
}

export async function countActiveOverrides(): Promise<number> {
  await ensureOverridesTable();
  const { rows } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM grimorio_content_overrides WHERE annullata_il IS NULL");
  return rows[0].n;
}

export interface OverrideChange {
  sezione: string;
  scheda_id: string;
  edizione: string;
  campo: string;
  valore_originale: string;
  /** null: back to the original (the correction in force is undone). */
  valore_nuovo: string | null;
}

/**
 * Saves the changes of one card in one transaction: the correction in force for each field is
 * closed and, unless the field goes back to the original, a new one is recorded with the reason.
 */
export async function saveOverrides(changes: OverrideChange[], motivo: string, creata_da = "admin"): Promise<number> {
  if (!changes.length) return 0;
  await ensureOverridesTable();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const change of changes) {
      await client.query(
        "UPDATE grimorio_content_overrides SET annullata_il = now() WHERE sezione = $1 AND scheda_id = $2 AND edizione = $3 AND campo = $4 AND annullata_il IS NULL",
        [change.sezione, change.scheda_id, change.edizione, change.campo],
      );
      if (change.valore_nuovo !== null) {
        await client.query(
          `INSERT INTO grimorio_content_overrides (id, sezione, scheda_id, edizione, campo, valore_originale, valore_nuovo, motivo, creata_da)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [randomUUID(), change.sezione, change.scheda_id, change.edizione, change.campo, change.valore_originale, change.valore_nuovo, motivo, creata_da],
        );
      }
    }
    await client.query("COMMIT");
    return changes.length;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Undoes one correction (kept in the log as undone). Returns it, or null if unknown or already undone. */
export async function undoOverride(id: string): Promise<ContentOverride | null> {
  if (!UUID.test(id)) return null;
  await ensureOverridesTable();
  const { rows } = await pool.query<ContentOverride>(
    "UPDATE grimorio_content_overrides SET annullata_il = now() WHERE id = $1 AND annullata_il IS NULL RETURNING *",
    [id],
  );
  return rows[0] ?? null;
}
