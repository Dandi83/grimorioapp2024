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
// 15 conditions of the 2014 rules, A–Z: 11 printed in the Italian SRD 5.1 (pp. 406-407), and the 4 missing there in
// our translation of the English SRD 5.1 (Frightened p. 358; Prone, Restrained, Stunned p. 359).
assert.deepEqual(legacy.map(entry => entry.title), ['Accecato', 'Affascinato', 'Afferrato', 'Assordato', 'Avvelenato', 'Incapacitato', 'Indebolimento', 'Invisibile', 'Paralizzato', 'Pietrificato', 'Privo di sensi', 'Prono', 'Spaventato', 'Stordito', 'Trattenuto']);
const TRANSLATED = {
  Prono: ['Prone', 359, [
    "L'unica opzione di movimento di una creatura prona è strisciare, a meno che non si rialzi, ponendo così fine alla condizione.",
    'La creatura subisce svantaggio ai tiri per colpire.',
    "Un tiro per colpire contro la creatura ottiene vantaggio se l'attaccante è situato entro 1,5 metri dalla creatura. Altrimenti, il tiro per colpire subisce svantaggio."]],
  Spaventato: ['Frightened', 358, [
    'Una creatura spaventata subisce svantaggio alle prove di caratteristica e ai tiri per colpire finché la fonte della sua paura si trova entro la sua linea di vista.',
    'La creatura non può avvicinarsi volontariamente alla fonte della sua paura.']],
  Stordito: ['Stunned', 359, [
    'Una creatura stordita è incapacitata (vedi la relativa condizione), non può muoversi e può parlare solo in modo esitante.',
    'La creatura fallisce automaticamente i tiri salvezza su Forza e Destrezza.',
    'I tiri per colpire contro la creatura ottengono vantaggio.']],
  Trattenuto: ['Restrained', 359, [
    'La velocità di una creatura trattenuta diventa 0 e la creatura non può beneficiare di alcun bonus alla velocità.',
    'I tiri per colpire contro la creatura ottengono vantaggio e i tiri per colpire della creatura subiscono svantaggio.',
    'La creatura subisce svantaggio ai tiri salvezza su Destrezza.']],
};
const {createHash} = require('node:crypto');
for (const entry of legacy) {
  assert.equal(entry.id, conditions.conditions.find(current => current.title === entry.title).id + '-2014', entry.title + ': 2014 address next to the 2024 one');
  assert.equal(entry.edizione, '2014');
  assert.equal(entry.subgroup, 'Condizioni · regole 2014');
  assert.ok(entry.blocks.length > 0);
  const translated = TRANSLATED[entry.title];
  if (!translated) {
    assert.equal(entry.fonte, undefined, entry.title + ': printed in the Italian SRD 5.1');
    assert.ok(entry.pages.every(page => page === 406 || page === 407));
    continue;
  }
  // The approved translation, byte for byte, one bullet per line, with the page of the English PDF.
  const [english, page, bullets] = translated;
  assert.equal(entry.fonte, 'traduzione-nostra');
  assert.deepEqual(entry.fonteInglese, {titolo: english, url: 'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf', pagina: page});
  assert.deepEqual(entry.pages, [page]);
  assert.deepEqual(entry.blocks.map(block => block.text), bullets.map(text => '• ' + text));
  for (const block of entry.blocks) assert.equal(block.sourceHash, createHash('sha256').update(block.text).digest('hex'));
}
// The 11 printed ones are the file of before, byte for byte.
assert.equal(createHash('sha256').update(fs.readFileSync('lib/data/srd-conditions-5.1-it.json')).digest('hex'), '12a678762352caa6536c78dcad83aa019878a883077cfc6249756964efe4eaf4');
assert.ok(legacy.find(entry => entry.title === 'Indebolimento').blocks.some(block => block.kind === 'table' && block.text.includes('6         Morte')), 'six exhaustion levels of the 2014 rules');

const refs = conditions.legacyInlineConditionReferences;
assert.ok(refs.every(reference => reference.href.endsWith('-2014')), '2014 references never open 2024 definitions');
// Every form of the 4 translated conditions now opens its 2014 page, like the other 11.
for (const [title, stem] of [['prono', 'pron'], ['spaventato', 'spaventat'], ['stordito', 'stordit'], ['trattenuto', 'trattenut']]) {
  for (const ending of ['o', 'a', 'i', 'e']) assert.ok(refs.some(reference => reference.label === stem + ending && reference.href === `/manuale/condizioni-${title}-2014`), stem + ending);
}
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

// The source box: «Traduzione nostra» with the English PDF and the licence for the 4; «SRD 5.1» unchanged for the 11.
const manual = load('components/manual-content.tsx', {'@/components/condition-content': {ConditionContent: () => null, LegacyConditionContent: () => null}});
const box = title => renderToStaticMarkup(createElement(manual.ManualContent, {entry: legacy.find(entry => entry.title === title)}));
const prono = box('Prono');
assert.ok(prono.includes("Traduzione nostra dall&#x27;SRD 5.1 (inglese). Questa condizione manca nella versione italiana ufficiale del documento."));
assert.ok(prono.includes('href="https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf#page=359"') && prono.includes('pagina 359 (Prone)'));
assert.ok(prono.includes('href="https://creativecommons.org/licenses/by/4.0/legalcode"') && prono.includes('Creative Commons Attribution 4.0 International (CC-BY-4.0)'));
assert.ok(prono.includes('Traduzione in italiano a cura de Il Grimorio.App.') && !prono.includes('SRD 5.1 italiano'));
assert.ok(box('Spaventato').includes('pagina 358 (Frightened)'));
const accecato = box('Accecato');
assert.ok(accecato.includes('Testo integrale: SRD 5.1 italiano, Appendice A del Manuale del Giocatore') && !accecato.includes('Traduzione nostra'));
console.log('2014 conditions: 15 (11 printed in SRD 5.1, 4 in the approved translation byte for byte), 2014-only links on 2014 sheets for every form, source boxes, bullets and exhaustion table, 2024 unchanged.');
