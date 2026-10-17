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
let favorites=['mostro:shared'],loaded=true;
const state={useFavorites:()=>({favorites,loaded,isFavorite:id=>favorites.includes(id),toggle:()=>{throw Error('Rendering must not toggle favorites')}})};
function load(file){
 if(file.endsWith('.json'))return JSON.parse(readFileSync(file));
 const m={exports:{}};let code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='@/components/favorites-provider')return state;
  if(id==='@/lib/spells')return {getAllSpells:async()=>[spell]};
  if(id==='@/lib/monsters')return {getAllMonsters:async()=>[monster]};
  if(id==='next/link')return {__esModule:true,default:({children,...p})=>createElement('a',p,children)};
  if(id.startsWith('@/')||id.startsWith('.')){let p=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);if(!path.extname(p))p=['.tsx','.ts','.json'].map(e=>p+e).find(existsSync);return load(p);}
  return require(id);
 },m,m.exports);return m.exports;
}
const page=load(path.join(root,'app/preferiti/page.tsx')).default;
const render=async()=>renderToStaticMarkup(await page());
let markup=await render();assert.ok(markup.includes('/mostro/shared'),'A saved monster must appear on the actual favorites page');assert.ok(!markup.includes('/spell/shared'),'Monster ID namespace must not select a spell with the same ID');
favorites=['shared'];markup=await render();assert.ok(markup.includes('/spell/shared'));assert.ok(!markup.includes('/mostro/shared'));
favorites=['shared','mostro:shared'];markup=await render();assert.ok(markup.includes('/spell/shared')&&markup.includes('/mostro/shared'));assert.deepEqual(favorites,['shared','mostro:shared']);
favorites=[];markup=await render();assert.ok(!markup.includes('/mostro/shared')&&!markup.includes('/spell/shared'));
loaded=false;favorites=['mostro:shared'];markup=await render();assert.ok(!markup.includes('/mostro/shared'));
console.log('[favorites] Saved monsters/spells, ID namespaces, mixed favorites, removal and loading state verified through actual page and row components.');
