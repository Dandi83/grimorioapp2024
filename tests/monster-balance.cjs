// Bilanciamento (PROMPT 11, 12): the reading of the sheets, the fights, the comparison, the box; administrator only.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/monster-balance.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module');
require.cache[require.resolve('server-only')]={exports:{}};
const {readMonster,multiattackCount,damageDice,entries,regeneration}=require('../lib/monster-balance/parse.ts');
const {simulate,TACTICS,levelFor}=require('../lib/monster-balance/simulate.ts');
const {STRESS,measure,fightsOfASheet}=require('../lib/monster-balance/scenarios.ts');
const {heavyControl,conditionImmunities}=require('../lib/monster-balance/checks.ts');
const {party,levelOf,heroDc,wizard,fighter,cleric}=require('../lib/monster-balance/party.ts');
const {compare,band,referenceGroup,gapFromCr,levelOf:verdictOf,BAND,CHECK_LIMIT}=require('../lib/monster-balance/compare.ts');
const {balanceApplies}=require('../lib/balance-scope.ts');
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
 // Regeneration (PROMPT 12): Troll 2024 15, Troll 2014 10 (the reference group only: never shown on their pages).
 assert.equal(troll.regeneration,15);assert.equal(troll14.regeneration,10);
 assert.equal(readMonster(find(m2024,'Oni')).regeneration,10);assert.equal(readMonster(find(m2024,'Drago nero adulto')).regeneration,0,'«recupera tutti gli utilizzi» is not hit points');
 assert.equal(regeneration("Il mostro riguadagna 7 punti ferita all'inizio del suo turno."),7,'2014: «riguadagna»');
 assert.equal(regeneration('Il vampiro recupera punti ferita pari a quell’ammontare.'),0);
 const noRegen=simulate({...troll,regeneration:0},3000),withRegen=simulate(troll,3000);
 assert.ok(withRegen.rounds>noRegen.rounds,`regeneration makes it last longer: ${withRegen.rounds} > ${noRegen.rounds}`);
 // Never beyond the maximum: once it heals to full every turn, a larger regeneration changes nothing.
 assert.deepEqual(simulate({...troll,regeneration:500},500),simulate({...troll,regeneration:5000},500));
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
 for(const key of ['damagePerRound','rounds','downPct','wipePct','winPct','oneShotPct'])assert.ok(Number.isFinite(once[key]),key);
 assert.ok(once.rounds>=1&&once.rounds<=15);

 // PROMPT 19: three tactics of the master. The same seed, the same result for each; «a caso» and «prudente» differ from «ottimale».
 assert.deepEqual(TACTICS,['ottimale','caso','prudente']);
 assert.deepEqual(simulate(dragon,2000,undefined,{tactic:'ottimale'}),simulate(dragon,2000),'«ottimale» is the default');
 const byTactic=Object.fromEntries(TACTICS.map(t=>[t,simulate(dragon,3000,undefined,{tactic:t})]));
 assert.deepEqual(simulate(dragon,3000,undefined,{tactic:'caso'}),byTactic.caso,'seeded: the same fights');
 assert.notDeepEqual(byTactic.caso,byTactic.ottimale);assert.notDeepEqual(byTactic.prudente,byTactic.ottimale);
 // Prudent: the breath one time out of two when ready, so less damage than the optimal master (the breath is its best move).
 assert.ok(byTactic.prudente.damagePerRound<byTactic.ottimale.damagePerRound,`${byTactic.prudente.damagePerRound} < ${byTactic.ottimale.damagePerRound}`);
 // A monster with only attacks plays the same way with «ottimale» and «prudente» (no ability to choose).
 const goblin=readMonster(find(m2024,'Goblin guerriero'));
 assert.deepEqual(simulate(goblin,1000,undefined,{tactic:'prudente'}),simulate(goblin,1000));
 // The groups of the test situations.
 assert.deepEqual(STRESS.map(x=>x.key),['tre','cinque','sei','sotto','sopra','marziale','arcano']);
 const kinds=key=>STRESS.find(x=>x.key===key).setup.kinds;
 assert.deepEqual(kinds('tre'),['guerriero','chierico','ladro'],'the wizard taken out');
 assert.deepEqual(kinds('cinque'),['guerriero','chierico','ladro','mago','guerriero'],'a second fighter');
 assert.deepEqual(kinds('sei'),['guerriero','chierico','ladro','mago','guerriero','chierico'],'then a second cleric');
 assert.deepEqual(kinds('marziale'),['guerriero','guerriero','ladro','chierico']);assert.deepEqual(kinds('arcano'),['mago','mago','chierico','ladro']);
 assert.equal(STRESS.find(x=>x.key==='sotto').setup.levelShift,-1);assert.equal(STRESS.find(x=>x.key==='sopra').setup.levelShift,1);
 assert.deepEqual(party(3,kinds('arcano')).map(h=>h.kind),['mago','mago','chierico','ladro']);
 assert.equal(levelFor(1,-1),1,'never under level 1');assert.equal(levelFor(20,1),20,'never over 20');assert.equal(levelFor(5,-1),4);
 // More characters: the monster falls sooner and wipes the group less often.
 const three=simulate(dragon,1500,undefined,{kinds:kinds('tre')}),six=simulate(dragon,1500,undefined,{kinds:kinds('sei')});
 assert.ok(six.rounds<three.rounds&&six.wipePct<=three.wipePct,`6 PG ${six.rounds} round vs 3 PG ${three.rounds}`);
 assert.ok(simulate(dragon,1500,undefined,{levelShift:1}).winPct>=simulate(dragon,1500,undefined,{levelShift:-1}).winPct,'stronger characters win more');
 const measures=measure(dragon,500,100);
 assert.deepEqual(Object.keys(measures.tactics),TACTICS);assert.deepEqual(Object.keys(measures.stress),STRESS.map(x=>x.key));
 assert.equal(fightsOfASheet(),3000*3+300*7);

 // Under 2 seconds on the server for one sheet (3 × 3000 + 7 × 300 fights), the slowest kinds: legendary, recharge, multiattack.
 for(const name of ['Drago nero adulto','Tarrasque','Lich']){const start=Date.now();balance.evaluateMonster(find(m2024,name),'2024');assert.ok(Date.now()-start<2000,`${name}: ${Date.now()-start} ms`);}
 // In memory for a version of the sheet: the same fields give the same object at once; a change computes again.
 const sheet={...find(m2024,'Troll'),id:'troll-prova',fonte_scheda:'Aggiunta da te'};
 const first=balance.evaluateMonster(sheet,'2024');assert.equal(balance.evaluateMonster({...sheet},'2024'),first,'cached');
 const changed=balance.evaluateMonster({...sheet,punti_ferita:'200 (20d10 + 90)'},'2024');assert.notEqual(changed,first);assert.ok(changed.model.hp===200);
 assert.notEqual(balance.evaluateMonster(sheet,'2014'),first,'another edition, another result');
 assert.equal(balance.cacheKey(sheet,'2024',3000),balance.cacheKey({...sheet},'2024',3000));

 // The comparison: the band from the 10th to the 90th percentile, widening to at least 6 SRD monsters, three verdicts, the worst tactic.
 assert.deepEqual(BAND,{low:0.1,high:0.9});assert.equal(CHECK_LIMIT,25);
 assert.deepEqual(band([0,1,2,3,4,5,6,7,8,9,10]),{median:5,low:1,high:9});
 const metricsOf=(d,r,down=20,extra={})=>({damagePerRound:d,rounds:r,downPct:down,wipePct:0,winPct:100,oneShotPct:0,...extra});
 const stressOf=()=>Object.fromEntries(STRESS.map(x=>[x.key,{rounds:4,wipePct:10,winPct:80}]));
 const rowOf=(id,cr,d,r,down=20,extra={})=>({id,name:id,cr,ac:13,hp:60,toHit:5,dc:13,tactics:Object.fromEntries(TACTICS.map(t=>[t,metricsOf(d,r,down,extra)])),stress:stressOf()});
 const allTactics=(d,r,over={})=>({tactics:{ottimale:metricsOf(d,r),caso:metricsOf(d,r),prudente:metricsOf(d,r),...over},stress:stressOf()});
 const rows=[0,1,2,3,4,5,6,7].map(i=>rowOf(`m${i}`,i<3?5:9,10+i,3,i*10));
 assert.equal(referenceGroup(5,rows).widened,4,'3 at CR 5: widened until 6');
 const cmp=compare(allTactics(40,3),9,rows);
 assert.equal(cmp.tactics.ottimale.damage.verdict,'sopra');assert.equal(cmp.tactics.ottimale.rounds.verdict,'in linea');assert.equal(cmp.level,'fuori');
 assert.match(cmp.sentence,/^Con un master che gioca al meglio picchia troppo forte \(\+\d+%\)\.$/);assert.ok(gapFromCr(cmp)>0);
 assert.equal(compare(allTactics(15,3),9,rows).level,'in linea');
 assert.equal(compare(allTactics(15,3),9,rows).sentence,'Danni e resistenza nella fascia dei mostri del suo GS con tutti e tre i modi di giocarlo.');
 // The limits of the three levels: a group whose band is exactly 8 damage and 4 rounds.
 const flat=[0,1,2,3,4,5].map(i=>rowOf(`f${i}`,3,8,4));
 const level=(d,r)=>compare(allTactics(d,r),3,flat);
 assert.equal(level(8,4).level,'in linea');assert.equal(level(8,4).worst,null);
 assert.equal(level(10,4).level,'da controllare','+25% exactly: still to check');
 assert.equal(level(10.1,4).level,'fuori','+26%: out of the CR');
 assert.equal(level(6,4).level,'da controllare','−25% exactly');assert.equal(level(5.9,4).level,'fuori');
 assert.equal(level(8,5).level,'da controllare');assert.equal(level(8,3).level,'da controllare');assert.equal(level(8,2.9).level,'fuori');
 assert.equal(level(9,5).level,'fuori','both out, even by little');
 assert.deepEqual(level(8,3).tactics.ottimale.outside,['cade troppo presto (−25%)']);
 assert.deepEqual(level(6,5).tactics.ottimale.outside,['picchia troppo piano (−25%)','resiste troppo a lungo (+25%)']);
 assert.equal(verdictOf(level(10,4).tactics.ottimale.damage,level(10,4).tactics.ottimale.rounds),'da controllare');
 // «In linea» only when all three tactics are: the worst one decides, and the sentence says which and what.
 const randomShort=compare(allTactics(8,4,{caso:metricsOf(8,2)}),3,flat);
 assert.equal(randomShort.tactics.ottimale.level,'in linea');assert.equal(randomShort.tactics.caso.level,'fuori');
 assert.equal(randomShort.level,'fuori');assert.equal(randomShort.worst,'caso');
 assert.equal(randomShort.sentence,'Con un master che sceglie a caso cade troppo presto (−50%).');
 const prudentCheck=compare(allTactics(8,4,{prudente:metricsOf(6.5,4)}),3,flat);
 assert.equal(prudentCheck.level,'da controllare');assert.match(prudentCheck.sentence,/^Con un master prudente picchia troppo piano/);
 // Each tactic against the same tactic of the SRD monsters.
 const split=[0,1,2,3,4,5].map(i=>({...rowOf(`s${i}`,3,8,4),tactics:{ottimale:metricsOf(8,4),caso:metricsOf(4,4),prudente:metricsOf(8,4)}}));
 assert.equal(compare(allTactics(8,4,{caso:metricsOf(4,4)}),3,split).level,'in linea','4 damage is normal for a master who plays at random');
 // The test situations: warnings over the 90th percentile of wipes and rounds, under the 10th of the characters' wins.
 const stressed=compare({...allTactics(8,4),stress:{...stressOf(),tre:{rounds:9,wipePct:60,winPct:30}}},3,flat);
 assert.deepEqual(stressed.stress.find(x=>x.key==='tre').warnings.length,3);
 assert.equal(stressed.stress.find(x=>x.key==='cinque').warnings.length,0);
 assert.equal(stressed.level,'in linea','the test situations never change the verdict');

 // The checks the CR does not measure (a–e): a case that raises each warning and one that does not.
 const base={nome:'Prova',gs_num:6,classe_armatura:'15',punti_ferita:'90',forza:16,destrezza:12,costituzione:14,intelligenza:8,saggezza:10,carisma:8,
  azioni:'<strong>Multiattacco.</strong> La creatura effettua due attacchi Artiglio.<br><br><strong>Artiglio.</strong> <em>Tiro per colpire in mischia:</em> +6, portata 1,5 m. <em>Colpito:</em> 12 (2d8 + 3) danni taglienti.'};
 const keysOf=(sheet,cr=sheet.gs_num)=>{const r=balance.evaluateMonster({...sheet,gs_num:cr},'2024');return r.warnings.map(w=>w.key);};
 // a. Heavy control without a new saving throw; stronger at CR 4 or less.
 const gaze='<br><br><strong>Sguardo.</strong> Tiro salvezza su Costituzione: CD 13, una creatura entro 9 metri. <em>Fallimento:</em> il bersaglio è paralizzato per 1 minuto.';
 assert.deepEqual(heavyControl({...base,azioni:base.azioni+gaze}),[{condition:'paralizzato',name:'Sguardo'}]);
 assert.deepEqual(heavyControl({...base,azioni:base.azioni+gaze.replace('per 1 minuto.','per 1 minuto. Il bersaglio ripete il tiro salvezza alla fine di ciascuno dei suoi turni.')}),[],'with a new saving throw: no warning');
 assert.deepEqual(heavyControl({...base,azioni:base.azioni+gaze.replace('per 1 minuto','fino alla fine del suo turno successivo')}),[],'over by the next turn: no warning');
 assert.deepEqual(heavyControl({...base,tratti:'<strong>Tattiche del branco.</strong> Vantaggio se un alleato entro 1,5 metri dalla creatura non è incapacitato.'}),[],'a requirement about an ally');
 const weakGaze=balance.evaluateMonster({...base,gs_num:3,azioni:base.azioni+gaze},'2024').warnings.find(w=>w.kind==='controllo');
 assert.equal(weakGaze.strong,true);assert.match(weakGaze.text,/a GS 3 è molto pesante/);
 assert.equal(balance.evaluateMonster({...base,azioni:base.azioni+gaze},'2024').warnings.find(w=>w.kind==='controllo').strong,false);
 // b. A character down in one turn more often than the SRD monsters of the CR.
 const brute={...base,gs_num:2,azioni:'<strong>Multiattacco.</strong> La creatura effettua tre attacchi Maglio.<br><br><strong>Maglio.</strong> <em>Tiro per colpire in mischia:</em> +9, portata 1,5 m. <em>Colpito:</em> 30 (4d10 + 8) danni contundenti.'};
 assert.ok(keysOf(brute).includes('colpo'),keysOf(brute).join());assert.ok(!keysOf(base).includes('colpo'));
 // c. CR 5 or more with one action a turn.
 const lone={...base,azioni:'<strong>Artiglio.</strong> <em>Tiro per colpire in mischia:</em> +6, portata 1,5 m. <em>Colpito:</em> 30 (4d12 + 4) danni taglienti.'};
 assert.ok(keysOf(lone).includes('azioni'));assert.ok(!keysOf(base).includes('azioni'),'with a multiattack: no warning');
 assert.ok(!keysOf(lone,4).includes('azioni'),'under CR 5: no warning');
 assert.ok(!keysOf({...lone,azioni_bonus:'<strong>Balzo.</strong> La creatura si muove di 9 metri.'}).includes('azioni'),'a bonus action: no warning');
 // d. Few answers.
 assert.ok(keysOf({...base,resistenze:'contundenti, perforanti, taglienti'}).includes('contromosse:armi'));
 assert.ok(!keysOf({...base,resistenze:'contundenti, perforanti, taglienti'},9).includes('contromosse:armi'),'over CR 8: normal');
 assert.ok(keysOf({...base,immunita:'veleno; affascinato, avvelenato, indebolimento, paralizzato, pietrificato, spaventato'}).includes('contromosse:condizioni'));
 assert.ok(!keysOf({...base,immunita:'veleno; avvelenato, spaventato'}).includes('contromosse:condizioni'),'two conditions: no warning');
 assert.deepEqual(conditionImmunities({immunita_condizioni:'affascinato, avvelenato e spaventato'}),['affascinato','avvelenato','spaventato'],'2014 and homebrew in their own field');
 const resistant={...base,tratti:'<strong>Resistenza alla magia.</strong> Vantaggio ai tiri salvezza contro incantesimi.<br><br><strong>Resistenza leggendaria (2/giorno).</strong> Se fallisce un tiro salvezza, può superarlo.'};
 assert.ok(keysOf(resistant).includes('contromosse:magia'));assert.ok(!keysOf(resistant,11).includes('contromosse:magia'));
 // e. Numbers out of scale, with the typical value.
 const armoured=balance.evaluateMonster({...base,classe_armatura:'24'},'2024').warnings.find(w=>w.key==='numeri:ca-alta');
 assert.ok(armoured);assert.match(armoured.data,/^CA 24: di solito \d+ \(fascia \d+–\d+\)$/);
 assert.ok(!keysOf(base).some(key=>key.startsWith('numeri:ca')),'a usual AC: no warning');
 assert.ok(keysOf({...base,azioni:base.azioni.replace('+6','+15')}).includes('numeri:colpire-alta'));

 // A sheet against the SRD file of its edition (never against itself).
 const result=balance.evaluateMonster(find(m2024,'Drago nero adulto'),'2024');
 assert.ok(result.comparison.group.length>=6);assert.ok(result.comparison.group.every(row=>row.id!=='drago-nero-adulto'&&Math.abs(row.cr-14)<=result.comparison.widened));
 const html=balance.balanceBoxHtml(result);
 for(const text of ['BILANCIAMENTO','Master','Danni a round','Round','PG a terra','Ottimale','A caso','Prudente','SITUAZIONI DI PROVA','AVVISI','Simulazione: 11.100 combattimenti contro 4 PG di livello 14','mostri SRD 2024','scenari: base + 7 di prova','Valori tipici per questo GS'])assert.ok(html.includes(text),text);
 assert.match(html,/border:1\.5px dashed #7A4E00;background:#FCEFD0/);
 assert.equal((html.match(/data-balance-verdict=/g)||[]).length,9,'3 tactics × 3 measures');
 assert.equal((html.match(/data-balance-situation=/g)||[]).length,7);
 assert.match(html,/data-balance-warnings="(\d+)"/);
 assert.match(html,new RegExp(`data-balance-result="${balance.LEVELS[result.comparison.level].slug}"`));
 assert.ok(html.includes(balance.LEVELS[result.comparison.level].label));
 assert.ok(html.indexOf('data-balance-result')<html.indexOf('data-balance-tactics'),'the verdict and the sentence at the top');
 // The pills of the three verdicts: green, amber, bordeaux.
 assert.match(balance.LEVELS['in linea'].style,/#1F6B45/);assert.match(balance.LEVELS['da controllare'].style,/color:#7A4E00/);assert.match(balance.LEVELS['da controllare'].style,/#FCEFD0/);assert.match(balance.LEVELS.fuori.style,/background:#7A1F2B;color:#FFFFFF/);
 assert.deepEqual(Object.values(balance.LEVELS).map(l=>l.label),['In linea','Da controllare','Fuori dal GS']);
 const legacy=balance.evaluateMonster(find(m2014,'Troll'),'2014');assert.match(balance.balanceBoxHtml(legacy),/mostri SRD 2014/);
 assert.equal(balance.balanceBoxHtml(balance.evaluateMonster({...empty,nome:'<img onerror=x>',id:'x'},'2024')).includes('<img'),false,'names are escaped');
 assert.match(balance.balanceBoxHtml(balance.evaluateMonster({...base,azioni:base.azioni+gaze},'2024')),/data-balance-warning="controllo:paralizzato"/);
 assert.equal(balance.balanceEdition({homebrew_edizione:'entrambe'},false),'2024');assert.equal(balance.balanceEdition({homebrew_edizione:'2014'},false),'2014');assert.equal(balance.balanceEdition({},true),'2014');

 // The data file is the one the script makes (same seed): checked again by scripts/build-monster-balance.mjs --check.
 const data=JSON.parse(fs.readFileSync('lib/data/monster-balance-srd.json','utf8'));
 assert.equal(data.fights,800);assert.equal(data.stressFights,300);assert.deepEqual(data.tactics,TACTICS);assert.deepEqual(data.stress,STRESS.map(x=>x.key));
 assert.ok(data.editions['2014'].length>300&&data.editions['2024'].length>300,'animals 5.2.1 count with 2024');
 assert.ok(data.editions['2024'].some(row=>row.id==='lupo'||row.id==='orso-bruno'));
 for(const row of [...data.editions['2014'],...data.editions['2024']]){assert.deepEqual(Object.keys(row.tactics),TACTICS,row.id);assert.deepEqual(Object.keys(row.stress),STRESS.map(x=>x.key),row.id);}

 // Only on our sheets (PROMPT 12): homebrew and sheets made here; never SRD 5.1, SRD 5.2.1, animals, edited SRD or NO SRD from a manual.
 assert.equal(balanceApplies({fonte_scheda:'Homebrew'}),true);assert.equal(balanceApplies({homebrew_edizione:'2014'}),true);
 assert.equal(balanceApplies({fonte_scheda:'Aggiunta da te'}),true);
 for(const sheet of [{fonte_scheda:'SRD 5.2.1'},{fonte_scheda:'SRD 5.1'},{},{fonte_scheda:'Sintesi originale'},{fonte_scheda:'Aggiunta da te',provenienza:{document:'SRD 5.2.1'}}])assert.equal(balanceApplies(sheet),false,JSON.stringify(sheet));

 // Administrator only: the API answers 401 to anyone else, private and never stored; the box comes only from it.
 const {NextRequest}=require('next/server');
 let admin=false;
 const route=load('app/api/admin/pannello-mostro/route.ts',{'@/lib/admin-action-helpers':{requireAdmin:async()=>{if(!admin)throw new Error('no');}},
  '@/lib/monsters':{getMonsterById:async id=>id==='drago-nero-adulto'?{...find(m2024,'Drago nero adulto'),fonte_scheda:'SRD 5.2.1'}:id==='troll'?{...find(m2014,'Troll'),fonte_scheda:'SRD 5.1'}:id==='hb-drago'?{...find(m2024,'Drago nero adulto'),id:'hb-drago',fonte_scheda:'Homebrew',homebrew_edizione:'2024'}:id==='creata'?{...find(m2024,'Troll'),id:'creata',fonte_scheda:'Aggiunta da te'}:undefined},'@/lib/monsters-types':require('../lib/monsters-types.ts'),
  '@/lib/monster-balance':balance,'@/lib/srd-monsters':{usesLegacyMonsterRules:()=>false}});
 const get=id=>route.GET(new NextRequest(`https://ilgrimorio.app/api/admin/pannello-mostro?id=${id}`));
 const refused=await get('drago-nero-adulto');assert.equal(refused.status,401);assert.equal(refused.headers.get('cache-control'),'private, no-store');
 assert.doesNotMatch(await refused.text(),/BILANCIAMENTO/);
 admin=true;
 for(const id of ['drago-nero-adulto','troll']){const official=await get(id);assert.equal(official.status,422,id);assert.equal(official.headers.get('cache-control'),'private, no-store');const body=await official.json();assert.equal(body.error,'Non previsto per le schede ufficiali');assert.equal(body.html,undefined);}
 for(const id of ['hb-drago','creata']){const ok=await get(id);assert.equal(ok.status,200,id);assert.equal(ok.headers.get('cache-control'),'private, no-store');assert.match((await ok.json()).html,/BILANCIAMENTO/);}
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
 const page=fs.readFileSync('app/mostro/[id]/page.tsx','utf8');assert.doesNotMatch(page,/monster-balance|balanceBoxHtml/);assert.match(page,/\{balanceApplies\(monster\) && <AdminMonsterPanel id=\{monster\.id\} \/>\}/);
 for(const file of ['app/api/catalogo/bestiario/route.ts','lib/sw/service-worker.js','lib/search-index.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/monster-balance|pannello-mostro/,file);
 assert.match(fs.readFileSync('scripts/check-client-bundle.mjs','utf8'),/BILANCIAMENTO/);
 console.log('Bilanciamento: sheets read (2024 and 2014, regeneration), group, seeded fights with three tactics and 7 test situations under 2 s per sheet (cached per version), comparison with the SRD of the same CR, edition and tactic (10–90, three verdicts, the worst tactic), warnings a–e, box, only our sheets, administrator only.');
})().catch(error=>{console.error(error);process.exit(1);});
