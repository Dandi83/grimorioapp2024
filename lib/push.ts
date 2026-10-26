import "server-only";
import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { pool } from "./db";

/**
 * Push notifications for the administrator (Web Push with VAPID keys, sent through the browser's push
 * service). Only admin devices are subscribed (app/actions/admin-push.ts); visitors never are.
 *
 * Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY when both are set on the server; otherwise a pair generated
 * at the first use and kept in the database. The private key stays on the server: never in the code,
 * the logs or the browser bundle (scripts/check-client-bundle.mjs).
 *
 * HOW TO ADD A KIND OF NOTIFICATION: add ONE entry to NOTIFICATION_TYPES (key, title, hint, on by default)
 * and call sendPush(key, …) where the event happens. Each kind has its switch in /admin/notifiche.
 */

export const NOTIFICATION_TYPES = [
  { key: "segnalazioni", title: "Segnalazioni", hint: "Una notifica per ogni nuova segnalazione da /segnala.", default: true },
  { key: "proposte", title: "Nuova proposta homebrew", hint: "Una notifica per ogni creatura proposta da /bestiario/proponi.", default: true },
] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number]["key"];

export function isNotificationType(value: unknown): value is NotificationType {
  return NOTIFICATION_TYPES.some(type => type.key === value);
}

/** Who the push services see as the sender (VAPID «subject»): the site, never a personal address. */
const SUBJECT = "https://ilgrimorio.app";

interface PushDevice { id: string; endpoint: string; dispositivo: string; creata_il: Date | string }
export interface PushSubscriptionInput { endpoint: string; keys: { p256dh: string; auth: string } }
/** badge: the number for the app icon (new reports and proposals to review), set by the service worker even with the app closed. */
interface PushPayload { title: string; body: string; url: string; tag?: string; badge?: number }

let tablesReady: Promise<void> | undefined;
/** Additive migration: created at the first use from the admin area or the first send. */
export function ensurePushTables() {
  if (!tablesReady) tablesReady = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_push_keys (
    id text PRIMARY KEY,
    public_key text NOT NULL,
    private_key text NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now()
  )`).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_push_subscriptions (
    id uuid PRIMARY KEY,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    dispositivo text NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now()
  )`)).then(() => pool.query(`CREATE TABLE IF NOT EXISTS grimorio_push_types (
    tipo text PRIMARY KEY,
    attivo boolean NOT NULL,
    aggiornata_il timestamptz NOT NULL DEFAULT now()
  )`)).then(() => undefined).catch(error => { tablesReady = undefined; throw error; });
  return tablesReady;
}

interface VapidKeys { publicKey: string; privateKey: string; source: "env" | "database" }

/** The VAPID key pair: from the server variables, else from the database, else generated once and saved. */
export async function vapidKeys(env: Record<string, string | undefined> = process.env): Promise<VapidKeys> {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, source: "env" };
  await ensurePushTables();
  const read = async () => (await pool.query<{ public_key: string; private_key: string }>("SELECT public_key, private_key FROM grimorio_push_keys WHERE id = 'vapid'")).rows[0];
  let row = await read();
  if (!row) {
    const generated = webpush.generateVAPIDKeys();
    // Two first uses at the same time: the first pair saved wins and both read it back.
    await pool.query("INSERT INTO grimorio_push_keys (id, public_key, private_key) VALUES ('vapid', $1, $2) ON CONFLICT (id) DO NOTHING", [generated.publicKey, generated.privateKey]);
    row = await read();
  }
  return { publicKey: row.public_key, privateKey: row.private_key, source: "database" };
}

export async function listDevices(): Promise<PushDevice[]> {
  await ensurePushTables();
  const { rows } = await pool.query<PushDevice>("SELECT id, endpoint, dispositivo, creata_il FROM grimorio_push_subscriptions ORDER BY creata_il DESC");
  return rows;
}

const validSubscription = (sub: PushSubscriptionInput) =>
  typeof sub?.endpoint === "string" && /^https:\/\/[^\s]{8,2000}$/.test(sub.endpoint)
  && typeof sub.keys?.p256dh === "string" && sub.keys.p256dh.length <= 200 && typeof sub.keys?.auth === "string" && sub.keys.auth.length <= 100;

/** Saves (or renews) the subscription of one device. */
export async function saveSubscription(sub: PushSubscriptionInput, device: string): Promise<boolean> {
  if (!validSubscription(sub)) return false;
  await ensurePushTables();
  await pool.query(`INSERT INTO grimorio_push_subscriptions (id, endpoint, p256dh, auth, dispositivo) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, dispositivo = EXCLUDED.dispositivo`,
  [randomUUID(), sub.endpoint, sub.keys.p256dh, sub.keys.auth, device.slice(0, 60) || "Dispositivo"]);
  return true;
}

