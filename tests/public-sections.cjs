// Sections that can be hidden from /admin/sezioni (lib/public-sections.ts): one registry, every page
// of a section behind its SectionGate, addresses recognised the same way by the pages, the search
// and the service worker.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const mod = {exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/public-sections.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,mod,mod.exports);
const ps = mod.exports;

const keys = ps.PUBLIC_SECTIONS.map(s => s.key);
assert.deepEqual(keys, ['incantesimi','bestiario','classi','armi','armature','avventura','strumenti','oggetti-magici','condizioni','avanzamento'], 'the sections Daniele listed, in the order of the admin page');
assert.equal(new Set(keys).size, keys.length);
for (const s of ps.PUBLIC_SECTIONS) assert.ok(s.title && s.where && s.paths.length, s.key);

const cases = {
  '/grimorio': 'incantesimi', '/grimorio?classe=mago&edizione=2014': 'incantesimi', '/spell/palla-di-fuoco': 'incantesimi',
  '/bestiario': 'bestiario', '/mostro/lich': 'bestiario', '/classi': 'classi', '/classi/mago#sottoclasse': 'classi',
  '/equipaggiamento/armi': 'armi', '/equipaggiamento/armi/pugnale': 'armi', '/equipaggiamento/armature/scudo': 'armature',
  '/equipaggiamento/avventura/corda': 'avventura', '/equipaggiamento/strumenti': 'strumenti', '/oggetti-magici/ali-del-volo': 'oggetti-magici',
  '/compendio/condizioni': 'condizioni', '/manuale/condizioni-accecato': 'condizioni', '/avanzamento': 'avanzamento',
};
for (const [href, key] of Object.entries(cases)) assert.equal(ps.sectionOfPath(href), key, href);
for (const href of ['/', '/compendio', '/equipaggiamento', '/preferiti', '/spell', '/manuale/condizioni-', '/manuale/equipaggiamento-armi', '/classifica', '/grimorio-vecchio', '/admin/sezioni']) {
  assert.equal(ps.sectionOfPath(href), undefined, href);
}
assert.equal(ps.isHiddenPath('/classi/mago', ['classi']), true);
assert.equal(ps.isHiddenPath('/classi/mago', ['armi']), false);
const links = [{label:'accecato',href:'/manuale/condizioni-accecato'},{label:'scudo',href:'/spell/scudo'}];
assert.deepEqual(ps.visibleLinks(links, ['condizioni']).map(l => l.label), ['scudo'], 'links to a hidden section become plain text');
assert.deepEqual(ps.visibleLinks(links, []), links);
assert.deepEqual([...ps.EQUIPMENT_SECTIONS].sort(), ['armature','armi','avventura','strumenti']);

// Every page folder of a section is behind its gate (a layout.tsx with <SectionGate section="…">).
const gates = {
  'app/grimorio': 'incantesimi', 'app/spell': 'incantesimi', 'app/bestiario': 'bestiario', 'app/mostro': 'bestiario', 'app/classi': 'classi',
  'app/equipaggiamento/armi': 'armi', 'app/equipaggiamento/armature': 'armature', 'app/equipaggiamento/avventura': 'avventura',
  'app/equipaggiamento/strumenti': 'strumenti', 'app/oggetti-magici': 'oggetti-magici', 'app/compendio/condizioni': 'condizioni',
  'app/manuale/[id]': 'condizioni', 'app/avanzamento': 'avanzamento',
};
for (const [dir, key] of Object.entries(gates)) {
  const layout = fs.readFileSync(path.join(dir, 'layout.tsx'), 'utf8');
  assert.ok(layout.includes(`<SectionGate section="${key}">`), `${dir}/layout.tsx guards «${key}»`);
}
assert.deepEqual([...new Set(Object.values(gates))].sort(), [...keys].sort(), 'every section has its gate');

