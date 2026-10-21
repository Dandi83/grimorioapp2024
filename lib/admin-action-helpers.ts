import "server-only";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { monsters, spells } from "@/lib/db/schema";

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Shared by the spell and creature Server Actions. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Non autorizzato");
}

export function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

/** First free ID: base, base-2, base-3, … */
export async function uniqueId(kind: "spell" | "monster", base: string): Promise<string> {
  const table = kind === "spell" ? spells : monsters;
  const start = base || (kind === "spell" ? "incantesimo" : "mostro");
  let id = start;
  let suffix = 2;
  while (true) {
    const existing = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
    if (existing.length === 0) return id;
    id = `${start}-${suffix++}`;
  }
}
