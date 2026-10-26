import "server-only";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { subclassBaseId, isSubclassId, type SubclassDraft } from "./subclass-types";
import type { ClassEdition, ClassId } from "./classes-types";

/**
 * Subclasses added by the administrator (official ones not in the SRD, texts in their own words). Two tables of
 * their own, created at the first save: nothing changes in the class files or in the tables of the catalog.
 * - grimorio_subclasses: the draft in JSON, its class and edition. Born hidden (the eye of single cards, kind
 *   «sottoclasse»): the public sees it only once the administrator shows it.
 * - grimorio_subclass_log: created, corrected, deleted (shown in /admin/registro with the eye switches).
 */

interface SubclassRow { id: string; classe: ClassId; edizione: ClassEdition; scheda: SubclassDraft; creata_il: Date | string; aggiornata_il: Date | string }
interface SubclassLogRow { id: string; sottoclasse_id: string; nome: string; classe: string; edizione: string; azione: string; creata_il: Date | string }

let tablesReady: Promise<void> | undefined;
export function ensureSubclassTables() {
  if (!tablesReady) tablesReady = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_subclasses (
      id text PRIMARY KEY,
      classe text NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024')),
      scheda jsonb NOT NULL,
      creata_il timestamptz NOT NULL DEFAULT now(),
      aggiornata_il timestamptz NOT NULL DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_subclass_log (
      id uuid PRIMARY KEY,
      sottoclasse_id text NOT NULL,
      nome text NOT NULL,
      classe text NOT NULL,
      edizione text NOT NULL,
      azione text NOT NULL,
      creata_il timestamptz NOT NULL DEFAULT now()
    )`);
  })().catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

const MISSING_TABLE = "42P01";
/** Public reads: before the first subclass the tables do not exist, and the classes simply have none added. */
async function read<T extends object>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await pool.query<T>(sql, params)).rows;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return [];
    throw error;
  }
}

/** The subclasses added to a class, or to every class; oldest first (the order of the selector, after the SRD one). */
export async function listSubclasses(classe?: ClassId): Promise<SubclassRow[]> {
  return classe
    ? read<SubclassRow>("SELECT * FROM grimorio_subclasses WHERE classe = $1 ORDER BY creata_il, id", [classe])
    : read<SubclassRow>("SELECT * FROM grimorio_subclasses ORDER BY creata_il, id");
}

export async function getSubclass(id: string): Promise<SubclassRow | undefined> {
  if (!isSubclassId(id)) return undefined;
  return (await read<SubclassRow>("SELECT * FROM grimorio_subclasses WHERE id = $1", [id]))[0];
}

async function log(row: { id: string; nome: string; classe: string; edizione: string }, azione: string) {
  await pool.query("INSERT INTO grimorio_subclass_log (id, sottoclasse_id, nome, classe, edizione, azione) VALUES ($1, $2, $3, $4, $5, $6)",
    [randomUUID(), row.id, row.nome, row.classe, row.edizione, azione]);
}

/** A new subclass: a free address from its class and name; logged «creata». */
export async function createSubclass(draft: SubclassDraft): Promise<string> {
  await ensureSubclassTables();
  const base = subclassBaseId(draft.classe, draft.nome);
  const taken = new Set((await pool.query<{ id: string }>("SELECT id FROM grimorio_subclasses WHERE id = $1 OR id LIKE $2", [base, `${base}-%`])).rows.map(row => row.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  await pool.query("INSERT INTO grimorio_subclasses (id, classe, edizione, scheda) VALUES ($1, $2, $3, $4)", [id, draft.classe, draft.edizione, JSON.stringify(draft)]);
  await log({ id, nome: draft.nome, classe: draft.classe, edizione: draft.edizione }, "creata");
  return id;
}

/** Corrections: the address, the class and the edition stay the same. */
export async function updateSubclass(id: string, draft: SubclassDraft): Promise<boolean> {
  await ensureSubclassTables();
  const current = await getSubclass(id);
  if (!current) return false;
  const scheda = { ...draft, classe: current.classe, edizione: current.edizione };
  await pool.query("UPDATE grimorio_subclasses SET scheda = $2, aggiornata_il = now() WHERE id = $1", [id, JSON.stringify(scheda)]);
  await log({ id, nome: scheda.nome, classe: current.classe, edizione: current.edizione }, "corretta");
  return true;
}

export async function deleteSubclass(id: string): Promise<SubclassRow | undefined> {
  if (!isSubclassId(id)) return undefined;
  await ensureSubclassTables();
  const { rows } = await pool.query<SubclassRow>("DELETE FROM grimorio_subclasses WHERE id = $1 RETURNING *", [id]);
  if (!rows[0]) return undefined;
  await log({ id, nome: rows[0].scheda.nome, classe: rows[0].classe, edizione: rows[0].edizione }, "eliminata");
  return rows[0];
}

export async function allSubclassLog(): Promise<SubclassLogRow[]> {
  return read<SubclassLogRow>("SELECT * FROM grimorio_subclass_log ORDER BY creata_il DESC, id");
}
