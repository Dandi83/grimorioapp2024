import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./db";
import { clientAddress } from "./admin-login-limit";
import { draftToMonster, homebrewId, isHomebrewId, type HomebrewDraft, type HomebrewEdition } from "./homebrew-types";
import { toMonsterListItem, type Monster, type MonsterListItem } from "./monsters-types";

/**
 * Homebrew creatures and the proposals of the community. Two tables of their own, created at the first use:
 * nothing changes in the tables of the catalog (monsters, editions, habitats) and no SRD text is touched.
 * - grimorio_homebrew: the published cards (plain-text draft in JSON, edition 2014 / 2024 / entrambe, author
 *   nickname or none for the Grimorio). The sheet is built from the draft at every read (lib/homebrew-types.ts).
 * - grimorio_homebrew_proposals: what the form «Proponi» sends, until the administrator approves or refuses
 *   it. The email, when left, serves only the notice of publication and is deleted at the decision.
 * - grimorio_homebrew_limits: salted hash of the sender's address for the send limits, kept one day.
 * - grimorio_homebrew_log: published, created, corrected, deleted, refused (shown in /admin/registro).
 */

export const PROPOSAL_STATES = ["da-vedere", "approvata", "rifiutata"] as const;
export type ProposalState = (typeof PROPOSAL_STATES)[number];
/** 3 proposals an hour and 10 a day from one device; 30 an hour from everyone together. */
export const PROPOSAL_LIMITS = { perHour: 3, perDay: 10, overallPerHour: 30 } as const;

export interface HomebrewRow { id: string; scheda: HomebrewDraft; edizione: HomebrewEdition; autore: string | null; pubblicata_il: Date | string; aggiornata_il: Date | string }
export interface ProposalRow {
  id: string; stato: ProposalState; scheda: HomebrewDraft; nickname: string; email: string | null; originale: boolean; autorizza: boolean;
  creata_il: Date | string; decisa_il: Date | string | null; motivo: string | null; homebrew_id: string | null;
}
export interface HomebrewLogRow { id: string; homebrew_id: string; nome: string; edizione: string; azione: string; creata_il: Date | string }

