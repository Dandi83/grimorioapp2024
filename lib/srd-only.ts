import "server-only";
import { randomUUID } from "node:crypto";
import { isNoSrdSource } from "./card-display";
import { pool } from "./db";
import { getAllMonsters } from "./monsters";
import { readSearchEnglish } from "./search-english-server";
import { cardPath } from "./section-visibility";
import { getAllSpells } from "./spells";
import { catalogModified } from "./srd-modified-server";

/**
 * «Modalità solo SRD» (PROMPT 39): an emergency switch of the reserved area. While it is on, the NO SRD spells and
 * creatures (the rule of the NO SRD asterisk: original summaries and cards added here) and the SRD cards modified
 * here, which no longer carry their SRD text, are hidden from every visitor like the cards hidden with the eye: the
 * addresses saved with the switch (grimorio_srd_only.schede) join the hidden cards (lib/section-visibility.ts), so
 * the pages answer «non trovata» and the lists, the search, Preferiti, /api/catalogo and the offline copies leave
 * them out. Nothing is deleted; switching it off gives back exactly what was there (the cards hidden one by one stay
 * hidden). The creatures of the redazione and of the community (homebrew) and the SRD are never touched.
 */

let ready: Promise<void> | undefined;
function ensureTables() {
  ready ??= pool.query(`CREATE TABLE IF NOT EXISTS grimorio_srd_only (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    attiva boolean NOT NULL DEFAULT false,
    dal timestamptz,
    schede text[] NOT NULL DEFAULT '{}'
  )`).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_srd_only_log (
    id uuid PRIMARY KEY,
    attiva boolean NOT NULL,
    quanti integer NOT NULL,
    autore text NOT NULL DEFAULT 'amministratore',
    creata_il timestamptz NOT NULL DEFAULT now()
  )`)).then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}

const MISSING_TABLE = "42P01";
async function rows<T extends object>(sql: string): Promise<T[]> {
  try {
    return (await pool.query<T>(sql)).rows;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return [];
    throw error;
  }
}

export interface SrdOnlyState { attiva: boolean; dal: Date | null; quanti: number }

/** The switch now (off when never used): for the card of /admin and the band of the reserved pages. */
export async function srdOnlyState(): Promise<SrdOnlyState> {
  const [row] = await rows<{ attiva: boolean; dal: Date | null; schede: string[] }>("SELECT attiva, dal, schede FROM grimorio_srd_only WHERE id = 1");
  return row?.attiva ? { attiva: true, dal: row.dal ? new Date(row.dal) : null, quanti: row.schede.length } : { attiva: false, dal: null, quanti: 0 };
}

type Count = { incantesimi: number; mostri: number };
/** What the switch hides, counted: the addresses and how many of each kind. */
export interface SrdOnlyCandidates {
  paths: string[];
  sintesi: Count;
  aggiunte: Count;
  modificate: Count;
  /** English names approved for these cards (PROMPT 37/38): they leave the search with them. */
  nomiInglesi: number;
}

export async function srdOnlyCandidates(): Promise<SrdOnlyCandidates> {
  const [spells, monsters, english] = await Promise.all([getAllSpells(), getAllMonsters(), readSearchEnglish().catch(() => [])]);
  const out: SrdOnlyCandidates = { paths: [], sintesi: { incantesimi: 0, mostri: 0 }, aggiunte: { incantesimi: 0, mostri: 0 }, modificate: { incantesimi: 0, mostri: 0 }, nomiInglesi: 0 };
  const taken = new Set<string>();
  const add = (kind: "incantesimo" | "mostro", id: string, group: Count) => {
    const path = cardPath(kind, id);
    if (taken.has(path)) return;
    taken.add(path);
    out.paths.push(path);
    group[kind === "incantesimo" ? "incantesimi" : "mostri"]++;
  };
  for (const spell of spells) if (isNoSrdSource(spell.fonte_scheda)) add("incantesimo", spell.id, spell.fonte_scheda === "Sintesi originale" ? out.sintesi : out.aggiunte);
  for (const monster of monsters) if (isNoSrdSource(monster.fonte_scheda)) add("mostro", monster.id, monster.fonte_scheda === "Sintesi originale" ? out.sintesi : out.aggiunte);
  for (const card of catalogModified(spells, monsters)) add(card.kind, card.id, out.modificate);
  out.nomiInglesi = english.filter(row => row.state === "approvata" && taken.has(cardPath(row.kind, row.id))).length;
  out.paths.sort();
  return out;
}

/**
 * Switches the mode on (with the cards it hides now) or off, and logs it with how many cards. false when it was
 * already so. While on, a card saved in the reserved area may join or leave the list: refreshSrdOnly.
 */
export async function setSrdOnly(attiva: boolean): Promise<{ changed: boolean; quanti: number }> {
  await ensureTables();
  const paths = attiva ? (await srdOnlyCandidates()).paths : [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: current } = await client.query<{ attiva: boolean; schede: string[] }>("SELECT attiva, schede FROM grimorio_srd_only WHERE id = 1 FOR UPDATE");
    if ((current[0]?.attiva ?? false) === attiva) {
      await client.query("ROLLBACK");
      return { changed: false, quanti: current[0]?.schede.length ?? 0 };
    }
    const quanti = attiva ? paths.length : current[0]?.schede.length ?? 0;
    await client.query(`INSERT INTO grimorio_srd_only (id, attiva, dal, schede) VALUES (1, $1, CASE WHEN $1 THEN now() END, $2)
      ON CONFLICT (id) DO UPDATE SET attiva = EXCLUDED.attiva, dal = EXCLUDED.dal, schede = EXCLUDED.schede`, [attiva, paths]);
    await client.query("INSERT INTO grimorio_srd_only_log (id, attiva, quanti) VALUES ($1, $2, $3)", [randomUUID(), attiva, quanti]);
    await client.query("COMMIT");
    return { changed: true, quanti };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** After a card is saved, created or deleted while the mode is on: the list follows the cards. true when it changed. */
export async function refreshSrdOnly(): Promise<boolean> {
  const [row] = await rows<{ attiva: boolean; schede: string[] }>("SELECT attiva, schede FROM grimorio_srd_only WHERE id = 1");
  if (!row?.attiva) return false;
  const { paths } = await srdOnlyCandidates();
  if (paths.length === row.schede.length && paths.every((path, i) => path === row.schede[i])) return false;
  await pool.query("UPDATE grimorio_srd_only SET schede = $1 WHERE id = 1 AND attiva", [paths]);
  return true;
}

export interface SrdOnlyLogRow { id: string; attiva: boolean; quanti: number; autore: string; creata_il: Date | string }
/** Every switch, newest first, for /admin/registro. */
export async function allSrdOnlyLog(): Promise<SrdOnlyLogRow[]> {
  return rows<SrdOnlyLogRow>("SELECT id, attiva, quanti, autore, creata_il FROM grimorio_srd_only_log ORDER BY creata_il DESC, id");
}

/** The card of /admin: the switch and what it hides now (when on: the cards saved with it, counted again). */
export async function srdOnlyOverview() {
  const [state, candidates, eye] = await Promise.all([
    srdOnlyState(), srdOnlyCandidates(),
    rows<{ tipo: "incantesimo" | "mostro"; scheda: string }>("SELECT tipo, scheda FROM grimorio_card_visibility WHERE nascosta AND tipo IN ('incantesimo', 'mostro')"),
  ]);
  const hiddenOne = new Set(eye.map(row => cardPath(row.tipo, row.scheda)));
  return {
    ...state,
    counts: {
      totale: candidates.paths.length, sintesi: candidates.sintesi, aggiunte: candidates.aggiunte, modificate: candidates.modificate,
      nomiInglesi: candidates.nomiInglesi, giaNascoste: candidates.paths.filter(path => hiddenOne.has(path)).length,
    },
  };
}

