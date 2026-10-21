const assert=require('node:assert/strict');
const crypto=require('node:crypto');
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
const types=load('lib/magic-items-types.ts');
const lib=load('lib/magic-items.ts');
const raw={'2024':JSON.parse(fs.readFileSync('lib/data/srd-magic-items-5.2.1-it.json','utf8')),'2014':JSON.parse(fs.readFileSync('lib/data/srd-magic-items-5.1-it.json','utf8'))};
const repairs=JSON.parse(fs.readFileSync('lib/data/magic-items-repairs-20261021.json','utf8'));

// Counts of the request, the PDFs and their fingerprints.
assert.equal(lib.magicItems['2024'].length,258);
assert.equal(lib.magicItems['2014'].length,240);
assert.equal(raw['2024'].sourceSha256,'a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718');
assert.equal(raw['2014'].sourceSha256,'2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7');
// Every printed item keeps its fingerprint: name, type line and blocks as transcribed.
for(const edition of ['2024','2014'])for(const item of raw[edition].oggetti)
 assert.equal(crypto.createHash('sha256').update(JSON.stringify([item.nome,item.rigaTipo,item.blocchi])).digest('hex'),item.sourceSha256,`${edition} ${item.nome}`);
// First and last items, and the cut before the chapters after the list.
assert.deepEqual(raw['2024'].oggetti.map(o=>o.nome).slice(0,2),['Ali del volo','Ammazzadraghi']);
assert.equal(raw['2024'].oggetti.at(-1).nome,'Zainetto pratico');
assert.deepEqual(raw['2014'].oggetti.slice(-2).map(o=>o.nome),['Zainetto pratico','Sfera della stirpe dei draghi']);
for(const edition of ['2024','2014'])for(const item of raw[edition].oggetti){
 const text=JSON.stringify(item.blocchi);
 assert.ok(!/senzient/i.test(item.nome),item.nome);
 assert.ok(!/Oggetti magici senzienti|Descrittori/.test(text),`${edition} ${item.nome}: text of the next chapter`);
}

// No empty name, type or rarity; types, rarities and attunement read from the printed line.
for(const edition of ['2024','2014']){
 const ids=new Set();
 for(const item of lib.magicItems[edition]){
  assert.ok(item.nome&&item.tipo&&item.rarita,`${edition} ${item.nome}`);
  assert.ok(types.MAGIC_ITEM_TYPES.includes(item.tipo),item.tipo);
  assert.ok(item.rigaTipo.startsWith(item.tipo),item.rigaTipo);
  assert.equal(item.sintonia,item.rigaTipo.includes('(richiede sintonia'),item.nome);
  assert.ok(types.rarityCategories(item.rarita).length,`${edition} ${item.nome}: ${item.rarita}`);
  assert.ok(item.blocchi.length&&item.blocchi.every(b=>b.kind==='table'||b.kind==='statblock'||b.text),`${edition} ${item.nome}: empty block`);
  assert.ok(!ids.has(item.id),item.id);ids.add(item.id);
 }
}
const byName=(edition,nome)=>lib.magicItems[edition].find(item=>item.nome===nome);
assert.deepEqual(types.rarityCategories('non comune (+1), rara (+2) o molto rara (+3)'),['Non comune','Raro','Molto raro']);
assert.deepEqual(types.rarityCategories('raro (argento o ottone), molto raro (bronzo) o leggendario (ferro)'),['Raro','Molto raro','Leggendario']);
assert.deepEqual(types.rarityCategories('rarità variabile'),['Variabile']);
assert.deepEqual(types.rarityCategories('manufatto'),['Manufatto']);
assert.equal(byName('2024','Ammazzadraghi').rigaTipo,'Arma (qualsiasi arma semplice o da guerra), rara');
assert.equal(byName('2024','Bacchetta del mago da guerra +1, +2 o +3').requisitoSintonia,'con un incantatore');
assert.equal(byName('2024','Martello nanico da lancio').requisitoSintonia,'con un nano o con una creatura in sintonia con una cintura nanica');
assert.equal(byName('2024','Sfera del drago').rarita,'manufatto');
// Counts per type and per rarity printed in the two lists (read once from the PDF, kept as a check).
const count=(edition,key)=>lib.magicItems[edition].reduce((all,item)=>{all[item[key]]=(all[item[key]]||0)+1;return all;},{});
assert.deepEqual(count('2024','tipo'),{'Oggetto meraviglioso':127,Arma:33,Pozione:24,Anello:22,Armatura:19,Bacchetta:13,Bastone:12,Verga:7,Pergamena:1});
assert.deepEqual(count('2014','tipo'),{'Oggetto meraviglioso':120,Arma:29,Anello:22,Pozione:20,Armatura:17,Bacchetta:13,Bastone:12,Verga:6,Pergamena:1});
assert.equal(lib.magicItems['2024'].filter(i=>i.sintonia).length,140);
assert.equal(lib.magicItems['2014'].filter(i=>i.sintonia).length,125);

