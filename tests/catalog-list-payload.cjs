const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
function load(relative, deps={}) {
 const f=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>deps[id]??(id==='./spell-text-repairs'?load('lib/spell-text-repairs.ts'):createRequire(f)(id)),mod,mod.exports);return mod.exports;
}
(async()=>{
 const mt=load('lib/monsters-types.ts'),st=load('lib/spells-types.ts');
 const srd=load('lib/srd-monsters.ts');
 const all=srd.previewMonsters([],'production');
 const before=JSON.stringify(all);
 // The cached list index projects every record; pages pass it through unchanged.
 let indexConfigured=false,monsterKey;
 const monsterIndex=load('lib/monster-index.ts',{'server-only':{},'./homebrew':{publishedHomebrew:async()=>[],homebrewListItem:row=>row},'./monsters':{getAllMonsters:async()=>all},'./monsters-types':mt,'./srd-monsters':srd,
  'next/cache':{unstable_cache:(fn,key,options)=>{assert.equal(key[0],'monster-list-index');assert.match(key[2],/^[0-9a-z]+$/,'the key follows the project files');monsterKey=key;assert.deepEqual(options,{tags:['monsters'],revalidate:3600});indexConfigured=true;return fn;}}});
 assert.ok(indexConfigured,'the monster list is cached with the tag invalidated by admin saves');
 // A new SRD sheet or habitat file changes the key, so a deployment never serves the previous list.
 let changedKey;
 load('lib/monster-index.ts',{'server-only':{},'./homebrew':{publishedHomebrew:async()=>[],homebrewListItem:row=>row},'./monsters':{getAllMonsters:async()=>all},'./monsters-types':mt,'./srd-monsters':srd,
  './data/habitat-mostri.json':{aboleth:['Sottosuolo']},'next/cache':{unstable_cache:(fn,key)=>{changedKey=key;return fn;}}});
 assert.notEqual(changedKey[2],monsterKey[2]);
 const monsterList=await monsterIndex.getMonsterListIndex();
 assert.deepEqual((await monsterIndex.getMonsterIdIndex()).map(m=>m.id),all.map(m=>m.id),'static generation keeps every creature ID');
 const page=load('app/bestiario/page.tsx',{'@/lib/section-view':{visibleCards:async(k,l)=>l,bestiaryList:async l=>l},'@/components/catalog-browsers':{BestiarioWithFilters:'test-browser'},'@/components/layout/catalog-split':{EmptyCard:'empty-card'},'@/lib/monster-index':{getMonsterListIndex:async()=>monsterList}}).default;
 // Phone: the list itself (in a block hidden only on a computer, where it is in the left column); then the empty card of the computer.
 const listOf=fragment=>{const [phone,empty]=fragment.props.children;assert.equal(phone.props.className,'lg:hidden');assert.equal(empty.type,'empty-card');return phone.props.children;};
 const element=listOf(await page());
 assert.equal(element.type,'test-browser','The static page renders the catalog directly, without a Suspense fallback');
 const list=element.props.monsters;
 const legacyCount=JSON.parse(fs.readFileSync('lib/data/srd-monsters-5.1-it.json','utf8')).records.length;
 assert.equal(list.length,330+legacyCount);assert.deepEqual(list.map(m=>m.id),all.map(m=>m.id));
 assert.ok(!list.some(m=>'azioni' in m||'descrizione' in m||'tratti' in m),'Public lists must not ship complete creature sheets');
 assert.deepEqual(mt.computeMonstersMeta(list),mt.computeMonstersMeta(all));
 assert.equal(list.filter(mt.isSrdAnimal).length,JSON.parse(fs.readFileSync('lib/data/srd-animal-ids.json','utf8')).length);
 // Every row carries its rules edition for the 2024 | 2014 selector: the SRD 5.1 sheets are 2014.
 assert.deepEqual(list.filter(m=>m.edizione==='2014').map(m=>m.id).sort(),JSON.parse(fs.readFileSync('lib/data/srd-monsters-5.1-it.json','utf8')).records.map(r=>r.monster.id).sort());
 assert.ok(list.every(m=>m.edizione==='2014'||m.edizione==='2024'));
 assert.equal(JSON.stringify(all),before,'Projection cannot modify source records');
 const spell={id:'custom-admin-spell',nome_italiano:'Incantesimo di prova',livello:'Evocazione di 3° livello (mago)',livello_num:3,scuola:'Evocazione',classi:['mago'],descrizione:'FULL_BODY_NOT_FOR_LIST '.repeat(1000),tempo_di_lancio:'azione',gittata:'18 m',componenti:'V',durata:'1 minuto'};
 const spellBefore=JSON.stringify(spell);
 const index=[{id:spell.id,nome_italiano:spell.nome_italiano,livello_num:spell.livello_num,scuola:spell.scuola,classi:spell.classi}];
 const sp=load('app/grimorio/page.tsx',{'@/lib/section-view':{visibleCards:async(k,l)=>l,bestiaryList:async l=>l},'@/components/catalog-browsers':{GrimorioWithFilters:'test-browser'},'@/components/layout/catalog-split':{EmptyCard:'empty-card'},'@/lib/spell-index':{getSpellIndex:async()=>index},'@/lib/spells-types':st}).default;
 const se=listOf(await sp());
 assert.equal(se.type,'test-browser','The static page renders spell names directly');
 assert.ok(!('descrizione' in se.props.spells[0]),'Spell lists must not ship complete descriptions');
 assert.deepEqual(Object.keys(se.props.spells[0]).sort(),['id','nome_italiano','livello_num','scuola','classi'].sort());
 assert.strictEqual(se.props.spells,index,'the page passes the lightweight index directly');
 assert.equal(se.props.spells[0].id,spell.id);assert.equal(se.props.spells[0].nome_italiano,spell.nome_italiano);
 assert.deepEqual(se.props.spells[0].classi,['mago']);assert.deepEqual(se.props.meta,st.computeMeta([spell]));
 assert.equal(JSON.stringify(spell),spellBefore);
 const favorites=load('app/preferiti/page.tsx',{'@/components/favorites-list':{FavoritesList:'test-favorites'},'@/lib/monster-index':{getMonsterListIndex:async()=>monsterList},'@/lib/spell-index':{getSpellIndex:async()=>index},'@/lib/section-view':{visibleCards:async(k,l)=>l,bestiaryList:async l=>l,markedCards:async(k,l)=>l,cardHidden:async()=>false,cardsOut:async()=>[],sectionView:async()=>({admin:false,hidden:[],hiddenParts:[],hiddenCards:[]}),sectionsOut:async()=>[],partsOut:async()=>[],linksOut:async()=>[],partState:async()=>({shown:true,hidden:false}),editionCard:async()=>false,pageEditions:async()=>['2024','2014']},'@/lib/monsters-types':{isSrdAnimal:()=>false}}).default;
 const fe=await favorites();
 assert.strictEqual(fe.props.spells,index);
 assert.ok(!fe.props.monsters.some(m=>'azioni' in m||'descrizione' in m));
 assert.deepEqual(fe.props.monsters.map(m=>m.id),all.map(m=>m.id));
 // Exercise the new reader too: the page no longer performs the projection.
 const additions=load('lib/srd-additions.ts');
 const additionId=JSON.parse(fs.readFileSync('lib/data/srd-additions-20261017.json','utf8')).spells[0].id;
 const sourceRows=[{id:'i-re-spirare-sott-acqua',nome_italiano:'Doppione',livello:'Trasmutazione di 3° livello (mago)'},{id:'manual-index',nome_italiano:'Manuale',livello:'Divinazione di 2° livello (mago)',tempo_di_lancio:'1 minuto o rituale',durata:'Concentrazione, fino a 1 ora'},{id:additionId,nome_italiano:'Modifica amministrativa',livello:'Abiurazione di 1° livello (chierico)',tempo_di_lancio:'Azione',durata:'Istantanea'}];
 const legacySpells=load('lib/srd-spells-2014.ts');
 const repairs=load('lib/spell-catalog-repairs.ts',{'./spells-types':st});
 const aliases=load('lib/monster-id-aliases.ts');
 const legacyIds=JSON.parse(fs.readFileSync('lib/data/srd-spells-5.1-it.json','utf8')).records.map(r=>r.spell.id);
 const originalEnv=process.env.VERCEL_ENV,spellKeys=new Set();
 try {
  for(const environment of ['preview','production',undefined]) {
   if(environment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=environment;
   let configured=false;
   const reader=load('lib/spell-index.ts',{
    'server-only':{},
    'next/cache':{unstable_cache:(fn,key,options)=>{assert.deepEqual(key.slice(0,2),['spell-index',environment??'local']);assert.match(key[2],/^[0-9a-z]+$/,'the key follows the project files');spellKeys.add(key[2]);assert.deepEqual(options,{tags:['spells'],revalidate:3600});configured=true;return fn;}},
    'drizzle-orm':{asc:column=>{assert.equal(column,'sort_key');return column;}},
    './db/schema':{spells:{id:'id',nome_italiano:'nome_italiano',livello:'livello',tempo_di_lancio:'tempo_di_lancio',durata:'durata',sort_key:'sort_key'}},
    './content-editions':{getContentEditions:async kind=>{assert.equal(kind,'spell');return new Map([['manual-index','2014']]);}},
    './db':{db:{select:columns=>{assert.deepEqual(Object.keys(columns).sort(),['id','nome_italiano','livello','tempo_di_lancio','durata'].sort(),'SQL selects no descriptions');return {from:()=>({orderBy:async()=>sourceRows})};}}},
    './srd-additions':additions,'./srd-spells-2014':legacySpells,'./spell-catalog-repairs':repairs,'./monster-id-aliases':aliases,'./spells-types':st,
   });
   const values=await reader.getSpellIndex();
   assert.ok(!values.some(s=>s.id==='i-re-spirare-sott-acqua'),'the merged duplicate row is not listed');
   assert.ok(configured);assert.equal(values.length,environment?21+legacyIds.length:2);
   // The 2014 spells come from the project files and carry their edition, so the 2014 selector appears.
   assert.deepEqual(values.filter(s=>s.edizione==='2014'&&s.id!=='manual-index').map(s=>s.id).sort(),environment?[...legacyIds].sort():[]);
   assert.equal(values.find(s=>s.id===additionId).nome_italiano,'Modifica amministrativa','virtual additions never replace an existing manual row');
   assert.deepEqual(values.find(s=>s.id==='manual-index'),{id:'manual-index',nome_italiano:'Manuale',livello_num:2,scuola:'Divinazione',classi:['mago'],tempo_di_lancio:'1 minuto o rituale',concentrazione:true,rituale:true,edizione:'2014'});
   for(const value of values){assert.ok(!('descrizione' in value)&&!('durata' in value),'list rows carry no description or duration text');assert.ok(Object.keys(value).every(key=>['id','nome_italiano','livello_num','scuola','classi','tempo_di_lancio','concentrazione','rituale','edizione'].includes(key)));}
   assert.deepEqual(JSON.parse(JSON.stringify(values)),values,'index consists only of JSON-serializable values');
  }
 } finally {if(originalEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=originalEnv;}
 // A new 2014 block changes the key, so a deployment never serves the previous list.
 let fewer;
 const smaller={...legacySpells,withLegacySpells:(rows,environment)=>legacySpells.withLegacySpells(rows,environment).slice(0,-1)};
 load('lib/spell-index.ts',{'server-only':{},'./db':{},'./db/schema':{spells:{}},'drizzle-orm':{asc:x=>x},'./content-editions':{},'./srd-additions':additions,'./srd-spells-2014':smaller,'./spell-catalog-repairs':repairs,'./monster-id-aliases':aliases,'./spells-types':st,
  'next/cache':{unstable_cache:(fn,key)=>{fewer=key[2];return fn;}}});
 assert.equal(spellKeys.size,1);assert.notEqual(fewer,[...spellKeys][0]);
 console.log('Catalog payloads: IDs, metadata, filters, animals, admin records and immutable sources preserved; full detail bodies excluded.');
})().catch(e=>{console.error(e);process.exitCode=1});
