/**
 * Edition of the admin area (2024 | 2014): one switch at the top of every admin page, remembered in a
 * cookie set only for the administrator. It only filters what is shown: no data changes, and every
 * correction still applies to the card and the edition it is made on.
 * Pure module: the layout, the pages and the tests share it.
 */

export type AdminEdition = "2024" | "2014";
export const ADMIN_EDITIONS: readonly AdminEdition[] = ["2024", "2014"];
export const ADMIN_EDITION_COOKIE = "__Host-grimorio_admin_edizione";

export function parseAdminEdition(value: unknown): AdminEdition {
  return value === "2014" ? "2014" : "2024";
}

export function isAdminEdition(value: unknown): value is AdminEdition {
  return value === "2014" || value === "2024";
}

/** The cookie of the edition: set only after the login check (setAdminEditionAction, /admin/edizione). */
export function adminEditionCookieOptions() {
  const isDev = process.env.NODE_ENV !== "production";
  return { httpOnly: true, secure: true, path: "/", sameSite: isDev ? "none" : "strict", maxAge: 365 * 24 * 3600 } as const;
}

/** Colors of each edition and the text of its half of the switch when it is the one being edited. */
export const EDITION_BAND: Record<AdminEdition, { background: string; text: string; label: string }> = {
  "2024": { background: "#7A1F2B", text: "#FFFBF0", label: "Stai modificando il 2024" },
  "2014": { background: "#2D4C7A", text: "#FFFBF0", label: "Stai modificando il 2014" },
};

/** Pages shared by the two editions: «Comune alle due edizioni» instead of the switch. */
const COMMON = ["/admin/segnalazioni", "/admin/notifiche", "/admin/statistiche", "/admin/sezioni", "/admin/proposte"];

export function isCommonAdminPath(pathname: string): boolean {
  return COMMON.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

/** Spells: 2014 only when labelled so (as in the public list), every other spell is 2024. */
export function spellEdition(spell: { edizione?: string | null }): AdminEdition {
  return spell.edizione === "2014" ? "2014" : "2024";
}

/**
 * Registro modifiche: the lines of the chosen edition, plus those shared by both (a section shown or
 * hidden); «Tutte le edizioni» shows everything.
 */
export function inAdminEdition(itemEdition: AdminEdition | null | undefined, edition: AdminEdition, all = false): boolean {
  return all || !itemEdition || itemEdition === edition;
}
