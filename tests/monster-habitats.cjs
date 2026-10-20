const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {createElement} = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {PGlite} = require('@electric-sql/pglite');
const {drizzle} = require('drizzle-orm/pglite');
const {getTableConfig} = require('drizzle-orm/pg-core');
const cache = new Map(), deps = {};
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = {exports:{}}; cache.set(filename,mod);
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id => {
    if (id in deps) return deps[id];
    if (id.startsWith('@/') || id.startsWith('./')) {
      const file = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename),id);
      for (const candidate of [file+'.ts', file+'.tsx', file+'/index.ts']) if (fs.existsSync(candidate)) return load(candidate);
    }
    return createRequire(filename)(id);
  },mod,mod.exports);
  return mod.exports;
}
const form = (data, habitats) => {
  const f = new FormData();
  for (const [k,v] of Object.entries(data)) f.set(k,String(v));
  if (habitats) { f.set('habitat_present','1'); for (const h of habitats) f.append('habitat',h); }
  return f;
};

(async()=>{
  // Pure helpers: fixed list, order, shared key between editions, "Qualsiasi" lives everywhere.
  const h = load('lib/habitats.ts');
  assert.equal(h.HABITATS.length,13);
  assert.deepEqual(h.normalizeHabitats(['Palude','Inventato','Artico','Palude']),['Artico','Palude']);
  assert.equal(h.habitatKey('sciame-di-ragni-2014'),'sciame-di-insetti','a linked 2014 sheet shares the 2024 habitat');
  assert.equal(h.habitatKey('orco-2014'),'orco-2014','a 2014-only sheet keeps its own');
  assert.equal(h.habitatsFromForm(form({})),undefined,'an older form without the field keeps the saved habitat');
  assert.deepEqual(h.habitatsFromForm(form({},[])),[],'unticking every box clears it');
  assert.equal(h.matchesHabitats(['Foresta'],[]),true);
  assert.equal(h.matchesHabitats(['Foresta','Collina'],['Collina','Deserto']),true);
  assert.equal(h.matchesHabitats(['Foresta'],['Deserto']),false);
  assert.equal(h.matchesHabitats(undefined,['Deserto']),false);
  assert.equal(h.matchesHabitats(['Qualsiasi'],['Deserto']),true);
  const links = JSON.parse(fs.readFileSync('lib/data/monster-edition-links.json','utf8')).links;
  const ids2014 = new Set(JSON.parse(fs.readFileSync('lib/data/srd-monsters-5.1-it.json','utf8')).records.map(r=>r.monster.id));
  const ids2024 = new Set(['srd-monsters-5.2.1-it','srd-animals-5.2.1-it'].flatMap(f=>JSON.parse(fs.readFileSync(`lib/data/${f}.json`,'utf8')).records.map(r=>r.monster.id)));
  for (const [id,link] of Object.entries(links)) {
    assert.ok(ids2014.has(id),`${id}: links start from a 2014 sheet`);
    assert.ok(ids2024.has(link.id2024),`${id}: links end at an existing 2024 sheet`);
  }
  for (const id of ids2014) assert.ok(id.endsWith('-2014') && !ids2024.has(id),`${id}: 2014 addresses never collide with 2024 ones`);
  const initial = JSON.parse(fs.readFileSync('lib/data/habitat-mostri.json','utf8'));
  for (const [id,list] of Object.entries(initial)) {
    assert.ok(ids2024.has(id)||ids2014.has(id),`habitat-mostri.json: unknown sheet ${id}`);
    assert.deepEqual(h.normalizeHabitats(list),list,`habitat-mostri.json: ${id} uses only the fixed list, in order`);
  }

  // Storage: readable before any save, created by the first admin save, admin choice wins.
  const pg = new PGlite();
  const schema = load('lib/db/schema.ts');
  for (const table of [schema.spells,schema.monsters]) {
    const config = getTableConfig(table);
    const columns = config.columns.map(c => `${c.name} ${c.getSQLType()} ${c.primary?'PRIMARY KEY':''} ${c.notNull?'NOT NULL':''} ${c.hasDefault?`DEFAULT ${c.dataType==='number'?'10':c.dataType==='date'?'now()':"''"}`:''}`);
    await pg.exec(`CREATE TABLE ${config.name} (${columns.join(',')})`);
  }
  const database = drizzle(pg,{schema});
  const pool = {query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>pg.query(sql,params),release(){}})};
  const paths = [];
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db:database,pool};
  deps['drizzle-orm/node-postgres'] = {drizzle:()=>database};
  deps['@/lib/admin-auth'] = {isAdmin:async()=>true};
  deps['next/cache'] = {revalidatePath:p=>paths.push(p), updateTag:()=>{}};
  const storage = load('lib/monster-habitats.ts');
  assert.equal((await storage.getMonsterHabitatOverrides()).size,0);
  assert.equal((await pg.query("SELECT to_regclass('grimorio_monster_habitats') AS name")).rows[0].name,null,'reads do not create storage');
  assert.deepEqual(storage.resolveHabitats('aboleth',new Map()),initial.aboleth ?? [],'without admin choices the project file is used');
  await storage.saveMonsterHabitats(database,'sciame-di-vespe-2014',['Foresta','Artico']);
  const overrides = await storage.getMonsterHabitatOverrides();
  assert.deepEqual(overrides.get('sciame-di-insetti'),['Artico','Foresta'],'saved under the 2024 sheet, in list order');
  assert.deepEqual(storage.resolveHabitats('sciame-di-insetti',overrides),['Artico','Foresta'],'the 2024 sheet shows the habitat set from the 2014 one');
  assert.deepEqual(storage.resolveHabitats('sciame-di-ragni-2014',overrides),['Artico','Foresta']);
  await storage.saveMonsterHabitats(database,'sciame-di-insetti',[]);
  assert.deepEqual(storage.resolveHabitats('sciame-di-insetti',await storage.getMonsterHabitatOverrides()),[],'an explicit empty choice wins over the file');

  // Admin actions: create and edit in the same transaction; project-only sheets save only the habitat.
  const actions = load('app/actions/admin-monsters.ts');
  const created = await actions.createMonsterAction(null,form({nome:'Guardiano di prova',forza:12},['Sottosuolo','Urbano']));
  assert.equal(created.ok,true);
  assert.deepEqual((await storage.getMonsterHabitatOverrides()).get(created.id),['Sottosuolo','Urbano'],'the creation form saves habitats');
  assert.equal((await actions.updateMonsterAction(null,form({id:created.id,nome:'Guardiano di prova'},['Palude']))).ok,true);
  assert.deepEqual((await storage.getMonsterHabitatOverrides()).get(created.id),['Palude'],'the edit form saves habitats');
  assert.equal((await actions.updateMonsterAction(null,form({id:created.id,nome:'Guardiano rinominato'}))).ok,true);
  assert.deepEqual((await storage.getMonsterHabitatOverrides()).get(created.id),['Palude'],'an older form without the field keeps them');
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'production';
  try {
    const result = await actions.updateMonsterAction(null,form({id:'orco-2014',nome:'Testo cambiato',edition:'2014'},['Collina','Montagna']));
    assert.equal(result.ok,true,'a sheet that exists only in the project files can get a habitat');
    assert.deepEqual((await storage.getMonsterHabitatOverrides()).get('orco-2014'),['Collina','Montagna']);
    assert.equal((await pg.query("SELECT id FROM monsters WHERE id='orco-2014'")).rows.length,0,'the monsters table is not touched for project sheets');
    assert.equal((await actions.updateMonsterAction(null,form({id:'orco-2014',nome:'Orco',edition:'2024'},['Collina']))).ok,false,'the edition label must stay the source edition');
    assert.equal((await actions.updateMonsterAction(null,form({id:'inesistente',nome:'X'},['Collina']))).ok,false,'unknown sheets are not created by an edit');
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = previous;
  }
  assert.ok(paths.includes('/bestiario'),'saves refresh the bestiary');

  // Public sheet: "Habitat" line only when known.
  const sheets = new Map([
    ['orco-2014',{...JSON.parse(fs.readFileSync('lib/data/srd-monsters-5.1-it.json','utf8')).records.find(r=>r.monster.id==='orco-2014').monster,habitat:['Collina','Montagna']}],
  ]);
  Object.assign(deps,{
    '@/lib/monsters':{getMonsterById:async id=>sheets.get(id)},
    'next/navigation':{notFound:()=>{throw new Error('NOT_FOUND');}},
    '@/components/back-button':{BackButton:()=>null},'@/components/share-button':{ShareButton:()=>null},'@/components/favorite-button':{FavoriteButton:()=>null},
    'next/link':{__esModule:true,default:({children,...props})=>createElement('a',props,children)},
  });
  const Page = load('app/mostro/[id]/page.tsx').default;
  const html = renderToStaticMarkup(await Page({params:Promise.resolve({id:'orco-2014'})}));
  assert.match(html,/Habitat<\/span> Collina, Montagna/);
  sheets.get('orco-2014').habitat = [];
  assert.ok(!renderToStaticMarkup(await Page({params:Promise.resolve({id:'orco-2014'})})).includes('Habitat'),'no empty habitat line');
  await assert.rejects(Page({params:Promise.resolve({id:'nessuno'})}),/NOT_FOUND/);

  // Old 2014 addresses: a permanent redirect at routing level, and renamed favorites.
  const config = (await import(require('node:url').pathToFileURL(path.resolve('next.config.mjs')).href)).default;
  const redirects = await config.redirects();
  const renamed = JSON.parse(fs.readFileSync('lib/data/renamed-monster-ids.json','utf8'));
  assert.deepEqual(redirects.map(r=>[r.source,r.destination,r.permanent]),[...renamed.map(id=>[`/mostro/${id}`,`/mostro/${id}-2014`,true]),['/spell/i-re-spirare-sott-acqua','/spell/i-re-spirare-sott-acqua-2',true]]);
  for (const id of renamed) {
    assert.ok(ids2014.has(`${id}-2014`),`${id}: redirects to an existing 2014 sheet`);
    assert.ok(!ids2024.has(id),`${id}: never hides a 2024 sheet`);
  }
  const aliases = load('lib/monster-id-aliases.ts');
  assert.equal(aliases.renameFavoriteId('mostro:orco'),'mostro:orco-2014');
  assert.equal(aliases.renameFavoriteId('mostro:aboleth'),'mostro:aboleth');
  assert.equal(aliases.renameFavoriteId('orco'),'orco','spell favorites keep their id');
  assert.equal(aliases.renameFavoriteId('i-re-spirare-sott-acqua'),'i-re-spirare-sott-acqua-2','a favorite of the hidden duplicate moves to the kept card');
  assert.equal(aliases.renameFavoriteId('i-re-spirare-sott-acqua-2'),'i-re-spirare-sott-acqua-2');
  console.log('Habitats: fixed list, shared 2014/2024 key, admin create/edit and project sheets, older forms, file fallback, sheet line and renamed 2014 addresses passed.');
})().catch(error=>{console.error(error);process.exit(1);});
