import { createHash } from "node:crypto";
import repairs from "./data/spell-text-repairs-20261021.json";

type TextRepair = { sha256: string; sostituzioni: { da: string; a: string }[] };
const texts: Record<string, TextRepair> = repairs.testi;

/**
 * Display-only repair of approved description typos: the database is never written.
 * The text is replaced only while the whole description is still exactly the damaged one,
 * so any later edit made in the reserved area wins.
 */
export function repairSpellText(id: string, description: string): string {
  const repair = texts[id];
  if (!repair || !description || createHash("sha256").update(description).digest("hex") !== repair.sha256) return description;
  return repair.sostituzioni.reduce((text, { da, a }) => text.replace(da, () => a), description);
}

export const spellTextRepairs = repairs;
