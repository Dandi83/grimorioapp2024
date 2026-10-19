export const ANALYTICS_EVENTS = [
  "page_view",
  "card_open",
  "card_read",
  "share_click",
  "share_native",
  "share_copy",
  "share_cancel",
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
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseAnalyticsInput(raw: unknown): AnalyticsInput | undefined {
  if (!raw || typeof raw !== "object") return;
  const r = raw as Record<string, unknown>;
  if (
    !ANALYTICS_EVENTS.includes(r.event as AnalyticsEvent) ||
    ![r.id, r.view, r.session].every((v) => typeof v === "string" && UUID.test(v))
  )
    return;
  if (
    typeof r.path !== "string" ||
    r.path.length > 260 ||
    !/^\/(?:$|grimorio$|bestiario$|preferiti$|fonti$|privacy$|manuale(?:\/[^/?#]+)?$|spell\/[^/?#]+$|mostro\/[^/?#]+$)/.test(
      r.path,
    )
  )
    return;
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
  if (r.event !== "page_view" && !/^\/(spell|mostro)\//.test(r.path)) return;
  return {
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
}
