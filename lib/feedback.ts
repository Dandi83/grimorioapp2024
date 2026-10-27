import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { clientAddress } from "./admin-login-limit";
import { pool } from "./db";
import {
  MIN_FILL_MS, TOKEN_MAX_AGE_MS, aboutLabel, feedbackEmailText, feedbackSubject,
  type FeedbackInput, type FeedbackState, type FeedbackType,
} from "./feedback-input";

/**
 * Anonymous reports. Stored: date, type, message, page, edition, optional reply
 * address, state, email sent, private note. Never stored here: IP address,
 * user agent, cookies. The send limit keeps a salted hash of the address in a
 * separate table, deleted after one day.
 */

/** 5 reports an hour and 20 a day from one device; 60 an hour from everyone together. */
const FEEDBACK_LIMITS = { perHour: 5, perDay: 20, overallPerHour: 60 } as const;

interface FeedbackReport {
  id: string;
  creato_il: Date;
  tipo: FeedbackType;
  messaggio: string;
  percorso: string | null;
  edizione: string | null;
  email_risposta: string | null;
  stato: FeedbackState;
  email_inviata: boolean;
  nota_admin: string | null;
}

let tablesReady: Promise<void> | undefined;
/** Additive migration: both tables are created on first use (CREATE TABLE IF NOT EXISTS). */
export function ensureFeedbackTables() {
  if (!tablesReady) tablesReady = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_feedback_reports (
      id uuid PRIMARY KEY,
      creato_il timestamptz NOT NULL DEFAULT now(),
      tipo text NOT NULL CHECK (tipo IN ('errore', 'mancanza', 'consiglio', 'diritti')),
      messaggio text NOT NULL,
      percorso text,
      edizione text CHECK (edizione IN ('2014', '2024')),
      email_risposta text,
      stato text NOT NULL DEFAULT 'nuova' CHECK (stato IN ('nuova', 'letta', 'risolta', 'archiviata')),
      email_inviata boolean NOT NULL DEFAULT false,
      nota_admin text
    )`);
    // Tables created before the rights requests: the type check is widened once, only when it lacks 'diritti'.
    const { rows } = await pool.query<{ name: string }>(
      `SELECT conname AS name FROM pg_constraint
       WHERE conrelid = 'grimorio_feedback_reports'::regclass AND contype = 'c'
         AND pg_get_constraintdef(oid) LIKE '%tipo%' AND pg_get_constraintdef(oid) NOT LIKE '%diritti%'`,
    );
    for (const { name } of rows) {
      await pool.query(`ALTER TABLE grimorio_feedback_reports DROP CONSTRAINT "${name.replace(/"/g, "")}"`);
      await pool.query(`ALTER TABLE grimorio_feedback_reports ADD CONSTRAINT grimorio_feedback_reports_tipo_check CHECK (tipo IN ('errore', 'mancanza', 'consiglio', 'diritti'))`);
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS grimorio_feedback_limits (
      device_hash text NOT NULL,
      sent_at timestamptz NOT NULL DEFAULT now()
    )`);
  })().catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

let warned = false;

/**
 * Server secret of the form token and the address hash (reports and homebrew proposals): FEEDBACK_SECRET only,
 * never the admin passcode, which a downloaded token would otherwise let anyone guess offline. Empty when missing:
 * the forms are then closed (feedbackAvailable) and nothing is ever signed with an empty key.
 */
export function feedbackSecret(): string {
  const secret = process.env.FEEDBACK_SECRET || "";
  if (!secret && !warned) {
    warned = true;
    console.warn("[segnalazioni] Variabile mancante: FEEDBACK_SECRET. Modulo Segnala e proposte homebrew non disponibili.");
  }
  return secret;
}

/** False while FEEDBACK_SECRET is missing: «Modulo temporaneamente non disponibile», nothing is sent. */
export function feedbackAvailable(): boolean {
  return !!feedbackSecret();
}

export const FORM_UNAVAILABLE = "Modulo temporaneamente non disponibile.";

function hmac(text: string): string {
  const secret = feedbackSecret();
  if (!secret) throw new Error("FEEDBACK_SECRET missing");
  return createHmac("sha256", secret).update(text).digest("hex");
}

/** Proof that the form was opened at a given time: the minimum-time check cannot be faked by the client. Null without the secret. */
export function issueFormToken(now = Date.now()): string | null {
  if (!feedbackAvailable()) return null;
  return `f1.${now}.${hmac(`grimorio-feedback-form:${now}`)}`;
}

type TokenCheck = "ok" | "invalid" | "too-fast" | "expired";

export function checkFormToken(token: string, now = Date.now()): TokenCheck {
  if (!feedbackAvailable()) return "invalid";
  const [version, issued, signed, ...rest] = token.split(".");
  if (version !== "f1" || !signed || rest.length || !/^\d{1,15}$/.test(issued ?? "")) return "invalid";
  const expected = Buffer.from(hmac(`grimorio-feedback-form:${issued}`));
  const given = Buffer.from(signed);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - Number(issued);
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > TOKEN_MAX_AGE_MS) return "expired";
  return "ok";
}

/**
 * The visitor's address as Vercel reports it (x-real-ip, else the first x-forwarded-for
 * entry), turned at once into a salted hash. Null without the server secret (the form is closed then).
 */
export function deviceKey(headers: Headers): string | null {
  if (!feedbackAvailable()) return null;
  const address = clientAddress(headers) || "unknown";
  return hmac(`grimorio-feedback-device:${address}`);
}

/** True when this device (or everyone together) already sent too many reports. */
export async function feedbackLimited(key: string | null): Promise<boolean> {
  await ensureFeedbackTables();
  const { rows } = await pool.query<{ hour: number; day: number; overall: number }>(
    `SELECT count(*) FILTER (WHERE device_hash = $1 AND sent_at > now() - interval '1 hour')::int AS hour,
            count(*) FILTER (WHERE device_hash = $1 AND sent_at > now() - interval '1 day')::int AS day,
            count(*) FILTER (WHERE sent_at > now() - interval '1 hour')::int AS overall
     FROM grimorio_feedback_limits`,
    [key ?? ""],
  );
  const { hour, day, overall } = rows[0];
  if (overall >= FEEDBACK_LIMITS.overallPerHour) return true;
  return key !== null && (hour >= FEEDBACK_LIMITS.perHour || day >= FEEDBACK_LIMITS.perDay);
}

export async function recordFeedbackSend(key: string | null): Promise<void> {
  await ensureFeedbackTables();
  await pool.query("INSERT INTO grimorio_feedback_limits (device_hash) VALUES ($1)", [key ?? ""]);
  await pool.query("DELETE FROM grimorio_feedback_limits WHERE sent_at < now() - interval '1 day'");
}

export async function saveFeedback(input: FeedbackInput): Promise<FeedbackReport> {
  await ensureFeedbackTables();
  const { rows } = await pool.query<FeedbackReport>(
    `INSERT INTO grimorio_feedback_reports (id, tipo, messaggio, percorso, edizione, email_risposta)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [randomUUID(), input.tipo, input.messaggio, input.percorso, input.edizione, input.email],
  );
  return rows[0];
}

