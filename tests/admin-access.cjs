const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {createHmac} = require('node:crypto');
const {PGlite} = require('@electric-sql/pglite');

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
    }
    return createRequire(filename)(id);
  }
  new Function('require','module','exports',code)(local,mod,mod.exports);
  return mod.exports;
}

(async()=>{
  process.env.ADMIN_PASSCODE = 'passcode-di-prova';
  const jar = new Map(), requestHeaders = new Map();
  deps['next/headers'] = {
    cookies: async()=>({get:name=>jar.has(name)?{value:jar.get(name).value}:undefined,set:(name,value,options)=>jar.set(name,{value,options}),delete:name=>jar.delete(name)}),
    headers: async()=>({get:name=>requestHeaders.get(name) ?? null}),
  };
  const auth = load('lib/admin-auth.ts');
  const DAY = 24*60*60*1000, now = Date.now();

  // S3: signed session with a server-side expiry.
  const token = auth.createSessionToken(now);
  assert.match(token,/^v2\.\d+\.[0-9a-f]{64}$/);
  assert.equal(auth.verifySessionToken(token,now),true);
  assert.equal(auth.verifySessionToken(token,now+29*DAY),true,'valid during the 30 days');
  assert.equal(auth.verifySessionToken(token,now+30*DAY+1),false,'expired after 30 days even if the browser keeps the cookie');
  const [, expiry, signed] = token.split('.');
  assert.equal(auth.verifySessionToken(`v2.${Number(expiry)+DAY}.${signed}`,now),false,'the expiry cannot be extended');
  assert.equal(auth.verifySessionToken(`v2.${expiry}.${'0'.repeat(64)}`,now),false,'forged signature');
  assert.equal(auth.verifySessionToken(auth.createSessionToken(now+400*DAY),now),false,'expiries beyond 30 days are refused');
  for (const bad of ['', 'v2', 'v2..', `v1.${expiry}.${signed}`, `${token}.extra`]) assert.equal(auth.verifySessionToken(bad,now),false,bad);
  const oldCookie = createHmac('sha256','passcode-di-prova').update('grimorio-admin-session').digest('hex');
  assert.equal(auth.verifySessionToken(oldCookie,now),false,'sessions of the previous format require a new login');
  process.env.ADMIN_PASSCODE = 'passcode-cambiata';
  assert.equal(auth.verifySessionToken(token,now),false,'changing the passcode ends every session');
  process.env.ADMIN_PASSCODE = 'passcode-di-prova';

  // isAdmin reads the cookie; logout removes it.
  assert.equal(await auth.isAdmin(),false);
  await auth.startAdminSession();
  const saved = jar.get('grimorio_admin');
  assert.equal(saved.options.httpOnly,true);assert.equal(saved.options.secure,true);assert.equal(saved.options.maxAge,30*24*60*60);
  assert.equal(await auth.isAdmin(),true);
  jar.set('grimorio_admin',{value:oldCookie});
  assert.equal(await auth.isAdmin(),false);
  await auth.startAdminSession();await auth.endAdminSession();
  assert.equal(await auth.isAdmin(),false);
  delete process.env.ADMIN_PASSCODE;
  await auth.startAdminSession();
  assert.equal(await auth.isAdmin(),false,'no passcode configured: no admin');
  process.env.ADMIN_PASSCODE = 'passcode-di-prova';

  // S2: login attempts limited per address and overall, stored as hashes only.
  const pg = new PGlite();
  let failQueries = false;
  const pool = {query:(sql,params)=>failQueries?Promise.reject(new Error('database down')):pg.query(sql,params)};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db:{},pool};
  deps['next/cache'] = {revalidatePath(){},updateTag(){}};
  const originalTimeout = global.setTimeout;
  global.setTimeout = (fn)=>originalTimeout(fn,0);
  const {loginAction} = load('app/actions/admin.ts');
  const limit = load('lib/admin-login-limit.ts');
  const form = passcode => {const f = new FormData(); f.set('passcode',passcode); return f;};
  const attempt = async (passcode,ip) => {requestHeaders.set('x-forwarded-for',ip);jar.clear();return loginAction(null,form(passcode));};

  assert.deepEqual(await attempt('passcode-di-prova','203.0.113.1, 10.0.0.1'),{ok:true,error:null});
  assert.equal(await auth.isAdmin(),true);
  for (let i = 0; i < 5; i++) assert.equal((await attempt('sbagliata','203.0.113.2')).error,'Passcode errata.');
  const blocked = await attempt('passcode-di-prova','203.0.113.2');
  assert.equal(blocked.ok,false);assert.match(blocked.error,/Troppi tentativi/);
  assert.equal(await auth.isAdmin(),false,'even the right passcode is refused while blocked');
  assert.equal((await attempt('passcode-di-prova','203.0.113.3')).ok,true,'other addresses are not affected');
  const stored = (await pg.query('SELECT address_hash FROM grimorio_admin_login_failures')).rows;
  assert.equal(stored.length,5);
  assert.ok(stored.every(row=>/^[0-9a-f]{64}$/.test(row.address_hash) && !row.address_hash.includes('203.0.113')),'addresses are stored only as hashes');
  await pg.query("UPDATE grimorio_admin_login_failures SET failed_at = now() - interval '16 minutes'");
  assert.equal((await attempt('passcode-di-prova','203.0.113.2')).ok,true,'the block ends after 15 minutes');
  for (let i = 0; i < 4; i++) await attempt('sbagliata','203.0.113.4');
  await attempt('passcode-di-prova','203.0.113.4');
  assert.equal(await limit.loginBlocked(limit.addressKey('203.0.113.4')),false,'a successful login clears that address');
  await pg.query("DELETE FROM grimorio_admin_login_failures");
  await pg.query(`INSERT INTO grimorio_admin_login_failures (address_hash) SELECT md5(i::text) FROM generate_series(1,100) i`);
  assert.match((await attempt('passcode-di-prova','198.51.100.9')).error,/Troppi tentativi/,'100 failures in an hour from many addresses close the login');
  await pg.query("DELETE FROM grimorio_admin_login_failures");
  await pg.query("INSERT INTO grimorio_admin_login_failures (address_hash, failed_at) VALUES ('vecchio', now() - interval '2 days')");
  await attempt('sbagliata','198.51.100.10');
  assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_admin_login_failures WHERE address_hash='vecchio'")).rows[0].n,0,'old records are removed');
  failQueries = true;
  const down = await attempt('passcode-di-prova','198.51.100.11');
  assert.equal(down.ok,false);assert.match(down.error,/non disponibile/,'without the counter the login stays closed');
  assert.equal(await auth.isAdmin(),false);
  failQueries = false;
  assert.equal((await attempt('passcode-di-prova',null)).ok,true,'requests without an address header still work');
  global.setTimeout = originalTimeout;

  console.log('Admin access: signed 30-day sessions with server expiry, old/forged/changed-passcode cookies refused, login limited per address and overall, hashed addresses, fail-closed counter.');
})().catch(error=>{console.error(error);process.exit(1);});
