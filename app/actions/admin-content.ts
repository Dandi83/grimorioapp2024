"use server";

import { revalidatePath, updateTag } from "next/cache";

import { clean, requireAdmin } from "@/lib/admin-action-helpers";
import { activeOverrideMap, overrideKey } from "@/lib/content-overrides-apply";
import { OVERRIDES_TAG, allOverrides, saveOverrides, undoOverride, type OverrideChange } from "@/lib/content-overrides";
import { cardFields, isContentEdition, sectionSpec } from "@/lib/content-sections";
import { fieldError, normalizeValue, reasonError } from "@/lib/content-validate";
import { db } from "@/lib/db";
import { ensureEditorLogTable, undoEditorChange, type UndoResult } from "@/lib/editor-log";
import { dropSpellRowLikeFile } from "@/lib/spells";

export type ContentActionResult = { ok: true; message: string } | { ok: false; error: string; fields?: Record<string, string> };

/** Public pages, search index and admin pages of the card: refreshed at once after a change. */
function refresh(sezione: string, id: string) {
  updateTag(OVERRIDES_TAG);
  for (const path of [...(sectionSpec(sezione)?.paths(id) ?? []), "/ricerca-indice.json", "/admin", "/admin/registro", `/admin/contenuti/${sezione}`]) revalidatePath(path);
}

/**
 * Saves the corrections of one card in one edition. Only the fields the section declares,
 * each checked by kind; a field equal to the printed value undoes its correction.
 */
export async function saveContentAction(_prev: unknown, formData: FormData): Promise<ContentActionResult> {
  await requireAdmin();
  const section = sectionSpec(clean(formData.get("sezione")));
  const id = clean(formData.get("id"));
  const edizione = clean(formData.get("edizione"));
  if (!section || !isContentEdition(edizione) || !section.editions.includes(edizione)) return { ok: false, error: "Sezione o edizione sconosciuta." };
  const original = section.original(id, edizione);
  if (!original) return { ok: false, error: "Scheda sconosciuta." };
  const motivo = normalizeValue("longtext", typeof formData.get("motivo") === "string" ? String(formData.get("motivo")) : "");

  const active = activeOverrideMap((await allOverrides()).filter(row => row.sezione === section.key && row.scheda_id === id));
  const changes: OverrideChange[] = [];
  const fields: Record<string, string> = {};
  for (const field of cardFields(section, original, id, edizione)) {
    const raw = formData.get(`campo:${field.name}`);
    if (typeof raw !== "string") continue;
    const value = normalizeValue(field.kind, raw);
    const current = active.get(overrideKey(section.key, id, edizione, field.name));
    const shown = current ? current.valore_nuovo : original[field.name];
    if (value === shown) continue;
    if (value === original[field.name]) {
      changes.push({ sezione: section.key, scheda_id: id, edizione, campo: field.name, valore_originale: original[field.name], valore_nuovo: null });
      continue;
    }
    const error = fieldError(field, value);
    if (error) fields[field.name] = error;
    else changes.push({ sezione: section.key, scheda_id: id, edizione, campo: field.name, valore_originale: original[field.name], valore_nuovo: value });
  }
  if (Object.keys(fields).length) return { ok: false, error: "Controlla i campi segnati.", fields };
  if (!changes.length) return { ok: false, error: "Nessun valore è cambiato." };
  const reason = reasonError(motivo);
  if (reason) return { ok: false, error: reason, fields: { motivo: reason } };
  try {
    await saveOverrides(changes, motivo);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  refresh(section.key, id);
  const restored = changes.filter(change => change.valore_nuovo === null).length;
  return { ok: true, message: `Salvato: ${changes.length - restored} ${changes.length - restored === 1 ? "modifica" : "modifiche"}${restored ? `, ${restored} ${restored === 1 ? "valore riportato" : "valori riportati"} all'originale` : ""}.` };
}

/** «Annulla modifica» in the log: the card shows the printed value again. */
export async function undoContentAction(formData: FormData): Promise<ContentActionResult> {
  await requireAdmin();
  const row = await undoOverride(clean(formData.get("id")));
  if (!row) return { ok: false, error: "Modifica non trovata o già annullata." };
  refresh(row.sezione, row.scheda_id);
  return { ok: true, message: "Modifica annullata: la scheda mostra di nuovo il valore del manuale." };
}

/** «Annulla modifica» of a spell or creature editor change: the previous value goes back in the database. */
export async function undoEditorAction(formData: FormData): Promise<ContentActionResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  let result: UndoResult;
  try {
    await ensureEditorLogTable();
    // A spell card of the project files back to exactly its file values is read from the file again.
    result = await db.transaction(database => undoEditorChange(database, id, async (tx, row) => {
      if (row.sezione === "incantesimi") await dropSpellRowLikeFile(tx, row.scheda_id);
    }));
  } catch {
    return { ok: false, error: "Annullamento non riuscito. Riprova tra poco." };
  }
  if (!result.ok) return result;
  const { sezione, scheda_id } = result.row;
  updateTag(sezione === "incantesimi" ? "spells" : "monsters");
  const pages = sezione === "incantesimi" ? ["/", "/grimorio", "/preferiti", `/spell/${scheda_id}`, "/admin/incantesimi"] : ["/bestiario", "/preferiti", `/mostro/${scheda_id}`, "/admin/mostri"];
  for (const path of [...pages, "/ricerca-indice.json", "/admin", "/admin/registro"]) revalidatePath(path);
  return { ok: true, message: "Modifica annullata: la scheda ha di nuovo il valore precedente." };
}
