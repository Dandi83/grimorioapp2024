import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  readFileSync(join(__dirname, "..", "lib", "data", "incantesimi_2024.json"), "utf8"),
);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const seen = new Set();
  const rows = [];
  for (const item of raw) {
    const name = (item.nome_italiano || "").trim();
    if (!name) continue;
    let id = slugify(name);
    let suffix = 2;
    while (seen.has(id)) id = `${slugify(name)}-${suffix++}`;
    seen.add(id);
    rows.push({
      id,
      nome_italiano: name,
      livello: item.livello || "",
      tempo_di_lancio: item.tempo_di_lancio || "",
      gittata: item.gittata || "",
      componenti: item.componenti || "",
      durata: item.durata || "",
      descrizione: item.descrizione || "",
      sort_key: name.toLowerCase(),
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let count = 0;
    for (const r of rows) {
      await client.query(
        `INSERT INTO spells (id, nome_italiano, livello, tempo_di_lancio, gittata, componenti, durata, descrizione, sort_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.nome_italiano, r.livello, r.tempo_di_lancio, r.gittata, r.componenti, r.durata, r.descrizione, r.sort_key],
      );
      count++;
    }
    await client.query("COMMIT");
    console.log(`[seed] Inseriti/verificati ${count} incantesimi.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[seed] Errore:", e);
  process.exit(1);
});
