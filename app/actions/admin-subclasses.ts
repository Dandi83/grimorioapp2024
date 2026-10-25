"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { SECTIONS_TAG, setCardHidden } from "@/lib/section-visibility";
import { parseSubclassDraft } from "@/lib/subclass-types";
import { createSubclass, deleteSubclass, getSubclass, updateSubclass } from "@/lib/subclasses";

export type SubclassResult = { ok: true; id: string } | { ok: false; error: string };

/** The sheet of the class and the admin page of the class: the selector and the list change. */
async function refresh(classe: string) {
  (await draftMode()).enable();
  updateTag(SECTIONS_TAG);
  revalidatePath(`/classi/${classe}`);
  revalidatePath(`/admin/contenuti/classi/${classe}`);
}

/** «+ Nuova sottoclasse»: saved, then hidden at once (the eye of single cards), until the administrator shows it. */
export async function createSubclassAction(draft: unknown): Promise<SubclassResult> {
  await requireAdmin();
  const checked = parseSubclassDraft(draft);
  if (!checked.ok) return checked;
  let id: string;
  try {
    id = await createSubclass(checked.draft);
    await setCardHidden({ tipo: "sottoclasse", scheda: id, nome: checked.draft.nome, edizione: checked.draft.edizione }, true);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  await refresh(checked.draft.classe);
  return { ok: true, id };
}

/** Corrections from the editor: the address, the class and the edition stay the same; its visibility too. */
export async function updateSubclassAction(id: string, draft: unknown): Promise<SubclassResult> {
  await requireAdmin();
  const current = await getSubclass(String(id));
  if (!current) return { ok: false, error: "Sottoclasse non trovata." };
  const checked = parseSubclassDraft({ ...(draft as object), classe: current.classe, edizione: current.edizione });
  if (!checked.ok) return checked;
  try {
    await updateSubclass(current.id, checked.draft);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  await refresh(current.classe);
  return { ok: true, id: current.id };
}

/** The bin of the admin list: the subclass leaves the site and its row; the log keeps «eliminata». */
export async function deleteSubclassAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = formData.get("id");
  const deleted = typeof id === "string" ? await deleteSubclass(id).catch(() => undefined) : undefined;
  if (!deleted) return { ok: false, error: "Sottoclasse non trovata." };
  await refresh(deleted.classe);
  return { ok: true };
}
