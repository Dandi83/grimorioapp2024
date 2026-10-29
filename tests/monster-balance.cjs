// Bilanciamento (PROMPT 11): the reading of the sheets, the fights, the comparison, the box; administrator only.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/monster-balance.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module');
require.cache[require.resolve('server-only')]={exports:{}};
const {readMonster,multiattackCount,damageDice,entries}=require('../lib/monster-balance/parse.ts');
const {simulate}=require('../lib/monster-balance/simulate.ts');
const {party,levelOf,heroDc,wizard,fighter,cleric}=require('../lib/monster-balance/party.ts');
const {compare,band,referenceGroup,gapFromCr}=require('../lib/monster-balance/compare.ts');
const balance=require('../lib/monster-balance/index.ts');
const sheets=file=>JSON.parse(fs.readFileSync(`lib/data/${file}`,'utf8')).records.map(record=>record.monster);
const m2024=sheets('srd-monsters-5.2.1-it.json'),m2014=sheets('srd-monsters-5.1-it.json');
const find=(list,name)=>{const sheet=list.find(m=>m.nome===name);assert.ok(sheet,name);return sheet;};
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}

(async()=>{
 // Adult black dragon 2024: three Rend attacks, acid breath recharging on 5–6, 3 legendary uses, 3 legendary resistances.
 const dragon=readMonster(find(m2024,'Drago nero adulto'));
 assert.equal(dragon.ac,19);assert.equal(dragon.hp,195);assert.equal(dragon.cr,14);
 assert.equal(dragon.multiattack,3);
 assert.deepEqual(dragon.attacks.map(a=>[a.name,a.bonus,a.average]),[['Squarcio',11,17]]);
 assert.deepEqual(dragon.attacks[0].dice,[{count:2,sides:6,flat:6},{count:1,sides:8,flat:0}]);
 const breath=dragon.abilities.find(a=>a.name==='Soffio di acido');
 assert.deepEqual([breath.ability,breath.dc,breath.average,breath.half,breath.targets,breath.recharge],['des',18,54,true,2,5]);
 assert.equal(dragon.legendary.uses,3);
 assert.deepEqual(dragon.legendary.options.map(o=>[o.name,o.kind,o.cost,o.once]),[['Balzo','attack',1,false],['Nugolo di insetti','save',1,true]]);
 assert.equal(dragon.legendary.options[0].attack.name,'Squarcio');
 assert.equal(dragon.legendaryResistance,3,'«Resistenza leggendaria (3/giorno o 4/giorno nella» + «tana)» split in two entries');
 assert.deepEqual(dragon.saves,{for:6,des:7,cos:5,int:2,sag:6,car:4});
 assert.equal(dragon.toHit,11);assert.equal(dragon.dc,18);
 // Ice devil: three attacks, the one with more damage (Coda); magic resistance; the wall of ice has no damage.
 const devil=readMonster(find(m2024,'Diavolo del ghiaccio'));
 assert.equal(devil.multiattack,3);assert.equal(devil.magicResistance,true);
 assert.deepEqual(devil.attacks.map(a=>[a.name,a.average]),[['Coda',33],['Lancia di ghiaccio',24]]);
 assert.equal(devil.abilities.length,0);assert.equal(devil.legendary.uses,0);
 // Troll: 2024 and 2014 (+N al tiro per colpire), three attacks.
 const troll=readMonster(find(m2024,'Troll')),troll14=readMonster(find(m2014,'Troll'));
 assert.equal(troll.multiattack,3);assert.equal(troll.hp,94);
 assert.equal(troll14.multiattack,3);assert.deepEqual(troll14.attacks.map(a=>[a.name,a.bonus,a.average]),[['Artiglio',7,11],['Morso',7,7]]);
 assert.equal(troll14.ac,15);
 // Mummy 2014: one attack with the gaze; resistance to non-magical weapons counts; the curse dice are not damage.
 const mummy14=readMonster(find(m2014,'Mummia')),mummy=readMonster(find(m2024,'Mummia'));
 assert.equal(mummy14.multiattack,1);assert.equal(mummy14.weaponResistance,true);
 assert.deepEqual(mummy14.attacks.map(a=>[a.name,a.average]),[['Pugno di putrefazione',20]]);
 assert.equal(mummy.attacks[0].name,'Pugno di putrefazione');
 // A 2014 caster with the spells among the traits (Arcimago): only the dagger is an attack; magic resistance read.
 const mage=readMonster(find(m2014,'Arcimago'));
 assert.deepEqual(mage.attacks.map(a=>a.name),['Pugnale']);assert.equal(mage.abilities.length,0);assert.equal(mage.magicResistance,true);assert.equal(mage.simulable,true);
 // 2014 legendary actions: «può eseguire 3 azioni leggendarie», «Attacco di coda» → the Coda attack, «costa 2 azioni».
 const dragon14=readMonster(find(m2014,'Drago nero adulto'));
 assert.equal(dragon14.multiattack,3,'«Poi effettua tre attacchi», after the frightful presence');
 assert.equal(dragon14.legendary.uses,3);
 assert.deepEqual(dragon14.legendary.options.map(o=>[o.kind,o.cost,o.kind==='attack'?o.attack.name:o.save.ability]),[['attack',1,'Coda'],['save',2,'des']]);
 // Tarrasque: «un attacco Morso e altri tre attacchi» = 4.
 assert.equal(readMonster(find(m2024,'Tarrasque')).multiattack,4);
 // Not simulable: no attack and no damaging ability (an SRD one and a sheet made here).
 assert.equal(readMonster(find(m2024,'Boleto stridente')).simulable,false);
 const empty={nome:'Statua vuota',gs_num:2,classe_armatura:'14',punti_ferita:'30',forza:10,destrezza:10,costituzione:10,intelligenza:10,saggezza:10,carisma:10,azioni:'<strong>Guardare.</strong> La statua guarda.'};
 assert.equal(readMonster(empty).simulable,false);
 const unsim=balance.evaluateMonster({...empty,id:'statua'},'2024');
 assert.equal(unsim.metrics,undefined);
 const unsimHtml=balance.balanceBoxHtml(unsim);
 assert.match(unsimHtml,/data-unsimulable|data-balance-unsimulable/);assert.match(unsimHtml,/Valori tipici per questo GS/);assert.doesNotMatch(unsimHtml,/data-balance-row/);
 // Small readers.
 assert.equal(multiattackCount('Il mostro effettua due attacchi Morso.'),2);
 assert.equal(multiattackCount('Il mostro attacca con il morso o con gli artigli.'),2,'no number: 2');
 assert.equal(multiattackCount('Il mostro effettua quattro attacchi o due attacchi Morso.'),4,'before « o »');
 assert.deepEqual(damageDice('Colpito: 7 (1d6 − 1) danni perforanti'.replace('−','-')),{dice:[{count:1,sides:6,flat:-1}],average:7});
 assert.equal(entries('<strong>A.</strong> uno<br><br><strong>B.</strong> due').length,2);

 // The group: level from the CR, the numbers of the method.
 assert.equal(levelOf(0.25),1);assert.equal(levelOf(14),14);assert.equal(levelOf(30),20);
 const twelve=party(12);
 assert.deepEqual(twelve.map(h=>[h.kind,h.ac,h.hp]),[['guerriero',20,100],['chierico',20,87],['ladro',16,87],['mago',15,74]]);
 assert.equal(heroDc(12),8+4+5);assert.equal(twelve[0].saves.for,0+5+4);assert.equal(twelve[0].saves.des,1);
 assert.equal(fighter(11).attacks,3);assert.equal(fighter(20).attacks,4);assert.equal(fighter(1).surge,false);
 assert.equal(cleric(9).aura.count,4);assert.equal(cleric(4).aura,undefined);
 assert.deepEqual(wizard(13).spells.map(s=>s.slots),[2,2,3,3]);assert.equal(wizard(7).shields,4);

 // The same seed gives the same result; a different seed changes it a little.
 const once=simulate(dragon,3000),again=simulate(dragon,3000),other=simulate(dragon,3000,7);
 assert.deepEqual(once,again);assert.notDeepEqual(once,other);
 for(const key of ['damagePerRound','rounds','downPct','wipePct'])assert.ok(Number.isFinite(once[key]),key);
 assert.ok(once.rounds>=1&&once.rounds<=15);
 // Under 1 second on the server for one sheet (3000 fights), the slowest kind: legendary, recharge, multiattack.
 for(const name of ['Drago nero adulto','Tarrasque','Lich']){const start=Date.now();balance.evaluateMonster(find(m2024,name),'2024');assert.ok(Date.now()-start<1000,`${name}: ${Date.now()-start} ms`);}

 // The comparison: bands, widening to at least 6 SRD monsters, verdicts, distance.
 assert.deepEqual(band([1,2,3,4,5]),{median:3,low:2,high:4});
 const rows=[0,1,2,3,4,5,6,7].map(i=>({id:`m${i}`,name:`M${i}`,cr:i<3?5:9,damagePerRound:10+i,rounds:3,downPct:i*10,wipePct:0,ac:15,hp:100,toHit:7,dc:15}));
 assert.equal(referenceGroup(5,rows).widened,4,'3 at CR 5: widened until 6');
 const metrics={damagePerRound:40,rounds:3,downPct:50,wipePct:0};
 const cmp=compare(metrics,9,rows);
 assert.equal(cmp.damage.verdict,'sopra');assert.equal(cmp.rounds.verdict,'in linea');assert.equal(cmp.inLine,false);
 assert.match(cmp.outside[0],/^Danni ai PG per round sopra la fascia \(\+\d+%\)$/);assert.ok(gapFromCr(cmp)>0);
 assert.equal(compare({...metrics,damagePerRound:15},9,rows).inLine,true);
 // A sheet against the SRD file of its edition (never against itself).
 const result=balance.evaluateMonster(find(m2024,'Drago nero adulto'),'2024');
 assert.ok(result.comparison.group.length>=6);assert.ok(result.comparison.group.every(row=>row.id!=='drago-nero-adulto'&&Math.abs(row.cr-14)<=result.comparison.widened));
 const html=balance.balanceBoxHtml(result);
 for(const text of ['BILANCIAMENTO','Danni ai PG per round','Round che resiste','PG a terra (% scontri)','mediana SRD','Simulazione contro 4 PG di livello 14','mostri SRD 2024','Valori tipici per questo GS'])assert.ok(html.includes(text),text);
 assert.match(html,/border:1\.5px dashed #7A4E00;background:#FCEFD0/);
 assert.equal((html.match(/data-balance-verdict=/g)||[]).length,3);
 const legacy=balance.evaluateMonster(find(m2014,'Troll'),'2014');assert.match(balance.balanceBoxHtml(legacy),/mostri SRD 2014/);
 assert.equal(balance.balanceBoxHtml(balance.evaluateMonster({...empty,nome:'<img onerror=x>',id:'x'},'2024')).includes('<img'),false,'names are escaped');
 assert.equal(balance.balanceEdition({homebrew_edizione:'entrambe'},false),'2024');assert.equal(balance.balanceEdition({homebrew_edizione:'2014'},false),'2014');assert.equal(balance.balanceEdition({},true),'2014');

 // The data file is the one the script makes (same seed): checked again by scripts/build-monster-balance.mjs --check.
 const data=JSON.parse(fs.readFileSync('lib/data/monster-balance-srd.json','utf8'));
 assert.equal(data.fights,800);assert.ok(data.editions['2014'].length>300&&data.editions['2024'].length>300,'animals 5.2.1 count with 2024');
 assert.ok(data.editions['2024'].some(row=>row.id==='lupo'||row.id==='orso-bruno'));

 // Administrator only: the API answers 401 to anyone else, private and never stored; the box comes only from it.
 const {NextRequest}=require('next/server');
 let admin=false;
 const route=load('app/api/admin/pannello-mostro/route.ts',{'@/lib/admin-action-helpers':{requireAdmin:async()=>{if(!admin)throw new Error('no');}},
  '@/lib/monsters':{getMonsterById:async id=>id==='drago-nero-adulto'?find(m2024,'Drago nero adulto'):undefined},'@/lib/monsters-types':require('../lib/monsters-types.ts'),
  '@/lib/monster-balance':balance,'@/lib/srd-monsters':{usesLegacyMonsterRules:()=>false}});
 const get=id=>route.GET(new NextRequest(`https://ilgrimorio.app/api/admin/pannello-mostro?id=${id}`));
 const refused=await get('drago-nero-adulto');assert.equal(refused.status,401);assert.equal(refused.headers.get('cache-control'),'private, no-store');
 assert.doesNotMatch(await refused.text(),/BILANCIAMENTO/);
 admin=true;
 const ok=await get('drago-nero-adulto');assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'private, no-store');assert.match((await ok.json()).html,/BILANCIAMENTO/);
 assert.equal((await get('nessuno')).status,404);assert.equal((await get('..%2Fx')).status,400);
 const post=(body,origin='https://ilgrimorio.app')=>route.POST(new NextRequest('https://ilgrimorio.app/api/admin/pannello-mostro',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}));
 const preview=await post({nome:'Bozza',grado_sfida:'2',classe_armatura:'13',punti_ferita:'45',forza:'14',azioni:'<strong>Morso.</strong> <em>Tiro per colpire in mischia:</em> +4, portata 1,5 m. <em>Colpito:</em> 9 (2d6 + 2) danni perforanti.',edizione:'2014'});
 assert.equal(preview.status,200);const previewHtml=(await preview.json()).html;assert.match(previewHtml,/mostri SRD 2014/);assert.match(previewHtml,/livello 2/);
 assert.equal((await post({},'https://altro.example')).status,403);
 admin=false;assert.equal((await post({nome:'x'})).status,401);

 // Never in the public code: the public page asks the API after the session check; no client file reads the method or the data.
 const clientFiles=[];
 for(const dir of ['app','components'])(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const full=path.join(d,e.name);if(e.isDirectory())walk(full);else if(/\.tsx?$/.test(e.name)&&/^["']use client["']/.test(fs.readFileSync(full,'utf8')))clientFiles.push(full);}})(dir);
 for(const file of clientFiles){const code=fs.readFileSync(file,'utf8');assert.doesNotMatch(code,/monster-balance|monster-balance-srd/,file);}
 assert.doesNotMatch(fs.readFileSync('components/admin-edit/admin-monster-panel.tsx','utf8'),/Bilanciamento|BILANCIAMENTO/i,'the panel of the public page carries no text of the box');
 const page=fs.readFileSync('app/mostro/[id]/page.tsx','utf8');assert.doesNotMatch(page,/monster-balance|balanceBoxHtml/);assert.match(page,/<AdminMonsterPanel id=\{monster\.id\} \/>/);
 for(const file of ['app/api/catalogo/bestiario/route.ts','lib/sw/service-worker.js','lib/search-index.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/monster-balance|pannello-mostro/,file);
 assert.match(fs.readFileSync('scripts/check-client-bundle.mjs','utf8'),/BILANCIAMENTO/);
 console.log('Bilanciamento: sheets read (2024 and 2014), group, seeded fights under 1 s, comparison with the SRD of the same CR and edition, box, administrator only.');
})().catch(error=>{console.error(error);process.exit(1);});
