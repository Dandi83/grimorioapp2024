import "server-only";
import { pool } from "./db";
import type { PoolClient } from "pg";

export type ContentKind = "monster" | "spell";
type RulesEdition = "2014" | "2024";

/** Reading an older database is safe: only an explicit admin save initializes metadata. */
export async function getContentEditions(kind: ContentKind, id?: string): Promise<Map<string, RulesEdition>> {
  try {
    const result = await pool.query<{ content_id: string; edition: RulesEdition }>(
      `SELECT content_id, edition FROM grimorio_content_editions WHERE content_kind = $1${id === undefined ? "" : " AND content_id = $2"}`,
      id === undefined ? [kind] : [kind, id],
    );
    return new Map(result.rows.map(row => [row.content_id, row.edition]));
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return new Map();
    throw error;
  }
}

export async function saveContentEdition(kind: ContentKind, id: string, edition?: RulesEdition | null, writeContent?: (client: PoolClient) => Promise<unknown>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (writeContent) await writeContent(client);
    // Older forms omit the edition: preserve it while still saving content atomically.
    if (edition === null) {
      await client.query("COMMIT");
      return;
    }
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_content_editions (
      content_kind text NOT NULL CHECK (content_kind IN ('monster', 'spell')),
      content_id text NOT NULL,
      edition text NOT NULL CHECK (edition IN ('2014', '2024')),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (content_kind, content_id)
    )`);
    if (edition) {
      await client.query(`INSERT INTO grimorio_content_editions (content_kind, content_id, edition)
        VALUES ($1, $2, $3) ON CONFLICT (content_kind, content_id)
        DO UPDATE SET edition = EXCLUDED.edition, updated_at = now()`, [kind, id, edition]);
    } else {
      await client.query("DELETE FROM grimorio_content_editions WHERE content_kind = $1 AND content_id = $2", [kind, id]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** A recreated slug must start without the deleted entry's manual label. */
export async function deleteContentWithEdition(kind: ContentKind, id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // The table name is chosen from two constants, never from submitted text.
    await client.query(kind === "monster" ? "DELETE FROM monsters WHERE id = $1" : "DELETE FROM spells WHERE id = $1", [id]);
    const exists = await client.query("SELECT to_regclass('grimorio_content_editions') AS table_name");
    if (exists.rows[0]?.table_name) {
      await client.query("DELETE FROM grimorio_content_editions WHERE content_kind = $1 AND content_id = $2", [kind, id]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
