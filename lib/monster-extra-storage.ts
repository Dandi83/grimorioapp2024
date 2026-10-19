import "server-only";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool } from "./db";
import type * as schema from "./db/schema";
import { MONSTER_EXTRA_FIELDS, type MonsterExtraFields } from "./monster-extra-fields";

/** Existing databases remain readable; only an authenticated admin save creates storage. */
export async function getMonsterExtraFields(id?: string): Promise<Map<string, MonsterExtraFields>> {
  try {
    const result = await pool.query<{ monster_id: string; fields: MonsterExtraFields }>(
      `SELECT monster_id, fields FROM grimorio_monster_details${id === undefined ? "" : " WHERE monster_id = $1"}`,
      id === undefined ? [] : [id],
    );
    return new Map(result.rows.map(row => [row.monster_id, Object.fromEntries(
      MONSTER_EXTRA_FIELDS.filter(key => typeof row.fields[key] === "string").map(key => [key, row.fields[key]]),
    )]));
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return new Map();
    throw error;
  }
}

/** Called inside the same transaction as the creature and edition. */
export async function saveMonsterExtraFields(database: NodePgDatabase<typeof schema>, id: string, fields: MonsterExtraFields) {
  if (!Object.keys(fields).length) return;
  await database.execute(sql`CREATE TABLE IF NOT EXISTS grimorio_monster_details (
    monster_id text PRIMARY KEY REFERENCES monsters(id) ON DELETE CASCADE,
    fields jsonb NOT NULL DEFAULT '{}'::jsonb
  )`);
  await database.execute(sql`INSERT INTO grimorio_monster_details (monster_id, fields)
    VALUES (${id}, ${JSON.stringify(fields)}::jsonb)
    ON CONFLICT (monster_id) DO UPDATE
    SET fields = grimorio_monster_details.fields || EXCLUDED.fields`);
}
