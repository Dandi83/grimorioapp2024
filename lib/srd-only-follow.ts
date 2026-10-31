import "server-only";
import { pool } from "./db";

/** The tag of the hidden sections, parts and cards (SECTIONS_TAG of lib/section-visibility.ts, kept light here). */
export const HIDDEN_CARDS_TAG = "section-visibility";

/**
 * After a spell or a creature is saved, created or deleted (PROMPT 39): while «Modalità solo SRD» is on, the cards it
 * hides follow the catalog (a card that becomes NO SRD is hidden at once). Off (or never used): one small query and
 * nothing else is loaded. true when the hidden cards changed.
 */
export async function followSrdOnly(): Promise<boolean> {
  const on = await pool.query<{ attiva: boolean }>("SELECT attiva FROM grimorio_srd_only WHERE id = 1").then(result => !!result.rows[0]?.attiva, () => false);
  if (!on) return false;
  const { refreshSrdOnly } = await import("./srd-only");
  return refreshSrdOnly().catch(() => false);
}

/** The addresses hidden by the mode now (none when off): «I più salvati» leaves them out. */
export async function srdOnlyPaths(): Promise<Set<string>> {
  return pool.query<{ schede: string[] }>("SELECT schede FROM grimorio_srd_only WHERE id = 1 AND attiva").then(result => new Set(result.rows[0]?.schede ?? []), () => new Set<string>());
}
