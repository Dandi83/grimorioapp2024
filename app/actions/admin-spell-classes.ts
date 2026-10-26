"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { applySpellClasses, type ApplyClassesResult } from "@/lib/spell-classes-2014";
import { CLASSES_2014 } from "@/lib/spell-classes-2014-plan";

/** «Applica» of the «Classi incantesimi 2014» box in /admin: administrator only (a Server Action is always a POST). */
export async function applySpellClassesAction(): Promise<ApplyClassesResult> {
  await requireAdmin();
  const result = await applySpellClasses();
  if (result.ok && (result.changed || result.renamed)) {
    // The cached pages that show these spells: lists, search, favorites, the cards, the cards that name them.
    updateTag("spells");
    for (const route of ["/", "/grimorio", "/preferiti", "/admin", "/admin/incantesimi", "/admin/registro", "/ricerca-indice.json", ...Object.keys(CLASSES_2014).map(id => `/spell/${id}`)]) revalidatePath(route);
    revalidatePath("/spell/[id]", "page");
    revalidatePath("/mostro/[id]", "page");
  }
  return result;
}