export async function markEmailSent(id: string): Promise<void> {
  await pool.query("UPDATE grimorio_feedback_reports SET email_inviata = true WHERE id = $1", [id]);
}

export interface FeedbackFilter { tipo?: FeedbackType; stato?: FeedbackState }

export async function listFeedback(filter: FeedbackFilter = {}): Promise<{ reports: FeedbackReport[]; nuove: number }> {
  await ensureFeedbackTables();
  const [list, count] = await Promise.all([
    pool.query<FeedbackReport>(
      `SELECT * FROM grimorio_feedback_reports
       WHERE ($1::text IS NULL OR tipo = $1) AND ($2::text IS NULL OR stato = $2)
       ORDER BY (tipo = 'diritti' AND stato IN ('nuova', 'letta')) DESC, creato_il DESC LIMIT 500`,
      [filter.tipo ?? null, filter.stato ?? null],
    ),
    pool.query<{ n: number }>("SELECT count(*)::int AS n FROM grimorio_feedback_reports WHERE stato = 'nuova'"),
  ]);
  return { reports: list.rows, nuove: count.rows[0].n };
}

/** Rights requests not handled yet (new or read): they stay on top until resolved or archived. */
export async function countOpenRightsRequests(): Promise<number> {
  await ensureFeedbackTables();
  const { rows } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM grimorio_feedback_reports WHERE tipo = 'diritti' AND stato IN ('nuova', 'letta')");
  return rows[0].n;
}

