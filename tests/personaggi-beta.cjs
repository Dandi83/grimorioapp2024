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

  // PROMPT 71: «"ed"» of the shared file. To TPK: always "ed": "2024" (added to a sheet saved without it, like Brenna; the
  // saved sheet is not rewritten); "2024" unchanged; a 2014 sheet never goes (no button). Links from TPK: with or without
  // "ed"; a valid 2014 sheet is received (decodeHash refuses it for TPK) and the page says it cannot be used there.
  assert.equal('ed' in brenna, false, 'the example link of Brenna has no "ed"');
  const brennaTpk = c.sheetForTpk(brenna);
  assert.equal(brennaTpk.ed, '2024');
  assert.equal('ed' in brenna, false, 'the saved sheet is not rewritten');
  assert.deepEqual({ ...brennaTpk, ed: undefined }, { ...brenna, ed: undefined }, 'only "ed" is added');
  const playLink = require('../lib/tpk.ts').tpkImportUrl(await tpk.encodePg(brennaTpk));
  assert.match(playLink, /^https:\/\/www\.totalpartykill\.app\/importa#pg0?=[A-Za-z0-9_-]+$/);
  const back = await tpk.decodeHash(playLink.slice(playLink.indexOf('#')));
  assert.equal(back.ok, true, JSON.stringify(back));
  assert.equal(back.schede[0].ed, '2024', 'the link to TPK decodes with "ed": "2024"');
  assert.deepEqual({ ...back.schede[0], ed: undefined }, { ...brenna, ed: undefined }, 'the rest of Brenna unchanged');
  const brenna2024 = { ...brenna, ed: '2024' };
  assert.equal(c.sheetForTpk(brenna2024), brenna2024, '"ed": "2024" goes as it is');
  const brenna2014 = { ...brenna, ed: '2014' };
  assert.equal(c.sheetForTpk(brenna2014), null, 'a 2014 sheet never goes to TPK');
  assert.equal(c.isSheet2014(brenna2014), true);
  assert.equal(c.isSheet2014(brenna), false);
  assert.equal(c.isSheet2014(brenna2024), false);
  assert.equal(c.sheetForTpk({ ...brenna, tr: [...brenna.tr, 'luce-2014'] }), null, 'a 2014 spell is a sure sign too (as in TPK)');
  for (const [sheet, ed] of [[brenna, undefined], [brenna2024, '2024']]) {
    const hash = await tpk.encodePg(sheet);
    const got = c.incomingFromLink(hash, await tpk.decodeHash(hash));
    assert.equal(got.ok, true); assert.equal(got.party, false); assert.equal(got.sheets[0].ed, ed);
  }
  const hash2014 = await tpk.encodePg(brenna2014);
  const raw2014 = await tpk.decodeHash(hash2014);
  assert.equal(raw2014.ok, false, 'the shared file refuses the 2014 sheets (for TPK)');
  assert.ok(raw2014.edizione2014.includes('edizione 2014'));
  const got2014 = c.incomingFromLink(hash2014, raw2014);
  assert.equal(got2014.ok, true, 'the Grimorio receives a valid 2014 sheet');
  assert.equal(got2014.sheets[0].ed, '2014');
  const party2014 = await tpk.encodeParty([brenna, brenna2014]);
  const gotParty = c.incomingFromLink(party2014, await tpk.decodeHash(party2014));
  assert.equal(gotParty.ok, true); assert.equal(gotParty.party, true); assert.equal(gotParty.sheets.length, 2);
  const bad2014 = await tpk.encodePg({ ...brenna2014, c: 'artefice' });
  const gotBad = c.incomingFromLink(bad2014, await tpk.decodeHash(bad2014));
  assert.equal(gotBad.ok, false, 'a 2014 sheet with wrong fields is still a broken link');
  assert.ok(gotBad.errors[0].some(e => e.campo === 'c'));
  const app = fs.readFileSync('components/characters-beta/characters-app.tsx', 'utf8');
  assert.ok(app.includes('Total Party Kill usa le regole 2024') && app.includes('Personaggio con regole 2014: in Total Party Kill non si può usare'));
  assert.ok(app.includes('sheetForTpk(sheet)') && /encodePg\(forTpk\)/.test(app), 'the play link is made from the copy with "ed"');

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
