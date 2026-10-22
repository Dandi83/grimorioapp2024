const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');

const deps={},cache=new Map();
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id in deps)return deps[id];
  if(id.startsWith('@/')||id.startsWith('./')){
   const file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   if(fs.existsSync(file+'.ts'))return load(file+'.ts');
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}

const v=load('lib/content-validate.ts');
const sections=load('lib/content-sections.ts');
const apply=load('lib/content-overrides-apply.ts');
const eq=load('lib/equipment.ts');
const armi=sections.sectionSpec('armi');
const originalJson=fs.readFileSync('lib/data/srd-weapons-it.json','utf8');

// Registry: one section, both editions, every list item has its original values.
assert.ok(armi);assert.deepEqual(armi.editions,['2024','2014']);
assert.equal(armi.items('2024').length,eq.weapons.filter(w=>w.editions['2024']).length);
assert.equal(armi.items('2014').length,eq.weapons.filter(w=>w.editions['2014']).length);
assert.equal(sections.sectionSpec('sconosciuta'),undefined);
assert.deepEqual(sections.cardFields(armi,armi.original('spada-lunga','2014')).map(f=>f.name),['nome','costo','danni','tipoDanno','peso','proprieta'],'2014 weapons print no mastery');
assert.ok(sections.cardFields(armi,armi.original('spada-lunga','2024')).some(f=>f.name==='padronanza'));
assert.equal(armi.href('tridente','2014'),'/equipaggiamento/armi/tridente?edizione=2014');

