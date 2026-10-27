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
const {conditionRows,conditionsOnly2024}=load('lib/conditions-list.ts');
const rows=conditionRows();
const data2024=JSON.parse(fs.readFileSync('lib/data/srd-conditions-5.2.1-it.json','utf8'));
const data2014=[...JSON.parse(fs.readFileSync('lib/data/srd-conditions-5.1-it.json','utf8')),...JSON.parse(fs.readFileSync('lib/data/srd-conditions-5.1-traduzione.json','utf8'))];
// Names exactly as printed in the data, A–Z; every condition of each edition, none invented.
assert.deepEqual(rows['2024'].map(r=>r.nome),['Accecato','Affascinato','Afferrato','Assordato','Avvelenato','Incapacitato','Indebolimento','Invisibile','Paralizzato','Pietrificato','Privo di sensi','Prono','Spaventato','Stordito','Trattenuto']);
assert.deepEqual(rows['2024'].map(r=>r.nome).sort(),data2024.map(e=>e.title).sort());
assert.deepEqual(rows['2014'].map(r=>r.nome).sort(),data2014.map(e=>e.title).sort());
// 15 in 2014 too: the 4 missing in the Italian SRD 5.1 in our translation, so no note under the 2014 list.
assert.deepEqual(rows['2014'].map(r=>r.nome),rows['2024'].map(r=>r.nome));
assert.deepEqual(conditionsOnly2024(),[]);
// Every row opens an existing condition page of its own edition (generated at build time).
const ids2024=new Set(data2024.map(e=>e.id)),ids2014=new Set(data2014.map(e=>e.id));
for(const r of rows['2024'])assert.ok(ids2024.has(r.href.replace('/manuale/','')),r.href);
for(const r of rows['2014'])assert.ok(ids2014.has(r.href.replace('/manuale/','')),r.href);
assert.ok(rows['2014'].every(r=>r.href.endsWith('-2014')));
// The light rows carry names, addresses and the id of the condition only.
// The id is the condition in /admin/contenuti/condizioni («Modifica» pencil of the administrator).
for(const r of [...rows['2024'],...rows['2014']]){assert.deepEqual(Object.keys(r).sort(),['href','id','nome']);assert.equal(r.href,`/manuale/${r.id}`);}
// Compendio: fourth tile of «Regole e oggetti» after Oggetti magici, the same style as the others (no «nuovo» label).
const compendio=fs.readFileSync('app/compendio/page.tsx','utf8');
assert.deepEqual([...compendio.matchAll(/href: "([^"]+)"/g)].map(m=>m[1]),['/classi','/equipaggiamento','/avanzamento','/oggetti-magici','/compendio/condizioni']);
assert.ok(compendio.includes('text: "Accecato, Avvelenato, Spaventato…"'));
assert.ok(!/nuovo|NUOVO/.test(compendio+fs.readFileSync('components/section-tiles.tsx','utf8')));
// Offline: the list and the condition pages are public pages of the service worker.
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
const publicPage=new RegExp(sw.match(/const PUBLIC_PAGE = \/(.*)\/;/)[1]);
for(const p of ['/compendio','/compendio/condizioni',...rows['2024'].map(r=>r.href),...rows['2014'].map(r=>r.href)])assert.ok(publicPage.test(p),p);
assert.ok(!publicPage.test('/compendio/altro'));
console.log('Conditions list: 15 conditions 2024 and 15 2014 from the data, links to existing pages, offline.');
