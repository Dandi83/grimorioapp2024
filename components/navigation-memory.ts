"use client";

// Remembers in-app navigation, so the back button and the catalogs know whether
// the previous page belongs to the site (shared links open without one).
let depth = 0;
let lastPopstate = 0;
let popPending = false;
/** The pages of this visit, in order (in-app steps only): the last one is the page shown. */
const trail: string[] = [];
/** A list opened by the back button in place of the admin area: restored as after «indietro». */
const RESTORE = "grimorio:ripristina-elenco";

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopstate = Date.now();
    popPending = true;
  });
}

/** Called with the first page, then on every pathname change. */
export function notePathChange(pathname?: string) {
  if (pathname !== undefined && trail.length === 0) {
    trail.push(pathname);
    return;
  }
  if (popPending) {
    popPending = false;
    depth = Math.max(0, depth - 1);
    trail.pop();
  } else {
    depth += 1;
    if (pathname !== undefined) trail.push(pathname);
  }
}

/** The page before this one: the previous in-app step, else (after a full load) the same-site referrer. */
export function previousPath(): string | undefined {
  if (depth > 0 && trail.length > 1) return trail[trail.length - 2];
  const context = returnedContext();
  if (context) return context.previous;
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    return referrer && referrer.origin === window.location.origin ? referrer.pathname : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The back button leaves the admin area out: the list of the section opens instead, with the search and
 * filters it was left with (its saved address), restored as after «indietro».
 */
export function listInsteadOfAdmin(list: string): string {
  try {
    window.sessionStorage.setItem(RESTORE, "1");
    const key = list === "/grimorio" ? "grimorio" : list === "/bestiario" ? "bestiario" : undefined;
    const saved = key ? readListState<{ url?: string }>(key) : null;
    return saved?.url?.startsWith("?") ? `${list}${saved.url}` : list;
  } catch {
    return list;
  }
}

/**
 * A page left by a full load (the editor of «Modifica») and shown again by «indietro» starts a new document
 * without its trail: what it knew is kept here, by address, and read back only on such a return.
 */
const CONTEXT = "grimorio:contesto-pagina";
type PageContext = { path: string; inApp: boolean; previous?: string };

export function savePageContext() {
  try {
    const context: PageContext = { path: window.location.pathname, inApp: hasInAppHistory(), previous: previousPath() };
    window.sessionStorage.setItem(CONTEXT, JSON.stringify(context));
  } catch { /* no storage */ }
}

function returnedContext(): PageContext | null {
  if (depth > 0 || trail.length > 1) return null;
  try {
    const [entry] = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entry?.type !== "back_forward") return null;
    const context = JSON.parse(window.sessionStorage.getItem(CONTEXT) || "null") as PageContext | null;
    return context?.path === window.location.pathname ? context : null;
  } catch {
    return null;
  }
}

export function hasInAppHistory(): boolean {
  if (depth > 0) return true;
  const context = returnedContext();
  if (context) return context.inApp;
  // After a full reload the counter restarts: trust a same-site referrer.
  try {
    return window.history.length > 1 && document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** True while rendering the page reached by a browser or in-app "back" navigation (or by the back button in place of the admin area). */
export function returningBack(): boolean {
  if (popPending && Date.now() - lastPopstate < 3000) return true;
  // The first page of a document loaded by «indietro» (the browser did not keep it in memory).
  if (depth === 0 && trail.length <= 1) {
    try {
      const [entry] = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (entry?.type === "back_forward") return true;
    } catch { /* no timing */ }
  }
  try {
    if (window.sessionStorage.getItem(RESTORE)) {
      window.sessionStorage.removeItem(RESTORE);
      return true;
    }
  } catch { /* no storage */ }
  return false;
}

export function saveListState<T>(key: string, state: T) {
  try {
    window.sessionStorage.setItem(`grimorio:list:${key}`, JSON.stringify(state));
  } catch {
    // unavailable storage: the list simply starts from the top
  }
}

export function readListState<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(`grimorio:list:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
