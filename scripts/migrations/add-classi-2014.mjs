// Adds the 2014 classes to the «livello» field of 34 spells added in the reserved area, and fixes one name.
// Usage: node aggiungi-classi.mjs --dry-run | --apply   (DATABASE_URL from the environment, never printed)
// --dry-run: reads, writes the backup file to $BACKUP_DIR (default /tmp, outside the repository), prints before → after, changes nothing.
// --apply: same checks, then one transaction; aborts if any row count differs from the plan.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import pg from "pg";

const CLASSES = {
  "amicizia-2": "Bardo, Mago, Stregone, Warlock", "frusta-di-spine-2": "Druido", "interdizione-alle-lame-2": "Bardo, Mago, Stregone, Warlock",
  "armatura-di-agathis": "Warlock", "braccia-di-hadar-2": "Warlock", "colpo-intrappolante-2": "Ranger", "dardo-stregato-2": "Mago, Stregone, Warlock",
  "duello-obbligato-2": "Paladino", "globo-cromatico-2": "Mago, Stregone", "raffica-di-spine-2": "Ranger", "raggio-di-infermita-2": "Mago, Stregone",
  "sortilegio-2": "Warlock", "sussurri-dissonanti-2": "Bardo", "corona-di-frecce": "Ranger", "corona-di-follia-2": "Bardo, Mago, Stregone, Warlock",
  "nube-di-pugnali-2": "Bardo, Mago, Stregone, Warlock", "percezione-delle-bestie-2": "Druido, Ranger", "arma-elementale-2": "Paladino",
  "aura-di-vitalita-2": "Paladino", "evoca-raffica-2": "Ranger", "fame-di-hadar-2": "Warlock", "freccia-folgorante-2": "Ranger",
  "morte-apparente-2": "Bardo, Chierico, Druido, Mago", "aura-di-purezza-2": "Paladino", "aura-di-vita-2": "Paladino",
  "rampicante-afferrante-2": "Druido, Ranger", "cerchio-di-potere-2": "Paladino", "evoca-pioggia-di-armi-2": "Ranger", "faretra-rapida-2": "Ranger",
  "onda-distruttiva-2": "Paladino", "portale-arcano-2": "Mago, Stregone, Warlock", "telepatia-2": "Mago", "tsunami-2": "Druido",
  "parola-del-poter-guarire": "Bardo",
};
const RENAME = { id: "parola-del-poter-guarire", from: "Parola del poter Guarire", to: "Parola del potere guarire" };

const mode = process.argv[2];
assert.ok(["--dry-run", "--apply"].includes(mode), "Use --dry-run or --apply");
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
const ids = Object.keys(CLASSES);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("SELECT * FROM spells WHERE id = ANY($1) ORDER BY id", [ids]);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`${process.env.BACKUP_DIR ?? "/tmp"}/backup-classi-2014-${stamp}.json`, JSON.stringify(rows, null, 1));
  console.log(`Backup: ${rows.length} rows saved (${process.env.BACKUP_DIR ?? "/tmp"}/backup-classi-2014-${stamp}.json, fuori dal repository).`);
  const byId = new Map(rows.map(row => [row.id, row]));
  const plan = [], skipped = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) { skipped.push(`${id}: non esiste`); continue; }
    const before = row.livello ?? "";
    // SRD 2014 format: «Scuola di N° livello (classe, classe)» / «Trucchetto di Scuola (classe)», classes in lower case.
    if (/\(/.test(before)) { skipped.push(`${id}: ha già delle parentesi «${before}»`); continue; }
    if (!/(\d+\s*[°º]\s*livello|trucchetto)/i.test(before)) { skipped.push(`${id}: formato inatteso «${before}»`); continue; }
    const after = `${before.trim()} (${CLASSES[id].toLowerCase()})`;
    plan.push({ id, before, after });
  }
  const renameRow = byId.get(RENAME.id);
  const rename = renameRow && renameRow.nome_italiano === RENAME.from;
  if (renameRow && !rename) skipped.push(`${RENAME.id}: nome attuale «${renameRow.nome_italiano}», atteso «${RENAME.from}» (nome non cambiato)`);
  for (const p of plan) console.log(`${p.id}: «${p.before}» → «${p.after}»`);
  if (rename) console.log(`${RENAME.id} (nome): «${RENAME.from}» → «${RENAME.to}»`);
  for (const s of skipped) console.log(`SALTATO ${s}`);
  if (mode === "--dry-run") { console.log(`Prova a secco: ${plan.length} livelli e ${rename ? 1 : 0} nome da cambiare; nulla scritto.`); process.exit(0); }

  await client.query("BEGIN");
  let changed = 0;
  for (const p of plan) {
    // Only this field, only if it is still the value read above.
    const r = await client.query("UPDATE spells SET livello = $1 WHERE id = $2 AND livello = $3", [p.after, p.id, p.before]);
    assert.equal(r.rowCount, 1, `${p.id}: expected 1 row`);
    changed += r.rowCount;
  }
  if (rename) {
    const r = await client.query("UPDATE spells SET nome_italiano = $1 WHERE id = $2 AND nome_italiano = $3", [RENAME.to, RENAME.id, RENAME.from]);
    assert.equal(r.rowCount, 1, "rename: expected 1 row");
  }
  assert.equal(changed, plan.length);
  await client.query("COMMIT");
  console.log(`Applicato: ${changed} righe con il livello cambiato, ${rename ? 1 : 0} nome (stessa riga di parola-del-poter-guarire).`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Annullato, nessuna modifica:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