// Every registered section: each card's printed values pass their checks, and reading then
// writing the fields gives back the same card (the overlay never changes what it does not correct).
const adapters=load('lib/content-adapters.ts');
assert.deepEqual(sections.CONTENT_SECTIONS.map(x=>x.key),['armi','armature','avventura','strumenti','oggetti-magici','classi','condizioni','manuale']);
let checked=0;
for(const section of sections.CONTENT_SECTIONS)for(const edition of section.editions)for(const item of section.items(edition)){
 const original=section.original(item.id,edition);
 assert.ok(original,`${section.key} ${item.id} ${edition}: original values`);
 const fields=sections.cardFields(section,original,item.id,edition);
 assert.deepEqual(fields.map(f=>f.name).sort(),Object.keys(original).sort(),`${section.key} ${item.id}: every field has a spec`);
 for(const field of fields){assert.equal(v.fieldError(field,original[field.name]),null,`${section.key} ${item.id} ${edition} ${field.name}: «${String(original[field.name]).slice(0,60)}»`);checked++;}
 assert.ok(section.href(item.id,edition).startsWith('/'));
}
assert.ok(checked>5000,`${checked} printed values checked`);
const armor=load('lib/armor.ts').armors[0].editions['2014'];
assert.deepEqual(adapters.armorAdapter.write(armor,adapters.armorAdapter.read(armor)),armor);
const shield=load('lib/armor.ts').armors.find(a=>a.id==='scudo').editions['2024'];
assert.deepEqual(adapters.armorAdapter.write(shield,adapters.armorAdapter.read(shield)),shield,'no strength requirement stays absent');
for(const entry of load('lib/adventuring-gear-editions.ts').gearEntries.slice(0,40)){
 if(entry.editions['2024'])assert.deepEqual(adapters.gear2024Adapter.write(entry.editions['2024'],adapters.gear2024Adapter.read(entry.editions['2024'])),entry.editions['2024']);
 if(entry.editions['2014'])assert.deepEqual(adapters.gear2014Adapter.write(entry.editions['2014'],adapters.gear2014Adapter.read(entry.editions['2014'])),entry.editions['2014']);
}
for(const entry of load('lib/tools-editions.ts').toolEntries){
 if(entry.editions['2024'])assert.deepEqual(adapters.tool2024Adapter.write(entry.editions['2024'],adapters.tool2024Adapter.read(entry.editions['2024'])),entry.editions['2024']);
 if(entry.editions['2014'])assert.deepEqual(adapters.tool2014Adapter.write(entry.editions['2014'],adapters.tool2014Adapter.read(entry.editions['2014'])),entry.editions['2014']);
}
const wand=load('lib/magic-items-editions.ts').magicItemEntries.find(e=>e.id==='bacchetta-delle-meraviglie').editions['2024'];
assert.deepEqual(adapters.magicItemAdapter.write(wand,adapters.magicItemAdapter.read(wand)),wand);
const fixedWand=adapters.magicItemAdapter.write(wand,{...adapters.magicItemAdapter.read(wand),'blocco-1':'Testo corretto.'});
assert.equal(fixedWand.blocchi[0].text,'Testo corretto.');assert.deepEqual(fixedWand.blocchi.slice(1),wand.blocchi.slice(1),'tables and other blocks untouched');
assert.notEqual(wand.blocchi[0].text,'Testo corretto.','the original card is not modified');
const tableIndex=wand.blocchi.findIndex(b=>b.kind==='table');
assert.equal(`blocco-${tableIndex+1}` in adapters.magicItemAdapter.read(wand),false,'tables are not editable fields');
// Classes: reading then writing gives back the same card; a corrected paragraph changes only itself.
for(const entry of load('lib/classes.ts').classEntries)for(const card of [entry.editions['2024'],entry.editions['2014']]){
 assert.deepEqual(adapters.classAdapter.write(card,adapters.classAdapter.read(card)),card,entry.id);
}
assert.equal('sottoclasse-motto' in adapters.classAdapter.read(load('lib/classes.ts').classEntries[0].editions['2014']),false,'2014 subclasses print no motto');
const fighter=load('lib/classes.ts').classEntries.find(e=>e.id==='guerriero').editions['2024'];
const fighterFields=adapters.classAdapter.read(fighter);
assert.equal(fighterFields['privilegio-1-titolo'],'Stile di combattimento');
assert.equal(adapters.classAdapter.label(fighter,'privilegio-1-1'),'Livello 1: Stile di combattimento · paragrafo 1');
const fixedFighter=adapters.classAdapter.write(fighter,{'privilegio-1-1':'Testo corretto.'});
assert.equal(fixedFighter.privilegi[0].contenuto[0].testo,'Testo corretto.');
assert.notEqual(fighter.privilegi[0].contenuto[0].testo,'Testo corretto.','the original card is not modified');
assert.deepEqual(fixedFighter.tabella,fighter.tabella,'the table is not an editable field');
assert.ok(!Object.keys(fighterFields).some(k=>/tabella/.test(k)));
const blinded=load('lib/conditions.ts').conditions.find(e=>e.id==='condizioni-accecato');
assert.equal(adapters.manualAdapter.label(blinded,'blocco-1'),blinded.blocks[0].kind==='heading'?'Titoletto 1':'Paragrafo 1');
assert.deepEqual(adapters.manualAdapter.write(blinded,adapters.manualAdapter.read(blinded)),blinded);
// Armor: a corrected name keeps the 2014 description, found by the printed name.
const armorLib=load('lib/armor.ts');
const leather=armorLib.armors.find(a=>a.id==='cuoio').editions['2014'];
assert.ok(armorLib.armorDescription(leather));
assert.deepEqual(armorLib.armorDescription(adapters.armorAdapter.write(leather,{...adapters.armorAdapter.read(leather),nome:'Cuoio bollito'})),armorLib.armorDescription(leather));

