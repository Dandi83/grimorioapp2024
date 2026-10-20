import "server-only";

import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

import { db } from "./db";
import { spells } from "./db/schema";
import { previewSpellRows } from "./srd-additions";
import { isLegacySpellId, withLegacySpells } from "./srd-spells-2014";
import { catalogRepairs, repairCatalogSpell } from "./spell-catalog-repairs";
import { MERGED_SPELL_IDS } from "./monster-id-aliases";
import { parseLivello, spellListFlags, type SpellListItem } from "./spells-types";
import { getContentEditions } from "./content-editions";

/**
 * Changes whenever the project files change what the list shows (new 2014 blocks, SRD additions).
 * The cached list survives deployments, so without it new spells would appear only after the hourly refresh.
 */
function projectCatalogVersion(): string {
  const listed = withLegacySpells(previewSpellRows([], "production"), "production")
    .map(({ id, nome_italiano, livello, tempo_di_lancio, durata }) => [id, nome_italiano, livello, tempo_di_lancio, durata]);
  const text = JSON.stringify([listed, catalogRepairs, MERGED_SPELL_IDS]);
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

export const getSpellIndex = unstable_cache(
  async (): Promise<SpellListItem[]> => {
    const [rows, editions] = await Promise.all([db.select({
      id: spells.id,
      nome_italiano: spells.nome_italiano,
      livello: spells.livello,
      tempo_di_lancio: spells.tempo_di_lancio,
      durata: spells.durata,
    }).from(spells).orderBy(asc(spells.sort_key)), getContentEditions("spell")]);

    // A duplicate row merged into another card is not listed (its address redirects).
    const listed = rows.filter(row => !(row.id in MERGED_SPELL_IDS)).map(repairCatalogSpell);
    return withLegacySpells(previewSpellRows(listed, process.env.VERCEL_ENV), process.env.VERCEL_ENV).map(row => {
      const { livello_num, scuola, classi } = parseLivello(row.livello || "");
      return {
        id: row.id, nome_italiano: row.nome_italiano, livello_num, scuola, classi,
        tempo_di_lancio: row.tempo_di_lancio || "", ...spellListFlags(row),
        ...((editions.get(row.id) ?? (isLegacySpellId(row.id) ? "2014" : undefined)) === "2014" ? { edizione: "2014" as const } : {}),
      };
    });
  },
  ["spell-index", process.env.VERCEL_ENV ?? "local", projectCatalogVersion()],
  { tags: ["spells"], revalidate: 3600 },
);
