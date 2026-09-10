import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "./db";
import { monsters as monstersTable } from "./db/schema";
import { parseGs, type Monster } from "./monsters-types";

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
  const rows = await db
    .select()
    .from(monstersTable)
    .orderBy(asc(monstersTable.sort_key));
  return rows.map(toMonster);
}

export async function getMonsterById(id: string): Promise<Monster | undefined> {
  const rows = await db
    .select()
    .from(monstersTable)
    .where(eq(monstersTable.id, id))
    .limit(1);
  return rows[0] ? toMonster(rows[0]) : undefined;
}
