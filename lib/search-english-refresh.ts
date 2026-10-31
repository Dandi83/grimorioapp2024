import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import type { SearchEnglishKind } from "./search-english";

/**
 * After a change of an approved English name (PROMPT 38): the lists that carry it (tag of Incantesimi or Bestiario,
 * read again at the next request, not after the hour), the search index and the reserved pages, at once.
 * Server actions only (updateTag).
 */
export function refreshEnglishNames(kind: SearchEnglishKind) {
  updateTag(kind === "incantesimo" ? "spells" : "monsters");
  for (const path of ["/ricerca-indice.json", kind === "incantesimo" ? "/grimorio" : "/bestiario", "/admin/contenuti/nomi-inglesi", "/admin/contenuti", "/admin/statistiche"]) revalidatePath(path);
}
