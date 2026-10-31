"use server";

import { revalidatePath } from "next/cache";
import { clean, requireAdmin } from "@/lib/admin-action-helpers";
import { approveSearchEnglish, approvedNameOf, discardSearchEnglish } from "@/lib/search-english-server";
import type { SearchEnglishKind } from "@/lib/search-english";

/** «Nomi inglesi da verificare» (PROMPT 37): approve (as proposed or changed) or discard; only the approved reach the search. */
const kindOf = (value: FormDataEntryValue | null): SearchEnglishKind | null => (value === "incantesimo" || value === "mostro" ? value : null);

export async function refreshSearchEnglish() {
  // Called by the save of the editor (app/actions/admin.ts, admin-monsters.ts) after the session check.
  await requireAdmin();
  refresh();
}

function refresh() {
  revalidatePath("/admin/contenuti/nomi-inglesi");
  revalidatePath("/admin/contenuti");
  revalidatePath("/ricerca-indice.json");
  revalidatePath("/admin/statistiche");
}

export type SearchEnglishResult = { ok: boolean; error?: string } | null;

export async function approveSearchEnglishAction(_prev: SearchEnglishResult, form: FormData): Promise<SearchEnglishResult> {
  await requireAdmin();
  const kind = kindOf(form.get("kind")), id = clean(form.get("id"));
  if (!kind || !id) return { ok: false, error: "Scheda non trovata." };
  const error = await approveSearchEnglish(kind, id, clean(form.get("nome")));
  if (error) return { ok: false, error };
  refresh();
  return { ok: true };
}

export async function discardSearchEnglishAction(_prev: SearchEnglishResult, form: FormData): Promise<SearchEnglishResult> {
  await requireAdmin();
  const kind = kindOf(form.get("kind")), id = clean(form.get("id"));
  if (!kind || !id) return { ok: false, error: "Scheda non trovata." };
  await discardSearchEnglish(kind, id);
  refresh();
  return { ok: true };
}

/** The value of the field «Nome inglese (solo ricerca)» of the editor: read when the editor opens, administrator only. */
export async function readSearchEnglishAction(kind: SearchEnglishKind, id: string): Promise<string> {
  await requireAdmin();
  return kindOf(kind) && id ? approvedNameOf(kind, id) : "";
}
