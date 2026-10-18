const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://bestiario.example.test'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Event','InputEvent','MouseEvent'])global[key]=dom.window[key];
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),ts=require('typescript');
const cache=new Map();
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='@/components/favorites-provider')return {useFavorites:()=>({isFavorite:()=>false,toggle:()=>{throw Error('Filtering cannot change favorites')}})};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id.startsWith('@/')||id.startsWith('.')){
   let file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   file=['.ts','.tsx'].map(ext=>file+ext).find(fs.existsSync);return load(file);
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const monsters=load('lib/srd-monsters.ts').previewMonsters([],'production');
const {BestiarioBrowser}=load('components/bestiario-browser.tsx');
const root=createRoot(document.getElementById('root'));
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(text));
const click=async el=>{assert.ok(el);await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})))};
const input=async value=>{const el=document.querySelector('input');await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new InputEvent('input',{bubbles:true}))})};
const ids=()=>[...document.querySelectorAll('a[href^="/mostro/"]')].map(a=>a.getAttribute('href').slice('/mostro/'.length));
const props={monsters,initialTaglia:null,initialTipo:null,initialGs:null};
(async()=>{
 await act(async()=>root.render(React.createElement(BestiarioBrowser,props)));
 assert.equal(document.querySelector('h1').textContent,'Bestiario (340)');
 assert.ok(document.querySelector('[role="group"][aria-label="Sezioni del bestiario"]'));
 assert.match(button('Mostri').textContent,/240/);assert.match(button('Animali').textContent,/100/);
 assert.equal(button('Mostri').getAttribute('aria-pressed'),'true');
 assert.equal(ids().length,240);assert.ok(ids().includes('duergar'));assert.ok(!ids().includes('gatto'));
 await click(button('Tipo'));await click(button('Drago'));
 assert.ok(ids().length>0&&ids().length<240);assert.ok(!ids().includes('duergar'));
 await click(button('Animali'));
 assert.equal(button('Animali').getAttribute('aria-pressed'),'true');
 assert.equal(ids().length,100,'switching collection clears incompatible filters');
 assert.ok(ids().includes('gatto'));assert.ok(ids().includes('alce-gigante'),'source animals include Celestial animals');
 assert.ok(ids().includes('sciame-di-scarabei'));assert.ok(!ids().includes('duergar'));
 await input('gatto');assert.deepEqual(ids(),['gatto']);
 await click(button('Mostri'));assert.equal(ids().length,0);assert.equal(document.querySelector('input').value,'gatto');
 await input('');assert.equal(ids().length,240);
 await click(button('Animali'));await click(button('Grado sfida'));await click(button('GS 0'));
 assert.ok(ids().length>0&&ids().length<100);
 await click(button('Pulisci'));assert.equal(ids().length,100,'reset keeps the selected section');
 await act(async()=>root.render(React.createElement(BestiarioBrowser,{...props,key:'animal-link',initialRaccolta:'animali'})));
 assert.equal(ids().length,100,'existing animal links open the animal section directly');
 await act(async()=>root.unmount());
 console.log('Bestiario: 240 monsters, 100 animals, visible section controls, source classification, search, filter reset and direct animal links passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
