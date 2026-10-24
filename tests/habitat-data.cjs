// Habitats of the Bestiario (lib/data/habitat-mostri.json): our own classification, not SRD text.
// Every creature of the catalog, 2024 and 2014, has at least one habitat from the 13 of lib/habitats.ts,
// stored under the 2024 sheet for the linked 2014 ones; the habitat filter finds the expected creatures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const cache = new Map();
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = {exports:{}}; cache.set(filename,mod);
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id => {
    if (id === 'server-only') return {};
    if (id === './db') return {pool:{query:async()=>({rows:[]})}};
    if (id.startsWith('@/') || id.startsWith('./')) {
      const file = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename),id);
      if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file,'utf8'));
      for (const candidate of [file+'.ts', file+'.tsx']) if (fs.existsSync(candidate)) return load(candidate);
    }
    return createRequire(filename)(id);
  },mod,mod.exports);
  return mod.exports;
}

const h = load('lib/habitats.ts');
const srd = load('lib/srd-monsters.ts');
const storage = load('lib/monster-habitats.ts');
const file = JSON.parse(fs.readFileSync('lib/data/habitat-mostri.json','utf8'));
const catalog = srd.previewMonsters([],'production').map(m => ({...m, edizione: srd.usesLegacyMonsterRules(m) ? '2014' : '2024'}));
const ids = new Set(catalog.map(m => m.id));
const habitatOf = id => storage.resolveHabitats(id,new Map());

// The catalog: 330 creatures of 2024 and 322 of 2014.
assert.equal(catalog.filter(m => m.edizione === '2024').length,330);
assert.equal(catalog.filter(m => m.edizione === '2014').length,322);

// The file: existing keys (the 2024 sheet for a linked 2014 one), only the 13 habitats, in their order, never empty.
assert.equal(Object.keys(file).length,335);
for (const [key,list] of Object.entries(file)) {
  assert.ok(ids.has(key),`habitat-mostri.json: ${key} is not in the catalog`);
  assert.equal(h.habitatKey(key),key,`habitat-mostri.json: ${key} is a linked 2014 sheet, its habitat goes under the 2024 one`);
  assert.ok(Array.isArray(list) && list.length,`habitat-mostri.json: ${key} has no habitat`);
  assert.ok(list.every(value => h.HABITATS.includes(value)),`habitat-mostri.json: ${key} has a value outside the 13`);
  assert.deepEqual(h.normalizeHabitats(list),list,`habitat-mostri.json: ${key} in the order of lib/habitats.ts, no repeats`);
}
assert.equal(Object.keys(file).filter(key => key.endsWith('-2014')).length,5,'the five 2014-only creatures');

// Every creature of the catalog, 2024 and 2014, has at least one habitat.
const without = catalog.filter(m => !habitatOf(m.id).length).map(m => m.id);
assert.deepEqual(without,[],`creatures without habitat: ${without.join(', ')}`);

// The habitat filter of the Bestiario (matchesHabitats on the habitat of each row).
const found = (habitat, edizione = '2024') => catalog.filter(m => m.edizione === edizione && h.matchesHabitats(habitatOf(m.id),[habitat])).map(m => m.id);
const swamp = found('Palude');
for (const id of ['idra','coccodrillo','megera-verde','drago-nero-cucciolo','drago-nero-giovane','drago-nero-adulto','drago-nero-antico']) assert.ok(swamp.includes(id),`Palude: ${id}`);
const arctic = found('Artico');
for (const id of ['drago-bianco-cucciolo','drago-bianco-giovane','drago-bianco-adulto','drago-bianco-antico','remorhaz','mammut','lupo-invernale']) assert.ok(arctic.includes(id),`Artico: ${id}`);
assert.ok(found('Palude','2014').includes('idra-2014') && found('Artico','2014').includes('remorhaz-2014'),'the 2014 list finds them too');
// «Qualsiasi» lives everywhere: the Lich comes up with every filter, in both editions.
assert.deepEqual(habitatOf('lich'),['Qualsiasi']);
for (const habitat of h.HABITATS) {
  assert.ok(found(habitat).includes('lich'),`Lich with ${habitat}`);
  assert.ok(found(habitat,'2014').includes('lich-2014'),`Lich 2014 with ${habitat}`);
}
// A linked 2014 sheet has the habitat of its 2024 one.
assert.equal(h.habitatKey('goblin-2014'),'goblin-guerriero');
assert.deepEqual(habitatOf('goblin-2014'),habitatOf('goblin-guerriero'));
assert.ok(habitatOf('goblin-2014').length);
for (const m of catalog.filter(m => m.edizione === '2014' && h.habitatKey(m.id) !== m.id)) assert.deepEqual(habitatOf(m.id),habitatOf(h.habitatKey(m.id)),m.id);

// The cached list of the Bestiario changes with the file: lib/monster-index.ts puts it in the fingerprint.
const index = fs.readFileSync('lib/monster-index.ts','utf8');
assert.match(index,/import habitats from "\.\/data\/habitat-mostri\.json";/);
assert.match(index,/JSON\.stringify\(\[listed, habitats, editionLinks, animalIds\]\)/);
assert.match(index,/\["monster-list-index", process\.env\.VERCEL_ENV \?\? "local", projectCatalogVersion\(\)\]/);

console.log(`Habitat data: ${Object.keys(file).length} keys in the catalog, only the 13 habitats, all ${catalog.length} creatures (2024 and 2014) with a habitat, Palude/Artico/Qualsiasi filters, linked 2014 sheets, list cache fingerprint passed.`);
