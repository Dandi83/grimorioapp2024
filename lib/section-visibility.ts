import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { pool } from "./db";
import { PUBLIC_SECTIONS, isPartId, type PublicSectionKey } from "./public-sections";
import { publicSpellId } from "./spell-public-id";
import { communityPublic } from "./community";

/**
 * Which public sections are hidden (/admin/sezioni). One row per section that was ever switched;
 * a section without a row is visible. Hiding changes only what the public sees: data, corrections,
 * favorites and logs are never touched. Every switch is also a row of the log, shown in /admin/registro.
 * Parts of a section (an edition, a tab, a block: lib/public-sections.ts) have their own two tables, and
 * so do single cards (a spell or a creature, also those read from the SRD files: only the state is saved).
 */

export const SECTIONS_TAG = "section-visibility";

interface SectionLogRow { id: string; sezione: string; parte?: string | null; nascosta: boolean; in_arrivo: boolean; creata_il: Date | string }

/**
 * The three states of a section or a part (/admin/sezioni). «In arrivo» is stored as hidden (nascosta) with the
 * in_arrivo flag: every rule that keeps hidden content away from the public applies to it as it is; only the
 * entries (menus, tiles, bar, Home) stay, attenuated, and lead to the «in costruzione» page.
 */
export type SectionState = "visibile" | "in-arrivo" | "nascosta";
export const SECTION_STATES: readonly SectionState[] = ["visibile", "in-arrivo", "nascosta"];
export const isSectionState = (value: unknown): value is SectionState => SECTION_STATES.includes(value as SectionState);
const stateOf = (row: { nascosta: boolean; in_arrivo?: boolean | null } | undefined): SectionState =>
  !row?.nascosta ? "visibile" : row.in_arrivo ? "in-arrivo" : "nascosta";
/**
 * The state of a part never set from /admin/sezioni: «Visibile», except the parts that start «In arrivo» (PROMPT 25:
 * «Mostri del Grimorio»), until the administrator chooses.
 */
export const DEFAULT_PART_STATES: Readonly<Record<string, SectionState>> = { "bestiario:grimorio": "in-arrivo" };
const partStateOf = (id: string, row: { nascosta: boolean; in_arrivo?: boolean | null } | undefined): SectionState =>
  row ? stateOf(row) : DEFAULT_PART_STATES[id] ?? "visibile";

export type CardKind = "incantesimo" | "mostro" | "sottoclasse";
interface CardLogRow { id: string; tipo: CardKind; scheda: string; nome: string; edizione: string; nascosta: boolean; autore: string; creata_il: Date | string }

/**
 * Hidden sections, parts ("<section>:<part>") and cards (their addresses: "/spell/<id>", "/mostro/<id>", "/sottoclassi/<id>");
 * soon: the sections and parts among them that are «In arrivo».
 */
export interface VisibilityState { sections: PublicSectionKey[]; parts: string[]; cards: string[]; soon: string[] }

