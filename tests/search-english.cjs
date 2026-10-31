// English names «solo ricerca» of the NO SRD cards (PROMPT 37): protected names refused, the normalized key, the
// proposals of the project, the hidden keys of the index (found, never shown, synonyms first).
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/search-english.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const {protectedNamesIn,searchKey,searchEnglishError,PROTECTED_NAMES}=require('../lib/search-english.ts');
const {rowsOf,search}=require('../lib/search.ts');
const {withSynonyms,foundInEnglish}=require('../lib/search-insights.ts');
const {englishOf}=require('../lib/english-match.ts');

// Protected: whole words, any case, the possessive too; the free part of a name is accepted.
for(const name of ["Tasha's Hideous Laughter","TASHA’S BUBBLING CAULDRON","Mordenkainen's Sword","Bigby's Hand","Melf's Acid Arrow","Otiluke's Resilient Sphere","Leomund's Tiny Hut","Evard's Black Tentacles","Rary's Telepathic Bond","Tenser's Floating Disk","Drawmij's Instant Summons","Nystul's Magic Aura","Otto's Irresistible Dance","Abi-Dalzim's Horrid Wilting","Beholder","Mind Flayer","mind-flayer","Illithid","Githyanki","Githzerai","Yuan-ti Pureblood","Yuan ti","Displacer Beast","Carrion Crawler","Umber Hulk","Hunger of Hadar","Armor of Agathys"])
  assert.ok(protectedNamesIn(name).length,`refused: ${name}`);
for(const name of ["Hideous Laughter","Synaptic Static","Bubbling Cauldron","Resilient Sphere","Witch Bolt","Mind Sliver","Crusader's Mantle","Toll the Dead","Mindflayers are cool".replace('flayers','flay')])
  assert.deepEqual(protectedNamesIn(name),[],`accepted: ${name}`);
assert.deepEqual(protectedNamesIn('Tashas cauldron'),[],'«Tashas» is another word');
assert.deepEqual(protectedNamesIn('otto'),[],'«Otto» only with the capital, as in «Nomi da rivedere»');
assert.ok(PROTECTED_NAMES.some(item=>item.nome==='Mind Flayer'));
assert.match(searchEnglishError("Tasha's Hideous Laughter"),/«Tasha» è un nome protetto e non si può usare/);
assert.match(searchEnglishError("Tasha's Hideous Laughter"),/Hideous Laughter/,'the message says what can be used');
assert.equal(searchEnglishError('Hideous Laughter'),null);
assert.equal(searchEnglishError(''),null,'empty: removes the name');
assert.match(searchEnglishError('x'.repeat(81)),/troppo lungo/);
assert.match(searchEnglishError('<b>Fire</b>'),/solo lettere/);
assert.match(searchEnglishError('123'),/solo lettere/);

// The key of the index: lowercase, no accents, apostrophes and dashes as spaces, one space.
assert.equal(searchKey('Synaptic Static'),'synaptic static');
assert.equal(searchKey("Crusader's  Mantle"),'crusader s mantle');
assert.equal(searchKey('Évocation—Wave'),'evocation wave');

// The proposals of the project: cards of the summaries, never SRD, never a protected name.
const proposals=JSON.parse(fs.readFileSync('lib/data/nomi-inglesi-proposte.json','utf8'));
const originals=JSON.parse(fs.readFileSync('lib/data/original-descriptions-2024.json','utf8')).spells;
const srd=JSON.parse(fs.readFileSync('lib/data/nomi-inglesi-srd.json','utf8'));
const srdIds=new Set([...Object.keys(srd['2014'].incantesimi),...Object.keys(srd['2024'].incantesimi)]);
const byId=new Map(originals.map(spell=>[spell.id,spell]));
assert.equal(Object.keys(proposals.incantesimi).length,50);assert.equal(proposals.senzaProposta.incantesimi.length,3);
assert.deepEqual(Object.keys(proposals.mostri),[]);
for(const [id,name] of Object.entries(proposals.incantesimi)){
  assert.ok(byId.has(id),id);assert.ok(!srdIds.has(id),`${id} is not SRD`);
  assert.equal(searchEnglishError(name),null,`${id}: ${name}`);
  // The name of the manual, or its part without the protected name.
  assert.ok(byId.get(id).sourceName.endsWith(name),`${id}: ${name} from ${byId.get(id).sourceName}`);
}
assert.equal(proposals.incantesimi['scossa-sinaptica'],'Synaptic Static');
assert.equal(proposals.incantesimi['calderone-ribollente-di-tasha'],'Bubbling Cauldron');
assert.deepEqual(proposals.senzaProposta.incantesimi.sort(),['armatura-di-agathys','braccia-di-hadar','fame-di-hadar']);

// PROMPT 38: an approved name is the English name of its card in the index, like the SRD ones: found partially and
// with typos, shown «in inglese» with the letters found.
const index={v:1,sections:[{k:'incantesimi',t:'Incantesimi'}],rows:[[0,'Scossa sinaptica','Ammaliamento · liv. 5','/spell/scossa-sinaptica'],[0,'Benedizione','Ammaliamento · liv. 1','/spell/benedizione','/spell/benedizione-2014'],[0,'Bestia','liv. 2','/spell/bestia']],en:[['Bless',1],['Synaptic Static',0]]};
const hits=(idx,query)=>search(idx,rowsOf(idx),query,{settled:true}).flatMap(group=>group.rows);
for(const query of ['synaptic static','synaptic','Synaptic Static','synaptc static','static'])
  assert.deepEqual(hits(index,query).map(row=>row.nome),['Scossa sinaptica'],query);
const hit=hits(index,'synaptic')[0];
assert.equal(hit.english,true,'an English name to show');
assert.deepEqual(englishOf(hit.nome,hit.en,'synaptic'),englishOf('Scossa sinaptica',['Synaptic Static'],'synaptic'));
assert.ok(englishOf(hit.nome,hit.en,'synaptic'),'the line «in inglese»');
// The synonyms of the reserved area first: a synonym written as the name takes it out.
const syn=withSynonyms(index,[{query:'synaptic static',href:'/spell/bestia'}]);
assert.deepEqual(syn.en,[['Bless',1]]);
assert.deepEqual(hits(syn,'synaptic static').map(row=>row.nome),['Bestia']);
// «Ricerche senza risultato»: a word found by an approved name leaves the list.
assert.equal(foundInEnglish('synaptic static',index),true);
assert.equal(foundInEnglish('synaptic static',{...index,en:[['Bless',1]]}),false);
console.log('Search English (NO SRD): protected names refused, 50 proposals (3 left empty), approved names found and shown «in inglese», synonyms first.');
