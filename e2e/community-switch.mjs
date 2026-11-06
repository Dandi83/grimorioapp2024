import { readFileSync } from "node:fs";

// «I mostri creati da voi»: the switch of lib/community.ts as it is in this build (true since PROMPT 15). While it is
// off its part counts as hidden in /admin/sezioni.
export const COMMUNITY_ON = /COMMUNITY_PUBLIC = true;/.test(readFileSync("lib/community.ts", "utf8"));
/** The parts born «Nascosta» (lib/section-visibility.ts DEFAULT_PART_STATES): «Affrontalo in TPK» (PROMPT 69). */
export const DEFAULT_HIDDEN_PARTS = 1;
/**
 * «N parte nascosta / parti nascoste» of /admin/sezioni: the n hidden by the test, the parts born «Nascosta» and the
 * part of the switch when it is off.
 */
export const hiddenPartsText = n => {
  const total = n + DEFAULT_HIDDEN_PARTS + (COMMUNITY_ON ? 0 : 1);
  return `${total} ${total === 1 ? "parte nascosta" : "parti nascoste"}`;
};
