import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";

// One approved content correction; never runs on normal application requests.
// Reference: https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions#MagicMissile
const mode = process.argv[2];
assert.ok(["--verify", "--apply"].includes(mode), "Use --verify (ROLLBACK) or --apply (production only)");
assert.equal(process.env.NEON_PROJECT_ID, "summer-rain-34374435", "Unexpected database project");
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
if (mode === "--apply") {
  assert.equal(process.env.VERCEL_ENV, "production", "Applying requires a production deployment");
  assert.equal(process.env.VERCEL_PROJECT_ID, "prj_PjDCPQlG4DMh9p2ZIlBTppZMSGMq", "Unexpected Vercel project");
}
const records = JSON.parse(readFileSync(new URL("../lib/data/incantesimi_2024.json", import.meta.url), "utf8"));
const matches = records.filter((s) => s.nome_italiano === "DARDO INCANTATO");
assert.equal(matches.length, 1);
const description = matches[0].descrizione;
assert.ok(description.length > 200 && description.includes("1d4 + 1"));
const id = "dardo-incantato";
const read = "SELECT to_jsonb(s) AS record FROM public.spells s WHERE id = $1";
const otherRecords = "SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, '' ORDER BY id), '')) AS digest FROM public.spells s WHERE id <> $1";
const update = "UPDATE public.spells SET descrizione = $1, updated_at = NOW() WHERE id = $2 AND nome_italiano = $3 AND btrim(descrizione) = '' RETURNING id";
const values = [description, id, "DARDO INCANTATO"];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const client = await pool.connect();
let transaction = false;
try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
  transaction = true;
  await client.query("SET LOCAL statement_timeout = '15s'");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const locked = await client.query("SELECT id FROM public.spells WHERE id = $1 FOR UPDATE", [id]);
  assert.equal(locked.rowCount, 1, "Target spell not found");
  const before = (await client.query(read, [id])).rows[0].record;
  assert.equal(before.nome_italiano, "DARDO INCANTATO", "Unexpected spell name");
  assert.ok(before.descrizione.trim() === "" || before.descrizione === description,
    "Description was already edited: refusing to overwrite");
  const digestBefore = (await client.query(otherRecords, [id])).rows[0].digest;
  const changed = await client.query(update, values);
  assert.equal(changed.rowCount, before.descrizione === description ? 0 : 1);
  assert.equal((await client.query(read, [id])).rows[0].record.descrizione, description);
  // Running the same correction twice must leave the approved content intact.
  assert.equal((await client.query(update, values)).rowCount, 0, "Correction must be idempotent");
  if (mode === "--verify") {
    // A future editor's content must never be overwritten by this correction.
    await client.query("SAVEPOINT conflict_check");
    await client.query("UPDATE public.spells SET descrizione = $1 WHERE id = $2", ["Editor conflict fixture", id]);
    assert.equal((await client.query(update, values)).rowCount, 0, "Existing descriptions must be preserved");
    assert.equal((await client.query(read, [id])).rows[0].record.descrizione, "Editor conflict fixture");
    await client.query("ROLLBACK TO SAVEPOINT conflict_check");
  }
  assert.equal((await client.query(otherRecords, [id])).rows[0].digest, digestBefore, "Unrelated spells changed");
  if (mode === "--verify") {
    await client.query("ROLLBACK");
    transaction = false;
    assert.deepEqual((await client.query(read, [id])).rows[0].record, before, "Verification must leave no saved changes");
    console.log("[magic-missile] VERIFIED: approved text, idempotency, conflict protection, unrelated records preserved, ROLLBACK confirmed.");
  } else {
    await client.query("COMMIT");
    transaction = false;
    assert.equal((await client.query(read, [id])).rows[0].record.descrizione, description);
    const counts = await client.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE btrim(descrizione) = '')::int AS missing FROM public.spells");
    console.log("[magic-missile] COMMITTED and verified: " + changed.rowCount + " spell updated. " + JSON.stringify(counts.rows[0]));
  }
} catch (error) {
  if (transaction) await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
