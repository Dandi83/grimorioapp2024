// Run with --conditions=react-server: exercise React.cache in real RSC renders,
// not the client no-op implementation or a replacement cache in the test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {Writable} = require('node:stream');
const ts = require('typescript');
const React = require('react');
const {renderToPipeableStream} = require('next/dist/compiled/react-server-dom-webpack/server.node');

function load(relative, deps = {}) {
  const filename = path.resolve(relative), mod = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{
    module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, esModuleInterop:true,
  }}).outputText;
  new Function('require', 'module', 'exports', code)(id => deps[id] ?? createRequire(filename)(id), mod, mod.exports);
  return mod.exports;
}

async function render(check) {
  let failure;
  async function Page() { await check(); return React.createElement('p', null, 'checked'); }
  await new Promise((resolve, reject) => {
    const stream = renderToPipeableStream(React.createElement(Page), {}, {onError:error => {failure = error;}});
    stream.pipe(new Writable({write(chunk, encoding, done) {done();}, final(done) {done();}}))
      .on('finish', resolve).on('error', reject);
  });
  if (failure) throw failure;
}

(async () => {
  for (const kind of ['monster', 'spell']) {
    let revision = 1, rowReads = 0, editionReads = 0, extraReads = 0, missing = false;
    const db = {select:() => ({from:() => ({where:() => ({limit:async () => {
      rowReads++;
      return missing ? [] : [{id:'manual', nome:`Creatura ${revision}`, nome_italiano:`Incantesimo ${revision}`, livello:'', descrizione:'Testo manuale'}];
    }})})})};
    const deps = {
      'server-only':{}, './db':{db}, './db/schema':{monsters:{id:{}}, spells:{id:{}}},
      'drizzle-orm':{eq:() => ({}), asc:() => ({})},
      './content-editions':{getContentEditions:async () => {editionReads++; return new Map([['manual', revision === 1 ? '2014' : '2024']]);}, getOriginalSummaries:async () => new Set()},
      './monster-extra-storage':{getMonsterExtraFields:async () => {extraReads++; return new Map([['manual', {iniziativa:`+${revision}`}]]);}},
      './monster-habitats':{getMonsterHabitatOverrides:async () => new Map(), resolveHabitats:() => []},
      './homebrew':{getHomebrew:async () => undefined, homebrewMonster:row => row}, './homebrew-types':{isHomebrewId:id => id.startsWith('homebrew-')},
      './monsters-types':load('lib/monsters-types.ts'),
      './spells-types':load('lib/spells-types.ts'),
      './srd-monsters':{previewMonsterById:() => undefined, getSrdMonsterSource:() => undefined, isSrdMonsterId:() => true},
      './srd-descriptions':{applySrdDescription:row => row, getSrdSource:() => undefined},
      './original-descriptions':{applyOriginalDescription:row => row, getOriginalSource:() => undefined, originalEdition:() => undefined},
      './srd-additions':{previewSpellById:() => undefined},
      './srd-spells-2014':{legacySpellById:() => undefined, isLegacySpellId:() => false, getLegacySpellSource:() => undefined},
      './spell-catalog-repairs':{repairCatalogSpell:row => row},
      './spell-display-row':{displaySpellRow:row => row},
      './spell-text-repairs':{repairSpellText:(_id, text) => text},
      './monster-id-aliases':{MERGED_SPELL_IDS:{}},
      './spell-name':{spellName:name => name},
    };
    const reader = load(`lib/${kind === 'monster' ? 'monsters' : 'spells'}.ts`, deps);
    const read = kind === 'monster' ? reader.getMonsterById : reader.getSpellById;
    await render(async () => {
      const [metadata, page] = await Promise.all([read('manual'), read('manual')]);
      assert.strictEqual(metadata, page, 'metadata and page share the pending read');
      assert.strictEqual(await read('manual'), page, 'later reads reuse the resolved value');
      await read('another-id');
    });
    assert.equal(rowReads, 2, 'one database read per distinct ID');
    assert.equal(editionReads, 2);
    if (kind === 'monster') assert.equal(extraReads, 2);
    revision = 2;
    await render(async () => {
      const updated = await read('manual');
      assert.equal(updated.edizione, '2024', 'a new request sees administrative edition changes');
      if (kind === 'monster') assert.equal(updated.iniziativa, '+2', 'optional fields refresh too');
      else assert.equal(updated.nome_italiano, 'Incantesimo 2');
    });
    assert.equal(rowReads, 3, 'no cache shared across requests');
    missing = true;
    await render(async () => {
      const values = await Promise.all([read('deleted'), read('deleted')]);
      assert.deepEqual(values, [undefined, undefined]);
    });
    assert.equal(rowReads, 4, 'missing records also deduplicate');
  }
  console.log('RSC catalog reads: concurrent metadata/page deduplication, distinct IDs, fresh edits per request and missing records passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
