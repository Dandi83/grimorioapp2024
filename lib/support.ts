import type { SUPPORT_FROM } from "./analytics-events";

/**
 * «Sostieni il Grimorio» (28 October 2026): the page of Ko-fi where a contribution is made. Nothing is paid on
 * this site and nothing is unlocked by a contribution.
 *
 * SUPPORT_URL is the switch: while it is empty the link of the Home, of /info and of the side column, the page
 * /sostieni (a plain 404) and the occasional card of the Home do not exist. Turned on on 28 October 2026 (PROMPT 9)
 * with the page of Daniele. Ko-fi documents no way to choose the amount in the address: the button opens the page.
 */
export const SUPPORT_URL = "https://ko-fi.com/ilgrimorioapp";

/** The address in use: only an https address counts, anything else (or nothing) turns «Sostieni» off. */
export function supportUrl(url: string = SUPPORT_URL): string {
  return /^https:\/\/[^\s"<>]+$/.test(url) ? url : "";
}

/** The three amounts of /sostieni; 3 € is chosen at the start. */
export const SUPPORT_AMOUNTS = [
  { value: 1, label: "un dado" },
  { value: 3, label: "un caffè" },
  { value: 5, label: "una pozione" },
] as const;
export const DEFAULT_AMOUNT = 3;
/** Where a «Sostieni il Grimorio» link was tapped: the Home, /info, the occasional card, the side column. */
export type SupportFrom = (typeof SUPPORT_FROM)[number];
