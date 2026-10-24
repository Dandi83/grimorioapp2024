// «Modifica» on the public pages, for the administrator only: where each card is corrected and the way
// back to the page. Pure helpers, safe in client components and tests.

import type { Edition } from "./public-sections";

/**
 * Hint cookie set at login and removed at logout, readable by the page: only tells the browser that
 * asking the server is worth it (visitors never ask). It grants nothing: the server checks the session
 * (/api/admin/sessione) before any button is drawn, and every editor checks it again.
 */
export const ADMIN_HINT_COOKIE = "grimorio_admin_ui";

/**
 * The card a «Modifica» button opens: a spell or a creature (/admin/incantesimi/<id>, /admin/mostri/<id>,
 * with the edition of the card when it has one), or a card of /admin/contenuti.
 */
export type AdminEditTarget =
  | { kind: "incantesimo"; id: string; edition?: Edition }
  | { kind: "mostro"; id: string; edition?: Edition }
  | { kind: "contenuto"; section: string; id: string; edition: Edition };

/**
 * A path of this site to come back to, or undefined: only "/…" addresses (never "//host", "/\host",
 * schemes or control characters), returned as path, query and fragment.
 */
export function safeReturnPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  if (value.length > 600 || /[\u0000-\u001f\u007f\\]/.test(value)) return undefined;
  try {
    const base = "https://grimorio.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

/** The editor of a card, opened directly, with the page to come back to (when it is a path of the site). */
export function adminEditHref(target: AdminEditTarget, ritorno?: string): string {
  const back = safeReturnPath(ritorno);
  const params = new URLSearchParams();
  let path: string;
  if (target.kind === "contenuto") {
    path = `/admin/contenuti/${encodeURIComponent(target.section)}/${encodeURIComponent(target.id)}`;
    params.set("edizione", target.edition);
  } else {
    // The editor as its own page: drawn by the server at once, never the list of the admin area first.
    path = `${target.kind === "incantesimo" ? "/admin/incantesimi" : "/admin/mostri"}/${encodeURIComponent(target.id)}`;
    if (target.edition) params.set("impostata", "1");
  }
  if (back) params.set("ritorno", back);
  const query = params.toString();
  const editor = query ? `${path}?${query}` : path;
  // With the card's edition: the admin area moves to it on the way (a redirect, no page in between).
  return target.kind !== "contenuto" && target.edition
    ? `/admin/edizione?${new URLSearchParams({ valore: target.edition, poi: editor })}`
    : editor;
}
