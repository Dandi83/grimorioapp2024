const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');

// The lists of the reserved area (lib/admin-list-types.ts) and «Da fare» (lib/admin-checks.ts).
const deps={};
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='server-only')return {};
  if(id in deps)return deps[id];
  if(id.startsWith('./'))return load(path.resolve(path.dirname(filename),id)+'.ts');
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const list=load('lib/admin-list-types.ts');

const row=(id,extra={})=>({id,name:id,sub:'',group:list.spellGroup(1),source:'srd',hidden:false,editHref:'',publicHref:'',...extra});
const rows=[
 row('a'),
 row('b',{source:'nosrd',pill:'Sintesi',reviewNames:['Hadar']}),
 row('c',{source:'nosrd',modified:[{label:'Descrizione',diff:[]}]}),
 row('d',{hidden:true}),
 row('e',{hidden:null}),
];
const hidden=new Set(['d']);
const isHidden=r=>hidden.has(r.id);
const ids=f=>list.filterRows(rows,{...list.NO_FILTERS,...f},isHidden).map(r=>r.id);

// Filters: visibility (a card that cannot be hidden is neither visible nor hidden for the filter), provenance, checks.
assert.deepEqual(ids({}),['a','b','c','d','e']);
assert.deepEqual(ids({visibility:'nascoste'}),['d']);
assert.deepEqual(ids({visibility:'visibili'}),['a','b','c']);
assert.deepEqual(ids({source:'srd'}),['a','d','e']);
assert.deepEqual(ids({source:'nosrd'}),['b','c']);
assert.deepEqual(ids({modified:true}),['c']);
assert.deepEqual(ids({reviewNames:true}),['b']);
assert.deepEqual(ids({modified:true,reviewNames:true}),['b','c'],'both checks: the cards with either warning');
assert.deepEqual(ids({source:'nosrd',visibility:'visibili',reviewNames:true}),['b']);
assert.equal(list.activeFilterCount({visibility:'nascoste',source:'srd',modified:true,reviewNames:false}),3);
assert.equal(list.activeFilterCount(list.NO_FILTERS),0);
// Counts of the panel and of the counters: SRD + NO SRD + «Dalla redazione» + «Dalla community» = all.
const counts=list.filterCounts(rows,isHidden);
assert.deepEqual(counts,{all:5,hidden:1,srd:3,nosrd:2,redazione:0,community:0,modified:1,reviewNames:1});
assert.equal(counts.srd+counts.nosrd+counts.redazione+counts.community,counts.all);
// The original creatures (PROMPT 29, one «Creati da voi» until then): two sources of their own, never in «NO SRD».
const brewed=[...rows,{...rows[0],id:'h',source:'redazione',hidden:false},{...rows[0],id:'k',source:'community',hidden:false},{...rows[0],id:'j',source:'community',hidden:false}];
assert.deepEqual(list.filterCounts(brewed,isHidden).nosrd,2);
assert.deepEqual(list.filterCounts(brewed,isHidden).redazione,1);
assert.deepEqual(list.filterCounts(brewed,isHidden).community,2);
assert.deepEqual(list.filterRows(brewed,{...list.NO_FILTERS,source:'redazione'},isHidden).map(row=>row.id),['h']);
assert.deepEqual(list.filterRows(brewed,{...list.NO_FILTERS,source:'community'},isHidden).map(row=>row.id),['k','j']);
assert.ok(!list.filterRows(brewed,{...list.NO_FILTERS,source:'nosrd'},isHidden).some(row=>row.id==='h'));

// Groups: spells by level, creatures by challenge rating in numeric order, other contents by their kind or letter.
assert.deepEqual(list.spellGroup(0),{key:'0',label:'Trucchetti',order:0});
assert.equal(list.spellGroup(3).label,'3° livello');
const gs=['1/2','10','1/8','0','2','1/4','1'].map(g=>row(g,{group:list.challengeGroup(g,g.includes('/')?1/Number(g.split('/')[1]):Number(g))}));
assert.deepEqual(list.groupRows(gs).map(g=>g.label),['GS 0','GS 1/8','GS 1/4','GS 1/2','GS 1','GS 2','GS 10']);
const kinds=list.naturalGroups([{nome:'Ascia',etichetta:'Da guerra'},{nome:'Bastone',etichetta:'Semplice'}]);
assert.deepEqual(kinds({nome:'Ascia',etichetta:'Da guerra'}),{key:'g-Da guerra',label:'Da guerra',order:0});
const letters=list.naturalGroups(Array.from({length:20},(_,i)=>({nome:`Voce ${i}`,etichetta:`tipo ${i}`})));
assert.equal(letters({nome:'Élite',etichetta:'x'}).label,'E','too many kinds: the first letter, accents removed');

(async()=>{
 // «Da fare»: a check shows only with at least one item, in the order of the list; none at all: nothing.
 for(const dep of ['./feedback','./homebrew','./review-names-server','./srd-modified-server'])deps[dep]={};
 const checks=load('lib/admin-checks.ts');
 assert.deepEqual(checks.ADMIN_CHECKS.map(c=>c.key),['diritti','segnalazioni','proposte','srd-modificate','nomi-da-rivedere']);
 const make=(key,n)=>({key,count:async()=>{if(n instanceof Error)throw n;return n;},label:x=>`${key} ${x}`,href:`/${key}`});
 assert.deepEqual(await checks.dueChecks([make('a',2),make('b',0),make('c',1)]),[
  {key:'a',text:'a 2',href:'/a',count:2,urgent:false},{key:'c',text:'c 1',href:'/c',count:1,urgent:false}]);
 assert.deepEqual(await checks.dueChecks([make('a',0),make('b',0)]),[],'all at 0: the section disappears');
 assert.deepEqual(await checks.dueChecks([make('a',new Error('db')),make('b',3)]).then(d=>d.map(c=>c.key)),['b'],'a check that cannot be read hides');
 const srd=checks.ADMIN_CHECKS.find(c=>c.key==='srd-modificate');
 assert.equal(srd.label(18),'Controlla 18 schede SRD modificate');
 assert.equal(srd.label(1),'Controlla 1 scheda SRD modificata');
 assert.equal(checks.ADMIN_CHECKS.find(c=>c.key==='nomi-da-rivedere').label(4),'Rivedi 4 nomi a rischio');
 assert.equal(checks.ADMIN_CHECKS.find(c=>c.key==='diritti').urgent,true);
 console.log('Admin lists: filters, counts (SRD + NO SRD = all), groups by level, GS and kind; Da fare only with something to do.');
})().catch(error=>{console.error(error);process.exit(1);});
