"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { markAllFeedbackRead } from "@/lib/feedback";

/** «Segna tutte lette» of /admin/notifiche: the new reports become read (the proposals stay until decided). */
export async function markAllReadAction(): Promise<void> {
  await requireAdmin();
  await markAllFeedbackRead();
  revalidatePath("/admin", "layout");
}
