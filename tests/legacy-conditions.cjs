const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {createElement} = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(relative, deps = {}) {
  const file = path.resolve(relative), mod = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
  new Function('require', 'module', 'exports', code)(id => deps[id] ?? createRequire(file)(id), mod, mod.exports);
  return mod.exports;
}

const conditions = load('lib/conditions.ts');
const legacy = conditions.legacyConditions;
// The Italian SRD 5.1 prints 11 conditions (pp. 406-407): Prono, Spaventato, Stordito and Trattenuto are not in it.
assert.deepEqual(legacy.map(entry => entry.title), ['Accecato', 'Affascinato', 'Afferrato', 'Assordato', 'Avvelenato', 'Incapacitato', 'Indebolimento', 'Invisibile', 'Paralizzato', 'Pietrificato', 'Privo di sensi']);
for (const entry of legacy) {
  assert.equal(entry.id, conditions.conditions.find(current => current.title === entry.title).id + '-2014', entry.title + ': 2014 address next to the 2024 one');
  assert.equal(entry.edizione, '2014');
  assert.ok(entry.pages.every(page => page === 406 || page === 407));
  assert.ok(entry.blocks.length > 0);
}
assert.ok(legacy.find(entry => entry.title === 'Indebolimento').blocks.some(block => block.kind === 'table' && block.text.includes('6         Morte')), 'six exhaustion levels of the 2014 rules');

const refs = conditions.legacyInlineConditionReferences;
assert.ok(refs.every(reference => reference.href.endsWith('-2014')), '2014 references never open 2024 definitions');
for (const missing of ['prono', 'spaventato', 'stordito', 'trattenuto']) assert.ok(!refs.some(reference => reference.label === missing), missing + ' stays plain text on 2014 sheets');
assert.ok(refs.some(reference => reference.label === 'paralizzata' && reference.href === '/manuale/condizioni-paralizzato-2014'));
assert.ok(conditions.inlineConditionReferences.every(reference => !reference.href.endsWith('-2014')), '2024 sheets unchanged');

const html = load('components/html-text.tsx');
const {LegacyConditionContent} = load('components/condition-content.tsx', {'@/components/html-text': html, '@/lib/conditions': conditions});
const paralizzato = renderToStaticMarkup(createElement(LegacyConditionContent, {entry: legacy.find(entry => entry.title === 'Paralizzato')}));
assert.equal((paralizzato.match(/<li /g) || []).length, 4, 'one item per printed bullet');
assert.ok(paralizzato.includes('href="/manuale/condizioni-incapacitato-2014"'), 'links to other 2014 conditions');
assert.ok(!paralizzato.includes('href="/manuale/condizioni-paralizzato-2014"'), 'no link to itself');
assert.ok(paralizzato.includes('regole 2014'));
const indebolimento = renderToStaticMarkup(createElement(LegacyConditionContent, {entry: legacy.find(entry => entry.title === 'Indebolimento')}));
assert.ok(indebolimento.includes('<pre') && indebolimento.includes('Punti ferita massimi dimezzati'));
console.log('2014 conditions: 11 printed in SRD 5.1, 2014-only links on 2014 sheets, missing ones plain, bullets and exhaustion table, 2024 unchanged.');
