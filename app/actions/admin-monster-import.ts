"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { createHomebrew, getHomebrew, publishedHomebrew, updateHomebrew } from "@/lib/homebrew";
import { homebrewVerdict } from "@/lib/homebrew-balance";
import { foldName, isHomebrewId } from "@/lib/homebrew-types";
import { checkImport, draftChanges, type FieldChange, type ImportIssue } from "@/lib/monster-import";
import { setCardHidden, SECTIONS_TAG } from "@/lib/section-visibility";

/** The card that «Importa mostro» would overwrite: same address or same name. Only ours can be overwritten. */
type Existing = { id: string; nome: string; ours: boolean; changes: FieldChange[] };

export type ImportCheckResult = { errori: ImportIssue[]; avvisi: ImportIssue[]; id?: string; existing?: Existing };
export type ImportSaveResult =
  | { ok: true; id: string; created: boolean }
  | { ok: false; errori: ImportIssue[]; avvisi?: ImportIssue[] }
  | { ok: false; confirm: Existing };

async function findExisting(id: string, nome: string, draft: Parameters<typeof draftChanges>[1]): Promise<Existing | undefined> {
  const rows = await publishedHomebrew();
  const folded = foldName(nome);
  const row = rows.find(item => item.id === id) ?? rows.find(item => foldName(item.scheda.nome) === folded);
  if (!row) return undefined;
  return { id: row.id, nome: row.scheda.nome, ours: !row.autore, changes: draftChanges(row.scheda, draft) };
}

/** «Controlla»: errors and notices field by field, and the card it would overwrite. Nothing is saved. */
export async function checkImportAction(json: string): Promise<ImportCheckResult> {
  await requireAdmin();
  if (typeof json !== "string" || json.length > 200_000) return { errori: [{ campo: "json", messaggio: "Testo troppo lungo (al massimo 200.000 caratteri)." }], avvisi: [] };
  const check = checkImport(json);
  if (!check.draft || !check.id) return { errori: check.errori, avvisi: check.avvisi };
  return { errori: [], avvisi: check.avvisi, id: check.id, existing: await findExisting(check.id, check.draft.nome, check.draft) };
}

/**
 * «Salva»: a new creature «Dalla redazione», for 2014 and 2024, hidden from the public with the eye (shown by the
 * administrator when ready); its Bilanciamento computed as for the others. An existing card is never overwritten
 * without «Sovrascrivi» (overwrite: its id, from the summary shown): then its picture and its visibility stay.
 */
export async function saveImportAction(json: string, overwrite?: string): Promise<ImportSaveResult> {
  await requireAdmin();
  if (typeof json !== "string" || json.length > 200_000) return { ok: false, errori: [{ campo: "json", messaggio: "Testo troppo lungo (al massimo 200.000 caratteri)." }] };
  const check = checkImport(json);
  if (!check.draft || !check.id) return { ok: false, errori: check.errori, avvisi: check.avvisi };
  const existing = await findExisting(check.id, check.draft.nome, check.draft);
  if (existing && !existing.ours) return { ok: false, errori: [{ campo: "nome", messaggio: `Esiste già «${existing.nome}» dei mostri creati da voi (community): cambia nome o id.` }] };
  if (existing && overwrite !== existing.id) return { ok: false, confirm: existing };
  if (existing) {
    const before = await getHomebrew(existing.id);
    if (!before || before.autore) return { ok: false, errori: [{ campo: "scheda", messaggio: "La creatura da sovrascrivere non c’è più: controlla di nuovo." }] };
    const keep = before.scheda.immagine ? { immagine: before.scheda.immagine } : {};
    const draft = { ...check.draft, ...keep, ...(keep.immagine && !check.draft.immagine_alt && before.scheda.immagine_alt ? { immagine_alt: before.scheda.immagine_alt } : {}) };
    await updateHomebrew(existing.id, draft, homebrewVerdict(draft));
    refresh();
    return { ok: true, id: existing.id, created: false };
  }
  if (!isHomebrewId(check.id)) return { ok: false, errori: [{ campo: "id", messaggio: "id non valido." }] };
  const id = await createHomebrew(check.draft, homebrewVerdict(check.draft), check.id);
  // Hidden from the public until the administrator shows it with the eye.
  await setCardHidden({ tipo: "mostro", scheda: id, nome: check.draft.nome, edizione: "2014 e 2024" }, true);
  // As for the eye: the administrator sees the hidden card («Vedi scheda»), the public does not.
  (await draftMode()).enable();
  updateTag(SECTIONS_TAG);
  refresh();
  return { ok: true, id, created: true };
}

function refresh() {
  updateTag("monsters");
  revalidatePath("/", "layout");
  revalidatePath("/ricerca-indice.json");
}
