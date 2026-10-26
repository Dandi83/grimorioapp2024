"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { approveProposal, createHomebrew, deleteHomebrew, getHomebrew, refuseProposal, sendPublishedEmail, updateHomebrew, updateProposal } from "@/lib/homebrew";
import { HOMEBREW_LICENSE, LIMITS, parseDraft, plainText } from "@/lib/homebrew-types";

type HomebrewResult = { ok: true; id?: string; email?: "sent" | "not-configured" | "failed" | "none" } | { ok: false; error: string };

/** A published homebrew changes lists, search, counts and its card: the same refresh as an admin save of a creature. */
function refresh() {
  updateTag("monsters");
  revalidatePath("/", "layout");
  revalidatePath("/ricerca-indice.json");
}

async function siteOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "ilgrimorio.app";
  return `${list.get("x-forwarded-proto") ?? "https"}://${host}`;
}

/** «Approva»: the card is published; the author gets the notice when an email was left and Resend is configured. */
export async function approveProposalAction(id: string): Promise<HomebrewResult> {
  await requireAdmin();
  let approved: Awaited<ReturnType<typeof approveProposal>>;
  try {
    approved = await approveProposal(String(id));
  } catch {
    return { ok: false, error: "Pubblicazione non riuscita. Riprova tra poco." };
  }
  if (!approved) return { ok: false, error: "Proposta non trovata o già decisa." };
  if (approved === "no-license") return { ok: false, error: `Proposta arrivata prima della licenza: chiedi all’autore il consenso alla licenza ${HOMEBREW_LICENSE} prima di pubblicarla.` };
  refresh();
  const email = approved.email ? await sendPublishedEmail(approved.email, approved.nome, `${await siteOrigin()}/mostro/${approved.homebrewId}`) : "none";
  return { ok: true, id: approved.homebrewId, email };
}

export async function refuseProposalAction(id: string, motivo: string): Promise<HomebrewResult> {
  await requireAdmin();
  const reason = plainText(motivo ?? "", LIMITS.motivo, true);
  if (reason === null) return { ok: false, error: "Motivo troppo lungo (al massimo 500 caratteri)." };
  return (await refuseProposal(String(id), reason || null)) ? { ok: true } : { ok: false, error: "Proposta non trovata o già decisa." };
}

/** «Correggi» on a proposal still to review: the corrected sheet replaces the proposed one. */
export async function correctProposalAction(id: string, draft: unknown): Promise<HomebrewResult> {
  await requireAdmin();
  const checked = parseDraft(draft);
  if (!checked.ok) return checked;
  return (await updateProposal(String(id), checked.draft)) ? { ok: true } : { ok: false, error: "Proposta non trovata o già decisa." };
}

/** «+ Nuova homebrew» in /admin/mostri: published at once, «del Grimorio». */
export async function createHomebrewAction(draft: unknown): Promise<HomebrewResult> {
  await requireAdmin();
  const checked = parseDraft(draft);
  if (!checked.ok) return checked;
  const id = await createHomebrew(checked.draft);
  refresh();
  return { ok: true, id };
}

export async function updateHomebrewAction(id: string, draft: unknown): Promise<HomebrewResult> {
  await requireAdmin();
  const checked = parseDraft(draft);
  if (!checked.ok) return checked;
  if (!(await getHomebrew(String(id)))) return { ok: false, error: "Creatura homebrew non trovata." };
  await updateHomebrew(String(id), checked.draft);
  refresh();
  return { ok: true, id: String(id) };
}

/** The bin of the admin list, as for every card added by the administrator. */
export async function deleteHomebrewAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !(await deleteHomebrew(id))) return { ok: false, error: "Creatura homebrew non trovata." };
  refresh();
  return { ok: true };
}
