// Builds lib/data/gs-riferimento.json: for every challenge rating, the medians of the SRD creatures of the
// catalog (SRD 5.2.1 monsters and animals, SRD 5.1 monsters). No table of a non-SRD manual is used.
// Usage: node scripts/build-cr-reference.mjs   (prints the agreement of the estimate with the official ratings)
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const code = ts.transpileModule(readFileSync(new URL("lib/homebrew-cr.ts", root), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", code)(mod, mod.exports);
const { statsOf, damagePerRound, attackBonus, saveDc, estimateChallenge } = mod.exports;

const sheets = ["lib/data/srd-monsters-5.2.1-it.json", "lib/data/srd-animals-5.2.1-it.json", "lib/data/srd-monsters-5.1-it.json"]
  .flatMap(path => read(path).records.map(record => record.monster));
const gsNumber = gs => { const [a, b] = gs.split("/").map(Number); return b ? a / b : a; };
const median = values => { const list = values.filter(v => v !== null && Number.isFinite(v)).sort((a, b) => a - b); if (!list.length) return null; const m = list.length >> 1; return list.length % 2 ? list[m] : (list[m - 1] + list[m]) / 2; };
const groups = new Map();
for (const sheet of sheets) {
  const stats = statsOf(sheet);
  if (!sheet.grado_sfida || !Number.isFinite(stats.pf) || !Number.isFinite(stats.ca)) continue;
  const row = { pf: stats.pf, ca: stats.ca, attacco: attackBonus(stats.azioni), cd: saveDc(stats.azioni), danni: damagePerRound(stats.azioni) };
  if (!groups.has(sheet.grado_sfida)) groups.set(sheet.grado_sfida, []);
  groups.get(sheet.grado_sfida).push(row);
}
const righe = [...groups].sort((a, b) => gsNumber(a[0]) - gsNumber(b[0])).map(([gs, rows]) => ({
  gs, n: rows.length,
  pf: Math.round(median(rows.map(r => r.pf))), ca: Math.round(median(rows.map(r => r.ca))),
  attacco: median(rows.map(r => r.attacco)) === null ? null : Math.round(median(rows.map(r => r.attacco))),
  cd: median(rows.map(r => r.cd)) === null ? null : Math.round(median(rows.map(r => r.cd))),
  danni: Math.round(median(rows.map(r => r.danni))),
}));
const reference = {
  metodo: `Mediane per grado di sfida di ${sheets.length} creature SRD del catalogo (SRD 5.2.1 mostri e animali, SRD 5.1 mostri), calcolate da scripts/build-cr-reference.mjs con le funzioni di lib/homebrew-cr.ts.`,
  righe,
};
writeFileSync(new URL("lib/data/gs-riferimento.json", root), `${JSON.stringify(reference, null, 1)}\n`);

// Agreement of the estimate with the official ratings (within one step of the list).
const index = gs => righe.findIndex(row => row.gs === gs);
let within = 0, total = 0;
for (const sheet of sheets) {
  const stats = statsOf(sheet);
  if (index(sheet.grado_sfida) < 0 || !Number.isFinite(stats.pf)) continue;
  const result = estimateChallenge(stats, reference);
  total++;
  if (Math.abs(index(result.stimato) - index(sheet.grado_sfida)) <= 1) within++;
}
console.log(`GS di riferimento: ${righe.length} gradi da ${sheets.length} creature; stima entro ±1 per ${within} creature su ${total} (${Math.round((within / total) * 100)}%).`);
