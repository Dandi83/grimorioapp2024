// The calibration of the Bilanciamento (PROMPT 26): on the SRD monsters (each against its group without itself) the
// verdict gives «In linea» to 75–85% and «Fuori dal GS» to 5% at most, in 2014 and in 2024; no warning, the fixed
// checks aside, on more than 10% of them; the numbers of the public page and the tables of docs/metodo-bilanciamento.md
// are the real ones; the same data give the same results.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/balance-calibration.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const {calibrate,calibrationTables,percent,CALIBRATION_LIMITS:L,FIXED_WARNING}=require('../lib/monster-balance/calibration.ts');
const {CALIBRATION,METHOD_STEPS,METHOD_THRESHOLDS}=require('../lib/balance-method.ts');
const results=['2014','2024'].map(edition=>calibrate(edition));
for(const {edition,total,levels,warnings} of results){
 const inLine=percent(levels['in linea'],total),out=percent(levels.fuori,total);
 assert.ok(inLine>=L.inLineLow&&inLine<=L.inLineHigh,`${edition}: «In linea» ${inLine}% (75–85%)`);
 assert.ok(out<=L.outHigh,`${edition}: «Fuori dal GS» ${out}% (5% at most)`);
 assert.equal(levels['in linea']+levels['da controllare']+levels.fuori,total);
 for(const [key,count] of Object.entries(warnings))if(!FIXED_WARNING.test(key))assert.ok(percent(count,total)<=L.warningHigh,`${edition}: avviso ${key} su ${count} mostri SRD (${percent(count,total)}%)`);
 // The numbers written for the public page.
 assert.deepEqual(CALIBRATION[edition],{total,inLine:levels['in linea'],check:levels['da controllare'],out:levels.fuori},`lib/balance-method.ts CALIBRATION ${edition}`);
}
// The same data and seed, the same results.
assert.deepEqual(['2014','2024'].map(edition=>calibrate(edition)),results);
// The fixed checks keep their rule: heavy control, resistance to every weapon at a low CR, magic resistance with legendary ones.
assert.ok(FIXED_WARNING.test('controllo:paralizzato')&&FIXED_WARNING.test('contromosse:armi')&&FIXED_WARNING.test('contromosse:magia'));
assert.ok(!FIXED_WARNING.test('contromosse:condizioni')&&!FIXED_WARNING.test('colpo')&&!FIXED_WARNING.test('prova:tre:round'));
// The report of docs/metodo-bilanciamento.md is up to date.
const doc=fs.readFileSync('docs/metodo-bilanciamento.md','utf8');
const tables=calibrationTables(results);
for(const line of [...tables.verdicts,...tables.warnings])assert.ok(doc.includes(`${line}\n`),`docs/metodo-bilanciamento.md: ${line}`);
// The sentence that can be checked, with the real numbers of both editions.
const text=[...METHOD_STEPS.map(step=>step.text),...METHOD_THRESHOLDS].join('\n');
assert.ok(text.includes('Con questa regola, circa 8 mostri ufficiali su 10 risultano "in linea"'));
for(const edition of ['2014','2024']){const {inLine,total}=CALIBRATION[edition];assert.ok(text.includes(`${inLine} su ${total} (${Math.round(inLine/total*100)}%) nel ${edition}`),edition);}
const [a,b]=results;
console.log(`Taratura del bilanciamento: 2014 ${a.levels['in linea']}/${a.total} in linea (${percent(a.levels['in linea'],a.total)}%), ${a.levels.fuori} fuori; 2024 ${b.levels['in linea']}/${b.total} (${percent(b.levels['in linea'],b.total)}%), ${b.levels.fuori} fuori; nessun avviso oltre il 10%; tabelle in docs aggiornate.`);
