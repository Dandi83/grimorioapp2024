const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id.startsWith('./')){const file=path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   return load(file+'.ts');}
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const adv=load('lib/advancement.ts');
const ch=load('lib/advancement-challenge.ts');
const manual=JSON.parse(fs.readFileSync('lib/data/srd-manual-5.2.1-it.json','utf8'));
const creation=manual.entries.find(e=>e.id==='personaggi-creazione-del-personaggio');

// Level from XP, as asked: 299 → 1, 300 → 2, 355.000 → 20, 400.000 → 20 with one bonus feat.
assert.equal(adv.levelForXp(299).livello,1);assert.equal(adv.levelForXp(299).mancanti,1);
assert.equal(adv.levelForXp(300).livello,2);
assert.equal(adv.levelForXp(355000).livello,20);assert.equal(adv.levelForXp(355000).talentiBonus,0);assert.equal(adv.levelForXp(355000).prossimo,undefined);
assert.equal(adv.levelForXp(400000).livello,20);assert.equal(adv.levelForXp(400000).talentiBonus,1);
assert.equal(adv.levelForXp(415000).talentiBonus,2);assert.equal(adv.levelForXp(0).livello,1);
// The table of the request, and the same numbers printed in the 2024 manual tables.
const request='1·0·+2 | 2·300·+2 | 3·900·+2 | 4·2.700·+2 | 5·6.500·+3 | 6·14.000·+3 | 7·23.000·+3 | 8·34.000·+3 | 9·48.000·+4 | 10·64.000·+4 | 11·85.000·+4 | 12·100.000·+4 | 13·120.000·+5 | 14·140.000·+5 | 15·165.000·+5 | 16·195.000·+5 | 17·225.000·+6 | 18·265.000·+6 | 19·305.000·+6 | 20·355.000·+6';
assert.deepEqual(adv.LEVELS.map(l=>`${l.livello}·${adv.formatNumber(l.pe)}·+${l.bonus}`).join(' | '),request);
const printed=new Map();
for(const b of creation.blocks.filter(b=>b.kind==='table'&&/Punti esperienza/.test(b.text)))
 for(const m of b.text.matchAll(/^\s*(\d+)\s+([\d.]+)\s+\+(\d)\s*$/gm))printed.set(+m[1],[Number(m[2].replace(/\./g,'')),+m[3]]);
for(const l of adv.LEVELS)if(printed.has(l.livello))assert.deepEqual(printed.get(l.livello),[l.pe,l.bonus],'manual level '+l.livello);
assert.ok(printed.size>=13,'most levels found in the manual text: '+printed.size);
assert.deepEqual(adv.LEVELS.filter(adv.bonusRises).map(l=>l.livello),[5,9,13,17]);
assert.equal(adv.formatNumber(2700),'2.700');assert.equal(adv.formatNumber(355000),'355.000');assert.equal(adv.formatNumber(300),'300');
// XP split: rounded down, the rest reported.
assert.deepEqual(adv.splitXp(1000,3),{aTesta:333,resto:1});assert.deepEqual(adv.splitXp(1800,4),{aTesta:450,resto:0});
// Fixed hit points: the request and the 2024 table "Punti ferita fissi per classe".
assert.deepEqual(adv.CLASS_HIT_POINTS.map(g=>`${g.classi.join(',')}:${g.dado}:${g.fisso}`),
 ['Barbaro:d12:7','Guerriero,Paladino,Ranger:d10:6','Bardo,Chierico,Druido,Monaco,Ladro,Warlock:d8:5','Stregone,Mago:d6:4']);
const fixed=creation.blocks.find(b=>b.text.startsWith('Punti ferita fissi per classe')).text.replace(/\s+/g,' ');
for(const pattern of [/Barbaro 7 \+ modificatore di Cos/,/Guerriero, paladino 6 \+ modificatore di Cos o ranger/,/Bardo, chierico, druido, 5 \+ modificatore di Cos monaco, ladro o warlock/,/Stregone o mago 4 \+ modificatore di Cos/])
 assert.match(fixed,pattern);
// Bonus feats: the manual text, joined, never written by hand.
const feats=ch.bonusFeatsRule();
assert.equal(feats.title,'Talenti bonus al 20º livello');
assert.ok(feats.text.includes('un talento a scelta per ogni 30.000 PE guadagnati oltre i 355.000 PE'));
assert.ok(!/-\s|\n/.test(feats.text.replace(/ - /g,'')),'no hyphenation or line breaks left');
// Challenge ratings: XP read from the monster sheets; the Arcimago 2024 misprint left out.
const options=ch.challengeOptions();
assert.equal(new Set(options.map(o=>o.key)).size,options.length);
const sheets=['srd-monsters-5.2.1-it.json','srd-monsters-5.1-it.json','srd-animals-5.2.1-it.json'].flatMap(f=>JSON.parse(fs.readFileSync('lib/data/'+f,'utf8')).records.map(r=>r.monster));
for(const o of options)assert.ok(sheets.some(s=>s.gs_num===o.gs&&String(s.px).split(/, o | nella tana/).map(x=>Number(x.replace(/\./g,''))).includes(o.pe)),o.label);
assert.equal(options.find(o=>o.label==='GS 12').pe,8400);
assert.deepEqual(ch.challengeOutliers(),['Arcimago (GS 12): 8000']);
assert.deepEqual(options.filter(o=>o.label==='GS 0').map(o=>o.pe).sort((a,b)=>a-b),[0,10]);
assert.ok(!options.some(o=>o.gs===18),'no sheet with GS 18: not offered');
// Offline and navigation.
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
assert.ok(new RegExp(sw.match(/const PUBLIC_PAGE = (\/.*\/);/)[1].slice(1,-1)).test('/avanzamento'));
console.log(`Advancement: levels from XP (299→1, 300→2, 355.000→20, 400.000→20 + 1 bonus feat), table equal to the manual, XP split rounded down, fixed hit points, bonus feats text, ${options.length} challenge choices from the monster sheets.`);