let tablesReady: Promise<void> | undefined;
export function ensureHomebrewTables() {
  if (!tablesReady) tablesReady = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (
      id text PRIMARY KEY,
      scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')),
      autore text,
      proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(),
      aggiornata_il timestamptz NOT NULL DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew_proposals (
      id uuid PRIMARY KEY,
      stato text NOT NULL DEFAULT 'da-vedere' CHECK (stato IN ('da-vedere', 'approvata', 'rifiutata')),
      scheda jsonb NOT NULL,
      nickname text NOT NULL,
      email text,
      originale boolean NOT NULL,
      autorizza boolean NOT NULL,
      impronta text,
      creata_il timestamptz NOT NULL DEFAULT now(),
      decisa_il timestamptz,
      motivo text,
      homebrew_id text
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew_limits (
      device_hash text NOT NULL,
      sent_at timestamptz NOT NULL DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew_log (
      id uuid PRIMARY KEY,
      homebrew_id text NOT NULL,
      nome text NOT NULL,
      edizione text NOT NULL,
      azione text NOT NULL,
      creata_il timestamptz NOT NULL DEFAULT now()
    )`);
  })().catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

const MISSING_TABLE = "42P01";
/** Public reads: before the first proposal the tables do not exist, and the site simply has no homebrew. */
async function read<T extends object>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await pool.query<T>(sql, params)).rows;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return [];
    throw error;
  }
}

/** The card of a published homebrew, as the sheet component expects it. */
export function homebrewMonster(row: HomebrewRow): Monster {
  return { ...draftToMonster(row.scheda, row.id), homebrew_edizione: row.edizione, homebrew_autore: row.autore, fonte_scheda: "Homebrew" };
}

/** The row of the lists: the light fields, «homebrew», the author and, for «Entrambe», both editions. */
export function homebrewListItem(row: HomebrewRow): MonsterListItem {
  const monster = draftToMonster(row.scheda, row.id);
  return {
    ...toMonsterListItem({ ...monster, edizione: row.edizione === "2014" ? "2014" : "2024" }),
    homebrew: true, autore: row.autore, ...(row.edizione === "entrambe" ? { entrambe: true as const } : {}),
  };
}

export async function publishedHomebrew(): Promise<HomebrewRow[]> {
  return read<HomebrewRow>("SELECT id, scheda, edizione, autore, pubblicata_il, aggiornata_il FROM grimorio_homebrew ORDER BY scheda->>'nome'");
}

export async function getHomebrew(id: string): Promise<HomebrewRow | undefined> {
  if (!isHomebrewId(id)) return undefined;
  return (await read<HomebrewRow>("SELECT id, scheda, edizione, autore, pubblicata_il, aggiornata_il FROM grimorio_homebrew WHERE id = $1", [id]))[0];
}

async function freeId(nome: string): Promise<string> {
  const base = homebrewId(nome);
  const taken = new Set((await pool.query<{ id: string }>("SELECT id FROM grimorio_homebrew WHERE id = $1 OR id LIKE $2", [base, `${base}-%`])).rows.map(row => row.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

async function log(homebrewIdValue: string, nome: string, edizione: string, azione: string) {
  await pool.query("INSERT INTO grimorio_homebrew_log (id, homebrew_id, nome, edizione, azione) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), homebrewIdValue, nome, edizione, azione]);
}

/** A homebrew made in the admin area («del Grimorio»). */
export async function createHomebrew(draft: HomebrewDraft): Promise<string> {
  await ensureHomebrewTables();
  const id = await freeId(draft.nome);
  await pool.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore) VALUES ($1, $2, $3, NULL)", [id, JSON.stringify(draft), draft.edizione]);
  await log(id, draft.nome, draft.edizione, "creata");
  return id;
}

/** Corrections of a published homebrew (the address stays the same). */
export async function updateHomebrew(id: string, draft: HomebrewDraft): Promise<boolean> {
  await ensureHomebrewTables();
  const result = await pool.query("UPDATE grimorio_homebrew SET scheda = $2, edizione = $3, aggiornata_il = now() WHERE id = $1", [id, JSON.stringify(draft), draft.edizione]);
  if (!result.rowCount) return false;
  await log(id, draft.nome, draft.edizione, "corretta");
  return true;
}

export async function deleteHomebrew(id: string): Promise<boolean> {
  await ensureHomebrewTables();
  const { rows } = await pool.query<HomebrewRow>("DELETE FROM grimorio_homebrew WHERE id = $1 RETURNING id, scheda, edizione", [id]);
  if (!rows[0]) return false;
  await log(id, rows[0].scheda.nome, rows[0].edizione, "eliminata");
  return true;
}

// Proposals.

function secret(): string {
  return process.env.FEEDBACK_SECRET || process.env.ANALYTICS_SECRET || process.env.ADMIN_PASSCODE || "";
}
/** Salted hash of the sender's address: never the address itself. Without a server secret only the overall limit applies. */
export function proposalDeviceKey(headers: Headers): string | null {
  if (!secret()) return null;
  return createHmac("sha256", secret()).update(`grimorio-homebrew-device:${clientAddress(headers) || "unknown"}`).digest("hex");
}

export async function proposalLimited(key: string | null): Promise<boolean> {
  await ensureHomebrewTables();
  const { rows } = await pool.query<{ hour: number; day: number; overall: number }>(
    `SELECT count(*) FILTER (WHERE device_hash = $1 AND sent_at > now() - interval '1 hour')::int AS hour,
            count(*) FILTER (WHERE device_hash = $1 AND sent_at > now() - interval '1 day')::int AS day,
            count(*) FILTER (WHERE sent_at > now() - interval '1 hour')::int AS overall
     FROM grimorio_homebrew_limits`, [key ?? ""]);
  const { hour, day, overall } = rows[0];
  if (overall >= PROPOSAL_LIMITS.overallPerHour) return true;
  return key !== null && (hour >= PROPOSAL_LIMITS.perHour || day >= PROPOSAL_LIMITS.perDay);
}

export async function recordProposalSend(key: string | null): Promise<void> {
  await pool.query("INSERT INTO grimorio_homebrew_limits (device_hash) VALUES ($1)", [key ?? ""]);
  await pool.query("DELETE FROM grimorio_homebrew_limits WHERE sent_at < now() - interval '1 day'");
}

export async function saveProposal(input: { draft: HomebrewDraft; nickname: string; email: string | null; impronta: string | null }): Promise<ProposalRow> {
  await ensureHomebrewTables();
  const { rows } = await pool.query<ProposalRow>(
    `INSERT INTO grimorio_homebrew_proposals (id, scheda, nickname, email, originale, autorizza, impronta)
     VALUES ($1, $2, $3, $4, true, true, $5) RETURNING *`,
    [randomUUID(), JSON.stringify(input.draft), input.nickname, input.email, input.impronta]);
  return rows[0];
}

export async function countProposalsToReview(): Promise<number> {
  return Number((await read<{ n: number }>("SELECT count(*)::int AS n FROM grimorio_homebrew_proposals WHERE stato = 'da-vedere'"))[0]?.n ?? 0);
}

export async function listProposals(stato: ProposalState): Promise<ProposalRow[]> {
  return read<ProposalRow>(`SELECT * FROM grimorio_homebrew_proposals WHERE stato = $1 ORDER BY ${stato === "da-vedere" ? "creata_il" : "decisa_il DESC"} LIMIT 300`, [stato]);
}

export async function proposalCounts(): Promise<Record<ProposalState, number>> {
  const rows = await read<{ stato: ProposalState; n: number }>("SELECT stato, count(*)::int AS n FROM grimorio_homebrew_proposals GROUP BY stato");
  return Object.fromEntries(PROPOSAL_STATES.map(state => [state, rows.find(row => row.stato === state)?.n ?? 0])) as Record<ProposalState, number>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function getProposal(id: string): Promise<ProposalRow | undefined> {
  if (!UUID.test(id)) return undefined;
  return (await read<ProposalRow>("SELECT * FROM grimorio_homebrew_proposals WHERE id = $1", [id]))[0];
}

/** «Correggi»: the administrator's corrections before the decision. */
export async function updateProposal(id: string, draft: HomebrewDraft): Promise<boolean> {
  if (!UUID.test(id)) return false;
  await ensureHomebrewTables();
  return !!(await pool.query("UPDATE grimorio_homebrew_proposals SET scheda = $2 WHERE id = $1 AND stato = 'da-vedere'", [id, JSON.stringify(draft)])).rowCount;
}

/**
 * «Approva»: the card is published with the nickname as author, the proposal remembers it and its email is
 * deleted (it is returned once, for the notice). One transaction: never a card without its proposal decided.
 */
export async function approveProposal(id: string): Promise<{ homebrewId: string; nome: string; email: string | null } | null> {
  if (!UUID.test(id)) return null;
  await ensureHomebrewTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<ProposalRow>("SELECT * FROM grimorio_homebrew_proposals WHERE id = $1 AND stato = 'da-vedere' FOR UPDATE", [id]);
    const proposal = rows[0];
    if (!proposal) {
      await client.query("ROLLBACK");
      return null;
    }
    const base = homebrewId(proposal.scheda.nome);
    const taken = new Set((await client.query<{ id: string }>("SELECT id FROM grimorio_homebrew WHERE id = $1 OR id LIKE $2", [base, `${base}-%`])).rows.map(row => row.id));
    let card = base;
    for (let n = 2; taken.has(card); n++) card = `${base}-${n}`;
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, proposta_id) VALUES ($1, $2, $3, $4, $5)",
      [card, JSON.stringify(proposal.scheda), proposal.scheda.edizione, proposal.nickname, proposal.id]);
    await client.query("UPDATE grimorio_homebrew_proposals SET stato = 'approvata', decisa_il = now(), email = NULL, homebrew_id = $2 WHERE id = $1", [id, card]);
    await client.query("INSERT INTO grimorio_homebrew_log (id, homebrew_id, nome, edizione, azione) VALUES ($1, $2, $3, $4, 'pubblicata')",
      [randomUUID(), card, proposal.scheda.nome, proposal.scheda.edizione]);
    await client.query("COMMIT");
    return { homebrewId: card, nome: proposal.scheda.nome, email: proposal.email };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** «Rifiuta»: nothing is published, the email is deleted, the reason (optional) stays for the administrator. */
export async function refuseProposal(id: string, motivo: string | null): Promise<boolean> {
  if (!UUID.test(id)) return false;
  await ensureHomebrewTables();
  const { rows } = await pool.query<ProposalRow>(
    "UPDATE grimorio_homebrew_proposals SET stato = 'rifiutata', decisa_il = now(), email = NULL, motivo = $2 WHERE id = $1 AND stato = 'da-vedere' RETURNING *", [id, motivo]);
  if (!rows[0]) return false;
  await log(`proposta:${id}`, rows[0].scheda.nome, rows[0].scheda.edizione, "rifiutata");
  return true;
}

export async function allHomebrewLog(): Promise<HomebrewLogRow[]> {
  return read<HomebrewLogRow>("SELECT * FROM grimorio_homebrew_log ORDER BY creata_il DESC, id");
}

/**
 * «La tua creatura è stata pubblicata»: only when Resend is configured with a sender of the site
 * (RESEND_API_KEY and FEEDBACK_FROM_EMAIL). Otherwise nothing is sent and nothing fails.
 */
export async function sendPublishedEmail(to: string, nome: string, url: string, send: typeof fetch = fetch): Promise<"sent" | "not-configured" | "failed"> {
  const key = process.env.RESEND_API_KEY, from = process.env.FEEDBACK_FROM_EMAIL;
  if (!key || !from) return "not-configured";
  try {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to], subject: "La tua creatura è stata pubblicata",
        text: [`Ciao,`, ``, `la tua creatura «${nome}» è stata pubblicata nel Bestiario di Il Grimorio.App:`, url, ``, `Grazie per averla proposta.`].join("\n"),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn(`[homebrew] Email di pubblicazione non inviata: Resend ha risposto ${response.status}.`);
      return "failed";
    }
    return "sent";
  } catch {
    console.warn("[homebrew] Email di pubblicazione non inviata: Resend non raggiungibile.");
    return "failed";
  }
}
