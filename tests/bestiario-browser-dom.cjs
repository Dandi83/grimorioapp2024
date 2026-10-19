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
const prefetched=[];
const router={prefetch:href=>prefetched.push(href)};
let currentPath='/';
const navigationDependency={useRouter:()=>router,usePathname:()=>currentPath};
const navigateQuery=value=>{window.history.replaceState(null,'','/grimorio'+(value?'?'+value:''));window.dispatchEvent(new window.PopStateEvent('popstate'));};
const favoritesDependency={useFavorites:()=>({isFavorite:()=>false,toggle:()=>{throw Error('Filtering cannot change favorites')}})};
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='@/components/favorites-provider')return favoritesDependency;
  if(id==='next/navigation')return navigationDependency;
  if(id==='next/link')return {__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)};
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
const {GrimorioBrowser}=load('components/grimorio-browser.tsx');
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
 assert.equal(document.querySelectorAll('.catalog-row').length,100,'all animals remain reachable with deferred rendering');
 const spells=Array.from({length:400},(_,i)=>({id:`spell-${i}`,nome_italiano:`Incantesimo ${String(i).padStart(3,'0')}`,livello_num:Math.floor(i/40),scuola:'invocazione',classi:['mago']}));
 await act(async()=>root.render(React.createElement(GrimorioBrowser,{spells,meta:{livelli:[0,1,2,3,4,5,6,7,8,9],scuole:['invocazione'],classi:['mago']},initialLivello:null,initialScuola:null,initialClasse:null})));
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,40,'only the first page is rendered');
 assert.match(button('Mostra altri').textContent,/360/);
 assert.equal(document.querySelectorAll('.catalog-row-first-group').length,1);
 while(button('Mostra altri')) await click(button('Mostra altri'));
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,400,'every result is reachable via show more');
 assert.equal(document.querySelectorAll('.catalog-row-group').length,9,'level separators retain their own height estimates');
 const last=document.querySelector('a[href="/spell/spell-399"]');
 last.focus();assert.strictEqual(document.activeElement,last,'even distant links remain keyboard accessible');
 await input('399');
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,1);
 assert.equal(document.querySelector('a[href^="/spell/"]').getAttribute('href'),'/spell/spell-399','search includes the end of the full catalog');
 await input('');
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,40,'changing search resets pagination');
 await click(button('Mostra altri'));
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,80);
 await click(button('Livello'));await click(button('9° liv.'));
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,40,'filters search the whole catalog and reset pagination');
 assert.ok(document.querySelector('a[href="/spell/spell-399"]'));
 // Real provider + memoized rows: preserve existing storage on mount and render
 // only the affected row when toggling, including React StrictMode effects.
 const provider=load('components/favorites-provider.tsx');
 Object.assign(favoritesDependency,provider);
 const storageKey='grimorio.favorites.v1';
 window.localStorage.setItem(storageKey,JSON.stringify(['spell-0','mostro:gatto']));
 const storagePrototype=Object.getPrototypeOf(window.localStorage),originalSet=storagePrototype.setItem,writes=[];
 storagePrototype.setItem=function(key,value){if(key===storageKey)writes.push(value);return originalSet.call(this,key,value)};
 const colors=load('lib/school-colors.ts'),originalColor=colors.schoolColor,renderCounts=new Map();
 colors.schoolColor=school=>{renderCounts.set(school,(renderCounts.get(school)||0)+1);return originalColor(school)};
 const pair=[{...spells[0],scuola:'Abiurazione'},{...spells[1],scuola:'Evocazione'}];
 const pairProps={spells:pair,meta:{livelli:[0],scuole:['Abiurazione','Evocazione'],classi:['mago']},initialLivello:null,initialScuola:null,initialClasse:null};
 const renderPair=()=>React.createElement(React.StrictMode,null,React.createElement(provider.FavoritesProvider,null,React.createElement(GrimorioBrowser,pairProps)));
 await act(async()=>root.render(renderPair()));
 assert.deepEqual(JSON.parse(window.localStorage.getItem(storageKey)),['spell-0','mostro:gatto']);
 assert.ok(writes.length>0 && !writes.includes('[]'),'mount never overwrites saved favorites with an empty array');
 const beforeChanged=renderCounts.get('Abiurazione'),beforeOther=renderCounts.get('Evocazione');
 await click(document.querySelector('a[href="/spell/spell-0"]').closest('li').querySelector('button'));
 assert.ok(renderCounts.get('Abiurazione')>beforeChanged);
 assert.equal(renderCounts.get('Evocazione'),beforeOther,'unchanged rows do not render after another favorite changes');
 assert.deepEqual(JSON.parse(window.localStorage.getItem(storageKey)),['mostro:gatto'],'toggle persists and preserves monster favorites');
 await act(async()=>root.render(React.createElement('div')));
 await act(async()=>root.render(renderPair()));
 assert.equal(document.querySelector('a[href="/spell/spell-0"]').closest('li').querySelector('button').getAttribute('aria-pressed'),'false','saved state survives remount');
 colors.schoolColor=originalColor;storagePrototype.setItem=originalSet;
 // Static list shells read URL filters on the client, including same-path navigation.
 const {GrimorioWithFilters,BestiarioWithFilters}=load('components/catalog-browsers.tsx');
 navigateQuery('livello=9&scuola=invocazione&classe=mago');
 const renderSpellUrl=()=>React.createElement(provider.FavoritesProvider,null,React.createElement(GrimorioWithFilters,{spells,meta:{livelli:[0,9],scuole:['invocazione'],classi:['mago']}}));
 await act(async()=>root.render(renderSpellUrl()));
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,40);
 assert.ok(document.querySelector('a[href="/spell/spell-399"]'),'query filters find the last page');
 await act(async()=>navigateQuery('livello=0'));await act(async()=>root.render(renderSpellUrl()));
 assert.ok(document.querySelector('a[href="/spell/spell-0"]'),'same-path query changes reset the selected level');
 assert.ok(!document.querySelector('a[href="/spell/spell-399"]'));
 await act(async()=>navigateQuery('livello=invalid'));await act(async()=>root.render(renderSpellUrl()));
 assert.ok(button('Mostra altri'),'invalid URL level does not hide the catalog');
 prefetched.length=0;
 const spellLink=document.querySelector('a[href^="/spell/"]');
 const spellHref=spellLink.getAttribute('href');
 await act(async()=>{spellLink.dispatchEvent(new Event('touchstart',{bubbles:true}));spellLink.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));});
 assert.deepEqual(prefetched,[spellHref],'spell rows prefetch only once for touch and hover');
 await act(async()=>navigateQuery('raccolta=animali&gs=0'));
 const renderMonsterUrl=()=>React.createElement(provider.FavoritesProvider,null,React.createElement(BestiarioWithFilters,{monsters}));
 await act(async()=>root.render(renderMonsterUrl()));
 assert.equal(button('Animali').getAttribute('aria-pressed'),'true');
 assert.ok(ids().length>0&&ids().length<100);
 await act(async()=>navigateQuery('raccolta=mostri'));await act(async()=>root.render(renderMonsterUrl()));
 assert.equal(ids().length,240,'same-path query changes switch collection and clear old filters');
 await act(async()=>navigateQuery(''));await act(async()=>root.render(renderMonsterUrl()));
 assert.equal(ids().length,240,'unfiltered URL retains the default collection');
 // Preserve the original server-filter cases as exact rendered-result checks.
 const filterCases=[
  {id:'url-target',nome_italiano:'Risultato atteso',livello_num:3,scuola:'Evocazione',classi:['mago']},
  {id:'wrong-level',nome_italiano:'Livello diverso',livello_num:4,scuola:'Evocazione',classi:['mago']},
  {id:'wrong-school',nome_italiano:'Scuola diversa',livello_num:3,scuola:'Abiurazione',classi:['mago']},
  {id:'wrong-class',nome_italiano:'Classe diversa',livello_num:3,scuola:'Evocazione',classi:['chierico']},
 ];
 await act(async()=>navigateQuery('livello=3&scuola=Evocazione&classe=mago'));
 await act(async()=>root.render(React.createElement(provider.FavoritesProvider,null,React.createElement(GrimorioWithFilters,{spells:filterCases,meta:{livelli:[3,4],scuole:['Evocazione','Abiurazione'],classi:['mago','chierico']}}))));
 assert.deepEqual([...document.querySelectorAll('a[href^="/spell/"]')].map(a=>a.getAttribute('href')),['/spell/url-target'],'all three original URL filters exclude independently mismatched records');
 await act(async()=>navigateQuery('raccolta=animali&gs=1/2'));
 await act(async()=>root.render(renderMonsterUrl()));
 assert.equal(button('Animali').getAttribute('aria-pressed'),'true','original collection filter is preserved');
 const halfAnimals=monsters.filter(m=>load('lib/monsters-types.ts').isSrdAnimal(m)&&m.grado_sfida==='1/2').map(m=>m.id).sort();
 assert.ok(halfAnimals.length>0,'the original fractional challenge-rating case has real results');
 assert.deepEqual(ids().sort(),halfAnimals,'the original GS 1/2 URL filter selects exactly the matching animals');
 // Server HTML contains real rows even when the browser URL has filters.
 const {renderToStaticMarkup}=require('react-dom/server');
 window.history.replaceState(null,'','/grimorio?livello=9');
 const html=renderToStaticMarkup(renderSpellUrl());
 assert.ok(html.includes('/spell/spell-0'),'prerendering includes real unfiltered rows');
 assert.ok(!html.includes('/spell/spell-399'),'URL filters are applied only after mount');
 assert.ok(!html.includes('Caricamento in corso'));
 // Intent prefetch runs once for a row, including touch after mouse hover.
 prefetched.length=0;
 const firstRow=document.querySelector('a[href^="/mostro/"]');
 const href=firstRow.getAttribute('href');
 await act(async()=>{firstRow.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));firstRow.dispatchEvent(new Event('touchstart',{bubbles:true}));firstRow.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));});
 assert.deepEqual(prefetched,[href],'repeated hover and touch prefetch the same row once');
 // Bottom navigation warms only after idle, with a cancellable timer fallback.
 const {BottomNav}=load('components/bottom-nav.tsx');
 let idle, canceled;
 window.requestIdleCallback=cb=>{idle=cb;return 17};
 window.cancelIdleCallback=id=>{canceled=id};
 prefetched.length=0;
 await act(async()=>root.render(React.createElement(BottomNav)));
 assert.deepEqual(prefetched,[],'navigation does not prefetch synchronously at mount');
 assert.equal(typeof idle,'function','mount schedules idle work');
 await act(async()=>idle());
 assert.deepEqual(prefetched,['/','/grimorio','/bestiario','/preferiti']);
 await act(async()=>root.render(React.createElement('div')));
 assert.equal(canceled,17,'idle work is canceled on unmount');
 delete window.requestIdleCallback;delete window.cancelIdleCallback;
 prefetched.length=0;
 await act(async()=>root.render(React.createElement(BottomNav)));
 assert.deepEqual(prefetched,[]);
 await act(async()=>new Promise(resolve=>setTimeout(resolve,330)));
 assert.deepEqual(prefetched,['/','/grimorio','/bestiario','/preferiti'],'timer fallback warms the same four routes');
 await act(async()=>root.unmount());
 console.log('Catalogs: bestiary unchanged; 40-row spell pages, show more, full-catalog deferred search, filter/page reset, level groups and keyboard access passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
