const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');

function load(relative, deps = {}) {
  const filename = path.resolve(relative), mod = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  new Function('require','module','exports',code)(id => deps[id] ?? createRequire(filename)(id),mod,mod.exports);
  return mod.exports;
}

(async () => {
  assert.ok(fs.existsSync('app/actions/admin-editions.ts'), 'an authenticated action must save the edition independently of monster/spell statistics');
  const {PGlite} = require('@electric-sql/pglite');
  const pg = new PGlite();
  let writes = 0;
  const pool = {
    query: (sql, params) => pg.query(sql, params),
    connect: async () => ({query: (sql, params) => {writes++; return pg.query(sql, params);}, release() {}}),
  };
  const storage = load('lib/content-editions.ts', {'server-only': {}, './db': {pool}});
  assert.deepEqual(await storage.getContentEditions('monster'), new Map(), 'reads before first admin save need no migration');
  const tables = await pg.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  assert.deepEqual(tables.rows, [], 'public reads must never create tables or alter production');
  await storage.saveContentEdition('monster', 'custom-test', '2014');
  assert.equal((await storage.getContentEditions('monster')).get('custom-test'), '2014');
  await storage.saveContentEdition('spell', 'custom-test', '2024');
  assert.equal((await storage.getContentEditions('spell')).get('custom-test'), '2024', 'spell and monster IDs are separate');
  assert.equal((await storage.getContentEditions('monster')).get('custom-test'), '2014');
  await storage.saveContentEdition('monster', 'custom-test', '2024');
  assert.equal((await storage.getContentEditions('monster', 'custom-test')).get('custom-test'), '2024');
  await storage.saveContentEdition('monster', 'custom-test', undefined);
  assert.equal((await storage.getContentEditions('monster')).has('custom-test'), false, 'automatic clears manual preference');
  assert.equal((await storage.getContentEditions('spell')).get('custom-test'), '2024');
  await pg.query('CREATE TABLE monsters (id text PRIMARY KEY)');
  await pg.query('CREATE TABLE spells (id text PRIMARY KEY)');
  await pg.query("INSERT INTO spells VALUES ('custom-test')");
  await storage.deleteContentWithEdition('spell', 'custom-test');
  await pg.query("INSERT INTO spells VALUES ('custom-test')");
  assert.equal((await storage.getContentEditions('spell')).has('custom-test'), false, 'delete/recreate must not inherit a previous label');
  await storage.saveContentEdition('spell', 'custom-test', '2024');
  const blockedDelete = load('lib/content-editions.ts', {'server-only': {}, './db': {pool: {
    connect: async () => ({query: (sql, params) => sql.startsWith('DELETE FROM grimorio_content_editions')
      ? Promise.reject(new Error('metadata write failed')) : pg.query(sql, params), release() {}}),
  }}});
  await assert.rejects(() => blockedDelete.deleteContentWithEdition('spell', 'custom-test'), /metadata write failed/);
  assert.equal((await pg.query("SELECT id FROM spells WHERE id='custom-test'")).rows.length, 1, 'failed metadata cleanup rolls back content deletion');
  await storage.saveContentEdition('monster', 'custom-test', '2014');
  const unsafeId = "x'); DROP TABLE grimorio_content_editions; --";
  await storage.saveContentEdition('monster', unsafeId, '2014');
  assert.equal((await storage.getContentEditions('monster')).get(unsafeId), '2014', 'IDs are query parameters');
  let admin = false;
  const revalidated = [];
  const monster = {id: 'new-manual-monster', nome: 'Creatura manuale', tratti: 'Testo originale'};
  const spell = {id: 'new-manual-spell', descrizione: 'Testo originale'};
  const provider = load('lib/srd-monsters.ts');
  const action = load('app/actions/admin-editions.ts', {
    'next/cache': {revalidatePath: p => revalidated.push(p)},
    '@/lib/admin-auth': {isAdmin: async () => admin},
    '@/lib/content-editions': storage,
    '@/lib/monsters': {getMonsterById: async id => id === monster.id ? monster : provider.previewMonsterById(id, 'preview')},
    '@/lib/spells': {getSpellById: async id => id === spell.id ? spell : id === 'verified-spell' ? {id,descrizione:'Official'} : undefined},
    '@/lib/srd-monsters': provider,
    '@/lib/srd-descriptions': {getSrdSource: id => id === 'verified-spell' ? {} : undefined},
    '@/lib/original-descriptions': {getOriginalSource: () => undefined},
  }).setContentEditionAction;
  const form = (kind, id, edition) => {const f = new FormData(); f.set('kind',kind); f.set('id',id); f.set('edition',edition); return f;};
  const before = writes;
  assert.equal((await action(null, form('monster', monster.id, '2014'))).ok, false);
  assert.equal(writes, before, 'unauthorized requests do not touch storage');
  admin = true;
  for (const f of [form('other',monster.id,'2014'),form('monster',monster.id,'2030'),form('monster','missing','2014')]) {
    assert.equal((await action(null,f)).ok,false);
  }
  assert.equal(writes,before,'invalid submissions never write');
  assert.equal((await action(null,form('monster','lich','2014'))).ok,false,'exact 2024 source cannot be relabeled 2014');
  assert.equal((await action(null,form('spell','verified-spell','2014'))).ok,false,'verified spell edition cannot be contradicted');
  assert.equal((await action(null,form('monster',monster.id,'2014'))).ok,true);
  assert.equal((await storage.getContentEditions('monster')).get(monster.id),'2014');
  assert.equal(monster.tratti,'Testo originale');
  assert.equal((await action(null,form('spell',spell.id,'2024'))).ok,true);
  assert.equal((await storage.getContentEditions('spell')).get(spell.id),'2024');
  const database = row => ({select: () => ({from: () => ({orderBy: async () => [row], where: () => ({limit: async () => [row]})})})});
  const monsterReader = load('lib/monsters.ts', {
    'server-only': {}, './db': {db:database(monster)}, './db/schema': {monsters:{}},
    './content-editions': storage, './monsters-types': load('lib/monsters-types.ts'), './srd-monsters': provider,
  });
  assert.equal((await monsterReader.getAllMonsters())[0].edizione,'2014');
  assert.equal((await monsterReader.getMonsterById(monster.id)).edizione,'2014');
  const spellReader = load('lib/spells.ts', {
    'server-only': {}, './db': {db:database({...spell,nome_italiano:'Incantesimo manuale',livello:'Trucchetto di invocazione (mago)'})},
    './db/schema': {spells:{}}, './content-editions': storage, './spells-types': load('lib/spells-types.ts'),
    './srd-descriptions': load('lib/srd-descriptions.ts'), './original-descriptions': load('lib/original-descriptions.ts'),
    './srd-additions': load('lib/srd-additions.ts'),
  });
  assert.equal((await spellReader.getAllSpells())[0].edizione,'2024');
  assert.equal((await spellReader.getSpellById(spell.id)).edizione,'2024');
  const srdSpell=JSON.parse(fs.readFileSync('lib/data/srd-italiano-5.2.1.json','utf8')).spells[0];
  const originalSpell=JSON.parse(fs.readFileSync('lib/data/original-descriptions-2024.json','utf8')).spells[0];
  for(const [record,expected] of [
    [srdSpell,'2024'],
    [originalSpell,'2024'],
    [{...srdSpell,descrizione:'Descrizione personalizzata successiva'},undefined],
    [{id:'custom-unclassified',descrizione:'Creato dal master'},undefined],
  ]) {
    const autoReader=load('lib/spells.ts',{
      'server-only':{},'./db':{db:database({...record,nome_italiano:record.appName||record.sourceName||'Personalizzato'})},
      './db/schema':{spells:{}},'./content-editions':{getContentEditions:async()=>new Map()},
      './spells-types':load('lib/spells-types.ts'),'./srd-descriptions':load('lib/srd-descriptions.ts'),
      './original-descriptions':load('lib/original-descriptions.ts'),'./srd-additions':load('lib/srd-additions.ts'),
    });
    assert.equal((await autoReader.getAllSpells())[0].edizione,expected,record.id+': catalog edition follows verified content');
    assert.equal((await autoReader.getSpellById(record.id)).edizione,expected,record.id+': detail edition follows verified content');
  }
  assert.ok(revalidated.includes('/bestiario') && revalidated.includes('/grimorio') && revalidated.includes('/preferiti') && revalidated.includes('/admin'));
  const failing = load('lib/content-editions.ts', {'server-only': {}, './db': {pool:{query:async()=>{throw Object.assign(new Error('offline'),{code:'ECONNREFUSED'});}}}});
  await assert.rejects(()=>failing.getContentEditions('monster'),/offline/,'connection errors cannot masquerade as empty metadata');
  const {AdminEditionPicker} = load('components/admin-edition-picker.tsx', {'@/app/actions/admin-editions': {setContentEditionAction: action}});
  const ui = renderToStaticMarkup(React.createElement(AdminEditionPicker,{kind:'monster',id:monster.id,name:monster.nome,edition:'2014'}));
  assert.ok(ui.includes('<select') && ui.includes('D&amp;D5e 2014') && ui.includes('D&amp;D5e 2024') && ui.includes('Automatica'));
  assert.ok(ui.includes('aria-label="Edizione di Creatura manuale"'));
  assert.ok(ui.includes('value="2014" selected=""'));
  const {MonsterProvenanceBadge} = load('components/monster-provenance-badge.tsx');
  const badge = renderToStaticMarkup(React.createElement(MonsterProvenanceBadge,{edition:'2014'}));
  assert.equal(badge.replace(/<[^>]*>/g,''),'D&amp;D5e 2014');
  assert.ok(badge.includes('data-monster-provenance="unverified"'),'manual edition must not certify an SRD source');
  assert.ok(!badge.includes('<a'),'manual edition cannot invent a source link');
  assert.equal(provider.usesLegacyMonsterRules({...monster,edizione:'2014'}),true,'manual 2014 records must not link to 2024 conditions');
  await pg.close();
  console.log('Admin editions: real PostgreSQL SQL persistence, namespace separation, reset, parameters, authorization, validation, source safeguards, dropdown and manual badge passed.');
})().catch(error => {console.error(error); process.exit(1);});
