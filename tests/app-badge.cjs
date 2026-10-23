// App icon badge (lib/app-badge.ts, app/api/admin/badge/route.ts): the number is the reports still «nuova»
// (the «segnalazioni nuove» tile of /admin), it goes down when a report is read, archived or deleted,
// 0 removes the badge, a device without badges does nothing, and only the administrator gets the number.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {PGlite} = require('@electric-sql/pglite');

const cache = new Map(), deps = {};
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = {exports:{}}; cache.set(filename, mod);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, esModuleInterop:true}}).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id in deps) return deps[id];
    if (id.startsWith('@/') || id.startsWith('./')) {
      const file = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename), id);
      if (fs.existsSync(file + '.ts')) return load(file + '.ts');
    }
    return createRequire(filename)(id);
  }, mod, mod.exports);
  return mod.exports;
}

(async () => {
  // Setting, clearing, refused and unsupported badges.
  const {applyAppBadge} = load('lib/app-badge.ts');
  const calls = [];
  const nav = {setAppBadge: async n => { calls.push(n); }, clearAppBadge: async () => { calls.push('clear'); }};
  assert.equal(await applyAppBadge(nav, 4), true);
  assert.equal(await applyAppBadge(nav, 0), true);
  assert.equal(await applyAppBadge(nav, -1), false);
  assert.equal(await applyAppBadge(nav, 1.5), false);
  assert.deepEqual(calls, [4, 'clear'], 'the number, then cleared at 0');
  assert.equal(await applyAppBadge({}, 3), false, 'no Badging API: nothing happens');
  assert.equal(await applyAppBadge({setAppBadge: async () => { throw new Error('NotAllowedError'); }}, 2), false, 'refused: no error');

  // The count: reports still «nuova», down when read, archived or deleted.
  const pg = new PGlite();
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {pool: {query: (sql, params) => pg.query(sql, params)}};
  const feedback = load('lib/feedback.ts');
  const report = () => feedback.saveFeedback({tipo: 'errore', messaggio: 'Gittata sbagliata', percorso: '/spell/palla-di-fuoco', edizione: '2024', email: null});
  assert.equal(await feedback.countNewFeedback(), 0);
  const [a, b, c, d] = [await report(), await report(), await report(), await report()];
  assert.equal(await feedback.countNewFeedback(), 4);
  await feedback.markFeedbackRead(a.id);
  assert.equal(await feedback.countNewFeedback(), 3, 'opened by the administrator');
  await feedback.setFeedbackState(b.id, 'archiviata');
  assert.equal(await feedback.countNewFeedback(), 2, 'archived');
  await feedback.deleteFeedback(c.id);
  assert.equal(await feedback.countNewFeedback(), 1, 'deleted');
  assert.equal((await feedback.listFeedback()).nuove, 1, 'the same number as the admin tile');
  await feedback.setFeedbackState(d.id, 'risolta');
  assert.equal(await feedback.countNewFeedback(), 0, 'none left: the badge disappears');

  // The number for the icon: administrator only, never cached.
  let admin = false;
  deps['@/lib/admin-auth'] = {isAdmin: async () => admin};
  deps['@/lib/feedback'] = {countNewFeedback: async () => 5};
  deps['next/server'] = {NextResponse: {json: (value, init) => ({value, status: init?.status ?? 200, headers: init?.headers})}};
  const route = load('app/api/admin/badge/route.ts');
  assert.deepEqual(await route.GET(), {value: {error: 'Non autorizzato'}, status: 401, headers: {'Cache-Control': 'no-store'}}, 'visitors get no number');
  admin = true;
  assert.deepEqual(await route.GET(), {value: {count: 5}, status: 200, headers: {'Cache-Control': 'no-store'}});

  // The page side asks only on devices subscribed to the admin notifications.
  const sync = fs.readFileSync('components/app-badge-sync.tsx', 'utf8');
  assert.match(sync, /pushManager\.getSubscription\(\)\)\) return;[\s\S]*fetch\("\/api\/admin\/badge"/, 'no subscription: no request');
  assert.match(sync, /visibilitychange/, 'realigned when the app comes back to the front');

  await pg.close();
  console.log('App badge: new reports counted, down when read, archived or deleted, cleared at 0, nothing without the Badging API, number for the administrator only.');
})().catch(error => { console.error(error); process.exit(1); });
