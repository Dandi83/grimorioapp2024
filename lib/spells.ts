import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "./db";
import { spells as spellsTable } from "./db/schema";
import { parseLivello, type Spell } from "./spells-types";

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

export async function getAllSpells(): Promise<Spell[]> {
  const rows = await db
    .select()
    .from(spellsTable)
    .orderBy(asc(spellsTable.sort_key));
  return rows.map(toSpell);
}

export async function getSpellById(id: string): Promise<Spell | undefined> {
  const rows = await db
    .select()
    .from(spellsTable)
    .where(eq(spellsTable.id, id))
    .limit(1);
  return rows[0] ? toSpell(rows[0]) : undefined;
}
