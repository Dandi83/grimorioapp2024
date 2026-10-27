// Spell names as the Italian manual writes them (lib/spell-name.ts): first letter capital, proper names
// kept, checked against the SRD spellings of the whole catalog. Display only: the data are not touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const mod = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(relative), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  new Function('module', 'exports', code)(mod, mod.exports);
  return mod.exports;
}
const {spellName} = load('lib/spell-name.ts');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

for (const [stored, shown] of [
  ['PALLA DI FUOCO', 'Palla di fuoco'], ['Palla Di Fuoco', 'Palla di fuoco'], ['ALLARME', 'Allarme'], ['ACULEO MENTALE', 'Aculeo mentale'],
  ['PAROLA DEL POTERE STORDIRE', 'Parola del potere stordire'], ['MANO DI BIGBY', 'Mano di Bigby'], ['RISATA INCONTENIBILE DI TASHA', 'Risata incontenibile di Tasha'],
  ['DANZA IRRESISTIBILE DI OTTO', 'Danza irresistibile di Otto'], ['FIOTTO ACIDO', 'Fiotto acido'], ['SFERA ELASTICA DI 0TILUKE', 'Sfera elastica di Otiluke'],
  ['Cura Ferite di Massa', 'Cura ferite di massa'], ["RESPIRARE SOTT'ACQUA", "Respirare sott'acqua"], ["Aura magica dell'arcanista", "Aura magica dell'arcanista"],
]) assert.equal(spellName(stored), shown, stored);

// The 319 cards of the SRD 5.1 file keep exactly their spelling.
const legacy = read('lib/data/srd-spells-5.1-it.json').records.map(r => r.spell.nome_italiano);
for (const name of legacy) assert.equal(spellName(name, '2014'), name, name);
assert.equal(spellName(legacy.join(' ').toUpperCase()).length > 0, true);
for (const name of legacy) assert.equal(spellName(name.toUpperCase(), '2014'), name, `${name} from capitals`);
assert.equal(spellName('ANTIPATIA/SIMPATIA'), 'Antipatia/simpatia', 'SRD 5.2.1 spelling for 2024');
// SRD 5.2.1: the printed name (without the proper names the SRD leaves out) is the start of the name shown.
const srd = read('lib/data/srd-italiano-5.2.1.json').spells;
let compared = 0;
for (const spell of srd) {
  if (!spell.appName.toLowerCase().startsWith(spell.sourceName.toLowerCase())) continue;
  assert.ok(spellName(spell.appName, '2024').startsWith(spell.sourceName), `${spell.appName} → ${spellName(spell.appName)} (SRD: ${spell.sourceName})`);
  compared++;
}
assert.ok(compared > 300, `${compared} SRD 5.2.1 names compared`);

// Names with a capital inside after the conversion: listed for a check one by one.
const catalog = [...new Set([
  ...read('lib/data/incantesimi_2024.json').map(s => s.nome_italiano), ...srd.map(s => s.appName), ...legacy,
  ...read('lib/data/original-descriptions-2024.json').spells.map(s => s.nome_italiano),
].map(spellName))].sort((a, b) => a.localeCompare(b, 'it'));
const inner = catalog.filter(name => /\s\p{Lu}|\p{L}'\p{Lu}/u.test(name));
assert.ok(inner.every(name => /(Agathys|Bigby|Drawmij|Evard|Hadar|Leomund|Melf|Mordenkainen|Nystul|Otiluke|Otto|Rary|Tasha|Tenser|Yolande)$/.test(name)), inner.join(', '));
if (process.argv.includes('--list')) console.log(inner.join('\n'));
// The site uses it everywhere a spell name is shown; the stored names are never rewritten.
for (const file of ['app/spell/[id]/page.tsx', 'components/grimorio-browser.tsx', 'components/spell-row.tsx', 'lib/search-index.ts', 'components/admin-spell-editor.tsx', 'lib/admin-lists.ts', 'app/admin/registro/page.tsx'])
  assert.match(fs.readFileSync(file, 'utf8'), /spellName\(/, file);
assert.doesNotMatch(fs.readFileSync('app/actions/admin.ts', 'utf8'), /spellName/, 'never used to save');
console.log(`Spell names: manual spelling (first letter only, proper names kept) for ${catalog.length} names, 319 SRD 5.1 identical, ${compared} SRD 5.2.1 matching, ${inner.length} with proper names.`);
