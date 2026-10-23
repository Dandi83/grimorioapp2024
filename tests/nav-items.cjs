// One list of the five places for the bottom bar (phone, tablet) and the side column (computer):
// a section hidden from /admin/sezioni leaves both, the administrator still sees it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
function load(relative) {
  const filename = path.resolve(relative);
  const mod = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
  new Function('require', 'module', 'exports', code)(createRequire(filename), mod, mod.exports);
  return mod.exports;
}
const {NAV_ITEMS, FOOT_LINKS, visibleNavItems} = load('components/nav-items.ts');
assert.deepEqual(NAV_ITEMS.map(item => item.label), ['Home', 'Incantesimi', 'Bestiario', 'Compendio', 'Preferiti']);
assert.deepEqual(visibleNavItems([], false).map(item => item.href), ['/', '/grimorio', '/bestiario', '/compendio', '/preferiti']);
assert.deepEqual(visibleNavItems(['bestiario'], false).map(item => item.href), ['/', '/grimorio', '/compendio', '/preferiti'], 'hidden section out');
assert.equal(visibleNavItems(['bestiario'], true).length, 5, 'the administrator still sees it (labelled «Nascosta»)');
assert.ok(NAV_ITEMS.find(item => item.label === 'Compendio').match('/classi/mago'));
assert.ok(NAV_ITEMS.find(item => item.label === 'Incantesimi').match('/spell/dardo-incantato'));
// The foot links of the side column lead to existing pages.
for (const {href} of FOOT_LINKS) assert.ok(fs.existsSync(path.join('app', href.slice(1), 'page.tsx')), href);
// Both navigations read the same list; the bar leaves the computer to the column, the column leaves the admin area.
const bar = fs.readFileSync('components/bottom-nav.tsx', 'utf8'), side = fs.readFileSync('components/side-nav.tsx', 'utf8');
assert.match(bar, /visibleNavItems\(hidden, adminView\)/); assert.match(side, /visibleNavItems\(hidden, adminView\)/);
assert.match(bar, /lg:hidden/); assert.match(side, /pathname\.startsWith\("\/admin"\)\) return null/);
console.log('Navigation: one list for the bar and the side column, hidden sections out of both, admin sees them, foot links to existing pages.');
