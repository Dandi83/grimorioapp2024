"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { isPartId, isPublicSectionKey, sectionParts, type PublicSectionKey } from "@/lib/public-sections";
import { SECTIONS_TAG, hiddenPartIds, setPartHidden, setSectionHidden } from "@/lib/section-visibility";

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
  await refreshPages();
  return { ok: true, hidden };
}

/** Shows or hides one part of a section ("<section>:<part>", lib/public-sections.ts). Admin only. */
export async function setPartVisibilityAction(id: string, hidden: boolean): Promise<SectionSwitchResult> {
  await requireAdmin();
  if (!isPartId(id) || typeof hidden !== "boolean") return { ok: false, error: "Parte sconosciuta." };
  const [section, part] = id.split(":");
  try {
    await setPartHidden(section as PublicSectionKey, part, hidden);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  await refreshPages();
  return { ok: true, hidden };
}

async function refreshPages() {
  // Preview mode: the administrator gets the pages rendered for them, hidden sections and parts included.
  (await draftMode()).enable();
  updateTag(SECTIONS_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/ricerca-indice.json");
}

/**
 * «Mostra» in the dark band on the pages of a hidden section: the section, or, when the pages are
 * hidden because all the parts of a set are (both editions, all the blocks), those parts.
 */
export async function showSectionAction(formData: FormData): Promise<void> {
  const key = formData.get("sezione");
  const section = typeof key === "string" ? key : "";
  await setSectionVisibilityAction(section, false);
  if (!isPublicSectionKey(section)) return;
  const hiddenParts = await hiddenPartIds();
  const sets = new Set(sectionParts(section).filter(part => part.set && hiddenParts.includes(`${section}:${part.key}`)).map(part => part.set));
  for (const part of sectionParts(section)) {
    if (!part.set || !sets.has(part.set)) continue;
    const others = sectionParts(section).filter(other => other.set === part.set);
    if (others.every(other => hiddenParts.includes(`${section}:${other.key}`))) await setPartVisibilityAction(`${section}:${part.key}`, false);
  }
}

/** «Mostra» next to a hidden part, on the public pages seen by the administrator. */
export async function showPartAction(formData: FormData): Promise<void> {
  const id = formData.get("parte");
  await setPartVisibilityAction(typeof id === "string" ? id : "", false);
}
