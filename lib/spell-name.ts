/**
 * The name of a spell as the Italian manual writes it: only the first letter capital («Palla di fuoco»,
 * «Parola del potere stordire»), the proper names kept («Mano di Bigby», «Risata incontenibile di Tasha»).
 * Display only: the stored names (often in capitals) are never rewritten. Checked against the SRD spellings
 * of the whole catalog by tests/spell-name.cjs.
 */

/** Proper names in the spell names of the catalog (and of the D&D spells that may be added). */
const PROPER: Record<string, string> = {
  agathys: "Agathys", bigby: "Bigby", drawmij: "Drawmij", evard: "Evard", hadar: "Hadar", jallarzi: "Jallarzi",
  leomund: "Leomund", melf: "Melf", mordenkainen: "Mordenkainen", nystul: "Nystul", otiluke: "Otiluke",
  rary: "Rary", tasha: "Tasha", tenser: "Tenser", yolande: "Yolande", abi: "Abi", dalzhel: "Dalzhel",
  aganazzar: "Aganazzar", maximilian: "Maximilian", snilloc: "Snilloc", tiamat: "Tiamat", bahamut: "Bahamut",
  // «0TILUKE» (a zero) in two stored names: shown as the manual prints it.
  "0tiluke": "Otiluke",
};

/**
 * edition: the two manuals differ only after a slash, «Antipatia/Simpatia» (SRD 5.1, 2014) and
 * «Antipatia/simpatia» (SRD 5.2.1, 2024); without an edition, the 2024 spelling.
 */
export function spellName(name: string, edition?: string): string {
  if (!name) return name;
  const lower = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("it");
  const words = lower.replace(/[\p{L}\p{N}]+/gu, (word, offset: number) =>
    PROPER[word] ?? (word === "otto" && /\bdi $/.test(lower.slice(0, offset)) ? "Otto" : word));
  const first = words.replace(/\p{L}/u, letter => letter.toLocaleUpperCase("it"));
  return edition === "2014" ? first.replace(/\/(\p{L})/gu, (_all, letter: string) => `/${letter.toLocaleUpperCase("it")}`) : first;
}
