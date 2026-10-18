import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
assert.ok(existsSync(path.join(root,'lib/manual.ts')),'Manual provider and routes must exist');
function load(file,deps={}){if(file.endsWith('.json'))return JSON.parse(readFileSync(file));const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>{if(id in deps)return deps[id];if(id==='next/link')return {__esModule:true,default:({children,...p})=>createElement('a',p,children)};if(id.startsWith('@/')||id.startsWith('.')){let p=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);if(!path.extname(p))p=['.tsx','.ts','.json'].map(e=>p+e).find(existsSync);return load(p,deps);}return require(id);},m,m.exports);return m.exports;}
const manual=load(path.join(root,'lib/manual.ts'));
assert.equal(manual.manualAvailable('production'),false);assert.equal(manual.manualAvailable('preview'),true);
const entries=manual.manualEntries;assert.equal(entries.filter(e=>e.category==='condizioni').length,15);assert.equal(entries.filter(e=>e.subgroup==='Classi').length,12);assert.equal(entries.filter(e=>e.subgroup==='Specie').length,9);assert.equal(entries.filter(e=>e.subgroup==='Background').length,4);
for (const [category,count] of [['classi',12],['background',4],['specie',9],['creazione',4]]) assert.equal(entries.filter(e=>e.category===category).length,count,category+' is a separate collection');
assert.equal(entries.some(e=>e.category==='personaggi'),false);
for(const e of entries){assert.equal(manual.getManualEntry(e.id),e);assert.ok(e.blocks.length);}
assert.equal(manual.getManualEntry('missing'),undefined);
const conditions=load(path.join(root,'lib/conditions.ts'));
assert.deepEqual(conditions.findConditions('È afferrata, poi cade prona e diventa priva di sensi.').map(e=>e.title),['Afferrato','Privo di sensi','Prono']);
assert.deepEqual(conditions.findConditions('Una presenza spaventosa e un invisibilissimo fantasma.'),[]);
const {ConditionReferences}=load(path.join(root,'components/condition-references.tsx'));
let html=renderToStaticMarkup(createElement(ConditionReferences,{text:'Il bersaglio è afferrato e avvelenato.'}));assert.ok(html.includes('Afferrato')&&html.includes('Avvelenato'));assert.ok(html.includes('aria-haspopup="dialog"'));assert.equal(renderToStaticMarkup(createElement(ConditionReferences,{text:'Nessuna condizione menzionata.'})), '');
const spellRefs=load(path.join(root,'lib/spell-references.ts'));
assert.deepEqual(spellRefs.findReferencedSpells('<strong>Incantesimi.</strong> <em>Invisibilità</em>, <em>palla di fuoco (di 4º livello)</em>').map(s=>s.name),['Invisibilità','Palla di fuoco']);
assert.deepEqual(spellRefs.findReferencedSpells('Il mostro vola alla luce del sole.'),[]);
const provider=load(path.join(root,'lib/srd-monsters.ts'));const rows=provider.previewMonsters([],'preview');assert.equal(rows.length,340);assert.equal(new Set(rows.map(x=>x.id)).size,340);assert.equal(provider.previewMonsters([],'production').length,340);
const types=load(path.join(root,'lib/monsters-types.ts'));assert.equal(rows.filter(types.isSrdAnimal).length,100);assert.equal(types.typeCategory('Sciame di bestie Minuscole'),'Bestia');assert.equal(types.isSrdAnimal(rows.find(m=>m.id==='alce-gigante')),true);assert.equal(types.typeCategory(rows.find(m=>m.id==='alce-gigante').tipo),'Celestiale');
for(const id of ['app/manuale/page.tsx','app/manuale/[id]/page.tsx'])assert.ok(existsSync(path.join(root,id)));
const {ManualContent}=load(path.join(root,'components/manual-content.tsx'));
for(const e of entries){const markup=renderToStaticMarkup(createElement(ManualContent,{entry:e}));for(const b of e.blocks){const text=renderToStaticMarkup(createElement('span',null,b.text)).replace(/^<span>|<\/span>$/g,'');assert.ok((e.category === 'condizioni' ? markup.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').includes(text.replace(/\s+/g,' ')) : markup.includes(text)),e.title+': missing block');}assert.ok(markup.includes('#page='+e.page));assert.ok(markup.includes('Attribuzione e licenza'));}
const spellPage=readFileSync(path.join(root,'app/spell/[id]/page.tsx'),'utf8');
assert.ok(!spellPage.includes('<ConditionReferences'), 'Spell condition references are inline without a duplicate footer panel');
const monsterPage=readFileSync(path.join(root,'app/mostro/[id]/page.tsx'),'utf8');
assert.ok(!monsterPage.includes('<ConditionReferences') && !monsterPage.includes('<SpellReferences'), 'Monster references are inline without duplicate footer panels');
const paralizzatoMarkup=renderToStaticMarkup(createElement(ManualContent,{entry:manual.getManualEntry('condizioni-paralizzato')}));
assert.equal((paralizzatoMarkup.match(/data-condition-effect=/g)||[]).length,5);
assert.ok(paralizzatoMarkup.includes('href="/manuale/condizioni-incapacitato"'));
assert.ok(!paralizzatoMarkup.includes('href="/manuale/condizioni-paralizzato"'));
const pietrificatoEntry=manual.getManualEntry('condizioni-pietrificato');
const pietrificatoMarkup=renderToStaticMarkup(createElement(ManualContent,{entry:pietrificatoEntry}));
assert.equal((pietrificatoMarkup.match(/data-condition-effect=/g)||[]).length,pietrificatoEntry.blocks.length-2,'PDF continuation remains in its effect');
const {ManualBrowser}=load(path.join(root,'components/manual-browser.tsx'));
for(const [category,count] of [['classi',12],['background',4],['specie',9]]) {
 const index=renderToStaticMarkup(createElement(ManualBrowser,{entries:entries.map(e=>({...e,search:e.title.toLowerCase()})),initialCategory:category}));
 assert.ok(index.includes(count+'<!-- --> <!-- -->voci') || index.replace(/<!--.*?-->/g,'').includes(count+' voci'),category+' visible count');
 for(const e of entries) assert.equal(index.includes('href="/manuale/'+e.id+'"'),e.category===category,category+': '+e.id);
 assert.ok(!index.includes('Raccolta personaggi'));
}
const {default:EntryPage}=load(path.join(root,'app/manuale/[id]/page.tsx'),{'@/components/back-button':{BackButton:()=>null},'next/navigation':{notFound(){throw new Error('unexpected notFound');}}});
const previousEnv=process.env.VERCEL_ENV;process.env.VERCEL_ENV='preview';
for(const [id,category,label] of [['personaggi-mago','classi','Classi'],['personaggi-accolito','background','Background'],['personaggi-elfo','specie','Specie']]) {
 const page=renderToStaticMarkup(await EntryPage({params:Promise.resolve({id})}));assert.ok(page.includes('href="/manuale?sezione='+category+'"'));assert.ok(page.includes(label));
}
if(previousEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previousEnv;
console.log('[manual] Reference routes, all 58 entries and their content/source links, conditions and 340 creatures including 100 animals verified.');
// Published inline links must reach condition details while the Manual index stays hidden.
process.env.VERCEL_ENV='production';
const publishedCondition=renderToStaticMarkup(await EntryPage({params:Promise.resolve({id:'condizioni-paralizzato'})}));
assert.ok(publishedCondition.includes('Paralizzato'));
assert.ok(!publishedCondition.includes('href="/manuale?sezione=condizioni"'),'published condition must not link to hidden Manual index');
await assert.rejects(()=>EntryPage({params:Promise.resolve({id:'personaggi-mago'})}));
if(previousEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previousEnv;
