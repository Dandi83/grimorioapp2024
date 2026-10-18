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
 const sp=load('app/grimorio/page.tsx',{'@/components/grimorio-browser':{GrimorioBrowser:'test-browser'},'@/lib/spells':{getAllSpells:async()=>[spell],computeMeta:st.computeMeta}}).default;
 const se=await sp({searchParams:Promise.resolve({livello:'3',scuola:'Evocazione',classe:'mago'})});
 assert.ok(!('descrizione' in se.props.spells[0]),'Spell lists must not ship complete descriptions');
 assert.equal(se.props.spells[0].id,spell.id);assert.equal(se.props.spells[0].nome_italiano,spell.nome_italiano);
 assert.deepEqual(se.props.spells[0].classi,['mago']);assert.equal(se.props.initialLivello,3);assert.deepEqual(se.props.meta,st.computeMeta([spell]));
 assert.equal(JSON.stringify(spell),spellBefore);
 console.log('Catalog payloads: IDs, metadata, filters, 100 animals, admin records and immutable sources preserved; full detail bodies excluded.');
})().catch(e=>{console.error(e);process.exitCode=1});
