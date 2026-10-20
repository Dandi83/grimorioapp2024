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
const srd=load('lib/srd-monsters.ts');
// Catalog rows as the list index builds them: each with its rules edition.
const monsters=srd.previewMonsters([],'production').map(m=>({...m,edizione:srd.usesLegacyMonsterRules(m)?'2014':'2024',...(m.id==='gatto'?{habitat:['Urbano']}:m.id==='aquila'?{habitat:['Montagna','Collina']}:m.id==='topo'?{habitat:['Qualsiasi']}:{})}));
const {BestiarioBrowser}=load('components/bestiario-browser.tsx');
const {GrimorioBrowser}=load('components/grimorio-browser.tsx');
const root=createRoot(document.getElementById('root'));
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(text));
const option=text=>[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.trim()===text);
const click=async el=>{assert.ok(el);await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})))};
const input=async value=>{const el=document.querySelector('input');await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new InputEvent('input',{bubbles:true}))})};
const ids=()=>[...document.querySelectorAll('a[href^="/mostro/"]')].map(a=>a.getAttribute('href').slice('/mostro/'.length));
// The bestiary shows 40 rows per page: expand every page to check the full result set.
const allIds=async()=>{while(button('Mostra altri'))await click(button('Mostra altri'));return ids();};
const props={monsters,initialTaglia:null,initialTipo:null,initialGs:null};
(async()=>{
 const status=()=>document.querySelector('[role="status"]').textContent;
 const applyButton=()=>[...document.querySelectorAll('button')].find(b=>/^Mostra \d+ risultat/.test(b.textContent.trim()));
 const chips=()=>[...document.querySelectorAll('[aria-label="Filtri attivi"] button')].map(b=>b.textContent.trim());
 const sheet=()=>document.querySelector('dialog');
 const choose=async(...labels)=>{for(const label of labels)await click([...sheet().querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.trim()===label));};
 const filterWith=async(...labels)=>{await click(button('Filtri'));await choose(...labels);await click(applyButton());};
 const animal=load('lib/monsters-types.ts').isSrdAnimal,typeCategory=load('lib/monsters-types.ts').typeCategory;
 const sheets2024=monsters.filter(m=>m.edizione==='2024'),sheets2014=monsters.filter(m=>m.edizione==='2014');
 const expect=(list,test)=>list.filter(test).map(m=>m.id).sort();
 await act(async()=>root.render(React.createElement(BestiarioBrowser,props)));
 // One list: monsters and animals together, the 2024 edition by default.
 assert.equal(document.querySelector('h1').textContent,'Bestiario');
 assert.equal(status(),'Nome · 330 risultati');
 assert.ok(!document.querySelector('[role="group"][aria-label="Sezioni del bestiario"]'),'the Mostri/Animali tabs are replaced by one list');
 assert.equal(ids().length,40,'the bestiary renders 40 rows per page');assert.match(button('Mostra altri').textContent,/290/);
 assert.equal((await allIds()).length,330);assert.ok(ids().includes('aboleth')&&ids().includes('gatto'));assert.ok(!ids().some(id=>id.endsWith('-2014')),'2014 sheets are only in the 2014 list');
 assert.equal(button('Filtri').getAttribute('aria-label'),'Filtri','no count without filters');assert.deepEqual(chips(),[]);
 // Filter panel: the result button counts the choice before it is applied.
 await click(button('Filtri'));
 assert.ok(sheet().hasAttribute('open'));
 await choose('Animali');assert.equal(applyButton().textContent.trim(),'Mostra 95 risultati');
 await choose('0 – 1');
 const smallAnimals=expect(sheets2024,m=>animal(m)&&m.gs_num<=1);
 assert.equal(applyButton().textContent.trim(),`Mostra ${smallAnimals.length} risultati`);
 assert.equal(status(),'Nome · 330 risultati','nothing changes before "Mostra"');
 await click(applyButton());
 assert.ok(!sheet().hasAttribute('open'));
 assert.deepEqual((await allIds()).sort(),smallAnimals);
 assert.deepEqual(chips(),['Animali','GS 0 – 1']);
 assert.equal(button('Filtri').getAttribute('aria-label'),'Filtri, 2 attivi');
 await click(document.querySelector('[aria-label="Togli il filtro GS 0 – 1"]'));
 assert.equal((await allIds()).length,95,'the × removes one filter');
 // "o" inside a filter, "e" between filters.
 await click(button('Filtri'));await click(button('Azzera'));await choose('Drago','Gigante');await click(applyButton());
 assert.deepEqual((await allIds()).sort(),expect(sheets2024,m=>['Drago','Gigante'].includes(typeCategory(m.tipo))));
 await filterWith('Enorme');
 const hugeDragonsGiants=expect(sheets2024,m=>['Drago','Gigante'].includes(typeCategory(m.tipo))&&m.taglia==='Enorme');
 assert.ok(hugeDragonsGiants.length>0);assert.deepEqual((await allIds()).sort(),hugeDragonsGiants);
 await filterWith('0 – 1','17+');
 assert.deepEqual((await allIds()).sort(),expect(sheets2024,m=>['Drago','Gigante'].includes(typeCategory(m.tipo))&&m.taglia==='Enorme'&&(m.gs_num<=1||m.gs_num>=17)));
 // Closing the panel without "Mostra" keeps the filters in use.
 await click(button('Filtri'));await click(button('Azzera'));await click(sheet());
 assert.deepEqual(chips(),['GS 0 – 1','GS 17+','Drago','Gigante','Enorme']);
 await click(button('Filtri'));await click(button('Azzera'));await click(applyButton());
 assert.equal((await allIds()).length,330);assert.deepEqual(chips(),[]);
 await input('gatto');assert.deepEqual(ids(),['gatto']);await input('');
 // Habitat: several can be chosen; a creature living in at least one is shown, "Qualsiasi" lives everywhere.
 await click(button('Filtri'));
 assert.equal([...sheet().querySelectorAll('button[aria-pressed]')].filter(b=>['Artico','Qualsiasi'].includes(b.textContent)).length,2,'the fixed list of 13 habitats is offered');
 await choose('Urbano');await click(applyButton());
 assert.deepEqual((await allIds()).sort(),['gatto','topo']);
 await filterWith('Montagna');
 assert.deepEqual((await allIds()).sort(),['aquila','gatto','topo'],'either habitat matches');
 // Edition selector: the 2014 list holds the SRD 5.1 sheets, remembered on this phone; filters restart.
 assert.equal(button('2024').getAttribute('aria-pressed'),'true');
 await click(button('2014'));
 assert.equal(button('2014').getAttribute('aria-pressed'),'true');assert.deepEqual(chips(),[]);
 assert.equal(status(),`Nome · ${sheets2014.length} risultati`);
 assert.deepEqual((await allIds()).sort(),sheets2014.map(m=>m.id).sort());
 assert.ok(ids().includes('topo-gigante-contagioso-2014')&&ids().includes('orco-2014'));
 await filterWith('Animali');assert.deepEqual((await allIds()).sort(),expect(sheets2014,animal));
 assert.equal(window.localStorage.getItem('grimorio.bestiario.edizione'),'2014');
 await click(button('Filtri'));assert.ok([...sheet().querySelectorAll('button')].some(b=>b.textContent==='Umanoide'),'filters offer the values of the chosen edition');await click(sheet());
 await click(button('2024'));
 assert.equal(status(),'Nome · 330 risultati');assert.equal(window.localStorage.getItem('grimorio.bestiario.edizione'),'2024');
 const spells=Array.from({length:400},(_,i)=>({id:`spell-${i}`,nome_italiano:`Incantesimo ${String(i).padStart(3,'0')}`,livello_num:Math.floor(i/40),scuola:'invocazione',classi:['mago']}));
 await act(async()=>root.render(React.createElement(GrimorioBrowser,{spells,meta:{livelli:[0,1,2,3,4,5,6,7,8,9],scuole:['invocazione'],classi:['mago']}})));
 assert.equal(document.querySelector('h1').textContent,'Incantesimi');
 assert.equal(document.querySelector('li.catalog-row h2').textContent,'Trucchetti');
 assert.ok(document.querySelector('li.catalog-row').textContent.includes('40 incantesimi'),'level header counts the level, not the page');
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
 await click(button('Filtri'));await choose('Livello 9');await click(applyButton());
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,40,'filters search the whole catalog and reset pagination');
 assert.ok(document.querySelector('a[href="/spell/spell-399"]'));
 // Rows: school and casting time, amber labels written in full only when they apply; 2014 list and filters.
 const labelled=[
  {id:'conc',nome_italiano:'Con concentrazione',livello_num:1,scuola:'Evocazione',classi:['mago'],tempo_di_lancio:'Azione',concentrazione:true},
  {id:'rit',nome_italiano:'Rituale semplice',livello_num:1,scuola:'Divinazione',classi:['chierico'],tempo_di_lancio:'1 minuto o rituale',rituale:true},
  {id:'both',nome_italiano:'Entrambi',livello_num:2,scuola:'Divinazione',classi:['mago'],tempo_di_lancio:'10 minuti',concentrazione:true,rituale:true},
  {id:'none',nome_italiano:'Nessuna etichetta',livello_num:0,scuola:'Evocazione',classi:['mago'],tempo_di_lancio:'Azione'},
  {id:'old',nome_italiano:'Incantesimo 2014',livello_num:3,scuola:'Evocazione',classi:['mago'],tempo_di_lancio:'Azione',edizione:'2014'},
 ];
 await act(async()=>root.render(React.createElement(GrimorioBrowser,{key:'labels',spells:labelled,meta:{livelli:[0,1,2,3],scuole:['Divinazione','Evocazione'],classi:['chierico','mago']}})));
 const row=id=>document.querySelector(`a[href="/spell/${id}"]`).textContent;
 assert.ok(row('conc').includes('Evocazione · Azione')&&row('conc').includes('Concentrazione')&&!row('conc').includes('Rituale'));
 assert.ok(row('both').includes('Concentrazione')&&row('both').includes('Rituale'));
 assert.ok(!row('none').includes('Concentrazione')&&!row('none').includes('Rituale'),'no placeholder labels');
 assert.ok(!document.querySelector('a[href="/spell/old"]'),'2014 spells only in the 2014 list');
 await filterWith('Rituale');assert.deepEqual([...document.querySelectorAll('a[href^="/spell/"]')].map(a=>a.getAttribute('href')),['/spell/rit','/spell/both']);
 await filterWith('Concentrazione');assert.deepEqual([...document.querySelectorAll('a[href^="/spell/"]')].map(a=>a.getAttribute('href')),['/spell/both'],'"e" between filters');
 await click(button('Filtri'));await click(button('Azzera'));await choose('Livello 1','Livello 2');await click(applyButton());
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,3,'"o" inside the level filter');
 await click(button('2014'));assert.deepEqual([...document.querySelectorAll('a[href^="/spell/"]')].map(a=>a.getAttribute('href')),['/spell/old']);
 assert.equal(window.localStorage.getItem('grimorio.incantesimi.edizione'),'2014');window.localStorage.removeItem('grimorio.incantesimi.edizione');
 // Without 2014 spells in the catalog there is no 2014 selector and no empty list, even if 2014 was remembered.
 await act(async()=>root.render(React.createElement(GrimorioBrowser,{key:'no-2014',spells:labelled.filter(s=>!s.edizione),meta:{livelli:[0,1,2],scuole:['Divinazione','Evocazione'],classi:['chierico','mago']},initialEdizione:'2014'})));
 assert.ok(!document.querySelector('[aria-label="Edizione delle regole"]'),'no edition selector while the catalog has no 2014 spells');
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,4,'the 2024 list is shown');
 // Real provider + memoized rows: preserve existing storage on mount and render
 // only the affected row when toggling, including React StrictMode effects.
 const provider=load('components/favorites-provider.tsx');
 Object.assign(favoritesDependency,provider);
 const storageKey='grimorio.favorites.v1';
 window.localStorage.setItem(storageKey,JSON.stringify(['spell-0','mostro:gatto']));
 const storagePrototype=Object.getPrototypeOf(window.localStorage),originalSet=storagePrototype.setItem,writes=[];
 storagePrototype.setItem=function(key,value){if(key===storageKey)writes.push(value);return originalSet.call(this,key,value)};
 const types=load('lib/spells-types.ts'),originalCapitalize=types.capitalizeWords,renderCounts=new Map();
 types.capitalizeWords=text=>{renderCounts.set(text,(renderCounts.get(text)||0)+1);return originalCapitalize(text)};
 const pair=[{...spells[0],nome_italiano:'Abiurazione',scuola:'Abiurazione'},{...spells[1],nome_italiano:'Evocazione',scuola:'Evocazione'}];
 const pairProps={spells:pair,meta:{livelli:[0],scuole:['Abiurazione','Evocazione'],classi:['mago']}};
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
 types.capitalizeWords=originalCapitalize;storagePrototype.setItem=originalSet;
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
 assert.deepEqual(chips(),['Animali','GS 0 – 1'],'older links (?raccolta=animali&gs=0) open the same filters');
 assert.deepEqual((await allIds()).sort(),expect(sheets2024,m=>animal(m)&&m.gs_num<=1));
 await act(async()=>navigateQuery('raccolta=mostri'));await act(async()=>root.render(renderMonsterUrl()));
 assert.equal((await allIds()).length,235,'same-path query changes switch category and clear old filters');
 await act(async()=>navigateQuery(''));await act(async()=>root.render(renderMonsterUrl()));
 assert.equal((await allIds()).length,330,'unfiltered URL shows the whole list');
 await act(async()=>navigateQuery('gs=0-1,2-4&tipo=Bestia&taglia=Piccola,Media'));await act(async()=>root.render(renderMonsterUrl()));
 assert.deepEqual(chips(),['GS 0 – 1','GS 2 – 4','Bestia','Piccola','Media']);
 assert.deepEqual((await allIds()).sort(),expect(sheets2024,m=>m.gs_num<=4&&typeCategory(m.tipo)==='Bestia'&&['Piccola','Media'].includes(m.taglia)));
 // The edition last chosen on this phone is used when no address asks for one; the address wins.
 window.localStorage.setItem('grimorio.bestiario.edizione','2014');
 await act(async()=>root.render(React.createElement('div')));
 await new Promise(r=>setTimeout(r,3100)); // a fresh arrival, not "back" from a card
 await act(async()=>root.render(renderMonsterUrl()));
 assert.equal(button('2014').getAttribute('aria-pressed'),'true','the remembered edition opens');
 await act(async()=>navigateQuery('edizione=2024&habitat=Urbano,Inventato'));await act(async()=>root.render(renderMonsterUrl()));
 assert.equal(button('2024').getAttribute('aria-pressed'),'true','an address with an edition wins');
 await act(async()=>navigateQuery('edizione=2024&raccolta=animali&habitat=Urbano,Inventato'));await act(async()=>root.render(renderMonsterUrl()));
 assert.deepEqual((await allIds()).sort(),['gatto','topo'],'habitat filters from the address, unknown names ignored');
 window.localStorage.removeItem('grimorio.bestiario.edizione');await act(async()=>navigateQuery(''));
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
 assert.deepEqual(chips(),['Animali','GS 0 – 1'],'an exact GS from an older link opens its band');
 assert.deepEqual((await allIds()).sort(),expect(sheets2024,m=>animal(m)&&m.gs_num<=1));
 // Back from a card restores search, filters, pages shown and scroll; other arrivals start fresh.
 const back=()=>act(async()=>window.dispatchEvent(new window.PopStateEvent('popstate')));
 const scrolled=[];window.scrollTo=(x,y)=>scrolled.push(y);
 const nextFrames=()=>act(async()=>{await new Promise(r=>setTimeout(r,50));});
 window.requestAnimationFrame=cb=>setTimeout(cb,0);
 await act(async()=>navigateQuery(''));
 await act(async()=>root.render(React.createElement('div')));
 await act(async()=>root.render(renderSpellUrl()));
 await input('incantesimo');await click(button('Mostra altri'));
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,80);
 Object.defineProperty(window,'scrollY',{value:1234,configurable:true});
 await click(document.querySelector('a[href="/spell/spell-70"]'));
 await act(async()=>root.render(React.createElement('div')));
 await back();await act(async()=>root.render(renderSpellUrl()));await nextFrames();
 assert.equal(document.querySelector('input').value,'incantesimo','back restores the search');
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,80,'back restores the pages shown');
 assert.equal(scrolled.at(-1),1234,'back restores the scroll position');
 await act(async()=>root.render(React.createElement('div')));
 await new Promise(r=>setTimeout(r,3100));
 await act(async()=>root.render(renderSpellUrl()));await nextFrames();
 assert.equal(document.querySelector('input').value,'','arriving from the navigation bar starts fresh');
 assert.equal(document.querySelectorAll('a[href^="/spell/"]').length,40);
 await act(async()=>navigateQuery('raccolta=animali'));await act(async()=>root.render(React.createElement('div')));
 await act(async()=>root.render(renderMonsterUrl()));
 await click(button('Mostra altri'));
 await click(document.querySelector('a[href^="/mostro/"]'));
 await act(async()=>root.render(React.createElement('div')));
 await back();await act(async()=>root.render(renderMonsterUrl()));await nextFrames();
 assert.deepEqual(chips(),['Animali']);
 assert.equal(ids().length,80,'the bestiary also restores the pages shown');
 await act(async()=>navigateQuery('raccolta=mostri'));await back();await act(async()=>root.render(renderMonsterUrl()));await nextFrames();
 assert.equal(ids().length,40,'a list with a different URL is not restored from another one');
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
 console.log('Catalogs: one 40-row bestiary list and spell pages, 2024|2014 edition remembered, filter panel (or within, and between, removable labels, older links), multi-habitat filter, show more, list restored after back, full-catalog deferred search, filter/page reset, level groups and keyboard access passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
