import type { SUPPORT_FROM } from "./analytics-events";

/**
 * «Sostieni il Grimorio» (28 October 2026): the page of Ko-fi where a contribution is made. Nothing is paid on
 * this site and nothing is unlocked by a contribution.
 *
 * SUPPORT_URL is the switch: while it is empty the link of the Home, of /info and of the side column, the page
 * /sostieni (a plain 404) and the occasional card of the Home do not exist. Write here the address of the Ko-fi page
 * (for example "https://ko-fi.com/…") to turn them on.
 */
export const SUPPORT_URL = "";

/**
 * The address in use. The browser tests give a made-up one through GRIMORIO_SUPPORT_URL_PROVA (e2e/run.mjs only),
 * never written in the code; on Vercel that variable does not exist.
 */
export function supportUrl(): string {
  const url = SUPPORT_URL || process.env.GRIMORIO_SUPPORT_URL_PROVA || "";
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
