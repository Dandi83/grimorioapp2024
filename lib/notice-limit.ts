import "server-only";
import { pool } from "./db";

/**
 * The notices to the administrator (push and email) of new reports and proposals have their own ceiling: at most
 * NOTICES_PER_HOUR an hour for each kind; the first one over it becomes a single summary («Molte segnalazioni
 * nell'ultima ora»), the next ones are not sent until the hour has passed. What is saved stays saved: only the
 * notices are held back (28 October 2026, waiting for Turnstile).
 */
export const NOTICES_PER_HOUR = 10;
export type NoticeKind = "segnalazioni" | "proposte";
/** "send": the usual notice; "summary": the single notice of the busy hour; "skip": nothing. */
export type NoticeTurn = "send" | "summary" | "skip";

let tableReady: Promise<void> | undefined;
function ensureTable() {
  if (!tableReady) tableReady = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_notice_log (
      tipo text NOT NULL, riassunto boolean NOT NULL DEFAULT false, inviato_il timestamptz NOT NULL DEFAULT now())`);
  })().catch(error => { tableReady = undefined; throw error; });
  return tableReady;
}

/** Takes the turn of one notice: counted at once, so two reports arriving together never pass the ceiling both. */
export async function noticeTurn(kind: NoticeKind): Promise<NoticeTurn> {
  await ensureTable();
  await pool.query("DELETE FROM grimorio_notice_log WHERE inviato_il<now()-interval '1 day'");
  const usual = await pool.query(
    `INSERT INTO grimorio_notice_log (tipo) SELECT $1
     WHERE (SELECT count(*) FROM grimorio_notice_log WHERE tipo=$1 AND NOT riassunto AND inviato_il>now()-interval '1 hour')<$2
     RETURNING 1`, [kind, NOTICES_PER_HOUR]);
  if (usual.rows.length) return "send";
  const summary = await pool.query(
    `INSERT INTO grimorio_notice_log (tipo, riassunto) SELECT $1, true
     WHERE NOT EXISTS (SELECT 1 FROM grimorio_notice_log WHERE tipo=$1 AND riassunto AND inviato_il>now()-interval '1 hour')
     RETURNING 1`, [kind]);
  return summary.rows.length ? "summary" : "skip";
}

/** The summary of a busy hour, the same for push and email. */
export function summaryNotice(kind: NoticeKind) {
  return kind === "segnalazioni"
    ? { title: "Molte segnalazioni nell’ultima ora", body: "Le prossime arrivano senza avviso per un’ora: le trovi tutte nell’area riservata.", url: "/admin/segnalazioni", tag: "riassunto-segnalazioni" }
    : { title: "Molte proposte nell’ultima ora", body: "Le prossime arrivano senza avviso per un’ora: le trovi tutte nell’area riservata.", url: "/admin/proposte", tag: "riassunto-proposte" };
}
