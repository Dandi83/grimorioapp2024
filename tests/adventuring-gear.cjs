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
const g=load('lib/adventuring-gear.ts');
const manual=JSON.parse(fs.readFileSync('lib/data/srd-manual-5.2.1-it.json','utf8'));
const entry=manual.entries.find(e=>e.id===g.GEAR_ENTRY_ID);
const headings=entry.blocks.filter(b=>b.kind==='heading');

// One item per heading of the data, unique ids, no empty name, price from every heading.
assert.equal(g.gearItems.length,headings.length);
assert.equal(g.gearItems.length,81);
assert.equal(new Set(g.gearItems.map(i=>i.id)).size,g.gearItems.length);
for(const item of g.gearItems){
 assert.ok(item.nome.trim(),'empty name');
 assert.ok(item.prezzo.trim(),`${item.nome}: price missing`);
 assert.ok(headings.some(h=>h.text.trim()===`${item.nome} (${item.prezzo})`),`${item.nome}: heading`);
 assert.ok(item.peso,`${item.nome}: weight missing`);
 assert.ok(item.paragraphs.length&&item.paragraphs.every(p=>p.length>10),`${item.nome}: description`);
}
// Every row of the weight table matches a heading and its price; repairs are display-only.
assert.deepEqual(g.gearWeightMismatches(),{senzaTitolo:[],senzaPeso:[]});
assert.deepEqual(g.gearPriceMismatches(),[]);
assert.equal(g.getGearItem('campana').peso,'—');
assert.equal(g.getGearItem('otre').peso,'2,5 kg (pieno)');
assert.equal(g.getGearItem('cannocchiale').peso,'0,5 kg');
assert.equal(g.getGearItem('cannocchiale').prezzo,'1.000 mo');
assert.ok(g.getGearItem('dotazione-da-intrattenitore').paragraphs[0].includes('contiene i seguenti oggetti'));
assert.ok(JSON.stringify(entry).includes('seguenti i oggetti'),'the source keeps its typo');
// Tables printed under an item, as structured rows.
assert.deepEqual(g.getGearItem('munizioni').tables[0].columns,['Tipo','Quantità','Conservazione','Peso','Costo']);
assert.deepEqual(g.getGearItem('munizioni').tables[0].rows.map(r=>r[0]),['Aghi','Frecce','Proiettili, arma da fuoco','Proiettili, fionda','Quadrelli']);
assert.deepEqual(g.getGearItem('focus-arcano').tables[0].rows[1],['Bastone (anche bastone ferrato)','2 kg','5 mo']);
assert.equal(g.getGearItem('simbolo-sacro').tables[0].rows.length,3);
assert.equal(g.getGearItem('focus-druidico').tables[0].rows.length,3);
// A paragraph cut by a page break is joined: no paragraph ends mid-sentence.
for(const item of g.gearItems)for(const p of item.paragraphs)assert.match(p,/[.:!?»)"]$/,`${item.nome}: ${p.slice(-40)}`);
// Packs: the seven "Dotazione da …" items.
assert.equal(g.gearItems.filter(i=>i.dotazione).length,7);
// Search by name: the list carries names, prices and weights only.
const fold=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const list=g.gearListItems();
for(const q of ['corda','piede di porco'])assert.ok(list.some(i=>fold(i.nome).includes(q)),q);
assert.ok(!JSON.stringify(list).includes(g.getGearItem('corda').paragraphs[0].slice(0,40)));
// Offline.
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
const pattern=new RegExp(sw.match(/const PUBLIC_PAGE = (\/.*\/);/)[1].slice(1,-1));
for(const p of ['/equipaggiamento/avventura','/equipaggiamento/avventura/corda'])assert.ok(pattern.test(p),p);
console.log(`Adventuring gear 2024: ${g.gearItems.length} items = ${headings.length} headings, prices and weights matched with the table, 4 linked tables, 7 packs, search, offline.`);
