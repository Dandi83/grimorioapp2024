// PROMPT 46: an action with «Ricarica» or «N/giorno» is never the attack the Multiattack repeats, in the quick CR check
// (lib/homebrew-cr.ts, the box of the monster editor and of «Proponi») and in the full simulator (lib/monster-balance).
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/cr-ricarica.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
require.cache[require.resolve('server-only')]={exports:{}};
const cr=require('../lib/homebrew-cr.ts');
const {readMonster}=require('../lib/monster-balance/parse.ts');
const {simulate}=require('../lib/monster-balance/simulate.ts');
const reference=JSON.parse(fs.readFileSync('lib/data/gs-riferimento.json','utf8'));
const sheets=file=>JSON.parse(fs.readFileSync(`lib/data/${file}`,'utf8')).records.map(record=>record.monster);

// The Squartatore of the redazione (actions as written in its sheet; PF and CA those of a CR 13 creature).
const SQUARTATORE=[
  'Multiattacco. Lo Squartatore effettua tre attacchi, scegliendo in qualsiasi combinazione tra Bisturi e Lancette. Può sostituire uno di questi attacchi con Incisione, se è disponibile.',
  'Bisturi. Tiro per colpire in mischia: +11, portata 1,5 m. Colpito: 24 (4d8 + 6) danni taglienti.',
  'Lancette. Tiro per colpire a distanza: +11, gittata 18/36 m. Colpito: 17 (2d10 + 6) danni perforanti.',
  'Incisione (Ricarica 5–6). Tiro per colpire in mischia: +11, portata 1,5 m. Colpito: 24 (4d8 + 6) danni taglienti più 7 (2d6) danni necrotici.',
].join('\n\n');
// Before: 3 × Incisione (31) = 93 a round, GS stimato 15. Now: 3 × Bisturi (72) + (31 − 24) ÷ 3 = 74.
const danni=cr.damagePerRound(SQUARTATORE);
assert.equal(danni,74);
assert.ok(danni>=70&&danni<=80,`Squartatore: ${danni}`);
const result=cr.estimateChallenge({pf:195,ca:18,azioni:SQUARTATORE,gs:'13'},reference);
assert.ok(['12','13'].includes(result.stimato),`GS stimato ${result.stimato}`);
assert.equal(result.attacco,'13');
assert.equal(result.esito,'in-linea');

// «Scegliendo in qualsiasi combinazione tra X e Y»: the stronger of the two, never an action it does not name.
assert.equal(cr.damagePerRound('Multiattacco. Effettua due attacchi, scegliendo in qualsiasi combinazione tra Pugno e Calcio.\n\nPugno. Tiro per colpire in mischia: +5. Colpito: 7 (1d8 + 3) danni contundenti.\n\nCalcio. Tiro per colpire in mischia: +5. Colpito: 9 (2d6 + 2) danni contundenti.'),18);

// A breath with «Ricarica» outside the Multiattack (an SRD dragon): the better of the Multiattack and the 3-round
// average, once the breath and twice the Multiattack.
const dragon=sheets('srd-monsters-5.2.1-it.json').find(m=>m.nome==='Drago nero adulto');
const stats=cr.statsOf(dragon);
const withoutBreath=stats.azioni.split(/\n\s*\n+/).filter(part=>!/^Soffio/.test(part.trim())).join('\n\n');
const base=cr.damagePerRound(withoutBreath);
assert.equal(base,51,'three Rend attacks of 17');
assert.equal(cr.damagePerRound(stats.azioni),Math.round(Math.max(base,(54+2*base)/3)));
assert.equal(cr.damagePerRound(stats.azioni),52);
// A limited action alone (no Multiattack): once every three rounds too.
assert.equal(cr.damagePerRound('Morso. Tiro per colpire in mischia: +4. Colpito: 6 (1d8 + 2) danni perforanti.\n\nSoffio (1/giorno). Ogni creatura in un cono deve effettuare un tiro salvezza su Destrezza con CD 12. Fallimento: 21 (6d6) danni da fuoco.'),11);

// A Multiattack without limited actions: as before (named attacks, or N attacks × the best one).
assert.equal(cr.damagePerRound('Multiattacco. Il troll effettua tre attacchi Artiglio.\n\nArtiglio. Tiro per colpire in mischia: +7. Colpito: 11 (2d6 + 4) danni taglienti.'),33);
assert.equal(cr.damagePerRound('Multiattacco. Effettua due attacchi.\n\nAscia. Tiro per colpire in mischia: +5. Colpito: 9 (1d12 + 3) danni taglienti.\n\nPugnale. Tiro per colpire in mischia: +5. Colpito: 5 (1d4 + 3) danni perforanti.'),18);
assert.equal(cr.damagePerRound('Multiattacco. Effettua un attacco con il morso e due con gli artigli.\n\nMorso. Tiro per colpire in mischia: +6. Colpito: 10 (1d12 + 4) danni perforanti.\n\nArtigli. Tiro per colpire in mischia: +6. Colpito: 7 (1d6 + 4) danni taglienti.'),24);

// The full simulator: Incisione is read with its recharge, in the Multiattack, never the attack repeated three times.
const sheet={nome:'Squartatore',gs_num:13,classe_armatura:'18',punti_ferita:'195 (26d10 + 52)',azioni:SQUARTATORE.split('\n\n').map(part=>part.replace(/^([^.]+)\.\s*/,'<strong>$1.</strong> ')).join('<br><br>'),
  azioni_bonus:'',tratti:'',azioni_leggendarie:'',forza:20,destrezza:16,costituzione:14,intelligenza:10,saggezza:12,carisma:8};
const model=readMonster(sheet);
assert.equal(model.multiattack,3);
const incisione=model.attacks.find(a=>a.name.startsWith('Incisione'));
assert.equal(incisione.recharge,5);assert.equal(incisione.inMultiattack,true);
assert.equal(model.attacks.find(a=>a.name==='Bisturi').recharge,undefined);
const fixed=simulate(model,1500).damagePerRound;
// The old reading: Incisione as an ordinary attack, three times every turn.
const old=simulate({...model,attacks:model.attacks.map(a=>({name:a.name,bonus:a.bonus,dice:a.dice,average:a.average}))},1500).damagePerRound;
// Bisturi alone, three times: the fixed reading adds Incisione once in a while, never three times.
const plain=simulate({...model,attacks:model.attacks.filter(a=>a.name==='Bisturi')},1500).damagePerRound;
assert.ok(fixed<old,`simulator: ${fixed} < ${old}`);
assert.ok(fixed>=plain,`simulator: ${fixed} ≥ ${plain}`);
console.log(`Ricarica: Squartatore ${danni} danni a round (era 93), GS stimato ${result.stimato}; drago nero adulto 52 (media su 3 round); simulatore ${fixed} (lettura vecchia ${old}, solo Bisturi ${plain}).`);
