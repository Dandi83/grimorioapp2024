"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode, headers } from "next/headers";
import { eq } from "drizzle-orm";

import { spells } from "@/lib/db/schema";
import {
  startAdminSession,
  endAdminSession,
  verifyPasscode,
} from "@/lib/admin-auth";
import { clean, requireAdmin, uniqueId, type DeleteResult } from "@/lib/admin-action-helpers";
import { addressKey, clientAddress, clearLoginFailures, loginBlocked, recordLoginFailure } from "@/lib/admin-login-limit";
import { slugify } from "@/lib/spells-types";
import { deleteContentWithEdition } from "@/lib/content-editions";
import { saveAdminContent } from "@/lib/admin-content-save";
import { getSrdSource } from "@/lib/srd-descriptions";
import { getOriginalSource } from "@/lib/original-descriptions";
import { editorLogReady, logEditorSave } from "@/lib/editor-log";
import { changedSpellFields, SPELL_EDITOR_FIELDS } from "@/lib/spell-update";
import { db } from "@/lib/db";

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
  const key = addressKey(clientAddress(await headers()));
  try {
    if (await loginBlocked(key)) return { ok: false as const, error: TOO_MANY_ATTEMPTS };
    if (!verifyPasscode(passcode)) {
      await recordLoginFailure(key);
      // A short pause slows automated guessing without bothering a person.
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ok: false as const, error: "Passcode errata." };
    }
    await clearLoginFailures(key);
    await startAdminSession();
    // Preview mode: the public pages are rendered for the administrator, hidden sections included (/admin/sezioni).
    (await draftMode()).enable();
  } catch {
    // Without the attempt counter or the session list the login stays closed.
    return { ok: false as const, error: "Accesso temporaneamente non disponibile. Riprova tra poco." };
  }
  revalidatePath("/admin");
  return { ok: true as const, error: null };
}

export async function logoutAction() {
  await endAdminSession();
  (await draftMode()).disable();
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
  // Fields missing from the form stay as they are: only what was sent can change.
  const sent: Partial<SpellInput> = {};
  for (const field of SPELL_EDITOR_FIELDS) if (formData.has(field)) sent[field] = clean(formData.get(field));
  if (sent.nome_italiano !== undefined && !sent.nome_italiano) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  const [stored] = await db.select().from(spells).where(eq(spells.id, id)).limit(1);
  if (!stored) return { ok: false as const, error: "Scheda non trovata." };
  // A save rewrites only the fields that really changed: the others keep their exact bytes.
  const changes = changedSpellFields(stored, sent);
  const description = changes.descrizione ?? stored.descrizione ?? "";
  const sourceEdition = getSrdSource(id, description) || getOriginalSource(id, description) ? "2024" : undefined;
  const logged = await editorLogReady();
  const result = await saveAdminContent("spell", id, formData, sourceEdition, async database => {
    // Every changed field goes to the Registro modifiche, where it can be undone.
    if (logged) await logEditorSave(database, "incantesimi", id, changes);
    const updated = await database.update(spells)
    .set({
      ...changes,
      ...(changes.nome_italiano ? { sort_key: changes.nome_italiano.toLowerCase() } : {}),
      updated_at: new Date(),
    })
    .where(eq(spells.id, id)).returning({ id: spells.id });
    if (!updated.length) throw new Error("Scheda non trovata.");
  });
  if (!result.ok) return result;
  revalidateSpell(id);
  return { ok: true as const, error: null, id };
}

export async function deleteSpellAction(formData: FormData): Promise<DeleteResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return { ok: false, error: "ID mancante." };
  try {
    await deleteContentWithEdition("spell", id);
  } catch {
    return { ok: false, error: "Eliminazione non riuscita: la scheda è ancora presente. Riprova." };
  }
  revalidateSpell(id);
  return { ok: true };
}
