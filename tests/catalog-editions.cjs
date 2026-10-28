// Edition of every card of the catalog after the edition dropdown left the list rows: the editor shows
// the edition the public list gives each card (fixed for a verified SRD source, a dropdown otherwise),
// saving any card without changes writes nothing, and no public card changes edition.
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
  process.env.VERCEL_ENV = 'production';
  const pg = new PGlite();
  const schema = load('lib/db/schema.ts');
  for (const table of [schema.spells, schema.monsters]) {
    const config = getTableConfig(table);
    const columns = config.columns.map(c => `${c.name} ${c.getSQLType()} ${c.primary ? 'PRIMARY KEY' : ''} ${c.notNull ? 'NOT NULL' : ''} ${c.hasDefault ? `DEFAULT ${c.dataType === 'date' ? 'now()' : c.dataType === 'number' ? '10' : "''"}` : ''}`);
    await pg.exec(`CREATE TABLE ${config.name} (${columns.join(',')})`);
  }
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
  const {spellEdition} = load('lib/admin-edition.ts');
  const {getContentEditions, saveContentEdition} = load('lib/content-editions.ts');

  // Cards created here (no SRD source), one of them labelled 2014, and an SRD 2024 card stored in the database.
  await pg.query(`INSERT INTO spells (id,nome_italiano,livello,descrizione,sort_key) VALUES ('raggio-di-prova','Raggio di prova','Trucchetto di invocazione','Creato dal master.','raggio di prova'), ('nebbia-antica','Nebbia antica','Evocazione di 1° livello','Creato dal master.','nebbia antica')`);
  await saveContentEdition('spell', 'nebbia-antica', '2014');
  const publicEditions = async () => new Map((await getSpellIndex()).map(spell => [spell.id, spell.edizione === '2014' ? '2014' : '2024']));
  const before = await publicEditions();
  const admin = await spells.getAdminSpells();
  assert.equal(admin.length, before.size, 'the same cards');
  let srd51 = 0, srd521 = 0, summaries = 0, own = 0;
  for (const card of admin) {
    // The edition the editor shows is the edition of the public list.
    assert.equal(spellEdition(card), before.get(card.id), card.id);
    if (card.fonte === 'SRD 5.1') { srd51++; assert.equal(spellEdition(card), '2014', card.id); }
    else if (card.fonte === 'SRD 5.2.1') { srd521++; assert.equal(spellEdition(card), '2024', card.id); }
    // The four summaries added on 28/10/2026 are read from the files (one 2014, three 2024).
    else if (card.sintesi_progetto) { summaries++; assert.equal(spellEdition(card), card.id === 'manto-del-crociato-2014' ? '2014' : '2024', card.id); }
    else own++;
  }
  assert.equal(srd51, 319, 'every SRD 5.1 card has its fixed 2014 edition');
  assert.ok(srd521 >= 20, 'the SRD 5.2.1 cards have their fixed 2024 edition');
  assert.equal(summaries, 4, 'the summaries of the files keep their edition');
  assert.equal(own, 2, 'cards created here: the dropdown');

  // Every card saved from the editor without changes: nothing is written, no edition changes.
  const {updateSpellAction} = load('app/actions/admin.ts');
  const fields = ['nome_italiano', 'livello', 'tempo_di_lancio', 'gittata', 'componenti', 'durata', 'descrizione'];
  for (const card of admin) {
    const form = new FormData();
    form.set('id', card.id);
    for (const field of fields) form.set(field, card[field]);
    // An SRD card sends no edition (fixed text); the others send the dropdown, set to the card's edition.
    if (!card.fonte) form.set('edition', spellEdition(card));
    const result = await updateSpellAction(null, form);
    assert.equal(result.ok, true, `${card.id}: ${result.error}`);
  }
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM spells')).rows[0].n, 2, 'no row created');
  assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_editor_log").catch(() => ({rows: [{n: 0}]}))).rows[0].n, 0, 'nothing in the log');
  assert.deepEqual([...(await getContentEditions('spell')).entries()], [['nebbia-antica', '2014']], 'no new label, the saved one kept');
  assert.deepEqual([...(await publicEditions()).entries()], [...before.entries()], 'no public card changed edition');

  // Creatures: the edition of every card in the admin list is the public one; SRD sources fix it.
  const {getAllMonsters} = load('lib/monsters.ts');
  const {getMonsterListIndex} = load('lib/monster-index.ts');
  const {usesLegacyMonsterRules} = load('lib/srd-monsters.ts');
  const shown = new Map((await getMonsterListIndex()).map(monster => [monster.id, monster.edizione]));
  const monsters = await getAllMonsters();
  assert.equal(monsters.length, shown.size);
  let sourced = 0;
  for (const monster of monsters) {
    const edition = usesLegacyMonsterRules(monster) ? '2014' : '2024';
    assert.equal(edition, shown.get(monster.id), monster.id);
    if (monster.provenienza) {
      sourced++;
      assert.equal(monster.provenienza.edition, edition, `${monster.id}: fixed edition = source`);
      assert.equal(monster.provenienza.document, edition === '2014' ? 'SRD 5.1' : 'SRD 5.2.1', monster.id);
    }
  }
  assert.ok(sourced > 600, 'the SRD creatures show their fixed edition');

  // A creature created here: the dropdown at its own edition stores no label.
  const {updateMonsterAction} = load('app/actions/admin-monsters.ts');
  await pg.query(`INSERT INTO monsters (id,nome,tipo,sort_key) VALUES ('beholder','Beholder','Aberrazione','beholder')`);
  const form = new FormData();
  form.set('id', 'beholder'); form.set('nome', 'Beholder'); form.set('edition', '2024');
  assert.equal((await updateMonsterAction(null, form)).ok, true);
  assert.equal((await getContentEditions('monster')).has('beholder'), false, 'its own edition is not stored again');

  // Delete: never an SRD card (also when the action is called directly), always a card made here.
  const {deleteSpellAction} = load('app/actions/admin.ts');
  const {deleteMonsterAction} = load('app/actions/admin-monsters.ts');
  const del = id => { const f = new FormData(); f.set('id', id); return f; };
  const refused = {ok: false, error: 'Le schede SRD non si eliminano: si possono solo correggere.'};
  const card51 = admin.find(card => card.fonte === 'SRD 5.1'), card521 = admin.find(card => card.fonte === 'SRD 5.2.1');
  assert.deepEqual(await deleteSpellAction(del(card51.id)), refused, 'SRD 5.1 spell');
  assert.deepEqual(await deleteSpellAction(del(card521.id)), refused, 'SRD 5.2.1 spell');
  assert.deepEqual(await deleteMonsterAction(del('aboleth')), refused, 'SRD creature');
  assert.deepEqual(await deleteSpellAction(del('raggio-di-prova')), {ok: true}, 'a spell made here');
  assert.deepEqual(await deleteMonsterAction(del('beholder')), {ok: true}, 'a creature made here');
  assert.equal((await pg.query("SELECT count(*)::int AS n FROM spells WHERE id = 'raggio-di-prova'")).rows[0].n, 0);
  // The label of the source: the same rule in both editions.
  assert.deepEqual([...new Set(admin.map(card => card.origine))].sort(), ['Aggiunta da te', 'SRD 5.1', 'SRD 5.2.1', 'Sintesi originale']);
  assert.ok(admin.every(card => (card.origine === 'SRD 5.1' || card.origine === 'SRD 5.2.1') === !!card.fonte));
  // An original summary edited by the administrator stays NO SRD (its spell is not in the SRD); an SRD card edited has no label.
  assert.equal(spells.spellCardSource({ id: 'interdizione-alle-lame', descrizione: 'Testo riscritto dall’amministratore.' }), 'Sintesi originale');
  assert.equal(spells.spellCardSource({ id: 'palla-di-fuoco', descrizione: 'Testo riscritto dall’amministratore.' }), undefined);
  assert.equal(spells.spellCardSource({ id: 'nebbia-antica', descrizione: 'Creato dal master.' }), 'Aggiunta da te');

  await pg.close();
  console.log(`Catalog editions: ${admin.length} spells (${srd51} SRD 5.1, ${srd521} SRD 5.2.1, ${own} created here) and ${monsters.length} creatures keep their public edition; saving every spell without changes writes nothing.`);
})().catch(error => { console.error(error); process.exit(1); });