// Display-only repairs: each printed text found once, shown corrected, the data left as printed.
for(const repair of repairs.sostituzioni){
 const printed=raw[repair.edizione].oggetti.find(item=>item.id===repair.id);
 assert.equal(JSON.stringify(printed).split(repair.prima).length,2,repair.id);
 assert.equal(printed.pagina<=repair.pagina&&repair.pagina<=printed.pagine.at(-1),true,repair.id);
 const {nomeStampato,...shown}=lib.magicItems[repair.edizione].find(item=>item.id===repair.id);
 assert.ok(JSON.stringify(shown).includes(repair.dopo)&&!JSON.stringify(shown).includes(repair.prima),repair.id);
 if(nomeStampato)assert.equal(nomeStampato,repair.prima);
}
assert.equal(byName('2014','Armatura demoniaca').id,'armastura-demoniaca');

// Search and combined filters.
const rows={'2024':lib.magicItemListRows('2024'),'2014':lib.magicItemListRows('2014')};
const none=types.NO_MAGIC_ITEM_FILTERS;
for(const edition of ['2024','2014']){
 assert.equal(types.searchMagicItems(rows[edition],'',none).length,rows[edition].length);
 for(const word of ['spada','pozione']){
  const found=types.searchMagicItems(rows[edition],word,none);
  assert.ok(found.length>=3,`${edition} ${word}`);
  assert.ok(found.every(row=>row.nome.toLowerCase().includes(word)),`${edition} ${word}`);
 }
 // Sorted A–Z.
 const names=rows[edition].map(r=>r.nome);
 assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'it')));
}
assert.ok(types.searchMagicItems(rows['2024'],'spada',none).some(r=>r.nome==='Spada vorpal'));
assert.ok(types.searchMagicItems(rows['2024'],'POZIONE di invisibilita',none).some(r=>r.nome==='Pozione di invisibilità'),'accents and case ignored');
assert.ok(types.searchMagicItems(rows['2014'],'pozione',none).some(r=>r.nome==="Pozione dell'invisibilità"));
const combined={rarita:['Raro','Molto raro'],tipo:['Anello'],sintonia:['Richiesta']};
const rings=types.searchMagicItems(rows['2024'],'',combined);
assert.deepEqual(rings.map(r=>r.nome),rows['2024'].filter(r=>r.tipo==='Anello'&&r.sintonia&&r.rarita_categorie.some(c=>c==='Raro'||c==='Molto raro')).map(r=>r.nome));
assert.ok(rings.some(r=>r.nome==='Anello di rigenerazione')&&rings.length>=5);
assert.ok(rings.every(r=>r.tipo==='Anello'&&r.sintonia));
assert.equal(types.searchMagicItems(rows['2024'],'anello',combined).length,rings.length);
assert.equal(types.searchMagicItems(rows['2024'],'',{rarita:[],tipo:[],sintonia:['Richiesta','Non richiesta']}).length,258);
assert.equal(types.searchMagicItems(rows['2024'],'',{rarita:['Variabile'],tipo:[],sintonia:[]}).length,7);
// Filters in the address, other parameters kept.
const filters=types.magicItemFiltersFromParams(new URLSearchParams('rarita=raro,molto-raro&tipo=oggetto-meraviglioso,anello&sintonia=non-richiesta&edizione=2014'));
assert.deepEqual(filters,{rarita:['Raro','Molto raro'],tipo:['Oggetto meraviglioso','Anello'],sintonia:['Non richiesta']});
assert.equal(types.magicItemSearch('?edizione=2014',filters,'spada'),'?edizione=2014&rarita=raro,molto-raro&tipo=oggetto-meraviglioso,anello&sintonia=non-richiesta&q=spada');
assert.equal(types.magicItemSearch('?rarita=raro',none,''),'');
// The light rows carry no item text.
for(const row of rows['2024'])assert.deepEqual(Object.keys(row).sort(),['href','id','nome','rarita','rarita_categorie','sintonia','tipo']);

