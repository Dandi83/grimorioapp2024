"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { monsters } from "@/lib/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { monsterSlugify } from "@/lib/monsters-types";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Non autorizzato");
}

function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: FormDataEntryValue | null, fallback = 10): number {
  const n = parseInt(clean(v), 10);
  return Number.isNaN(n) ? fallback : n;
}

async function uniqueId(base: string, ignoreId?: string): Promise<string> {
  let id = base || "mostro";
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db
      .select({ id: monsters.id })
      .from(monsters)
      .where(eq(monsters.id, id))
      .limit(1);
    if (existing.length === 0 || existing[0].id === ignoreId) return id;
    id = `${base}-${suffix++}`;
  }
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
  revalidatePath("/bestiario");
  revalidatePath("/admin");
  revalidatePath(`/mostro/${id}`);
}

export async function createMonsterAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const input = fromForm(formData);
  if (!input.nome) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  const id = await uniqueId(monsterSlugify(input.nome));
  await db.insert(monsters).values({
    id,
    ...input,
    sort_key: input.nome.toLowerCase(),
  });
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
  await db
    .update(monsters)
    .set({
      ...input,
      sort_key: input.nome.toLowerCase(),
      updated_at: new Date(),
    })
    .where(eq(monsters.id, id));
  revalidateMonster(id);
  return { ok: true as const, error: null, id };
}

export async function deleteMonsterAction(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return;
  await db.delete(monsters).where(eq(monsters.id, id));
  revalidatePath("/bestiario");
  revalidatePath("/admin");
}
