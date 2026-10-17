import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const mode=process.argv[2];
assert.ok(['--verify','--apply'].includes(mode), 'Use --verify (ROLLBACK) or --apply (authorized production only)');
assert.equal(process.env.VERCEL_PROJECT_ID,'prj_PjDCPQlG4DMh9p2ZIlBTppZMSGMq','Unexpected Vercel project');
assert.ok(process.env.DATABASE_URL,'Use the project-configured DATABASE_URL');
if(mode==='--apply') assert.equal(process.env.VERCEL_ENV,'production','Applying requires authorized production execution');
const source=JSON.parse(readFileSync(new URL('../../lib/data/srd-italiano-5.2.1.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../../lib/data/srd-additions-20261017.json',import.meta.url),'utf8'));
assert.equal(manifest.sourcePdfSha256,source.sourcePdfSha256);
const rows=manifest.spells.map(({id,sourceName})=>{
  const spell=source.spells.find(s=>s.id===id);
  assert.equal(spell?.sourceName,sourceName);
  return {id,nome_italiano:spell.appName,livello:spell.livello,tempo_di_lancio:spell.tempo_di_lancio,gittata:spell.gittata,componenti:spell.componenti,durata:spell.durata,descrizione:spell.descrizione,sort_key:spell.appName.toLowerCase()};
});
assert.equal(rows.length,20);
assert.equal(new Set(rows.map(s=>s.id)).size,20);
const ids=rows.map(s=>s.id);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
const client=await pool.connect();
let transaction=false;
const snapshot=async()=> (await client.query("SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, '' ORDER BY id), '')) AS digest, count(*)::int AS total FROM public.spells s")).rows[0];
const unrelated=async()=> (await client.query("SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, '' ORDER BY id), '')) AS digest FROM public.spells s WHERE NOT (id=ANY($1::text[]))",[ids])).rows[0].digest;
async function insertMissing() {
  const existing=(await client.query('SELECT id,nome_italiano FROM public.spells WHERE id=ANY($1::text[]) FOR UPDATE',[ids])).rows;
  // Check the entire batch before the first write. Existing editorial changes win.
  for(const row of existing) assert.equal(row.nome_italiano,rows.find(s=>s.id===row.id).nome_italiano,`Unexpected ID/name collision: ${row.id}`);
  const present=new Set(existing.map(s=>s.id));
  let inserted=0;
  for(const row of rows) {
    if(present.has(row.id)) continue;
    const result=await client.query('INSERT INTO public.spells (id,nome_italiano,livello,tempo_di_lancio,gittata,componenti,durata,descrizione,sort_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',Object.values(row));
    assert.equal(result.rowCount,1);
    inserted++;
  }
  return inserted;
}
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); transaction=true;
  await client.query("SET LOCAL statement_timeout='15s'");
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query('LOCK TABLE public.spells IN SHARE ROW EXCLUSIVE MODE');
  const before=await snapshot();
  const digest=await unrelated();
  const presentBefore=(await client.query('SELECT id FROM public.spells WHERE id=ANY($1::text[])',[ids])).rowCount;
  const inserted=await insertMissing();
  assert.equal(inserted,20-presentBefore);
  assert.equal((await snapshot()).total,before.total+inserted);
  assert.equal(await insertMissing(),0,'A repeated insertion must do nothing');
  assert.equal(await unrelated(),digest,'Existing unrelated rows must remain unchanged');
  if(mode==='--verify') {
    await client.query('SAVEPOINT editorial_fixture');
    await client.query('UPDATE public.spells SET descrizione=$1 WHERE id=$2',['Editorial fixture, preserve this change',ids[0]]);
    assert.equal(await insertMissing(),0);
    assert.equal((await client.query('SELECT descrizione FROM public.spells WHERE id=$1',[ids[0]])).rows[0].descrizione,'Editorial fixture, preserve this change');
    await client.query('ROLLBACK TO SAVEPOINT editorial_fixture');
    await client.query('SAVEPOINT collision_fixture');
    await client.query('UPDATE public.spells SET nome_italiano=$1 WHERE id=$2',['UNEXPECTED COLLISION',ids[0]]);
    const collisionBefore=await snapshot();
    await assert.rejects(insertMissing(),/Unexpected ID\/name collision/);
    assert.deepEqual(await snapshot(),collisionBefore,'A collision must not partially change the batch');
    await client.query('ROLLBACK TO SAVEPOINT collision_fixture');
    // Inspect every newly inserted value, not only row counts.
    const saved=(await client.query('SELECT id,nome_italiano,livello,tempo_di_lancio,gittata,componenti,durata,descrizione,sort_key FROM public.spells WHERE id=ANY($1::text[])',[ids])).rows;
    assert.equal(saved.length,20);
    if(presentBefore===0) for(const row of rows) assert.deepEqual(saved.find(s=>s.id===row.id),row);
    await client.query('ROLLBACK'); transaction=false;
    assert.deepEqual(await snapshot(),before,'Verification must restore the exact original database');
    console.log(`[srd-additions] VERIFIED: ${inserted} inserts, idempotency, editorial preservation, collision protection, unrelated rows unchanged, ROLLBACK confirmed.`);
  } else {
    await client.query('COMMIT'); transaction=false;
    assert.equal((await client.query('SELECT id FROM public.spells WHERE id=ANY($1::text[])',[ids])).rowCount,20);
    console.log(`[srd-additions] COMMITTED: ${inserted} new spells; total ${(await snapshot()).total}.`);
  }
} catch(error) {
  if(transaction) await client.query('ROLLBACK');
  throw error;
} finally {
  client.release(); await pool.end();
}
