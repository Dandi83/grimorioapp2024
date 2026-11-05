// «I miei personaggi» (PROMPT 62, beta): the helpers of the page (lib/characters-beta.ts), the saving in the browser, the
// hidden section and the statistics that never record the «#…» of the address.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const tpk = require('../lib/shared/scheda-tpk-v1.ts');
const c = require('../lib/characters-beta.ts');
const ps = require('../lib/public-sections.ts');
const { ANALYTICS_PATH } = require('../lib/analytics-events.ts');

const BRENNA = fs.readFileSync('tests/scheda-tpk-grimorio.cjs', 'utf8').match(/'(#pg=[^']+)'/)[1];

(async () => {
  const decoded = await tpk.decodeHash(BRENNA);
  assert.equal(decoded.ok, true);
  const brenna = decoded.schede[0];
  // FOR 12 +1, DES 13 +1, COS 15 +2, INT 10 +0, SAG 17 +3, CAR 8 −1 (base + background).
  const scores = c.finalAbilities(brenna);
  assert.deepEqual(c.ABILITIES.map(({ key, short }) => `${short} ${scores[key]} ${c.signed(c.modifier(scores[key]))}`),
    ['FOR 12 +1', 'DES 13 +1', 'COS 15 +2', 'INT 10 +0', 'SAG 17 +3', 'CAR 8 −1']);
  assert.equal(c.cardLine(brenna), 'Druido · Elfo (dei boschi) · 3° livello');
  assert.equal(c.metres(10.5), '10,5');
  assert.equal(c.metres(9), '9');
  assert.equal(c.sheetSpells(brenna).length, 12);
  // An «Aumento dei punteggi di caratteristica» adds its points, never over 20.
  const asi = c.finalAbilities({ base: [15, 14, 13, 12, 10, 8], bb: { int: 2, cos: 1 }, ft: [{ id: 'aumento-dei-punteggi-di-caratteristica', o: 4, p: { int: 2 } }] });
  assert.equal(asi.int, 16); assert.equal(asi.cos, 14);
  assert.equal(c.finalAbilities({ base: [15, 8, 8, 8, 8, 8], bb: { for: 2 }, ft: [{ id: 'aumento-dei-punteggi-di-caratteristica', p: { for: 4 } }] }).for, 20);
  // Every class, species option and background of the shared file has a name.
  for (const id of tpk.CLASSI) assert.ok(c.CLASS_NAMES[id], id);
  for (const [sp, options] of Object.entries(tpk.SPECIE)) { assert.ok(c.SPECIES_NAMES[sp], sp); for (const o of options) assert.ok(c.SPECIES_OPTIONS[sp]?.[o], `${sp}/${o}`); }
  for (const id of Object.keys(tpk.BACKGROUND)) assert.ok(c.BACKGROUND_NAMES[id], id);
  for (const id of tpk.ABILITA) assert.ok(c.SKILL_NAMES[id], id);

  // Saving: «grimorio.characters.v1», apart from the favorites; a storage that throws (private window) gives null / false.
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.deepEqual(c.readCharacters(storage), []);
  const entry = { id: c.newLocalId(), savedAt: new Date().toISOString(), sheet: brenna };
  assert.equal(c.writeCharacters(storage, [entry]), true);
  assert.deepEqual([...memory.keys()], ['grimorio.characters.v1']);
  assert.deepEqual(c.readCharacters(storage)[0].sheet.calc, brenna.calc, 'the sheet is kept as it came, calc included');
  assert.equal(c.sameCharacter(c.readCharacters(storage), { ...brenna, n: ' brenna ' })?.id, entry.id, 'same name and class');
  assert.equal(c.sameCharacter(c.readCharacters(storage), { ...brenna, c: 'mago' }), undefined);
  const broken = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(c.readCharacters(broken), null);
  assert.equal(c.writeCharacters(broken, [entry]), false);
  assert.equal(c.readCharacters(null), null);
  memory.set('grimorio.characters.v1', '{rotto'); assert.equal(c.readCharacters(storage), null);
  memory.set('grimorio.characters.v1', JSON.stringify([{ id: 1 }, entry])); assert.equal(c.readCharacters(storage).length, 1, 'malformed entries skipped');

  // The section: «Nascosta» from the start, its page gated; nothing for the public (sitemap, search, service worker).
  assert.equal(ps.sectionOfPath('/personaggi'), 'personaggi');
  assert.equal(ps.sectionOfPath('/personaggi#pg=abc'), 'personaggi');
  assert.match(fs.readFileSync('lib/section-visibility.ts', 'utf8'), /DEFAULT_SECTION_STATES[^\n]*personaggi: "nascosta"/);
  assert.ok(fs.readFileSync('app/personaggi/layout.tsx', 'utf8').includes('<SectionGate section="personaggi">'));
  assert.ok(!fs.readFileSync('lib/sitemap.ts', 'utf8').includes('/personaggi'), 'never in the sitemap');
  assert.ok(!/personaggi/.test(fs.readFileSync('lib/sw/service-worker.js', 'utf8').match(/PUBLIC_PAGE[^\n]*/)?.[0] ?? ''), 'never saved by the service worker');
  assert.ok(fs.readFileSync('app/robots.ts', 'utf8').includes('"/personaggi"'), 'robots: noindex');
  // Only app/personaggi imports the page and the shared file (not in the code of the other pages).
  const importers = [];
  (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = `${dir}/${e.name}`; if (e.isDirectory()) walk(f); else if (/\.(ts|tsx)$/.test(e.name) && /characters-beta|scheda-tpk-v1/.test(fs.readFileSync(f, 'utf8'))) importers.push(f); } })('app');
  (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = `${dir}/${e.name}`; if (e.isDirectory()) walk(f); else if (/\.(ts|tsx)$/.test(e.name) && /characters-beta|scheda-tpk-v1/.test(fs.readFileSync(f, 'utf8'))) importers.push(f); } })('components');
  assert.deepEqual(importers.sort(), ['app/personaggi/page.tsx', 'components/characters-beta/characters-app.tsx']);

  // Statistics: the address of a page view is the path (usePathname / location.pathname), never the «#…»; /personaggi is
  // never counted and an address with a hash is refused by the server.
  const provider = fs.readFileSync('components/analytics-provider.tsx', 'utf8');
  assert.ok(provider.includes('const path = usePathname();') && !/location\.hash/.test(provider), 'the provider sends the path only');
  assert.ok(provider.includes('path.startsWith("/personaggi")'), '/personaggi is not counted');
  for (const route of ['/personaggi', '/personaggi#pg=abc', '/spell/palla-di-fuoco#pg=abc', '/#party=xyz']) assert.ok(!ANALYTICS_PATH.test(route), route);

  // PROMPT 63: the address of Total Party Kill lives in lib/tpk.ts only; the old Vercel address is gone from the app.
  const tpkLinks = require('../lib/tpk.ts');
  assert.equal(tpkLinks.TPK_URL, 'https://www.totalpartykill.app');
  assert.equal(tpkLinks.TPK_CREATE_URL, 'https://www.totalpartykill.app/crea?ritorno=grimorio');
  assert.equal(tpkLinks.tpkImportUrl('#pg=abc'), 'https://www.totalpartykill.app/importa#pg=abc');
  const old = [];
  (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = `${dir}/${e.name}`; if (e.isDirectory()) { if (!['node_modules', '.next', '.git', 'test-results'].includes(e.name)) walk(f); } else if (/\.(ts|tsx|js|mjs|cjs|json|md)$/.test(e.name) && fs.readFileSync(f, 'utf8').includes('total-party-kill' + '.vercel.app')) old.push(f); } })('.');
  assert.deepEqual(old, [], 'the old address of TPK');
  assert.ok(!/totalpartykill/.test(fs.readFileSync('lib/security-headers.mjs', 'utf8')), 'TPK is only linked: nothing in the CSP');

  console.log(`I miei personaggi (beta): Brenna ${c.cardLine(brenna)}, scores and modifiers, names for every id of the shared file, saving in «${c.STORAGE_KEY}» (private window handled), hidden section, statistics without «#…».`);
})().catch(error => { console.error(error); process.exit(1); });
