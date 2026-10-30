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
        // PROMPT 31: where a search was typed, the arrival from the link of the bio, the group of a filter.
        for (const column of ["origin text", "device text", "installed boolean", "search_query text", "search_results integer", "share_from text", "amount integer", "search_area text", "entry text", "filter_group text"])
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
        // The hour of an event (PROMPT 30), optional: where it goes on the chart of «Ultime 24 ore».
        await client.query("ALTER TABLE grimorio_analytics_markers ADD COLUMN IF NOT EXISTS ora integer");
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
/** «Adesso»: the last 5 minutes. */
export const NOW_MINUTES = 5;

/**
 * «N adesso» (PROMPT 18): different people with at least one event in the last 5 minutes. Only what the statistics
 * keep: test visits left out, the administrator's devices (never saved, and left out here too) and «No» (never sent).
 */
export async function readNow(): Promise<number> {
  await ensureSchema();
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events
     WHERE received_at > now() - make_interval(mins => $1) AND is_test=false
       AND NOT EXISTS (SELECT 1 FROM grimorio_analytics_excluded AS excluded WHERE excluded.visitor_id=grimorio_analytics_events.visitor_id)`, [NOW_MINUTES]);
  return rows[0]?.n ?? 0;
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
    (id,visitor_id,session_id,view_id,event_name,path,card_kind,card_id,title,source,is_test,active_seconds,scroll_percent,origin,device,installed,search_query,search_results,share_from,amount,search_area,entry)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
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
      input.area ?? null,
      input.bio ? "bio" : null,
    ],
  );
  const stored = result.rows.length > 0;
  // The filters applied since the last event (PROMPT 31): one «filter_apply» per group, in the same request.
  if (stored && input.filters?.length)
    for (const group of input.filters)
      await pool.query(`INSERT INTO grimorio_analytics_events (id,visitor_id,session_id,view_id,event_name,path,source,is_test,filter_group)
        VALUES ($1,$2,$3,$4,'filter_apply',$5,$6,$7,$8) ON CONFLICT DO NOTHING`, [randomUUID(), visitor, input.session, input.view, input.path, input.source, input.test, group]);
  return stored;
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
  // Its votes «al tavolo» (lib/table-votes.ts) go too, when the table exists (and only with the key that made them).
  if (process.env.ANALYTICS_SECRET) await pool.query("DELETE FROM grimorio_table_votes WHERE chiave=$1", [tableVoteKey(visitor)]).catch(() => undefined);
}

/** The key of a device among the votes «al tavolo»: a keyed hash of the visitor ID, never the ID itself. */
export function tableVoteKey(visitor: string): string {
  return createHmac("sha256", analyticsSecret()).update(`grimorio-prova-tavolo:${visitor}`).digest("hex");
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
/** ora: the Rome hour (0–23) the administrator gave, for the chart of «Ultime 24 ore»; null when only the day. */
export type StatisticsMarker = { id: string; giorno: string; etichetta: string; ora?: number | null; creato_il?: string | Date | null };
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
/**
 * A period of /admin/statistiche: days of the Rome calendar (from, to: YYYY-MM-DD), or the moving window of
 * «Ultime 24 ore» (PROMPT 30: start, end as instants; the previous 24 hours just before).
 */
export type StatisticsRange =
  | { from: string; to: string; prevFrom: string; prevTo: string }
  | { hours: true; start: string; end: string; prevStart: string; prevEnd: string };
const DAYS_RANGE = (column: string) => `${column}>=($1::date::timestamp AT TIME ZONE 'Europe/Rome') AND ${column}<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Rome')`;
const HOURS_RANGE = (column: string) => `${column}>=$1::timestamptz AND ${column}<$2::timestamptz`;
/** The SQL of a period on one column, its two values and those of the previous one; the same index on received_at. */
function rangeSql(range: StatisticsRange) {
  const hours = "hours" in range;
  return {
    hours,
    where: `is_test=false AND ${hours ? HOURS_RANGE("received_at") : DAYS_RANGE("received_at")}`,
    firsts: hours ? HOURS_RANGE("first_at") : DAYS_RANGE("first_at"),
    period: hours ? [range.start, range.end] : [range.from, range.to],
    previous: hours ? [range.prevStart, range.prevEnd] : [range.prevFrom, range.prevTo],
    // The chart: the people of each Rome day, or of each slice of 60 minutes from the start of the window (0–23).
    bucket: hours ? `floor(extract(epoch FROM (received_at - $1::timestamptz)) / 3600)::int` : `to_char(received_at AT TIME ZONE 'Europe/Rome','YYYY-MM-DD')`,
  };
}

/**
 * The numbers of /admin/statistiche for a period (days in the Rome time zone) and the people of the previous one.
 * Only consented events, test visits left out; the administrator's devices never save events (lib/analytics-exclusion.ts).
 */
// Each visitor's first installation event (app_installed or first_standalone_open, test visits left out): one
// installation per visitor, confirmed when the browser said so.
const INSTALLS = `SELECT visitor_id, min(received_at) AS first_at, bool_or(event_name='app_installed') AS confirmed
  FROM grimorio_analytics_events WHERE is_test=false AND event_name IN ('app_installed','first_standalone_open') GROUP BY visitor_id`;
export async function readStatistics(range: StatisticsRange): Promise<Statistics> {
  await ensureSchema();
  const { where: RANGE, firsts: IN_PERIOD, period, previous: before, bucket } = rangeSql(range);
  const [installs, previousInstalls, previousInstalled, previousReturning, installedDevices] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE confirmed)::int AS confirmed FROM (${INSTALLS}) AS firsts WHERE ${IN_PERIOD}`, period),
    pool.query(`SELECT count(*)::int AS total FROM (${INSTALLS}) AS firsts WHERE ${IN_PERIOD}`, before),
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view' AND installed=true`, before),
    pool.query(`SELECT count(*)::int AS n FROM (SELECT visitor_id FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'
      GROUP BY visitor_id HAVING count(DISTINCT session_id)>=2) AS back`, before),
    // «Usano l’app» by system: each person of the big number once, with the device of the last opening of the app.
    pool.query(`SELECT device, count(*)::int AS n FROM (SELECT DISTINCT ON (visitor_id) visitor_id, device FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='page_view' AND installed=true AND device IS NOT NULL ORDER BY visitor_id, received_at DESC) AS lasts GROUP BY device`, period),
  ]);
  const [people, previous, days, returning, installed, origins, devices, areas, cards, notFound, markers] = await Promise.all([
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'`, period),
    pool.query(`SELECT count(DISTINCT visitor_id)::int AS n FROM grimorio_analytics_events WHERE ${RANGE} AND event_name='page_view'`, before),
    pool.query(`SELECT ${bucket} AS day, count(DISTINCT visitor_id)::int AS visitors
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
    pool.query("SELECT id, giorno, etichetta, ora, creato_il FROM grimorio_analytics_markers ORDER BY giorno, ora NULLS FIRST, creato_il"),
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
export async function addMarker(giorno: string, etichetta: string, ora: number | null = null): Promise<void> {
  await ensureSchema();
  await pool.query("INSERT INTO grimorio_analytics_markers (id, giorno, etichetta, ora) VALUES ($1, $2, $3, $4)", [randomUUID(), giorno, etichetta, ora]);
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
export async function readSupport(range: StatisticsRange): Promise<SupportStats> {
  await ensureSchema();
  const { where: RANGE, period } = rangeSql(range);
  const [people, amounts] = await Promise.all([
    pool.query(`SELECT count(DISTINCT visitor_id) FILTER (WHERE event_name='support_page')::int AS opened,
      count(DISTINCT visitor_id) FILTER (WHERE event_name='support_click')::int AS clicked
      FROM grimorio_analytics_events WHERE ${RANGE} AND event_name IN ('support_page','support_click')`, period),
    pool.query(`SELECT amount, count(DISTINCT visitor_id)::int AS people FROM grimorio_analytics_events
      WHERE ${RANGE} AND event_name='support_click' AND amount IS NOT NULL GROUP BY amount ORDER BY amount`, period),
  ]);
  return { opened: people.rows[0]?.opened ?? 0, clicked: people.rows[0]?.clicked ?? 0, byAmount: amounts.rows };
}

/*
 * Insight (PROMPT 31): read only when the administrator opens /admin/statistiche, on the period chosen; the same
 * index on received_at, and the one on (visitor_id, received_at) for the steps of each person.
 */
export type SearchMiss = { query: string; times: number; people: number; areas: string[] };
/** The searches with no result of the period, the most frequent first. */
export async function readSearchMisses(range: StatisticsRange, limit = 15): Promise<SearchMiss[]> {
  await ensureSchema();
  const { where, period } = rangeSql(range);
  const { rows } = await pool.query(`SELECT search_query AS query, count(*)::int AS times, count(DISTINCT visitor_id)::int AS people,
      array_remove(array_agg(DISTINCT search_area), NULL) AS areas
    FROM grimorio_analytics_events WHERE ${where} AND event_name='search' AND search_results=0 AND search_query IS NOT NULL
    GROUP BY search_query ORDER BY times DESC, query ASC LIMIT ${Number(limit)}`, period);
  return rows;
}

/** «Il percorso»: the people of the period at each step (each person once per step). */
export async function readFunnel(range: StatisticsRange): Promise<Record<"arrivano" | "scheda" | "cercano" | "preferito" | "installano" | "tornano", number>> {
  await ensureSchema();
  const { where, period } = rangeSql(range);
  const { rows } = await pool.query(`WITH firsts AS (
      SELECT DISTINCT ON (visitor_id) visitor_id, session_id, received_at FROM grimorio_analytics_events
      WHERE ${where} AND event_name='page_view' ORDER BY visitor_id, received_at),
    steps AS (
      SELECT visitor_id, bool_or(event_name='card_open') AS scheda, bool_or(event_name IN ('search','filter_apply')) AS cercano,
        bool_or(event_name='favorite_add') AS preferito, bool_or(event_name IN ('app_installed','first_standalone_open')) AS installano
      FROM grimorio_analytics_events WHERE ${where} GROUP BY visitor_id)
    SELECT count(*)::int AS arrivano, count(*) FILTER (WHERE steps.scheda)::int AS scheda, count(*) FILTER (WHERE steps.cercano)::int AS cercano,
      count(*) FILTER (WHERE steps.preferito)::int AS preferito, count(*) FILTER (WHERE steps.installano)::int AS installano,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM grimorio_analytics_events AS later WHERE later.visitor_id=firsts.visitor_id
        AND later.event_name='page_view' AND later.is_test=false AND later.session_id<>firsts.session_id
        AND later.received_at>firsts.received_at AND later.received_at<=firsts.received_at+interval '7 days'))::int AS tornano
    FROM firsts LEFT JOIN steps USING (visitor_id)`, period);
  const row = rows[0] ?? {};
  return { arrivano: row.arrivano ?? 0, scheda: row.scheda ?? 0, cercano: row.cercano ?? 0, preferito: row.preferito ?? 0, installano: row.installano ?? 0, tornano: row.tornano ?? 0 };
}

export type InstagramArrivals = { bio: { people: number; back: number }; other: { people: number; back: number }; bioBuckets: { day: string; visitors: number }[] };
/**
 * «Da Instagram»: the people arrived from the link of the bio (?da=bio, their first such arrival of the period) and
 * the other arrivals recognised as Instagram (stories, ads, messages), each with how many came back within 7 days
 * in another session; the arrivals from the bio by day (by bar of 60 minutes for «Ultime 24 ore»).
 */
export async function readInstagram(range: StatisticsRange): Promise<InstagramArrivals> {
  await ensureSchema();
  const { where, period, bucket } = rangeSql(range);
  const arrivals = (filter: string) => `SELECT DISTINCT ON (visitor_id) visitor_id, session_id, received_at FROM grimorio_analytics_events
    WHERE ${where} AND event_name='page_view' AND ${filter} ORDER BY visitor_id, received_at`;
  const bio = arrivals("entry='bio'");
  const other = `SELECT * FROM (${arrivals("origin='instagram' AND entry IS NULL")}) AS ig WHERE visitor_id NOT IN (SELECT visitor_id FROM (${bio}) AS b)`;
  const back = `EXISTS (SELECT 1 FROM grimorio_analytics_events AS later WHERE later.visitor_id=a.visitor_id AND later.event_name='page_view'
    AND later.is_test=false AND later.session_id<>a.session_id AND later.received_at>a.received_at AND later.received_at<=a.received_at+interval '7 days')`;
  const [counts, buckets] = await Promise.all([
    pool.query(`SELECT (SELECT count(*) FROM (${bio}) AS a)::int AS bio, (SELECT count(*) FROM (${bio}) AS a WHERE ${back})::int AS bio_back,
      (SELECT count(*) FROM (${other}) AS a)::int AS other, (SELECT count(*) FROM (${other}) AS a WHERE ${back})::int AS other_back`, period),
    pool.query(`SELECT ${bucket} AS day, count(*)::int AS visitors FROM (${bio}) AS arrivals GROUP BY day ORDER BY day`, period),
  ]);
  const row = counts.rows[0] ?? {};
  return { bio: { people: row.bio ?? 0, back: row.bio_back ?? 0 }, other: { people: row.other ?? 0, back: row.other_back ?? 0 }, bioBuckets: buckets.rows };
}

/**
 * «Chi resta davvero»: each person arrived in the last 9 weeks (first page view kept, 90 days at most), the Monday of
 * the week of arrival (Rome), whether the first visit came from Instagram, the Mondays of the weeks they came back.
 * lib/analytics-stats.ts cohorts() makes the table.
 */
export async function readCohortPeople(): Promise<{ week: string; instagram: boolean; back: string[] }[]> {
  await ensureSchema();
  const week = (column: string) => `to_char(date_trunc('week', ${column} AT TIME ZONE 'Europe/Rome'),'YYYY-MM-DD')`;
  const { rows } = await pool.query(`WITH firsts AS (
      SELECT DISTINCT ON (visitor_id) visitor_id, received_at, origin FROM grimorio_analytics_events
      WHERE is_test=false AND event_name='page_view' ORDER BY visitor_id, received_at)
    SELECT ${week("f.received_at")} AS week, coalesce(f.origin='instagram', false) AS instagram,
      coalesce(array_agg(DISTINCT ${week("e.received_at")}) FILTER (WHERE e.visitor_id IS NOT NULL), '{}') AS back
    FROM firsts AS f LEFT JOIN grimorio_analytics_events AS e ON e.visitor_id=f.visitor_id AND e.event_name='page_view'
      AND e.is_test=false AND e.received_at>f.received_at
    WHERE f.received_at>=now()-interval '63 days'
    GROUP BY f.visitor_id, f.received_at, f.origin`);
  return rows;
}
