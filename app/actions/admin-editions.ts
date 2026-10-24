"use server";

import { revalidatePath, updateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { saveContentEdition } from "@/lib/content-editions";
import { getMonsterById } from "@/lib/monsters";
import { getSpellById } from "@/lib/spells";
import { getSrdMonsterSource } from "@/lib/srd-monsters";
import { getSrdSource } from "@/lib/srd-descriptions";
import { getOriginalSource } from "@/lib/original-descriptions";

type Result = { ok: boolean; error?: string };

export async function setContentEditionAction(_previous: Result | null, form: FormData): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorizzato." };
  const kind = form.get("kind"), id = form.get("id"), edition = form.get("edition");
  if ((kind !== "monster" && kind !== "spell") || typeof id !== "string" || !id.trim() || id.length > 200 ||
      (edition !== "" && edition !== "2014" && edition !== "2024")) {
    return { ok: false, error: "Seleziona un’edizione valida." };
  }
  let sourceEdition: string | undefined;
  if (kind === "monster") {
    const monster = await getMonsterById(id);
    if (!monster) return { ok: false, error: "Mostro non trovato." };
    sourceEdition = getSrdMonsterSource(monster)?.edition;
  } else {
    const spell = await getSpellById(id);
    if (!spell) return { ok: false, error: "Incantesimo non trovato." };
    if (getSrdSource(id, spell.descrizione) || getOriginalSource(id, spell.descrizione)) sourceEdition = "2024";
  }
  if (edition && sourceEdition && edition !== sourceEdition) {
    return { ok: false, error: `La fonte di questa scheda usa D&D ${sourceEdition}.` };
  }
  try {
    await saveContentEdition(kind, id, edition || undefined);
  } catch {
    return { ok: false, error: "Etichetta non salvata. Riprova." };
  }
  for (const route of ["/admin", "/admin/incantesimi", "/admin/mostri", "/bestiario", "/grimorio", "/preferiti", kind === "monster" ? `/mostro/${id}` : `/spell/${id}`]) {
    revalidatePath(route);
  }
  // A spell of the other edition is linked by the cards of that edition (lib/spell-reference-catalog.ts).
  if (kind !== "monster") {
    updateTag("spells");
    revalidatePath("/spell/[id]", "page");
    revalidatePath("/mostro/[id]", "page");
  }
  return { ok: true };
}
