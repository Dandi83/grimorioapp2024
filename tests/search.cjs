const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
// Spells and monsters come from the database in the site: here two small stand-ins.
const STUBS={
 // Manual corrections come from the database: none here (tests/content-overrides.cjs covers them).
 'corrected-content':{getCorrectedWeapons:async()=>({weapons:load('lib/equipment.ts').weapons,corrections:new Map()})},
 'spell-index':{getSpellIndex:async()=>[
  {id:'palla-di-fuoco',nome_italiano:'palla di fuoco',livello_num:3,scuola:'Invocazione',classi:[]},
  {id:'forma-di-drago',nome_italiano:'forma di drago',livello_num:7,scuola:'Trasmutazione',classi:[]},
  {id:'palla-di-fuoco-2014',nome_italiano:'palla di fuoco',livello_num:3,scuola:'Invocazione',classi:[],edizione:'2014'},
  {id:'mano-magica',nome_italiano:'mano magica',livello_num:0,scuola:'Evocazione',classi:[]},
 ]},
 'monster-index':{getMonsterListIndex:async()=>[
  {id:'drago-rosso-adulto',nome:'Drago rosso adulto',tipo:'Drago Enorme',grado_sfida:'17',edizione:'2024'},
  {id:'drago-rosso-adulto-2014',nome:'Drago rosso adulto',tipo:'Drago Enorme',grado_sfida:'17',edizione:'2014'},
  {id:'sciame-di-scarabei-2014',nome:'Sciame di scarabei',tipo:'Sciame di bestie Minuscole',grado_sfida:'1/2',edizione:'2014'},
 ]},
};
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='server-only')return {};
  if(id.startsWith('./')&&STUBS[id.slice(2)])return STUBS[id.slice(2)];
  if(id.startsWith('./')){const file=path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   return load(file+'.ts');}
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const s=load('lib/search.ts');
const idx=load('lib/search-index.ts');

// Normalization: case, accents and apostrophes ignored; a match starts a word of the name.
assert.equal(s.fold('Dell’Àcqua'),'dell acqua');
assert.equal(s.matchStart('Forma di drago','dra'),9);
assert.equal(s.matchStart('Drago rosso adulto','DRA'),0);
assert.equal(s.matchStart('Idra','dra'),-1,'only at the start of a word');
assert.equal(s.matchStart("Elementale dell'aria",'aria'),16);
assert.equal(s.matchStart('Pozione di invisibilità','invisibilita'),11);
assert.equal(s.matchStart('Palla di fuoco','palla  di'),0,'spaces collapsed');
assert.equal(s.matchStart('Palla di fuoco',''),-1);

