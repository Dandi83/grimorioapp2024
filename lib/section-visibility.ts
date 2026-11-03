import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";

import { shortLivedFallback } from "./isr-fallback";
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
/**
 * The state of a section never set from /admin/sezioni: «Visibile», except the sections that start «In arrivo»
 * (PROMPT 49: «Talenti»), until the administrator chooses; also while the database cannot be read.
 */
export const DEFAULT_SECTION_STATES: Readonly<Partial<Record<PublicSectionKey, SectionState>>> = { talenti: "in-arrivo" };
const sectionStateOf = (key: string, row: { nascosta: boolean; in_arrivo?: boolean | null } | undefined): SectionState =>
  row ? stateOf(row) : DEFAULT_SECTION_STATES[key as PublicSectionKey] ?? "visibile";
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
    // PROMPT 53: «Nascondi tutto» / «Nascondi tutta la sezione» keep here what they changed, for «Ripristina com'era».
    .then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_section_bulk (
      ambito text PRIMARY KEY,
      salvato jsonb NOT NULL,
      applicato jsonb NOT NULL,
      creata_il timestamptz NOT NULL DEFAULT now()
    )`))
    .then(() => undefined).catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

const MISSING_TABLE = "42P01";

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
  const rows = await hiddenRows<{ sezione: string; nascosta: boolean; in_arrivo: boolean }>(`SELECT sezione, nascosta, ${SOON} FROM grimorio_section_visibility t`);
  // Every saved row, then the sections never set with their default state (DEFAULT_SECTION_STATES).
  const states = PUBLIC_SECTIONS.map(section => ({ sezione: section.key, state: sectionStateOf(section.key, rows.find(row => row.sezione === section.key)) }));
  return states.filter(row => row.state !== "visibile").map(row => ({ sezione: row.sezione, in_arrivo: row.state === "in-arrivo" }))
    .sort((a, b) => a.sezione.localeCompare(b.sezione));
}

/** What the public sees without the database: the default states only. */
function defaultState(): VisibilityState {
  const sections = Object.entries(DEFAULT_SECTION_STATES).filter(([, state]) => state !== "visibile").map(([key]) => key as PublicSectionKey);
  return { sections, parts: [], cards: [], soon: Object.entries(DEFAULT_SECTION_STATES).filter(([, state]) => state === "in-arrivo").map(([key]) => key) };
}

async function readHidden(): Promise<PublicSectionKey[]> {
  return (await readHiddenRows()).map(row => row.sezione);
}

async function readState(): Promise<VisibilityState> {
  const [sections, parts, cards, srdOnly] = await Promise.all([
    readHiddenRows(),
    hiddenRows<{ sezione: string; parte: string; nascosta: boolean; in_arrivo: boolean }>(`SELECT sezione, parte, nascosta, ${SOON} FROM grimorio_section_parts t`),
    hiddenRows<{ tipo: string; scheda: string }>("SELECT tipo, scheda FROM grimorio_card_visibility WHERE nascosta"),
    // «Modalità solo SRD» (PROMPT 39, lib/srd-only.ts): while it is on, its NO SRD cards are hidden cards like the others.
    hiddenRows<{ schede: string[] }>("SELECT schede FROM grimorio_srd_only WHERE attiva"),
  ]);
  // Every row (the parts set back to «Visibile» too), then the parts never set with their default state.
  const saved = parts.map(row => ({ id: `${row.sezione}:${row.parte}`, state: stateOf(row) })).filter(row => isPartId(row.id));
  const defaults = Object.entries(DEFAULT_PART_STATES).filter(([id]) => !saved.some(row => row.id === id)).map(([id, state]) => ({ id, state }));
  const partRows = [...saved, ...defaults].filter(row => row.state !== "visibile").map(row => ({ id: row.id, soon: row.state === "in-arrivo" }));
  return {
    sections: sections.map(row => row.sezione),
    parts: partRows.map(row => row.id).sort(),
    cards: [...new Set([
      ...cards.filter(row => row.tipo === "incantesimo" || row.tipo === "mostro" || row.tipo === "sottoclasse").map(row => cardPath(row.tipo as CardKind, row.scheda)),
      ...srdOnly.flatMap(row => row.schede ?? []),
    ])].sort(),
    soon: [...sections.filter(row => row.in_arrivo).map(row => row.sezione), ...partRows.filter(row => row.soon).map(row => row.id)].sort(),
  };
}

const cachedState = unstable_cache(readState, ["section-visibility-state"], { tags: [SECTIONS_TAG], revalidate: false });

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
    await shortLivedFallback();
    // The sections that start «In arrivo» stay so (PROMPT 49).
    state = defaultState();
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
    ...Object.entries(DEFAULT_SECTION_STATES),
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
    if (sectionStateOf(key, rows[0]) === state) {
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

/**
 * «Nascondi tutto» (scope "tutto") and «Nascondi tutta la sezione» (scope: the section key), PROMPT 53. The keys
 * changed: the section(s) and every part of them ("<section>:<part>"); never the single cards, never «I mostri creati
 * da voi» while lib/community.ts keeps it off (its buttons are locked too).
 */
export const BULK_ALL = "tutto";
export type BulkScope = typeof BULK_ALL | PublicSectionKey;
export type BulkTarget = "nascosta" | "in-arrivo";
export const isBulkScope = (value: unknown): value is BulkScope => value === BULK_ALL || PUBLIC_SECTIONS.some(section => section.key === value);

export function bulkKeys(scope: BulkScope): string[] {
  return PUBLIC_SECTIONS.filter(section => scope === BULK_ALL || section.key === scope)
    .flatMap(section => [section.key, ...section.parts.map(part => `${section.key}:${part.key}`)])
    .filter(key => key !== COMMUNITY_PART || communityPublic());
}

type Client = import("pg").PoolClient;
type StateRow = { nascosta: boolean; in_arrivo: boolean };

/** The state of a section or a part inside a transaction, its row locked. */
async function lockedState(client: Client, key: string): Promise<SectionState> {
  const [sezione, parte] = key.split(":");
  const { rows } = parte === undefined
    ? await client.query<StateRow>("SELECT nascosta, in_arrivo FROM grimorio_section_visibility WHERE sezione = $1 FOR UPDATE", [sezione])
    : await client.query<StateRow>("SELECT nascosta, in_arrivo FROM grimorio_section_parts WHERE sezione = $1 AND parte = $2 FOR UPDATE", [sezione, parte]);
  return parte === undefined ? sectionStateOf(sezione, rows[0]) : partStateOf(key, rows[0]);
}

/** Writes a state and its log row inside a transaction (as setSectionState and setPartState do one at a time). */
async function writeState(client: Client, key: string, state: SectionState): Promise<void> {
  const [sezione, parte] = key.split(":");
  const [nascosta, inArrivo] = [state !== "visibile", state === "in-arrivo"];
  if (parte === undefined) {
    await client.query(`INSERT INTO grimorio_section_visibility (sezione, nascosta, in_arrivo, aggiornata_il) VALUES ($1, $2, $3, now())
      ON CONFLICT (sezione) DO UPDATE SET nascosta = EXCLUDED.nascosta, in_arrivo = EXCLUDED.in_arrivo, aggiornata_il = now()`, [sezione, nascosta, inArrivo]);
    await client.query("INSERT INTO grimorio_section_visibility_log (id, sezione, nascosta, in_arrivo) VALUES ($1, $2, $3, $4)", [randomUUID(), sezione, nascosta, inArrivo]);
  } else {
    await client.query(`INSERT INTO grimorio_section_parts (sezione, parte, nascosta, in_arrivo, aggiornata_il) VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (sezione, parte) DO UPDATE SET nascosta = EXCLUDED.nascosta, in_arrivo = EXCLUDED.in_arrivo, aggiornata_il = now()`, [sezione, parte, nascosta, inArrivo]);
    await client.query("INSERT INTO grimorio_section_parts_log (id, sezione, parte, nascosta, in_arrivo) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), sezione, parte, nascosta, inArrivo]);
  }
}

async function inTransaction<T>(run: (client: Client) => Promise<T>): Promise<T> {
  await ensureSectionTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // One bulk change at a time: the snapshots are read and written under this lock.
    await client.query("LOCK TABLE grimorio_section_bulk IN EXCLUSIVE MODE");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

type Snapshot = { ambito: string; salvato: Record<string, SectionState>; applicato: Record<string, SectionState> };

/**
 * Applies «Nascosta» or «In arrivo» to every key of the scope, all or nothing. Before, the state of each key is kept
 * (grimorio_section_bulk): the state it had, or, if an earlier bulk change still holds it, the state that change kept
 * (each key belongs to one snapshot only, so «Ripristina com'era» always goes back to the state before the first one).
 */
export async function applyBulk(scope: BulkScope, target: BulkTarget): Promise<number> {
  return inTransaction(async client => {
    const keys = bulkKeys(scope);
    const { rows: snapshots } = await client.query<Snapshot>("SELECT ambito, salvato, applicato FROM grimorio_section_bulk");
    const salvato: Record<string, SectionState> = {};
    for (const key of keys) salvato[key] = await lockedState(client, key);
    for (const snapshot of snapshots) {
      const taken = keys.filter(key => key in snapshot.salvato);
      if (!taken.length) continue;
      for (const key of taken) {
        salvato[key] = snapshot.salvato[key];
        delete snapshot.salvato[key];
        delete snapshot.applicato[key];
      }
      if (snapshot.ambito === scope || !Object.keys(snapshot.salvato).length) await client.query("DELETE FROM grimorio_section_bulk WHERE ambito = $1", [snapshot.ambito]);
      else await client.query("UPDATE grimorio_section_bulk SET salvato = $2, applicato = $3 WHERE ambito = $1", [snapshot.ambito, snapshot.salvato, snapshot.applicato]);
    }
    let changed = 0;
    for (const key of keys) {
      if ((await lockedState(client, key)) === target) continue;
      await writeState(client, key, target);
      changed++;
    }
    const applicato = Object.fromEntries(keys.map(key => [key, target]));
    await client.query(`INSERT INTO grimorio_section_bulk (ambito, salvato, applicato, creata_il) VALUES ($1, $2, $3, now())
      ON CONFLICT (ambito) DO UPDATE SET salvato = EXCLUDED.salvato, applicato = EXCLUDED.applicato, creata_il = now()`, [scope, salvato, applicato]);
    return changed;
  });
}

/**
 * «Ripristina com'era»: every key of the snapshot goes back to the state kept, all or nothing, then the snapshot is
 * deleted. A key the administrator changed by hand after the bulk change (its state is no longer the one applied)
 * keeps the hand-made choice.
 */
export async function restoreBulk(scope: BulkScope): Promise<{ restored: number; kept: number } | null> {
  return inTransaction(async client => {
    const { rows } = await client.query<Snapshot>("SELECT ambito, salvato, applicato FROM grimorio_section_bulk WHERE ambito = $1", [scope]);
    const snapshot = rows[0];
    if (!snapshot) return null;
    let restored = 0, kept = 0;
    for (const [key, before] of Object.entries(snapshot.salvato)) {
      // A part or section removed from lib/public-sections.ts since: nothing to put back.
      if (!PUBLIC_SECTIONS.some(section => section.key === key) && !isPartId(key)) continue;
      const now = await lockedState(client, key);
      if (now !== snapshot.applicato[key]) { kept++; continue; }
      if (now !== before) await writeState(client, key, before);
      restored++;
    }
    await client.query("DELETE FROM grimorio_section_bulk WHERE ambito = $1", [scope]);
    return { restored, kept };
  });
}

/** The scopes with a «Ripristina com'era» waiting (admin page only). */
export async function bulkScopes(): Promise<BulkScope[]> {
  await ensureSectionTables();
  return (await pool.query<{ ambito: string }>("SELECT ambito FROM grimorio_section_bulk ORDER BY ambito")).rows.map(row => row.ambito).filter(isBulkScope);
}
