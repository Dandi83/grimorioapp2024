import { shortLivedFallback } from "@/lib/isr-fallback";
import { buildSearchIndex } from "@/lib/search-index";
import { withSynonyms } from "@/lib/search-insights";
import { readSynonyms } from "@/lib/search-insights-server";
import { effectiveHidden } from "@/lib/public-sections";
import { visibilityState } from "@/lib/section-visibility";

// Built with the site and refreshed like the catalogs it reads; the panel loads it only when opened.
// Hidden sections, parts (/admin/sezioni) and single cards (the eye) are left out, for everyone: switching one refreshes this file.
// PROMPT 55: static until an admin save refreshes it (revalidatePath("/ricerca-indice.json")), never on a timer; a route
// handler without this would run at every request.
export const dynamic = "force-static";

async function hiddenForSearch() {
  const state = await visibilityState();
  return [...effectiveHidden(state.sections, state.parts), ...state.parts, ...state.cards];
}

export async function GET() {
  // The synonyms of the reserved area (PROMPT 31) ride in the same file: nothing more for who never searches.
  // The English names approved for the NO SRD cards (PROMPT 38) come with the lists of the cards, like the SRD ones.
  const index = withSynonyms(await buildSearchIndex(undefined, undefined, await hiddenForSearch()), await readSynonyms().catch(async () => (await shortLivedFallback(), [])));
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
