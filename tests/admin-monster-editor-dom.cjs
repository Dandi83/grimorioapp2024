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
 '@/app/actions/admin-monsters':{
  createMonsterAction:async (_prev,data)=>{calls++;payload=Object.fromEntries(data.entries());return {ok:false,error:'Errore simulato'}},
  updateMonsterAction:async()=>{throw new Error('should not save existing source')},
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
const {MonsterEditor}=load('components/admin-monster-editor.tsx');
const root=createRoot(document.getElementById('root'));
const click=async el=>{assert.ok(el);await act(async()=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}))})};
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
const input=async(el,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new InputEvent('input',{bubbles:true}))})};
const choose=async(id,value)=>{const el=document.getElementById(id);assert.equal(el?.tagName,'SELECT',`${id} must offer a native dropdown`);await act(async()=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))})};
(async()=>{
 await act(async()=>root.render(React.createElement(MonsterEditor,{monster:null,onClose:()=>closed++})));
 await input(document.getElementById('nome'),'Guardiano di prova');
 assert.deepEqual([...document.getElementById('edition').options].map(o=>o.textContent),['Da verificare / automatica','D&D5e 2024','D&D5e 2014']);
 await choose('edition','2024');
 for(const [id,value] of [['tipo','Costrutto'],['taglia','Grande'],['allineamento','neutrale'],['grado_sfida','1/4'],['velocita','9 m']]) {
  await choose(id,value);
  assert.equal(new FormData(document.querySelector('form')).get(id),value);
 }
 await choose('velocita','__custom__');
 await input(document.getElementById('velocita-custom'),'9 m, volo 18 m');
 await choose('resistenze-add','freddo');
 await choose('resistenze-add','fulmine');
 await choose('resistenze-add','freddo');
 assert.equal(new FormData(document.querySelector('form')).get('resistenze'),'freddo, fulmine','quick selections append without duplicates');
 await input(document.getElementById('resistenze'),'freddo; danni da attacchi non magici');
 await choose('resistenze-add','fuoco');
 assert.equal(new FormData(document.querySelector('form')).get('resistenze'),'freddo; danni da attacchi non magici, fuoco','selection must not overwrite custom qualifications');
 await choose('immunita_condizioni-add','avvelenato');
 await input(document.getElementById('punti_ferita'),'45 (6d8 + 18)');
 await input(document.getElementById('forza'),'18');
 await click(button('Aggiungi azione'));
 const title=document.querySelector('[id^="azioni-"][id$="-title"]');
 await input(title,'Morso gelido');
 const body=document.querySelector('[id^="azioni-"][contenteditable]');
 await act(async()=>{body.innerHTML='12 danni da freddo.<br><br>Il bersaglio è paralizzato.';body.dispatchEvent(new InputEvent('input',{bubbles:true}))});
 const originalData=new FormData(document.querySelector('form'));
 assert.ok(originalData.get('azioni').includes('<strong>Morso gelido.</strong>'));
 assert.ok(originalData.get('azioni').includes('<br><br>'));
 await click(button('Anteprima'));
 assert.equal(calls,0,'preview must not invoke any mutation');
 assert.ok(document.querySelector('article').textContent.includes('Morso gelido.'));
 assert.ok(document.querySelector('article').textContent.includes('Grande · Costrutto · neutrale'));
 assert.ok(document.querySelector('article').textContent.includes('9 m, volo 18 m'));
 assert.ok(document.querySelector('article').textContent.includes('+4'));
 assert.equal(document.querySelectorAll('article a[href="/manuale/condizioni-paralizzato"]').length,1);
 await click(button('Torna al modulo'));
 assert.equal(document.getElementById('nome').value,'Guardiano di prova');
 await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(calls,1);
 assert.equal(payload.nome,'Guardiano di prova');
 assert.equal(payload.edition,'2024');
 assert.equal(document.getElementById('edition').value,'2024');
 assert.equal(payload.azioni,originalData.get('azioni'));
 assert.equal(payload.velocita,'9 m, volo 18 m');
 assert.equal(payload.resistenze,'freddo; danni da attacchi non magici, fuoco');
 assert.equal(document.getElementById('nome').value,'Guardiano di prova','failed save must preserve uncontrolled inputs');
 assert.equal(document.getElementById('punti_ferita').value,'45 (6d8 + 18)');
 assert.ok(document.querySelector('[role="alert"]').textContent.includes('Errore simulato'));
 assert.equal(closed,0,'failed save keeps editor open');
 // Clear accidental emphasis visually without losing paragraph breaks.
 await act(async()=>{body.innerHTML='<em>Testo</em><br><br><strong>Altro</strong>';body.dispatchEvent(new InputEvent('input',{bubbles:true}))});
 const normal=[...body.parentElement.querySelectorAll('button')].find(b=>b.textContent==='Testo normale');
 await click(normal);
 assert.equal(body.innerHTML,'Testo<br><br>Altro');
 // Reordering and removal affect only unsaved draft blocks.
 await click(button('Aggiungi azione'));
 const secondTitle=[...document.querySelectorAll('[id^="azioni-"][id$="-title"]')][1];
 await input(secondTitle,'Artiglio');
 await click(document.querySelector('[aria-label="Sposta su azione 2"]'));
 assert.ok(new FormData(document.querySelector('form')).get('azioni').startsWith('<strong>Artiglio.</strong>'));
 await click(document.querySelector('[aria-label="Rimuovi azione 1"]'));
 assert.ok(!new FormData(document.querySelector('form')).get('azioni').includes('Artiglio'));
 assert.ok(new FormData(document.querySelector('form')).get('azioni').includes('Morso gelido'));
 // Pasting a literal HTML-looking string cannot execute markup.
 const selection=window.getSelection(), range=document.createRange();
 range.selectNodeContents(body);selection.removeAllRanges();selection.addRange(range);
 const paste=new Event('paste',{bubbles:true,cancelable:true});
 Object.defineProperty(paste,'clipboardData',{value:{getData:()=>'<img src=x onerror=alert(1)>\n\nTesto'}});
 await act(async()=>body.dispatchEvent(paste));
 assert.equal(body.querySelector('img'),null);
 assert.ok(new FormData(document.querySelector('form')).get('azioni').includes('&lt;img'));
 assert.ok(new FormData(document.querySelector('form')).get('azioni').includes('<br><br>Testo'));
 // Source editing opens without rewriting imported content.
 const lich=requireProject('./lib/data/srd-monsters-5.2.1-it.json').records.find(r=>r.monster.id==='lich').monster;
 await act(async()=>root.render(React.createElement(MonsterEditor,{key:'lich',monster:lich,onClose:()=>closed++})));
 for(const field of ['tratti','azioni','reazioni','azioni_leggendarie','descrizione'])assert.equal(new FormData(document.querySelector('form')).get(field),lich[field]||'',field);
 for(const field of ['tipo','taglia','allineamento','grado_sfida','velocita','resistenze','immunita_condizioni','sensi','linguaggi'])assert.equal(new FormData(document.querySelector('form')).get(field),lich[field]||'',`unchanged ${field}`);
 assert.equal(document.getElementById('tipo-custom').value,'Non morto (mago)','existing subtypes remain editable without truncation');
 await choose('edition','2014');
 await click(button('Anteprima'));
 assert.ok(document.querySelector('article').textContent.includes('D&D5e 2014'));
 assert.equal(document.querySelectorAll('article a[href="/manuale/condizioni-paralizzato"]').length,0,'preview uses selected edition');
 await act(async()=>root.unmount());
 console.log('DOM interactions: named blocks, body formatting, ability modifiers, preview with links and no writes, return-to-form, failed-save draft retention, clear formatting, exact existing-source submission passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
