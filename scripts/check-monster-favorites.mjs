import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const monster={...JSON.parse(readFileSync(path.join(root,'lib/data/srd-monster-sample.json'))).monster,id:'shared',nome:'Mostro salvato'};
const spell={id:'shared',nome_italiano:'Incantesimo salvato',livello_num:1,scuola:'Evocazione'};
let favorites=['mostro:shared'],loaded=true,out=[],parts=[];
const state={useFavorites:()=>({favorites,loaded,isFavorite:id=>favorites.includes(id),toggle:()=>{throw Error('Rendering must not toggle favorites')}})};
function load(file){
 if(file.endsWith('.json'))return JSON.parse(readFileSync(file));
 const m={exports:{}};let code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='@/components/favorites-provider')return state;
  if(id==='@/lib/spell-index')return {getSpellIndex:async()=>[spell]};
  if(id==='@/lib/section-view')return {sectionsOut:async()=>out,partsOut:async()=>parts,markedCards:async(k,l)=>l,sectionView:async()=>({admin:false,hidden:[],hiddenParts:[],hiddenCards:[]})};
  if(id==='@/lib/monster-index')return {getMonsterListIndex:async()=>[monster]};
  if(id==='next/navigation')return {useRouter:()=>({prefetch:()=>{}})};
  if(id==='next/link')return {__esModule:true,default:({children,prefetch,...p})=>createElement('a',p,children)};
  if(id.startsWith('@/')||id.startsWith('.')){let p=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);if(!path.extname(p))p=['.tsx','.ts','.json'].map(e=>p+e).find(existsSync);return load(p);}
  return require(id);
 },m,m.exports);return m.exports;
}
const page=load(path.join(root,'app/preferiti/page.tsx')).default;
const render=async()=>renderToStaticMarkup(await page());
let markup=await render();assert.ok(markup.includes('/mostro/shared'),'A saved monster must appear on the actual favorites page');assert.ok(!markup.includes('/spell/shared'),'Monster ID namespace must not select a spell with the same ID');
favorites=['shared'];markup=await render();assert.ok(markup.includes('/spell/shared'));assert.ok(!markup.includes('/mostro/shared'));
favorites=['shared','mostro:shared'];markup=await render();assert.ok(markup.includes('/spell/shared')&&markup.includes('/mostro/shared'));assert.deepEqual(favorites,['shared','mostro:shared']);
// A hidden section (/admin/sezioni) leaves the page; the saved favorites stay as they are.
out=['incantesimi'];markup=await render();assert.ok(!markup.includes('/spell/shared')&&markup.includes('/mostro/shared'));assert.deepEqual(favorites,['shared','mostro:shared']);out=[];
// A hidden edition or collection leaves the page too.
parts=['bestiario:mostri'];markup=await render();assert.ok(markup.includes('/spell/shared')&&!markup.includes('/mostro/shared'));parts=['incantesimi:2024'];markup=await render();assert.ok(!markup.includes('/spell/shared')&&markup.includes('/mostro/shared'));parts=[];
favorites=[];markup=await render();assert.ok(!markup.includes('/mostro/shared')&&!markup.includes('/spell/shared'));
loaded=false;favorites=['mostro:shared'];markup=await render();assert.ok(!markup.includes('/mostro/shared'));
console.log('[favorites] Saved monsters/spells, ID namespaces, mixed favorites, removal and loading state verified through actual page and row components.');
// Numeric ordering must win over incoming array order, names, and string/fraction formatting.
loaded=true;
const orderedSpells=[
 {...spell,id:'z9',nome_italiano:'Zeta',livello_num:9},
 {...spell,id:'b2',nome_italiano:'Beta',livello_num:2},
 {...spell,id:'a2',nome_italiano:'Alfa',livello_num:2},
 {...spell,id:'cantrip',nome_italiano:'Trucchetto',livello_num:0},
 {...spell,id:'unknown',nome_italiano:'Ignoto',livello_num:-1},
];
const orderedMonsters=[
 {...monster,id:'z10',nome:'Zeta',grado_sfida:'10',gs_num:10},
 {...monster,id:'c2',nome:'Gamma',grado_sfida:'2',gs_num:2},
 {...monster,id:'bhalf',nome:'Beta',grado_sfida:'1/2',gs_num:0.5},
 {...monster,id:'ahalf',nome:'Alfa',grado_sfida:'1/2',gs_num:0.5},
 {...monster,id:'eighth',nome:'Ottavo',grado_sfida:'1/8',gs_num:0.125},
 {...monster,id:'quarter',nome:'Quarto',grado_sfida:'1/4',gs_num:0.25},
 {...monster,id:'unknown',nome:'Ignoto',grado_sfida:'',gs_num:-1},
];
favorites=[...orderedSpells.map(s=>s.id),...orderedMonsters.map(m=>'mostro:'+m.id)];
const originalSpells=orderedSpells.map(s=>s.id),originalMonsters=orderedMonsters.map(m=>m.id),originalFavorites=[...favorites];
const FavoritesList=load(path.join(root,'components/favorites-list.tsx')).FavoritesList;
markup=renderToStaticMarkup(createElement(FavoritesList,{spells:orderedSpells,monsters:orderedMonsters}));
assert.deepEqual([...markup.matchAll(/href="\/spell\/([^\"]+)"/g)].map(m=>m[1]),['cantrip','a2','b2','z9','unknown'],'Favorite spells must be ordered by ascending numeric level, then Italian name; unknown levels last');
assert.deepEqual([...markup.matchAll(/href="\/mostro\/([^\"]+)"/g)].map(m=>m[1]),['eighth','quarter','ahalf','bhalf','c2','z10','unknown'],'Favorite monsters must be ordered by numeric CR including fractions, then Italian name; unknown CR last');
assert.deepEqual(orderedSpells.map(s=>s.id),originalSpells);assert.deepEqual(orderedMonsters.map(m=>m.id),originalMonsters);assert.deepEqual(favorites,originalFavorites);
console.log('[favorites] Ascending numeric spell levels and CR (including fractions), alphabetical ties, unknowns last, and unmodified saved data verified.');
// Public catalog and favorites share SpellRow: original summaries must have plain titles.
const SpellRow=load(path.join(root,'components/spell-row.tsx')).SpellRow;
const originalSummaries=JSON.parse(readFileSync(path.join(root,'lib/data/original-descriptions-2024.json'))).spells;
assert.ok(originalSummaries.some(s=>s.id==='amicizia'),'Include the reported Amicizia regression');
for(const summary of originalSummaries){
 const row={...spell,...summary,edizione:'2024'};
 markup=renderToStaticMarkup(createElement(SpellRow,{spell:row,fav:false,onToggle:state.useFavorites().toggle}));
 const title=markup.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1];
 assert.ok(title,`Missing title for ${row.id}`);
 assert.doesNotMatch(title,/<sup\b|\*/,`No asterisk beside ${row.id} in public lists`);
 assert.ok(markup.includes(`/spell/${row.id}`));
 assert.doesNotMatch(markup,/D&amp;D5e|lucide-book-open/,'Edition labels belong only inside detail pages');
}
console.log('[spell lists] All 49 original summaries have plain titles without edition badges; detail links preserved.');