// Validation by kind: every printed value of the manual passes its own check.
for(const edition of armi.editions)for(const item of armi.items(edition)){
 const original=armi.original(item.id,edition);
 for(const field of sections.cardFields(armi,original))
  assert.equal(v.fieldError(field,original[field.name]),null,`${item.id} ${edition} ${field.name}: «${original[field.name]}»`);
}
const field=name=>armi.fields.find(f=>f.name===name);
for(const [name,bad] of [['danni','1d'],['danni','d8'],['danni','dieci'],['costo','5'],['costo','5 euro'],['peso','3 hg'],['peso','tre kg'],['proprieta','Lancio (gittata 6/18'],['nome',''],['nome','<b>Spada</b>'],['nome','x'.repeat(81)]])
 assert.ok(v.fieldError(field(name),bad),`${name}: «${bad}» refused`);
for(const [name,good] of [['danni','1d4 + 1'],['danni','—'],['costo','0,5 mo'],['peso','250 g'],['proprieta','']])
 assert.equal(v.fieldError(field(name),good),null,`${name}: «${good}» accepted`);
assert.equal(v.fieldError({name:'n',label:'N',kind:'number',max:6},'12'),null);
assert.ok(v.fieldError({name:'n',label:'N',kind:'number',max:6},'1,5'));
assert.ok(v.fieldError(field('nome'),'Spada\nlunga'),'one line');
assert.equal(v.normalizeValue('text','  Spada​  lunga\u0000 '),'Spada lunga');
assert.equal(v.normalizeValue('longtext','a  b \r\n\r\n\r\n\r\nc'),'a b\n\nc');
assert.ok(v.reasonError('ok'));assert.equal(v.reasonError('Refuso evidente nel PDF'),null);assert.ok(v.reasonError('x'.repeat(501)));

// Applying: newest correction in force wins, undone ones are ignored, only editable fields change.
const row=(over)=>({id:Math.random().toString(16),sezione:'armi',scheda_id:'lancia-da-cavaliere',edizione:'2024',campo:'peso',valore_originale:'3 kg',valore_nuovo:'6 kg',motivo:'prova',creata_il:'2026-10-21T10:00:00Z',creata_da:'admin',annullata_il:null,...over});
const rows=[row({valore_nuovo:'5 kg'}),row({valore_nuovo:'6 kg',creata_il:'2026-10-21T11:00:00Z'}),row({campo:'costo',valore_originale:'10 mo',valore_nuovo:'12 mo',annullata_il:'2026-10-21T12:00:00Z'}),row({campo:'page',valore_nuovo:'999'}),row({scheda_id:'non-esiste'})];
const active=apply.activeOverrideMap(rows);
assert.equal(active.get(apply.overrideKey('armi','lancia-da-cavaliere','2024','peso')).valore_nuovo,'6 kg');
assert.equal(active.has(apply.overrideKey('armi','lancia-da-cavaliere','2024','costo')),false,'undone corrections have no effect');
const raw={nome:'Lancia da cavaliere',peso:'3 kg',costo:'10 mo',page:110};
const out=apply.applyOverrides(raw,'armi','lancia-da-cavaliere','2024',active,eq.WEAPON_EDITABLE_FIELDS);
assert.deepEqual(out.record,{nome:'Lancia da cavaliere',peso:'6 kg',costo:'10 mo',page:110},'the page of the source is never changed');
assert.equal(out.applied.length,1);
assert.deepEqual(raw,{nome:'Lancia da cavaliere',peso:'3 kg',costo:'10 mo',page:110},'the original object is not modified');
assert.equal(apply.applyOverrides(raw,'armi','altra','2024',active,eq.WEAPON_EDITABLE_FIELDS).applied.length,0,'unknown ids: nothing applied');

// Health: orphan corrections (card or field gone) and corrections whose original changed.
assert.equal(apply.overrideHealth(row({}),armi.original('lancia-da-cavaliere','2024')),eq.weaponOriginal('lancia-da-cavaliere','2024').peso==='3 kg'?'ok':'original-changed');
assert.equal(apply.overrideHealth(row({valore_originale:'9 kg'}),{peso:'3 kg'}),'original-changed');
assert.equal(apply.overrideHealth(row({scheda_id:'non-esiste'}),armi.original('non-esiste','2024')),'orphan');
assert.equal(apply.overrideHealth(row({campo:'padronanza'}),armi.original('spada-lunga','2014')),'orphan','a 2014 weapon has no mastery');

