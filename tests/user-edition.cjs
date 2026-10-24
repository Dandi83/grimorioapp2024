// «La tua edizione» (lib/user-edition.ts, components/edition/*): one edition for the whole public app,
// adopted from the old per-section choices, held to the only edition the public sees, changed from any
// section or from another tab, the first launch only over the Home.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://grimorio.example.test/'});
for(const key of ['window','document','HTMLElement','Event','MouseEvent','KeyboardEvent','StorageEvent','Node'])global[key]=dom.window[key];
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const localStorage=dom.window.localStorage;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),ts=require('typescript');
const cache=new Map();
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/image')return {__esModule:true,default:({fill,priority,...props})=>React.createElement('img',props)};
  if(id.startsWith('@/')||id.startsWith('.')){
   let file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   file=['.ts','.tsx'].map(ext=>file+ext).find(fs.existsSync);return load(file);
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const ue=load('lib/user-edition.ts');

// Stored edition: the new key wins; old keys that agree are adopted; missing or different ones leave the choice open.
const reader=values=>key=>values[key]??null;
assert.deepEqual(ue.storedEdition(reader({})),{edition:'2024',chosen:false});
assert.deepEqual(ue.storedEdition(reader({'grimorio.edizione':'2014','grimorio.incantesimi.edizione':'2024'})),{edition:'2014',chosen:true});
assert.deepEqual(ue.storedEdition(reader({'grimorio.incantesimi.edizione':'2014','grimorio.bestiario.edizione':'2014','grimorio.equipaggiamento.edizione':'2014'})),{edition:'2014',chosen:true,migrated:true});
assert.deepEqual(ue.storedEdition(reader({'grimorio.bestiario.edizione':'2014'})),{edition:'2014',chosen:true,migrated:true},'a single old choice is adopted');
assert.deepEqual(ue.storedEdition(reader({'grimorio.incantesimi.edizione':'2014','grimorio.bestiario.edizione':'2024'})),{edition:'2024',chosen:false},'different old choices: the first launch asks');
assert.deepEqual(ue.storedEdition(reader({'grimorio.edizione':'2015','grimorio.bestiario.edizione':'boh'})),{edition:'2024',chosen:false},'unknown values ignored');
assert.deepEqual([...ue.LEGACY_EDITION_KEYS],['grimorio.incantesimi.edizione','grimorio.bestiario.edizione','grimorio.equipaggiamento.edizione']);

// Forced edition: only when the other one is hidden in every visible section that has editions.
const withEditions=['incantesimi','bestiario','classi','armi','armature','avventura','strumenti','oggetti-magici','condizioni'];
assert.equal(ue.forcedEdition([],[]),undefined);
assert.equal(ue.forcedEdition([],withEditions.map(k=>`${k}:2014`)),'2024');
assert.equal(ue.forcedEdition([],withEditions.map(k=>`${k}:2024`)),'2014');
assert.equal(ue.forcedEdition([],['incantesimi:2014']),undefined,'one section hiding 2014: the others still offer it');
assert.equal(ue.forcedEdition(['incantesimi'],withEditions.filter(k=>k!=='incantesimi').map(k=>`${k}:2014`)),'2024','a hidden section does not count');
assert.equal(ue.otherEdition('2024'),'2014');assert.equal(ue.otherEdition('2014'),'2024');

// Every public section reads the edition from the provider: no old key is read or written by the pages.
for(const file of ['components/grimorio-browser.tsx','components/bestiario-browser.tsx','components/catalog-browsers.tsx','components/equipment/use-equipment-edition.ts','components/search/search-panel.tsx']){
 const text=fs.readFileSync(file,'utf8');
 for(const key of ue.LEGACY_EDITION_KEYS)assert.ok(!text.includes(key),`${file} does not use ${key}`);
 assert.ok(!/localStorage\.(get|set)Item/.test(text),`${file} keeps no edition of its own`);
}
assert.ok(fs.readFileSync('app/layout.tsx','utf8').includes('<EditionProvider forced={admin ? undefined : forcedEdition(hidden, hiddenParts)}>'));

const {EditionProvider,useUserEdition}=load('components/edition/edition-provider.tsx');
const {FirstLaunch}=load('components/edition/first-launch.tsx');
const {EditionPill}=load('components/edition/edition-pill.tsx');
const root=createRoot(document.getElementById('root'));
let seen;
const Probe=()=>{seen=useUserEdition();return React.createElement('span',{id:'probe'},seen.edition);};
const mount=async(props={},url='/')=>{
 await act(async()=>root.render(React.createElement('div')));
 window.history.replaceState(null,'',url);
 await act(async()=>root.render(React.createElement(EditionProvider,props,React.createElement(Probe),React.createElement(FirstLaunch),React.createElement(EditionPill,{place:'home'}))));
};
const dialog=()=>document.querySelector('[data-first-launch]');
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
const click=async el=>{assert.ok(el);await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));};
const key=async(k,target=window)=>act(async()=>target.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true})));

