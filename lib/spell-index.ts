import "server-only";

import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

import { db } from "./db";
import { spells } from "./db/schema";
import { previewSpellRows } from "./srd-additions";
import { parseLivello, type SpellListItem } from "./spells-types";

export const getSpellIndex = unstable_cache(
  async (): Promise<SpellListItem[]> => {
    const rows = await db.select({
      id: spells.id,
      nome_italiano: spells.nome_italiano,
      livello: spells.livello,
    }).from(spells).orderBy(asc(spells.sort_key));

    return previewSpellRows(rows, process.env.VERCEL_ENV).map(row => {
      const { livello_num, scuola, classi } = parseLivello(row.livello || "");
      return { id: row.id, nome_italiano: row.nome_italiano, livello_num, scuola, classi };
    });
  },
  ["spell-index", process.env.VERCEL_ENV ?? "local"],
  { tags: ["spells"], revalidate: 3600 },
);
