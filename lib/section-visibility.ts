import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { pool } from "./db";
import { PUBLIC_SECTIONS, type PublicSectionKey } from "./public-sections";

/**
 * Which public sections are hidden (/admin/sezioni). One row per section that was ever switched;
 * a section without a row is visible. Hiding changes only what the public sees: data, corrections,
 * favorites and logs are never touched. Every switch is also a row of the log, shown in /admin/registro.
 */

export const SECTIONS_TAG = "section-visibility";

export interface SectionLogRow { id: string; sezione: string; nascosta: boolean; creata_il: Date | string }

let tablesReady: Promise<void> | undefined;
/** Additive migration: the tables are created by the first switch (never by a public page). */
export function ensureSectionTables() {
  if (!tablesReady) tablesReady = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_section_visibility (
    sezione text PRIMARY KEY,
    nascosta boolean NOT NULL DEFAULT false,
    aggiornata_il timestamptz NOT NULL DEFAULT now()
  )`).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_section_visibility_log (
    id uuid PRIMARY KEY,
    sezione text NOT NULL,
    nascosta boolean NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now()
  )`)).then(() => undefined).catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

const MISSING_TABLE = "42P01";
const known = new Set<string>(PUBLIC_SECTIONS.map(section => section.key));

async function readHidden(): Promise<PublicSectionKey[]> {
  try {
    const { rows } = await pool.query<{ sezione: string }>("SELECT sezione FROM grimorio_section_visibility WHERE nascosta");
    return rows.map(row => row.sezione).filter((key): key is PublicSectionKey => known.has(key)).sort();
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return [];
    throw error;
  }
}

const cachedHidden = unstable_cache(readHidden, ["section-visibility-hidden"], { tags: [SECTIONS_TAG], revalidate: 300 });

/**
 * The hidden sections, for the public pages. If the database cannot be read every section stays
 * visible (and a warning is logged): a switch never makes the site fail.
 */
export async function hiddenSections(): Promise<PublicSectionKey[]> {
  try {
    return await cachedHidden();
  } catch {
    console.warn("[sezioni] Database non leggibile: tutte le sezioni restano visibili.");
    return [];
  }
}

/** Current state of every section for the admin page (not cached). */
export async function sectionStates(): Promise<Record<PublicSectionKey, boolean>> {
  await ensureSectionTables();
  const hidden = new Set(await readHidden());
  return Object.fromEntries(PUBLIC_SECTIONS.map(section => [section.key, hidden.has(section.key)])) as Record<PublicSectionKey, boolean>;
}

/** Saves the new state and its log row in one transaction; false when the state was already that. */
export async function setSectionHidden(key: PublicSectionKey, nascosta: boolean): Promise<boolean> {
  await ensureSectionTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ nascosta: boolean }>("SELECT nascosta FROM grimorio_section_visibility WHERE sezione = $1 FOR UPDATE", [key]);
    if ((rows[0]?.nascosta ?? false) === nascosta) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(`INSERT INTO grimorio_section_visibility (sezione, nascosta, aggiornata_il) VALUES ($1, $2, now())
      ON CONFLICT (sezione) DO UPDATE SET nascosta = EXCLUDED.nascosta, aggiornata_il = now()`, [key, nascosta]);
    await client.query("INSERT INTO grimorio_section_visibility_log (id, sezione, nascosta) VALUES ($1, $2, $3)", [randomUUID(), key, nascosta]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Every switch, newest first, for /admin/registro and its export. */
export async function allSectionLog(): Promise<SectionLogRow[]> {
  await ensureSectionTables();
  const { rows } = await pool.query<SectionLogRow>("SELECT * FROM grimorio_section_visibility_log ORDER BY creata_il DESC, id");
  return rows;
}
