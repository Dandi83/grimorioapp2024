import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./db";
import type { AnalyticsInput, FavoritePeriod, Vote } from "./analytics-events";
import { INSTAGRAM_START, ORIGINS, DEVICES, mergeCardOpens, type Origin, type Device } from "./analytics-stats";
import { MERGED_SPELL_IDS } from "./monster-id-aliases";
import { storedSpellId } from "./spell-public-id";

/** The id a card read under an old id stands for today: a spell's address of before PROMPT 8, a merged duplicate. */
export function currentCardId(kind: string, id: string): string {
  if (kind !== "spell") return id;
  const stored = storedSpellId(id);
  return MERGED_SPELL_IDS[stored] ?? stored;
}
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
/**
 * The statistics of the site: first party only, in the site's own database (28 October 2026: the copy sent to
 * PostHog was removed, so nothing reaches a third party). Running with ANALYTICS_SECRET.
 */
export function analyticsConfigured() {
  return !!analyticsSecret();
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
        for (const column of ["origin text", "device text", "installed boolean", "search_query text", "search_results integer", "share_from text", "amount integer"])
          await client.query(`ALTER TABLE grimorio_analytics_events ADD COLUMN IF NOT EXISTS ${column}`);
        // The answers of «Come ti trovi con il Grimorio?» (28 October 2026): the vote, the day and the kind of device.
        // chiave: a keyed hash of the visitor ID, only to refuse a second vote within 4 months, emptied after them.
        await client.query(`CREATE TABLE IF NOT EXISTS grimorio_ratings (
        id uuid PRIMARY KEY, voto text NOT NULL CHECK (voto IN ('male','cosi-cosi','bene')), device text,
        is_test boolean NOT NULL DEFAULT false, creato_il timestamptz NOT NULL DEFAULT now(), chiave text)`);
        await client.query("CREATE INDEX IF NOT EXISTS grimorio_ratings_key_idx ON grimorio_ratings (chiave) WHERE chiave IS NOT NULL");
        // The send limits of the statistics (28 October 2026): a keyed hash of the address that changes every day,
        // never the address; kept one day (purgeAnalytics). new_visitor: a request that got a new visitor ID.
        await client.query(`CREATE TABLE IF NOT EXISTS grimorio_analytics_limits (
        address_key text NOT NULL, new_visitor boolean NOT NULL DEFAULT false, at timestamptz NOT NULL DEFAULT now())`);
        await client.query("CREATE INDEX IF NOT EXISTS grimorio_analytics_limits_at_idx ON grimorio_analytics_limits (at)");
        // «I più salvati» (PROMPT 10, 28 October 2026): one row per visitor and card, whether the card is saved now.
        // Kept beyond the 90 days of the events, so «Sempre» stays true; a removed star is deleted after 90 days.
        await client.query(`CREATE TABLE IF NOT EXISTS grimorio_favorite_saves (
        visitor_id text NOT NULL, kind text NOT NULL, card_id text NOT NULL, saved boolean NOT NULL,
        added_at timestamptz, changed_at timestamptz NOT NULL DEFAULT now(), is_test boolean NOT NULL DEFAULT false,
        PRIMARY KEY (visitor_id, kind, card_id))`);
        await client.query("CREATE INDEX IF NOT EXISTS grimorio_favorite_saves_card_idx ON grimorio_favorite_saves (kind, card_id) WHERE saved");
        // The visitor IDs of the administrator's devices: never saved again, even after the logout.
        await client.query(`CREATE TABLE IF NOT EXISTS grimorio_analytics_excluded (
        visitor_id text PRIMARY KEY, escluso_il timestamptz NOT NULL DEFAULT now())`);
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
/**
 * One event of a visitor who accepted the statistics. Never for an excluded device; an installation (app_installed,
 * first_standalone_open) at most once per visitor and kind, whatever the browser sends again.
 */
export async function storeAnalyticsEvent(input: AnalyticsInput, visitor: string, card?: CardInfo) {
  await ensureSchema();
  const result = await pool.query(
    `INSERT INTO grimorio_analytics_events
    (id,visitor_id,session_id,view_id,event_name,path,card_kind,card_id,title,source,is_test,active_seconds,scroll_percent,origin,device,installed,search_query,search_results,share_from,amount)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
    WHERE (SELECT count(*) FROM grimorio_analytics_events WHERE visitor_id=$2 AND received_at>now()-interval '1 minute')<90
      AND NOT EXISTS (SELECT 1 FROM grimorio_analytics_excluded WHERE visitor_id=$2)
      AND ($5 NOT IN ('app_installed','first_standalone_open','arrivo_da_amico')
        OR NOT EXISTS (SELECT 1 FROM grimorio_analytics_events WHERE visitor_id=$2 AND event_name=$5))
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
      input.from ?? null,
      input.amount ?? null,
    ],
  );
  return result.rows.length > 0;
}
/**
 * The limits that keep the numbers honest, besides the 90 events a minute of one visitor (storeAnalyticsEvent):
 * - perAddressPerMinute: events from one network address in a minute (a family or a school share one);
 * - newVisitorsPerAddressPerHour: new visitor IDs given to one address in an hour (requests without the cookie);
 * - overallPerMinute: every event of the site in a minute.
 * Over a limit the event is dropped in silence: the page goes on as usual, nothing is shown to the visitor.
 */
export const ANALYTICS_LIMITS = { perAddressPerMinute: 120, newVisitorsPerAddressPerHour: 20, overallPerMinute: 3000 } as const;

/**
 * The address as a keyed hash that changes every day (the day is in the hashed text): never stored in clear, and
 * yesterday's hashes cannot be matched with today's.
 */
export function analyticsAddressKey(address: string | null, day = new Date().toISOString().slice(0, 10)): string {
  return createHmac("sha256", analyticsSecret()).update(`grimorio-analytics-address:${day}:${address || "unknown"}`).digest("hex");
}

/** True when the event may be saved (and is counted for the limits); false: drop it in silence. */
export async function admitEvent(addressKey: string, newVisitor: boolean): Promise<boolean> {
  await ensureSchema();
  const { rows } = await pool.query(
    `WITH recent AS (
      SELECT count(*) FILTER (WHERE address_key=$1 AND at>now()-interval '1 minute')::int AS mine,
        count(*) FILTER (WHERE at>now()-interval '1 minute')::int AS overall,
        count(*) FILTER (WHERE address_key=$1 AND new_visitor)::int AS fresh
      FROM grimorio_analytics_limits WHERE at>now()-interval '1 hour')
    INSERT INTO grimorio_analytics_limits (address_key, new_visitor)
    SELECT $1, $2 FROM recent WHERE mine<$3 AND overall<$4 AND (NOT $2 OR fresh<$5)
    RETURNING 1`,
    [addressKey, newVisitor, ANALYTICS_LIMITS.perAddressPerMinute, ANALYTICS_LIMITS.overallPerMinute, ANALYTICS_LIMITS.newVisitorsPerAddressPerHour],
  );
  return rows.length > 0;
}

/** The months a visitor waits before answering again (and before the question comes back). */
export const RATING_MONTHS = 4;
/**
 * One answer to «Come ti trovi con il Grimorio?»: the vote, the day and the kind of device, in its own table. A second
 * vote of the same visitor within 4 months, or from an excluded device, is not saved. The visitor ID never enters the
 * table: only a keyed hash of it, emptied after the 4 months.
 */
export async function storeRating(vote: Vote, visitor: string, device: string | null, test: boolean): Promise<boolean> {
  await ensureSchema();
  const key = createHmac("sha256", analyticsSecret()).update(`grimorio-rating:${visitor}`).digest("hex");
  await pool.query(`UPDATE grimorio_ratings SET chiave=NULL WHERE chiave IS NOT NULL AND creato_il<now()-interval '${RATING_MONTHS} months'`);
  const result = await pool.query(
    `INSERT INTO grimorio_ratings (id, voto, device, is_test, chiave)
    SELECT $1,$2,$3,$4,$5
    WHERE NOT EXISTS (SELECT 1 FROM grimorio_analytics_excluded WHERE visitor_id=$6)
      AND NOT EXISTS (SELECT 1 FROM grimorio_ratings WHERE chiave=$5)
    RETURNING id`,
    [randomUUID(), vote, device, test, key, visitor],
  );
  return result.rows.length > 0;
}

/**
 * A device of the administrator (lib/analytics-exclusion.ts): its visitor ID never saves events again and the ones
 * already saved are deleted.
 */
export async function excludeVisitor(visitor: string) {
  await ensureSchema();
  await pool.query("INSERT INTO grimorio_analytics_excluded (visitor_id) VALUES ($1) ON CONFLICT DO NOTHING", [visitor]);
  await pool.query("DELETE FROM grimorio_analytics_events WHERE visitor_id=$1", [visitor]);
  await pool.query("DELETE FROM grimorio_favorite_saves WHERE visitor_id=$1", [visitor]);
}

/** «No» to the statistics: the stars this visitor gave are no longer counted. */
export async function forgetFavorites(visitor: string) {
  await ensureSchema();
  await pool.query("DELETE FROM grimorio_favorite_saves WHERE visitor_id=$1", [visitor]);
}

/**
 * A star tapped (favorite_add, favorite_remove), after its event was saved (storeAnalyticsEvent: never for an
 * excluded device, within the limits). The state of the visitor and the card, not a sum: a second «add» of the same
 * visitor changes nothing, a «remove» without an «add» never goes below zero. The first day of the star is kept
 * while it stays saved (the 30 days of «I più salvati»).
 */
export async function storeFavorite(visitor: string, kind: string, cardId: string, saved: boolean, test: boolean) {
  await ensureSchema();
  await pool.query(
    `INSERT INTO grimorio_favorite_saves (visitor_id, kind, card_id, saved, added_at, is_test)
    VALUES ($1,$2,$3,$4, CASE WHEN $4 THEN now() END, $5)
    ON CONFLICT (visitor_id, kind, card_id) DO UPDATE SET saved=EXCLUDED.saved, changed_at=now(), is_test=EXCLUDED.is_test,
      added_at=CASE WHEN NOT EXCLUDED.saved THEN NULL WHEN grimorio_favorite_saves.saved THEN grimorio_favorite_saves.added_at ELSE now() END`,
    [visitor, kind, cardId, saved, test],
  );
}

export type FavoriteCount = { kind: string; id: string; people: number };

/**
 * How many people have each card in their favorites now (test visits left out), most saved first. «30 giorni»: the
 * stars given in the last 30 days and still there.
 */
export async function readFavoriteCounts(period: FavoritePeriod = "sempre"): Promise<FavoriteCount[]> {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT kind, card_id AS id, count(*)::int AS people FROM grimorio_favorite_saves
    WHERE saved AND is_test=false ${period === "30" ? "AND added_at>=now()-interval '30 days'" : ""}
    GROUP BY kind, card_id ORDER BY people DESC, card_id ASC`,
  );
  return rows;
}

export async function isVisitorExcluded(visitor: string): Promise<boolean> {
  await ensureSchema();
  const { rows } = await pool.query("SELECT 1 FROM grimorio_analytics_excluded WHERE visitor_id=$1", [visitor]);
  return rows.length > 0;
}

/** Votes older than this are deleted: the raw answers never pile up without end. */
export const RATINGS_KEPT_MONTHS = 13;

/**
 * The daily cleaning (app/api/analytics/maintenance, Vercel cron with CRON_SECRET): the events after 90 days, the
 * votes after 13 months, the hashes of the limits after one day. Tables not created yet are skipped.
 */
export async function purgeAnalytics() {
  for (const sql of [
    "DELETE FROM grimorio_analytics_events WHERE received_at<now()-interval '90 days'",
    `DELETE FROM grimorio_ratings WHERE creato_il<now()-interval '${RATINGS_KEPT_MONTHS} months'`,
    "DELETE FROM grimorio_analytics_limits WHERE at<now()-interval '1 day'",
    "DELETE FROM grimorio_favorite_saves WHERE NOT saved AND changed_at<now()-interval '90 days'",
  ]) {
    try {
      await pool.query(sql);
    } catch (error) {
      if ((error as { code?: string }).code !== "42P01") throw error;
    }
  }
}
export type StatisticsMarker = { id: string; giorno: string; etichetta: string };
export type StatisticsCard = { kind: string; id: string; title: string; opens: number };
export type Statistics = {
  people: number;
  previousPeople: number;
  days: { day: string; visitors: number }[];
  returning: number;
  /** The same in the previous period (the arrow of «Tornano»). */
  previousReturning: number;
  /** People who opened the site as the installed app in the period, and in the previous one. */
  installed: number;
  previousInstalled: number;
  /** The same people of «installed», by the device of their last opening of the app (none known: not counted here). */
  installedDevices: Record<Device, number>;
  /** New installations: people whose first installation event falls in the period (confirmed by the browser, or first opening from the icon). */
  installs: { total: number; confirmed: number; firstOpen: number };
  previousInstalls: number;
  origins: Record<Origin, number>;
  devices: Record<Device, number>;
  areas: { incantesimi: number; bestiario: number; compendio: number };
  cards: StatisticsCard[];
  notFound: { query: string; times: number }[];
  markers: StatisticsMarker[];
};
const empty = (): Statistics => ({
  people: 0, previousPeople: 0, days: [], returning: 0, previousReturning: 0, installed: 0, previousInstalled: 0, installedDevices: Object.fromEntries(DEVICES.map(key => [key, 0])) as Record<Device, number>,
  installs: { total: 0, confirmed: 0, firstOpen: 0 }, previousInstalls: 0,
  origins: Object.fromEntries(ORIGINS.map(key => [key, 0])) as Record<Origin, number>,
  devices: Object.fromEntries(DEVICES.map(key => [key, 0])) as Record<Device, number>,
  areas: { incantesimi: 0, bestiario: 0, compendio: 0 }, cards: [], notFound: [], markers: [],
});
const RANGE = "is_test=false AND received_at>=($1::date::timestamp AT TIME ZONE 'Europe/Rome') AND received_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Rome')";

/**
 * The numbers of /admin/statistiche for a period (days in the Rome time zone) and the people of the previous one.
 * Only consented events, test visits left out; the administrator's devices never save events (lib/analytics-exclusion.ts).
 */
// Each visitor's first installation event (app_installed or first_standalone_open, test visits left out): one
// installation per visitor, confirmed when the browser said so.
const INSTALLS = `SELECT visitor_id, min(received_at) AS first_at, bool_or(event_name='app_installed') AS confirmed
  FROM grimorio_analytics_events WHERE is_test=false AND event_name IN ('app_installed','first_standalone_open') GROUP BY visitor_id`;
const IN_PERIOD = "first_at>=($1::date::timestamp AT TIME ZONE 'Europe/Rome') AND first_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Rome')";

export async function readStatistics(range: { from: string; to: string; prevFrom: string; prevTo: string }): Promise<Statistics> {
  await ensureSchema();
  const period = [range.from, range.to];
  const [installs, previousInstalls, previousInstalled, previousReturning, installedDevices] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE confirmed)::int AS confirmed FROM (${INSTALLS}) AS firsts WHERE ${IN_PERIOD}`, period),
    pool.query(`SELECT count(*)::int AS total FROM (${INSTALLS}) AS firsts WHERE ${IN_PERIOD}`, [range.prevFrom, range.prevTo]),
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view' AND installed=true`, [range.prevFrom, range.prevTo]),
    pool.query(`SELECT count(*)::int AS n FROM (SELECT visitor_id FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'
      GROUP BY visitor_id HAVING count(DISTINCT session_id)>=2) AS back`, [range.prevFrom, range.prevTo]),
    // «Usano l’app» by system: each person of the big number once, with the device of the last opening of the app.
    pool.query(`SELECT device, count(*)::int AS n FROM (SELECT DISTINCT ON (visitor_id) visitor_id, device FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='page_view' AND installed=true AND device IS NOT NULL ORDER BY visitor_id, received_at DESC) AS lasts GROUP BY device`, period),
  ]);
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
      WHERE ${RANGE} AND event_name='card_open' AND card_id IS NOT NULL GROUP BY card_kind, card_id ORDER BY opens DESC, title ASC LIMIT 60`, period),
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
  result.previousReturning = previousReturning.rows[0]?.n ?? 0;
  result.installed = installed.rows[0]?.n ?? 0;
  result.previousInstalled = previousInstalled.rows[0]?.n ?? 0;
  for (const row of installedDevices.rows) if (row.device in result.installedDevices) result.installedDevices[row.device as Device] = row.n;
  const total = installs.rows[0]?.total ?? 0, confirmed = installs.rows[0]?.confirmed ?? 0;
  result.installs = { total, confirmed, firstOpen: total - confirmed };
  result.previousInstalls = previousInstalls.rows[0]?.total ?? 0;
  for (const row of origins.rows) if (row.origin in result.origins) result.origins[row.origin as Origin] = row.n;
  for (const row of devices.rows) if (row.device in result.devices) result.devices[row.device as Device] = row.n;
  result.areas = areas.rows[0] ?? result.areas;
  // The readings of one card under an old id add up on the current one (lib/analytics-stats.ts mergeCardOpens).
  result.cards = mergeCardOpens(cards.rows, currentCardId);
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

/** The periods of «Come si trovano?»: the last 7 or 30 days, or every answer. */
export const RATING_PERIODS = { "7": "7 giorni", "30": "30 giorni", sempre: "Sempre" } as const;
export type RatingPeriod = keyof typeof RATING_PERIODS;
export type WeekRow = { week: string; total: number; part: number };
export type Ratings = { total: number; bene: number; cosiCosi: number; male: number; weeks: WeekRow[] };
export type WordOfMouth = { tapped: number; fromHome: number; fromRating: number; sent: number; arrived: number; weeks: WeekRow[] };

const since = (period: RatingPeriod, column: string) =>
  period === "sempre" ? "true" : `${column}>=now()-interval '${Number(period)} days'`;
// Weeks from Monday, in the Rome time zone.
const week = (column: string) => `to_char(date_trunc('week', ${column} AT TIME ZONE 'Europe/Rome'),'YYYY-MM-DD')`;

/** The answers of the period (test visits left out) and, week by week, how many said «Bene». */
export async function readRatings(period: RatingPeriod): Promise<Ratings> {
  await ensureSchema();
  const where = `is_test=false AND ${since(period, "creato_il")}`;
  const [counts, weeks] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE voto='bene')::int AS bene,
      count(*) FILTER (WHERE voto='cosi-cosi')::int AS cosi, count(*) FILTER (WHERE voto='male')::int AS male
      FROM grimorio_ratings WHERE ${where}`),
    pool.query(`SELECT ${week("creato_il")} AS week, count(*)::int AS total, count(*) FILTER (WHERE voto='bene')::int AS part
      FROM grimorio_ratings WHERE ${where} GROUP BY week ORDER BY week DESC LIMIT 26`),
  ]);
  const row = counts.rows[0] ?? {};
  return { total: row.total ?? 0, bene: row.bene ?? 0, cosiCosi: row.cosi ?? 0, male: row.male ?? 0, weeks: weeks.rows.reverse() };
}