(async()=>{
 const production=await idx.buildSearchIndex('production');
 const preview=await idx.buildSearchIndex('preview');
 // Sections in order; the Manual only where it is published (its conditions are under Condizioni).
 assert.deepEqual(production.sections.map(x=>x.k),['incantesimi','mostri','equipaggiamento','oggetti-magici','condizioni']);
 assert.deepEqual(preview.sections.map(x=>x.k),['incantesimi','mostri','equipaggiamento','oggetti-magici','condizioni','manuale']);
 assert.ok(!preview.rows.some(r=>r[3].startsWith('/manuale/condizioni-')&&preview.sections[r[0]].k==='manuale'));
 // Edition storage keys: the ones the catalogs use.
 assert.ok(fs.readFileSync('components/grimorio-browser.tsx','utf8').includes(`SPELL_EDITION_KEY = "${idx.SPELL_EDITION_STORAGE}"`));
 assert.ok(fs.readFileSync('components/bestiario-browser.tsx','utf8').includes(`EDITION_KEY = "${idx.MONSTER_EDITION_STORAGE}"`));
 const rows=s.rowsOf(production);
 // No row without name, label or address; names, labels and addresses only.
 for(const r of production.rows){assert.ok(r[1]&&r[2]&&r[3]&&r[3].startsWith('/'),JSON.stringify(r));assert.ok(r.length<=5);}
 const bySection=k=>rows.filter(r=>r.section===k);
 // Same name in both editions: one result with both addresses; 2014 only: «· 2014».
 const fireball=rows.filter(r=>r.nome==='Palla Di Fuoco');
 assert.equal(fireball.length,1);assert.equal(fireball[0].href,'/spell/palla-di-fuoco');assert.equal(fireball[0].href2014,'/spell/palla-di-fuoco-2014');
 assert.equal(fireball[0].label,'Invocazione · liv. 3');
 assert.equal(rows.find(r=>r.nome==='Mano Magica').label,'Evocazione · trucchetto');
 assert.equal(rows.find(r=>r.nome==='Drago rosso adulto').label,'Drago · GS 17');
 assert.equal(rows.find(r=>r.nome==='Sciame di scarabei').label,'Bestia · GS 1/2 · 2014');
 assert.equal(s.rowHref(fireball[0],'2014'),'/spell/palla-di-fuoco-2014');
 assert.equal(s.rowHref(fireball[0],'2024'),'/spell/palla-di-fuoco');
 assert.equal(s.rowHref(fireball[0],null),'/spell/palla-di-fuoco');
 // Equipment: weapons and armor share their page; names of the other edition are searchable.
 const longsword=rows.find(r=>r.nome==='Spada lunga');
 assert.equal(longsword.href,'/equipaggiamento/armi/spada-lunga');assert.equal(longsword.href2014,undefined);
 assert.match(longsword.label,/^Arma da mischia da guerra · 15 mo$/);
 const basket=rows.find(r=>r.nome==='Canestro');
 assert.equal(basket.href,'/equipaggiamento/avventura/canestro');assert.match(basket.label,/· 2014$/);
 assert.ok(rows.find(r=>r.nome==='Cesto'));
 const deck=rows.find(r=>r.nome==='Mazzo di carte');assert.match(deck.label,/· 2014$/);
 const ring=rows.find(r=>r.nome==='Anello di resistenza');
 assert.equal(ring.label,'Anello · raro');assert.equal(ring.href,'/oggetti-magici/anello-di-resistenza');
 assert.ok(rows.find(r=>r.nome==='Piuma magica'&&r.href==='/oggetti-magici/piuma-magica'&&/· 2014$/.test(r.label)));
 const poisoned=rows.find(r=>r.nome==='Avvelenato');
 assert.deepEqual([poisoned.label,poisoned.href,poisoned.href2014],['Condizione','/manuale/condizioni-avvelenato','/manuale/condizioni-avvelenato-2014']);
 assert.equal(rows.find(r=>r.nome==='Prono').href2014,undefined);
 // Counts per section match the data: every item of every edition is reachable by its name.
 const {magicItemEntries}=load('lib/magic-items-editions.ts');
 const magicNames=new Set(bySection('oggetti-magici').map(r=>s.fold(r.nome)));
 for(const e of magicItemEntries)for(const it of Object.values(e.editions))assert.ok(magicNames.has(s.fold(it.nome)),it.nome);
 assert.equal(bySection('oggetti-magici').length,magicItemEntries.reduce((n,e)=>n+(e.editions['2014']&&e.editions['2024']&&s.fold(e.editions['2014'].nome)!==s.fold(e.editions['2024'].nome)?2:1),0));
 assert.equal(bySection('condizioni').length,15,JSON.stringify(bySection('condizioni').map(r=>r.nome+'|'+r.label)));
 const data=f=>JSON.parse(fs.readFileSync('lib/data/'+f,'utf8'));
 const equipNames=new Set(bySection('equipaggiamento').map(r=>s.fold(r.nome)));
 for(const w of data('srd-weapons-it.json').armi)for(const e of [w['2014'],w['2024']])if(e&&e.nome)assert.ok(equipNames.has(s.fold(e.nome)),e.nome);
 // Every address exists: equipment, magic items and conditions against their data (spells and monsters in the browser tests).
 const {findGearEntry}=load('lib/adventuring-gear-editions.ts');const {getToolEntry}=load('lib/tools-editions.ts');
 const {findMagicItemEntry}=load('lib/magic-items-editions.ts');const {getWeapon}=load('lib/equipment.ts');const {getArmor}=load('lib/armor.ts');
 const conditionIds=new Set([...data('srd-conditions-5.2.1-it.json'),...data('srd-conditions-5.1-it.json')].map(e=>e.id));
 const exists=href=>{
  const [p]=href.split('?');const parts=p.split('/');const id=parts.at(-1);
  if(p.startsWith('/equipaggiamento/armi/'))return !!getWeapon(id);
  if(p.startsWith('/equipaggiamento/armature/'))return !!getArmor(id);
  if(p.startsWith('/equipaggiamento/avventura/'))return !!findGearEntry(id);
  if(p.startsWith('/equipaggiamento/strumenti/'))return !!getToolEntry(id);
  if(p.startsWith('/oggetti-magici/'))return !!findMagicItemEntry(id);
  if(p.startsWith('/manuale/condizioni-'))return conditionIds.has(id);
  if(p.startsWith('/spell/')||p.startsWith('/mostro/'))return true;
  return false;
 };
 for(const r of rows){assert.ok(exists(r.href),r.href);if(r.href2014)assert.ok(exists(r.href2014),r.href2014);}
 // Ordering: names starting with the text first, then A–Z; at most 8 per group, then «Mostra tutti».
 const groups=s.search(production,rows,'dra');
 assert.deepEqual(groups.map(g=>g.section).slice(0,2),['incantesimi','mostri']);
 assert.ok(groups.find(g=>g.section==='oggetti-magici').rows.some(r=>r.nome==='Sfera del drago'));
 assert.deepEqual(groups[0].rows.map(r=>r.nome),['Forma Di Drago']);
 const spada=s.search(production,rows,'spada');
 const equip=spada.find(g=>g.section==='equipaggiamento');
 assert.ok(equip.rows.length<=8);
 const magic=s.search(production,rows,'anello').find(g=>g.section==='oggetti-magici');
 assert.ok(magic.total>8&&magic.rows.length===8,'limit 8');
 assert.ok(magic.rows.every((r,i,a)=>!i||Number(a[i-1].start!==0)<=Number(r.start!==0)),'starting names first');
 const startsFirst=magic.rows.filter(r=>r.start===0).map(r=>r.nome);assert.deepEqual(startsFirst,[...startsFirst].sort((a,b)=>a.localeCompare(b,'it')));
 assert.equal(s.search(production,rows,'anello',{expanded:['oggetti-magici']}).find(g=>g.section==='oggetti-magici').rows.length,magic.total);
 assert.deepEqual(s.search(production,rows,'spada',{section:'mostri'}),[]);
 assert.ok(s.search(production,rows,'a').length>0,'one character is enough');
 assert.deepEqual(s.search(production,rows,'   '),[]);
 assert.deepEqual(s.search(production,rows,'xyzxyz'),[]);
 const poison=s.search(production,rows,'avvelenato');assert.ok(poison.some(g=>g.section==='condizioni'));
 // The examples of the panel and the quick suggestions of the Home find something in the data.
 const panel=fs.readFileSync('components/search/search-panel.tsx','utf8'),home=fs.readFileSync('components/search/home-search.tsx','utf8');
 const examples=JSON.parse(panel.match(/const EXAMPLES = (\[.*\]);/)[1].replace(/'/g,'"'));
 const suggestions=JSON.parse(home.match(/const SUGGESTIONS = (\[.*\]);/)[1].replace(/'/g,'"'));
 assert.equal(examples.length,5);assert.equal(suggestions.length,3);
 for(const q of [...examples,...suggestions])assert.ok(s.search(production,rows,q).length,q);
 // Offline: the index is saved by the service worker; the panel never reaches the admin area.
 const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
 assert.ok(sw.includes('const SEARCH_INDEX = "/ricerca-indice.json";')&&sw.includes('"/preferiti", SEARCH_INDEX]'));
 console.log(`Search: ${production.rows.length} rows (stand-in spells and monsters), ${production.sections.length} public sections, every address checked.`);
})().catch(error=>{console.error(error);process.exit(1);});
