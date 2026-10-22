import { buildSearchIndex } from "@/lib/search-index";
import { hiddenSections } from "@/lib/section-visibility";

// Built with the site and refreshed like the catalogs it reads; the panel loads it only when opened.
// Hidden sections (/admin/sezioni) are left out, for everyone: switching one refreshes this file.
export const revalidate = 300;

export async function GET() {
  return new Response(JSON.stringify(await buildSearchIndex(undefined, undefined, await hiddenSections())), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
