import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const spells = pgTable("spells", {
  id: text("id").primaryKey(),
  nome_italiano: text("nome_italiano").notNull(),
  livello: text("livello").notNull().default(""),
  tempo_di_lancio: text("tempo_di_lancio").notNull().default(""),
  gittata: text("gittata").notNull().default(""),
  componenti: text("componenti").notNull().default(""),
  durata: text("durata").notNull().default(""),
  descrizione: text("descrizione").notNull().default(""),
  sort_key: text("sort_key").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SpellRow = typeof spells.$inferSelect;
export type NewSpellRow = typeof spells.$inferInsert;

export const monsters = pgTable("monsters", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default(""),
  taglia: text("taglia").notNull().default(""),
  allineamento: text("allineamento").notNull().default(""),
  grado_sfida: text("grado_sfida").notNull().default(""),
  px: text("px").notNull().default(""),
  classe_armatura: text("classe_armatura").notNull().default(""),
  punti_ferita: text("punti_ferita").notNull().default(""),
  velocita: text("velocita").notNull().default(""),
  forza: integer("forza").notNull().default(10),
  destrezza: integer("destrezza").notNull().default(10),
  costituzione: integer("costituzione").notNull().default(10),
  intelligenza: integer("intelligenza").notNull().default(10),
  saggezza: integer("saggezza").notNull().default(10),
  carisma: integer("carisma").notNull().default(10),
  tiri_salvezza: text("tiri_salvezza").notNull().default(""),
  abilita: text("abilita").notNull().default(""),
  vulnerabilita: text("vulnerabilita").notNull().default(""),
  resistenze: text("resistenze").notNull().default(""),
  immunita_danni: text("immunita_danni").notNull().default(""),
  immunita_condizioni: text("immunita_condizioni").notNull().default(""),
  sensi: text("sensi").notNull().default(""),
  linguaggi: text("linguaggi").notNull().default(""),
  tratti: text("tratti").notNull().default(""),
  azioni: text("azioni").notNull().default(""),
  reazioni: text("reazioni").notNull().default(""),
  azioni_leggendarie: text("azioni_leggendarie").notNull().default(""),
  descrizione: text("descrizione").notNull().default(""),
  sort_key: text("sort_key").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MonsterRow = typeof monsters.$inferSelect;
export type NewMonsterRow = typeof monsters.$inferInsert;
