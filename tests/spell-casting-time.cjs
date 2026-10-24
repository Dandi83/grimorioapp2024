const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const React=require('react');
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
const types=load('lib/spells-types.ts');
const {castingTimeGroup,slugify,parseLivello}=types;

// Values written in the request, and "Azione" never includes "Azione bonus".
for(const [value,group] of [['1 azione','azione'],['azione','azione'],['azione bonus','azione-bonus'],['1 azione bonus','azione-bonus'],
 ["1 reazione, che l'incantatore effettua quando è colpito","reazione"],["reazione, che l'incantatore effettua quando","reazione"],
 ['1 minuto','lungo'],['10 minuti','lungo'],['1 ora','lungo'],['8 ore','lungo'],['24 ore','lungo'],['1 minuto o rituale','lungo'],
 ['Azione o rituale','azione'],['1 azione o 8 ore','azione'],['Azione Bonus','azione-bonus']])
 assert.equal(castingTimeGroup(value),group,value);
assert.notEqual(castingTimeGroup('azione'),castingTimeGroup('azione bonus'));
// Stored values broken by the PDF text layer still count, as the detail page shows them.
for(const [value,group] of [['a5z°i one','azione'],['2az° ione bonus','azione-bonus'],['Ia 0 z ione bonus','azione-bonus'],['l minuto','lungo'],['o re','lungo'],['°l ora','lungo'],['lm inuto','lungo']])
 assert.equal(castingTimeGroup(value),group,value);
for(const value of ['','speciale',undefined])assert.equal(castingTimeGroup(value),undefined,String(value));

// Every real value of both editions falls in one option.
const count=list=>{const c={azione:0,'azione-bonus':0,reazione:0,lungo:0};const unknown=[];for(const [id,value] of list){const g=castingTimeGroup(value);if(g)c[g]++;else unknown.push(`${id}: ${value}`);}return {c,unknown};};
const legacy=require('../lib/data/srd-spells-5.1-it.json').records.map(r=>[r.spell.id,r.spell.tempo_di_lancio]);
const srd=require('../lib/data/srd-italiano-5.2.1.json').spells.map(s=>[s.id,s.tempo_di_lancio]);
const original=require('../lib/data/original-descriptions-2024.json').spells.map(s=>[s.id,s.tempo_di_lancio]);
const seed=require('../lib/data/incantesimi_2024.json').map(s=>[slugify(s.nome_italiano),s.tempo_di_lancio]);
const r2014=count(legacy),r2024=count([...srd,...original]),rSeed=count(seed);
for(const [name,r] of [['2014',r2014],['2024',r2024],['2024 starting file',rSeed]])assert.deepEqual(r.unknown,[],`${name}: every casting time is recognized`);
assert.deepEqual(r2014.c,{azione:242,'azione-bonus':14,reazione:4,lungo:59});
// The stored (starting) value and the verified text agree for every 2024 spell.
const verified=new Map([...srd,...original]);
for(const [id,value] of seed)if(verified.has(id))assert.equal(castingTimeGroup(value),castingTimeGroup(verified.get(id)),`${id}: "${value}" / "${verified.get(id)}"`);

// One way of showing the casting time everywhere (castingTimeLabel), the stored value untouched.
const {castingTimeLabel}=types;
for(const [value,shown] of [['1 azione','Azione'],['azione','Azione'],['Azione','Azione'],['1 azione bonus','Azione bonus'],['azione bonus','Azione bonus'],['Azione Bonus','Azione bonus'],
 ["azione bonus che l'incantatore effettua subito dopo","Azione bonus che l'incantatore effettua subito dopo"],
 ["1 reazione, che l'incantatore effettua quando è colpito","Reazione, che l'incantatore effettua quando è colpito"],["reazione, che l'incantatore effettua quando","Reazione, che l'incantatore effettua quando"],
 ['1 azione o rituale','Azione o rituale'],['azione o rituale','Azione o rituale'],['1 azione o 8 ore','Azione o 8 ore'],
 ['1 minuto','1 minuto'],['10 minuti','10 minuti'],['1 ora','1 ora'],['8 ore','8 ore'],['1 minuto o rituale','1 minuto o rituale'],['10 minuti o rituale','10 minuti o rituale'],
 ['Azione (Groviglio) o 8 ore (Fertilità)','Azione (Groviglio) o 8 ore (Fertilità)'],['','' ],[undefined,''],[null,'']])
 assert.equal(castingTimeLabel(value),shown,String(value));
