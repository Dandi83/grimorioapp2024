const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const requireProject=createRequire(path.join(process.cwd(),'package.json'));
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://editor.example.test'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLDialogElement','Event','InputEvent','MouseEvent','FormData']) global[key]=dom.window[key];
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
HTMLDialogElement.prototype.showModal=function(){this.open=true};
HTMLElement.prototype.scrollTo=function(){};
const React=requireProject('react');
const {act}=React;
const {createRoot}=requireProject('react-dom/client');
const ts=requireProject('typescript');
let calls=0, closed=0, payload;
const cache=new Map();
const deps={
 '@/app/actions/admin-cards':{setCardVisibilityAction:async(kind,id,hidden)=>({ok:true,hidden})},
 '@/app/actions/admin-search-english':{readSearchEnglishAction:async()=>''},
 '@/app/actions/admin':{
  createSpellAction:async (_prev,data)=>{calls++;payload=Object.fromEntries(data.entries());return {ok:false,error:'Errore simulato'}},
  updateSpellAction:async()=>{throw new Error('should not save existing source')},
 },
};
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 function local(id){
  if(deps[id])return deps[id];
  if(id.startsWith('@/')||id.startsWith('./')){
   let file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(fs.existsSync(file)&&file.endsWith('.json'))return requireProject(file);
   if(fs.existsSync(file+'.ts'))return load(file+'.ts');
   if(fs.existsSync(file+'.tsx'))return load(file+'.tsx');
  }
  return createRequire(filename)(id);
 }
 new Function('require','module','exports',code)(local,mod,mod.exports);return mod.exports;
}
assert.ok(fs.existsSync('components/admin-spell-editor.tsx'),'guided spell editor must exist');
const {SpellEditor}=load('components/admin-spell-editor.tsx');
const root=createRoot(document.getElementById('root'));
const click=async el=>{assert.ok(el);await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})))};
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
const input=async(el,value)=>{assert.ok(el);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new InputEvent('input',{bubbles:true}))})};
const choose=async(id,value)=>{const el=document.getElementById(id);assert.equal(el?.tagName,'SELECT');await act(async()=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))})};
(async()=>{
 await act(async()=>root.render(React.createElement(SpellEditor,{edition:'2024',spell:null,onClose:()=>closed++})));
 assert.equal(document.getElementById('spell-components-mode').selectedOptions[0].textContent,'Seleziona le componenti…','new spell must not appear to have prefilled components');
 assert.equal(new FormData(document.querySelector('form')).get('componenti'),'');
 for(const type of ['V','S','M'])assert.equal(document.getElementById('component-'+type).checked,false);
 await input(document.getElementById('nome_italiano'),'Gelo di prova');
 assert.deepEqual([...document.getElementById('edition').options].map(o=>o.textContent),['2024','2014'],'a card without SRD source: 2024 or 2014, no «automatica»');
 await choose('edition','2024');
 await choose('spell-level','2');
 await choose('spell-school','Invocazione');
 await choose('spell-class-add','mago');
 await choose('spell-class-add','stregone');
 await choose('spell-class-add','mago');
 await choose('tempo_di_lancio','azione');
 await choose('gittata','18 metri');
 await choose('durata','concentrazione, fino a 1 minuto');
 for(const type of ['V','S','M'])await click(document.getElementById('component-'+type));
 assert.equal(document.getElementById('spell-components-mode').selectedOptions[0].textContent,'V, S, M','label follows actual selections');
 await input(document.getElementById('spell-material'),'un cristallo del valore di 50 mo, che si consuma');
 const body=document.getElementById('spell-description');
 await act(async()=>{body.innerHTML='Il bersaglio è paralizzato.<br><br>Subisce 2d6 danni da freddo.';body.dispatchEvent(new InputEvent('input',{bubbles:true}))});
 let data=new FormData(document.querySelector('form'));
 assert.equal(data.get('livello'),'Invocazione di 2° livello (mago, stregone)');
 assert.equal(data.get('componenti'),'V, S, M (un cristallo del valore di 50 mo, che si consuma)');
 assert.equal(data.getAll('livello').length,1);
 assert.equal(data.getAll('componenti').length,1);
 await click(button('Anteprima'));
 assert.equal(calls,0);
 assert.ok(document.querySelector('article').textContent.includes('Gelo di prova'));
 assert.ok(document.querySelector('article').textContent.includes('Invocazione'));
 assert.equal(document.querySelectorAll('article a[href="/manuale/condizioni-paralizzato"]').length,1);
 await click(button('Torna al modulo'));
 await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(calls,1);assert.equal(closed,0);
 assert.equal(payload.livello,data.get('livello'));assert.equal(payload.componenti,data.get('componenti'));
 assert.equal(payload.edition,'2024');
 assert.equal(document.getElementById('edition').value,'2024','failed save preserves selected edition');
 assert.equal(document.getElementById('nome_italiano').value,'Gelo di prova');
 assert.equal(new FormData(document.querySelector('form')).get('descrizione'),data.get('descrizione'));
 assert.ok(document.querySelector('[role="alert"]').textContent.includes('Errore simulato'));
 const record=requireProject('./lib/data/srd-italiano-5.2.1.json').spells.find(s=>s.id==='muro-prismatico');
 const {parseLivello}=load('lib/spells-types.ts');
 const spell={...record,nome_italiano:record.appName,...parseLivello(record.livello)};
 await act(async()=>root.render(React.createElement(SpellEditor,{edition:'2024',key:'existing',spell,onClose:()=>closed++})));
 data=new FormData(document.querySelector('form'));
 for(const field of ['nome_italiano','livello','tempo_di_lancio','gittata','componenti','durata','descrizione'])assert.equal(data.get(field),spell[field],field+' must remain exact');
 const table=document.querySelector('#spell-description pre');
 const tableRange=document.createRange();tableRange.setStart(table.firstChild,0);tableRange.setEnd(table.firstChild,12);
 const tableSelection=window.getSelection();tableSelection.removeAllRanges();tableSelection.addRange(tableRange);
 await click(button('Grassetto'));
 assert.equal(new FormData(document.querySelector('form')).get('descrizione'),record.descrizione,'formatting cannot insert markup into plain-text source tables');
 await choose('tempo_di_lancio','__custom__');
 await input(document.getElementById('tempo_di_lancio-custom'),'reazione, quando subisce danni');
 assert.equal(new FormData(document.querySelector('form')).get('descrizione'),record.descrizione,'metadata edits preserve tables and paragraphs');
 await click(button('Anteprima'));
 assert.ok(document.querySelector('article pre'),'existing tables remain rendered in preview');
 // A verified SRD card: fixed edition with its source, no dropdown.
 await act(async()=>root.render(React.createElement(SpellEditor,{edition:'2024',key:'srd',spell:{...spell,fonte:'SRD 5.2.1'},onClose:()=>closed++})));
 assert.equal(document.querySelector('[data-testid="card-edition"]').textContent,'Edizione 2024 · SRD 5.2.1');
 assert.equal(new FormData(document.querySelector('form')).get('edition'),null);
 const custom={...spell,edizione:'2014',livello:'Potere speciale (classe personalizzata)',componenti:'Materiali speciali: una chiave',durata:'finché il portale rimane aperto'};
 await act(async()=>root.render(React.createElement(SpellEditor,{edition:'2014',key:'custom',spell:custom,onClose:()=>closed++})));
 for(const field of ['livello','componenti','durata'])assert.equal(new FormData(document.querySelector('form')).get(field),custom[field]);
 assert.equal(document.getElementById('edition').value,'2014');
 await click(button('Anteprima'));
 assert.ok(document.querySelector('article').textContent.includes('D&D5e 2014'));
 assert.equal(document.querySelectorAll('article a[href="/manuale/condizioni-paralizzato"]').length,0);
 await act(async()=>root.unmount());
 const {renderToStaticMarkup}=requireProject('react-dom/server');
 for(const record of requireProject('./lib/data/srd-italiano-5.2.1.json').spells) {
  const source={...record,nome_italiano:record.appName,...parseLivello(record.livello)};
  const markup=renderToStaticMarkup(React.createElement(SpellEditor,{edition:'2024',spell:source,onClose:()=>{}}));
  const page=new dom.window.DOMParser().parseFromString(markup,'text/html');
  const submission=new FormData(page.querySelector('form'));
  for(const field of ['nome_italiano','livello','tempo_di_lancio','gittata','componenti','durata','descrizione'])assert.equal(submission.get(field),source[field],record.id+'.'+field+' source preservation');
 }
 console.log('Guided spells: dropdowns, combined classification, multiple classes, component materials, visual description, preview without writes, failed-save retention and exact source/table preservation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
