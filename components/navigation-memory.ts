"use client";

// Remembers in-app navigation, so the back button and the catalogs know whether
// the previous page belongs to the site (shared links open without one).
let depth = 0;
let lastPopstate = 0;
let popPending = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopstate = Date.now();
    popPending = true;
  });
}

/** Called on every pathname change after the first page. */
export function notePathChange() {
  if (popPending) {
    popPending = false;
    depth = Math.max(0, depth - 1);
  } else {
    depth += 1;
  }
}

export function hasInAppHistory(): boolean {
  if (depth > 0) return true;
  // After a full reload the counter restarts: trust a same-site referrer.
  try {
    return window.history.length > 1 && document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** True while rendering the page reached by a browser or in-app "back" navigation. */
export function returningBack(): boolean {
  return popPending && Date.now() - lastPopstate < 3000;
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