(async()=>{
 // Empty device, visit starting on the Home: the first launch, focus on «2024».
 localStorage.clear();
 await mount();
 assert.equal(seen.ready,true);assert.equal(seen.chosen,false);assert.ok(dialog(),'first launch on the Home');
 assert.equal(dialog().getAttribute('role'),'dialog');assert.equal(dialog().getAttribute('aria-modal'),'true');
 assert.equal(document.getElementById(dialog().getAttribute('aria-labelledby')).textContent,'Con quale edizione giochi?');
 assert.ok(document.activeElement.textContent.startsWith('2024'),'focus on the first choice');
 assert.ok(dialog().textContent.includes('Incantesimi, bestiario, classi e regole partiranno sempre dalla tua edizione.'));
 assert.ok(dialog().textContent.includes('Puoi cambiarla quando vuoi dalla Home.'));
 assert.ok(button('Quinta edizione classica')&&button('Le regole aggiornate del 2024'));
 // Choosing 2014 saves it and shows the Home; the screen does not come back.
 await click(button('Quinta edizione classica'));
 assert.equal(dialog(),null);assert.equal(localStorage.getItem('grimorio.edizione'),'2014');assert.equal(seen.edition,'2014');
 await mount();
 assert.equal(dialog(),null,'not again after the choice');assert.equal(seen.edition,'2014');
 // Esc closes it with 2024.
 localStorage.clear();await mount();assert.ok(dialog());
 await key('Escape');assert.equal(dialog(),null);assert.equal(localStorage.getItem('grimorio.edizione'),'2024');
 // Never over a direct link: 2024 until the user chooses.
 for(const url of ['/spell/palla-di-fuoco','/mostro/lich','/grimorio','/bestiario?edizione=2014','/?cerca=drago']){
  localStorage.clear();await mount({},url);
  assert.equal(dialog(),null,url);assert.equal(seen.edition,'2024');assert.equal(seen.chosen,false);
 }
 // Old keys all 2014: adopted in silence, no first launch, written under the new key.
 localStorage.clear();localStorage.setItem('grimorio.incantesimi.edizione','2014');localStorage.setItem('grimorio.equipaggiamento.edizione','2014');
 await mount();
 assert.equal(dialog(),null);assert.equal(seen.edition,'2014');assert.equal(localStorage.getItem('grimorio.edizione'),'2014');
 // Old keys that disagree: the first launch once.
 localStorage.clear();localStorage.setItem('grimorio.incantesimi.edizione','2014');localStorage.setItem('grimorio.bestiario.edizione','2024');
 await mount();assert.ok(dialog());assert.equal(seen.edition,'2024');
 // Another tab changed it: this one follows.
 localStorage.clear();localStorage.setItem('grimorio.edizione','2024');await mount();
 await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:'grimorio.edizione',newValue:'2014'})));
 assert.equal(seen.edition,'2014');assert.equal(document.getElementById('probe').textContent,'2014');

 // The pill opens the panel: the active choice full with the tick, the status line, «Fatto», Esc.
 localStorage.setItem('grimorio.edizione','2024');await mount();
 const pill=()=>document.querySelector('button[aria-haspopup="dialog"]');
 assert.equal(pill().textContent,'Edizione 2024');assert.equal(pill().style.backgroundColor,'rgb(122, 31, 43)');
 await click(pill());
 const panel=()=>[...document.querySelectorAll('[role="dialog"]')].find(d=>d.textContent.includes('La tua edizione'));
 assert.ok(panel());assert.equal(pill().getAttribute('aria-expanded'),'true');
 assert.ok(panel().textContent.includes('Vale per tutta l’app: incantesimi, bestiario, classi, regole e ricerca.'));
 assert.equal(panel().querySelector('[role="status"]').textContent,'Ora tutta l’app parte dal 2024.');
 assert.equal(document.activeElement.getAttribute('aria-pressed'),'true','focus on the active choice');
 await click([...panel().querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.startsWith('2014')));
 assert.equal(localStorage.getItem('grimorio.edizione'),'2014');assert.equal(seen.edition,'2014');
 assert.equal(panel().querySelector('[role="status"]').textContent,'Ora tutta l’app parte dal 2014.');
 assert.equal(pill().textContent,'Edizione 2014');assert.equal(pill().style.backgroundColor,'rgb(45, 76, 122)');
 await key('Escape');assert.equal(panel(),undefined,'Esc closes the panel');assert.equal(document.activeElement,pill(),'focus back on the pill');
 await click(pill());await click(button('Fatto'));assert.equal(panel(),undefined);

 // 2014 hidden everywhere from /admin/sezioni: 2024 for everyone, no first launch, the pill does not open.
 localStorage.clear();localStorage.setItem('grimorio.edizione','2014');
 await mount({forced:'2024'});
 assert.equal(seen.edition,'2024');assert.equal(dialog(),null);assert.equal(pill(),null,'no button');
 assert.ok(document.body.textContent.includes('Edizione 2024'));
 localStorage.clear();await mount({forced:'2024'});assert.equal(dialog(),null,'no first launch with one edition');

 await act(async()=>root.unmount());
 console.log('User edition: one edition for the whole app, old keys adopted only when they agree, first launch only over the Home (Esc = 2024, never again), pill panel with status line and focus, other tabs follow, edition hidden by the admin forces the other.');
})().catch(error=>{console.error(error);process.exit(1);});
