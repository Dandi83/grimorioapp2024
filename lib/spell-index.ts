import "server-only";

import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

import { db } from "./db";
import { spells } from "./db/schema";
import { previewSpellRows } from "./srd-additions";
import { isLegacySpellId, withLegacySpells } from "./srd-spells-2014";
import { originalEdition } from "./original-descriptions";
import { catalogRepairs } from "./spell-catalog-repairs";
import { displaySpellRow } from "./spell-display-row";
import { MERGED_SPELL_IDS } from "./monster-id-aliases";
import { parseLivello, spellListFlags, type SpellListItem } from "./spells-types";
import { getContentEditions } from "./content-editions";
import { englishName } from "./english-names";
import { approvedEnglishNames } from "./search-english-server";

/**
 * Changes whenever the project files change what the list shows (new 2014 blocks, SRD additions).
 * The cached list survives deployments, so without it new spells would appear only after the hourly refresh.
 */
function projectCatalogVersion(): string {
  const listed = withLegacySpells(previewSpellRows([], "production"), "production")
    .map(({ id, nome_italiano, livello, tempo_di_lancio, durata }) => [id, nome_italiano, livello, tempo_di_lancio, durata]);
  const text = JSON.stringify([listed, catalogRepairs, MERGED_SPELL_IDS, "2026-10-31 nomi inglesi"]);
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

export const getSpellIndex = unstable_cache(
  async (): Promise<SpellListItem[]> => {
    const [rows, editions, approved] = await Promise.all([db.select({
      id: spells.id,
      nome_italiano: spells.nome_italiano,
      livello: spells.livello,
      tempo_di_lancio: spells.tempo_di_lancio,
      durata: spells.durata,
      // Read only to know whether the SRD record or the original summary still applies (the same values as the card).
      descrizione: spells.descrizione,
    }).from(spells).orderBy(asc(spells.sort_key)), getContentEditions("spell"), approvedEnglishNames("incantesimo")]);

    // A duplicate row merged into another card is not listed (its address redirects).
    const listed = rows.filter(row => !(row.id in MERGED_SPELL_IDS));
    return withLegacySpells(previewSpellRows(listed, process.env.VERCEL_ENV), process.env.VERCEL_ENV).map(stored => {
      const row = displaySpellRow(stored);
      const { livello_num, scuola, classi } = parseLivello(row.livello || "");
      const legacy = (editions.get(row.id) ?? (isLegacySpellId(row.id) ? "2014" : originalEdition(row.id))) === "2014";
      // The SRD name, else the name approved for a NO SRD card (PROMPT 38, «Nomi inglesi da verificare»).
      const en = englishName("incantesimi", legacy ? "2014" : "2024", row.id) ?? approved.get(row.id);
      return {
        id: row.id, nome_italiano: row.nome_italiano, livello_num, scuola, classi,
        tempo_di_lancio: row.tempo_di_lancio || "", ...spellListFlags(row),
        ...(legacy ? { edizione: "2014" as const } : {}), ...(en ? { en } : {}),
      };
    });
  },
  ["spell-index", process.env.VERCEL_ENV ?? "local", projectCatalogVersion()],
  { tags: ["spells"], revalidate: 3600 },
);
