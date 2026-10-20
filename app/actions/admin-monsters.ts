"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";

import { monsters } from "@/lib/db/schema";
import { clean, requireAdmin, uniqueId, type DeleteResult } from "@/lib/admin-action-helpers";
import { monsterSlugify, parseGs } from "@/lib/monsters-types";
import { deleteContentWithEdition } from "@/lib/content-editions";
import { saveAdminContent } from "@/lib/admin-content-save";
import { db } from "@/lib/db";
import { getSrdMonsterSource, previewMonsterById, usesLegacyMonsterRules } from "@/lib/srd-monsters";
import { monsterExtraFieldsFromForm } from "@/lib/monster-extra-fields";
import { saveMonsterExtraFields } from "@/lib/monster-extra-storage";
import { habitatsFromForm } from "@/lib/habitats";
import { saveMonsterHabitats } from "@/lib/monster-habitats";

function num(v: FormDataEntryValue | null, fallback = 10): number {
  const n = parseInt(clean(v), 10);
  return Number.isNaN(n) ? fallback : n;
}

function fromForm(formData: FormData) {
  return {
    nome: clean(formData.get("nome")),
    tipo: clean(formData.get("tipo")),
    taglia: clean(formData.get("taglia")),
    allineamento: clean(formData.get("allineamento")),
    grado_sfida: clean(formData.get("grado_sfida")),
    px: clean(formData.get("px")),
    classe_armatura: clean(formData.get("classe_armatura")),
    punti_ferita: clean(formData.get("punti_ferita")),
    velocita: clean(formData.get("velocita")),
    forza: num(formData.get("forza")),
    destrezza: num(formData.get("destrezza")),
    costituzione: num(formData.get("costituzione")),
    intelligenza: num(formData.get("intelligenza")),
    saggezza: num(formData.get("saggezza")),
    carisma: num(formData.get("carisma")),
    tiri_salvezza: clean(formData.get("tiri_salvezza")),
    abilita: clean(formData.get("abilita")),
    vulnerabilita: clean(formData.get("vulnerabilita")),
    resistenze: clean(formData.get("resistenze")),
    immunita_danni: clean(formData.get("immunita_danni")),
    immunita_condizioni: clean(formData.get("immunita_condizioni")),
    sensi: clean(formData.get("sensi")),
    linguaggi: clean(formData.get("linguaggi")),
    tratti: clean(formData.get("tratti")),
    azioni: clean(formData.get("azioni")),
    reazioni: clean(formData.get("reazioni")),
    azioni_leggendarie: clean(formData.get("azioni_leggendarie")),
    descrizione: clean(formData.get("descrizione")),
  };
}

function revalidateMonster(id: string) {
  updateTag("monsters");
  revalidatePath("/bestiario");
  revalidatePath("/preferiti");
  revalidatePath("/admin");
  revalidatePath(`/mostro/${id}`);
}

export async function createMonsterAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const input = fromForm(formData);
  if (!input.nome) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  const id = await uniqueId("monster", monsterSlugify(input.nome));
  const result = await saveAdminContent("monster", id, formData, undefined, async database => {
    await database.insert(monsters).values({ id, ...input, sort_key: input.nome.toLowerCase() });
    await saveMonsterExtraFields(database, id, monsterExtraFieldsFromForm(formData));
    await saveMonsterHabitats(database, id, habitatsFromForm(formData));
  });
  if (!result.ok) return result;
  revalidateMonster(id);
  return { ok: true as const, error: null, id };
}

export async function updateMonsterAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return { ok: false as const, error: "ID mancante." };
  const input = fromForm(formData);
  if (!input.nome) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  const extraFields = monsterExtraFieldsFromForm(formData);
  const habitats = habitatsFromForm(formData);
  // A sheet that exists only in the project files is not in the database:
  // only its habitat (and matching edition label) is saved, the text stays the official one.
  const inDatabase = (await db.select({ id: monsters.id }).from(monsters).where(eq(monsters.id, id)).limit(1)).length > 0;
  if (!inDatabase && previewMonsterById(id, process.env.VERCEL_ENV)) {
    const projectEdition = usesLegacyMonsterRules({ id }) ? "2014" : "2024";
    const saved = await saveAdminContent("monster", id, formData, projectEdition, database => saveMonsterHabitats(database, id, habitats));
    if (!saved.ok) return saved;
    revalidateMonster(id);
    return { ok: true as const, error: null, id };
  }
  const sourceEdition = getSrdMonsterSource({ ...input, ...extraFields, id, gs_num: parseGs(input.grado_sfida) })?.edition;
  const result = await saveAdminContent("monster", id, formData, sourceEdition, async database => {
    const updated = await database.update(monsters)
    .set({
      ...input,
      sort_key: input.nome.toLowerCase(),
      updated_at: new Date(),
    })
    .where(eq(monsters.id, id)).returning({ id: monsters.id });
    if (!updated.length) throw new Error("Scheda non trovata.");
    await saveMonsterExtraFields(database, id, extraFields);
    await saveMonsterHabitats(database, id, habitats);
  });
  if (!result.ok) return result;
  revalidateMonster(id);
  return { ok: true as const, error: null, id };
}

export async function deleteMonsterAction(formData: FormData): Promise<DeleteResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return { ok: false, error: "ID mancante." };
  try {
    await deleteContentWithEdition("monster", id);
  } catch {
    return { ok: false, error: "Eliminazione non riuscita: la scheda è ancora presente. Riprova." };
  }
  revalidateMonster(id);
  return { ok: true };
}
