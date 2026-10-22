const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const {drizzle}=require('drizzle-orm/pglite');

const deps={},cache=new Map();
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id in deps)return deps[id];
  if(id.startsWith('./'))return load(path.resolve(path.dirname(filename),id)+'.ts');
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}

(async()=>{
 const pg=new PGlite();
 deps['server-only']={};
 deps['./db']={pool:{query:(sql,params)=>pg.query(sql,params)}};
 const schema=load('lib/db/schema.ts');
 const log=load('lib/editor-log.ts');
 const db=drizzle(pg,{schema});
 await pg.exec(`CREATE TABLE spells (id text PRIMARY KEY, nome_italiano text NOT NULL, livello text NOT NULL DEFAULT '', tempo_di_lancio text NOT NULL DEFAULT '', gittata text NOT NULL DEFAULT '', componenti text NOT NULL DEFAULT '', durata text NOT NULL DEFAULT '', descrizione text NOT NULL DEFAULT '', sort_key text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE monsters (id text PRIMARY KEY, nome text NOT NULL, ${['tipo','taglia','allineamento','grado_sfida','px','classe_armatura','punti_ferita','velocita'].map(c=>`${c} text NOT NULL DEFAULT ''`).join(', ')},
   ${['forza','destrezza','costituzione','intelligenza','saggezza','carisma'].map(c=>`${c} integer NOT NULL DEFAULT 10`).join(', ')},
   ${['tiri_salvezza','abilita','vulnerabilita','resistenze','immunita_danni','immunita_condizioni','sensi','linguaggi','tratti','azioni','reazioni','azioni_leggendarie','descrizione','sort_key'].map(c=>`${c} text NOT NULL DEFAULT ''`).join(', ')},
   created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`);
 await pg.query("INSERT INTO spells (id, nome_italiano, gittata, descrizione) VALUES ('palla-di-fuoco', 'Palla di fuoco', '45 metri', 'Testo')");
 await pg.query("INSERT INTO monsters (id, nome, forza) VALUES ('goblin', 'Goblin', 8)");
 assert.equal(await log.editorLogReady(),true);

 // Only the changed editor fields are logged, before → after, inside the editor's transaction.
 await db.transaction(tx=>log.logEditorSave(tx,'incantesimi','palla-di-fuoco',{nome_italiano:'Palla di fuoco',livello:'',tempo_di_lancio:'',gittata:'48 metri',componenti:'',durata:'',descrizione:'Testo'}));
 await pg.query("UPDATE spells SET gittata = '48 metri' WHERE id = 'palla-di-fuoco'");
 let rows=await log.allEditorLog();
 assert.equal(rows.length,1);assert.deepEqual([rows[0].campo,rows[0].valore_prima,rows[0].valore_dopo],['gittata','45 metri','48 metri']);
 assert.deepEqual(log.editorChanges('mostri',{forza:8,nome:'Goblin'},{forza:10,nome:'Goblin'}),[{campo:'forza',valore_prima:'8',valore_dopo:'10'}]);
 await db.transaction(tx=>log.logEditorSave(tx,'mostri','goblin',{nome:'Goblin',forza:12}));
 await pg.query("UPDATE monsters SET forza = 12 WHERE id = 'goblin'");

 // A later change of the same field blocks the undo of the older one (nothing is lost).
 await db.transaction(tx=>log.logEditorSave(tx,'incantesimi','palla-di-fuoco',{gittata:'50 metri'}));
 await pg.query("UPDATE spells SET gittata = '50 metri' WHERE id = 'palla-di-fuoco'");
 rows=await log.allEditorLog();
 const older=rows.find(r=>r.valore_dopo==='48 metri'),newer=rows.find(r=>r.valore_dopo==='50 metri');
 let result=await db.transaction(tx=>log.undoEditorChange(tx,older.id));
 assert.equal(result.ok,false);assert.match(result.error,/annulla prima la modifica più recente/);
 result=await db.transaction(tx=>log.undoEditorChange(tx,newer.id));
 assert.equal(result.ok,true);
 assert.equal((await pg.query("SELECT gittata FROM spells WHERE id='palla-di-fuoco'")).rows[0].gittata,'48 metri');
 result=await db.transaction(tx=>log.undoEditorChange(tx,older.id));
 assert.equal(result.ok,true);
 assert.equal((await pg.query("SELECT gittata FROM spells WHERE id='palla-di-fuoco'")).rows[0].gittata,'45 metri');
 assert.equal((await db.transaction(tx=>log.undoEditorChange(tx,older.id))).ok,false,'no double undo');

 // Integer columns go back as numbers.
 const forza=(await log.allEditorLog()).find(r=>r.campo==='forza');
 assert.equal((await db.transaction(tx=>log.undoEditorChange(tx,forza.id))).ok,true);
 assert.equal((await pg.query("SELECT forza FROM monsters WHERE id='goblin'")).rows[0].forza,8);
 assert.equal((await db.transaction(tx=>log.undoEditorChange(tx,'11111111-1111-4111-8111-111111111111'))).ok,false);
 await pg.close();
 console.log('Editor log: spell and creature editor changes logged field by field, undo restores the previous value only when no later change would be lost, integers kept.');
})().catch(error=>{console.error(error);process.exit(1);});
