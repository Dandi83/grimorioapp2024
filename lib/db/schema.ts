import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
