// «In arrivo» (/admin/sezioni): the third state of sections and parts. The entries stay for the public (bar, side
// column, Compendio, Home), attenuated, to the «in costruzione» page with the pill «<name> · In arrivo»; the content
// stays out as for a hidden section (it is stored as hidden, with the in_arrivo flag).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {soonOfPath, soonTitle, soonHref, isHiddenPath} = require('../lib/public-sections.ts');
const {visibleNavItems} = require('../components/nav-items.ts');

// The pill of the «in costruzione» page.
assert.equal(soonOfPath('/classi/mago', ['classi']), 'Classi');
assert.equal(soonOfPath('/equipaggiamento/armi/tridente', ['armi']), 'Armi');
assert.equal(soonOfPath('/spell/aiuto-2014', ['incantesimi:2014']), 'Incantesimi 2014', 'an edition «In arrivo»');
assert.equal(soonOfPath('/spell/aiuto', ['incantesimi:2014']), undefined, 'the other edition is not');
assert.equal(soonOfPath('/avanzamento', ['avanzamento:tabella', 'avanzamento:punti-ferita', 'avanzamento:talenti', 'avanzamento:calcolatore']), 'Avanzamento', 'all the blocks «In arrivo»');
assert.equal(soonOfPath('/classi/mago', []), undefined);
assert.equal(soonOfPath('/info', ['classi']), undefined);
// /in-arrivo/<id>: known sections and parts only.
assert.equal(soonTitle('classi'), 'Classi');
assert.equal(soonTitle('bestiario:animali'), 'Raccolta Animali');
assert.equal(soonTitle('incantesimi:2014'), 'Incantesimi 2014');
assert.equal(soonTitle('classi:nulla'), undefined);
assert.equal(soonTitle('nulla'), undefined);
assert.equal(soonHref('bestiario:animali'), '/in-arrivo/bestiario%3Aanimali');
// The content stays out: «In arrivo» is in the hidden list, the rules of the hidden addresses apply.
assert.equal(isHiddenPath('/classi/mago', ['classi']), true);

// The bar: a section «In arrivo» stays for the public; a hidden one leaves it.
assert.deepEqual(visibleNavItems(['bestiario'], false, ['bestiario']).map(item => item.href), ['/', '/grimorio', '/bestiario', '/compendio', '/preferiti']);
assert.deepEqual(visibleNavItems(['bestiario'], false, []).map(item => item.href), ['/', '/grimorio', '/compendio', '/preferiti']);

// The migration: an added column, false by default (the rows of before stay Visibile or Nascosta), read also when
// it is not there yet; «In arrivo» written with nascosta.
const store = fs.readFileSync('lib/section-visibility.ts', 'utf8');
for (const table of ['grimorio_section_visibility', 'grimorio_section_visibility_log', 'grimorio_section_parts', 'grimorio_section_parts_log']) {
  assert.ok(store.includes(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS in_arrivo boolean NOT NULL DEFAULT false`), table);
}
assert.match(store, /COALESCE\(\(to_jsonb\(t\)->>'in_arrivo'\)::boolean, false\)/, 'tables without the column are still read');
assert.match(store, /\[nascosta, inArrivo\] = \[state !== "visibile", state === "in-arrivo"\]/);

// Labels and colors: amber pill #E0A21A with text #2B2118, «Ci stiamo lavorando», the three-position selector.
assert.match(fs.readFileSync('components/sections/soon-tag.tsx', 'utf8'), /bg-\[#E0A21A\][^"]*text-\[#2B2118\]/);
assert.match(fs.readFileSync('components/section-tiles.tsx', 'utf8'), /Ci stiamo lavorando/);
const switches = fs.readFileSync('components/sections/section-switches.tsx', 'utf8');
for (const label of ['"Visibile"', '"In arrivo"', '"Nascosta"']) assert.ok(switches.includes(`label: ${label}`), label);
assert.match(fs.readFileSync('components/sections/section-unavailable.tsx', 'utf8'), /\{soon\} · In arrivo/);
console.log('section-soon: pill of the «in costruzione» page, /in-arrivo titles, bar, migration and three states.');
