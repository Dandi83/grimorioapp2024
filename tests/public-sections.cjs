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

// Hiding is reversible and never touches content: the switch only writes its two tables.
const store = fs.readFileSync('lib/section-visibility.ts', 'utf8');
const written = [...store.matchAll(/(?:INSERT INTO|DELETE FROM|(?<!DO )UPDATE)\s+(\w+)/g)].map(m => m[1]);
assert.deepEqual([...new Set(written)].sort(), ['grimorio_section_visibility', 'grimorio_section_visibility_log']);
const action = fs.readFileSync('app/actions/admin-sections.ts', 'utf8');
assert.ok(/export async function setSectionVisibilityAction[^{]*\{\s*await requireAdmin\(\);/.test(action), 'the action starts with requireAdmin');
assert.ok(!/api\/.*sezion/i.test(fs.readdirSync('app/api').join(' ')), 'no public route for the sections');

console.log(`Public sections: ${keys.length} sections in one registry, every page folder gated, same address rule for pages, search links and service worker, switch writes only its own tables.`);
