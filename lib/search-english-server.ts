import "server-only";
import proposals from "./data/nomi-inglesi-proposte.json";
import { pool } from "./db";
import { searchEnglishError, type SearchEnglishKind } from "./search-english";

/**
 * The English names «solo ricerca» of the NO SRD cards (PROMPT 37). The proposals are a file of the project
 * (lib/data/nomi-inglesi-proposte.json); the decisions of the reserved area (approved, also typed in the editor, or
 * discarded) are rows of grimorio_search_english. Only the approved names reach the public (PROMPT 38: as the English
 * name of the card in the search, «in inglese: …»): the proposals and the discarded ones never.
 */
let ready: Promise<void> | undefined;
function ensureTable() {
  ready ??= pool.query(`CREATE TABLE IF NOT EXISTS grimorio_search_english (
    kind text NOT NULL, card_id text NOT NULL, name text NOT NULL DEFAULT '', state text NOT NULL,
    aggiornato_il timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (kind, card_id))`).then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}

export type SearchEnglishState = "approvata" | "scartata";
export interface SearchEnglishDecision { kind: SearchEnglishKind; id: string; name: string; state: SearchEnglishState }

export async function readSearchEnglish(): Promise<SearchEnglishDecision[]> {
  await ensureTable();
  return (await pool.query<{ kind: SearchEnglishKind; card_id: string; name: string; state: SearchEnglishState }>(
    "SELECT kind, card_id, name, state FROM grimorio_search_english ORDER BY kind, card_id")).rows
    .map(row => ({ kind: row.kind, id: row.card_id, name: row.name, state: row.state }));
}

/** The proposal of the project for a card, or undefined. */
export function proposalOf(kind: SearchEnglishKind, id: string): string | undefined {
  const table: Record<string, string> = kind === "incantesimo" ? proposals.incantesimi : proposals.mostri;
  return Object.hasOwn(table, id) ? table[id] : undefined;
}

export const allProposals = (): { kind: SearchEnglishKind; id: string; name: string }[] => [
  ...Object.entries(proposals.incantesimi as Record<string, string>).map(([id, name]) => ({ kind: "incantesimo" as const, id, name })),
  ...Object.entries(proposals.mostri as Record<string, string>).map(([id, name]) => ({ kind: "mostro" as const, id, name })),
];

/** Approve (a proposal, a proposal changed, a name typed in the editor): the name must pass searchEnglishError. */
export async function approveSearchEnglish(kind: SearchEnglishKind, id: string, name: string): Promise<string | null> {
  const text = name.trim().replace(/\s+/g, " ");
  const error = searchEnglishError(text) ?? (text ? null : "Scrivi il nome inglese.");
  if (error) return error;
  await ensureTable();
  await pool.query(`INSERT INTO grimorio_search_english (kind, card_id, name, state) VALUES ($1, $2, $3, 'approvata')
    ON CONFLICT (kind, card_id) DO UPDATE SET name = EXCLUDED.name, state = 'approvata', aggiornato_il = now()`, [kind, id, text]);
  return null;
}

/** Discard: the proposal leaves «da verificare» and nothing reaches the search. */
export async function discardSearchEnglish(kind: SearchEnglishKind, id: string): Promise<void> {
  await ensureTable();
  await pool.query(`INSERT INTO grimorio_search_english (kind, card_id, name, state) VALUES ($1, $2, '', 'scartata')
    ON CONFLICT (kind, card_id) DO UPDATE SET name = '', state = 'scartata', aggiornato_il = now()`, [kind, id]);
}

/** The approved name of a card for the editor field, or "". */
export async function approvedNameOf(kind: SearchEnglishKind, id: string): Promise<string> {
  return (await readSearchEnglish()).find(row => row.kind === kind && row.id === id && row.state === "approvata")?.name ?? "";
}

/**
 * The field of the editor: a name approves it, an empty field removes the approved one (discarded, so a proposal
 * does not come back as «da verificare»). null: saved or unchanged; else the message (nothing saved).
 */
export async function saveSearchEnglishFromEditor(kind: SearchEnglishKind, id: string, value: string): Promise<string | null> {
  const text = value.trim().replace(/\s+/g, " ");
  const current = await approvedNameOf(kind, id);
  if (text === current) return null;
  if (text) return approveSearchEnglish(kind, id, text);
  await discardSearchEnglish(kind, id);
  return null;
}

/**
 * The approved names of one kind (PROMPT 38), still valid (the list of protected names may grow), by card id: the lists
 * of Incantesimi and Bestiario (lib/spell-index.ts, lib/monster-index.ts) give them as the English name of the card,
 * so the search shows them «in inglese» like the SRD names. Without the database: none.
 */
export async function approvedEnglishNames(kind: SearchEnglishKind): Promise<Map<string, string>> {
  const rows = await readSearchEnglish().catch(() => []);
  return new Map(rows.filter(row => row.kind === kind && row.state === "approvata" && row.name && !searchEnglishError(row.name)).map(row => [row.id, row.name]));
}

/**
 * The field of the editor in the save of a card (app/actions/admin.ts, admin-monsters.ts): check() before anything is
 * saved (a protected name refuses the whole save), apply() after the card is saved.
 */
export function editorSearchEnglish(formData: FormData) {
  const value = formData.has("inglese-campo") ? String(formData.get("nome_inglese_ricerca") ?? "").trim() : null;
  return {
    error: value === null ? null : searchEnglishError(value),
    async apply(kind: SearchEnglishKind, id: string): Promise<boolean> {
      if (value === null) return false;
      const before = await approvedNameOf(kind, id);
      if ((await saveSearchEnglishFromEditor(kind, id, value)) !== null) return false;
      return before !== value.replace(/\s+/g, " ");
    },
  };
}
