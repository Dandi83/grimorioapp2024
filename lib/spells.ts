import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "./db";
import { spells as spellsTable } from "./db/schema";
import { parseLivello, type Spell } from "./spells-types";
import { applySrdDescription } from "./srd-descriptions";
import { applyOriginalDescription } from "./original-descriptions";
import { previewSpellRows, previewSpellById } from "./srd-additions";

// Re-export pure helpers/types so existing imports from "@/lib/spells"
// keep working. The DB access below is server-only.
export * from "./spells-types";

interface RawRow {
  id: string;
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
}

function toSpell(r: RawRow): Spell {
  r = applyOriginalDescription(applySrdDescription(r));
  const { livello_num, scuola, classi } = parseLivello(r.livello || "");
  return {
    id: r.id,
    nome_italiano: r.nome_italiano,
    livello: r.livello || "",
    tempo_di_lancio: r.tempo_di_lancio || "",
    gittata: r.gittata || "",
    componenti: r.componenti || "",
    durata: r.durata || "",
    descrizione: r.descrizione || "",
    livello_num,
    scuola,
    classi,
  };
}

export async function getAllSpells(options: { includePreview?: boolean } = {}): Promise<Spell[]> {
  const rows = await db
    .select()
    .from(spellsTable)
    .orderBy(asc(spellsTable.sort_key));
  // The admin always sees only real, editable database rows.
  return previewSpellRows(rows, options.includePreview === false ? undefined : process.env.VERCEL_ENV).map(toSpell);
}

export async function getSpellById(id: string): Promise<Spell | undefined> {
  const rows = await db
    .select()
    .from(spellsTable)
    .where(eq(spellsTable.id, id))
    .limit(1);
  const row = rows[0] ?? previewSpellById(id, process.env.VERCEL_ENV);
  return row ? toSpell(row) : undefined;
}