// Tables: the dice ranges of every column cover 1 to N without gaps; tables printed in pieces are one table.
const tables=edition=>lib.magicItems[edition].flatMap(item=>item.blocchi.filter(b=>b.kind==='table').map(table=>({item:item.nome,table})));
const value=(text,die)=>{const n=parseInt(text,10);return text==='00'&&die===100?100:n;};
for(const edition of ['2024','2014'])for(const {item,table} of tables(edition)){
 table.header.forEach((column,c)=>{
  const die=column.match(/^1?d(\d+)/);if(!die)return;
  const sides=+die[1];let next=1;
  for(const row of table.rows){
   const cell=row[c];if(cell==='—')continue;
   const m=cell.match(/^(\d+)(?:–(\d+))?$/);assert.ok(m,`${edition} ${item}: ${cell}`);
   assert.equal(value(m[1],sides),next,`${edition} ${item}: ${cell} after ${next-1}`);
   next=value(m[2]??m[1],sides)+1;
  }
  assert.equal(next,sides+1,`${edition} ${item}: column ${column} ends at ${next-1}`);
 });
}
const rowsOf=(edition,nome,title)=>byName(edition,nome).blocchi.filter(b=>b.kind==='table'&&(!title||b.title===title)).map(b=>b.rows.length);
assert.deepEqual(rowsOf('2024','Amuleto dei piani'),[5]);
assert.deepEqual(rowsOf('2024','Bacchetta delle meraviglie'),[18]);
assert.deepEqual(rowsOf('2024','Mazzo delle illusioni'),[33]);
assert.deepEqual(rowsOf('2024','Mazzo delle meraviglie'),[22]);
assert.deepEqual(rowsOf('2024','Apparatus del granchio'),[10]);
assert.deepEqual(rowsOf('2024','Armatura della resistenza'),[10]);
assert.deepEqual(rowsOf('2014','Ampolla di ferro'),[20]);
assert.deepEqual(rowsOf('2014','Bacchetta delle meraviglie'),[22]);
assert.deepEqual(rowsOf('2014','Mazzo delle illusioni'),[33]);
assert.deepEqual(rowsOf('2014','Apparatus del Granchio'),[10]);
// The table printed among "Arco del giuramento" and "Arco energetico" belongs to the Apparatus del granchio.
assert.equal(byName('2024','Apparatus del granchio').blocchi.find(b=>b.kind==='table').title,"Leve dell'apparatus del granchio");
for(const nome of ['Arco del giuramento','Arco energetico'])assert.ok(!byName('2024',nome).blocchi.some(b=>b.kind==='table'),nome);
assert.deepEqual(byName('2024','Collana del rosario').blocchi.filter(b=>b.kind==='table').map(b=>b.header),[['1d20','Perla','Incantesimo']]);
assert.ok(!byName('2024','Corazza di scaglie di drago').blocchi.some(b=>b.kind==='table'&&b.header.includes('Perla')));
// Zainetto pratico prints no table in either edition.
assert.deepEqual(rowsOf('2024','Zainetto pratico'),[]);assert.deepEqual(rowsOf('2014','Zainetto pratico'),[]);
// Stat blocks in one piece, small caps read as printed.
const avatar=byName('2024','Mazzo delle meraviglie').blocchi.filter(b=>b.kind==='statblock');
assert.equal(avatar.length,1);assert.equal(avatar[0].lines[0],'**Avatar della morte**');
assert.ok(avatar[0].lines.some(l=>l.includes('**Sag** 16')));
// Printed asterisks stay asterisks: "Visir*" is a footnote mark, not italics.
assert.ok(byName('2014','Mazzo delle meraviglie').blocchi.find(b=>b.kind==='table').rows.some(r=>r[1]==='Visir\\*'));

