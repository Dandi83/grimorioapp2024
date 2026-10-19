// In-memory PostgreSQL (PGlite) for browser tests: never a real database.
// Spells come from the repository fixture; SRD creatures are the app's built-in records.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

export const TEST_DB_PORT = 54329;
export const TEST_DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${TEST_DB_PORT}/postgres?sslmode=disable`;

const slugify = name => name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function startTestDatabase() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE spells (
      id text PRIMARY KEY, nome_italiano text NOT NULL, livello text NOT NULL DEFAULT '',
      tempo_di_lancio text NOT NULL DEFAULT '', gittata text NOT NULL DEFAULT '', componenti text NOT NULL DEFAULT '',
      durata text NOT NULL DEFAULT '', descrizione text NOT NULL DEFAULT '', sort_key text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE monsters (
      id text PRIMARY KEY, nome text NOT NULL, tipo text NOT NULL DEFAULT '', taglia text NOT NULL DEFAULT '',
      allineamento text NOT NULL DEFAULT '', grado_sfida text NOT NULL DEFAULT '', px text NOT NULL DEFAULT '',
      classe_armatura text NOT NULL DEFAULT '', punti_ferita text NOT NULL DEFAULT '', velocita text NOT NULL DEFAULT '',
      forza integer NOT NULL DEFAULT 10, destrezza integer NOT NULL DEFAULT 10, costituzione integer NOT NULL DEFAULT 10,
      intelligenza integer NOT NULL DEFAULT 10, saggezza integer NOT NULL DEFAULT 10, carisma integer NOT NULL DEFAULT 10,
      tiri_salvezza text NOT NULL DEFAULT '', abilita text NOT NULL DEFAULT '', vulnerabilita text NOT NULL DEFAULT '',
      resistenze text NOT NULL DEFAULT '', immunita_danni text NOT NULL DEFAULT '', immunita_condizioni text NOT NULL DEFAULT '',
      sensi text NOT NULL DEFAULT '', linguaggi text NOT NULL DEFAULT '', tratti text NOT NULL DEFAULT '',
      azioni text NOT NULL DEFAULT '', reazioni text NOT NULL DEFAULT '', azioni_leggendarie text NOT NULL DEFAULT '',
      descrizione text NOT NULL DEFAULT '', sort_key text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE grimorio_content_editions (
      content_kind text NOT NULL CHECK (content_kind IN ('monster', 'spell')), content_id text NOT NULL,
      edition text NOT NULL CHECK (edition IN ('2014', '2024')), updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (content_kind, content_id)
    );
    CREATE TABLE grimorio_monster_details (
      monster_id text PRIMARY KEY REFERENCES monsters(id) ON DELETE CASCADE, fields jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `);
  const raw = JSON.parse(readFileSync(new URL("../lib/data/incantesimi_2024.json", import.meta.url), "utf8"));
  const seen = new Set();
  for (const item of raw) {
    const name = (item.nome_italiano || "").trim();
    if (!name) continue;
    let id = slugify(name), suffix = 2;
    while (seen.has(id)) id = `${slugify(name)}-${suffix++}`;
    seen.add(id);
    await db.query(
      "INSERT INTO spells (id, nome_italiano, livello, tempo_di_lancio, gittata, componenti, durata, descrizione, sort_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [id, name, item.livello || "", item.tempo_di_lancio || "", item.gittata || "", item.componenti || "", item.durata || "", item.descrizione || "", name.toLowerCase()],
    );
  }
  const server = new PGLiteSocketServer({ db, port: TEST_DB_PORT, host: "127.0.0.1", maxConnections: 200 });
  await server.start();
  return { spells: seen.size, async stop() { await server.stop(); await db.close(); } };
}
