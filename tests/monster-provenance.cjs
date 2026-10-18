const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {createElement} = require('react');
const {renderToStaticMarkup} = require('react-dom/server');

function load(relative) {
  const filename = path.resolve(relative);
  const module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
  }).outputText;
  new Function('require', 'module', 'exports', code)(createRequire(filename), module, module.exports);
  return module.exports;
}

const {getSrdMonsterSource} = load('lib/srd-monsters.ts');
const records = ['srd-monsters-5.2.1-it.json', 'srd-animals-5.2.1-it.json']
  .flatMap(file => JSON.parse(fs.readFileSync('lib/data/' + file)).records);
assert.equal(records.length, 330);
for (const record of records) {
  const source = getSrdMonsterSource(record.monster);
  assert.equal(source.document, 'SRD 5.2.1', record.monster.id + ': actual document');
  assert.equal(source.edition, '2024', record.monster.id + ': rules edition');
  assert.equal(source.page, record.page);
  assert.ok(source.sourceUrl.endsWith('IT_SRD_CC_v5.2.1.pdf'));
  assert.equal(getSrdMonsterSource({...record.monster, azioni: 'Scheda modificata'}), undefined);
}
assert.equal(getSrdMonsterSource({...records[0].monster, id: 'mostro-non-verificato'}), undefined);

const {MonsterProvenanceBadge} = load('components/monster-provenance-badge.tsx');
const source = getSrdMonsterSource(records[0].monster);
const render = props => renderToStaticMarkup(createElement(MonsterProvenanceBadge, props));
const compact = render({source});
assert.ok(compact.includes('SRD 5.2.1') && compact.includes('D&amp;D 5e (2024)'));
assert.ok(!compact.includes('<a'), 'catalog badges must not nest links in the row link');
const detail = render({source, linked: true});
assert.ok(detail.includes(`href="${source.sourceUrl}#page=${source.page}"`));
assert.ok(detail.includes('target="_blank"') && detail.includes('noreferrer'));
const unknown = render({});
assert.ok(unknown.includes('Fonte da verificare'));
assert.ok(!unknown.includes('SRD 5.2.1') && !unknown.includes('2024') && !unknown.includes('<a'));
console.log('Monster provenance: 330 verified documents/editions/pages, edited/unknown safeguards and accessible linked/compact badges passed.');
