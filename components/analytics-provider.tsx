"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { AnalyticsEvent, AnalyticsInput } from "@/lib/analytics-events";
import { BIO_VALUE, deviceOf, originOf, type Origin } from "@/lib/analytics-stats";
import { PENDING_FILTERS, PENDING_USES } from "@/components/statistics/use-report-search";
import { useUserEdition } from "@/components/edition/edition-provider";
import { setAdminDevice, setStatisticsCounted, setStatisticsNotice } from "@/components/statistics/notice";
import { recordVisitDay } from "@/components/home/rating-store";
import { FRIEND_PARAM, FRIEND_VALUE } from "@/lib/share-app";

type Consent = "accepted" | "rejected";
type Status = { enabled: boolean; excluded: boolean; consent: Consent | null };
/** A choice made elsewhere (the switch of /privacy): the provider follows it at once. */
export const CHOICE_EVENT = "grimorio:analytics-choice";
const SESSION = "grimorio_statistics_session";
/** The LCP measured (PROMPT 32), waiting for the next page view; whether this visit is in the sample of 1 in 10. */
const PENDING_LCP = "grimorio_statistics_lcp";
const LCP_SAMPLE = "grimorio_statistics_lcp_sample";
/** Reads and empties a list kept for the next event. */
function take(key: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    sessionStorage.removeItem(key);
    return value;
  } catch { return null; }
}
/**
 * «Lenta» (PROMPT 32): on 1 visit in 10, the LCP of the first page with the browser's own PerformanceObserver, kept
 * when the visitor first touches the page or leaves it; it rides with the next page view, no request of its own.
 */
function measureLcp() {
  try {
    let sampled = sessionStorage.getItem(LCP_SAMPLE);
    if (sampled === null) sessionStorage.setItem(LCP_SAMPLE, (sampled = Math.random() < 0.1 ? "1" : "0"));
    if (sampled !== "1" || !PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) return;
  } catch { return; }
  const path = window.location.pathname;
  let last = 0;
  const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) last = entry.startTime; });
  observer.observe({ type: "largest-contentful-paint", buffered: true });
  const keep = () => {
    observer.disconnect();
    for (const name of ["pointerdown", "keydown", "visibilitychange"]) window.removeEventListener(name, keep, true);
    try { if (last) sessionStorage.setItem(PENDING_LCP, JSON.stringify({ ms: Math.round(last), path })); } catch {}
  };
  for (const name of ["pointerdown", "keydown", "visibilitychange"]) window.addEventListener(name, keep, { capture: true, once: true });
}
/** The first opening of the installed app was sent from this browser (the server keeps it once per visitor too). */
const APP_OPENED = "grimorio_statistics_app_opened";

/** «?da=amico» and «?da=bio» leave the address once read: a link shared again, or saved in the favourites, does not carry them. */
function dropFriendMark() {
  const url = new URL(window.location.href);
  if (![FRIEND_VALUE, BIO_VALUE].includes(url.searchParams.get(FRIEND_PARAM) ?? "")) return;
  url.searchParams.delete(FRIEND_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
/** Saves the choice («Ok» = "accepted", «No» = "rejected") and tells the provider. */
export async function saveStatisticsChoice(consent: Consent): Promise<boolean> {
  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent }),
    });
    if (!response.ok) return false;
    window.dispatchEvent(new CustomEvent(CHOICE_EVENT, { detail: consent }));
    return true;
  } catch {
    return false;
  }
}

/**
 * The statistics of the site, counted by default from the first page (28 October 2026), except who presses «No»
 * on the bar or turns off «Contami nelle statistiche» in /privacy. The thin bar at the bottom says so once, after
 * the welcome screen; the invite to install the app waits for it (components/statistics/notice.ts).
 */
