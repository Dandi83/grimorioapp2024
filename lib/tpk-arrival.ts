import { TPK_ARRIVAL } from "./tpk";

/**
 * PROMPT 70: a page of the Grimorio opened from Total Party Kill («?da=tpk», any public page). Read once, as soon as the
 * code runs in the browser (before the address is cleaned), and kept for the life of the page: the invite to install
 * (components/install-prompt.tsx), the edition 2024 without the welcome screen (components/edition/edition-provider.tsx)
 * and the origin «Total Party Kill» of the statistics (components/analytics-provider.tsx) all ask here.
 * Nothing is saved: a later visit without the mark is a normal visit.
 */
const PARAM = "da";
let arrived: boolean | undefined;

/** True when this page was opened with «?da=tpk». Always false on the server. */
export function tpkArrived(): boolean {
  if (typeof window === "undefined") return false;
  arrived ??= new URLSearchParams(window.location.search).get(PARAM) === TPK_ARRIVAL;
  return arrived;
}

/** The address without «da=tpk» (the other parameters and the #hash kept): what «Copia il link» copies. */
export function withoutTpkMark(href: string): string {
  try {
    const url = new URL(href);
    if (url.searchParams.get(PARAM) !== TPK_ARRIVAL) return href;
    url.searchParams.delete(PARAM);
    return url.toString();
  } catch {
    return href;
  }
}

/** Takes «da=tpk» off the address without reloading (history.replaceState): a link shared later stays clean. */
export function dropTpkMark() {
  if (typeof window === "undefined") return;
  const clean = withoutTpkMark(window.location.href);
  if (clean === window.location.href) return;
  const url = new URL(clean);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

// As soon as the code of the page runs: the mark is read before anything takes it off the address.
tpkArrived();
