const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const data=require('../lib/data/srd-spells-5.1-it.json');
const links=require('../lib/data/spell-edition-links.json').links;
const light=require('../lib/data/spell-reference-index-2014.json');
const monsters2014=require('../lib/data/srd-monsters-5.1-it.json').records.map(r=>r.monster);
function load(relative,deps={}){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id in deps)return deps[id];
  if(id.startsWith('@/')||id.startsWith('./')){
   const file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   for(const extension of ['.ts','.tsx'])if(fs.existsSync(file+extension))return load(file+extension,deps);
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const {parseLivello,slugify}=load('lib/spells-types.ts');
const ids2024=new Set([...require('../lib/data/srd-italiano-5.2.1.json').spells.map(s=>s.id),...require('../lib/data/incantesimi_2024.json').map(s=>slugify(s.nome_italiano))]);

// Records: 2014 addresses, source fingerprints, English identifier and rules fields read by the catalog.
assert.equal(data.document,'SRD 5.1');assert.equal(data.edition,'2014');
assert.equal(data.sourceSha256,'2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7');
assert.equal(data.records.length,data.blocks.reduce((sum,block)=>sum+block.count,0),'records match the published blocks');
const seen=new Set(),en=new Set();
for(const record of data.records){
 const s=record.spell;
 assert.ok(s.id.endsWith('-2014')&&!ids2024.has(s.id),`${s.id}: a 2014 address`);
 assert.ok(!seen.has(s.id),`${s.id}: no duplicate`);seen.add(s.id);
 assert.ok(/^[a-z0-9-]+$/.test(record.en)&&!en.has(record.en),`${s.id}: one English identifier`);en.add(record.en);
 assert.equal(crypto.createHash('sha256').update(record.sourceText).digest('hex'),record.sourceSha256,`${s.id}: source text fingerprint`);
 assert.ok(record.sourceText.startsWith(record.sourceName),`${s.id}: source starts with its name`);
 assert.equal(s.nome_italiano,record.sourceName);
 const parsed=parseLivello(s.livello);
 assert.ok(parsed.livello_num>=0&&parsed.livello_num<=9&&parsed.scuola&&parsed.classi.length,`${s.id}: level, school and classes "${s.livello}"`);
 for(const key of ['tempo_di_lancio','gittata','componenti','durata','descrizione'])assert.ok(s[key],`${s.id}: ${key}`);
 assert.ok(!/<(?!\/?(?:strong|em|br|pre)>)/.test(s.descrizione),`${s.id}: only bold, italic, line breaks and tables`);
 assert.ok(!/livelli superiori\. <\/strong>/.test(s.descrizione),`${s.id}: no space inside bold`);
}
// The light index used by the creature sheets lists exactly the published spells.
assert.deepEqual(light.spells,data.records.map(r=>({id:r.spell.id,name:r.spell.nome_italiano})));
// Edition links follow the English identifier, never the name alone.
for(const [id,link] of Object.entries(links)){
 const record=data.records.find(r=>r.spell.id===id);
 assert.ok(record,`${id}: linked spell is published`);
 assert.equal(link.en,record.en,`${id}: same English identifier`);
 assert.ok(ids2024.has(link.id2024),`${id}: linked 2024 spell exists`);
}
assert.ok(data.records.some(r=>r.spell.id==='regressione-mentale-2014')&&!('regressione-mentale-2014' in links)&&!('punizione-marchiante-2014' in links),'no link without the same English identifier (approved 20/10/2026)');
// Blocks follow the PDF without gaps: each one starts right after the previous one.
let next=0;
for(const block of data.blocks){
 assert.equal(data.records[next].sourceName,block.from,`block ${block.block} starts where the previous one ended`);
 next+=block.count;
 assert.equal(data.records[next-1].sourceName,block.to,`block ${block.block} ends at ${block.to}`);
}
for(let i=1;i<data.records.length;i++)assert.ok(data.records[i].page>=data.records[i-1].page,`${data.records[i].spell.id}: PDF page order`);
// Final check (block 7): every spell of the PDF (pp. 129-222), once, with every English 2014 identifier once.
const english2014=fs.readFileSync(path.resolve('tests/fixtures/srd51-spells-en-index.json'),'utf8');
assert.equal(data.records.length,319,'all 319 spells of the SRD 5.1 are published');
assert.equal(new Set(data.records.map(r=>r.en)).size,319,'319 different English identifiers');
assert.deepEqual(data.records.map(r=>r.en).sort(),JSON.parse(english2014).sort(),'exactly the English 2014 list: none skipped, none doubled');
assert.equal(data.records[0].page,129);assert.equal(data.records.at(-1).sourceName,'Zona di verità');
const perLevel=[0,0,0,0,0,0,0,0,0,0];for(const r of data.records)perLevel[parseLivello(r.spell.livello).livello_num]++;
assert.deepEqual(perLevel,[24,49,54,42,31,37,31,20,16,15],'spells per level as in the SRD 5.1');
// One 2014 card per 2024 card: the "Passa alla versione 2014" link is never ambiguous.
const targets=Object.values(links).map(l=>l.id2024);assert.equal(new Set(targets).size,targets.length);
assert.equal(Object.keys(links).length,317,'317 links; Regressione mentale and Punizione marchiante have none');

const legacy=load('lib/srd-spells-2014.ts');
// Only preview and production serve the files; local runs and the admin read the database only.
assert.deepEqual(legacy.withLegacySpells([],undefined),[]);
assert.equal(legacy.legacySpellById('aiuto-2014',undefined),undefined);
const rows=legacy.withLegacySpells([{id:'aiuto',nome_italiano:'AIUTO'}],'preview');
assert.equal(rows.length,1+data.records.length);
assert.deepEqual(legacy.withLegacySpells([],'production'),legacy.withLegacySpells([],'preview'));
const aiuto=legacy.legacySpellById('aiuto-2014','production');
assert.equal(aiuto.livello,'Abiurazione di 2° livello (chierico, paladino)');
assert.equal(legacy.getLegacySpellSource(aiuto).page,129);
assert.equal(legacy.getLegacySpellSource({...aiuto,durata:'1 ora'}),undefined,'an edited text loses the source label');
assert.deepEqual(legacy.spellEditionLink('aiuto-2014','preview'),{href:'/spell/aiuto',label:'Passa alla versione 2024'});
assert.deepEqual(legacy.spellEditionLink('aiuto','preview'),{href:'/spell/aiuto-2014',label:'Passa alla versione 2014'});
assert.deepEqual(legacy.spellEditionLink('capanna-2014','preview'),{href:'/spell/capanna-di-leomund',label:'Passa alla versione 2024'});
assert.deepEqual(legacy.spellEditionLink('vuoto-mentale','preview'),{href:'/spell/vuoto-mentale-2014',label:'Passa alla versione 2014'},'Mind Blank leads to Mind Blank');
for(const id of ['disorientare','punizione-splendente'])assert.equal(legacy.spellEditionLink(id,'preview'),undefined,`${id}: no 2014 link with a different English identifier`);
assert.equal(legacy.spellEditionLink('regressione-mentale-2014','preview'),undefined);
assert.equal(legacy.spellEditionLink('aiuto',undefined),undefined);

(async()=>{
 // The 2014 selector appears as soon as the catalog has 2014 spells, and lists exactly them.
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://grimorio.example.test/grimorio'});
 for(const key of ['window','document','HTMLElement','MouseEvent'])global[key]=dom.window[key];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const {act}=React,{createRoot}=require('react-dom/client');
 const browserDeps={'@/components/favorites-provider':{useFavorites:()=>({isFavorite:()=>false,toggle:()=>{}})},'next/navigation':{useRouter:()=>({prefetch(){}}),usePathname:()=>'/grimorio'},
  'next/link':{__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)}};
 const {GrimorioBrowser}=load('components/grimorio-browser.tsx',browserDeps);
 const st=load('lib/spells-types.ts');
 const index=rows.map(row=>({id:row.id,nome_italiano:row.nome_italiano,...st.parseLivello(row.livello||''),...(legacy.isLegacySpellId(row.id)?{edizione:'2014'}:{})}));
 const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(GrimorioBrowser,{spells:index,meta:{livelli:[0,1,2,3,4,5,6,7,8,9],scuole:[],classi:[]}})));
 const pill=document.querySelector('button[aria-label^="Edizione "]');
 assert.ok(pill,'the edition pill is shown');
 await act(async()=>pill.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 const choice=[...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].find(b=>b.textContent.startsWith('2014'));
 await act(async()=>choice.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 const more=()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Mostra altri'));
 while(more())await act(async()=>more().dispatchEvent(new MouseEvent('click',{bubbles:true})));
 assert.deepEqual([...document.querySelectorAll('a[href^="/spell/"]')].map(a=>a.getAttribute('href').slice(7)).sort(),data.records.map(r=>r.spell.id).sort());
 await act(async()=>root.unmount());

 // 2014 creature sheets: spell bollini open 2014 cards only; 2024 sheets keep 2024 cards.
 const refs=load('lib/spell-references.ts');
 const {MonsterSheetBody}=load('components/monster-sheet.tsx');
 const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(h=>h.startsWith('/spell/'));
 let linked=0;
 for(const monster of monsters2014){
  const html=renderToStaticMarkup(React.createElement(MonsterSheetBody,{monster,legacy:true}));
  for(const href of hrefs(html)){linked++;assert.ok(href.endsWith('-2014')&&seen.has(href.slice(7)),`${monster.id}: ${href} is a published 2014 spell`);}
 }
 assert.ok(linked>=10,`2014 sheets link their spells (${linked})`);
 const accolito=renderToStaticMarkup(React.createElement(MonsterSheetBody,{monster:monsters2014.find(m=>m.id==='accolito-2014'),legacy:true}));
 assert.ok(hrefs(accolito).includes('/spell/benedizione-2014'));
 // The approved aliases are active now that their spells are published.
 const djinni=renderToStaticMarkup(React.createElement(MonsterSheetBody,{monster:monsters2014.find(m=>m.id==='djinni-2014'),legacy:true}));
 assert.ok(hrefs(djinni).includes('/spell/creare-cibo-e-acqua-2014'),'«creare cibo e bevande» opens Creare cibo e acqua 2014');
 const ginosfinge=renderToStaticMarkup(React.createElement(MonsterSheetBody,{monster:monsters2014.find(m=>m.id==='ginosfinge-2014'),legacy:true}));
 assert.ok(hrefs(ginosfinge).includes('/spell/conoscenza-delle-legende-2014'),'«conoscenza delle leggende» opens Conoscenza delle legende 2014');
 // Lists already in italics are kept as they are: the first and last names keep their bollino too.
 const couatl=renderToStaticMarkup(React.createElement(MonsterSheetBody,{monster:monsters2014.find(m=>m.id==='couatl-2014'),legacy:true}));
 for(const id of ['individuazione-dei-pensieri-2014','individuazione-del-magico-2014','benedizione-2014','scudo-2014','ristorare-superiore-2014','sogno-2014'])assert.ok(hrefs(couatl).includes('/spell/'+id),`couatl-2014: ${id}`);
 const italicList='A volontà: <em>luce, mano magica, sonno</em>';
 assert.equal(refs.formatMonsterSpellLists(italicList,true),italicList,'no italics inside italics');
 const arcimago=renderToStaticMarkup(React.createElement(MonsterSheetBody,{monster:monsters2014.find(m=>m.id==='arcimago-2014'),legacy:true}));
 for(const id of ['armatura-magica-2014','pelle-di-pietra-2014','vuoto-mentale-2014'])assert.ok(hrefs(arcimago).includes('/spell/'+id),`arcimago-2014: ${id} (name followed by *)`);
 const list='<strong>Incantesimi.</strong> Prepara:<br>A volontà: comando, creare cibo e bevande, conoscenza delle leggende, aculeo mentale';
 assert.deepEqual(refs.inlineSpellReferences(list,true).map(r=>r.href).sort(),['/spell/comando-2014','/spell/conoscenza-delle-legende-2014','/spell/creare-cibo-e-acqua-2014'],'2024-only names stay plain');
 assert.ok(refs.formatMonsterSpellLists(list,true).includes('<em>aculeo mentale</em>'),'2014 sheets keep their italics');
 assert.ok(refs.inlineSpellReferences(list).every(r=>!r.href.endsWith('-2014')),'2024 sheets never open 2014 cards');
 console.log(`SRD 5.1 spells: ${data.records.length} records with fingerprints, English links, 2014 selector and ${linked} creature bollini to 2014 cards verified.`);
})().catch(e=>{console.error(e);process.exit(1)});