/**
 * «Passaparola»: different people (visitors), not taps. Who tapped «Condividi» (from the Home or after the
 * vote), who really sent or copied the link, who arrived from a friend's link, and those arrivals week by week.
 * The events are kept 90 days (purgeAnalytics), so «Sempre» means the last 90 days here.
 */
export async function readWordOfMouth(period: RatingPeriod): Promise<WordOfMouth> {
  await ensureSchema();
  const where = `is_test=false AND ${since(period, "received_at")}`;
  const [people, weeks] = await Promise.all([
    pool.query(`SELECT count(DISTINCT visitor_id) FILTER (WHERE event_name='share_tap')::int AS tapped,
      count(DISTINCT visitor_id) FILTER (WHERE event_name='share_tap' AND share_from='home')::int AS home,
      count(DISTINCT visitor_id) FILTER (WHERE event_name='share_tap' AND share_from='valutazione')::int AS rating,
      count(DISTINCT visitor_id) FILTER (WHERE event_name='share_sent')::int AS sent,
      count(DISTINCT visitor_id) FILTER (WHERE event_name='arrivo_da_amico')::int AS arrived
      FROM grimorio_analytics_events WHERE ${where} AND event_name IN ('share_tap','share_sent','arrivo_da_amico')`),
    pool.query(`SELECT ${week("received_at")} AS week, count(DISTINCT visitor_id)::int AS total, count(DISTINCT visitor_id)::int AS part
      FROM grimorio_analytics_events WHERE ${where} AND event_name='arrivo_da_amico' GROUP BY week ORDER BY week DESC LIMIT 26`),
  ]);
  const row = people.rows[0] ?? {};
  return {
    tapped: row.tapped ?? 0, fromHome: row.home ?? 0, fromRating: row.rating ?? 0, sent: row.sent ?? 0, arrived: row.arrived ?? 0,
    weeks: weeks.rows.reverse(),
  };
}

export type SupportStats = { opened: number; clicked: number; byAmount: { amount: number; people: number }[] };

/**
 * «Sostegno» of /admin/statistiche: different people who opened /sostieni and who tapped the Ko-fi button, by
 * amount. The contributions themselves are seen only on Ko-fi.
 */
export async function readSupport(range: { from: string; to: string }): Promise<SupportStats> {
  await ensureSchema();
  const period = [range.from, range.to];
  const [people, amounts] = await Promise.all([
    pool.query(`SELECT count(DISTINCT visitor_id) FILTER (WHERE event_name='support_page')::int AS opened,
      count(DISTINCT visitor_id) FILTER (WHERE event_name='support_click')::int AS clicked
      FROM grimorio_analytics_events WHERE ${RANGE} AND event_name IN ('support_page','support_click')`, period),
    pool.query(`SELECT amount, count(DISTINCT visitor_id)::int AS people FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='support_click' AND amount IS NOT NULL GROUP BY amount ORDER BY amount`, period),
  ]);
  return { opened: people.rows[0]?.opened ?? 0, clicked: people.rows[0]?.clicked ?? 0, byAmount: amounts.rows };
}