/** «Segna tutte lette» of the notifications: every new report becomes read. Returns how many changed. */
export async function markAllFeedbackRead(): Promise<number> {
  await ensureFeedbackTables();
  const result = await pool.query("UPDATE grimorio_feedback_reports SET stato = 'letta' WHERE stato = 'nuova'");
  return result.rowCount ?? 0;
}

export async function countNewFeedback(): Promise<number> {
  await ensureFeedbackTables();
  const { rows } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM grimorio_feedback_reports WHERE stato = 'nuova'");
  return rows[0].n;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getFeedback(id: string): Promise<FeedbackReport | null> {
  if (!UUID.test(id)) return null;
  await ensureFeedbackTables();
  const { rows } = await pool.query<FeedbackReport>("SELECT * FROM grimorio_feedback_reports WHERE id = $1", [id]);
  return rows[0] ?? null;
}

/** Opening a new report marks it as read. */
export async function markFeedbackRead(id: string): Promise<void> {
  if (!UUID.test(id)) return;
  await pool.query("UPDATE grimorio_feedback_reports SET stato = 'letta' WHERE id = $1 AND stato = 'nuova'", [id]);
}

export async function setFeedbackState(id: string, stato: FeedbackState): Promise<boolean> {
  if (!UUID.test(id)) return false;
  await ensureFeedbackTables();
  const result = await pool.query("UPDATE grimorio_feedback_reports SET stato = $2 WHERE id = $1", [id, stato]);
  return (result.rowCount ?? 0) > 0;
}

export async function setFeedbackNote(id: string, note: string | null): Promise<boolean> {
  if (!UUID.test(id)) return false;
  await ensureFeedbackTables();
  const result = await pool.query("UPDATE grimorio_feedback_reports SET nota_admin = $2 WHERE id = $1", [id, note]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteFeedback(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  await ensureFeedbackTables();
  const result = await pool.query("DELETE FROM grimorio_feedback_reports WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

/** Test sender of Resend, used when FEEDBACK_FROM_EMAIL is not set (it delivers only to the Resend account owner). */
export const RESEND_TEST_SENDER = "Il Grimorio <onboarding@resend.dev>";

type EmailResult = "sent" | "not-configured" | "failed";

/**
 * Notifies the owner through Resend. Server only: the key and the recipient never reach the browser.
 * Without RESEND_API_KEY or FEEDBACK_TO_EMAIL nothing is sent and a warning is logged.
 */
export async function sendFeedbackEmail(report: FeedbackReport, context: { origin: string; name: string | null }, send: typeof fetch = fetch): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  if (!key || !to) {
    console.warn("[segnalazioni] Email non inviata: RESEND_API_KEY o FEEDBACK_TO_EMAIL non configurate. La segnalazione è salvata.");
    return "not-configured";
  }
  const input = { tipo: report.tipo, messaggio: report.messaggio, percorso: report.percorso, edizione: report.edizione as FeedbackInput["edizione"], email: report.email_risposta };
  const body = {
    from: process.env.FEEDBACK_FROM_EMAIL || RESEND_TEST_SENDER,
    to: to.split(",").map(address => address.trim()).filter(Boolean),
    subject: feedbackSubject(report.tipo, report.percorso),
    text: feedbackEmailText({
      ...input,
      id: report.id,
      createdAt: new Date(report.creato_il),
      adminUrl: `${context.origin}/admin/segnalazioni/${report.id}`,
      riguarda: aboutLabel(context.name, report.percorso, report.edizione),
    }),
    ...(report.email_risposta ? { reply_to: report.email_risposta } : {}),
  };
  try {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      // Only the error code of Resend: its message may contain the recipient address.
      const code = await response.json().then((body: { name?: unknown }) => (typeof body?.name === "string" ? ` (${body.name.slice(0, 60)})` : ""), () => "");
      console.warn(`[segnalazioni] Email non inviata: Resend ha risposto ${response.status}${code}. La segnalazione è salvata.`);
      return "failed";
    }
    return "sent";
  } catch {
    console.warn("[segnalazioni] Email non inviata: Resend non raggiungibile. La segnalazione è salvata.");
    return "failed";
  }
}

/** Cloudflare Turnstile is used only when both keys are set on the server. */
export function turnstileConfigured(): boolean {
  return !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export async function turnstilePassed(token: unknown, send: typeof fetch = fetch): Promise<boolean> {
  if (!turnstileConfigured()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const response = await send("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
