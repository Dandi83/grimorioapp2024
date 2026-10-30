"use server";

import { revalidatePath } from "next/cache";
import { clean, requireAdmin } from "@/lib/admin-action-helpers";
import { addMarker, deleteMarker } from "@/lib/analytics";
import { excludeThisDevice } from "@/lib/analytics-exclusion";
import { addSynonym, addTodo, deleteSynonym, deleteTodo, searchWorld } from "@/lib/search-insights-server";
import { fold, rowsOf } from "@/lib/search";

export type MarkerResult = { ok: true } | { ok: false; error: string };

/** «+ Segna un evento»: a day, an optional hour (Rome, 0–23) and a short text on the statistics chart. Administrator only. */
export async function addMarkerAction(_: MarkerResult | null, form: FormData): Promise<MarkerResult> {
  await requireAdmin();
  const giorno = clean(form.get("giorno"));
  const etichetta = clean(form.get("etichetta")).replace(/\s+/g, " ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno) || new Date(`${giorno}T12:00:00Z`).toISOString().slice(0, 10) !== giorno) return { ok: false, error: "Data non valida." };
  if (etichetta.length < 2 || etichetta.length > 60) return { ok: false, error: "Scrivi un testo breve (da 2 a 60 caratteri)." };
  const hour = clean(form.get("ora"));
  if (hour && !/^(?:[01]?\d|2[0-3])$/.test(hour)) return { ok: false, error: "Ora non valida." };
  await addMarker(giorno, etichetta, hour ? Number(hour) : null);
  revalidatePath("/admin/statistiche");
  return { ok: true };
}

export async function deleteMarkerAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = clean(form.get("id"));
  if (/^[0-9a-f-]{36}$/i.test(id)) await deleteMarker(id);
  revalidatePath("/admin/statistiche");
}

/**
 * «Non contare questo dispositivo»: the device of this request never counts again (lib/analytics-exclusion.ts).
 * Also from the app installed on iPhone, which keeps its own cookies apart from Safari.
 */
export async function excludeDeviceAction(): Promise<void> {
  await requireAdmin();
  await excludeThisDevice();
  revalidatePath("/admin/statistiche");
}

/*
 * «Ricerche senza risultato» (PROMPT 31): a synonym (the word searched → a card, by its name in the public search)
 * and the list «Da fare». Administrator only; a synonym refreshes the index of the public search.
 */
export async function addSynonymAction(form: FormData): Promise<void> {
  await requireAdmin();
  const query = clean(form.get("query"));
  const name = clean(form.get("scheda"));
  const { publicIndex } = await searchWorld();
  const target = rowsOf(publicIndex).find(row => !row.alias && fold(row.nome) === fold(name));
  if (target) await addSynonym(query, target.href);
  revalidatePath("/admin/statistiche");
  revalidatePath("/ricerca-indice.json");
}

export async function deleteSynonymAction(form: FormData): Promise<void> {
  await requireAdmin();
  await deleteSynonym(clean(form.get("query")));
  revalidatePath("/admin/statistiche");
  revalidatePath("/ricerca-indice.json");
}

export async function addTodoAction(form: FormData): Promise<void> {
  await requireAdmin();
  await addTodo(clean(form.get("query")));
  revalidatePath("/admin/statistiche");
}

export async function deleteTodoAction(form: FormData): Promise<void> {
  await requireAdmin();
  await deleteTodo(clean(form.get("query")));
  revalidatePath("/admin/statistiche");
}
