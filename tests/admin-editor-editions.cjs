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
  const mod = {exports:{}}; cache.set(filename,mod);
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  function local(id) {
    if (id in deps) return deps[id];
    if (id.startsWith('@/') || id.startsWith('./')) {
      const file = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename),id);
      if (fs.existsSync(file+'.ts')) return load(file+'.ts');
      if (fs.existsSync(file+'/index.ts')) return load(file+'/index.ts');
    }
    return createRequire(filename)(id);
  }
  new Function('require','module','exports',code)(local,mod,mod.exports);
  return mod.exports;
}
(async()=>{
  const pg = new PGlite();
  const schema = load('lib/db/schema.ts');
  for (const table of [schema.spells,schema.monsters]) {
    const config = getTableConfig(table);
    const columns = config.columns.map(c => `${c.name} ${c.getSQLType()} ${c.primary?'PRIMARY KEY':''} ${c.notNull?'NOT NULL':''} ${c.hasDefault?`DEFAULT ${c.dataType==='number'?'10':c.dataType==='date'?'now()':"''"}`:''}`);
    await pg.exec(`CREATE TABLE ${config.name} (${columns.join(',')})`);
  }
  const database = drizzle(pg,{schema});
  let failMetadata = false, admin = true;
  const paths = [];
  const pool = {query:(sql,params)=>pg.query(sql,params),connect:async()=>({
    query:(sql,params)=>failMetadata && sql.startsWith('INSERT INTO grimorio_content_editions') ? Promise.reject(new Error('metadata unavailable')) : pg.query(sql,params),release(){}
  })};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db:database,pool};
  deps['drizzle-orm/node-postgres'] = {drizzle:()=>database};
  deps['@/lib/admin-auth'] = {isAdmin:async()=>admin};
  deps['next/cache'] = {revalidatePath:p=>paths.push(p)};
  const spells = load('app/actions/admin.ts'), monsters = load('app/actions/admin-monsters.ts');
  const storage = load('lib/content-editions.ts');
  const form = data => {const f=new FormData();for(const [k,v] of Object.entries(data))f.set(k,String(v));return f;};
  for (const [kind,actions,nameKey] of [['spell',spells,'nome_italiano'],['monster',monsters,'nome']]) {
    const create = kind==='spell'?actions.createSpellAction:actions.createMonsterAction;
    const update = kind==='spell'?actions.updateSpellAction:actions.updateMonsterAction;
    const table = kind==='spell'?'spells':'monsters';
    admin=false;
    await assert.rejects(()=>create(null,form({[nameKey]:'Non autorizzato',edition:'2014'})),/Non autorizzato/);
    admin=true;
    assert.equal((await create(null,form({[nameKey]:'Etichetta non valida',edition:'2030'}))).ok,false);
    assert.equal((await pg.query(`SELECT id FROM ${table}`)).rows.length,0);
    const created=await create(null,form({[nameKey]:'Scheda di prova',descrizione:'Testo personale',edition:'2014'}));
    assert.equal(created.ok,true);
    assert.equal((await storage.getContentEditions(kind,created.id)).get(created.id),'2014');
    assert.equal((await update(null,form({id:created.id,[nameKey]:'Scheda aggiornata',descrizione:'Effetti aggiornati',edition:'2024'}))).ok,true);
    assert.equal((await storage.getContentEditions(kind,created.id)).get(created.id),'2024');
    failMetadata=true;
    assert.equal((await update(null,form({id:created.id,[nameKey]:'Modifica da annullare',edition:'2014'}))).ok,false);
    assert.equal((await pg.query(`SELECT ${nameKey} AS name FROM ${table} WHERE id=$1`,[created.id])).rows[0].name,'Scheda aggiornata','metadata failure rolls back content update');
    assert.equal((await storage.getContentEditions(kind,created.id)).get(created.id),'2024');
    assert.equal((await create(null,form({[nameKey]:'Creazione da annullare',edition:'2014'}))).ok,false);
    assert.equal((await pg.query(`SELECT id FROM ${table}`)).rows.length,1,'metadata failure rolls back content creation');
    failMetadata=false;
    assert.equal((await update(null,form({id:'inesistente',[nameKey]:'Scheda mancante',edition:'2014'}))).ok,false);
    assert.equal((await storage.getContentEditions(kind,'inesistente')).size,0,'missing content cannot get an orphan label');
    assert.equal((await update(null,form({id:created.id,[nameKey]:'Scheda senza campo edizione'}))).ok,true);
    assert.equal((await storage.getContentEditions(kind,created.id)).get(created.id),'2024','old open forms preserve manual edition');
    assert.equal((await update(null,form({id:created.id,[nameKey]:'Scheda automatica',edition:''}))).ok,true);
    assert.equal((await storage.getContentEditions(kind,created.id)).has(created.id),false);
  }
  const official=JSON.parse(fs.readFileSync('lib/data/srd-italiano-5.2.1.json','utf8')).spells[0];
  await pg.query('INSERT INTO spells (id,nome_italiano,descrizione) VALUES ($1,$2,$3)',[official.id,'Fonte verificata',official.descrizione]);
  assert.equal((await spells.updateSpellAction(null,form({id:official.id,nome_italiano:'Fonte verificata',descrizione:official.descrizione,edition:'2014'}))).ok,false,'source safeguard also applies inside editor');
  assert.equal((await spells.updateSpellAction(null,form({id:official.id,nome_italiano:'Versione personale',descrizione:'Regole adattate al 2014',edition:'2014'}))).ok,true,'an edited unverified sheet can select 2014');
  assert.equal((await storage.getContentEditions('spell',official.id)).get(official.id),'2014');
  for(const route of ['/admin','/grimorio','/bestiario','/preferiti'])assert.ok(paths.includes(route),route);
  await pg.close();
  console.log('Editor editions: authenticated create/edit, both editions, reset, older forms, validation, source safeguard and atomic content/label rollback passed with PostgreSQL.');
})().catch(error=>{console.error(error);process.exitCode=1});
