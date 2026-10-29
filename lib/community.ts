/**
 * «I mostri creati da voi» (PROMPT 13): the creatures proposed by the community (the old Homebrew collection) and the
 * form to propose one.
 *
 * COMMUNITY_PUBLIC is the switch, like SUPPORT_URL in lib/support.ts: while it is false the visitors see nothing of the
 * section (no card in the Bestiario, no category, no rows in the lists, the search and Preferiti; the section, the form
 * and the sheets answer 404; the proposals API answers 403). The administrator sees everything, with the «Nascosta» bar.
 * It acts as the part «bestiario:homebrew» hidden (lib/section-visibility.ts), so every place that already hides a
 * hidden part follows it. Turned on with a new deploy, by Daniele: on since 29 October 2026 (PROMPT 15, «Beta»).
 */
export const COMMUNITY_PUBLIC = true;

/**
 * The switch in use. The browser tests only (never on Vercel) can turn it on with GRIMORIO_COMMUNITY_TEST_PUBLIC=on
 * (e2e/run.mjs --community-public), to check what the visitors will see once it is on.
 */
export function communityPublic(value: boolean = COMMUNITY_PUBLIC): boolean {
  return value || (!process.env.VERCEL && process.env.GRIMORIO_COMMUNITY_TEST_PUBLIC === "on");
}
