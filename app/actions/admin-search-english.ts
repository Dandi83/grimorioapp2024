"use server";

import { clean, requireAdmin } from "@/lib/admin-action-helpers";
import { approveSearchEnglish, approvedNameOf, discardSearchEnglish } from "@/lib/search-english-server";
import type { SearchEnglishKind } from "@/lib/search-english";
import { refreshEnglishNames } from "@/lib/search-english-refresh";
import { noSrdCard, type SearchEnglishCard } from "@/lib/search-english-cards";

/** «Nomi inglesi da verificare» (PROMPT 37): approve (as proposed or changed) or discard; only the approved reach the search. */
const kindOf = (value: FormDataEntryValue | null): SearchEnglishKind | null => (value === "incantesimo" || value === "mostro" ? value : null);

export type SearchEnglishResult = { ok: boolean; error?: string } | null;

export async function approveSearchEnglishAction(_prev: SearchEnglishResult, form: FormData): Promise<SearchEnglishResult> {
  await requireAdmin();
  const kind = kindOf(form.get("kind")), id = clean(form.get("id"));
  if (!kind || !id) return { ok: false, error: "Scheda non trovata." };
  const error = await approveSearchEnglish(kind, id, clean(form.get("nome")));
  if (error) return { ok: false, error };
  refreshEnglishNames(kind);
  return { ok: true };
}

export async function discardSearchEnglishAction(_prev: SearchEnglishResult, form: FormData): Promise<SearchEnglishResult> {
  await requireAdmin();
  const kind = kindOf(form.get("kind")), id = clean(form.get("id"));
  if (!kind || !id) return { ok: false, error: "Scheda non trovata." };
  await discardSearchEnglish(kind, id);
  refreshEnglishNames(kind);
  return { ok: true };
}

export interface SearchEnglishFieldData { name: string; card?: Pick<SearchEnglishCard, "nome" | "edizione" | "etichetta"> }

/**
 * The field «Nome inglese (solo ricerca)» of the editor, read when the editor opens, administrator only: the approved
 * name and, for its preview, the card as «Nomi inglesi da verificare» shows it (edition, «Invocazione · liv. 3»).
 */
export async function readSearchEnglishAction(kind: SearchEnglishKind, id: string): Promise<SearchEnglishFieldData> {
  await requireAdmin();
  if (!kindOf(kind) || !id) return { name: "" };
  const [name, card] = await Promise.all([approvedNameOf(kind, id), noSrdCard(kind, id).catch(() => undefined)]);
  return { name, ...(card ? { card: { nome: card.nome, edizione: card.edizione, etichetta: card.etichetta } } : {}) };
}
