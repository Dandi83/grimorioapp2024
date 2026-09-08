"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { spells } from "@/lib/db/schema";
import {
  isAdmin,
  startAdminSession,
  endAdminSession,
  verifyPasscode,
} from "@/lib/admin-auth";
import { slugify } from "@/lib/spells-types";

export interface SpellInput {
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Non autorizzato");
}

function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const passcode = clean(formData.get("passcode"));
  if (!verifyPasscode(passcode)) {
    return { ok: false as const, error: "Passcode errata." };
  }
  await startAdminSession();
  revalidatePath("/admin");
  return { ok: true as const, error: null };
}

export async function logoutAction() {
  await endAdminSession();
  revalidatePath("/admin");
}

async function uniqueId(base: string, ignoreId?: string): Promise<string> {
  let id = base || "incantesimo";
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db
      .select({ id: spells.id })
      .from(spells)
      .where(eq(spells.id, id))
      .limit(1);
    if (existing.length === 0 || existing[0].id === ignoreId) return id;
    id = `${base}-${suffix++}`;
  }
}

function fromForm(formData: FormData): SpellInput {
  return {
    nome_italiano: clean(formData.get("nome_italiano")),
    livello: clean(formData.get("livello")),
    tempo_di_lancio: clean(formData.get("tempo_di_lancio")),
    gittata: clean(formData.get("gittata")),
    componenti: clean(formData.get("componenti")),
    durata: clean(formData.get("durata")),
    descrizione: clean(formData.get("descrizione")),
  };
}

export async function createSpellAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const input = fromForm(formData);
  if (!input.nome_italiano) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  const id = await uniqueId(slugify(input.nome_italiano));
  await db.insert(spells).values({
    id,
    ...input,
    sort_key: input.nome_italiano.toLowerCase(),
  });
  revalidatePath("/");
  revalidatePath("/grimorio");
  revalidatePath("/admin");
  revalidatePath(`/spell/${id}`);
  return { ok: true as const, error: null, id };
}

export async function updateSpellAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return { ok: false as const, error: "ID mancante." };
  const input = fromForm(formData);
  if (!input.nome_italiano) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  await db
    .update(spells)
    .set({
      ...input,
      sort_key: input.nome_italiano.toLowerCase(),
      updated_at: new Date(),
    })
    .where(eq(spells.id, id));
  revalidatePath("/");
  revalidatePath("/grimorio");
  revalidatePath("/admin");
  revalidatePath(`/spell/${id}`);
  return { ok: true as const, error: null, id };
}

export async function deleteSpellAction(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return;
  await db.delete(spells).where(eq(spells.id, id));
  revalidatePath("/");
  revalidatePath("/grimorio");
  revalidatePath("/admin");
}
