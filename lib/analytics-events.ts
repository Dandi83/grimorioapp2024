import { DEVICES, FILTER_GROUPS, ORIGINS, SEARCH_AREAS, USE_SIGNALS, cleanNotFoundPath, cleanSearchQuery, type Device, type FilterGroup, type Origin, type SearchArea, type UseSignal } from "./analytics-stats";

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
  // «Sostieni il Grimorio» (lib/support.ts): a link to /sostieni (with where), the page opened, the Ko-fi button
  // tapped (with the amount chosen). The contributions themselves are seen only on Ko-fi.
  "support_link",
  "support_page",
  "support_click",
  // A star of the favorites tapped (components/favorites-provider.tsx), anywhere: the kind and the id of the card.
  // The favorites themselves stay on the phone; the server keeps only who has which card saved now (lib/analytics.ts).
  "favorite_add",
  "favorite_remove",
  // «L'hai provato al tavolo?» (PROMPT 19) under a sheet of «I mostri creati da voi»: easy, right or hard for its CR.
  // One vote per device and card, changeable, kept in its own table (lib/table-votes.ts), never with the events.
  "prova_tavolo",
  // A page that does not exist (PROMPT 32): sent instead of the page view, with the path asked only.
  "not_found",
] as const;
/** The kinds of cards with a star: spells and creatures (the animals are creatures of the Bestiario). */
export const FAVORITE_KINDS = ["incantesimo", "mostro"] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];
/** The day the stars started to be counted (the merge of PROMPT 10): the favorites saved before are not known. */
export const FAVORITES_COUNTED_SINCE = "2026-10-28";
export const FAVORITES_NOTE = "Conteggio dal 28 ottobre 2026: i preferiti salvati prima non sono noti.";
/** The periods of «I più salvati»: the stars given in the last 30 days and still there, or all of them. */
export const FAVORITE_PERIODS = { "30": "30 giorni", sempre: "Sempre" } as const;
export type FavoritePeriod = keyof typeof FAVORITE_PERIODS;
/** The id of a card: letters, numbers and dashes, as in the addresses. */
const CARD_ID = /^[a-z0-9][a-z0-9-]{0,119}$/;
/** Where the sharing of the whole app started: the card of the Home or the invite after «Bene». */
export const SHARE_FROM = ["home", "valutazione", "sostieni"] as const;
/** Where a link to /sostieni was tapped (lib/support.ts). */
export const SUPPORT_FROM = ["home", "info", "card", "colonna"] as const;
/** The amounts of /sostieni, in euro. */
export const SUPPORT_AMOUNTS = [1, 3, 5] as const;
export type ShareFrom = (typeof SHARE_FROM)[number];
/** The answers of «Come ti trovi con il Grimorio?». */
export const VOTES = ["male", "cosi-cosi", "bene"] as const;
export type Vote = (typeof VOTES)[number];
/** The answers of «L'hai provato al tavolo?»: how it went against its Challenge Rating. */
export const TABLE_VOTES = ["facile", "giusto", "difficile"] as const;
export type TableVote = (typeof TABLE_VOTES)[number];
/** The events of the Home (the sharing of the whole app, the faces), accepted from any public page. */
const HOME_EVENTS = ["share_tap", "share_sent", "arrivo_da_amico", "valutazione", "support_link", "support_page", "support_click", "favorite_add", "favorite_remove"] as const;
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
  /** search only: the cleaned word (lib/analytics-stats.ts), how many results it gave, where it was typed. */
  query?: string;
  results?: number;
  area?: SearchArea;
  /** page_view only: arrived from the link of the Instagram bio (?da=bio, PROMPT 31). */
  bio?: true;
  /**
   * page_view and search: the groups of filters applied since the last event sent (PROMPT 31). No request of its
   * own: the server keeps one «filter_apply» per group, with the same visitor and session.
   */
  filters?: FilterGroup[];
  /** page_view, search and the installation (PROMPT 32): the uses since the last event (USE_SIGNALS), names only. */
  uses?: UseSignal[];
  /** page_view only: the LCP of a page measured on 1 visit in 10 (ms, and the page it was measured on). */
  lcp?: { ms: number; path: string };
  /** share_tap, share_sent, share_cancel of the whole app (the card of the Home, the invite after «Bene», /sostieni);
   * support_link: where the link to /sostieni was tapped. */
  from?: ShareFrom | (typeof SUPPORT_FROM)[number];
  /** valutazione only. */
  vote?: Vote;
  /** support_click only: 1, 3 or 5 euro. */
  amount?: number;
  /** favorite_add and favorite_remove only: the card whose star was tapped (the id kept on the phone). */
  favoriteKind?: FavoriteKind;
  favoriteId?: string;
  /** prova_tavolo only: the vote; the card is the one of the path (/mostro/<id>). */
  tableVote?: TableVote;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** One segment of an address of the site: letters, numbers and dashes. */
const SEGMENT = "[a-z0-9][a-z0-9-]{0,119}";
/**
 * The public pages counted, nothing else (tests/analytics-pages.cjs checks that every public page of app/ is here:
 * /avanzamento and /termini were refused with 400 until 28 October 2026).
 */
