// PROMPT 8: spell addresses without proper names. Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/spell-public-id.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => (id.endsWith('.json') ? read(path.join(path.dirname(file), id)) : require(id)), mod, mod.exports);
  return mod.exports;
}
const { PUBLIC_SPELL_IDS, publicSpellId, storedSpellId, spellHref, spellIdOfPath } = load('lib/spell-public-id.ts');

// Every stored id known to the project files and the local test database (e2e/test-db.mjs), the merged duplicates included.
const slugify = name => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const stored = new Set([
  ...read('lib/data/srd-italiano-5.2.1.json').spells.map(s => s.id),
  ...read('lib/data/srd-spells-5.1-it.json').records.map(r => r.spell.id),
  ...read('lib/data/original-descriptions-2024.json').spells.map(s => s.id),
  ...read('lib/data/spell-reference-index.json').map(s => s.id),
  ...read('lib/data/incantesimi_2024.json').map(s => slugify(s.nome_italiano || '')),
  ...Object.keys(read('lib/data/merged-spell-ids.json')),
]);
const pairs = Object.entries(PUBLIC_SPELL_IDS);
assert.equal(pairs.length, 26);
assert.equal(new Set(pairs.map(([, open]) => open)).size, pairs.length, 'one address per card');
for (const [id, open] of pairs) {
  assert.notEqual(id, open);
  assert.ok(!stored.has(open), `${open}: never the address of another stored card`);
  assert.match(open, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(publicSpellId(id), open);
  assert.equal(storedSpellId(open), id);
  assert.equal(spellHref(id), `/spell/${open}`);
  assert.equal(spellIdOfPath(`/spell/${open}`), id, 'the new address reads the stored card');
  assert.equal(spellIdOfPath(`/spell/${id}`), id, 'an old address still names its card (statistics, reports)');
}
// The two ids asked by name, the 2014 rows with «-2»: now «-2014» as every 2014 address.
assert.equal(publicSpellId('veleni'), 'individuazione-delle-malattie-e-dei-veleni');
assert.equal(publicSpellId('i-re-spirare-sott-acqua-2'), 'respirare-sott-acqua');
for (const id of ['braccia-di-hadar-2', 'fame-di-hadar-2', 'armatura-di-agathis']) assert.match(publicSpellId(id), /-2014$/);
// Any other card keeps its address.
for (const id of ['palla-di-fuoco', 'palla-di-fuoco-2014', 'tempesta-radiosa']) {
  assert.equal(publicSpellId(id), id);
  assert.equal(storedSpellId(id), id);
}
assert.equal(spellIdOfPath('/mostro/orco'), undefined);
assert.equal(spellIdOfPath('/spell/%E0%A4%A'), undefined, 'a broken address is ignored');

// Every public link to a spell goes through spellHref: no page builds «/spell/<id>» by hand.
const files = [];
for (const dir of ['app', 'components', 'lib']) (function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) walk(full); else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
})(dir);
const manual = files.filter(file => /[`"']\/spell\/\$\{/.test(fs.readFileSync(file, 'utf8')) && file !== path.join('lib', 'spell-public-id.ts'));
assert.deepEqual(manual, [], `spell links built by hand: ${manual.join(', ')}`);
console.log(`Spell addresses: ${pairs.length} addresses without proper names, inverse mapping, no collision with ${stored.size} stored ids, every link through spellHref.`);
