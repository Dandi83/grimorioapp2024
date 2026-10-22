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
  const jar = new Map(), requestHeaders = new Map(), draft = {on:false};
  deps['next/headers'] = {
    cookies: async()=>({get:name=>jar.has(name)?{value:jar.get(name).value}:undefined,set:(name,value,options)=>jar.set(name,{value,options}),delete:name=>jar.delete(name)}),
    headers: async()=>({get:name=>requestHeaders.get(name) ?? null}),
    draftMode: async()=>({get isEnabled(){return draft.on;},enable(){draft.on=true;},disable(){draft.on=false;}}),
  };
  // Sessions live in the database (logout revokes them): an in-memory PostgreSQL here.
  const pg = new PGlite();
  let failQueries = false;
  const pool = {query:(sql,params)=>failQueries?Promise.reject(new Error('database down')):pg.query(sql,params),connect:async()=>({query:(sql,params)=>pg.query(sql,params),release(){}})};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db:{},pool};
  const auth = load('lib/admin-auth.ts');
  const DAY = 24*60*60*1000, now = Date.now();
  const COOKIE = '__Host-grimorio_admin';
  assert.equal(auth.COOKIE_NAME,COOKIE,'cookie bound to this exact site, HTTPS only');

  // S3: signed session with a server-side expiry of 7 days and a random id.
  const token = auth.createSessionToken(now);
  assert.match(token,/^v3\.\d+\.[0-9a-f]{36}\.[0-9a-f]{64}$/);
  const [, expiry, sid, signed] = token.split('.');
  assert.equal(auth.verifySessionToken(token,now),sid);
  assert.equal(auth.verifySessionToken(token,now+6*DAY),sid,'valid during the 7 days');
  assert.equal(auth.verifySessionToken(token,now+7*DAY+1),null,'expired after 7 days even if the browser keeps the cookie');
  assert.equal(auth.verifySessionToken(`v3.${Number(expiry)+DAY}.${sid}.${signed}`,now),null,'the expiry cannot be extended');
  assert.equal(auth.verifySessionToken(`v3.${expiry}.${'a'.repeat(36)}.${signed}`,now),null,'the id cannot be swapped');
  assert.equal(auth.verifySessionToken(`v3.${expiry}.${sid}.${'0'.repeat(64)}`,now),null,'forged signature');
  assert.equal(auth.verifySessionToken(auth.createSessionToken(now+400*DAY),now),null,'expiries beyond 7 days are refused');
  for (const bad of ['', 'v3', 'v3...', `v2.${expiry}.${signed}`, `${token}.extra`]) assert.equal(auth.verifySessionToken(bad,now),null,bad);
  const oldCookie = createHmac('sha256','passcode-di-prova').update('grimorio-admin-session').digest('hex');
  assert.equal(auth.verifySessionToken(oldCookie,now),null,'sessions of previous formats require a new login');
  process.env.ADMIN_PASSCODE = 'passcode-cambiata';
  assert.equal(auth.verifySessionToken(token,now),null,'changing the passcode ends every session');
  process.env.ADMIN_PASSCODE = 'passcode-di-prova';

  // isAdmin reads the cookie and the session list; logout deletes the session on the server.
  assert.equal(await auth.isAdmin(),false);
  await auth.startAdminSession();
  const saved = jar.get(COOKIE);
  assert.equal(saved.options.httpOnly,true);assert.equal(saved.options.secure,true);assert.equal(saved.options.path,'/');
  assert.equal(saved.options.maxAge,7*24*60*60);
  assert.equal(await auth.isAdmin(),true);
  const copied = saved.value;
  jar.set(COOKIE,{value:oldCookie});
  assert.equal(await auth.isAdmin(),false);
  jar.set(COOKIE,{value:copied});
  await auth.endAdminSession();
  assert.equal(await auth.isAdmin(),false);
  jar.set(COOKIE,{value:copied});
  assert.equal(await auth.isAdmin(),false,'after logout a copied cookie no longer works');
  assert.equal(auth.verifySessionToken(copied)!==null,true,'(the signature alone would still be valid: the server list decides)');
  await auth.startAdminSession();
  failQueries = true;
  assert.equal(await auth.isAdmin(),false,'without the session list the admin area stays closed');
  failQueries = false;
  assert.equal(await auth.isAdmin(),true);
  delete process.env.ADMIN_PASSCODE;
  jar.clear();
  await auth.startAdminSession();
  assert.equal(await auth.isAdmin(),false,'no passcode configured: no admin');
  process.env.ADMIN_PASSCODE = 'passcode-di-prova';

  // S2: login attempts limited per address and overall, stored as hashes only.
  deps['next/cache'] = {revalidatePath(){},updateTag(){}};
  const originalTimeout = global.setTimeout;
  global.setTimeout = (fn)=>originalTimeout(fn,0);
  const {loginAction} = load('app/actions/admin.ts');
  const limit = load('lib/admin-login-limit.ts');
  const form = passcode => {const f = new FormData(); f.set('passcode',passcode); return f;};
  const attempt = async (passcode,ip) => {requestHeaders.clear();if(ip)requestHeaders.set('x-forwarded-for',ip);jar.clear();return loginAction(null,form(passcode));};

  assert.deepEqual(await attempt('passcode-di-prova','203.0.113.1, 10.0.0.1'),{ok:true,error:null});
  assert.equal(await auth.isAdmin(),true);
  assert.equal(draft.on,true,'login turns on the preview of the public pages (hidden sections)');
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
  // On Vercel x-real-ip is the client address: a made-up x-forwarded-for does not escape the block.
  await pg.query("DELETE FROM grimorio_admin_login_failures");
  const viaVercel = async (passcode,forwarded) => {requestHeaders.clear();requestHeaders.set('x-real-ip','203.0.113.50');requestHeaders.set('x-forwarded-for',forwarded);jar.clear();return loginAction(null,form(passcode));};
  for (let i = 0; i < 5; i++) await viaVercel('sbagliata',`10.0.0.${i}`);
  assert.match((await viaVercel('passcode-di-prova','10.9.9.9')).error,/Troppi tentativi/,'changing x-forwarded-for does not reset the counter');

  // Sections (/admin/sezioni): only an administrator can show or hide them; every switch is logged.
  deps['next/cache'] = {revalidatePath(){},updateTag(){},unstable_cache:fn=>fn};
  const sections = load('app/actions/admin-sections.ts');
  const visibility = load('lib/section-visibility.ts');
  jar.clear(); draft.on = false;
  await assert.rejects(sections.setSectionVisibilityAction('classi',true),/Non autorizzato/,'no public request can change a section');
  await assert.rejects(sections.showSectionAction((()=>{const f=new FormData();f.set('sezione','classi');return f;})()),/Non autorizzato/);
  assert.deepEqual(await visibility.hiddenSections(),[],'every section is visible by default');
  assert.equal((await attempt('passcode-di-prova','203.0.113.60')).ok,true);
  draft.on = false;
  assert.deepEqual(await sections.setSectionVisibilityAction('classi',true),{ok:true,hidden:true});
  assert.equal(draft.on,true,'a switch turns on the preview for the administrator');
  assert.deepEqual(await sections.setSectionVisibilityAction('classi',true),{ok:true,hidden:true},'switching to the same state logs nothing');
  assert.deepEqual(await sections.setSectionVisibilityAction('admin',true),{ok:false,error:'Sezione sconosciuta.'});
  assert.deepEqual(await visibility.hiddenSections(),['classi']);
  assert.equal((await visibility.sectionStates()).classi,true);
  const show = new FormData(); show.set('sezione','classi');
  await sections.showSectionAction(show);
  assert.deepEqual(await visibility.hiddenSections(),[]);
  const log = await visibility.allSectionLog();
  assert.deepEqual(log.map(row=>[row.sezione,row.nascosta]).sort(),[['classi',false],['classi',true]],'one log row per change, with the new state');
  assert.ok(log.every(row=>row.creata_il),'with date and time');
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_section_visibility')).rows[0].n,1,'one record per section');
  await load('app/actions/admin.ts').logoutAction();
  assert.equal(draft.on,false,'logout turns the preview off');
  global.setTimeout = originalTimeout;

  console.log('Admin access: signed 7-day __Host- sessions revoked at logout, server expiry, old/forged/changed-passcode cookies refused, login limited per address and overall, hashed addresses, fail-closed counter; sections shown/hidden only by the administrator, logged, preview on at login and off at logout.');
})().catch(error=>{console.error(error);process.exit(1);});
