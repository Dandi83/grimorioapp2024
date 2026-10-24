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

/**
 * Changes made with the spell and creature editors (lib/editor-log.ts): those records live in
 * the database and are changed in place, so the log keeps each field before and after, for undo.
 */
export const editorLog = pgTable("grimorio_editor_log", {
  id: uuid("id").primaryKey(),
  sezione: text("sezione").notNull(),
  scheda_id: text("scheda_id").notNull(),
  campo: text("campo").notNull(),
  valore_prima: text("valore_prima").notNull(),
  valore_dopo: text("valore_dopo").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
  annullata_il: timestamp("annullata_il", { withTimezone: true }),
});

/**
 * Public sections hidden from /admin/sezioni (lib/section-visibility.ts): one row per section ever
 * switched, a section without a row is visible. Hiding never touches the content.
 */
export const sectionVisibility = pgTable("grimorio_section_visibility", {
  sezione: text("sezione").primaryKey(),
  nascosta: boolean("nascosta").notNull().default(false),
  aggiornata_il: timestamp("aggiornata_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Every switch of a section (shown in /admin/registro). */
export const sectionVisibilityLog = pgTable("grimorio_section_visibility_log", {
  id: uuid("id").primaryKey(),
  sezione: text("sezione").notNull(),
  nascosta: boolean("nascosta").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Parts of a section hidden from /admin/sezioni (an edition, a tab, a block: lib/public-sections.ts). */
export const sectionParts = pgTable("grimorio_section_parts", {
  sezione: text("sezione").notNull(),
  parte: text("parte").notNull(),
  nascosta: boolean("nascosta").notNull().default(false),
  aggiornata_il: timestamp("aggiornata_il", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.sezione, table.parte] })]);

/** Every switch of a part (shown in /admin/registro). */
export const sectionPartsLog = pgTable("grimorio_section_parts_log", {
  id: uuid("id").primaryKey(),
  sezione: text("sezione").notNull(),
  parte: text("parte").notNull(),
  nascosta: boolean("nascosta").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Single cards hidden with the eye of /admin/incantesimi and /admin/mostri (lib/section-visibility.ts):
 * tipo "incantesimo" | "mostro" and the card id, also for the cards still read from the SRD files.
 */
export const cardVisibility = pgTable("grimorio_card_visibility", {
  tipo: text("tipo").notNull(),
  scheda: text("scheda").notNull(),
  nascosta: boolean("nascosta").notNull().default(false),
  aggiornata_il: timestamp("aggiornata_il", { withTimezone: true }).notNull().defaultNow(),
  autore: text("autore").notNull().default("amministratore"),
}, table => [primaryKey({ columns: [table.tipo, table.scheda] })]);

/** Every switch of a card, with its name and edition at that moment (shown in /admin/registro). */
export const cardVisibilityLog = pgTable("grimorio_card_visibility_log", {
  id: uuid("id").primaryKey(),
  tipo: text("tipo").notNull(),
  scheda: text("scheda").notNull(),
  nome: text("nome").notNull(),
  edizione: text("edizione").notNull(),
  nascosta: boolean("nascosta").notNull(),
  autore: text("autore").notNull().default("amministratore"),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Published homebrew creatures (lib/homebrew.ts): the plain-text draft, its edition and its author (null: the Grimorio). */
export const homebrew = pgTable("grimorio_homebrew", {
  id: text("id").primaryKey(),
  scheda: jsonb("scheda").notNull(),
  edizione: text("edizione").notNull(),
  autore: text("autore"),
  proposta_id: uuid("proposta_id"),
  pubblicata_il: timestamp("pubblicata_il", { withTimezone: true }).notNull().defaultNow(),
  aggiornata_il: timestamp("aggiornata_il", { withTimezone: true }).notNull().defaultNow(),
  /** The licence of the card (CC BY-NC-SA 4.0); empty on the creatures proposed before it. */
  licenza: text("licenza"),
});

/** Creatures proposed from /bestiario/proponi; the optional email is deleted at the decision. */
export const homebrewProposals = pgTable("grimorio_homebrew_proposals", {
  id: uuid("id").primaryKey(),
  stato: text("stato").notNull().default("da-vedere"),
  scheda: jsonb("scheda").notNull(),
  nickname: text("nickname").notNull(),
  email: text("email"),
  originale: boolean("originale").notNull(),
  autorizza: boolean("autorizza").notNull(),
  impronta: text("impronta"),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
  decisa_il: timestamp("decisa_il", { withTimezone: true }),
  motivo: text("motivo"),
  homebrew_id: text("homebrew_id"),
  /** The licence accepted with the form («CC BY-NC-SA 4.0»); empty on the proposals sent before it. */
  licenza: text("licenza"),
});

/** Send limits of the proposals: salted hash of the address, one day. */
export const homebrewLimits = pgTable("grimorio_homebrew_limits", {
  device_hash: text("device_hash").notNull(),
  sent_at: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Published, created, corrected, deleted, refused (shown in /admin/registro). */
export const homebrewLog = pgTable("grimorio_homebrew_log", {
  id: uuid("id").primaryKey(),
  homebrew_id: text("homebrew_id").notNull(),
  nome: text("nome").notNull(),
  edizione: text("edizione").notNull(),
  azione: text("azione").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * VAPID key pair of the admin push notifications (lib/push.ts), only when the server variables
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set: generated once, never sent to the browser.
 */
export const pushKeys = pgTable("grimorio_push_keys", {
  id: text("id").primaryKey(),
  public_key: text("public_key").notNull(),
  private_key: text("private_key").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Admin devices that receive the notifications (/admin/notifiche). */
export const pushSubscriptions = pgTable("grimorio_push_subscriptions", {
  id: uuid("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  dispositivo: text("dispositivo").notNull(),
  creata_il: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Switch of each kind of notification; a kind without a row uses its default (lib/push.ts). */
export const pushTypes = pgTable("grimorio_push_types", {
  tipo: text("tipo").primaryKey(),
  attivo: boolean("attivo").notNull(),
  aggiornata_il: timestamp("aggiornata_il", { withTimezone: true }).notNull().defaultNow(),
});
