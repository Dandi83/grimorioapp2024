import { buildSearchIndex } from "@/lib/search-index";
import { effectiveHidden } from "@/lib/public-sections";
import { visibilityState } from "@/lib/section-visibility";

// Built with the site and refreshed like the catalogs it reads; the panel loads it only when opened.
// Hidden sections and parts (/admin/sezioni) are left out, for everyone: switching one refreshes this file.
export const revalidate = 300;

async function hiddenForSearch() {
  const state = await visibilityState();
  return [...effectiveHidden(state.sections, state.parts), ...state.parts];
}

export async function GET() {
  return new Response(JSON.stringify(await buildSearchIndex(undefined, undefined, await hiddenForSearch())), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
