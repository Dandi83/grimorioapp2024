"use server";

import { revalidatePath } from "next/cache";
import { clean, requireAdmin } from "@/lib/admin-action-helpers";
import { addMarker, deleteMarker } from "@/lib/analytics";
import { excludeThisDevice } from "@/lib/analytics-exclusion";

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
