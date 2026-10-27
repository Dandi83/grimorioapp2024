import "server-only";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import type { AnalyticsInput } from "./analytics-events";
import type { AnalyticsEventRow } from "./db/schema";
import { INSTAGRAM_START, ORIGINS, DEVICES, type Origin, type Device } from "./analytics-stats";
/** The panel of Vercel Analytics: every visitor, without the consent details. */
export const VERCEL_ANALYTICS_URL = "https://vercel.com/grimorio-app/grimorioapp2024/analytics";
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
        for (const column of ["origin text", "device text", "installed boolean", "search_query text", "search_results integer"])
          await client.query(`ALTER TABLE grimorio_analytics_events ADD COLUMN IF NOT EXISTS ${column}`);
        // Events marked on the chart by the administrator; the opening of the Instagram profile only when the table is new.
        const { rows: existing } = await client.query("SELECT to_regclass('grimorio_analytics_markers') AS name");
        await client.query(`CREATE TABLE IF NOT EXISTS grimorio_analytics_markers (
        id uuid PRIMARY KEY, giorno text NOT NULL, etichetta text NOT NULL, creato_il timestamptz NOT NULL DEFAULT now())`);
        if (!existing[0]?.name)
          await client.query("INSERT INTO grimorio_analytics_markers (id, giorno, etichetta) VALUES ($1, $2, $3)", [randomUUID(), INSTAGRAM_START, "Apertura profilo Instagram"]);
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
    (id,visitor_id,session_id,view_id,event_name,path,card_kind,card_id,title,source,is_test,active_seconds,scroll_percent,origin,device,installed,search_query,search_results)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
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
      input.origin ?? null,
      input.device ?? null,
      input.installed ?? null,
      input.query ?? null,
      input.results ?? null,
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
            // Categories only; the searched words stay in the site's database.
            origin: r.origin,
            device: r.device,
            installed: r.installed,
            search_results: r.search_results,
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
export type StatisticsMarker = { id: string; giorno: string; etichetta: string };
export type StatisticsCard = { kind: string; id: string; title: string; opens: number };
export type Statistics = {
  people: number;
  previousPeople: number;
  days: { day: string; visitors: number }[];
  returning: number;
  installed: number;
  origins: Record<Origin, number>;
  devices: Record<Device, number>;
  areas: { incantesimi: number; bestiario: number; compendio: number };
  cards: StatisticsCard[];
  notFound: { query: string; times: number }[];
  markers: StatisticsMarker[];
};
const empty = (): Statistics => ({
  people: 0, previousPeople: 0, days: [], returning: 0, installed: 0,
  origins: Object.fromEntries(ORIGINS.map(key => [key, 0])) as Record<Origin, number>,
  devices: Object.fromEntries(DEVICES.map(key => [key, 0])) as Record<Device, number>,
  areas: { incantesimi: 0, bestiario: 0, compendio: 0 }, cards: [], notFound: [], markers: [],
});
const RANGE = "is_test=false AND received_at>=($1::date::timestamp AT TIME ZONE 'Europe/Rome') AND received_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Rome')";

/**
 * The numbers of /admin/statistiche for a period (days in the Rome time zone) and the people of the previous one.
 * Only consented events, test visits left out; administrators never send events (app/api/analytics).
 */
export async function readStatistics(range: { from: string; to: string; prevFrom: string; prevTo: string }): Promise<Statistics> {
  await ensureSchema();
  const period = [range.from, range.to];
  const [people, previous, days, returning, installed, origins, devices, areas, cards, notFound, markers] = await Promise.all([
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'`, period),
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'`, [range.prevFrom, range.prevTo]),
    pool.query(`SELECT to_char(received_at AT TIME ZONE 'Europe/Rome','YYYY-MM-DD') AS day, count(DISTINCT visitor_id)::int AS visitors
      FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view' GROUP BY day ORDER BY day`, period),
    // Back at least a second time: page views in two or more sessions of the period.
    pool.query(`SELECT count(*)::int AS n FROM (SELECT visitor_id FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'
      GROUP BY visitor_id HAVING count(DISTINCT session_id)>=2) AS back`, period),
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view' AND installed=true`, period),
    // Where each person first arrived in the period (people counted before this was recorded are left out).
    pool.query(`SELECT origin, count(*)::int AS n FROM (SELECT DISTINCT ON (visitor_id) visitor_id, origin FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='page_view' AND origin IS NOT NULL ORDER BY visitor_id, received_at) AS firsts GROUP BY origin`, period),
    pool.query(`SELECT device, count(*)::int AS n FROM (SELECT DISTINCT ON (visitor_id) visitor_id, device FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='page_view' AND device IS NOT NULL ORDER BY visitor_id, received_at DESC) AS lasts GROUP BY device`, period),
    pool.query(`SELECT count(*) FILTER (WHERE path ~ '^/(grimorio$|spell/)')::int AS incantesimi,
      count(*) FILTER (WHERE path ~ '^/(bestiario$|mostro/)')::int AS bestiario,
      count(*) FILTER (WHERE path ~ '^/(compendio|regole/|oggetti-magici|equipaggiamento|manuale/)')::int AS compendio
      FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'`, period),
    pool.query(`SELECT card_kind AS kind, card_id AS id, max(title) AS title, count(*)::int AS opens FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='card_open' AND card_id IS NOT NULL GROUP BY card_kind, card_id ORDER BY opens DESC, title ASC LIMIT 10`, period),
    // Searched at least twice with no result.
    pool.query(`SELECT search_query AS query, count(*)::int AS times FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='search' AND search_results=0 AND search_query IS NOT NULL
      GROUP BY search_query HAVING count(*)>=2 ORDER BY times DESC, query ASC LIMIT 10`, period),
    pool.query("SELECT id, giorno, etichetta FROM grimorio_analytics_markers ORDER BY giorno, creato_il"),
  ]);
  const result = empty();
  result.people = people.rows[0]?.n ?? 0;
  result.previousPeople = previous.rows[0]?.n ?? 0;
  result.days = days.rows;
  result.returning = returning.rows[0]?.n ?? 0;
  result.installed = installed.rows[0]?.n ?? 0;
  for (const row of origins.rows) if (row.origin in result.origins) result.origins[row.origin as Origin] = row.n;
  for (const row of devices.rows) if (row.device in result.devices) result.devices[row.device as Device] = row.n;
  result.areas = areas.rows[0] ?? result.areas;
  result.cards = cards.rows;
  result.notFound = notFound.rows;
  result.markers = markers.rows;
  return result;
}

/** A day (YYYY-MM-DD) and a short text, from the administrator only (app/actions/admin-statistics.ts). */
export async function addMarker(giorno: string, etichetta: string): Promise<void> {
  await ensureSchema();
  await pool.query("INSERT INTO grimorio_analytics_markers (id, giorno, etichetta) VALUES ($1, $2, $3)", [randomUUID(), giorno, etichetta]);
}

export async function deleteMarker(id: string): Promise<void> {
  await ensureSchema();
  await pool.query("DELETE FROM grimorio_analytics_markers WHERE id = $1", [id]);
}
