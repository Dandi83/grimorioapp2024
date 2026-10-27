import "server-only";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import type { AnalyticsInput } from "./analytics-events";
import type { AnalyticsEventRow } from "./db/schema";
export const POSTHOG_DASHBOARD = "https://eu.posthog.com/project/295280/dashboard/1034015";
let warned = false;
/**
 * Key of the visitor cookie: ANALYTICS_SECRET only, never the admin passcode (a visitor reads their own cookie and
 * could guess it offline). Empty when missing: the statistics do not start (analyticsConfigured).
 */
export function analyticsSecret() {
  const secret = process.env.ANALYTICS_SECRET || "";
  if (!secret && !warned) {
    warned = true;
    console.warn("[statistiche] Variabile mancante: ANALYTICS_SECRET. Statistiche non attive.");
  }
  return secret;
}
export function analyticsConfigured() {
  return !!(
    process.env.POSTHOG_PROJECT_TOKEN &&
    process.env.POSTHOG_INGEST_HOST === "https://eu.i.posthog.com" &&
    analyticsSecret()
  );
}
let schemaReady: Promise<void> | undefined;
async function ensureSchema() {
  if (!schemaReady)
    schemaReady = (async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(72401822)");
        await client.query(`CREATE TABLE IF NOT EXISTS grimorio_analytics_events (
        id uuid PRIMARY KEY, visitor_id text NOT NULL, session_id uuid NOT NULL, view_id uuid NOT NULL,
        event_name text NOT NULL, path text NOT NULL, card_kind text, card_id text, title text,
        source text NOT NULL, is_test boolean NOT NULL DEFAULT false,
        active_seconds integer NOT NULL DEFAULT 0, scroll_percent integer NOT NULL DEFAULT 0,
        received_at timestamptz NOT NULL DEFAULT now(), exported boolean NOT NULL DEFAULT false,
        UNIQUE(view_id, event_name, id)
      )`);
        await client.query(
          "ALTER TABLE grimorio_analytics_events ADD COLUMN IF NOT EXISTS export_claim uuid",
        );
        await client.query(
          "ALTER TABLE grimorio_analytics_events ADD COLUMN IF NOT EXISTS export_claimed_at timestamptz",
        );
        await client.query(
          "CREATE INDEX IF NOT EXISTS grimorio_analytics_date_idx ON grimorio_analytics_events (received_at)",
        );
        await client.query(
          "CREATE INDEX IF NOT EXISTS grimorio_analytics_visitor_idx ON grimorio_analytics_events (visitor_id, received_at)",
        );
        await client.query(
          "CREATE UNIQUE INDEX IF NOT EXISTS grimorio_analytics_view_idx ON grimorio_analytics_events (visitor_id, view_id, event_name) WHERE event_name IN ('page_view','card_open','card_read')",
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  await schemaReady;
}
export type CardInfo = { kind: "spell" | "monster" | "animal"; id: string; title: string };
export async function storeAnalyticsEvent(input: AnalyticsInput, visitor: string, card?: CardInfo) {
  await ensureSchema();
  const result = await pool.query(
    `INSERT INTO grimorio_analytics_events
    (id,visitor_id,session_id,view_id,event_name,path,card_kind,card_id,title,source,is_test,active_seconds,scroll_percent)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
    WHERE (SELECT count(*) FROM grimorio_analytics_events WHERE visitor_id=$2 AND received_at>now()-interval '1 minute')<90
    ON CONFLICT DO NOTHING RETURNING id`,
    [
      input.id,
      visitor,
      input.session,
      input.view,
      input.event,
      input.path,
      card?.kind ?? null,
      card?.id ?? null,
      card?.title ?? null,
      input.source,
      input.test,
      input.activeSeconds,
      input.scrollPercent,
    ],
  );
  return result.rows.length > 0;
}
export async function purgeAnalytics() {
  try {
    await pool.query(
      "DELETE FROM grimorio_analytics_events WHERE received_at<now()-interval '90 days'",
    );
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") throw error;
  }
}
export async function exportAnalytics() {
  if (!analyticsConfigured()) return;
  await ensureSchema();
  // Retention is enforced by the daily maintenance cron, not on every event.
  const claim = randomUUID();
  const { rows } = await pool.query<AnalyticsEventRow>(
    `UPDATE grimorio_analytics_events SET export_claim=$1,export_claimed_at=now()
    WHERE id IN (SELECT id FROM grimorio_analytics_events WHERE exported=false
      AND (export_claimed_at IS NULL OR export_claimed_at<now()-interval '1 minute')
      ORDER BY received_at LIMIT 25 FOR UPDATE SKIP LOCKED) RETURNING *`,
    [claim],
  );
  if (!rows.length) return;
  try {
    const response = await fetch(`${process.env.POSTHOG_INGEST_HOST}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        api_key: process.env.POSTHOG_PROJECT_TOKEN,
        batch: rows.map((r) => ({
          uuid: r.id,
          event: `grimorio_${r.event_name}`,
          distinct_id: `grimorio:${r.visitor_id}`,
          timestamp: new Date(r.received_at).toISOString(),
          properties: {
            app: "il_grimorio",
            is_test: r.is_test,
            card_kind: r.card_kind,
            card_id: r.card_id,
            card_title: r.title,
            path: r.path,
            source: r.source,
            active_seconds: r.active_seconds,
            scroll_percent: r.scroll_percent,
            $session_id: r.session_id,
            $insert_id: r.id,
            $current_url: `https://ilgrimorio.app${r.path}`,
            $pathname: r.path,
            $host: "ilgrimorio.app",
            $process_person_profile: false,
            $geoip_disable: true,
            $ip: null,
          },
        })),
      }),
    });
    if (!response.ok) throw new Error(`PostHog export failed (${response.status})`);
    await pool.query(
      "UPDATE grimorio_analytics_events SET exported=true,export_claim=NULL,export_claimed_at=NULL WHERE export_claim=$1",
      [claim],
    );
  } catch (error) {
    await pool.query(
      "UPDATE grimorio_analytics_events SET export_claim=NULL,export_claimed_at=NULL WHERE export_claim=$1",
      [claim],
    );
    throw error;
  }
}
type AnalyticsSummary = {
  visitors: number;
  views: number;
  opens: number;
  readers: number;
  sharers: number;
  copies: number;
  sharedArrivals: number;
  newVisitors: number;
  pending: number;
};
type AnalyticsCardRow = {
  path: string;
  title: string;
  kind: string;
  opens: number;
  visitors: number;
  readers: number;
  sharers: number;
};
type AnalyticsDay = { day: string; visitors: number; views: number };
export async function readAnalytics(
  from: string,
  to: string,
): Promise<{
  summary: AnalyticsSummary;
  cards: AnalyticsCardRow[];
  days: AnalyticsDay[];
  firstEvent: string | null;
}> {
  const where =
    "is_test=false AND received_at>=($1::date::timestamp AT TIME ZONE 'Europe/Rome') AND received_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Rome')";
  try {
    const [summary, cards, days, first] = await Promise.all([
      pool.query(
        `WITH filtered AS (SELECT * FROM grimorio_analytics_events WHERE ${where}), first_visits AS (SELECT visitor_id,min(received_at) AS first_seen FROM grimorio_analytics_events WHERE is_test=false GROUP BY visitor_id)
      SELECT count(DISTINCT visitor_id) FILTER(WHERE event_name='page_view')::int AS visitors,
      count(*) FILTER(WHERE event_name='page_view')::int AS views, count(*) FILTER(WHERE event_name='card_open')::int AS opens,
      count(DISTINCT visitor_id) FILTER(WHERE event_name='card_read')::int AS readers,
      count(DISTINCT visitor_id) FILTER(WHERE event_name='share_click')::int AS sharers,
      count(*) FILTER(WHERE event_name='share_copy')::int AS copies,
      count(DISTINCT visitor_id) FILTER(WHERE event_name='page_view' AND source='share')::int AS "sharedArrivals",
      count(DISTINCT visitor_id) FILTER(WHERE event_name='page_view' AND visitor_id IN (SELECT visitor_id FROM first_visits WHERE first_seen>=($1::date::timestamp AT TIME ZONE 'Europe/Rome')))::int AS "newVisitors",
      count(*) FILTER(WHERE exported=false)::int AS pending FROM filtered`,
        [from, to],
      ),
      pool.query(
        `SELECT path,max(title) AS title,max(card_kind) AS kind,
        count(*) FILTER(WHERE event_name='card_open')::int AS opens,
        count(DISTINCT visitor_id) FILTER(WHERE event_name='card_open')::int AS visitors,
        count(DISTINCT visitor_id) FILTER(WHERE event_name='card_read')::int AS readers,
        count(DISTINCT visitor_id) FILTER(WHERE event_name='share_click')::int AS sharers
        FROM grimorio_analytics_events WHERE ${where} AND card_kind IS NOT NULL GROUP BY path ORDER BY visitors DESC, opens DESC, title ASC LIMIT 2000`,
        [from, to],
      ),
      pool.query(
        `SELECT to_char(received_at AT TIME ZONE 'Europe/Rome','YYYY-MM-DD') AS day,count(DISTINCT visitor_id)::int AS visitors,count(*)::int AS views
        FROM grimorio_analytics_events WHERE ${where} AND event_name='page_view' GROUP BY day ORDER BY day`,
        [from, to],
      ),
      pool.query(
        "SELECT min(received_at) AS first_event FROM grimorio_analytics_events WHERE is_test=false",
      ),
    ]);
    return {
      summary: summary.rows[0],
      cards: cards.rows,
      days: days.rows,
      firstEvent: first.rows[0]?.first_event
        ? new Date(first.rows[0].first_event).toISOString()
        : null,
    };
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") throw error;
    return {
      summary: {
        visitors: 0,
        views: 0,
        opens: 0,
        readers: 0,
        sharers: 0,
        copies: 0,
        sharedArrivals: 0,
        newVisitors: 0,
        pending: 0,
      },
      cards: [],
      days: [],
      firstEvent: null,
    };
  }
}
