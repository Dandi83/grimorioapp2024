// The calibration of the Bilanciamento (PROMPT 26): on the SRD monsters (each against its group without itself) the
// verdict gives «In linea» to 75–85% and «Fuori dal GS» to 5% at most, in 2014 and in 2024; no warning, the fixed
// checks aside, on more than 10% of them; the numbers of the public page and the tables of docs/metodo-bilanciamento.md
// are the real ones; the same data give the same results. PROMPT 29: the tolerance of «In linea» is the first of 15%,
// 20%, 25% that fits; a creature with 40% more damage in two tactics, or far more characters down, is not «In linea».
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/balance-calibration.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const {calibrate,calibrationTables,chooseTolerance,percent,CALIBRATION_LIMITS:L,TOLERANCE_STEPS,FIXED_WARNING}=require('../lib/monster-balance/calibration.ts');
const {compare,TOLERANCE,MEASURES,MAX_OUT,FAR_LIMIT,FAR_COUNT,VERY_FAR_LIMIT}=require('../lib/monster-balance/compare.ts');
const {TACTICS}=require('../lib/monster-balance/simulate.ts');
const {STRESS}=require('../lib/monster-balance/scenarios.ts');
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
// The tolerance (PROMPT 29): 15% first, then steps of 5% up to 25%; the one in use is the first that fits both editions.
assert.deepEqual(TOLERANCE_STEPS,{start:15,step:5,max:25});
assert.equal(chooseTolerance(),TOLERANCE,'TOLERANCE is the first step that fits');
assert.ok(TOLERANCE>=TOLERANCE_STEPS.start&&TOLERANCE<=TOLERANCE_STEPS.max&&(TOLERANCE-TOLERANCE_STEPS.start)%TOLERANCE_STEPS.step===0);
for(let below=TOLERANCE_STEPS.start;below<TOLERANCE;below+=TOLERANCE_STEPS.step)
 assert.ok(['2014','2024'].some(edition=>{const {levels,total}=calibrate(edition,below);return percent(levels['in linea'],total)<L.inLineLow;}),`${below}%: below 75% in one edition`);
assert.equal(MEASURES,7);assert.equal(MAX_OUT,2);assert.equal(FAR_LIMIT,50);assert.equal(FAR_COUNT,2);assert.equal(VERY_FAR_LIMIT,100);
// The cases of the rule, on a group whose band is exactly 10 damage, 4 rounds, 50% of fights with a character down.
const metricsOf=(d,r,down=50)=>({damagePerRound:d,rounds:r,downPct:down,wipePct:0,winPct:100,oneShotPct:0});
const stress=Object.fromEntries(STRESS.map(x=>[x.key,{rounds:4,wipePct:10,winPct:80}]));
const flat=[0,1,2,3,4,5].map(i=>({id:`f${i}`,name:`f${i}`,cr:3,ac:13,hp:60,toHit:5,dc:13,tactics:Object.fromEntries(TACTICS.map(t=>[t,metricsOf(10,4)])),stress}));
const judge=(over={})=>compare({tactics:{ottimale:metricsOf(10,4),caso:metricsOf(10,4),prudente:metricsOf(10,4),...over},stress},3,flat);
assert.equal(judge().level,'in linea');
// +40% damage over the 95th percentile in two tactics: was «In linea» with the rule of PROMPT 26, now not.
const forty=judge({ottimale:metricsOf(14,4),caso:metricsOf(14,4)});
assert.equal(forty.out,2);assert.notEqual(forty.level,'in linea','+40% in two tactics: not «In linea»');assert.equal(forty.level,'da controllare');
// Two measures out by the tolerance at most: still «In linea»; just over it: «Da controllare».
assert.equal(judge({ottimale:metricsOf(10*(1+TOLERANCE/100),4),caso:metricsOf(10*(1+TOLERANCE/100),4)}).level,'in linea');
assert.equal(judge({ottimale:metricsOf(10*(1+TOLERANCE/100)+0.1,4)}).level,'da controllare','one measure just over the tolerance');
// «PG a terra» (optimal tactic) is the seventh measure: far out, not «In linea»; over 100% alone, «Fuori dal GS».
const down=judge({ottimale:metricsOf(10,4,90)});
assert.equal(down.out,1);assert.notEqual(down.level,'in linea','characters down far out: not «In linea»');assert.match(down.sentence,/manda a terra troppi PG \(\+80%\)/);
assert.equal(judge({ottimale:metricsOf(10,4,20)}).level,'da controllare','−60%: one measure out by more than 50% alone is not «Fuori dal GS»');
assert.equal(judge({caso:metricsOf(10,4,95)}).level,'in linea','characters down count with the optimal tactic only');
// «Fuori dal GS»: two measures over 50%, or one over 100%.
assert.equal(judge({ottimale:metricsOf(15.1,4),caso:metricsOf(15.1,4)}).level,'fuori');
assert.equal(judge({ottimale:metricsOf(15.1,4)}).level,'da controllare');
assert.equal(judge({ottimale:metricsOf(20.1,4)}).level,'fuori','one measure over 100%');
assert.equal(judge({ottimale:metricsOf(20,4)}).level,'da controllare','+100% exactly: not over');
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
