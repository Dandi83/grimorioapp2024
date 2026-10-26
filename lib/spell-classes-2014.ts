import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { spells } from "@/lib/db/schema";
import { editorLogReady, logEditorSave } from "@/lib/editor-log";
import { CLASSES_2014, RENAME_2014, planSpellClasses, type SpellClassesPlan } from "@/lib/spell-classes-2014-plan";

/**
 * One-off: the classes of the Manuale del Giocatore 2014 for the spells the administrator added without them
 * («Classi incantesimi 2014» in /admin). Reads the database rows, never the project files.
 */
type Database = NodePgDatabase<typeof schema>;

async function rowsOf(database: Database) {
  return database.select({ id: spells.id, livello: spells.livello, nome_italiano: spells.nome_italiano })
    .from(spells).where(inArray(spells.id, Object.keys(CLASSES_2014)));
}

export async function spellClassesPlan(): Promise<SpellClassesPlan> {
  return planSpellClasses(await rowsOf(db));
}

export type ApplyClassesResult =
  | { ok: true; changed: number; renamed: boolean; skipped: string[] }
  | { ok: false; error: string };

/**
 * One transaction: every «livello» of the plan, then the name, each only if still the value read; the values
 * before go to the Registro modifiche first (where each can be undone) and to the server log. Any row that does
 * not match cancels everything. Run again, it finds nothing to do and writes nothing.
 */
export async function applySpellClasses(): Promise<ApplyClassesResult> {
  if (!(await editorLogReady())) return { ok: false, error: "Registro modifiche non disponibile: nessuna modifica senza backup." };
  try {
    return await db.transaction(async tx => {
      const plan = planSpellClasses(await rowsOf(tx as unknown as Database));
      if (!plan.changes.length && !plan.rename) return { ok: true as const, changed: 0, renamed: false, skipped: plan.skipped.map(item => item.id) };
      console.info("[classi-2014] backup prima della modifica", JSON.stringify({
        livello: plan.changes.map(({ id, before }) => ({ id, livello: before })),
        nome: plan.rename ? { id: RENAME_2014.id, nome_italiano: RENAME_2014.from } : null,
      }));
      let changed = 0;
      for (const change of plan.changes) {
        await logEditorSave(tx as unknown as Database, "incantesimi", change.id, { livello: change.after });
        const updated = await tx.update(spells).set({ livello: change.after })
          .where(and(eq(spells.id, change.id), eq(spells.livello, change.before))).returning({ id: spells.id });
        if (updated.length !== 1) throw new Error(`${change.id}: riga cambiata nel frattempo`);
        changed += 1;
      }
      if (plan.rename) {
        await logEditorSave(tx as unknown as Database, "incantesimi", RENAME_2014.id, { nome_italiano: RENAME_2014.to });
        const renamed = await tx.update(spells).set({ nome_italiano: RENAME_2014.to })
          .where(and(eq(spells.id, RENAME_2014.id), eq(spells.nome_italiano, RENAME_2014.from))).returning({ id: spells.id });
        if (renamed.length !== 1) throw new Error(`${RENAME_2014.id}: nome cambiato nel frattempo`);
      }
      if (changed !== plan.changes.length) throw new Error("Numero di righe diverso dal previsto");
      return { ok: true as const, changed, renamed: plan.rename, skipped: plan.skipped.map(item => item.id) };
    });
  } catch (error) {
    console.error("[classi-2014] annullato, nessuna modifica", error instanceof Error ? error.message : error);
    return { ok: false, error: "Annullato: nessuna modifica salvata. Ricarica la pagina e controlla l’anteprima." };
  }
}
