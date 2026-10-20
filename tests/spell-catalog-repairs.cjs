const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>id.startsWith('./')&&!id.endsWith('.json')?load(path.resolve(path.dirname(filename),id)+'.ts'):createRequire(filename)(id),mod,mod.exports);return mod.exports;
}
const {repairCatalogSpell,catalogRepairs}=load('lib/spell-catalog-repairs.ts');
const {parseLivello,slugify}=load('lib/spells-types.ts');
const srd=new Map(require('../lib/data/srd-italiano-5.2.1.json').spells.map(s=>[s.id,s]));
const original=new Map(require('../lib/data/original-descriptions-2024.json').spells.map(s=>[s.id,s]));
const seed=new Map();
for(const s of require('../lib/data/incantesimi_2024.json')){let id=slugify(s.nome_italiano);if(seed.has(id))id+='-2';seed.set(id,s);}
let repaired=0;
for(const [id,level] of Object.entries(catalogRepairs.livelli)){
 // The approved number is the one of the verified text (SRD 5.2.1 or original summary).
 const reference=srd.get(id)||original.get(id);
 assert.ok(reference,id);assert.equal(parseLivello(reference.livello).livello_num,level,id);
 // The unreadable starting value is repaired; school and classes stay as stored.
 const row={id,nome_italiano:seed.get(id).nome_italiano,livello:seed.get(id).livello};
 const before=parseLivello(row.livello),after=parseLivello(repairCatalogSpell(row).livello);
 assert.ok(before.livello_num<0||before.livello_num>9,`${id}: starts unreadable`);
 assert.equal(after.livello_num,level,id);assert.equal(after.scuola,before.scuola,id);assert.deepEqual(after.classi,before.classi,id);
 repaired++;
 // A readable level saved in the reserved area wins, even if different from the proposal.
 const edited={...row,nome_italiano:'Nome scelto',livello:`${before.scuola||'Abiurazione'} di ${level===9?8:level+1}° livello (mago)`};
 assert.strictEqual(repairCatalogSpell(edited),edited,`${id}: the database wins`);
}
assert.equal(repaired,42);
for(const [id,{da,a}] of Object.entries(catalogRepairs.nomi)){
 assert.equal(repairCatalogSpell({id,nome_italiano:da}).nome_italiano,a);
 const edited={id,nome_italiano:'Nome scelto nell’area riservata'};
 assert.strictEqual(repairCatalogSpell(edited),edited,`${id}: an edited name wins`);
}
const other={id:'palla-di-fuoco',nome_italiano:'VELENI',livello:'Invocazione di livello (mago)'};
assert.strictEqual(repairCatalogSpell(other),other,'only the approved IDs are repaired');
console.log(`Catalog repairs: ${repaired} unreadable levels and ${Object.keys(catalogRepairs.nomi).length} damaged names repaired only while still damaged.`);
