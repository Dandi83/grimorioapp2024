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
const data=JSON.parse(fs.readFileSync('lib/data/srd-adventuring-gear-5.1-it.json','utf8'));
const g14=load('lib/adventuring-gear-2014.ts');
const ed=load('lib/adventuring-gear-editions.ts');
const crypto=require('node:crypto');

// The transcribed table equals the table of the request, row by row: group, name, cost, weight.
const request=fs.readFileSync('tests/fixtures/gear-2014-request.txt','utf8').trim().split('\n').map(line=>{
 const m=/^(?:\[(.+?)\] )?(.+?)(\*)? · (.+?) · (.+?)(?: → 2024: (.+))?$/.exec(line);assert.ok(m,line);
 return {gruppo:m[1]??null,nome:m[2],testo:!!m[3],costo:m[4],peso:m[5],a2024:m[6]};
});
assert.equal(request.length,99);assert.equal(data.tabella.length,99);
request.forEach((row,i)=>{const got=data.tabella[i];
 assert.deepEqual({gruppo:got.gruppo,nome:got.nome,costo:got.costo,peso:got.peso},{gruppo:row.gruppo,nome:row.nome,costo:row.costo,peso:row.peso},`row ${i+1}`);
 assert.equal(got.sourceSha256,crypto.createHash('sha256').update(got.sourceText).digest('hex'));});
for(const row of data.tabella){assert.ok(row.nome.trim()&&row.costo.trim()&&row.peso.trim(),row.nome);}
// Rows with a description: exactly the starred rows of the request (40).
assert.deepEqual(g14.gear2014TextMatches().conTesto.sort(),request.filter(r=>r.testo).map(r=>r.nome).sort());
assert.deepEqual(g14.gear2014TextMatches().testiSenzaRiga,[]);
assert.deepEqual(g14.gear2014TextMatches().capienzaSenzaRiga,[]);
for(const [label,v] of Object.entries(data.descrizioni))assert.equal(v.sourceSha256,crypto.createHash('sha256').update(v.testo).digest('hex'),label);
// "Corda" describes both ropes; Catena, Tenda and Razioni get the text of their short name.
const item=name=>g14.gear2014Items.find(i=>i.nome===name);
assert.equal(item('Corda di Canapa (15 metri)').paragraphs[0],item('Corda di Seta (15 metri)').paragraphs[0]);
for(const name of ['Catena (3 metri)','Tenda per due persone','Razioni (1 giornata)'])assert.ok(item(name).paragraphs[0].length>40,name);
// Groups: their rows in one item; Munizioni has only the table.
assert.deepEqual(g14.gear2014Items.filter(i=>i.gruppo).map(i=>`${i.nome}:${i.righe.length}`),['Focus arcano:5','Focus druidico:4','Munizioni:4','Simbolo sacro:3']);
assert.equal(item('Munizioni').paragraphs.length,0);
assert.ok(item('Focus arcano').paragraphs[0].startsWith('Un focus arcano'));
// Packs: 7, with the 2014 prices.
assert.deepEqual(g14.gear2014Items.filter(i=>i.dotazione).map(i=>`${i.nome} ${i.costo}`),
 ['Dotazione da avventuriero 12 mo','Dotazione da diplomatico 39 mo','Dotazione da esploratore 10 mo','Dotazione da intrattenitore 40 mo','Dotazione da sacerdote 19 mo','Dotazione da scassinatore 16 mo','Dotazione da studioso 40 mo']);
// Capacity of containers (p. 77-78) on their items.
assert.equal(item('Ampolla o boccale').capienza,'0,5 litri liquidi');
assert.equal(item('Bottiglia di Vetro').capienza,'0,75 litri liquidi');
assert.ok(item('Zaino').capienzaNota.startsWith('Un personaggio può anche legare'));
assert.equal(data.capienza.righe.length,13);
// Display-only fixes of evident typos; the transcription keeps the printed text.
assert.ok(data.descrizioni['Attrezzi da scalatore'].testo.includes('dal quel punto'));
assert.ok(item('Attrezzi da scalatore').paragraphs.join(' ').includes('da quel punto'));
assert.ok(item("Fuoco dell'alchimista (ampolla)").paragraphs.join(' ').includes("fino a 6 metri"));

// Editions: pairs only by name (case and brackets ignored) or by the request's list.
const E=ed.gearEntries;
const both=E.filter(e=>e.editions['2014']&&e.editions['2024']),only14=E.filter(e=>!e.editions['2024']),only24=E.filter(e=>!e.editions['2014']);
assert.deepEqual([both.length,only14.length,only24.length,E.filter(e=>e.id2014).length],[77,17,4,13]);
for(const row of request.filter(r=>r.a2024)){const e=E.find(x=>x.editions['2014']?.nome===row.nome);assert.equal(e.editions['2024'].nome,row.a2024,row.nome);}
assert.deepEqual(only24.map(e=>e.editions['2024'].nome).sort(),['Mappa','Pergamena magica','Rete','Spago']);
// Addresses: 2024 keeps its own; a different 2014 name has its own, opening the 2014 edition.
assert.deepEqual(ed.findGearEntry('cesto').edition,'2024');
assert.deepEqual(ed.findGearEntry('canestro').edition,'2014');
assert.equal(ed.findGearEntry('canestro').entry,ed.findGearEntry('cesto').entry);
assert.equal(ed.findGearEntry('acido').edition,undefined);
assert.ok(ed.findGearEntry('abaco').entry.editions['2014']&&!ed.findGearEntry('abaco').entry.editions['2024']);
const ids=E.flatMap(e=>[e.id,...(e.id2014?[e.id2014]:[])]);assert.equal(new Set(ids).size,ids.length);
// "2014 → 2024" only where something changes, computed from the data.
const changed=both.filter(e=>ed.compareGear(e).length);
assert.ok(changed.every(e=>e.id2014||ed.compareGear(e).every(r=>r.label!=='Nome')));
assert.deepEqual(ed.compareGear(E.find(e=>e.id==='corda')).map(r=>r.label),['Nome','Peso']);
assert.deepEqual(ed.compareGear(E.find(e=>e.id==='dotazione-da-sacerdote')),[{label:'Costo',before:'19 mo',after:'33 mo'}]);
assert.deepEqual(ed.compareGear(E.find(e=>e.id==='acido')),[]);
assert.deepEqual(ed.compareGear(only14[0]),[]);
// List rows: no descriptions, search finds rope and crowbar in both editions.
const rows=ed.gearListRows();
assert.equal(rows['2014'].reduce((n,r)=>n+(r.righe?.length??1),0),106);
assert.equal(rows['2024'].length,81);
const fold=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
for(const edition of ['2014','2024'])for(const q of ['corda','piede di porco'])assert.ok(rows[edition].some(r=>fold(r.nome).includes(q)),`${edition} ${q}`);
assert.equal(rows['2014'].filter(r=>fold(r.nome).includes('corda')).length,2);
assert.ok(!JSON.stringify(rows).includes(data.descrizioni['Corda'].testo.slice(0,40)));
assert.equal(rows['2014'].find(r=>r.nome==='Canestro').href,'/equipaggiamento/avventura/canestro');
assert.equal(rows['2024'].find(r=>r.nome==='Cesto').href,'/equipaggiamento/avventura/cesto');
console.log(`Adventuring gear 2014: 99 rows equal to the request, 40 descriptions on the starred rows, 4 groups, 7 packs, capacity; editions ${both.length} shared, ${only14.length} only 2014, ${only24.length} only 2024, ${E.filter(e=>e.id2014).length} renamed; ${changed.length} with a 2014 → 2024 table.`);
