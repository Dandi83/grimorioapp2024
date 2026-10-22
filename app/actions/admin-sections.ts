"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { isPublicSectionKey } from "@/lib/public-sections";
import { SECTIONS_TAG, setSectionHidden } from "@/lib/section-visibility";

export type SectionSwitchResult = { ok: true; hidden: boolean } | { ok: false; error: string };

/**
 * Shows or hides a public section (/admin/sezioni and the «Mostra» link of the dark band).
 * Admin only; nothing else can change the state. The pages are refreshed at once: a hidden
 * section can appear in any page (bottom bar, Compendio, links inside the texts, search).
 */
export async function setSectionVisibilityAction(key: string, hidden: boolean): Promise<SectionSwitchResult> {
  await requireAdmin();
  if (!isPublicSectionKey(key) || typeof hidden !== "boolean") return { ok: false, error: "Sezione sconosciuta." };
  try {
    await setSectionHidden(key, hidden);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  // Preview mode: the administrator gets the pages rendered for them, hidden sections included.
  (await draftMode()).enable();
  updateTag(SECTIONS_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/ricerca-indice.json");
  return { ok: true, hidden };
}

/** «Mostra» in the dark band on the pages of a hidden section. */
export async function showSectionAction(formData: FormData): Promise<void> {
  const key = formData.get("sezione");
  await setSectionVisibilityAction(typeof key === "string" ? key : "", false);
}
