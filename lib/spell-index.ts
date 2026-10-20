import "server-only";

import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

import { db } from "./db";
import { spells } from "./db/schema";
import { previewSpellRows } from "./srd-additions";
import { isLegacySpellId, withLegacySpells } from "./srd-spells-2014";
import { parseLivello, spellListFlags, type SpellListItem } from "./spells-types";
import { getContentEditions } from "./content-editions";

export const getSpellIndex = unstable_cache(
  async (): Promise<SpellListItem[]> => {
    const [rows, editions] = await Promise.all([db.select({
      id: spells.id,
      nome_italiano: spells.nome_italiano,
      livello: spells.livello,
      tempo_di_lancio: spells.tempo_di_lancio,
      durata: spells.durata,
    }).from(spells).orderBy(asc(spells.sort_key)), getContentEditions("spell")]);

    return withLegacySpells(previewSpellRows(rows, process.env.VERCEL_ENV), process.env.VERCEL_ENV).map(row => {
      const { livello_num, scuola, classi } = parseLivello(row.livello || "");
      return {
        id: row.id, nome_italiano: row.nome_italiano, livello_num, scuola, classi,
        tempo_di_lancio: row.tempo_di_lancio || "", ...spellListFlags(row),
        ...((editions.get(row.id) ?? (isLegacySpellId(row.id) ? "2014" : undefined)) === "2014" ? { edizione: "2014" as const } : {}),
      };
    });
  },
  ["spell-index", process.env.VERCEL_ENV ?? "local"],
  { tags: ["spells"], revalidate: 3600 },
);
