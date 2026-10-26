import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { pool } from "./db";
import { PUBLIC_SECTIONS, isPartId, type PublicSectionKey } from "./public-sections";

/**
 * Which public sections are hidden (/admin/sezioni). One row per section that was ever switched;
 * a section without a row is visible. Hiding changes only what the public sees: data, corrections,
 * favorites and logs are never touched. Every switch is also a row of the log, shown in /admin/registro.
 * Parts of a section (an edition, a tab, a block: lib/public-sections.ts) have their own two tables, and
 * so do single cards (a spell or a creature, also those read from the SRD files: only the state is saved).
 */

export const SECTIONS_TAG = "section-visibility";

interface SectionLogRow { id: string; sezione: string; parte?: string | null; nascosta: boolean; creata_il: Date | string }

export type CardKind = "incantesimo" | "mostro" | "sottoclasse";
interface CardLogRow { id: string; tipo: CardKind; scheda: string; nome: string; edizione: string; nascosta: boolean; autore: string; creata_il: Date | string }

/** Hidden sections, parts ("<section>:<part>") and cards (their addresses: "/spell/<id>", "/mostro/<id>", "/sottoclassi/<id>"). */
interface VisibilityState { sections: PublicSectionKey[]; parts: string[]; cards: string[] }

/** The address of a card, which is also how a hidden card is named in the lists of hidden things. */
// An added subclass has no page of its own (it is shown in the sheet of its class): "/sottoclassi/<id>" only names it.
export const cardPath = (kind: CardKind, id: string) => `${kind === "incantesimo" ? "/spell" : kind === "mostro" ? "/mostro" : "/sottoclassi"}/${id}`;

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
  )`)).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_section_parts (
    sezione text NOT NULL,
    parte text NOT NULL,
    nascosta boolean NOT NULL DEFAULT false,
    aggiornata_il timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (sezione, parte)
  )`)).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_section_parts_log (
    id uuid PRIMARY KEY,
    sezione text NOT NULL,
    parte text NOT NULL,
    nascosta boolean NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now()
  )`)).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_card_visibility (
    tipo text NOT NULL,
    scheda text NOT NULL,
    nascosta boolean NOT NULL DEFAULT false,
    aggiornata_il timestamptz NOT NULL DEFAULT now(),
    autore text NOT NULL DEFAULT 'amministratore',
    PRIMARY KEY (tipo, scheda)
  )`)).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_card_visibility_log (
    id uuid PRIMARY KEY,
    tipo text NOT NULL,
    scheda text NOT NULL,
    nome text NOT NULL,
    edizione text NOT NULL,
    nascosta boolean NOT NULL,
    autore text NOT NULL DEFAULT 'amministratore',
    creata_il timestamptz NOT NULL DEFAULT now()
  )`)).then(() => undefined).catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

const MISSING_TABLE = "42P01";
const known = new Set<string>(PUBLIC_SECTIONS.map(section => section.key));

async function hiddenRows<T>(sql: string): Promise<T[]> {
  try {
    return (await pool.query<T & object>(sql)).rows;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return [];
    throw error;
  }
}

async function readHidden(): Promise<PublicSectionKey[]> {
  const rows = await hiddenRows<{ sezione: string }>("SELECT sezione FROM grimorio_section_visibility WHERE nascosta");
  return rows.map(row => row.sezione).filter((key): key is PublicSectionKey => known.has(key)).sort();
}

async function readState(): Promise<VisibilityState> {
  const [sections, parts, cards] = await Promise.all([
    readHidden(),
    hiddenRows<{ sezione: string; parte: string }>("SELECT sezione, parte FROM grimorio_section_parts WHERE nascosta"),
    hiddenRows<{ tipo: string; scheda: string }>("SELECT tipo, scheda FROM grimorio_card_visibility WHERE nascosta"),
  ]);
  return {
    sections,
    parts: parts.map(row => `${row.sezione}:${row.parte}`).filter(isPartId).sort(),
    cards: cards.filter(row => row.tipo === "incantesimo" || row.tipo === "mostro" || row.tipo === "sottoclasse").map(row => cardPath(row.tipo as CardKind, row.scheda)).sort(),
  };
}

const cachedState = unstable_cache(readState, ["section-visibility-state"], { tags: [SECTIONS_TAG], revalidate: 300 });

/**
 * Hidden sections and parts, for the public pages. If the database cannot be read everything stays
 * visible (and a warning is logged): a switch never makes the site fail.
 */
export async function visibilityState(): Promise<VisibilityState> {
  try {
    return await cachedState();
  } catch {
    console.warn("[sezioni] Database non leggibile: tutte le sezioni restano visibili.");
    return { sections: [], parts: [], cards: [] };
  }
}

/** The hidden sections only (the 404 page and the search index use the effective list, see section-view). */
export async function hiddenSections(): Promise<PublicSectionKey[]> {
  return (await visibilityState()).sections;
}

/** Current state of every section for the admin page (not cached). */
export async function sectionStates(): Promise<Record<PublicSectionKey, boolean>> {
  await ensureSectionTables();
  const hidden = new Set(await readHidden());
  return Object.fromEntries(PUBLIC_SECTIONS.map(section => [section.key, hidden.has(section.key)])) as Record<PublicSectionKey, boolean>;
}

/** Hidden parts for the admin page (not cached). */
export async function hiddenPartIds(): Promise<string[]> {
  await ensureSectionTables();
  return (await readState()).parts;
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

/** Saves the new state of one part and its log row; false when the state was already that. */
export async function setPartHidden(sezione: PublicSectionKey, parte: string, nascosta: boolean): Promise<boolean> {
  await ensureSectionTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ nascosta: boolean }>("SELECT nascosta FROM grimorio_section_parts WHERE sezione = $1 AND parte = $2 FOR UPDATE", [sezione, parte]);
    if ((rows[0]?.nascosta ?? false) === nascosta) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(`INSERT INTO grimorio_section_parts (sezione, parte, nascosta, aggiornata_il) VALUES ($1, $2, $3, now())
      ON CONFLICT (sezione, parte) DO UPDATE SET nascosta = EXCLUDED.nascosta, aggiornata_il = now()`, [sezione, parte, nascosta]);
    await client.query("INSERT INTO grimorio_section_parts_log (id, sezione, parte, nascosta) VALUES ($1, $2, $3, $4)", [randomUUID(), sezione, parte, nascosta]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Hidden cards for the admin lists (not cached), as addresses. Only reads: the tables come with the first switch. */
export async function hiddenCardPaths(): Promise<string[]> {
  return (await readState()).cards;
}

/**
 * Saves the new state of one card and its log row (with the name and edition it has now, for the log);
 * false when the state was already that.
 */
export async function setCardHidden(card: { tipo: CardKind; scheda: string; nome: string; edizione: string }, nascosta: boolean): Promise<boolean> {
  await ensureSectionTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ nascosta: boolean }>("SELECT nascosta FROM grimorio_card_visibility WHERE tipo = $1 AND scheda = $2 FOR UPDATE", [card.tipo, card.scheda]);
    if ((rows[0]?.nascosta ?? false) === nascosta) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(`INSERT INTO grimorio_card_visibility (tipo, scheda, nascosta, aggiornata_il, autore) VALUES ($1, $2, $3, now(), 'amministratore')
      ON CONFLICT (tipo, scheda) DO UPDATE SET nascosta = EXCLUDED.nascosta, aggiornata_il = now(), autore = EXCLUDED.autore`, [card.tipo, card.scheda, nascosta]);
    await client.query("INSERT INTO grimorio_card_visibility_log (id, tipo, scheda, nome, edizione, nascosta) VALUES ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), card.tipo, card.scheda, card.nome, card.edizione, nascosta]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Every card shown or hidden, newest first, for /admin/registro. */
export async function allCardLog(): Promise<CardLogRow[]> {
  await ensureSectionTables();
  return (await pool.query<CardLogRow>("SELECT id, tipo, scheda, nome, edizione, nascosta, autore, creata_il FROM grimorio_card_visibility_log ORDER BY creata_il DESC, id")).rows;
}

/** Every switch of sections and parts, newest first, for /admin/registro and its export. */
export async function allSectionLog(): Promise<SectionLogRow[]> {
  await ensureSectionTables();
  const { rows } = await pool.query<SectionLogRow>(`SELECT id, sezione, NULL AS parte, nascosta, creata_il FROM grimorio_section_visibility_log
    UNION ALL SELECT id, sezione, parte, nascosta, creata_il FROM grimorio_section_parts_log ORDER BY creata_il DESC, id`);
  return rows;
}