/** The address of a card, which is also how a hidden card is named in the lists of hidden things. */
// An added subclass has no page of its own (it is shown in the sheet of its class): "/sottoclassi/<id>" only names it.
// A spell is named by its public address (lib/spell-public-id.ts): the stored id is the same on both sides of every check.
export const cardPath = (kind: CardKind, id: string) => `${kind === "incantesimo" ? "/spell" : kind === "mostro" ? "/mostro" : "/sottoclassi"}/${kind === "incantesimo" ? publicSpellId(id) : id}`;

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
  )`)).then(() => pool.query(`ALTER TABLE grimorio_section_visibility ADD COLUMN IF NOT EXISTS in_arrivo boolean NOT NULL DEFAULT false`))
    // «In arrivo» (third state): the rows saved before keep their meaning, Visibile or Nascosta (false by default).
    .then(() => pool.query(`ALTER TABLE grimorio_section_visibility_log ADD COLUMN IF NOT EXISTS in_arrivo boolean NOT NULL DEFAULT false`))
    .then(() => pool.query(`ALTER TABLE grimorio_section_parts ADD COLUMN IF NOT EXISTS in_arrivo boolean NOT NULL DEFAULT false`))
    .then(() => pool.query(`ALTER TABLE grimorio_section_parts_log ADD COLUMN IF NOT EXISTS in_arrivo boolean NOT NULL DEFAULT false`))
    .then(() => undefined).catch(error => { tablesReady = undefined; throw error; });
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

// The in_arrivo column comes with the first switch of this version: read through to_jsonb, a table without it
// still answers (every hidden row then reads as «Nascosta», as before).
const SOON = "COALESCE((to_jsonb(t)->>'in_arrivo')::boolean, false) AS in_arrivo";

async function readHiddenRows(): Promise<{ sezione: PublicSectionKey; in_arrivo: boolean }[]> {
  const rows = await hiddenRows<{ sezione: string; in_arrivo: boolean }>(`SELECT sezione, ${SOON} FROM grimorio_section_visibility t WHERE nascosta`);
  return rows.filter((row): row is { sezione: PublicSectionKey; in_arrivo: boolean } => known.has(row.sezione)).sort((a, b) => a.sezione.localeCompare(b.sezione));
}

async function readHidden(): Promise<PublicSectionKey[]> {
  return (await readHiddenRows()).map(row => row.sezione);
}

async function readState(): Promise<VisibilityState> {
  const [sections, parts, cards] = await Promise.all([
    readHiddenRows(),
    hiddenRows<{ sezione: string; parte: string; nascosta: boolean; in_arrivo: boolean }>(`SELECT sezione, parte, nascosta, ${SOON} FROM grimorio_section_parts t`),
    hiddenRows<{ tipo: string; scheda: string }>("SELECT tipo, scheda FROM grimorio_card_visibility WHERE nascosta"),
  ]);
  // Every row (the parts set back to «Visibile» too), then the parts never set with their default state.
  const saved = parts.map(row => ({ id: `${row.sezione}:${row.parte}`, state: stateOf(row) })).filter(row => isPartId(row.id));
  const defaults = Object.entries(DEFAULT_PART_STATES).filter(([id]) => !saved.some(row => row.id === id)).map(([id, state]) => ({ id, state }));
  const partRows = [...saved, ...defaults].filter(row => row.state !== "visibile").map(row => ({ id: row.id, soon: row.state === "in-arrivo" }));
  return {
    sections: sections.map(row => row.sezione),
    parts: partRows.map(row => row.id).sort(),
    cards: cards.filter(row => row.tipo === "incantesimo" || row.tipo === "mostro" || row.tipo === "sottoclasse").map(row => cardPath(row.tipo as CardKind, row.scheda)).sort(),
    soon: [...sections.filter(row => row.in_arrivo).map(row => row.sezione), ...partRows.filter(row => row.soon).map(row => row.id)].sort(),
  };
}

const cachedState = unstable_cache(readState, ["section-visibility-state"], { tags: [SECTIONS_TAG], revalidate: 300 });

/**
 * Hidden sections and parts, for the public pages. If the database cannot be read everything stays
 * visible (and a warning is logged): a switch never makes the site fail.
 */
export async function visibilityState(): Promise<VisibilityState> {
  let state: VisibilityState;
  try {
    state = await cachedState();
  } catch {
    console.warn("[sezioni] Database non leggibile: tutte le sezioni restano visibili.");
    state = { sections: [], parts: [], cards: [], soon: [] };
  }
  return withCommunitySwitch(state);
}

/** «I mostri creati da voi» while lib/community.ts is off: the part «bestiario:homebrew» hidden, whatever its switch says. */
export const COMMUNITY_PART = "bestiario:homebrew";
export function withCommunitySwitch(state: VisibilityState, open: boolean = communityPublic()): VisibilityState {
  if (open) return state;
  // Hidden outright, never «In arrivo»: the visitors get no entry to it either.
  return { ...state, parts: [...new Set([...state.parts, COMMUNITY_PART])].sort(), soon: state.soon.filter(id => id !== COMMUNITY_PART) };
}

/** The hidden sections only (the 404 page and the search index use the effective list, see section-view). */
export async function hiddenSections(): Promise<PublicSectionKey[]> {
  return (await visibilityState()).sections;
}

/** Current state of every section for the admin page (not cached): true when the public does not see it (also «In arrivo»). */
export async function sectionStates(): Promise<Record<PublicSectionKey, boolean>> {
  await ensureSectionTables();
  const hidden = new Set(await readHidden());
  return Object.fromEntries(PUBLIC_SECTIONS.map(section => [section.key, hidden.has(section.key)])) as Record<PublicSectionKey, boolean>;
}

/** Hidden parts for the admin page (not cached), «In arrivo» ones included. */
export async function hiddenPartIds(): Promise<string[]> {
  await ensureSectionTables();
  return (await readState()).parts;
}

/** The three states of every section and part, for /admin/sezioni (not cached): section keys and part ids. */
export async function allSectionStates(): Promise<Record<string, SectionState>> {
  await ensureSectionTables();
  const [sections, parts] = await Promise.all([
    pool.query<{ sezione: string; nascosta: boolean; in_arrivo: boolean }>("SELECT sezione, nascosta, in_arrivo FROM grimorio_section_visibility"),
    pool.query<{ sezione: string; parte: string; nascosta: boolean; in_arrivo: boolean }>("SELECT sezione, parte, nascosta, in_arrivo FROM grimorio_section_parts"),
  ]);
  return Object.fromEntries([
    ...sections.rows.map(row => [row.sezione, stateOf(row)] as const),
    ...Object.entries(DEFAULT_PART_STATES),
    ...parts.rows.map(row => [`${row.sezione}:${row.parte}`, stateOf(row)] as const),
  ]);
}

/** Saves the new state and its log row in one transaction; false when the state was already that. */
export async function setSectionState(key: PublicSectionKey, state: SectionState): Promise<boolean> {
  await ensureSectionTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ nascosta: boolean; in_arrivo: boolean }>("SELECT nascosta, in_arrivo FROM grimorio_section_visibility WHERE sezione = $1 FOR UPDATE", [key]);
    if (stateOf(rows[0]) === state) {
      await client.query("ROLLBACK");
      return false;
    }
    const [nascosta, inArrivo] = [state !== "visibile", state === "in-arrivo"];
    await client.query(`INSERT INTO grimorio_section_visibility (sezione, nascosta, in_arrivo, aggiornata_il) VALUES ($1, $2, $3, now())
      ON CONFLICT (sezione) DO UPDATE SET nascosta = EXCLUDED.nascosta, in_arrivo = EXCLUDED.in_arrivo, aggiornata_il = now()`, [key, nascosta, inArrivo]);
    await client.query("INSERT INTO grimorio_section_visibility_log (id, sezione, nascosta, in_arrivo) VALUES ($1, $2, $3, $4)", [randomUUID(), key, nascosta, inArrivo]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Shown or hidden (the «Mostra» links): the two states of before. */
export function setSectionHidden(key: PublicSectionKey, nascosta: boolean): Promise<boolean> {
  return setSectionState(key, nascosta ? "nascosta" : "visibile");
}

/** Saves the new state of one part and its log row; false when the state was already that. */
export async function setPartState(sezione: PublicSectionKey, parte: string, state: SectionState): Promise<boolean> {
  await ensureSectionTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ nascosta: boolean; in_arrivo: boolean }>("SELECT nascosta, in_arrivo FROM grimorio_section_parts WHERE sezione = $1 AND parte = $2 FOR UPDATE", [sezione, parte]);
    if (partStateOf(`${sezione}:${parte}`, rows[0]) === state) {
      await client.query("ROLLBACK");
      return false;
    }
    const [nascosta, inArrivo] = [state !== "visibile", state === "in-arrivo"];
    await client.query(`INSERT INTO grimorio_section_parts (sezione, parte, nascosta, in_arrivo, aggiornata_il) VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (sezione, parte) DO UPDATE SET nascosta = EXCLUDED.nascosta, in_arrivo = EXCLUDED.in_arrivo, aggiornata_il = now()`, [sezione, parte, nascosta, inArrivo]);
    await client.query("INSERT INTO grimorio_section_parts_log (id, sezione, parte, nascosta, in_arrivo) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), sezione, parte, nascosta, inArrivo]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Shown or hidden (the «Mostra» links): the two states of before. */
export function setPartHidden(sezione: PublicSectionKey, parte: string, nascosta: boolean): Promise<boolean> {
  return setPartState(sezione, parte, nascosta ? "nascosta" : "visibile");
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
  const { rows } = await pool.query<SectionLogRow>(`SELECT id, sezione, NULL AS parte, nascosta, in_arrivo, creata_il FROM grimorio_section_visibility_log
    UNION ALL SELECT id, sezione, parte, nascosta, in_arrivo, creata_il FROM grimorio_section_parts_log ORDER BY creata_il DESC, id`);
  return rows;
}