export function AnalyticsProvider() {
  const path = usePathname();
  const { ready, firstLaunch } = useUserEdition();
  const [status, setStatus] = useState<Status | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const enabled = useRef(false);
  const measuring = useRef(false);
  useEffect(() => {
    // The days the site was opened, on this browser only: the question of the Home comes from the 3rd.
    recordVisitDay();
    const controller = new AbortController();
    fetch("/api/analytics", { cache: "no-store", signal: controller.signal })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => { if (!controller.signal.aborted) setStatus({ enabled: false, excluded: false, consent: null }); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const chosen = (event: Event) => {
      const consent = (event as CustomEvent).detail;
      if (consent !== "accepted" && consent !== "rejected") return;
      setStatus((old) => (old ? { ...old, consent } : old));
      // «No» stops at once; «Ok» changes nothing in the counting.
      if (consent === "rejected") {
        enabled.current = false;
        try {
          // The session and everything waiting for the next event go away with it.
          for (const key of [SESSION, PENDING_FILTERS, PENDING_USES, PENDING_LCP, LCP_SAMPLE]) sessionStorage.removeItem(key);
        } catch {}
      }
    };
    window.addEventListener(CHOICE_EVENT, chosen);
    return () => window.removeEventListener(CHOICE_EVENT, chosen);
  }, []);
  // Counted unless «No»: without waiting for an answer.
  const accepted = !!status?.enabled && !status.excluded && status.consent !== "rejected";
  useEffect(() => {
    setStatisticsCounted(status === null ? null : accepted);
    setAdminDevice(status === null ? null : status.excluded);
    // Not counted: the friend's mark goes away all the same, without being sent.
    if (status !== null && !accepted) dropFriendMark();
  }, [status, accepted]);
  useEffect(() => {
    enabled.current = accepted;
    return () => {
      enabled.current = false;
    };
  }, [accepted]);
  useEffect(() => {
    if (
      !accepted ||
      path.startsWith("/admin") ||
      path.startsWith("/account") ||
      path.startsWith("/personaggi")
    )
      return;
    // The LCP of the first page, only for a counted visit (buffered: what happened before the answer is not lost).
    if (!measuring.current) {
      measuring.current = true;
      measureLcp();
    }
    const view = crypto.randomUUID();
    let session: string,
      isTest = false,
      origin: Origin = "diretto";
    // Where the session started from: only the category (lib/analytics-stats.ts), never the referrer.
    const arrival = () => originOf(document.referrer, window.location.search, window.location.hostname);
    try {
      const old = JSON.parse(sessionStorage.getItem(SESSION) || "null") as {
        id?: string;
        last?: number;
        test?: boolean;
        origin?: Origin;
      } | null;
      const recent = old?.id && old.last && Date.now() - old.last < 30 * 60 * 1000;
      session = recent ? old.id! : crypto.randomUUID();
      origin = recent && old?.origin ? old.origin : arrival();
      isTest =
        new URLSearchParams(window.location.search).get("analytics_test") === "1" ||
        !!(recent && old?.test);
      sessionStorage.setItem(
        SESSION,
        JSON.stringify({ id: session, last: Date.now(), test: isTest, origin }),
      );
    } catch {
      session = crypto.randomUUID();
      isTest = new URLSearchParams(window.location.search).get("analytics_test") === "1";
      origin = arrival();
    }
    const source =
      new URLSearchParams(window.location.search).get("ref") === "share"
        ? ("share" as const)
        : ("direct" as const);
    const card = !!document.querySelector("article.spell-sheet,article.monster-sheet");
    let seconds = 0,
      scroll = 0,
      read = false,
      lastInteraction = Date.now(),
      lastTick = Date.now(),
      live = true;
    // Kind of device and app opened from the Home screen: categories only, never the user agent.
    const device = deviceOf(navigator.userAgent, navigator.maxTouchPoints);
    const installed = window.matchMedia?.("(display-mode: standalone)").matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Arrived from the link of the Instagram bio (?da=bio): said with the first page view, then the mark goes away.
    const bio = new URLSearchParams(window.location.search).get(FRIEND_PARAM) === BIO_VALUE;
    function send(event: AnalyticsEvent, extra: Partial<AnalyticsInput> = {}) {
      if (!enabled.current || !live) return Promise.resolve(false);
      // The groups of filters applied since the last event (components/statistics/use-report-search.ts) ride along.
      const carries = event === "page_view" || event === "search";
      const filters: AnalyticsInput["filters"] = carries ? take(PENDING_FILTERS) : undefined;
      // The uses (PROMPT 32) also with the installation; the LCP with the page view only.
      const uses: AnalyticsInput["uses"] = carries || event === "app_installed" ? take(PENDING_USES) : undefined;
      const lcp: AnalyticsInput["lcp"] = event === "page_view" ? take(PENDING_LCP) : undefined;
      const body: AnalyticsInput = {
        event,
        id: crypto.randomUUID(),
        view,
        session,
        path,
        test: isTest,
        source,
        activeSeconds: Math.floor(seconds),
        scrollPercent: Math.floor(scroll),
        ...(event === "page_view" ? { origin, device, installed, ...(bio ? { bio: true as const } : {}) } : {}),
        ...(filters?.length ? { filters } : {}),
        ...(uses?.length ? { uses } : {}),
        ...(lcp ? { lcp } : {}),
        ...(event === "app_installed" || event === "first_standalone_open" ? { device } : {}),
        ...extra,
      };
      return fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).then(response => response.ok, () => false);
    }
    function measureScroll() {
      const article = document.querySelector("article.spell-sheet,article.monster-sheet");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      scroll = Math.max(
        scroll,
        Math.min(100, Math.max(0, ((window.innerHeight - rect.top) / rect.height) * 100)),
      );
    }
    const interact = () => {
      lastInteraction = Date.now();
      measureScroll();
    };
    const visibility = () => {
      lastTick = Date.now();
      if (document.visibilityState === "visible") lastInteraction = Date.now();
    };
    const share = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const name = detail?.event as AnalyticsEvent;
      // The whole app shared (lib/share-app.ts): from the card of the Home or the invite after «Bene».
      if ((name === "share_tap" || name === "share_sent" || name === "share_cancel") && ["home", "valutazione", "sostieni"].includes(detail.from))
        void send(name, { from: detail.from, device });
      // The face tapped on the Home (components/home/rating-box.tsx): only the vote and the kind of device.
      else if (name === "valutazione" && ["male", "cosi-cosi", "bene"].includes(detail.vote)) void send("valutazione", { vote: detail.vote, device });
      // «Sostieni il Grimorio» (components/support): the link with where it was, the page, the Ko-fi button with the amount.
      else if (name === "support_link" && typeof detail.from === "string") void send("support_link", { from: detail.from, device });
      else if (name === "support_click" && typeof detail.amount === "number") void send("support_click", { amount: detail.amount, device });
      // A star (components/favorites-provider.tsx): the kind and the id of the card, from any page.
      else if ((name === "favorite_add" || name === "favorite_remove") && typeof detail.kind === "string" && typeof detail.id === "string")
        void send(name, { favoriteKind: detail.kind, favoriteId: detail.id, device });
      else if (["share_click", "share_native", "share_copy", "share_cancel"].includes(name)) void send(name);
      // «L'hai provato al tavolo?» (components/homebrew/table-test.tsx): the vote of this card; the box hears back when it is saved.
      else if (name === "prova_tavolo" && ["facile", "giusto", "difficile"].includes(detail.vote))
        void send("prova_tavolo", { tableVote: detail.vote }).then(ok => window.dispatchEvent(new CustomEvent("grimorio:prova-tavolo-salvata", { detail: { ok } })));
      // A search (components/statistics/use-report-search.ts): the word and how many results it gave.
      else if (name === "search" && typeof detail.query === "string" && typeof detail.results === "number") void send("search", { query: detail.query, results: detail.results, area: detail.area });
    };
    // A page that does not exist (PROMPT 32): «not_found» in place of the page view, with the path asked only.
    if (document.querySelector("[data-not-found]")) void send("not_found");
    else {
      void send("page_view");
      if (card) void send("card_open");
    }
    // /sostieni opened (canvas «Sostieni il Grimorio»): sent here, with the page view, so it is never lost.
    if (path === "/sostieni") void send("support_page", { device });
    // Arrived from a friend's link (?da=amico): counted once per person by the server, then the mark goes away.
    if (new URLSearchParams(window.location.search).get(FRIEND_PARAM) === FRIEND_VALUE) {
      void send("arrivo_da_amico", { device });
      dropFriendMark();
    }
    if (bio) dropFriendMark();
    // Installations: the browser says so (Android, Chrome and Edge on a computer); on iPhone, where Safari says
    // nothing, the first opening from the icon. Once per device here, once per visitor on the server.
    const appInstalled = () => void send("app_installed");
    window.addEventListener("appinstalled", appInstalled);
    let opened = true;
    try {
      opened = localStorage.getItem(APP_OPENED) === "1";
    } catch {}
    if (installed && !opened)
      void send("first_standalone_open").then(ok => {
        if (ok)
          try {
            localStorage.setItem(APP_OPENED, "1");
          } catch {}
      });
    measureScroll();
    const timer = window.setInterval(() => {
      const now = Date.now(),
        delta = Math.min(2, (now - lastTick) / 1000);
      lastTick = now;
      if (document.visibilityState !== "visible" || now - lastInteraction > 60000) return;
      seconds += delta;
      measureScroll();
      if (card && !read && seconds >= 20 && scroll >= 50) {
        read = true;
        void send("card_read");
      }
    }, 1000);
    for (const name of ["scroll", "pointerdown", "keydown", "touchstart"])
      window.addEventListener(name, interact, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("grimorio:analytics-event", share);
    return () => {
      live = false;
      clearInterval(timer);
      for (const name of ["scroll", "pointerdown", "keydown", "touchstart"])
        window.removeEventListener(name, interact);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("grimorio:analytics-event", share);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, [accepted, path]);
  // The bar: once (until «Ok» or «No»), never over the welcome screen nor in the reserved area.
  const due = !!status?.enabled && !status.excluded && status.consent === null;
  const show = due && ready && !firstLaunch && !path.startsWith("/admin");
  useEffect(() => {
    setStatisticsNotice(status === null ? "waiting" : due ? "open" : "closed");
  }, [status, due]);
  // While the bar is shown the page keeps room for it at the bottom (app/globals.css).
  useEffect(() => {
    if (!show) return;
    document.documentElement.dataset.statisticsRoom = "";
    return () => { delete document.documentElement.dataset.statisticsRoom; };
  }, [show]);
  async function choose(consent: Consent) {
    setSaving(true);
    setError("");
    if (consent === "rejected") enabled.current = false;
    if (!(await saveStatisticsChoice(consent))) setError("Scelta non salvata. Riprova.");
    setSaving(false);
  }
  return show ? (
    <aside
      role="region"
      aria-label="Statistiche anonime"
      data-statistics-bar=""
      className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-50 bg-[#2B2118] text-[#F6EFDF] shadow-[0_-4px_14px_rgb(43_33_24_/_25%)] lg:bottom-0 lg:left-[240px]"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
        <p className="min-w-0 flex-1 text-[16px] leading-tight">
          Statistiche anonime?{" "}
          <Link href="/privacy" prefetch={false} className="inline-flex min-h-11 items-center font-semibold text-[#E0A21A] underline underline-offset-4">
            Info
          </Link>
          {error && <span role="alert" className="block text-[13px] text-[#F6EFDF]">{error}</span>}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void choose("rejected")}
          className="min-h-11 shrink-0 rounded-full border-[1.5px] border-[#6B5432] px-4 text-[16px] font-semibold text-[#F6EFDF] disabled:opacity-50"
        >
          No
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void choose("accepted")}
          className="min-h-11 shrink-0 rounded-full bg-[#E0A21A] px-5 text-[16px] font-bold text-[#2B2118] disabled:opacity-50"
        >
          Ok
        </button>
      </div>
    </aside>
  ) : null;
}
