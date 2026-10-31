"use server";

import { editorSearchEnglish } from "@/lib/search-english-server";
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
import { deleteContentWithEdition, getContentEditions, getOriginalSummaries, summaryFromForm } from "@/lib/content-editions";
import { saveAdminContent } from "@/lib/admin-content-save";
import { getSrdSource } from "@/lib/srd-descriptions";
import { getOriginalSource, originalEdition } from "@/lib/original-descriptions";
import { editorLogReady, logEditorSave } from "@/lib/editor-log";
import { changedSpellFields, SPELL_EDITOR_FIELDS } from "@/lib/spell-update";
import { db } from "@/lib/db";
import { getSpellById, publicSpellOfRow, spellCardSource, spellFileRow } from "@/lib/spells";
import { spellSrdDifferences } from "@/lib/srd-modified";
import { getLegacySpellSource, isLegacySpellId } from "@/lib/srd-spells-2014";
import { excludeThisDevice } from "@/lib/analytics-exclusion";
import { spellHref } from "@/lib/spell-public-id";

interface SpellInput {
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
    // A device where the administrator logged in never counts in the statistics, also after the logout.
    await excludeThisDevice().catch(() => {});
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
  for (const route of ["/", "/grimorio", "/preferiti", "/admin", spellHref(id), "/ricerca-indice.json"]) revalidatePath(route);
  // Every card may name this spell (lib/spell-reference-catalog.ts): its links follow a new name, edition or card at once.
  revalidatePath("/spell/[id]", "page");
  revalidatePath("/mostro/[id]", "page");
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
  // «Nome inglese (solo ricerca)» (PROMPT 37): a protected name refuses the whole save.
  const english = editorSearchEnglish(formData);
  if (english.error) return { ok: false as const, error: english.error };
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
  if (await english.apply("incantesimo", id)) refreshSearchIndex();
  return { ok: true as const, error: null, id };
}

/** The editor asks before a save that takes the SRD box away (components/admin-srd-warning.tsx). */
const SRD_WARNING = { ok: false as const, error: "", srdWarning: true as const };

/**
 * True when the card has the SRD box now and would lose it with these changes: the same comparison as the box
 * and as «Schede SRD modificate» (lib/srd-modified.ts), on the card as the public sees it.
 */
function losesSrdBox(base: Parameters<typeof publicSpellOfRow>[0], changes: Partial<SpellInput>): boolean {
  const matches = (row: Parameters<typeof publicSpellOfRow>[0]) => spellSrdDifferences(publicSpellOfRow(row) as unknown as Parameters<typeof spellSrdDifferences>[0])?.length === 0;
  return matches(base) && !matches({ ...base, ...changes });
}

export async function updateSpellAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  // «Nome inglese (solo ricerca)» (PROMPT 37): a protected name refuses the whole save.
  const english = editorSearchEnglish(formData);
  if (english.error) return { ok: false as const, error: english.error };
  const id = clean(formData.get("id"));
  if (!id) return { ok: false as const, error: "ID mancante." };
  // Fields missing from the form stay as they are: only what was sent can change.
  const sent: Partial<SpellInput> = {};
  for (const field of SPELL_EDITOR_FIELDS) if (formData.has(field)) sent[field] = clean(formData.get(field));
  if (sent.nome_italiano !== undefined && !sent.nome_italiano) {
    return { ok: false as const, error: "Il nome è obbligatorio." };
  }
  const [stored] = await db.select().from(spells).where(eq(spells.id, id)).limit(1);
  // A card still only in the project files (2014 SRD, SRD 2024 additions): the file values are the
  // starting point, and its first real change creates the database row.
  const fileRow = stored ? undefined : spellFileRow(id);
  const base = stored ?? fileRow;
  if (!base) return { ok: false as const, error: "Scheda non trovata." };
  // A save rewrites only the fields that really changed: the others keep their exact bytes.
  const changes = changedSpellFields(base, sent);
  const description = changes.descrizione ?? base.descrizione ?? "";
  const sourceEdition = getSrdSource(id, description) ? "2024" : getOriginalSource(id, description) ? originalEdition(id) : undefined;
  // Nothing changed (fields and edition label): nothing is written, no row, no label, no log.
  const label = (await getContentEditions("spell", id)).get(id);
  const edition = formData.get("edition");
  // The edition the public list gives the card: its label, else 2014 for the SRD 5.1 cards, else 2024.
  const current = label ?? (isLegacySpellId(id) || originalEdition(id) === "2014" ? "2014" : "2024");
  const sameEdition = edition === null || (edition === "" ? !label : edition === current);
  // «Sintesi originale»: only for a card added here (an SRD card or one of the project summaries has its own origin).
  if (fileRow || spellCardSource({ id, descrizione: description }) !== "Aggiunta da te") formData.delete("sintesi-campo");
  const summary = summaryFromForm(formData);
  const sameSummary = summary === undefined || summary === (await getOriginalSummaries("spell", id)).has(id);
  if (!Object.keys(changes).length && sameEdition && sameSummary) {
    if (await english.apply("incantesimo", id)) refreshSearchIndex();
    return { ok: true as const, error: null, id };
  }
  // A change that would take the SRD box away is saved only after «Salva comunque» (the editor sends «perdi-srd»).
  if (!formData.has("perdi-srd") && Object.keys(changes).length && losesSrdBox(base, changes)) return SRD_WARNING;
  // The edition the card already has is not stored again as a manual label.
  if (sameEdition) formData.delete("edition");
  const logged = await editorLogReady();
  const result = await saveAdminContent("spell", id, formData, sourceEdition, async database => {
    if (fileRow) {
      if (!Object.keys(changes).length) return;
      await database.insert(spells).values({ ...fileRow, id, sort_key: fileRow.nome_italiano.toLowerCase() });
    }
    // Every changed field goes to the Registro modifiche (before = the stored or file value), where it can be undone.
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
  if (await english.apply("incantesimo", id)) refreshSearchIndex();
  return { ok: true as const, error: null, id };
}

export async function deleteSpellAction(formData: FormData): Promise<DeleteResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) return { ok: false, error: "ID mancante." };
  // SRD cards are corrected, never deleted (the list has no «Elimina» for them; this also stops a direct call).
  const spell = await getSpellById(id);
  if (spell && (getLegacySpellSource(spell) || getSrdSource(id, spell.descrizione))) {
    return { ok: false, error: "Le schede SRD non si eliminano: si possono solo correggere." };
  }
  try {
    await deleteContentWithEdition("spell", id);
  } catch {
    return { ok: false, error: "Eliminazione non riuscita: la scheda è ancora presente. Riprova." };
  }
  revalidateSpell(id);
  return { ok: true };
}

/** The search index and «Nomi inglesi da verificare» after a change of the English name «solo ricerca». */
function refreshSearchIndex() {
  revalidatePath("/ricerca-indice.json");
  revalidatePath("/admin/contenuti/nomi-inglesi");
}
