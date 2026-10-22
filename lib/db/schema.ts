import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

// The tables below are created at runtime by the code that uses them
// (CREATE TABLE IF NOT EXISTS). They are described here only for types and
// documentation: no migration is generated or run from these definitions.
// tests/schema-runtime-tables.cjs checks that both descriptions match.

/** Manual edition label chosen in the admin area (lib/content-editions.ts). */
export const contentEditions = pgTable("grimorio_content_editions", {
  content_kind: text("content_kind").notNull(),
  content_id: text("content_id").notNull(),
  edition: text("edition").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.content_kind, table.content_id] })]);

/** Optional creature fields saved from the admin editor (lib/monster-extra-storage.ts). */
export const monsterDetails = pgTable("grimorio_monster_details", {
  monster_id: text("monster_id").primaryKey().references(() => monsters.id, { onDelete: "cascade" }),
  fields: jsonb("fields").notNull().default({}),
});

/**
 * Creature habitats saved from the admin editor (lib/monster-habitats.ts), keyed by
 * the 2024 sheet so both editions share them. No reference to monsters: sheets that
 * exist only in the project files can have a habitat too.
 */
export const monsterHabitats = pgTable("grimorio_monster_habitats", {
  monster_key: text("monster_key").primaryKey(),
  habitats: jsonb("habitats").notNull().default([]),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Consented statistics events and their PostHog export state (lib/analytics.ts). */
export const analyticsEvents = pgTable("grimorio_analytics_events", {
  id: uuid("id").primaryKey(),
  visitor_id: text("visitor_id").notNull(),
  session_id: uuid("session_id").notNull(),
  view_id: uuid("view_id").notNull(),
  event_name: text("event_name").notNull(),
  path: text("path").notNull(),
  card_kind: text("card_kind"),
  card_id: text("card_id"),
  title: text("title"),
  source: text("source").notNull(),
  is_test: boolean("is_test").notNull().default(false),
  active_seconds: integer("active_seconds").notNull().default(0),
  scroll_percent: integer("scroll_percent").notNull().default(0),
  received_at: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  exported: boolean("exported").notNull().default(false),
  export_claim: uuid("export_claim"),
  export_claimed_at: timestamp("export_claimed_at", { withTimezone: true }),
});

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect;

/** Failed admin logins, stored as address hashes (lib/admin-login-limit.ts). */
export const adminLoginFailures = pgTable("grimorio_admin_login_failures", {
  address_hash: text("address_hash").notNull(),
  failed_at: timestamp("failed_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Anonymous reports sent from /segnala (lib/feedback.ts). No IP address, user agent or
 * cookie is stored; the reply address is optional and visible only to administrators.
 */
export const feedbackReports = pgTable("grimorio_feedback_reports", {
  id: uuid("id").primaryKey(),
  creato_il: timestamp("creato_il", { withTimezone: true }).notNull().defaultNow(),
  tipo: text("tipo").notNull(),
  messaggio: text("messaggio").notNull(),
  percorso: text("percorso"),
  edizione: text("edizione"),
  email_risposta: text("email_risposta"),
  stato: text("stato").notNull().default("nuova"),
  email_inviata: boolean("email_inviata").notNull().default(false),
  nota_admin: text("nota_admin"),
});

/** Send limit of the reports: salted device hashes, deleted after one day (lib/feedback.ts). */
export const feedbackLimits = pgTable("grimorio_feedback_limits", {
  device_hash: text("device_hash").notNull(),
  sent_at: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Open admin sessions (lib/admin-auth.ts): logout deletes the row, so the cookie stops working. */
export const adminSessions = pgTable("grimorio_admin_sessions", {
  id: text("id").primaryKey(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * Manual corrections made in the admin area (lib/content-overrides.ts), laid over the
 * original values only when a page is shown: the project files in lib/data never change.
 */
export const contentOverrides = pgTable("grimorio_content_overrides", {
  id: uuid("id").primaryKey(),
  sezione: text("sezione").notNull(),
  scheda_id: text("scheda_id").notNull(),
  edizione: text("edizione").notNull(),
  campo: text("campo").notNull(),
  valore_originale: text("valore_originale").notNull(),
  valore_nuovo: text("valore_nuovo").notNull(),
  motivo: text("motivo").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
  creata_da: text("creata_da").notNull(),
  annullata_il: timestamp("annullata_il", { withTimezone: true }),
});
