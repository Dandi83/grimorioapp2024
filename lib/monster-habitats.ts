import "server-only";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool } from "./db";
import type * as schema from "./db/schema";
import initialHabitats from "./data/habitat-mostri.json";
import { habitatKey, normalizeHabitats, type Habitat } from "./habitats";

const fromFile = new Map(Object.entries(initialHabitats as Record<string, string[]>).map(([key, list]) => [key, normalizeHabitats(list)]));

/** Admin choices; an existing database without the table reads as "no choices yet". */
export async function getMonsterHabitatOverrides(): Promise<Map<string, Habitat[]>> {
  try {
    const result = await pool.query<{ monster_key: string; habitats: unknown }>("SELECT monster_key, habitats FROM grimorio_monster_habitats");
    return new Map(result.rows.map(row => [row.monster_key, normalizeHabitats(Array.isArray(row.habitats) ? row.habitats : [])]));
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return new Map();
    throw error;
  }
}

/**
 * The admin choice wins when it names at least one habitat; an empty saved list counts as «not set»
 * (rule of 24 October 2026: it never hides the habitat of the project file).
 */
export function resolveHabitats(id: string, overrides: Map<string, Habitat[]>): Habitat[] {
  const key = habitatKey(id);
  const chosen = overrides.get(key);
  return chosen?.length ? chosen : fromFile.get(key) ?? [];
}

/** Called inside the same transaction as the creature and its edition. */
export async function saveMonsterHabitats(database: NodePgDatabase<typeof schema>, id: string, habitats: Habitat[] | undefined) {
  if (habitats === undefined) return;
  await database.execute(sql`CREATE TABLE IF NOT EXISTS grimorio_monster_habitats (
    monster_key text PRIMARY KEY,
    habitats jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await database.execute(sql`INSERT INTO grimorio_monster_habitats (monster_key, habitats)
    VALUES (${habitatKey(id)}, ${JSON.stringify(normalizeHabitats(habitats))}::jsonb)
    ON CONFLICT (monster_key) DO UPDATE SET habitats = EXCLUDED.habitats, updated_at = now()`);
}
