const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
// Spells and monsters come from the database in the site: here two small stand-ins.
const STUBS={
 // Manual corrections come from the database: none here (tests/content-overrides.cjs covers them).
 'corrected-content':{
  getCorrectedWeapons:async()=>({weapons:load('lib/equipment.ts').weapons,corrections:new Map()}),
  getCorrectedArmors:async()=>({list:load('lib/armor.ts').armors,corrections:new Map()}),
  getCorrectedGear:async()=>({list:load('lib/adventuring-gear-editions.ts').gearEntries,corrections:new Map()}),
  getCorrectedTools:async()=>({list:load('lib/tools-editions.ts').toolEntries,corrections:new Map()}),
  getCorrectedMagicItems:async()=>({list:load('lib/magic-items-editions.ts').magicItemEntries,corrections:new Map()}),
  getCorrectedClasses:async()=>({list:load('lib/classes.ts').classEntries,corrections:new Map()}),
  getCorrectedConditions:async()=>{const c=load('lib/conditions.ts');return {list:{'2024':c.conditions,'2014':c.legacyConditions},corrections:new Map()};},
  getCorrectedManualEntries:async()=>load('lib/manual.ts').manualEntries.filter(e=>e.category!=='condizioni'),
 },
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
 assert.deepEqual(production.sections.map(x=>x.k),['incantesimi','mostri','classi','equipaggiamento','oggetti-magici','condizioni']);
 assert.deepEqual(preview.sections.map(x=>x.k),['incantesimi','mostri','classi','equipaggiamento','oggetti-magici','condizioni','manuale']);
 assert.ok(!preview.rows.some(r=>r[3].startsWith('/manuale/condizioni-')&&preview.sections[r[0]].k==='manuale'));
 // One edition for the whole app («la tua edizione»): the index no longer names a storage key per section.
 assert.ok(production.sections.every(x=>Object.keys(x).join()==='k,t'));
 assert.ok(!fs.readFileSync('components/search/search-panel.tsx','utf8').includes('localStorage'),'the panel reads the edition from the shared provider');
 const rows=s.rowsOf(production);
 // No row without name, label or address; names, labels and addresses only.
 for(const r of production.rows){assert.ok(r[1]&&r[2]&&r[3]&&r[3].startsWith('/'),JSON.stringify(r));assert.ok(r.length<=6);if(r.length===6)assert.ok(['2024','2014'].includes(r[5]));}
 const bySection=k=>rows.filter(r=>r.section===k);
 // Same name in both editions: one result with both addresses; 2014 only: «· 2014».
 const fireball=rows.filter(r=>r.nome==='Palla di fuoco');
 assert.equal(fireball.length,1);assert.equal(fireball[0].href,'/spell/palla-di-fuoco');assert.equal(fireball[0].href2014,'/spell/palla-di-fuoco-2014');
 assert.equal(fireball[0].label,'Invocazione · liv. 3');
 assert.equal(rows.find(r=>r.nome==='Mano magica').label,'Evocazione · trucchetto');
 assert.equal(rows.find(r=>r.nome==='Drago rosso adulto').label,'Drago · GS 17');
 assert.equal(rows.find(r=>r.nome==='Sciame di scarabei').label,'Bestia · GS 1/2 · 2014');
 assert.equal(s.rowHref(fireball[0],'2014'),'/spell/palla-di-fuoco-2014');
 assert.equal(s.rowHref(fireball[0],'2024'),'/spell/palla-di-fuoco');
 assert.equal(s.rowHref(fireball[0],null),'/spell/palla-di-fuoco');
 // A result of one edition only says so (solo): the panel shows «la tua edizione» first.
 assert.equal(fireball[0].solo,undefined);assert.equal(rows.find(r=>r.nome==='Drago rosso adulto').solo,undefined);
 assert.equal(rows.find(r=>r.nome==='Sciame di scarabei').solo,'2014');assert.equal(rows.find(r=>r.nome==='Mano magica').solo,'2024');
 const split=s.splitByEdition(rows,'2014');
 assert.ok(split.own.some(r=>r.nome==='Sciame di scarabei')&&split.own.some(r=>r.nome==='Palla di fuoco')&&!split.own.some(r=>r.nome==='Mano magica'));
 assert.ok(split.other.some(r=>r.nome==='Mano magica')&&split.other.every(r=>r.solo==='2024'));
 assert.equal(split.own.length+split.other.length,rows.length);
 assert.ok(s.splitByEdition(rows,'2024').other.every(r=>r.solo==='2014'));
 // A 2024-only result on a page shared by the editions opens on 2024 for a 2014 player; spells keep their page.
 assert.equal(s.rowHref(rows.find(r=>r.nome==='Mano magica'),'2014'),'/spell/mano-magica');
 // Equipment: weapons and armor share their page; names of the other edition are searchable.
 const longsword=rows.find(r=>r.nome==='Spada lunga');
 assert.equal(longsword.href,'/equipaggiamento/armi/spada-lunga');assert.equal(longsword.href2014,undefined);
 assert.match(longsword.label,/^Arma da mischia da guerra · 15 mo$/);
 const basket=rows.find(r=>r.nome==='Canestro');
 assert.equal(basket.href,'/equipaggiamento/avventura/canestro');assert.match(basket.label,/· 2014$/);
 const cesto=rows.find(r=>r.nome==='Cesto');assert.ok(cesto);
 assert.equal(cesto.solo,'2024');assert.equal(s.rowHref(cesto,'2014'),`${cesto.href}?edizione=2024`);assert.equal(s.rowHref(cesto,'2024'),cesto.href);
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
 // Classes: the twelve classes and their subclass (4 renamed in 2024: their 2014 name is a row of its own),
 // the subclass opening the tab of the sheet, in the edition of the row.
 assert.equal(bySection('classi').length,28);
 const evocation=rows.find(r=>r.nome==='Scuola di invocazione');
 assert.deepEqual([evocation.label,evocation.href],['Sottoclasse del mago · 2014','/classi/mago?edizione=2014#sottoclasse']);
 assert.equal(rows.find(r=>r.nome==='Guerriero').href2014,'/classi/guerriero?edizione=2014');
 assert.deepEqual(['Guerriero','Campione'].map(n=>rows.find(r=>r.nome===n)).map(r=>[r.label,r.href]),[['Classe · D10','/classi/guerriero'],['Sottoclasse del guerriero','/classi/guerriero#sottoclasse']]);
 assert.equal(rows.find(r=>r.nome==='Stregoneria draconica').label,'Sottoclasse dello stregone');
 assert.equal(bySection('condizioni').length,15,JSON.stringify(bySection('condizioni').map(r=>r.nome+'|'+r.label)));
 const data=f=>JSON.parse(fs.readFileSync('lib/data/'+f,'utf8'));
 const equipNames=new Set(bySection('equipaggiamento').map(r=>s.fold(r.nome)));
 for(const w of data('srd-weapons-it.json').armi)for(const e of [w['2014'],w['2024']])if(e&&e.nome)assert.ok(equipNames.has(s.fold(e.nome)),e.nome);
 // Every address exists: equipment, magic items and conditions against their data (spells and monsters in the browser tests).
 const {findGearEntry}=load('lib/adventuring-gear-editions.ts');const {getToolEntry}=load('lib/tools-editions.ts');
 const {findMagicItemEntry}=load('lib/magic-items-editions.ts');const {getWeapon}=load('lib/equipment.ts');const {getArmor}=load('lib/armor.ts');
 const classIds=new Set(load('lib/classes.ts').CLASS_IDS);
 const conditionIds=new Set([...data('srd-conditions-5.2.1-it.json'),...data('srd-conditions-5.1-it.json')].map(e=>e.id));
 const exists=href=>{
  const [p]=href.split('?');const parts=p.split('/');const id=parts.at(-1);
  if(p.startsWith('/equipaggiamento/armi/'))return !!getWeapon(id);
  if(p.startsWith('/equipaggiamento/armature/'))return !!getArmor(id);
  if(p.startsWith('/equipaggiamento/avventura/'))return !!findGearEntry(id);
  if(p.startsWith('/equipaggiamento/strumenti/'))return !!getToolEntry(id);
  if(p.startsWith('/oggetti-magici/'))return !!findMagicItemEntry(id);
  if(p.startsWith('/manuale/condizioni-'))return conditionIds.has(id);
  if(p.startsWith('/classi/'))return classIds.has(id.split('#')[0]);
  if(p.startsWith('/spell/')||p.startsWith('/mostro/'))return true;
  return false;
 };
 for(const r of rows){assert.ok(exists(r.href),r.href);if(r.href2014)assert.ok(exists(r.href2014),r.href2014);}
 // Ordering: names starting with the text first, then A–Z; at most 8 per group, then «Mostra tutti».
 const groups=s.search(production,rows,'dra');
 assert.deepEqual(groups.map(g=>g.section).slice(0,2),['incantesimi','mostri']);
 assert.ok(groups.find(g=>g.section==='oggetti-magici').rows.some(r=>r.nome==='Sfera del drago'));
 assert.deepEqual(groups[0].rows.map(r=>r.nome),['Forma di drago']);
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
 // The examples of the panel find something in the data; the Home shows only the field (no quick suggestions).
 const panel=fs.readFileSync('components/search/search-panel.tsx','utf8'),home=fs.readFileSync('components/search/home-search.tsx','utf8');
 const examples=JSON.parse(panel.match(/const EXAMPLES = (\[.*\]);/)[1].replace(/'/g,'"'));
 assert.equal(examples.length,5);assert.ok(!home.includes('SUGGESTIONS'));
 for(const q of examples)assert.ok(s.search(production,rows,q).length,q);
 // Hidden sections (/admin/sezioni) leave the index: their pages, and the section when it is empty.
 const hidden=await idx.buildSearchIndex('production',undefined,['classi','armi','condizioni']);
 assert.deepEqual(hidden.sections.map(x=>x.k),['incantesimi','mostri','equipaggiamento','oggetti-magici']);
 assert.ok(!hidden.rows.some(r=>/^\/(classi|equipaggiamento\/armi|compendio\/condizioni|manuale\/condizioni-)/.test(r[3])||(r[4]&&/^\/classi/.test(r[4]))),'no address of a hidden section');
 assert.ok(hidden.rows.some(r=>r[3].startsWith('/equipaggiamento/armature/')),'the other equipment stays');
 assert.equal(production.rows.length-hidden.rows.length,production.rows.filter(r=>/^\/(classi|equipaggiamento\/armi\/|manuale\/condizioni-)/.test(r[3])).length);
 // Hidden parts: an edition, a collection, the Sottoclasse tab leave the index too.
 const parts=await idx.buildSearchIndex('production',undefined,['incantesimi:2014','bestiario:animali','classi:tab-sottoclasse','armi:2024']);
 const partRows=s.rowsOf(parts);
 assert.ok(!partRows.some(r=>/^\/spell\/.*-2014$/.test(r.href)||(r.href2014&&r.href2014.startsWith('/spell/'))),'no 2014 spell');
 assert.equal(partRows.find(r=>r.nome==='Palla di fuoco').href2014,undefined);
 assert.ok(!partRows.some(r=>r.href.includes('#sottoclasse')),'no subclass row');
 assert.ok(partRows.some(r=>r.href==='/classi/mago'));
 const animals=require('../lib/data/srd-animal-ids.json');
 assert.ok(!partRows.some(r=>animals.includes(r.href.replace('/mostro/',''))),'no animal');
 assert.ok(!partRows.some(r=>r.href.startsWith('/equipaggiamento/armi/')&&!r.label.endsWith('· 2014')),'weapons only as 2014 rows');
 // Offline: the index is saved by the service worker; the panel never reaches the admin area.
 const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
 assert.ok(sw.includes('const SEARCH_INDEX = "/ricerca-indice.json";')&&sw.includes('"/preferiti", SEARCH_INDEX]'));
 console.log(`Search: ${production.rows.length} rows (stand-in spells and monsters), ${production.sections.length} public sections, every address checked.`);
})().catch(error=>{console.error(error);process.exit(1);});
