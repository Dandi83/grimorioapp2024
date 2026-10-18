const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {createElement} = require('react');
const {renderToStaticMarkup} = require('react-dom/server');

function load(relative, deps = {}) {
  const filename = path.resolve(relative);
  const module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
  }).outputText;
  new Function('require', 'module', 'exports', code)(id => deps[id] ?? createRequire(filename)(id), module, module.exports);
  return module.exports;
}

(async () => {
  const provider = load('lib/srd-monsters.ts');
  const catalog = provider.previewMonsters([], 'preview');
  assert.equal(catalog.length, 340, '330 existing creatures plus exactly 10 approved D&D 2014 additions');
  assert.equal(new Set(catalog.map(m => m.id)).size, 340);
  const legacy = JSON.parse(fs.readFileSync('lib/data/srd-monsters-5.1-it.json'));
  const ids = ['duergar', 'elfo-drow', 'gnomo-delle-profondita-svirfneblin', 'lucertoloide', 'orco', 'sciame-di-scarabei', 'sciame-di-millepiedi', 'sciame-di-ragni', 'sciame-di-vespe', 'topo-gigante-contagioso'];
  assert.deepEqual(legacy.records.map(r => r.monster.id), ids);
  assert.deepEqual(provider.previewMonsters([], 'production'), catalog);
  assert.deepEqual(provider.previewMonsters([], undefined), []);
  for (const id of ['oggetto-animato', 'cavalcatura-ultraterrena', 'insetto-gigante', 'spirito-draconico', 'mosca-gigante', 'avatar-della-morte']) {
    assert.equal(provider.previewMonsterById(id, 'preview'), undefined, id + ' stays excluded');
  }
  const {MonsterProvenanceBadge} = load('components/monster-provenance-badge.tsx');
  const types = load('lib/monsters-types.ts');
  assert.equal(catalog.filter(types.isSrdAnimal).length, 100, 'five Legacy animal variants join the 95 existing animals');
  for (const id of ids.slice(5)) assert.ok(types.isSrdAnimal({id}), id + ' belongs to the animal collection');
  let selected;
  const page = load('app/mostro/[id]/page.tsx', {
    'next/image': {__esModule: true, default: () => null},
    'next/link': {__esModule: true, default: ({children, ...props}) => createElement('a', props, children)},
    'next/navigation': {notFound: () => {throw Error('Not found');}},
    '@/components/monster-provenance-badge': {MonsterProvenanceBadge},
    '@/lib/prepared-monster-art':{getPreparedMonsterArt:()=>undefined},
    '@/lib/monster-art-preview': load('lib/monster-art-preview.ts'),
    '@/components/back-button': {BackButton: () => null},
    '@/components/share-button':{ShareButton:()=>null},'@/components/favorite-button': {FavoriteButton: () => null},
    '@/components/html-text': load('components/html-text.tsx'),
    '@/lib/monsters': {getMonsterById: async () => selected},
    '@/lib/spell-references': load('lib/spell-references.ts'),
    '@/lib/conditions': load('lib/conditions.ts'),
    '@/lib/monsters-types': types,
    '@/lib/srd-monsters': provider,
  }).default;
  for (const r of legacy.records) {
    const monster = provider.previewMonsterById(r.monster.id, 'preview');
    assert.deepEqual(monster, r.monster);
    const source = provider.getSrdMonsterSource(monster);
    assert.equal(source.document, 'SRD 5.1');
    assert.equal(source.edition, '2014');
    assert.equal(source.page, r.page);
    assert.equal(source.sourceUrl, legacy.sourceUrl);
    assert.equal(provider.getSrdMonsterSource({...monster, azioni: 'Modifica successiva'}), undefined);
    assert.equal(provider.getSrdMonsterSource({...monster, iniziativa: '+99'}), undefined);
    assert.ok(monster.punti_ferita && monster.azioni && monster.tratti);
    const edited = {...monster, descrizione: 'Testo personalizzato'};
    assert.equal(provider.previewMonsters([edited], 'preview').find(m => m.id === edited.id), edited);
    const badge = renderToStaticMarkup(createElement(MonsterProvenanceBadge, {source, linked: true}));
    assert.ok(badge.includes('D&amp;D5e 2014'), 'edition label explicitly requested by user');
    assert.ok(badge.includes(legacy.sourceUrl + '#page=' + r.page));
    selected = monster;
    const html = renderToStaticMarkup(await page({params: Promise.resolve({id: monster.id})}));
    assert.ok(html.includes('Testo integrale: SRD 5.1 italiano'));
    assert.ok(!html.includes('Testo integrale: SRD 5.2.1'));
    assert.ok(html.includes('Attribuzione e licenza'));
    assert.ok(html.includes('regole 2014'));
    assert.ok(!html.includes('href="/manuale/condizioni-'), '2014 rules must not silently link to 2024 conditions');
    assert.ok(!html.includes('href="/spell/'), '2014 spells must not silently link to 2024 spell versions');
    assert.ok(html.includes('data-damage-type='), 'approved damage icons remain visible');
    selected = edited;
    const editedHtml = renderToStaticMarkup(await page({params: Promise.resolve({id: monster.id})}));
    assert.ok(!editedHtml.includes('data-monster-provenance="verified"'), 'later edits remain unattributed');
    assert.ok(!editedHtml.includes('href="/manuale/condizioni-'), 'an edited Legacy description must not enable 2024 condition links');
    assert.ok(!editedHtml.includes('href="/spell/'), 'an edited Legacy description must not enable 2024 spell links');
  }
  const byId = id => provider.previewMonsterById(id, 'preview');
  assert.ok(byId('duergar').azioni.includes('massimo di 1 ora'), 'continued action from PDF page 348 is included');
  assert.equal(byId('sciame-di-scarabei').velocita, '6 m, scalare 6 m, scavare 1,5 m');
  assert.equal(byId('sciame-di-vespe').velocita, '1,5 m, volare 9 m');
  assert.ok(byId('sciame-di-millepiedi').tratti.includes('0 punti ferita'));
  assert.ok(byId('sciame-di-millepiedi').tratti.includes('paralizzata'));
  assert.ok(byId('sciame-di-ragni').tratti.includes('Percezione della ragnatela'));
  assert.ok(byId('topo-gigante-contagioso').azioni.includes('3 (1d6) ogni 24 ore'));
  assert.equal(byId('topo-gigante-contagioso').punti_ferita, '7 (2d6)');
  assert.equal(byId('sciame-di-ragni').punti_ferita, '22 (5d8)', '2014 base, not the current 2024 swarm');
  const sources = load('app/fonti/page.tsx', {
    '@/components/analytics-provider': {AnalyticsPreferencesButton: () => null},
    'next/link': {__esModule: true, default: ({children, ...props}) => createElement('a', props, children)},
    '@/lib/srd-descriptions': load('lib/srd-descriptions.ts'),
  }).default;
  const attribution = renderToStaticMarkup(createElement(sources));
  assert.ok(attribution.includes('Questo lavoro include materiale del System Reference Document 5.1'));
  assert.ok(attribution.includes('https://creativecommons.org/licenses/by/4.0/legalcode.it'));
  assert.ok(attribution.includes(legacy.sourceUrl));
  console.log('D&D 2014: 10 approved records, 340 catalog entries, correct variant bases, sources, edition labels, no cross-edition links, precedence and license attribution passed.');
})().catch(error => {console.error(error); process.exit(1);});
