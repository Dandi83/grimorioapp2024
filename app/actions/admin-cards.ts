"use server";

import { revalidatePath, updateTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { getMonsterListIndex } from "@/lib/monster-index";
import { SECTIONS_TAG, setCardHidden, type CardKind } from "@/lib/section-visibility";
import { getSpellIndex } from "@/lib/spell-index";
import { getSubclass } from "@/lib/subclasses";
import { spellName } from "@/lib/spell-name";

type CardSwitchResult = { ok: true; hidden: boolean } | { ok: false; error: string };

/** The card as the public catalog has it (database rows and SRD files): no invented ids. */
async function catalogCard(kind: CardKind, id: string) {
  if (kind === "incantesimo") {
    const spell = (await getSpellIndex()).find(item => item.id === id);
    return spell && { nome: spellName(spell.nome_italiano, spell.edizione), edizione: spell.edizione === "2014" ? "2014" : "2024" };
  }
  if (kind === "sottoclasse") {
    const subclass = await getSubclass(id);
    return subclass && { nome: subclass.scheda.nome, edizione: subclass.edizione };
  }
  const monster = (await getMonsterListIndex()).find(item => item.id === id);
  return monster && { nome: monster.nome, edizione: monster.edizione };
}

/**
 * The eye of /admin/incantesimi, /admin/mostri, of the added subclasses and of the editors: hides one card from the public
 * (lists, search, links, its address) or shows it again. Only the state is saved, never the card;
 * the cards still in the SRD files get no database row. Every switch is a row of /admin/registro.
 */
export async function setCardVisibilityAction(kind: string, id: string, hidden: boolean): Promise<CardSwitchResult> {
  await requireAdmin();
  if ((kind !== "incantesimo" && kind !== "mostro" && kind !== "sottoclasse") || typeof id !== "string" || typeof hidden !== "boolean") return { ok: false, error: "Scheda sconosciuta." };
  const card = await catalogCard(kind, id).catch(() => undefined);
  if (!card) return { ok: false, error: "Scheda sconosciuta." };
  try {
    await setCardHidden({ tipo: kind, scheda: id, ...card }, hidden);
  } catch {
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }
  // As for the sections: preview mode for the administrator, then every page and the search index again.
  (await draftMode()).enable();
  updateTag(SECTIONS_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/ricerca-indice.json");
  return { ok: true, hidden };
}

/** The card of a contested page (/spell/<id>, /mostro/<id>), or undefined for any other page. */
export async function contestedCard(path: string | null): Promise<{ kind: "incantesimo" | "mostro"; id: string } | undefined> {
  const match = /^\/(spell|mostro)\/([a-z0-9-]+)$/.exec(path ?? "");
  return match ? { kind: match[1] === "spell" ? "incantesimo" : "mostro", id: match[2] } : undefined;
}

/** «Nascondi in attesa di verifica» on a rights request: the eye of the contested card, from the request itself. */
export async function hideContestedCardAction(formData: FormData): Promise<void> {
  const report = formData.get("segnalazione"), path = formData.get("pagina");
  const card = await contestedCard(typeof path === "string" ? path : null);
  if (!card) return;
  const result = await setCardVisibilityAction(card.kind, card.id, true);
  if (result.ok && typeof report === "string" && /^[0-9a-f-]{36}$/i.test(report)) revalidatePath(`/admin/segnalazioni/${report}`);
}

/** «Mostra» on the page of a hidden card, seen by the administrator. */
export async function showCardAction(formData: FormData): Promise<void> {
  const kind = formData.get("tipo"), id = formData.get("scheda");
  await setCardVisibilityAction(typeof kind === "string" ? kind : "", typeof id === "string" ? id : "", false);
}
