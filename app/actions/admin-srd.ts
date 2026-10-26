"use server";

import { revalidatePath } from "next/cache";

import { updateSpellAction } from "@/app/actions/admin";
import { updateMonsterAction } from "@/app/actions/admin-monsters";
import { requireAdmin } from "@/lib/admin-action-helpers";
import { restoreEntries } from "@/lib/srd-modified";
import { getSrdModifiedCards } from "@/lib/srd-modified-server";

/**
 * «Ripristina testo SRD» (/admin/srd-modificate): the fields that differ get back the exact SRD value, nothing else
 * is sent. It goes through the save action of the editor (admin check, only changed fields written, Registro modifiche).
 * The differences are read again here: what the page showed may be old.
 */
export async function restoreSrdAction(kind: string, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const card = (await getSrdModifiedCards()).find(item => item.kind === kind && item.id === id);
  if (!card) return { ok: false, error: "La scheda coincide già con l’SRD: niente da ripristinare." };
  const form = new FormData();
  for (const [field, value] of restoreEntries(card)) form.set(field, value);
  const result = card.kind === "incantesimo" ? await updateSpellAction(null, form) : await updateMonsterAction(null, form);
  if (!result.ok) return { ok: false, error: result.error || "Ripristino non riuscito. Riprova tra poco." };
  revalidatePath("/admin/srd-modificate");
  revalidatePath("/admin");
  return { ok: true };
}
