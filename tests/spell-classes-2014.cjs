// «Classi incantesimi 2014» (/admin): the plan of the preview, one transaction with the values before in the
// Registro modifiche, the skipped spells, everything cancelled when a row does not match, nothing on a second
// run, the action closed without the administrator. In-memory database only (PGlite).
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
  if(id.startsWith('@/'))return load(id.slice(2)+(fs.existsSync(id.slice(2)+'.tsx')?'.tsx':'.ts'));
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}

(async()=>{
 const pg=new PGlite();
 deps['server-only']={};
 const schema=load('lib/db/schema.ts');
 const db=drizzle(pg,{schema});
 deps['./db']=deps['@/lib/db']={db,pool:{query:(sql,params)=>pg.query(sql,params)}};
 const plan=load('lib/spell-classes-2014-plan.ts');
 const lib=load('lib/spell-classes-2014.ts');
 await pg.exec(`CREATE TABLE spells (id text PRIMARY KEY, nome_italiano text NOT NULL, livello text NOT NULL DEFAULT '', tempo_di_lancio text NOT NULL DEFAULT '', gittata text NOT NULL DEFAULT '', componenti text NOT NULL DEFAULT '', durata text NOT NULL DEFAULT '', descrizione text NOT NULL DEFAULT '', sort_key text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE monsters (id text PRIMARY KEY, nome text NOT NULL);`);
 const ids=Object.keys(plan.CLASSES_2014);
 assert.equal(ids.length,34);
 // The rows as the administrator added them: one missing, one already with classes, one in an unexpected format.
 for(const id of ids){
  if(id==='tsunami-2')continue;
  const livello=id==='amicizia-2'?'Trucchetto di Ammaliamento':id==='sortilegio-2'?'Ammaliamento di 1° livello (warlock)':id==='telepatia-2'?'Invocazione di 8° livello':id==='evoca-raffica-2'?'Evocazione':'Evocazione di 3° livello';
  await pg.query('INSERT INTO spells (id, nome_italiano, livello, descrizione) VALUES ($1,$2,$3,$4)',[id,id===plan.RENAME_2014.id?plan.RENAME_2014.from:id,livello,'Testo di '+id]);
 }
 await pg.query("INSERT INTO spells (id, nome_italiano, livello) VALUES ('palla-di-fuoco-2014','Palla di fuoco','Invocazione di 3° livello (mago, stregone)'),('amicizia','Amicizia','Trucchetto di Ammaliamento')");
 const others=async()=>(await pg.query("SELECT md5(string_agg(t::text,'|' ORDER BY id)) h FROM spells t WHERE id = ANY($1)",[['palla-di-fuoco-2014','amicizia']])).rows[0].h;
 const untouched=await others();

 // Preview: SRD 2014 format, lower-case classes; skipped ones with their reason; the exact name only.
 let preview=await lib.spellClassesPlan();
 assert.equal(preview.changes.length,31);
 assert.deepEqual(preview.changes.find(c=>c.id==='amicizia-2'),{id:'amicizia-2',before:'Trucchetto di Ammaliamento',after:'Trucchetto di Ammaliamento (bardo, mago, stregone, warlock)'});
 assert.equal(preview.changes.find(c=>c.id==='telepatia-2').after,'Invocazione di 8° livello (mago)');
 assert.equal(preview.changes.find(c=>c.id==='parola-del-poter-guarire').after,'Evocazione di 3° livello (bardo)');
 assert.deepEqual(preview.skipped.map(s=>s.id).sort(),['evoca-raffica-2','sortilegio-2','tsunami-2']);
 assert.match(preview.skipped.find(s=>s.id==='tsunami-2').reason,/non esiste/);
 assert.match(preview.skipped.find(s=>s.id==='sortilegio-2').reason,/già le classi/);
 assert.match(preview.skipped.find(s=>s.id==='evoca-raffica-2').reason,/formato inatteso/);
 assert.equal(preview.rename,true);
 assert.equal(plan.planDone(preview),false);
 assert.equal(plan.planSpellClasses([{id:plan.RENAME_2014.id,livello:'Invocazione di 9° livello',nome_italiano:'Parola del potere Guarire'}]).rename,false,'only the exact name');

 // A row that fails in the middle cancels everything: no field, no Registro entry.
 await pg.exec(`CREATE FUNCTION stop() RETURNS trigger AS $$ BEGIN IF NEW.id = 'telepatia-2' THEN RAISE EXCEPTION 'prova'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql;
  CREATE TRIGGER stop BEFORE UPDATE ON spells FOR EACH ROW EXECUTE FUNCTION stop();`);
 const quiet=console.error,quietInfo=console.info;console.error=()=>{};console.info=()=>{};
 let result=await lib.applySpellClasses();
 console.error=quiet;console.info=quietInfo;
 assert.equal(result.ok,false);
 assert.equal((await pg.query("SELECT count(*)::int n FROM spells WHERE livello LIKE '%(%' AND id = ANY($1)",[ids])).rows[0].n,1,'only the one that already had classes');
 assert.equal((await pg.query('SELECT count(*)::int n FROM grimorio_editor_log')).rows[0].n,0,'no backup row left either');
 await pg.exec('DROP TRIGGER stop ON spells');

 // Apply: one transaction, the values before in the Registro, only «livello» and the one name.
 const before=(await pg.query('SELECT * FROM spells WHERE id = ANY($1) ORDER BY id',[ids])).rows;
 const info=console.info;let logged='';console.info=(...a)=>{logged+=a.join(' ');};
 result=await lib.applySpellClasses();
 console.info=info;
 assert.deepEqual(result,{ok:true,changed:31,renamed:true,skipped:['sortilegio-2','evoca-raffica-2','tsunami-2']});
 assert.match(logged,/backup prima della modifica/);assert.match(logged,/"livello":"Trucchetto di Ammaliamento"/);
 const after=(await pg.query('SELECT * FROM spells WHERE id = ANY($1) ORDER BY id',[ids])).rows;
 for(const row of after){
  const old=before.find(b=>b.id===row.id);
  for(const key of Object.keys(row)){
   if(key==='livello'||(key==='nome_italiano'&&row.id===plan.RENAME_2014.id))continue;
   assert.deepEqual(row[key],old[key],`${row.id}.${key} untouched`);
  }
 }
 assert.equal(after.find(r=>r.id==='amicizia-2').livello,'Trucchetto di Ammaliamento (bardo, mago, stregone, warlock)');
 assert.equal(after.find(r=>r.id===plan.RENAME_2014.id).nome_italiano,plan.RENAME_2014.to);
 assert.equal(after.find(r=>r.id==='sortilegio-2').livello,'Ammaliamento di 1° livello (warlock)');
 assert.equal(await others(),untouched,'no other spell changed');
 const registro=(await pg.query('SELECT scheda_id, campo, valore_prima, valore_dopo FROM grimorio_editor_log ORDER BY scheda_id, campo')).rows;
 assert.equal(registro.length,32,'31 livelli + 1 nome, each can be undone');
 assert.deepEqual(registro.find(r=>r.scheda_id==='telepatia-2'),{scheda_id:'telepatia-2',campo:'livello',valore_prima:'Invocazione di 8° livello',valore_dopo:'Invocazione di 8° livello (mago)'});
 // The app reads the classes from «livello».
 const {parseLivello}=require('../lib/spells-types.ts');
 assert.deepEqual(parseLivello(after.find(r=>r.id==='morte-apparente-2').livello).classi.map(c=>c.toLowerCase()),['bardo','chierico','druido','mago']);

 // Done: the box goes; a second run changes nothing.
 preview=await lib.spellClassesPlan();
 assert.equal(plan.planDone(preview),true);
 const snapshot=(await pg.query("SELECT md5(string_agg(t::text,'|' ORDER BY id)) h FROM spells t")).rows[0].h;
 result=await lib.applySpellClasses();
 assert.equal(result.ok,true);assert.equal(result.changed,0);assert.equal(result.renamed,false);
 assert.equal(result.skipped.length,34,'all of them skipped now: with classes, missing or in an unexpected format');
 assert.equal((await pg.query("SELECT md5(string_agg(t::text,'|' ORDER BY id)) h FROM spells t")).rows[0].h,snapshot);
 assert.equal((await pg.query('SELECT count(*)::int n FROM grimorio_editor_log')).rows[0].n,32);

 // The action: administrator only, checked before anything else.
 let applied=0;const paths=[];
 deps['next/cache']={revalidatePath:p=>paths.push(p),updateTag:t=>paths.push('tag:'+t)};
 let admin=false;
 deps['@/lib/admin-action-helpers']={requireAdmin:async()=>{if(!admin)throw new Error('Non autorizzato');}};
 deps['@/lib/spell-classes-2014']={applySpellClasses:async()=>{applied++;return {ok:true,changed:2,renamed:false,skipped:[]};}};
 const action=load('app/actions/admin-spell-classes.ts');
 await assert.rejects(action.applySpellClassesAction(),/Non autorizzato/);
 assert.equal(applied,0);
 admin=true;
 await action.applySpellClassesAction();
 assert.equal(applied,1);
 assert.ok(paths.includes('tag:spells')&&paths.includes('/grimorio')&&paths.includes('/spell/amicizia-2'),'cached pages refreshed');
 const source=fs.readFileSync('app/actions/admin-spell-classes.ts','utf8');
 assert.match(source,/^"use server";/);
 console.log('Classi incantesimi 2014: preview in the SRD 2014 format, 3 skipped with reason, exact name only, cancelled whole on a failing row, 31 livelli + 1 nome in one transaction with the Registro backup, nothing else changed, second run without effect, action closed without the administrator.');
})().catch(error=>{console.error(error);process.exit(1);});
