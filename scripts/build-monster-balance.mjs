// Bilanciamento (PROMPT 11): the measures of every SRD monster (2014: SRD 5.1; 2024: SRD 5.2.1 with its animals),
// 800 simulated fights each against 4 characters of the level of the CR, saved in lib/data/monster-balance-srd.json
// (read only by the server of the reserved area). Same seed, same file: --check fails when the file is not up to date.
// Usage: NODE_OPTIONS=--require=./tests/register-ts.cjs node scripts/build-monster-balance.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { readMonster } = require("../lib/monster-balance/parse.ts");
const { simulate } = require("../lib/monster-balance/simulate.ts");

export const REFERENCE_FIGHTS = 800;
const FILE = new URL("../lib/data/monster-balance-srd.json", import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(`../lib/data/${file}`, import.meta.url), "utf8")).records.map(record => record.monster);

function rows(sheets) {
  return sheets.map(sheet => {
    const model = readMonster(sheet);
    if (!model.simulable) return null;
    const metrics = simulate(model, REFERENCE_FIGHTS);
    return { id: sheet.id, name: sheet.nome, cr: model.cr, ...metrics, ac: model.ac, hp: model.hp, toHit: model.toHit, dc: model.dc };
  }).filter(Boolean).sort((a, b) => a.cr - b.cr || a.id.localeCompare(b.id));
}

const data = {
  note: "Bilanciamento (PROMPT 11): misure simulate dei mostri SRD, 800 combattimenti ciascuno, seme fisso. Generato da scripts/build-monster-balance.mjs: non modificare a mano. Solo per il server dell'area riservata.",
  fights: REFERENCE_FIGHTS,
  editions: {
    2014: rows(read("srd-monsters-5.1-it.json")),
    2024: rows([...read("srd-monsters-5.2.1-it.json"), ...read("srd-animals-5.2.1-it.json")]),
  },
};
const text = `${JSON.stringify(data, null, 1)}\n`;
if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(FILE, "utf8"); } catch {}
  if (current !== text) {
    console.error("[bilanciamento] lib/data/monster-balance-srd.json non è aggiornato: esegui scripts/build-monster-balance.mjs");
    process.exit(1);
  }
  console.log(`[bilanciamento] Dati SRD aggiornati: ${data.editions[2014].length} mostri 2014, ${data.editions[2024].length} mostri 2024.`);
} else {
  writeFileSync(FILE, text);
  console.log(`[bilanciamento] Scritti ${data.editions[2014].length} mostri 2014 e ${data.editions[2024].length} mostri 2024.`);
}
