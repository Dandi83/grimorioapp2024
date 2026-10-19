"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { spells } from "@/lib/db/schema";
import {
  startAdminSession,
  endAdminSession,
  verifyPasscode,
} from "@/lib/admin-auth";
import { clean, requireAdmin, uniqueId } from "@/lib/admin-action-helpers";
import { addressKey, clearLoginFailures, loginBlocked, recordLoginFailure } from "@/lib/admin-login-limit";
import { slugify } from "@/lib/spells-types";
import { deleteContentWithEdition } from "@/lib/content-editions";
import { saveAdminContent } from "@/lib/admin-content-save";
import { getSrdSource } from "@/lib/srd-descriptions";
import { getOriginalSource } from "@/lib/original-descriptions";

export interface SpellInput {
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
}

const TOO_MANY_ATTEMPTS = "Troppi tentativi. Riprova tra 15 minuti.";

export async function loginAction(_prev: unknown, formData: FormData) {
  const passcode = clean(formData.get("passcode"));
  const key = addressKey((await headers()).get("x-forwarded-for"));
  try {
    if (await loginBlocked(key)) return { ok: false as const, error: TOO_MANY_ATTEMPTS };
    if (!verifyPasscode(passcode)) {
      await recordLoginFailure(key);
      // A short pause slows automated guessing without bothering a person.
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ok: false as const, error: "Passcode errata." };
    }
    await clearLoginFailures(key);
  } catch {
    // Without the attempt counter the login stays closed.
    return { ok: false as const, error: "Accesso temporaneamente non disponibile. Riprova tra poco." };
  }
  await startAdminSession();
  revalidatePath("/admin");
  return { ok: true as const, error: null };
}

export async function logoutAction() {
  await endAdminSession();
  revalidatePath("/admin");
}

function revalidateSpell(id: string) {
  updateTag("spells");
  for (const route of ["/", "/grimorio", "/preferiti", "/admin", `/spell/${id}`]) revalidatePath(route);
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
  const id = await uniqueId("spell", slugify(input.nome_italiano));
  const result = await saveAdminContent("spell", id, formData, undefined, database => database.insert(spells).values({
    id,
    ...input,
    sort_key: input.nome_italiano.toLowerCase(),
  }));
  if (!result.ok) return result;
  revalidateSpell(id);
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
  const sourceEdition = getSrdSource(id, input.descrizione) || getOriginalSource(id, input.descrizione) ? "2024" : undefined;
  const result = await saveAdminContent("spell", id, formData, sourceEdition, async database => {
    const updated = await database.update(spells)
    .set({
      ...input,
      sort_key: input.nome_italiano.toLowerCase(),
      updated_at: new Date(),
    })
    .where(eq(spells.id, id)).returning({ id: spells.id });
    if (!updated.length) throw new Error("Scheda non trovata.");
  });
  if (!result.ok) return result;
  revalidateSpell(id);
  return { ok: true as const, error: null, id };
}

export async function deleteSpellAction(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return;
  await deleteContentWithEdition("spell", id);
  revalidateSpell(id);
}
