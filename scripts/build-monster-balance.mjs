// Bilanciamento (PROMPT 11, 19): the measures of every SRD monster (2014: SRD 5.1; 2024: SRD 5.2.1 with its animals),
// saved in lib/data/monster-balance-srd.json (read only by the server of the reserved area): 800 simulated fights for
// each of the three tactics against 4 characters of the level of the CR, and 300 for each of the 7 test situations.
// Same seed, same file: --check fails when the file is not up to date (also in CI).
// Usage: NODE_OPTIONS=--require=./tests/register-ts.cjs node scripts/build-monster-balance.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { readMonster } = require("../lib/monster-balance/parse.ts");
const { TACTICS } = require("../lib/monster-balance/simulate.ts");
const { measure, REFERENCE_FIGHTS, STRESS, STRESS_FIGHTS } = require("../lib/monster-balance/scenarios.ts");

const FILE = new URL("../lib/data/monster-balance-srd.json", import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(`../lib/data/${file}`, import.meta.url), "utf8")).records.map(record => record.monster);

function rows(sheets) {
  return sheets.map(sheet => {
    const model = readMonster(sheet);
    if (!model.simulable) return null;
    const { tactics, stress } = measure(model, REFERENCE_FIGHTS, STRESS_FIGHTS);
    return {
      id: sheet.id, name: sheet.nome, cr: model.cr, ac: model.ac, hp: model.hp, toHit: model.toHit, dc: model.dc,
      tactics,
      stress: Object.fromEntries(STRESS.map(({ key }) => [key, { rounds: stress[key].rounds, wipePct: stress[key].wipePct, winPct: stress[key].winPct }])),
    };
  }).filter(Boolean).sort((a, b) => a.cr - b.cr || a.id.localeCompare(b.id));
}

const started = Date.now();
const data = {
  note: "Bilanciamento (PROMPT 11, 19): misure simulate dei mostri SRD, seme fisso: 800 combattimenti per ciascuna delle tre tattiche (ottimale, a caso, prudente) e 300 per ciascuna delle 7 situazioni di prova. Generato da scripts/build-monster-balance.mjs: non modificare a mano. Solo per il server dell'area riservata.",
  fights: REFERENCE_FIGHTS,
  stressFights: STRESS_FIGHTS,
  tactics: TACTICS,
  stress: STRESS.map(({ key }) => key),
  editions: {
    2014: rows(read("srd-monsters-5.1-it.json")),
    2024: rows([...read("srd-monsters-5.2.1-it.json"), ...read("srd-animals-5.2.1-it.json")]),
  },
};
// One monster per line: a small file, and a readable diff.
const editions = Object.entries(data.editions).map(([edition, list]) => `  "${edition}": [\n${list.map(row => `   ${JSON.stringify(row)}`).join(",\n")}\n  ]`).join(",\n");
const head = JSON.stringify({ ...data, editions: undefined }, null, 1).replace(/\n}$/, "");
const text = `${head},\n "editions": {\n${editions}\n }\n}\n`;
JSON.parse(text);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(FILE, "utf8"); } catch {}
  if (current !== text) {
    console.error("[bilanciamento] lib/data/monster-balance-srd.json non è aggiornato: esegui scripts/build-monster-balance.mjs");
    process.exit(1);
  }
  console.log(`[bilanciamento] Dati SRD aggiornati: ${data.editions[2014].length} mostri 2014, ${data.editions[2024].length} mostri 2024 (${seconds} s).`);
} else {
  writeFileSync(FILE, text);
  console.log(`[bilanciamento] Scritti ${data.editions[2014].length} mostri 2014 e ${data.editions[2024].length} mostri 2024 (${seconds} s).`);
}