// The service worker matches addresses with the same rule as sectionOfPath().
const sw = fs.readFileSync('lib/sw/service-worker.js', 'utf8');
const isHidden = new Function(`${sw.match(/function isHidden\(pathname, paths\) \{[\s\S]*?\n\}/)[0]}; return isHidden;`)();
const all = ps.PUBLIC_SECTIONS.flatMap(s => s.paths);
for (const href of [...Object.keys(cases), '/', '/compendio', '/spell', '/manuale/condizioni-', '/classifica']) {
  const pathname = href.split(/[?#]/)[0];
  assert.equal(isHidden(pathname, all), ps.sectionOfPath(href) !== undefined, `service worker: ${href}`);
}

// Hiding is reversible and never touches content: the switches only write their own tables (sections, parts, cards).
const store = fs.readFileSync('lib/section-visibility.ts', 'utf8');
const written = [...store.matchAll(/(?:INSERT INTO|DELETE FROM|(?<!DO )UPDATE)\s+(\w+)/g)].map(m => m[1]);
assert.deepEqual([...new Set(written)].sort(), ['grimorio_card_visibility', 'grimorio_card_visibility_log', 'grimorio_section_parts', 'grimorio_section_parts_log', 'grimorio_section_visibility', 'grimorio_section_visibility_log']);
const cardAction = fs.readFileSync('app/actions/admin-cards.ts', 'utf8');
assert.ok(/export async function setCardVisibilityAction[^{]*\{\s*await requireAdmin\(\);/.test(cardAction), 'the card action starts with requireAdmin');
// The service worker deletes the saved copy of a hidden card (its address), not the others.
assert.equal(isHidden('/spell/palla-di-fuoco', ['/spell/palla-di-fuoco']), true);
assert.equal(isHidden('/spell/palla-di-fuoco-2014', ['/spell/palla-di-fuoco']), false);
const action = fs.readFileSync('app/actions/admin-sections.ts', 'utf8');
assert.ok(/export async function setSectionVisibilityAction[^{]*\{\s*await requireAdmin\(\);/.test(action), 'the action starts with requireAdmin');
assert.ok(/export async function setPartVisibilityAction[^{]*\{\s*await requireAdmin\(\);/.test(action), 'the part action starts with requireAdmin');

// Parts: editions of nine sections, collections, class sheet parts, comparisons, the four blocks of Avanzamento.
const parts = Object.fromEntries(ps.PUBLIC_SECTIONS.map(section => [section.key, section.parts.map(part => part.key)]));
for (const key of ['incantesimi','bestiario','armi','armature','avventura','strumenti','oggetti-magici','condizioni','classi']) {
  assert.deepEqual(parts[key].slice(0, 2), ['2014', '2024'], `${key}: Edizione 2014 and 2024`);
}
assert.deepEqual(parts.bestiario.slice(2), ['mostri', 'animali', 'homebrew']);
assert.deepEqual(parts.classi.slice(2), ['tab-tabella', 'tab-sottoclasse', 'abilita', 'diventare', 'lista-incantesimi', 'incantesimi-del']);
for (const key of ['armi', 'avventura', 'strumenti', 'oggetti-magici']) assert.ok(parts[key].includes('confronto'), `${key}: 2014 → 2024`);
assert.deepEqual(parts.avanzamento, ['tabella', 'punti-ferita', 'talenti', 'calcolatore']);
for (const section of ps.PUBLIC_SECTIONS) {
  assert.equal(new Set(section.parts.map(p => p.key)).size, section.parts.length, `${section.key}: unique parts`);
  for (const part of section.parts) {
    assert.ok(part.title && ps.PART_GROUPS[part.group] && part.page.startsWith('/'), `${section.key}:${part.key}`);
    assert.equal(ps.sectionOfPath(part.page), section.key, `${section.key}:${part.key}: its page is in the section`);
  }
}
const avanzamento = fs.readFileSync('app/avanzamento/page.tsx', 'utf8');
for (const key of parts.avanzamento) assert.ok(avanzamento.includes(`id="${key}"`) && avanzamento.includes(`part="${key}"`), `Avanzamento block ${key}`);
assert.equal(ps.isPartId('classi:tab-tabella'), true);
assert.equal(ps.isPartId('classi:nulla'), false);
assert.equal(ps.isPartId('armature:confronto'), false);
// Every part of a set hidden: the section behaves as hidden; the section always wins over its parts.
assert.deepEqual(ps.effectiveHidden([], ['incantesimi:2014']), []);
assert.deepEqual(ps.effectiveHidden([], ['incantesimi:2014', 'incantesimi:2024']), ['incantesimi']);
assert.deepEqual(ps.effectiveHidden([], ['bestiario:mostri', 'bestiario:animali']), [], 'the Homebrew collection is still shown');
assert.deepEqual(ps.effectiveHidden([], ['bestiario:mostri', 'bestiario:animali', 'bestiario:homebrew']), ['bestiario']);
assert.deepEqual(ps.effectiveHidden([], ['avanzamento:tabella', 'avanzamento:punti-ferita', 'avanzamento:talenti']), []);
assert.deepEqual(ps.effectiveHidden([], ['avanzamento:tabella', 'avanzamento:punti-ferita', 'avanzamento:talenti', 'avanzamento:calcolatore']), ['avanzamento']);
assert.deepEqual(ps.effectiveHidden([], ['classi:tab-tabella', 'classi:tab-sottoclasse']), [], 'the tabs do not make up the page');
assert.deepEqual(ps.effectiveHidden(['classi'], []), ['classi']);
assert.deepEqual(ps.shownEditions('armi', ['armi:2014']), ['2024']);
assert.deepEqual(ps.shownEditions('armi', ['armature:2014']), ['2024', '2014']);
// Card addresses of an edition.
for (const [href, edition] of [['/spell/palla-di-fuoco', '2024'], ['/spell/palla-di-fuoco-2014', '2014'], ['/mostro/orco-2014', '2014'], ['/manuale/condizioni-accecato-2014', '2014'],
  ['/classi/mago?edizione=2014', '2014'], ['/classi/mago', undefined], ['/equipaggiamento/armi/tridente', undefined], ['/grimorio', undefined]]) {
  assert.equal(ps.editionOfPath(href), edition, href);
}
assert.equal(ps.isHiddenPath('/spell/palla-di-fuoco-2014', ['incantesimi:2014']), true);
assert.equal(ps.isHiddenPath('/spell/palla-di-fuoco', ['incantesimi:2014']), false);
assert.equal(ps.isHiddenPath('/manuale/condizioni-prono', ['condizioni:2024']), true);
// A single card hidden with the eye of the admin area is named by its address: only that card, its links and copies.
assert.equal(ps.isHiddenPath('/spell/palla-di-fuoco', ['/spell/palla-di-fuoco']), true);
assert.equal(ps.isHiddenPath('/spell/palla-di-fuoco?da=ricerca#effetti', ['/spell/palla-di-fuoco']), true);
assert.equal(ps.isHiddenPath('/spell/palla-di-fuoco-2014', ['/spell/palla-di-fuoco']), false, 'the other edition stays');
assert.equal(ps.isHiddenPath('/spell/palla-di-fuoco-ritardata', ['/spell/palla-di-fuoco']), false);
assert.equal(ps.isHiddenPath('/mostro/aboleth', ['/spell/aboleth']), false, 'a spell and a creature with the same id are different cards');
assert.deepEqual(ps.visibleLinks([{ href: '/spell/scudo', label: 'scudo' }, { href: '/spell/palla-di-fuoco', label: 'palla di fuoco' }], ['/spell/palla-di-fuoco']).map(l => l.label), ['scudo'],
  'a link to a hidden card becomes plain text');
assert.ok(!/api\/.*sezion/i.test(fs.readdirSync('app/api').join(' ')), 'no public route for the sections');

console.log(`Public sections: ${keys.length} sections in one registry, every page folder gated, same address rule for pages, search links and service worker, switch writes only its own tables; ${ps.PUBLIC_SECTIONS.reduce((n, s) => n + s.parts.length, 0)} parts with their rules.`);
