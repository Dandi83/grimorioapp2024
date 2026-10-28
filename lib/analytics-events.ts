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
  // The app installed: confirmed by the browser (Android, Chrome and Edge on a computer), or opened from the icon the
  // first time (the only sign on iPhone, where Safari says nothing). One of each per visitor (lib/analytics.ts).
  "app_installed",
  "first_standalone_open",
  // The card «Porta il Grimorio al tavolo» and the invite after «Bene» (28 October 2026): a tap on «Condividi», the
  // link really sent (an app chosen) or copied, the menu closed (share_cancel); the first visit from a friend's link
  // (?da=amico, once per visitor). The from field says which of the two was tapped.
  "share_tap",
  "share_sent",
  "arrivo_da_amico",
  // The three faces of the Home: only the answer, kept in its own table (lib/analytics.ts), never with the events.
  "valutazione",
] as const;
/** Where the sharing of the whole app started: the card of the Home or the invite after «Bene». */
export const SHARE_FROM = ["home", "valutazione"] as const;
export type ShareFrom = (typeof SHARE_FROM)[number];
/** The answers of «Come ti trovi con il Grimorio?». */
export const VOTES = ["male", "cosi-cosi", "bene"] as const;
export type Vote = (typeof VOTES)[number];
/** The events of the Home (the sharing of the whole app, the faces), accepted from any public page. */
const HOME_EVENTS = ["share_tap", "share_sent", "arrivo_da_amico", "valutazione"] as const;
/** The events of an installation: both count once per visitor in the statistics. */
export const INSTALL_EVENTS = ["app_installed", "first_standalone_open"] as const;
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
  /** page_view and installations: categories computed in the browser, never the referrer or the user agent. */
  origin?: Origin;
  device?: Device;
  installed?: boolean;
  /** search only: the cleaned word (lib/analytics-stats.ts) and how many results it gave. */
  query?: string;
  results?: number;
  /** share_tap, share_sent, share_cancel of the whole app: the card of the Home or the invite after «Bene». */
  from?: ShareFrom;
  /** valutazione only. */
  vote?: Vote;
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
  const install = (INSTALL_EVENTS as readonly string[]).includes(r.event as string);
  const from = SHARE_FROM.includes(r.from as ShareFrom) ? (r.from as ShareFrom) : undefined;
  // The whole app is shared from the Home (or another public page); the cards keep their own share events.
  const appShare = (HOME_EVENTS as readonly string[]).includes(r.event as string) || (r.event === "share_cancel" && !!from);
  if (r.event !== "page_view" && r.event !== "search" && !install && !appShare && !/^\/(spell|mostro)\//.test(r.path)) return;
  if ((r.event === "share_tap" || r.event === "share_sent") && !from) return;
  if (r.event === "valutazione" && !VOTES.includes(r.vote as Vote)) return;
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
    if (typeof r.installed === "boolean") input.installed = r.installed;
  }
  if ((input.event === "page_view" || install || appShare) && DEVICES.includes(r.device as Device)) input.device = r.device as Device;
  if (appShare && from && input.event !== "arrivo_da_amico" && input.event !== "valutazione") input.from = from;
  if (input.event === "valutazione") input.vote = r.vote as Vote;
  if (input.event === "search") {
    const query = cleanSearchQuery(r.query);
    const results = typeof r.results === "number" ? Math.floor(r.results) : NaN;
    if (!query || !Number.isFinite(results) || results < 0 || results > 100000) return;
    input.query = query;
    input.results = results;
  }
  return input;
}
