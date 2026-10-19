const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
function load(relative, deps={}) {
 const f=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>deps[id]??createRequire(f)(id),mod,mod.exports);return mod.exports;
}
(async()=>{
 const mt=load('lib/monsters-types.ts'),st=load('lib/spells-types.ts');
 const all=load('lib/srd-monsters.ts').previewMonsters([],'production');
 const before=JSON.stringify(all);
 const page=load('app/bestiario/page.tsx',{'@/components/bestiario-browser':{BestiarioBrowser:'test-browser'},'@/lib/monsters':{getAllMonsters:async()=>all}}).default;
 const element=await page({searchParams:Promise.resolve({raccolta:'animali',gs:'1/2'})});
 const list=element.props.monsters;
 assert.equal(list.length,340);assert.deepEqual(list.map(m=>m.id),all.map(m=>m.id));
 assert.ok(!list.some(m=>'azioni' in m||'descrizione' in m||'tratti' in m),'Public lists must not ship complete creature sheets');
 assert.deepEqual(mt.computeMonstersMeta(list),mt.computeMonstersMeta(all));
 assert.equal(list.filter(mt.isSrdAnimal).length,100);assert.equal(element.props.initialRaccolta,'animali');assert.equal(element.props.initialGs,'1/2');
 assert.equal(JSON.stringify(all),before,'Projection cannot modify source records');
 const spell={id:'custom-admin-spell',nome_italiano:'Incantesimo di prova',livello:'Evocazione di 3° livello (mago)',livello_num:3,scuola:'Evocazione',classi:['mago'],descrizione:'FULL_BODY_NOT_FOR_LIST '.repeat(1000),tempo_di_lancio:'azione',gittata:'18 m',componenti:'V',durata:'1 minuto'};
 const spellBefore=JSON.stringify(spell);
 const index=[{id:spell.id,nome_italiano:spell.nome_italiano,livello_num:spell.livello_num,scuola:spell.scuola,classi:spell.classi}];
 const sp=load('app/grimorio/page.tsx',{'@/components/grimorio-browser':{GrimorioBrowser:'test-browser'},'@/lib/spell-index':{getSpellIndex:async()=>index},'@/lib/spells-types':st}).default;
 const se=await sp({searchParams:Promise.resolve({livello:'3',scuola:'Evocazione',classe:'mago'})});
 assert.ok(!('descrizione' in se.props.spells[0]),'Spell lists must not ship complete descriptions');
 assert.deepEqual(Object.keys(se.props.spells[0]).sort(),['id','nome_italiano','livello_num','scuola','classi'].sort());
 assert.strictEqual(se.props.spells,index,'the page passes the lightweight index directly');
 assert.equal(se.props.spells[0].id,spell.id);assert.equal(se.props.spells[0].nome_italiano,spell.nome_italiano);
 assert.deepEqual(se.props.spells[0].classi,['mago']);assert.equal(se.props.initialLivello,3);assert.deepEqual(se.props.meta,st.computeMeta([spell]));
 assert.equal(JSON.stringify(spell),spellBefore);
 // Exercise the new reader too: the page no longer performs the projection.
 const additions=load('lib/srd-additions.ts');
 const additionId=JSON.parse(fs.readFileSync('lib/data/srd-additions-20261017.json','utf8')).spells[0].id;
 const sourceRows=[{id:'manual-index',nome_italiano:'Manuale',livello:'Divinazione di 2° livello (mago)'},{id:additionId,nome_italiano:'Modifica amministrativa',livello:'Abiurazione di 1° livello (chierico)'}];
 const originalEnv=process.env.VERCEL_ENV;
 try {
  for(const environment of ['preview','production',undefined]) {
   if(environment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=environment;
   let configured=false;
   const reader=load('lib/spell-index.ts',{
    'server-only':{},
    'next/cache':{unstable_cache:(fn,key,options)=>{assert.deepEqual(key,['spell-index',environment??'local']);assert.deepEqual(options,{tags:['spells'],revalidate:3600});configured=true;return fn;}},
    'drizzle-orm':{asc:column=>{assert.equal(column,'sort_key');return column;}},
    './db/schema':{spells:{id:'id',nome_italiano:'nome_italiano',livello:'livello',sort_key:'sort_key'}},
    './db':{db:{select:columns=>{assert.deepEqual(Object.keys(columns).sort(),['id','nome_italiano','livello'].sort(),'SQL selects no descriptions or edition fields');return {from:()=>({orderBy:async()=>sourceRows})};}}},
    './srd-additions':additions,'./spells-types':st,
   });
   const values=await reader.getSpellIndex();
   assert.ok(configured);assert.equal(values.length,environment?21:2);
   assert.equal(values.find(s=>s.id===additionId).nome_italiano,'Modifica amministrativa','virtual additions never replace an existing manual row');
   assert.deepEqual(values.find(s=>s.id==='manual-index'),{id:'manual-index',nome_italiano:'Manuale',livello_num:2,scuola:'Divinazione',classi:['mago']});
   for(const value of values)assert.deepEqual(Object.keys(value).sort(),['id','nome_italiano','livello_num','scuola','classi'].sort());
   assert.deepEqual(JSON.parse(JSON.stringify(values)),values,'index consists only of JSON-serializable values');
  }
 } finally {if(originalEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=originalEnv;}
 console.log('Catalog payloads: IDs, metadata, filters, 100 animals, admin records and immutable sources preserved; full detail bodies excluded.');
})().catch(e=>{console.error(e);process.exitCode=1});
