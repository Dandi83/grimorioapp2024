// Spells of the project files in the reserved area (lib/spells.ts getAdminSpells, updateSpellAction, undo):
// the admin sees the same catalog as the public list for each edition; a file card is edited like the
// others (its first real change creates the row, only the changed fields go to the log), a save without
// changes writes nothing, and undoing back to the file values makes the card read from the file again.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {PGlite} = require('@electric-sql/pglite');
const {drizzle} = require('drizzle-orm/pglite');
const {getTableConfig} = require('drizzle-orm/pg-core');
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
      if (fs.existsSync(file + '/index.ts')) return load(file + '/index.ts');
      if (fs.existsSync(file)) return createRequire(filename)(file);
    }
    return createRequire(filename)(id);
  }, mod, mod.exports);
  return mod.exports;
}

(async () => {
  // Same catalog rules as the site: the SRD file cards are published.
  process.env.VERCEL_ENV = 'production';
  const pg = new PGlite();
  const schema = load('lib/db/schema.ts');
  const config = getTableConfig(schema.spells);
  const columns = config.columns.map(c => `${c.name} ${c.getSQLType()} ${c.primary ? 'PRIMARY KEY' : ''} ${c.notNull ? 'NOT NULL' : ''} ${c.hasDefault ? `DEFAULT ${c.dataType === 'date' ? 'now()' : "''"}` : ''}`);
  await pg.exec(`CREATE TABLE ${config.name} (${columns.join(',')})`);
  const database = drizzle(pg, {schema});
  const pool = {query: (sql, params) => pg.query(sql, params), connect: async () => ({query: (sql, params) => pg.query(sql, params), release() {}})};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db: database, pool};
  deps['drizzle-orm/node-postgres'] = {drizzle: () => database};
  deps['@/lib/admin-auth'] = {isAdmin: async () => true};
  deps['next/cache'] = {revalidatePath() {}, updateTag() {}, unstable_cache: fn => fn};
  deps['react'] = {cache: fn => fn};
  const spells = load('lib/spells.ts');
  const {getSpellIndex} = load('lib/spell-index.ts');
  const {MERGED_SPELL_IDS} = load('lib/monster-id-aliases.ts');
  const legacy = load('lib/srd-spells-2014.ts');
  const {spellEdition} = load('lib/admin-edition.ts');
  const files = require('../lib/data/srd-spells-5.1-it.json');

  // A database row of the 2024 catalog and one merged duplicate (its address redirects: not listed).
  const merged = Object.keys(MERGED_SPELL_IDS)[0];
  for (const [id, nome] of [['palla-di-fuoco', 'Palla di fuoco'], [merged, 'Doppione']]) {
    await pg.query(`INSERT INTO spells (id,nome_italiano,livello,descrizione,sort_key) VALUES ($1,$2,'Invocazione di 3° livello','Testo.',$3)`, [id, nome, nome.toLowerCase()]);
  }
  const counts = list => ({'2024': list.filter(spell => spell.edizione !== '2014').length, '2014': list.filter(spell => spell.edizione === '2014').length});
  const admin = await spells.getAdminSpells();
  const adminCounts = {'2024': admin.filter(spell => spellEdition(spell) === '2024').length, '2014': admin.filter(spell => spellEdition(spell) === '2014').length};
  assert.deepEqual(adminCounts, counts(await getSpellIndex()), 'admin = public list, for both editions');
  assert.equal(adminCounts['2014'], files.records.length, 'every 2014 card of the SRD 5.1 file');
  assert.ok(!admin.some(spell => spell.id === merged), 'merged duplicates are not listed');
  assert.ok(admin.find(spell => spell.id === 'palla-di-fuoco') && !admin.find(spell => spell.id === 'palla-di-fuoco').da_file);

  // One 2014 card of the files: opened in the editor with the file values.
  const id = files.records[0].spell.id;
  const file = files.records[0].spell;
  const card = admin.find(spell => spell.id === id);
  assert.equal(card.da_file, true);
  assert.equal(card.edizione, '2014');
  assert.equal(card.descrizione, file.descrizione, 'the stored file text, not the display repairs');
  const publicBefore = (await spells.getAllSpells()).find(spell => spell.id === id);
  assert.ok(legacy.getLegacySpellSource(file), 'SRD source before any change');

  const {updateSpellAction} = load('app/actions/admin.ts');
  const form = data => { const f = new FormData(); for (const [k, v] of Object.entries(data)) f.set(k, String(v)); return f; };
  const rows = async () => (await pg.query('SELECT * FROM spells WHERE id = $1', [id])).rows;
  const logRows = async () => (await pg.query("SELECT id, campo, valore_prima, valore_dopo, annullata_il FROM grimorio_editor_log WHERE scheda_id = $1 ORDER BY creata_il", [id]).catch(() => ({rows: []}))).rows;
  const labels = async () => (await pg.query("SELECT * FROM grimorio_content_editions WHERE content_id = $1", [id]).catch(() => ({rows: []}))).rows;

  // Save without changes (the editor sends every field and the edition it shows): nothing is created.
  assert.deepEqual(await updateSpellAction(null, form({id, ...file, edition: '2014'})), {ok: true, error: null, id});
  assert.deepEqual([await rows(), await logRows(), await labels()], [[], [], []], 'no row, no log line, no label');
  // The description as the visual editor gives it back is not a change either.
  assert.deepEqual(await updateSpellAction(null, form({id, ...file, descrizione: `${file.descrizione}\n`, edition: '2014'})), {ok: true, error: null, id});
  assert.equal((await rows()).length, 0);

  // One field changed: the row is created with the file values, only that field is new and logged.
  const range = file.gittata === '18 metri' ? '27 metri' : '18 metri';
  // It would take the SRD box away: asked first, nothing written (components/admin-srd-warning.tsx); then «Salva comunque».
  assert.deepEqual(await updateSpellAction(null, form({id, ...file, gittata: range, edition: '2014'})), {ok: false, error: '', srdWarning: true});
  assert.equal((await rows()).length, 0, 'nothing saved without confirmation');
  assert.equal((await updateSpellAction(null, form({id, ...file, gittata: range, edition: '2014', 'perdi-srd': '1'}))).ok, true);
  const [row] = await rows();
  for (const field of ['nome_italiano', 'livello', 'tempo_di_lancio', 'componenti', 'durata', 'descrizione']) assert.equal(row[field], file[field], `${field} as in the file`);
  assert.equal(row.gittata, range);
  const log = await logRows();
  assert.deepEqual(log.map(({campo, valore_prima, valore_dopo}) => ({campo, valore_prima, valore_dopo})), [{campo: 'gittata', valore_prima: file.gittata, valore_dopo: range}], 'only the changed field in the log');
  assert.deepEqual(await labels(), [], 'the edition it already had is not stored as a label');
  const changed = (await spells.getAllSpells()).find(spell => spell.id === id);
  assert.equal(changed.gittata, range);
  assert.equal(changed.edizione, '2014', 'still a 2014 card');
  assert.equal(legacy.getLegacySpellSource(changed), undefined, 'a changed text loses the SRD source label');
  const after = await spells.getAdminSpells();
  assert.deepEqual(counts(after), counts(admin), 'the same cards, one now in the database');
  assert.equal(after.find(spell => spell.id === id).da_file, undefined);

  // Undo from the Registro: back to the file values, the row goes away, the public card is identical.
  const {undoEditorAction} = load('app/actions/admin-content.ts');
  const undone = await undoEditorAction(form({id: log[0].id}));
  assert.equal(undone.ok, true, undone.error);
  assert.deepEqual(await rows(), [], 'read from the file again');
  assert.deepEqual((await spells.getAllSpells()).find(spell => spell.id === id), publicBefore, 'public card identical to before');
  assert.ok((await logRows())[0].annullata_il, 'the log line is marked undone');

  // A database card (not from the files) keeps its row after an undo.
  await updateSpellAction(null, form({id: 'palla-di-fuoco', nome_italiano: 'Palla di fuoco', livello: 'Invocazione di 3° livello', descrizione: 'Testo.', durata: 'Istantanea', 'perdi-srd': '1'}));
  const [fire] = (await pg.query("SELECT id FROM grimorio_editor_log WHERE scheda_id = 'palla-di-fuoco'")).rows;
  assert.equal((await undoEditorAction(form({id: fire.id}))).ok, true);
  assert.equal((await pg.query("SELECT count(*)::int AS n FROM spells WHERE id = 'palla-di-fuoco'")).rows[0].n, 1);

  await pg.close();
  console.log('File spells: admin catalog = public list per edition (319 SRD 2014 cards), merged duplicates left out, no-change save writes nothing, one changed field creates the row and one log line, undo reads the file again with an identical public card.');
})().catch(error => { console.error(error); process.exit(1); });
