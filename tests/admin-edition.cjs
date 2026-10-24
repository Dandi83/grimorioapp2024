// Admin area split by edition (lib/admin-edition.ts, app/actions/admin-edition.ts, the admin pages): the
// switch is remembered in a cookie set only for the administrator, 2024 by default; lists, counts and
// the log follow it; the shared pages have no band. Only a filter: no data is written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');

const cache = new Map(), deps = {};
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = {exports:{}}; cache.set(filename, mod);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, esModuleInterop:true, resolveJsonModule:true}}).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id in deps) return deps[id];
    if (id.startsWith('@/') || id.startsWith('./') || id.startsWith('../')) {
      const file = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename), id);
      if (fs.existsSync(file + '.ts')) return load(file + '.ts');
      if (fs.existsSync(file)) return createRequire(filename)(file);
    }
    return createRequire(filename)(id);
  }, mod, mod.exports);
  return mod.exports;
}

(async () => {
  const edition = load('lib/admin-edition.ts');
  // 2024 by default, anything else is 2024 too.
  assert.equal(edition.parseAdminEdition(undefined), '2024');
  assert.equal(edition.parseAdminEdition('2014'), '2014');
  assert.equal(edition.parseAdminEdition('1999'), '2024');
  // The band: colors and texts asked for.
  assert.deepEqual(edition.EDITION_BAND['2024'], {background: '#7A1F2B', text: '#FFFBF0', label: 'Stai modificando il 2024'});
  assert.deepEqual(edition.EDITION_BAND['2014'], {background: '#2D4C7A', text: '#FFFBF0', label: 'Stai modificando il 2014'});
  // Shared pages: no band.
  for (const page of ['/admin/segnalazioni', '/admin/segnalazioni/abc', '/admin/notifiche', '/admin/statistiche', '/admin/sezioni']) assert.equal(edition.isCommonAdminPath(page), true, page);
  for (const page of ['/admin', '/admin/incantesimi', '/admin/mostri', '/admin/contenuti/armi', '/admin/contenuti/armi/tridente', '/admin/registro', '/admin/sezionix']) assert.equal(edition.isCommonAdminPath(page), false, page);
  // Spells: 2014 only when labelled so, as in the public list.
  assert.equal(edition.spellEdition({edizione: '2014'}), '2014');
  assert.equal(edition.spellEdition({edizione: '2024'}), '2024');
  assert.equal(edition.spellEdition({}), '2024');
  // Log: the chosen edition plus the shared lines; «Tutte le edizioni» shows everything.
  const lines = [{e: '2024'}, {e: '2014'}, {e: null}];
  assert.deepEqual(lines.filter(line => edition.inAdminEdition(line.e, '2024')).map(line => line.e), ['2024', null]);
  assert.deepEqual(lines.filter(line => edition.inAdminEdition(line.e, '2014')).map(line => line.e), ['2014', null]);
  assert.equal(lines.filter(line => edition.inAdminEdition(line.e, '2014', true)).length, 3);

  // The cookie: only for the administrator, read back by the pages.
  const jar = new Map(); const set = [];
  deps['next/headers'] = {cookies: async () => ({get: name => (jar.has(name) ? {value: jar.get(name)} : undefined), set: (name, value, options) => { jar.set(name, value); set.push({name, value, options}); }})};
  let admin = false;
  deps['@/lib/admin-action-helpers'] = {requireAdmin: async () => { if (!admin) throw new Error('Non autorizzato'); }};
  deps['server-only'] = {};
  const action = load('app/actions/admin-edition.ts');
  const server = load('lib/admin-edition-server.ts');
  await assert.rejects(action.setAdminEditionAction('2014'), /Non autorizzato/);
  assert.equal(set.length, 0, 'no cookie for visitors');
  assert.equal(await server.adminEdition(), '2024', 'default 2024');
  admin = true;
  assert.deepEqual(await action.setAdminEditionAction('2014'), {ok: true});
  assert.equal(await server.adminEdition(), '2014', 'remembered');
  assert.equal(set[0].name, '__Host-grimorio_admin_edizione');
  assert.equal(set[0].options.httpOnly, true); assert.equal(set[0].options.secure, true); assert.equal(set[0].options.path, '/');
  assert.ok(set[0].options.maxAge >= 300 * 24 * 3600, 'kept for months');
  assert.deepEqual(await action.setAdminEditionAction('1999'), {ok: false});
  assert.equal(set.length, 1, 'an invalid edition saves nothing');

  // Counts per edition: every entry listed for an edition opens its card in that edition (tile = list).
  const {CONTENT_SECTIONS} = load('lib/content-sections.ts');
  for (const section of CONTENT_SECTIONS) {
    for (const ed of ['2024', '2014']) {
      if (!section.editions.includes(ed)) continue;
      const items = section.items(ed);
      assert.ok(items.length > 0, `${section.key} ${ed} has entries`);
      for (const item of items) assert.ok(section.original(item.id, ed), `${section.key} ${ed}: ${item.id} opens`);
    }
  }
  assert.deepEqual(CONTENT_SECTIONS.find(section => section.key === 'manuale').editions, ['2024'], 'Manuale: only 2024 (the 2014 tile says so)');

  // The pages: lists filtered by the switch, links of the other edition announced, no internal edition links.
  const read = file => fs.readFileSync(file, 'utf8');
  const list = read('app/admin/contenuti/[sezione]/page.tsx');
  assert.doesNotMatch(list, /aria-label="Edizione"/, 'the internal edition links are gone');
  assert.match(list, /await adminEdition\(\)/);
  assert.match(read('app/admin/contenuti/[sezione]/[id]/page.tsx'), /edition !== chosen && <OtherEditionNotice/);
  for (const page of ['app/admin/incantesimi/page.tsx', 'app/admin/mostri/page.tsx']) assert.match(read(page), /<AdminEditorsView tab=/, page);
  assert.match(read('components/admin-editors-view.tsx'), /spells\.filter\(spell => spellEdition\(spell\) === edition\)[\s\S]*usesLegacyMonsterRules/);
  assert.match(read('components/admin-edition-field.tsx'), /confirm\(`Spostare questa scheda nell’edizione \$\{chosen\}\?`\)/);
  // The rows of the lists have no edition dropdown any more: the switch at the top decides.
  for (const file of ['components/admin-dashboard.tsx', 'components/admin-monsters.tsx']) assert.doesNotMatch(read(file), /AdminEditionPicker|Salva etichetta/, file);
  for (const file of ['components/admin-spell-editor.tsx', 'components/admin-monster-editor.tsx']) assert.match(read(file), /confirmEditionMove\(data, edition\)/, file);
  assert.match(read('app/admin/registro/page.tsx'), /Tutte le edizioni/);
  assert.match(read('app/admin/layout.tsx'), /if \(!\(await isAdmin\(\)\)\) return children;/, 'no switch on the login page');

  console.log('Admin editions: 2024 by default, remembered only for the administrator, band colors, shared pages without band, spells and log filtered, counts open their cards, internal edition links replaced by the switch.');
})().catch(error => { console.error(error); process.exit(1); });