// Offline: the list and every sheet are public pages of the service worker.
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
const publicPage=new RegExp(sw.match(/const PUBLIC_PAGE = \/(.*)\/;/)[1]);
for(const page of ['/oggetti-magici',...lib.magicItems['2024'].map(i=>lib.magicItemHref(i.id))])assert.ok(publicPage.test(page),page);
assert.ok(!publicPage.test('/oggetti-magici/a/b'));
// The section is the third tile of the Compendio, the bottom bar keeps its five entries.
const compendio=fs.readFileSync('app/compendio/page.tsx','utf8');
assert.deepEqual([...compendio.matchAll(/href: "([^"]+)"/g)].map(m=>m[1]).slice(0,3),['/equipaggiamento','/avanzamento','/oggetti-magici']);
assert.ok(compendio.includes('text: "Elenco A–Z con rarità e sintonia"'));
const nav=fs.readFileSync('components/bottom-nav.tsx','utf8');
assert.equal([...nav.matchAll(/href: "/g)].length,5);
assert.ok(nav.includes('p.startsWith("/oggetti-magici")'));
// The rules on magic items are a link to the manual entry, only where the manual is published.
assert.equal(lib.magicItemsRulesHref('preview'),'/manuale/equipaggiamento-oggetti-magici');
assert.equal(lib.magicItemsRulesHref('production'),undefined);
const manual=JSON.parse(fs.readFileSync('lib/data/srd-manual-5.2.1-it.json','utf8'));
assert.ok(manual.entries.some(e=>e.id==='equipaggiamento-oggetti-magici'));

// Editions: 239 pairs, 19 items only in 2024, 1 only in 2014; the 14 renamed items by Daniele's list.
const editions=load('lib/magic-items-editions.ts');
const entries=editions.magicItemEntries;
const both=entries.filter(e=>e.editions['2014']&&e.editions['2024']);
assert.equal(both.length,239);
assert.deepEqual(entries.filter(e=>!e.editions['2014']).map(e=>e.editions['2024'].nome).sort((a,b)=>a.localeCompare(b,'it')),
 ['Arco energetico',"Arma dell'avvertimento","Bastone ferrato dell'acrobata",'Cappello dei molti incantesimi','Elisir della salute','Guanti ladreschi',"Mantello dell'invisibilità",'Perla nutriente','Pietre parlanti','Pozione di invulnerabilità','Pozione di longevità','Pozione di vitalità','Randello pesante del tuono','Scudo del cavaliere','Scudo sentinella','Sfera di cristallo della lettura del pensiero','Sfera di cristallo della telepatia','Sfera di cristallo della visione del vero','Verga della resurrezione']);
assert.deepEqual(entries.filter(e=>!e.editions['2024']).map(e=>e.editions['2014'].nome),['Unguento rigenerativo']);
const renamed=Object.entries(repairs.abbinamenti2014);
assert.equal(renamed.length,14);
for(const [old,now] of renamed){
 const entry=both.find(e=>(e.editions['2014'].nomeStampato??e.editions['2014'].nome)===old);
 assert.ok(entry,old);assert.equal(entry.editions['2024'].nome,now,old);
}
// Own 2014 addresses only for different names, never colliding with a 2024 address.
const ids2014=entries.filter(e=>e.id2014).map(e=>e.id2014);
assert.equal(ids2014.length,13,'13 of the 14 (Armastura is shown as Armatura, same name)');
for(const id of ids2014)assert.ok(!entries.some(e=>e.id===id),id);
assert.equal(editions.findMagicItemEntry('piuma-magica').edition,'2014');
assert.equal(editions.findMagicItemEntry('piuma-di-quaal').edition,'2024');
assert.equal(editions.findMagicItemEntry('ali-del-volo').edition,undefined);
assert.equal(editions.magicItemEntryHref(editions.findMagicItemEntry('piuma-di-quaal').entry,'2014'),'/oggetti-magici/piuma-magica');
assert.equal(editions.magicItemEntryHref(editions.findMagicItemEntry('unguento-rigenerativo').entry,'2014'),'/oggetti-magici/unguento-rigenerativo');
// "2014 → 2024" from the data.
const changes=nome=>editions.compareMagicItem(both.find(e=>e.editions['2024'].nome===nome));
assert.deepEqual(changes('Pozione di invisibilità'),[{label:'Nome',before:"Pozione dell'invisibilità",after:'Pozione di invisibilità'},{label:'Rarità',before:'Molto rara',after:'Rara'}]);
assert.deepEqual(changes('Piuma di Quaal').find(r=>r.label==='Rarità'),{label:'Rarità',before:'Raro',after:'Rarità variabile'});
assert.ok(changes('Sfera di cristallo').some(r=>r.label==='Rarità'));
// Corno del Valhalla: only the order of the printed metals changes, so no row.
assert.notEqual(byName('2014','Corno del Valhalla').rarita,byName('2024','Corno del Valhalla').rarita);
assert.deepEqual(changes('Corno del Valhalla'),[]);
const attunement=both.filter(e=>editions.compareMagicItem(e).some(r=>r.label==='Sintonia')).map(e=>e.editions['2024'].nome);
assert.equal(attunement.length,16);
for(const nome of ['Scopa volante','Talismano della salute','Fortezza istantanea','Martello dei fulmini'])
 assert.deepEqual(changes(nome).find(r=>r.label==='Sintonia'),{label:'Sintonia',before:'Non richiesta',after:'Richiesta'},nome);
for(const nome of ['Anello di resistenza',"Lenti dell'aquila"])assert.equal(changes(nome).find(r=>r.label==='Sintonia').after,'Non richiesta',nome);
assert.deepEqual(changes('Martello nanico da lancio').find(r=>r.label==='Sintonia'),{label:'Sintonia',before:'Richiesta con un nano',after:'Richiesta con un nano o con una creatura in sintonia con una cintura nanica'});
assert.deepEqual(changes('Ali del volo'),[]);
// 2014 Sfera di cristallo also points to the three 2024 crystal balls.
assert.deepEqual(editions.seeAlso(both.find(e=>e.editions['2014'].nome==='Sfera di cristallo')).map(e=>e.id),['sfera-di-cristallo-della-lettura-del-pensiero','sfera-di-cristallo-della-telepatia','sfera-di-cristallo-della-visione-del-vero']);
// List rows per edition with the right addresses.
const editionRows=editions.magicItemEditionRows();
assert.equal(editionRows['2014'].length,240);assert.equal(editionRows['2024'].length,258);
assert.equal(editionRows['2014'].find(r=>r.nome==='Piuma magica').href,'/oggetti-magici/piuma-magica');
assert.equal(editionRows['2014'].find(r=>r.nome==='Ali del volo').href,'/oggetti-magici/ali-del-volo');
for(const word of ['spada','pozione'])assert.ok(types.searchMagicItems(editionRows['2014'],word,none).length>=3);

require('./magic-items-fidelity.cjs');
console.log('magic items: ok');
