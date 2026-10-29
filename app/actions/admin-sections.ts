"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { isPartId, isPublicSectionKey, sectionParts, type PublicSectionKey } from "@/lib/public-sections";
import { communityPublic } from "@/lib/community";
import { COMMUNITY_PART, SECTIONS_TAG, hiddenPartIds, isSectionState, setPartState, setSectionState, type SectionState } from "@/lib/section-visibility";

type SectionSwitchResult = { ok: true; hidden: boolean } | { ok: false; error: string };
type SectionStateResult = { ok: true; state: SectionState } | { ok: false; error: string };

/**
 * «Visibile · In arrivo · Nascosta» of a section (/admin/sezioni). Admin only. «In arrivo» keeps the content away
 * from the public like «Nascosta», but its entries stay and lead to the «in costruzione» page.
 */
export async function setSectionStateAction(key: string, state: string): Promise<SectionStateResult> {
  await requireAdmin();
  if (!isPublicSectionKey(key) || !isSectionState(state)) return { ok: false, error: "Sezione sconosciuta." };
  try {
    await setSectionState(key, state);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  await refreshPages();
  return { ok: true, state };
}

/** The three states of one part ("<section>:<part>"). Admin only. */
export async function setPartStateAction(id: string, state: string): Promise<SectionStateResult> {
  await requireAdmin();
  if (!isPartId(id) || !isSectionState(state)) return { ok: false, error: "Parte sconosciuta." };
  // «I mostri creati da voi» while lib/community.ts is off: only a new deploy turns it on.
  if (id === COMMUNITY_PART && !communityPublic()) return { ok: false, error: "Spenta dall’interruttore: si accende solo con un nuovo deploy." };
  const [section, part] = id.split(":");
  try {
    await setPartState(section as PublicSectionKey, part, state);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  await refreshPages();
  return { ok: true, state };
}

/**
 * Shows or hides a public section (/admin/sezioni and the «Mostra» link of the dark band).
 * Admin only; nothing else can change the state. The pages are refreshed at once: a hidden
 * section can appear in any page (bottom bar, Compendio, links inside the texts, search).
 */
export async function setSectionVisibilityAction(key: string, hidden: boolean): Promise<SectionSwitchResult> {
  await requireAdmin();
  if (!isPublicSectionKey(key) || typeof hidden !== "boolean") return { ok: false, error: "Sezione sconosciuta." };
  try {
    await setSectionState(key, hidden ? "nascosta" : "visibile");
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
    await setPartState(section as PublicSectionKey, part, hidden ? "nascosta" : "visibile");
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