// The weapon sheet is derived from the corrected values; the original files stay untouched.
const corrected=eq.buildWeapons((id,edition,r)=>id==='tridente'&&edition==='2024'?{...r,peso:'4 kg',proprieta:'Lancio (gittata 9/27), Versatile (1d10)'}:r);
const t=eq.getWeapon('tridente',corrected).editions['2024'];
assert.equal(t.peso,'4 kg');assert.equal(t.gittata,'9/27 m','the range follows the corrected properties');
assert.equal(eq.getWeapon('tridente').editions['2024'].peso,eq.weaponOriginal('tridente','2024').peso,'the default list keeps the printed value');
assert.equal(eq.weaponListItems(corrected).find(w=>w.id==='tridente').editions['2024'].peso,'4 kg','lists use the corrected values');
assert.equal(fs.readFileSync('lib/data/srd-weapons-it.json','utf8'),originalJson,'srd-weapons-it.json unchanged');

(async()=>{
 const pg=new PGlite();
 const query=(sql,params)=>pg.query(sql,params).then(r=>({...r,rowCount:r.affectedRows??r.rows.length}));
 deps['server-only']={};
 deps['./db']=deps['@/lib/db']={pool:{query,connect:async()=>({query,release(){}})}};
 const tagged=[],paths=[];
 deps['next/cache']={unstable_cache:fn=>fn,updateTag:tag=>tagged.push(tag),revalidatePath:p=>paths.push(p)};
 let admin=true;
 deps['@/lib/admin-action-helpers']={requireAdmin:async()=>{if(!admin)throw new Error('Non autorizzato');},clean:value=>typeof value==='string'?value.trim():''};
 const store=load('lib/content-overrides.ts');

 // Public pages before the first correction: no table yet, original values, no error.
 assert.deepEqual(await store.activeOverrides('armi'),[]);
 const corr=load('lib/corrected-content.ts');
 assert.equal((await corr.getCorrectedWeapons()).weapons,eq.weapons,'no corrections: exactly the project data');

 const {saveContentAction,undoContentAction}=load('app/actions/admin-content.ts');
 const form=(fields)=>{const f=new FormData();for(const [k,val] of Object.entries(fields))f.set(k,val);return f;};
 const base={sezione:'armi',id:'tridente',edizione:'2024'};
 const original=eq.weaponOriginal('tridente','2024');

 // Refusals: unknown section or card, nothing changed, invalid values, missing reason, no login.
 assert.match((await saveContentAction(null,form({...base,sezione:'magia'}))).error,/sconosciuta/);
 assert.match((await saveContentAction(null,form({...base,id:'non-esiste'}))).error,/sconosciuta/);
 assert.match((await saveContentAction(null,form({...base,'campo:peso':original.peso,motivo:'Prova di motivo'}))).error,/Nessun valore/);
 const invalid=await saveContentAction(null,form({...base,'campo:peso':'3 hg','campo:danni':'1d','campo:nome':'<i>x</i>',motivo:'Prova di motivo'}));
 assert.equal(invalid.ok,false);assert.deepEqual(Object.keys(invalid.fields).sort(),['danni','nome','peso']);
 assert.match((await saveContentAction(null,form({...base,'campo:peso':'4 kg',motivo:''}))).error,/motivo è obbligatorio/);
 admin=false;await assert.rejects(()=>saveContentAction(null,form({...base,'campo:peso':'4 kg',motivo:'Prova di motivo'})));admin=true;

 // Saving: one row per changed field, the reason kept, pages and search index refreshed.
 const saved=await saveContentAction(null,form({...base,'campo:peso':' 4  kg ','campo:costo':'6 mo','campo:nome':original.nome,motivo:'Refuso evidente nel PDF'}));
 assert.equal(saved.ok,true,saved.error);
 let log=await store.allOverrides();
 assert.equal(log.length,2);
 assert.deepEqual(log.map(r=>[r.campo,r.valore_originale,r.valore_nuovo,r.motivo,r.creata_da]).sort(),[['costo',original.costo,'6 mo','Refuso evidente nel PDF','admin'],['peso',original.peso,'4 kg','Refuso evidente nel PDF','admin']]);
 assert.ok(tagged.includes(store.OVERRIDES_TAG));
 for(const p of ['/equipaggiamento/armi','/equipaggiamento/armi/tridente','/ricerca-indice.json','/admin/registro'])assert.ok(paths.includes(p),p);
 let shown=await corr.getCorrectedWeapons();
 assert.equal(eq.getWeapon('tridente',shown.weapons).editions['2024'].peso,'4 kg');
 assert.equal(eq.getWeapon('tridente',shown.weapons).editions['2014'].peso,eq.weaponOriginal('tridente','2014').peso,'the other edition is not touched');
 assert.deepEqual(shown.corrections.get('tridente')['2024'].map(r=>r.campo).sort(),['costo','peso']);
 assert.equal(eq.getWeapon('tridente').editions['2024'].peso,original.peso,'the original data are unchanged');

 // Changing again replaces the correction in force (the old one stays in the log as undone).
 assert.equal((await saveContentAction(null,form({...base,'campo:peso':'2,5 kg',motivo:'Seconda verifica sul PDF'}))).ok,true);
 log=await store.allOverrides();
 assert.equal(log.length,3);
 assert.equal(apply.activeOverrideMap(log).get(apply.overrideKey('armi','tridente','2024','peso')).valore_nuovo,'2,5 kg');
 assert.equal(log.filter(r=>r.campo==='peso'&&r.annullata_il).length,1);

 // «Ripristina originale»: writing the printed value again undoes the correction.
 assert.equal((await saveContentAction(null,form({...base,'campo:costo':original.costo,motivo:'Il PDF era giusto'}))).ok,true);
 assert.equal(apply.activeOverrideMap(await store.allOverrides()).has(apply.overrideKey('armi','tridente','2024','costo')),false);

 // «Annulla modifica» from the log.
 const peso=apply.activeOverrideMap(await store.allOverrides()).get(apply.overrideKey('armi','tridente','2024','peso'));
 assert.equal((await undoContentAction(form({id:peso.id}))).ok,true);
 assert.equal((await undoContentAction(form({id:peso.id}))).ok,false,'an undone correction cannot be undone twice');
 assert.equal((await undoContentAction(form({id:'not-a-uuid'}))).ok,false);
 shown=await corr.getCorrectedWeapons();
 assert.equal(eq.getWeapon('tridente',shown.weapons).editions['2024'].peso,original.peso,'after undo the card shows the printed value');
 assert.equal(await store.countActiveOverrides(),0);
 assert.equal((await store.allOverrides()).length,3,'the whole history is kept (restoring adds no row, it closes one)');

 // Every other section: corrections reach the cards, the lists and the condition pages.
 const save=async(sezione,id,edizione,fields)=>{const r=await saveContentAction(null,form({sezione,id,edizione,...Object.fromEntries(Object.entries(fields).map(([k,val])=>[`campo:${k}`,val])),motivo:'Prova sulle altre sezioni'}));assert.equal(r.ok,true,`${sezione}: ${r.error} ${JSON.stringify(r.fields)}`);};
 await save('armature','cuoio','2014',{peso:'4,5 kg',nome:'Cuoio bollito'});
 let armorsShown=await corr.getCorrectedArmors();
 assert.equal(armorsShown.list.find(a=>a.id==='cuoio').editions['2014'].peso,'4,5 kg');
 assert.equal(armorLib.armorListItems(armorsShown.list).find(a=>a.id==='cuoio').editions['2014'].nome,'Cuoio bollito');
 assert.equal(armorLib.armors.find(a=>a.id==='cuoio').editions['2014'].peso,armorLib.armors.find(a=>a.id==='cuoio').editions['2014'].peso);
 assert.deepEqual(armorsShown.corrections.get('cuoio')['2014'].map(r=>r.campo).sort(),['nome','peso']);
 const wandFields=sections.sectionSpec('oggetti-magici').original('bacchetta-delle-meraviglie','2024');
 await save('oggetti-magici','bacchetta-delle-meraviglie','2024',{'blocco-1':wandFields['blocco-1']+' (corretto)'});
 const magicShown=await corr.getCorrectedMagicItems();
 assert.match(magicShown.list.find(e=>e.id==='bacchetta-delle-meraviglie').editions['2024'].blocchi[0].text,/\(corretto\)$/);
 await save('condizioni','condizioni-accecato','2024',{title:'Accecato (corretto)'});
 const condShown=await corr.getCorrectedConditions();
 assert.equal(condShown.list['2024'].find(e=>e.id==='condizioni-accecato').title,'Accecato (corretto)');
 assert.equal((await corr.getCorrectedManualEntry('condizioni-accecato')).entry.title,'Accecato (corretto)','the condition page uses the same correction');
 assert.equal((await corr.getCorrectedManualEntry('condizioni-accecato-2014')).entry.title,'Accecato','the 2014 condition is a separate card');
 const gearEntry=load('lib/adventuring-gear-editions.ts').gearEntries.find(e=>e.editions['2024']&&e.editions['2024'].paragraphs.length);
 await save('avventura',gearEntry.id,'2024',{prezzo:'99 mo'});
 assert.equal((await corr.getCorrectedGear()).list.find(e=>e.id===gearEntry.id).editions['2024'].prezzo,'99 mo');
 const toolEntry=load('lib/tools-editions.ts').toolEntries.find(e=>e.editions['2024']);
 await save('strumenti',toolEntry.id,'2024',{creazione:'Primo oggetto\nSecondo oggetto'});
 assert.deepEqual((await corr.getCorrectedTools()).list.find(e=>e.id===toolEntry.id).editions['2024'].creazione,['Primo oggetto','Secondo oggetto']);
 assert.equal(load('lib/tools-editions.ts').toolListRows((await corr.getCorrectedTools()).list)['2024'].length,load('lib/tools-editions.ts').toolListRows()['2024'].length);
 const manualEntry=load('lib/manual.ts').manualEntries.find(e=>e.category!=='condizioni');
 await save('manuale',manualEntry.id,'2024',{title:manualEntry.title+' (corretto)'});
 assert.equal((await corr.getCorrectedManualEntry(manualEntry.id)).entry.title,manualEntry.title+' (corretto)');
 assert.ok((await corr.getCorrectedManualEntries()).some(e=>e.title===manualEntry.title+' (corretto)'));
 assert.match((await saveContentAction(null,form({sezione:'manuale',id:manualEntry.id,edizione:'2014','campo:title':'x',motivo:'Prova di motivo'}))).error,/sconosciuta/,'the Manual has only 2024');

 // A database that cannot be read never breaks a page: original values.
 deps['./db'].pool.query=()=>Promise.reject(Object.assign(new Error('down'),{code:'57P01'}));
 const warn=console.warn;let warned=false;console.warn=()=>{warned=true;};
 assert.deepEqual(await store.activeOverrides('armi'),[]);console.warn=warn;assert.ok(warned);
 await pg.close();
 console.log('Content overrides: registry, checks by field kind (all printed values pass), newest-wins application on editable fields only, orphan/changed originals, save/replace/restore/undo with reason and full history, pages refreshed, originals untouched, database failure shows the manual.');
})().catch(error=>{console.error(error);process.exit(1);});
