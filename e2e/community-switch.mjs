import { readFileSync } from "node:fs";

// «I mostri creati da voi»: the switch of lib/community.ts as it is in this build (true since PROMPT 15). While it is
// off its part counts as hidden in /admin/sezioni.
export const COMMUNITY_ON = /COMMUNITY_PUBLIC = true;/.test(readFileSync("lib/community.ts", "utf8"));
/** «N parte nascosta / parti nascoste» of /admin/sezioni, with the part of the switch when it is off. */
export const hiddenPartsText = n => {
  const total = n + (COMMUNITY_ON ? 0 : 1);
  return `${total} ${total === 1 ? "parte nascosta" : "parti nascoste"}`;
};
