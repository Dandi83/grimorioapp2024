import { buildSearchIndex } from "@/lib/search-index";

// Built with the site and refreshed like the catalogs it reads; the panel loads it only when opened.
export const revalidate = 300;

export async function GET() {
  return new Response(JSON.stringify(await buildSearchIndex()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
