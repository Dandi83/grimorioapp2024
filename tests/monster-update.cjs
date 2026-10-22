// Creature editor: saving one changed field must leave every other column (and the optional
// fields) byte for byte as it was, and the Registro modifiche must list only that field.
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
  const config = getTableConfig(schema.monsters);
  const columns = config.columns.map(c => `${c.name} ${c.getSQLType()} ${c.primary?'PRIMARY KEY':''} ${c.notNull?'NOT NULL':''} ${c.hasDefault?`DEFAULT ${c.dataType==='number'?'10':c.dataType==='date'?'now()':"''"}`:''}`);
  await pg.exec(`CREATE TABLE ${config.name} (${columns.join(',')})`);
  const database = drizzle(pg,{schema});
  const pool = {query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>pg.query(sql,params),release(){}})};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db:database,pool};
  deps['drizzle-orm/node-postgres'] = {drizzle:()=>database};
  deps['@/lib/admin-auth'] = {isAdmin:async()=>true};
  deps['next/cache'] = {revalidatePath(){}, updateTag(){}};
  const {createMonsterAction, updateMonsterAction} = load('app/actions/admin-monsters.ts');
  const form = data => {const f=new FormData();for(const [k,v] of Object.entries(data))f.set(k,String(v));return f;};

  // Stored texts with what a re-serialization would change: CR LF, trailing spaces, entities, <b>.
  const sheet = {
    nome:'Guardiano di pietra', tipo:'Costrutto', taglia:'Grande', allineamento:'Neutrale', grado_sfida:'4', px:'1100',
    classe_armatura:'17 (armatura naturale)', punti_ferita:'60 (8d10 + 16)', velocita:'9 m', forza:18, destrezza:8, costituzione:15,
    intelligenza:3, saggezza:11, carisma:1, tiri_salvezza:'', abilita:'Percezione +3', vulnerabilita:'', resistenze:'',
    immunita_danni:'Veleno', immunita_condizioni:'Avvelenato', sensi:'Scurovisione 18 m', linguaggi:'—',
    tratti:'<b>Forma immutabile.</b> Resiste a ogni effetto che & ne altera la forma.\r\n\r\n<b>Pietra.</b> Sembra una statua.  ',
    azioni:'<strong>Schianto.</strong> <em>Attacco con arma da mischia:</em> +6 a colpire. ',
    reazioni:'', azioni_leggendarie:'', descrizione:'Un guardiano antico.\r\nVeglia sulle tombe. ',
  };
  const created = await createMonsterAction(null,form({...sheet,edition:'2024',iniziativa:'+0 (10)',azioni_bonus:'<b>Passo.</b> Si sposta & attacca. '}));
  assert.equal(created.ok,true,created.error);
  const id = created.id;
  // Write the exact stored bytes (creation trims the values, an older import may not have).
  await pg.query(`UPDATE monsters SET tratti=$1, azioni=$2, descrizione=$3 WHERE id=$4`,[sheet.tratti,sheet.azioni,sheet.descrizione,id]);
  await pg.query(`UPDATE grimorio_monster_details SET fields = jsonb_set(fields,'{azioni_bonus}',to_jsonb($1::text)) WHERE monster_id=$2`,['<b>Passo.</b> Si sposta & attacca. ',id]);
  const columnsList = Object.keys(sheet).concat('sort_key');
  const row = async()=>(await pg.query(`SELECT ${columnsList.join(',')} FROM monsters WHERE id=$1`,[id])).rows[0];
  const extras = async()=>(await pg.query(`SELECT fields FROM grimorio_monster_details WHERE monster_id=$1`,[id])).rows[0].fields;
  const before = await row(), extrasBefore = await extras();
  const bytes = value => Buffer.from(String(value));

  // The editor sends every field; the visual blocks come back re-serialized, only the AC changed.
  const reserialized = {
    tratti:'<strong>Forma immutabile.</strong> Resiste a ogni effetto che &amp; ne altera la forma.\n\n<strong>Pietra.</strong> Sembra una statua.',
    azioni:'<strong>Schianto.</strong> <em>Attacco con arma da mischia:</em> +6 a colpire.',
    descrizione:'Un guardiano antico.\nVeglia sulle tombe.',
  };
  const result = await updateMonsterAction(null,form({id,...sheet,...reserialized,classe_armatura:'18 (armatura naturale)',edition:'2024',iniziativa:'+0 (10)',azioni_bonus:'<strong>Passo.</strong> Si sposta &amp; attacca.'}));
  assert.equal(result.ok,true,result.error);
  const after = await row();
  assert.equal(after.classe_armatura,'18 (armatura naturale)');
  for (const column of columnsList.filter(column=>column!=='classe_armatura')) {
    assert.ok(bytes(after[column]).equals(bytes(before[column])),`${column} stays byte for byte`);
  }
  assert.ok(bytes(JSON.stringify(await extras())).equals(bytes(JSON.stringify(extrasBefore))),'optional fields stay byte for byte');
  const log = (await pg.query(`SELECT campo,valore_prima,valore_dopo FROM grimorio_editor_log WHERE scheda_id=$1`,[id])).rows;
  assert.deepEqual(log,[{campo:'classe_armatura',valore_prima:'17 (armatura naturale)',valore_dopo:'18 (armatura naturale)'}],'the log holds only the changed field');

  // An old open editor with only a few fields cannot empty texts or reset the scores to 10.
  assert.equal((await updateMonsterAction(null,form({id,nome:sheet.nome,punti_ferita:'65 (9d10 + 16)'}))).ok,true);
  const later = await row();
  assert.equal(later.punti_ferita,'65 (9d10 + 16)');
  for (const column of ['tratti','azioni','descrizione','forza','carisma','classe_armatura']) assert.ok(bytes(later[column]).equals(bytes(after[column])),`${column} untouched by a partial form`);

  // Real changes are saved, also in the optional fields.
  assert.equal((await updateMonsterAction(null,form({id,...sheet,tratti:'<strong>Nuovo tratto.</strong> Testo.',forza:20,azioni_bonus:'Nessuna.'}))).ok,true);
  const changed = await row();
  assert.equal(changed.tratti,'<strong>Nuovo tratto.</strong> Testo.');
  assert.equal(changed.forza,20);
  assert.equal((await extras()).azioni_bonus,'Nessuna.');
  assert.equal((await updateMonsterAction(null,form({id,nome:''}))).ok,false,'name stays required');
  assert.equal((await updateMonsterAction(null,form({id:'inesistente',nome:'X'}))).ok,false);
  console.log('Creature editor: one changed field leaves the other columns and optional fields byte for byte, the log lists only that field, old forms cannot empty fields.');
})().catch(error=>{console.error(error);process.exit(1);});
