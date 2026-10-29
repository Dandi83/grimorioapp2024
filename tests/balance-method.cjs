// «Come valutiamo il bilanciamento» (PROMPT 19): the public page and docs/metodo-bilanciamento.md say the same thing
// (the texts of lib/balance-method.ts), with the real values of the simulator; only the method, never data of a monster.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/balance-method.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const m=require('../lib/balance-method.ts');
const {party,heroDc}=require('../lib/monster-balance/party.ts');
const doc=fs.readFileSync('docs/metodo-bilanciamento.md','utf8');
const page=fs.readFileSync('app/bestiario/creati-da-voi/bilanciamento/page.tsx','utf8');
// Every text of the page is in the document, word for word.
const texts=[m.METHOD_TITLE,m.METHOD_INTRO,...m.METHOD_STEPS.flatMap(step=>[step.title,step.text]),m.METHOD_LIMITS_TITLE,...m.METHOD_LIMITS,m.METHOD_LIMITS_CLOSING,m.METHOD_REPORT,m.METHOD_DETAILS_TITLE,...m.METHOD_THRESHOLDS,...m.METHOD_WARNINGS];
for(const text of texts)assert.ok(doc.includes(text),`docs/metodo-bilanciamento.md: ${text.slice(0,80)}`);
for(const row of m.referenceTable())assert.ok(doc.includes(`| ${row.level} | ${row.ac} | ${row.hp} | ${row.attacks} | ${row.damage} | ${row.dc} |`),`row ${row.level}`);
// The page draws all of them.
for(const name of ['METHOD_TITLE','METHOD_INTRO','METHOD_STEPS','METHOD_LIMITS_TITLE','METHOD_LIMITS','METHOD_LIMITS_CLOSING','METHOD_REPORT','METHOD_DETAILS_TITLE','METHOD_THRESHOLDS','METHOD_WARNINGS','referenceTable'])assert.ok(page.includes(name),name);
// The five boxes of the canvas, in order, and the real values of the simulator.
assert.deepEqual(m.METHOD_STEPS.map(step=>step.title),['I numeri di base','Migliaia di combattimenti','Tre modi di giocarlo','Gruppi diversi e controlli extra','La prova del tavolo']);
assert.match(m.METHOD_STEPS[1].text,/3\.000 volte/);assert.match(m.METHOD_STEPS[1].text,/8 mostri ufficiali su 10/);assert.match(m.METHOD_STEPS[1].text,/4 personaggi \(guerriero, chierico, ladro e mago\)/);
assert.match(m.METHOD_STEPS[3].text,/7 situazioni/);
assert.equal(m.METHOD_LIMITS_CLOSING,'È una stima seria, non una garanzia. Il giudizio finale resta al master, e al tavolo.');
assert.equal(m.METHOD_LIMITS.length,4);
assert.match(m.METHOD_REPORT,/Info → Segnala un problema/);
// The table of the reference group: the same numbers as the simulator.
const table=m.referenceTable();assert.equal(table.length,20);
assert.equal(table[11].ac,party(12).map(h=>h.ac).join(' / '));assert.equal(table[11].hp,'100 / 87 / 87 / 74');assert.equal(table[11].dc,heroDc(12));
assert.equal(table[0].attacks,'1 × +5');assert.equal(table[19].attacks,'4 × +12');
// Only the method: the page never reads the data of the SRD monsters or the box of the reserved area.
for(const file of ['lib/balance-method.ts','app/bestiario/creati-da-voi/bilanciamento/page.tsx']){
 const code=fs.readFileSync(file,'utf8');
 assert.doesNotMatch(code,/monster-balance-srd|monster-balance["']|evaluateMonster|balanceBoxHtml|table-votes/,file);
}
// No first person of the writer («lo scrivo io»…) in the texts.
for(const text of texts)assert.doesNotMatch(text,/\b(scrivo io|lo scrivo|ho scritto)\b/i);
console.log(`Metodo del bilanciamento: ${texts.length} testi uguali nella pagina pubblica e in docs/metodo-bilanciamento.md, tabella del gruppo di riferimento dai numeri del simulatore, nessun dato dei mostri.`);
