const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
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
const data=JSON.parse(fs.readFileSync('lib/data/srd-tools-5.1-it.json','utf8'));
const t24=load('lib/tools.ts'),t14=load('lib/tools-2014.ts'),ed=load('lib/tools-editions.ts');

// 2014, transcribed from the PDF: 35 rows, no empty name or cost, no vehicles.
assert.equal(data.tabella.length,35);
for(const row of data.tabella){assert.ok(row.nome.trim()&&row.costo.trim()&&row.peso.trim(),row.nome);
 assert.equal(row.sourceSha256,crypto.createHash('sha256').update(row.sourceText).digest('hex'));}
assert.ok(!data.tabella.some(row=>/Veicoli/.test(row.nome)));
const group=g=>t14.tools2014.filter(tool=>tool.gruppo===g).map(tool=>tool.nome);
assert.deepEqual(group('musicali'),['Ciaramella','Cornamusa','Corno','Dulcimer','Flauto','Flauto di pan','Lira','Liuto','Tamburo','Viola']);
assert.deepEqual(group('giochi'),['Dadi','Mazzo di carte']);
assert.equal(group('artigiano').length,19);
assert.deepEqual(group('altri'),['Arnesi da scasso','Borsa da erborista','Sostanze da avvelenatore','Strumenti da navigatore']);
assert.deepEqual(Object.keys(data.descrizioni).sort(),['Arnesi da falsario','Arnesi da scasso','Borsa da erborista','Giochi','Sostanze da avvelenatore','Strumenti da artigiano','Strumenti da navigatore','Strumenti musicali','Trucchi per il camuffamento']);
for(const [k,v] of Object.entries(data.descrizioni))assert.equal(v.sourceSha256,crypto.createHash('sha256').update(v.testo).digest('hex'),k);
// Group texts are shown once, not on every tool.
assert.equal(t14.tools2014.find(tool=>tool.nome==='Liuto').paragraphs.length,0);
assert.ok(t14.tools2014GroupText.artigiano.startsWith('Questi strumenti speciali'));
assert.ok(t14.tools2014.find(tool=>tool.nome==='Arnesi da scasso').paragraphs[0].startsWith('Questo set di arnesi'));

// 2024, built from the manual: 17 artisan's tools (the manual has 17), 8 other tools, every card complete.
assert.equal(t24.tools2024.filter(tool=>tool.gruppo==='artigiano').length,17);
assert.deepEqual(t24.tools2024.filter(tool=>tool.gruppo==='altri').map(tool=>tool.nome),['Arnesi da falsario','Arnesi da scasso','Borsa da erborista','Gioco','Sostanze da avvelenatore','Strumenti da navigatore','Strumento musicale','Trucchi per il camuffamento']);
const manual=JSON.parse(fs.readFileSync('lib/data/srd-manual-5.2.1-it.json','utf8')).entries.find(e=>e.id===t24.TOOLS_ENTRY_ID);
assert.equal(t24.tools2024.length,manual.blocks.filter(b=>b.kind==='heading'&&/\(.*\)$/.test(b.text)).length);
for(const tool of t24.tools2024){
 assert.ok(tool.caratteristica&&tool.peso&&tool.utilizzo&&tool.prezzo,tool.nome);
 assert.match(tool.caratteristica,/^(Forza|Destrezza|Costituzione|Intelligenza|Saggezza|Carisma)$/,tool.nome);
 assert.match(tool.utilizzo,/\(CD \d+\)/,tool.nome);
 assert.ok(!/-\s|\s-|\n/.test(tool.utilizzo+tool.creazione.join(' ')),tool.nome);}
// Cards cut by a page break are joined.
assert.ok(t24.tools2024.find(t=>t.nome==='Strumenti da conciatore').creazione.includes('otre'));
assert.deepEqual(t24.tools2024.find(t=>t.nome==='Strumenti da soffiatore').creazione,['bottiglia di vetro',"lente d'ingrandimento",'cannocchiale','fiala']);
assert.ok(t24.tools2024.find(t=>t.nome==='Strumenti da falegname').creazione.includes('torcia'));
assert.equal(t24.tools2024.find(t=>t.nome==='Strumenti da fabbro').creazione[0],'Arma da mischia (eccetto randello, randello pesante, bastone ferrato e frusta)');
assert.deepEqual(t24.tools2024.find(t=>t.nome==='Gioco').varianti.map(v=>`${v.nome} ${v.costo}`),['Dadi 1 ma','scacchi dei draghi 1 mo','carte da gioco 5 ma','Tre draghi al buio 1 mo']);
assert.equal(t24.tools2024.find(t=>t.nome==='Strumento musicale').varianti.length,10);
assert.deepEqual(t24.tools2024.find(t=>t.nome==='Strumento musicale').varianti.find(v=>v.nome==='liuto'),{nome:'liuto',costo:'35 mo',peso:'1 kg'});
assert.equal(t24.toolsSection('Competenza negli strumenti').length,2);

// Editions: by name; 2014 games and instruments linked to a 2024 variant with the same name.
const E=ed.toolEntries;
const both=E.filter(e=>e.editions['2014']&&e.editions['2024']),only14=E.filter(e=>!e.editions['2024']),only24=E.filter(e=>!e.editions['2014']);
assert.deepEqual([both.length,only14.length,only24.length],[23,12,2]);
assert.equal(only14.filter(e=>e.variante).length,11);
assert.equal(ed.getToolEntry('liuto').variante.tool.nome,'Strumento musicale');
assert.equal(ed.getToolEntry('dadi').variante.tool.nome,'Gioco');
assert.equal(ed.getToolEntry('mazzo-di-carte').variante,undefined,'"carte da gioco" in 2024: different name, not linked');
assert.ok(ed.getToolEntry('scorte-da-alchimista').editions['2014']&&ed.getToolEntry('scorte-da-alchimista').editions['2024']);
assert.equal(new Set(E.map(e=>e.id)).size,E.length);
// No cost or weight changes between the editions: no "2014 → 2024" table.
assert.deepEqual(E.filter(e=>ed.compareTool(e).length).map(e=>e.id),[]);
// Search by name, list rows without texts.
const rows=ed.toolListRows();
const fold=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
assert.deepEqual(rows['2014'].filter(r=>fold(r.nome).includes('liuto')).map(r=>r.nome),['Liuto']);
for(const edition of ['2014','2024'])assert.deepEqual(rows[edition].filter(r=>fold(r.nome).includes('scasso')).map(r=>r.nome),['Arnesi da scasso'],edition);
assert.ok(!JSON.stringify(rows).includes(data.descrizioni['Arnesi da scasso'].testo.slice(0,30)));
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
const pattern=new RegExp(sw.match(/const PUBLIC_PAGE = (\/.*\/);/)[1].slice(1,-1));
for(const p of ['/equipaggiamento/strumenti','/equipaggiamento/strumenti/liuto'])assert.ok(pattern.test(p),p);
console.log(`Tools: 2014 35 rows (19 artisan, 2 games, 10 instruments, 4 others), 9 texts; 2024 17 artisan + 8 others with complete cards; ${both.length} shared, ${only14.length} only 2014 (11 linked to a 2024 variant), ${only24.length} only 2024, no cost or weight change.`);
