import "server-only";
import { pool } from "./db";
import { tableVoteKey } from "./analytics";
import { TABLE_VOTES, type TableVote } from "./analytics-events";

/**
 * «L'hai provato al tavolo?» (PROMPT 19): how a creature of «I mostri creati da voi» went at the table against its CR.
 * One vote per device and card, changeable: the key is a keyed hash of the visitor ID (lib/analytics.ts), never the ID.
 * Test visits are kept apart and never counted; the administrator's devices never vote (the route refuses them and
 * their votes go when a device is excluded). The votes stay while the card exists (deleteTableVotes with the card).
 */
export const TABLE_THRESHOLD = 5;
export type TableCounts = Record<TableVote, number> & { total: number };

let ready: Promise<void> | undefined;
function ensureTable() {
  if (!ready) ready = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_table_votes (
    scheda_id text NOT NULL,
    chiave text NOT NULL,
    voto text NOT NULL CHECK (voto IN ('facile', 'giusto', 'difficile')),
    is_test boolean NOT NULL DEFAULT false,
    creato_il timestamptz NOT NULL DEFAULT now(),
    aggiornato_il timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (scheda_id, chiave)
  )`).then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}

const MISSING_TABLE = "42P01";
const empty = (): TableCounts => ({ facile: 0, giusto: 0, difficile: 0, total: 0 });

/** The vote of a device on a card: a new one, or the change of the one it gave. Never from an excluded device. */
export async function storeTableVote(visitor: string, card: string, vote: TableVote, test: boolean): Promise<boolean> {
  await ensureTable();
  const result = await pool.query(
    `INSERT INTO grimorio_table_votes (scheda_id, chiave, voto, is_test)
     SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM grimorio_analytics_excluded WHERE visitor_id = $5)
     ON CONFLICT (scheda_id, chiave) DO UPDATE SET voto = EXCLUDED.voto, is_test = EXCLUDED.is_test, aggiornato_il = now()
     RETURNING scheda_id`,
    [card, tableVoteKey(visitor), vote, test, visitor]).catch(async error => {
    // Before the first event the table of the excluded devices may not exist: nobody is excluded yet.
    if ((error as { code?: string }).code !== MISSING_TABLE) throw error;
    return pool.query(
      `INSERT INTO grimorio_table_votes (scheda_id, chiave, voto, is_test) VALUES ($1, $2, $3, $4)
       ON CONFLICT (scheda_id, chiave) DO UPDATE SET voto = EXCLUDED.voto, is_test = EXCLUDED.is_test, aggiornato_il = now() RETURNING scheda_id`,
      [card, tableVoteKey(visitor), vote, test]);
  });
  return result.rows.length > 0;
}

function counts(rows: { scheda_id: string; voto: TableVote; n: number }[]): Map<string, TableCounts> {
  const result = new Map<string, TableCounts>();
  for (const row of rows) {
    const card = result.get(row.scheda_id) ?? empty();
    card[row.voto] += row.n;
    card.total += row.n;
    result.set(row.scheda_id, card);
  }
  return result;
}

/** The votes of every card (the administrator: /admin/statistiche and /admin/bilanciamento), test visits left out. */
export async function readAllTableCounts(): Promise<Map<string, TableCounts>> {
  try {
    const { rows } = await pool.query<{ scheda_id: string; voto: TableVote; n: number }>(
      "SELECT scheda_id, voto, count(*)::int AS n FROM grimorio_table_votes WHERE is_test = false GROUP BY scheda_id, voto");
    return counts(rows.filter(row => TABLE_VOTES.includes(row.voto)));
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return new Map();
    throw error;
  }
}

/** The votes of one card for its page: shown only from 5 votes on (null before). */
export async function readPublicTableCounts(card: string): Promise<TableCounts | null> {
  try {
    const { rows } = await pool.query<{ scheda_id: string; voto: TableVote; n: number }>(
      "SELECT scheda_id, voto, count(*)::int AS n FROM grimorio_table_votes WHERE scheda_id = $1 AND is_test = false GROUP BY scheda_id, voto", [card]);
    const result = counts(rows).get(card) ?? empty();
    return result.total >= TABLE_THRESHOLD ? result : null;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return null;
    throw error;
  }
}

/** The card is gone: its votes too. */
export async function deleteTableVotes(card: string): Promise<void> {
  await pool.query("DELETE FROM grimorio_table_votes WHERE scheda_id = $1", [card]).catch(error => {
    if ((error as { code?: string }).code !== MISSING_TABLE) throw error;
  });
}
