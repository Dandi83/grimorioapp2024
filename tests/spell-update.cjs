// Spell editor: saving one changed field must leave every other column byte for byte as it was.
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
  const {changedSpellFields} = load('lib/spell-update.ts');
  const stored = {nome_italiano:'Palla di fuoco',livello:'Invocazione di 3° livello',tempo_di_lancio:'1 azione',gittata:'45 metri',componenti:'V, S, M',durata:'Istantanea',descrizione:'Una scia & un lampo.\r\n\r\nOgni creatura <b>subisce</b> 8d6 danni.  '};
  assert.deepEqual(changedSpellFields(stored,{...stored}),{},'identical form changes nothing');
  assert.deepEqual(changedSpellFields(stored,{gittata:'30 metri'}),{gittata:'30 metri'},'missing fields are left out');
  // What the visual editor gives back for an untouched description: entities, <strong>, no CR, trimmed.
  const reserialized = 'Una scia &amp; un lampo.\n\nOgni creatura <strong>subisce</strong> 8d6 danni.';
  assert.deepEqual(changedSpellFields(stored,{...stored,descrizione:reserialized,durata:'1 minuto'}),{durata:'1 minuto'});
  assert.deepEqual(changedSpellFields(stored,{descrizione:'Testo nuovo\r\nsu due righe'}),{descrizione:'Testo nuovo\nsu due righe'});

  const pg = new PGlite();
  const schema = load('lib/db/schema.ts');
  for (const table of [schema.spells]) {
    const config = getTableConfig(table);
    const columns = config.columns.map(c => `${c.name} ${c.getSQLType()} ${c.primary?'PRIMARY KEY':''} ${c.notNull?'NOT NULL':''} ${c.hasDefault?`DEFAULT ${c.dataType==='number'?'10':c.dataType==='date'?'now()':"''"}`:''}`);
    await pg.exec(`CREATE TABLE ${config.name} (${columns.join(',')})`);
  }
  const database = drizzle(pg,{schema});
  const pool = {query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>pg.query(sql,params),release(){}})};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db:database,pool};
  deps['drizzle-orm/node-postgres'] = {drizzle:()=>database};
  deps['@/lib/admin-auth'] = {isAdmin:async()=>true};
  deps['next/cache'] = {revalidatePath(){}, updateTag(){}};
  const {updateSpellAction} = load('app/actions/admin.ts');
  await pg.query(`INSERT INTO spells (id,nome_italiano,livello,tempo_di_lancio,gittata,componenti,durata,descrizione,sort_key) VALUES ('palla-di-fuoco',$1,$2,$3,$4,$5,$6,$7,'palla di fuoco')`,
    [stored.nome_italiano,stored.livello,stored.tempo_di_lancio,stored.gittata,stored.componenti,stored.durata,stored.descrizione]);
  const columns = 'nome_italiano,livello,tempo_di_lancio,gittata,componenti,durata,descrizione,sort_key';
  const row = async()=>(await pg.query(`SELECT ${columns} FROM spells WHERE id='palla-di-fuoco'`)).rows[0];
  const before = await row();
  const form = data => {const f=new FormData();for(const [k,v] of Object.entries(data))f.set(k,String(v));return f;};

  // The editor sends every field; only the range changed, the description comes back re-serialized.
  const result = await updateSpellAction(null,form({id:'palla-di-fuoco',...stored,descrizione:reserialized,gittata:'30 metri'}));
  assert.equal(result.ok,true,result.error);
  const after = await row();
  assert.equal(after.gittata,'30 metri');
  for (const column of columns.split(',').filter(column=>column!=='gittata')) {
    assert.ok(Buffer.from(after[column]).equals(Buffer.from(before[column])),`${column} stays byte for byte`);
  }
  const log = (await pg.query(`SELECT campo,valore_prima,valore_dopo FROM grimorio_editor_log WHERE scheda_id='palla-di-fuoco'`)).rows;
  assert.deepEqual(log,[{campo:'gittata',valore_prima:'45 metri',valore_dopo:'30 metri'}],'the log holds only the changed field');

  // An old open editor without the description field cannot empty it.
  assert.equal((await updateSpellAction(null,form({id:'palla-di-fuoco',nome_italiano:stored.nome_italiano,durata:'1 minuto'}))).ok,true);
  const later = await row();
  assert.equal(later.durata,'1 minuto');
  assert.ok(Buffer.from(later.descrizione).equals(Buffer.from(before.descrizione)),'description untouched');

  // A real change of the description is saved.
  assert.equal((await updateSpellAction(null,form({id:'palla-di-fuoco',...stored,gittata:'30 metri',durata:'1 minuto',descrizione:'Nuovo testo.'}))).ok,true);
  assert.equal((await row()).descrizione,'Nuovo testo.');
  assert.equal((await updateSpellAction(null,form({id:'palla-di-fuoco',nome_italiano:''}))).ok,false,'name stays required');
  assert.equal((await updateSpellAction(null,form({id:'inesistente',nome_italiano:'X'}))).ok,false);
  console.log('Spell editor: one changed field leaves the other columns byte for byte, old forms cannot empty fields, real changes are saved.');
})().catch(error=>{console.error(error);process.exit(1);});