export const ANALYTICS_PATH = new RegExp(
  `^/(?:$|grimorio$|bestiario(?:/proponi|/creati-da-voi(?:/bilanciamento)?|/del-grimorio|/creature-originali)?$|preferiti$|fonti$|privacy$|info$|termini$|sostieni$|installa$|segnala$|avanzamento$|dadi$|classi(?:/${SEGMENT})?$|in-arrivo/${SEGMENT}$|compendio(?:/${SEGMENT})?$|regole/${SEGMENT}$|oggi/${SEGMENT}$|oggetti-magici(?:/${SEGMENT})?$|equipaggiamento(?:/${SEGMENT}(?:/${SEGMENT})?)?$|manuale(?:/[^/?#]+)?$|spell/[^/?#]+$|mostro/[^/?#]+$)`,
);
export function parseAnalyticsInput(raw: unknown): AnalyticsInput | undefined {
  if (!raw || typeof raw !== "object") return;
  const r = raw as Record<string, unknown>;
  if (
    !ANALYTICS_EVENTS.includes(r.event as AnalyticsEvent) ||
    ![r.id, r.view, r.session].every((v) => typeof v === "string" && UUID.test(v))
  )
    return;
  // «Non trovata»: any plain path but the reserved area, without parameters; the others only the public pages.
  if (typeof r.path !== "string" || (r.event === "not_found" ? cleanNotFoundPath(r.path) !== r.path : r.path.length > 260 || !ANALYTICS_PATH.test(r.path))) return;
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
  if (r.event !== "page_view" && r.event !== "search" && r.event !== "not_found" && !install && !appShare && !/^\/(spell|mostro)\//.test(r.path)) return;
  if ((r.event === "share_tap" || r.event === "share_sent") && !from) return;
  if (r.event === "valutazione" && !VOTES.includes(r.vote as Vote)) return;
  if (r.event === "support_link" && !SUPPORT_FROM.includes(r.from as (typeof SUPPORT_FROM)[number])) return;
  if (r.event === "support_click" && !SUPPORT_AMOUNTS.includes(r.amount as (typeof SUPPORT_AMOUNTS)[number])) return;
  const favorite = r.event === "favorite_add" || r.event === "favorite_remove";
  if (favorite && (!FAVORITE_KINDS.includes(r.favoriteKind as FavoriteKind) || typeof r.favoriteId !== "string" || !CARD_ID.test(r.favoriteId))) return;
  if (r.event === "prova_tavolo" && (!TABLE_VOTES.includes(r.tableVote as TableVote) || !/^\/mostro\/[a-z0-9][a-z0-9-]{0,119}$/.test(r.path))) return;
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
    if (r.bio === true) input.bio = true;
  }
  if ((input.event === "page_view" || input.event === "search" || install) && Array.isArray(r.uses)) {
    const uses = [...new Set(r.uses.filter((use): use is UseSignal => USE_SIGNALS.includes(use as UseSignal)))];
    if (uses.length) input.uses = uses;
  }
  const lcp = r.lcp as { ms?: unknown; path?: unknown } | undefined;
  // With the page view only: it carries the kind of device («Lenta» counts the phones).
  if (input.event === "page_view" && lcp && typeof lcp.ms === "number" && Number.isFinite(lcp.ms) && lcp.ms >= 0 && lcp.ms <= 60000
    && typeof lcp.path === "string" && lcp.path.length <= 260 && ANALYTICS_PATH.test(lcp.path))
    input.lcp = { ms: Math.round(lcp.ms), path: lcp.path };
  if ((input.event === "page_view" || input.event === "search") && Array.isArray(r.filters)) {
    // Only the known groups, once each: never a value typed by the visitor.
    const groups = [...new Set(r.filters.filter((group): group is FilterGroup => FILTER_GROUPS.includes(group as FilterGroup)))];
    if (groups.length) input.filters = groups;
  }
  if ((input.event === "page_view" || install || appShare) && DEVICES.includes(r.device as Device)) input.device = r.device as Device;
  if (appShare && from && ["share_tap", "share_sent", "share_cancel"].includes(input.event)) input.from = from;
  if (input.event === "support_link") input.from = r.from as AnalyticsInput["from"];
  if (input.event === "support_click") input.amount = r.amount as number;
  if (input.event === "valutazione") input.vote = r.vote as Vote;
  if (input.event === "prova_tavolo") input.tableVote = r.tableVote as TableVote;
  if (favorite) {
    input.favoriteKind = r.favoriteKind as FavoriteKind;
    input.favoriteId = r.favoriteId as string;
  }
  if (input.event === "search") {
    const query = cleanSearchQuery(r.query);
    const results = typeof r.results === "number" ? Math.floor(r.results) : NaN;
    if (!query || !Number.isFinite(results) || results < 0 || results > 100000) return;
    input.query = query;
    input.results = results;
    if (SEARCH_AREAS.includes(r.area as SearchArea)) input.area = r.area as SearchArea;
  }
  return input;
}