// Every real value (both editions, the starting file and the approved display repairs): no «1 azione», a capital
// first letter, and the same filter option as the stored value (the «Tempo di lancio» counts do not change).
const repaired=Object.values(require('../lib/data/spell-casting-time-repairs-20261021.json').tempi).map(t=>['riparazione',t.a]);
for(const [id,value] of [...legacy,...srd,...original,...seed,...repaired]){
 const shown=castingTimeLabel(value);
 assert.equal(castingTimeGroup(shown),castingTimeGroup(value),`${id}: "${value}" → "${shown}"`);
 if(/^(1\s+)?(azione|reazione)/i.test(value.trim()))assert.match(shown,/^(Azione|Reazione)\b/,`${id}: "${value}" → "${shown}"`);
 assert.doesNotMatch(shown,/^1 (azione|reazione)/i);
 if(/^[a-z]/i.test(shown))assert.equal(shown[0],shown[0].toUpperCase(),shown);
}
for(const file of ['components/grimorio-browser.tsx','app/spell/[id]/page.tsx','components/admin-spell-editor.tsx'])assert.match(fs.readFileSync(file,'utf8'),/castingTimeLabel\(/,file);

(async()=>{
 // Filter panel: "o" inside the group, "e" with the other groups, live counter, 2014 list too.
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://grimorio.example.test/grimorio'});
 for(const key of ['window','document','HTMLElement','MouseEvent'])global[key]=dom.window[key];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const {act}=React,{createRoot}=require('react-dom/client');
 const {GrimorioBrowser,matchesSpellFilters,NO_SPELL_FILTERS}=load('components/grimorio-browser.tsx',{'@/components/favorites-provider':{useFavorites:()=>({isFavorite:()=>false,toggle:()=>{}})},
  'next/navigation':{useRouter:()=>({prefetch(){}}),usePathname:()=>'/grimorio'},'next/link':{__esModule:true,default:({children,...props})=>{delete props.prefetch;return React.createElement('a',props,children);}}});
 const row=([id,tempo],edizione,durata='')=>({id,nome_italiano:id,...parseLivello('Invocazione di 1° livello (mago)'),tempo_di_lancio:tempo,...types.spellListFlags({tempo_di_lancio:tempo,durata}),...(edizione?{edizione}:{})});
 const spells=[...srd.map(v=>row(v)),...legacy.map(v=>row(v,'2014'))];
 const expect=(list,f)=>list.filter(s=>matchesSpellFilters(s,{...NO_SPELL_FILTERS,...f})).length;
 const only2024=spells.filter(s=>!s.edizione),only2014=spells.filter(s=>s.edizione);
 assert.equal(expect(only2024,{tempo:['azione','reazione']}),expect(only2024,{tempo:['azione']})+expect(only2024,{tempo:['reazione']}),'"o" inside the group');
 assert.ok(expect(only2024,{tempo:['azione'],rituale:true})<expect(only2024,{tempo:['azione']}),'"e" with the other groups');
 const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(GrimorioBrowser,{spells,meta:{livelli:[1],scuole:['Invocazione'],classi:['mago']}})));
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(text));
 const click=async el=>{assert.ok(el);await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));};
 const group=()=>[...document.querySelectorAll('fieldset')].find(f=>f.querySelector('legend').textContent==='Tempo di lancio');
 for(const [edition,list] of [['2024',only2024],['2014',only2014]]){
  if(edition==='2014'){
   // The edition pill opens its panel: the 2014 choice.
   await click(document.querySelector('button[aria-label^="Edizione "]'));
   await click([...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].find(b=>b.textContent==='D&D 2014'));
  }
  await click(button('Filtri'));
  assert.deepEqual([...group().querySelectorAll('button')].map(b=>b.textContent),['Azione','Azione bonus','Reazione','1 minuto o più'],'a separate group with four options');
  assert.ok([...document.querySelectorAll('legend')].some(l=>l.textContent==='Caratteristiche'),'Concentrazione and Rituale keep their own group');
  await click([...group().querySelectorAll('button')].find(b=>b.textContent==='Azione'));
  await click([...group().querySelectorAll('button')].find(b=>b.textContent==='Reazione'));
  const n=expect(list,{tempo:['azione','reazione']});
  assert.equal(button('Mostra').textContent,`Mostra ${n} risultati`,`${edition}: counter`);
  await click(button('Mostra'));
  assert.equal(document.querySelector('[role="status"]').textContent,`${n} risultati`,`${edition}: list`);
  assert.ok([...document.querySelectorAll('[aria-label="Filtri attivi"] button')].map(b=>b.textContent).join(' ').includes('Azione'),'active filter chips');
 }
 await act(async()=>root.unmount());
 console.log(`Casting time filter: 2014 ${JSON.stringify(r2014.c)}, 2024 ${JSON.stringify(r2024.c)}; all values recognized, "o" inside the group and "e" between groups, both editions.`);
})().catch(e=>{console.error(e);process.exit(1)});
