import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import { saveContentEdition, summaryFromForm, writeOriginalSummary, type ContentKind } from "./content-editions";

/** Content, its selected label and its «Sintesi originale» switch either all save or all roll back. */
export async function saveAdminContent(
  kind: ContentKind, id: string, form: FormData, sourceEdition: string | undefined,
  write: (database: NodePgDatabase<typeof schema>) => Promise<unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const edition = form.get("edition");
  if (edition !== null && edition !== "" && edition !== "2014" && edition !== "2024") {
    return { ok: false, error: "Seleziona un’edizione valida." };
  }
  if (edition && sourceEdition && edition !== sourceEdition) {
    return { ok: false, error: `La fonte di questa scheda usa D&D ${sourceEdition}.` };
  }
  try {
    // Older open forms without the field preserve any existing manual label.
    const summary = summaryFromForm(form);
    await saveContentEdition(kind, id, edition === null ? null : edition || undefined, async client => {
      await write(drizzle(client, { schema }));
      if (summary !== undefined) await writeOriginalSummary(client, kind, id, summary);
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Scheda ed etichetta non salvate. I dati sono conservati nel modulo: riprova." };
  }
}
