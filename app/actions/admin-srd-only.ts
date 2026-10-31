"use server";

import { draftMode } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-action-helpers";
import { SECTIONS_TAG } from "@/lib/section-visibility";
import { setSrdOnly } from "@/lib/srd-only";

export type SrdOnlyResult = { ok: boolean; attiva?: boolean; quanti?: number; error?: string } | null;

/**
 * «Modalità solo SRD» (PROMPT 39): «Conferma» after «Attiva» or «Disattiva». Every public page, the search index and
 * the catalogs are made again at once (the hidden cards of lib/section-visibility.ts), as for a section hidden.
 */
export async function setSrdOnlyAction(_prev: SrdOnlyResult, form: FormData): Promise<SrdOnlyResult> {
  await requireAdmin();
  const attiva = form.get("attiva") === "1";
  let quanti = 0;
  try {
    ({ quanti } = await setSrdOnly(attiva));
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  // The administrator keeps seeing everything, with «Nascosta» (preview mode, as for the sections).
  (await draftMode()).enable();
  updateTag(SECTIONS_TAG);
  updateTag("spells");
  updateTag("monsters");
  revalidatePath("/", "layout");
  revalidatePath("/ricerca-indice.json");
  return { ok: true, attiva, quanti };
}