export async function removeSubscription(where: { endpoint?: string; id?: string }): Promise<void> {
  await ensurePushTables();
  if (where.endpoint) await pool.query("DELETE FROM grimorio_push_subscriptions WHERE endpoint = $1", [where.endpoint]);
  else if (where.id) await pool.query("DELETE FROM grimorio_push_subscriptions WHERE id = $1", [where.id]);
}

/** The switch of each kind of notification (on by default until changed in /admin/notifiche). */
export async function notificationTypes(): Promise<Record<NotificationType, boolean>> {
  await ensurePushTables();
  const { rows } = await pool.query<{ tipo: string; attivo: boolean }>("SELECT tipo, attivo FROM grimorio_push_types");
  return Object.fromEntries(NOTIFICATION_TYPES.map(type => [type.key, rows.find(row => row.tipo === type.key)?.attivo ?? type.default])) as Record<NotificationType, boolean>;
}

export async function setNotificationType(type: NotificationType, on: boolean): Promise<void> {
  await ensurePushTables();
  await pool.query(`INSERT INTO grimorio_push_types (tipo, attivo) VALUES ($1, $2)
    ON CONFLICT (tipo) DO UPDATE SET attivo = EXCLUDED.attivo, aggiornata_il = now()`, [type, on]);
}

interface SendResult { sent: number; removed: number; failed: number; skipped?: "type-off" | "no-devices" }

type Sender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string, options: object) => Promise<unknown>;

/**
 * Sends one notification to every admin device (or only to `endpoint`). Subscriptions the push service
 * says are gone (404, 410) are deleted; other failures are counted and never thrown.
 */
export async function sendPush(type: NotificationType, payload: PushPayload, options: { endpoint?: string; send?: Sender; ignoreSwitch?: boolean } = {}): Promise<SendResult> {
  await ensurePushTables();
  if (!options.ignoreSwitch && !(await notificationTypes())[type]) return { sent: 0, removed: 0, failed: 0, skipped: "type-off" };
  const { rows } = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
    options.endpoint ? "SELECT endpoint, p256dh, auth FROM grimorio_push_subscriptions WHERE endpoint = $1" : "SELECT endpoint, p256dh, auth FROM grimorio_push_subscriptions",
    options.endpoint ? [options.endpoint] : []);
  if (!rows.length) return { sent: 0, removed: 0, failed: 0, skipped: "no-devices" };
  const keys = await vapidKeys();
  const send: Sender = options.send ?? ((sub, body, opts) => webpush.sendNotification(sub, body, opts));
  const body = JSON.stringify(payload);
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  await Promise.all(rows.map(async row => {
    try {
      await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, body, {
        vapidDetails: { subject: SUBJECT, publicKey: keys.publicKey, privateKey: keys.privateKey },
        TTL: 24 * 60 * 60,
        urgency: "normal",
      });
      result.sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await pool.query("DELETE FROM grimorio_push_subscriptions WHERE endpoint = $1", [row.endpoint]).catch(() => undefined);
        result.removed++;
      } else {
        result.failed++;
      }
    }
  }));
  // Counts only: never the keys, the addresses or the text of the notification.
  if (result.failed) console.warn(`[notifiche] ${result.failed} invii non riusciti, ${result.sent} riusciti.`);
  return result;
}

/** «Errore · Palla di fuoco» and the first 80 characters of the message: never the reply address. */
export function feedbackPayload(report: { id: string; tipo: string; messaggio: string }, typeLabel: string, pageTitle: string | null, badge?: number | null): PushPayload {
  const text = report.messaggio.replace(/\s+/g, " ").trim();
  const start = text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text;
  return {
    title: "Nuova segnalazione",
    body: `${typeLabel} · ${pageTitle || "Generale"}\n${start}`,
    url: `/admin/segnalazioni/${report.id}`,
    tag: `segnalazione-${report.id}`,
    ...(typeof badge === "number" ? { badge } : {}),
  };
}

export function proposalPayload(proposal: { id: string; nickname: string; scheda: { nome: string; grado_sfida: string; edizione: string } }, badge?: number | null): PushPayload {
  const edition = proposal.scheda.edizione === "entrambe" ? "2014 e 2024" : proposal.scheda.edizione;
  return {
    title: "Nuova proposta homebrew",
    body: `${proposal.scheda.nome} · GS ${proposal.scheda.grado_sfida} · ${edition}\ndi ${proposal.nickname}`,
    url: "/admin/proposte",
    tag: `proposta-${proposal.id}`,
    ...(typeof badge === "number" ? { badge } : {}),
  };
}
