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
  const legacy = JSON.parse(fs.readFileSync('lib/data/srd-monsters-5.1-it.json'));
  assert.equal(catalog.length, 330 + legacy.records.length, '330 current creatures plus every approved D&D 2014 sheet');
  assert.equal(new Set(catalog.map(m => m.id)).size, 330 + legacy.records.length, 'no 2014 sheet duplicates another one');
  const ids = ['duergar-2014', 'elfo-drow-2014', 'gnomo-delle-profondita-svirfneblin-2014', 'lucertoloide-2014', 'orco-2014', 'sciame-di-scarabei-2014', 'sciame-di-millepiedi-2014', 'sciame-di-ragni-2014', 'sciame-di-vespe-2014', 'topo-gigante-contagioso-2014'];
  assert.deepEqual(legacy.records.slice(0, 10).map(r => r.monster.id), ids, 'the ten first 2014 sheets keep their place');
  assert.ok(legacy.records.every(r => r.monster.id.endsWith('-2014')), 'every 2014 sheet has a -2014 address');
  assert.deepEqual(provider.previewMonsters([], 'production'), catalog);
  assert.deepEqual(provider.previewMonsters([], undefined), []);
  for (const id of ['oggetto-animato', 'cavalcatura-ultraterrena', 'insetto-gigante', 'spirito-draconico', 'mosca-gigante', 'avatar-della-morte', 'mosca-gigante-2014', 'avatar-della-morte-2014']) {
    assert.equal(provider.previewMonsterById(id, 'preview'), undefined, id + ' stays excluded');
  }
  const {MonsterProvenanceBadge} = load('components/monster-provenance-badge.tsx');
  const types = load('lib/monsters-types.ts');
  assert.equal(catalog.filter(types.isSrdAnimal).length, require('../lib/data/srd-animal-ids.json').length, 'every animal ID belongs to a catalog sheet');
  for (const id of ids.slice(5)) assert.ok(types.isSrdAnimal({id}), id + ' belongs to the animal collection');
  let selected;
  const page = load('app/mostro/[id]/page.tsx', {
    'next/image': {__esModule: true, default: () => null},
    'next/link': {__esModule: true, default: ({children, ...props}) => createElement('a', props, children)},
    'next/navigation': {notFound: () => {throw Error('Not found');}},
    '@/components/monster-provenance-badge': {MonsterProvenanceBadge},
    '@/components/back-button': {BackButton: () => null},
    '@/components/meta-cell': load('components/meta-cell.tsx'),
    '@/components/share-button':{ShareButton:()=>null},'@/components/favorite-button': {FavoriteButton: () => null},
    '@/components/html-text': load('components/html-text.tsx'),
    '@/lib/monsters': {getMonsterById: async () => selected},
    '@/lib/spell-references': load('lib/spell-references.ts'),
    '@/lib/conditions': load('lib/conditions.ts'),
    '@/lib/monsters-types': types,
    '@/lib/srd-monsters': provider,
    '@/components/monster-sheet': load('components/monster-sheet.tsx', {'@/components/html-text': load('components/html-text.tsx'), '@/lib/spell-references': load('lib/spell-references.ts'), '@/lib/conditions': load('lib/conditions.ts'), '@/lib/monsters-types': types}),
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
    assert.ok(monster.punti_ferita && (monster.azioni || monster.reazioni || monster.tratti), monster.id + ': hit points and a rules block'); // the shrieker only reacts, the sea horse only breathes water
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
    // Initiative is not printed in 2014 sheets: the Dexterity modifier, marked as calculated.
    const mod = Math.floor((monster.destrezza - 10) / 2);
    assert.ok(html.includes(`>Iniziativa</p><p class="font-serif text-[28px] font-bold leading-8 text-foreground">${mod >= 0 ? '+' + mod : mod}</p><p class="text-[13px] leading-4 text-muted font-serif italic">dalla Destrezza</p>`), monster.id + ': calculated initiative');
    // Proficiency bonus is not printed in 2014 sheets: calculated from the challenge rating on the challenge line.
    const pb = monster.gs_num < 5 ? 2 : Math.ceil(monster.gs_num / 4) + 1;
    const plainText = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    assert.ok(plainText.includes(`Grado sfida ${monster.grado_sfida} (`) && plainText.includes(`bonus di competenza +${pb})`), monster.id + ': challenge line with calculated proficiency');
    // Spellcasting is shown among the actions, after the other actions, as in 2024.
    if (/^<strong>Incantesimi/m.test(monster.tratti.split(/(?:<br\s*\/?>\s*){2,}/).join('\n'))) {
      const actions = html.slice(html.indexOf('>Azioni</h2>'));
      assert.ok(html.indexOf('>Azioni</h2>') > 0 && actions.includes('>Incantesimi'), monster.id + ': spellcasting among the actions');
      const traits = html.indexOf('>Tratti</h2>') >= 0 ? html.slice(html.indexOf('>Tratti</h2>'), html.indexOf('>Azioni</h2>')) : '';
      assert.ok(!traits.includes('>Incantesimi'), monster.id + ': no spellcasting left among the traits');
    }
    // Conditions link only to the 2014 definitions (SRD 5.1); never to the 2024 ones.
    const conditionLinks = [...html.matchAll(/href="\/manuale\/(condizioni-[^"]*)"/g)].map(match => match[1]);
    assert.ok(conditionLinks.every(id => id.endsWith('-2014')), monster.id + ': 2014 rules must not link to 2024 conditions');
    if (/paralizzat[oaie]/.test(monster.tratti + monster.azioni)) assert.ok(conditionLinks.includes('condizioni-paralizzato-2014'), monster.id + ': 2014 condition link');
    // Spells link only to the published 2014 cards (SRD 5.1); never to the 2024 versions.
    assert.ok([...html.matchAll(/href="\/spell\/([^"]*)"/g)].every(match => match[1].endsWith('-2014')), monster.id + ': 2014 spells must not silently link to 2024 spell versions');
    if (/danni (?:da )?(?:acido|contundenti|perforanti|taglienti|fuoco|freddo|fulmine|tuono|veleno|necrotici|radiosi|psichici|da forza)/.test(monster.azioni + monster.tratti)) assert.ok(html.includes('data-damage-type='), monster.id + ': approved damage icons remain visible');
    selected = edited;
    const editedHtml = renderToStaticMarkup(await page({params: Promise.resolve({id: monster.id})}));
    assert.ok(!editedHtml.includes('data-monster-provenance="verified"'), 'later edits remain unattributed');
    assert.ok([...editedHtml.matchAll(/href="\/manuale\/(condizioni-[^"]*)"/g)].every(match => match[1].endsWith('-2014')), 'an edited Legacy description must not enable 2024 condition links');
    assert.ok([...editedHtml.matchAll(/href="\/spell\/([^"]*)"/g)].every(match => match[1].endsWith('-2014')), 'an edited Legacy description must not enable 2024 spell links');
  }
  const byId = id => provider.previewMonsterById(id, 'preview');
  assert.ok(byId('duergar-2014').azioni.includes('massimo di 1 ora'), 'continued action from PDF page 348 is included');
  assert.equal(byId('sciame-di-scarabei-2014').velocita, '6 m, scalare 6 m, scavare 1,5 m');
  assert.equal(byId('sciame-di-vespe-2014').velocita, '1,5 m, volare 9 m');
  assert.ok(byId('sciame-di-millepiedi-2014').tratti.includes('0 punti ferita'));
  assert.ok(byId('sciame-di-millepiedi-2014').tratti.includes('paralizzata'));
  assert.ok(byId('sciame-di-ragni-2014').tratti.includes('Percezione della ragnatela'));
  assert.ok(byId('topo-gigante-contagioso-2014').azioni.includes('3 (1d6) ogni 24 ore'));
  assert.equal(byId('topo-gigante-contagioso-2014').punti_ferita, '7 (2d6)');
  assert.equal(byId('sciame-di-ragni-2014').punti_ferita, '22 (5d8)', '2014 base, not the current 2024 swarm');
  const sources = load('app/fonti/page.tsx', {
    '@/components/analytics-provider': {AnalyticsPreferencesButton: () => null},
    'next/link': {__esModule: true, default: ({children, ...props}) => createElement('a', props, children)},
    '@/lib/srd-descriptions': load('lib/srd-descriptions.ts'),
    '@/lib/data/srd-monsters-5.1-it.json': legacy,
    '@/lib/data/spell-reference-index-2014.json': require('../lib/data/spell-reference-index-2014.json'),
  }).default;
  const attribution = renderToStaticMarkup(createElement(sources));
  assert.ok(attribution.includes('Questo lavoro include materiale del System Reference Document 5.1'));
  assert.ok(attribution.includes('https://creativecommons.org/licenses/by/4.0/legalcode.it'));
  assert.ok(attribution.includes(legacy.sourceUrl));
  // The count follows the data, and the CC BY note says what was changed.
  assert.ok(attribution.includes(`Le ${legacy.records.length} schede «D&amp;D5e 2014» sono trascritte dall’SRD 5.1 italiano`));
  assert.ok(attribution.includes('le regole non sono state modificate né convertite alle regole 2024'));
  assert.ok(attribution.includes(`I ${require('../lib/data/srd-spells-5.1-it.json').records.length} incantesimi «D&amp;D5e 2014» pubblicati finora`), 'the 2014 spells are attributed too');
  console.log(`D&D 2014: ${legacy.records.length} approved records, ${330 + legacy.records.length} catalog entries, correct variant bases, sources, edition labels, no cross-edition links, precedence and license attribution passed.`);
})().catch(error => {console.error(error); process.exit(1);});
