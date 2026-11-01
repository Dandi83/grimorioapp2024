import "server-only";

import { rulePages } from "@/lib/concentration";
import { effectiveHidden, isHiddenPath, partId, sectionOfPath, soonOfPath } from "@/lib/public-sections";
import { SEARCH_SOURCES, hiddenRow, type SourceRow } from "@/lib/search-index";
import { visibilityState } from "@/lib/section-visibility";
import { SUPPORT_URL } from "@/lib/support";

/**
 * sitemap.xml (PROMPT 45): every public page Google may index, from the same lists as the search of the Home, with the
 * same exclusions: hidden sections, parts and cards (the eye, «Modalità solo SRD»), sections «In arrivo», the reserved
 * area, the noindex pages (account, personaggi, segnala, proponi, preferiti), /dadi (a redirect), the Manual where it is
 * not published, the pictures. Served by app/sitemap.ts.
 */
/** Static pages: [address, section of the switch (none for the pages of the site), part of the section]. */
const PAGES: readonly (readonly [string, string?, string?])[] = [
  ["/"], ["/grimorio"], ["/bestiario"], ["/compendio"], ["/classi"], ["/equipaggiamento"],
  ["/equipaggiamento/armi"], ["/equipaggiamento/armature"], ["/equipaggiamento/avventura"], ["/equipaggiamento/strumenti"],
  ["/oggetti-magici"], ["/compendio/condizioni"], ["/avanzamento"],
  ["/bestiario/creati-da-voi", "bestiario", "homebrew"], ["/bestiario/creati-da-voi/bilanciamento", "bestiario", "homebrew"],
  ["/bestiario/del-grimorio", "bestiario", "grimorio"], ["/bestiario/creature-originali", "bestiario", "grimorio"],
  ["/info"], ["/fonti"], ["/termini"], ["/privacy"], ["/installa"],
];

/** The addresses of the sitemap (paths), for the tests too. */
export async function sitemapPaths(): Promise<string[]> {
  const state = await visibilityState();
  const hidden = [...effectiveHidden(state.sections, state.parts), ...state.parts, ...state.cards];
  const out = (path: string) => isHiddenPath(path, hidden) || soonOfPath(path, state.soon) !== undefined;
  const paths = new Set<string>();
  for (const [path, section, part] of PAGES) {
    if (out(path)) continue;
    if (section && part && [...hidden, ...state.soon].includes(partId(section, part))) continue;
    paths.add(path);
  }
  if (SUPPORT_URL) paths.add("/sostieni");
  for (const rule of rulePages) paths.add(`/regole/${rule.id}`);
  // Cards: the rows of the search (production lists: never the preview-only Manual), less the hidden and «In arrivo» ones.
  for (const source of SEARCH_SOURCES) {
    const rows: SourceRow[] = await source.rows("production");
    for (const row of rows) {
      if (hiddenRow(row, hidden) || out(row.href)) continue;
      const section = sectionOfPath(row.href);
      if (section && row.parte && state.soon.includes(partId(section, row.parte))) continue;
      // One address per page: no anchors (subclasses open the class), no ?edizione=2014 (the page shows both editions, its canonical has no query).
      if (row.href.includes("?")) continue;
      paths.add(row.href.split("#")[0]);
    }
  }
  return [...paths];
}
