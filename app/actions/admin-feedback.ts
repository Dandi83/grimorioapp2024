"use server";

import { revalidatePath } from "next/cache";

import { clean, requireAdmin } from "@/lib/admin-action-helpers";
import { deleteFeedback, setFeedbackNote, setFeedbackState } from "@/lib/feedback";
import { FEEDBACK_STATES, NOTE_MAX, cleanText, type FeedbackState } from "@/lib/feedback-input";

type FeedbackActionResult = { ok: true; message?: string } | { ok: false; error: string };

function refresh(id: string) {
  revalidatePath("/admin/segnalazioni");
  revalidatePath(`/admin/segnalazioni/${id}`);
  revalidatePath("/admin");
}

export async function feedbackStateAction(formData: FormData): Promise<FeedbackActionResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const stato = clean(formData.get("stato"));
  if (!(FEEDBACK_STATES as readonly string[]).includes(stato)) return { ok: false, error: "Stato non valido." };
  if (!(await setFeedbackState(id, stato as FeedbackState))) return { ok: false, error: "Segnalazione non trovata." };
  refresh(id);
  return { ok: true };
}

export async function feedbackNoteAction(_prev: unknown, formData: FormData): Promise<FeedbackActionResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const raw = formData.get("nota");
  const note = cleanText(typeof raw === "string" ? raw : "");
  if (Array.from(note).length > NOTE_MAX) return { ok: false, error: `La nota può avere al massimo ${NOTE_MAX} caratteri.` };
  if (!(await setFeedbackNote(id, note || null))) return { ok: false, error: "Segnalazione non trovata." };
  refresh(id);
  return { ok: true, message: "Nota salvata." };
}

export async function deleteFeedbackAction(formData: FormData): Promise<FeedbackActionResult> {
  await requireAdmin();
  const id = clean(formData.get("id"));
  if (!(await deleteFeedback(id))) return { ok: false, error: "Segnalazione non trovata." };
  refresh(id);
  return { ok: true };
}
