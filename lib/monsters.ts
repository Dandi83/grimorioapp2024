import "server-only";
import { cache } from "react";

import { asc, eq } from "drizzle-orm";

import { db } from "./db";
import { getContentEditions } from "./content-editions";
import { monsters as monstersTable } from "./db/schema";
import { parseGs, type Monster } from "./monsters-types";
import { previewMonsters, previewMonsterById, getSrdMonsterSource } from "./srd-monsters";
import { getMonsterExtraFields } from "./monster-extra-storage";

// Re-export dei tipi/utility puri per comodità (l'accesso DB resta server-only).
export * from "./monsters-types";

type RawRow = typeof monstersTable.$inferSelect;

function toMonster(r: RawRow): Monster {
  return {
    id: r.id,
    nome: r.nome,
    tipo: r.tipo || "",
    taglia: r.taglia || "",
    allineamento: r.allineamento || "",
    grado_sfida: r.grado_sfida || "",
    px: r.px || "",
    classe_armatura: r.classe_armatura || "",
    punti_ferita: r.punti_ferita || "",
    velocita: r.velocita || "",
    forza: r.forza,
    destrezza: r.destrezza,
    costituzione: r.costituzione,
    intelligenza: r.intelligenza,
    saggezza: r.saggezza,
    carisma: r.carisma,
    tiri_salvezza: r.tiri_salvezza || "",
    abilita: r.abilita || "",
    vulnerabilita: r.vulnerabilita || "",
    resistenze: r.resistenze || "",
    immunita_danni: r.immunita_danni || "",
    immunita_condizioni: r.immunita_condizioni || "",
    sensi: r.sensi || "",
    linguaggi: r.linguaggi || "",
    tratti: r.tratti || "",
    azioni: r.azioni || "",
    reazioni: r.reazioni || "",
    azioni_leggendarie: r.azioni_leggendarie || "",
    descrizione: r.descrizione || "",
    gs_num: parseGs(r.grado_sfida || ""),
  };
}

export async function getAllMonsters(): Promise<Monster[]> {
  const [rows, editions, extraFields] = await Promise.all([db
    .select()
    .from(monstersTable)
    .orderBy(asc(monstersTable.sort_key)), getContentEditions("monster"), getMonsterExtraFields()]);
  return previewMonsters(rows.map(toMonster), process.env.VERCEL_ENV).map(record => {
    const monster = { ...record, ...extraFields.get(record.id) };
    const source = getSrdMonsterSource(monster);
    return {
      ...monster,
      edizione: editions.get(monster.id),
      provenienza: source ? {
        document: source.document,
        edition: source.edition,
        sourceUrl: source.sourceUrl,
        page: source.page,
      } : undefined,
    };
  });
}

// Metadata and the page share the same read within a server render. This cache
// is request-scoped: an administrative save is visible on the next request.
export const getMonsterById = cache(async (id: string): Promise<Monster | undefined> => {
  const [rows, editions, extraFields] = await Promise.all([db
    .select()
    .from(monstersTable)
    .where(eq(monstersTable.id, id))
    .limit(1), getContentEditions("monster", id), getMonsterExtraFields(id)]);
  const monster = rows[0] ? toMonster(rows[0]) : previewMonsterById(id, process.env.VERCEL_ENV);
  if (!monster) return undefined;
  return { ...monster, ...extraFields.get(id), edizione: editions.get(id) };
});
