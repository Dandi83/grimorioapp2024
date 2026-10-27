import { DEVICES, ORIGINS, cleanSearchQuery, type Device, type Origin } from "./analytics-stats";

export const ANALYTICS_EVENTS = [
  "page_view",
  "card_open",
  "card_read",
  "share_click",
  "share_native",
  "share_copy",
  "share_cancel",
  "search",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsInput = {
  event: AnalyticsEvent;
  id: string;
  view: string;
  session: string;
  path: string;
  test: boolean;
  source: "share" | "direct";
  activeSeconds: number;
  scrollPercent: number;
  /** page_view only: categories computed in the browser, never the referrer or the user agent. */
  origin?: Origin;
  device?: Device;
  installed?: boolean;
  /** search only: the cleaned word (lib/analytics-stats.ts) and how many results it gave. */
  query?: string;
  results?: number;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** One segment of an address of the site: letters, numbers and dashes. */
const SEGMENT = "[a-z0-9][a-z0-9-]{0,119}";
/** The public pages counted, nothing else. */
export const ANALYTICS_PATH = new RegExp(
  `^/(?:$|grimorio$|bestiario$|preferiti$|fonti$|privacy$|info$|installa$|compendio(?:/${SEGMENT})?$|regole/${SEGMENT}$|oggi/${SEGMENT}$|oggetti-magici(?:/${SEGMENT})?$|equipaggiamento(?:/${SEGMENT}(?:/${SEGMENT})?)?$|manuale(?:/[^/?#]+)?$|spell/[^/?#]+$|mostro/[^/?#]+$)`,
);
export function parseAnalyticsInput(raw: unknown): AnalyticsInput | undefined {
  if (!raw || typeof raw !== "object") return;
  const r = raw as Record<string, unknown>;
  if (
    !ANALYTICS_EVENTS.includes(r.event as AnalyticsEvent) ||
    ![r.id, r.view, r.session].every((v) => typeof v === "string" && UUID.test(v))
  )
    return;
  if (typeof r.path !== "string" || r.path.length > 260 || !ANALYTICS_PATH.test(r.path)) return;
  const activeSeconds = typeof r.activeSeconds === "number" ? Math.floor(r.activeSeconds) : 0;
  const scrollPercent = typeof r.scrollPercent === "number" ? Math.floor(r.scrollPercent) : 0;
  if (
    !Number.isFinite(activeSeconds) ||
    activeSeconds < 0 ||
    activeSeconds > 86400 ||
    !Number.isFinite(scrollPercent) ||
    scrollPercent < 0 ||
    scrollPercent > 100
  )
    return;
  if (r.event === "card_read" && (activeSeconds < 20 || scrollPercent < 50)) return;
  if (r.event !== "page_view" && r.event !== "search" && !/^\/(spell|mostro)\//.test(r.path)) return;
  const input: AnalyticsInput = {
    event: r.event as AnalyticsEvent,
    id: r.id as string,
    view: r.view as string,
    session: r.session as string,
    path: r.path,
    test: r.test === true,
    source: r.source === "share" ? "share" : "direct",
    activeSeconds,
    scrollPercent,
  };
  if (input.event === "page_view") {
    if (ORIGINS.includes(r.origin as Origin)) input.origin = r.origin as Origin;
    if (DEVICES.includes(r.device as Device)) input.device = r.device as Device;
    if (typeof r.installed === "boolean") input.installed = r.installed;
  }
  if (input.event === "search") {
    const query = cleanSearchQuery(r.query);
    const results = typeof r.results === "number" ? Math.floor(r.results) : NaN;
    if (!query || !Number.isFinite(results) || results < 0 || results > 100000) return;
    input.query = query;
    input.results = results;
  }
  return input;
}
