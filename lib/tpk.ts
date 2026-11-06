/**
 * Total Party Kill (TPK): where the Grimorio sends the players to create or play their characters (PROMPT 63).
 * One place for the address; a constant, not an environment variable (changing one would mean changing Vercel).
 * The Grimorio only opens TPK with links (new tab): nothing is loaded from there, so no CSP or CORS entry is needed.
 */
export const TPK_URL = "https://www.totalpartykill.app";

/** «＋ Crea il tuo personaggio»: the guided creation, which brings the character back to the Grimorio. */
export const TPK_CREATE_URL = `${TPK_URL}/crea?ritorno=grimorio`;

/** «Gioca in Total Party Kill»: the import page of TPK with the character in the address (#pg=…, from encodePg). */
export const tpkImportUrl = (hash: string) => `${TPK_URL}/importa${hash}`;

/**
 * «⚔ Affrontalo in Total Party Kill» (PROMPT 69): the summoning page of TPK with the creature ready to fight.
 * id: the public id of /mostro/<id> (2024, never «-2014»); «da=grimorio» tells TPK where the visitor comes from.
 */
export const tpkSummonUrl = (id: string) => `${TPK_URL}/evoca?mostro=${encodeURIComponent(id)}&da=grimorio`;
