// Admin push notifications (lib/push.ts, app/actions/admin-push.ts, the report route): VAPID keys from
// the server variables or generated once and kept, subscriptions only by the administrator, sending
// with a stand-in push service, expired subscriptions removed, a report saved even if the push fails.
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
  const pg = new PGlite();
  const pool = {query:(sql, params) => pg.query(sql, params)};
  let generated = 0;
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {pool};
  deps['web-push'] = {generateVAPIDKeys: () => { generated++; return {publicKey: `pubblica-${generated}`, privateKey: `privata-${generated}`}; }, sendNotification: () => { throw new Error('the real push service is never called in tests'); }};
  let admin = false;
  deps['@/lib/admin-action-helpers'] = {requireAdmin: async () => { if (!admin) throw new Error('Non autorizzato'); }};
  const push = load('lib/push.ts');

  // Keys: the server variables win; otherwise one pair is generated and reused, also by simultaneous first uses.
  assert.deepEqual(await push.vapidKeys({VAPID_PUBLIC_KEY: 'env-pub', VAPID_PRIVATE_KEY: 'env-priv'}), {publicKey: 'env-pub', privateKey: 'env-priv', source: 'env'});
  assert.equal(generated, 0, 'no pair generated when the variables are set');
  const [first, second] = await Promise.all([push.vapidKeys({}), push.vapidKeys({})]);
  assert.equal(first.publicKey, second.publicKey, 'one pair for everyone');
  assert.equal((await push.vapidKeys({})).privateKey, first.privateKey, 'reused, never generated again');
  assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_push_keys")).rows[0].n, 1);
  assert.equal((await push.vapidKeys({VAPID_PUBLIC_KEY: 'solo-pubblica'})).source, 'database', 'both variables are needed');

  // Actions: administrator only.
  const actions = load('app/actions/admin-push.ts');
  const sub = endpoint => ({endpoint, keys: {p256dh: 'B'.repeat(87), auth: 'A'.repeat(22)}});
  await assert.rejects(actions.subscribeDeviceAction(sub('https://push.esempio.it/uno'), 'iPhone · Safari'), /Non autorizzato/);
  await assert.rejects(actions.pushPublicKeyAction(), /Non autorizzato/);
  await assert.rejects(actions.testPushAction('https://push.esempio.it/uno'), /Non autorizzato/);
  await assert.rejects(actions.setNotificationTypeAction('segnalazioni', false), /Non autorizzato/);
  await assert.rejects(actions.removeDeviceAction({id: '11111111-1111-4111-8111-111111111111'}), /Non autorizzato/);
  assert.equal((await push.listDevices()).length, 0);
  admin = true;
  assert.equal(await actions.pushPublicKeyAction(), first.publicKey, 'only the public key goes to the page');
  for (const name of ['uno', 'due', 'tre', 'quattro']) assert.deepEqual(await actions.subscribeDeviceAction(sub(`https://push.esempio.it/${name}`), `Dispositivo ${name}`), {ok: true});
  assert.deepEqual(await actions.subscribeDeviceAction(sub('https://push.esempio.it/uno'), 'iPhone · Safari'), {ok: true}, 'the same device renews its subscription');
  assert.deepEqual(await actions.subscribeDeviceAction({endpoint: 'javascript:alert(1)', keys: {p256dh: 'x', auth: 'y'}}, 'x'), {ok: false, error: 'Iscrizione non valida.'});
  assert.deepEqual(await actions.subscribeDeviceAction({endpoint: 'http://push.esempio.it/in-chiaro', keys: {p256dh: 'x', auth: 'y'}}, 'x'), {ok: false, error: 'Iscrizione non valida.'});
  let devices = await push.listDevices();
  assert.equal(devices.length, 4);
  assert.equal(devices.find(d => d.endpoint.endsWith('/uno')).dispositivo, 'iPhone · Safari');

  // Sending: one notification per device; 404/410 remove the subscription, other errors keep it.
  const calls = [];
  const send = async (target, body, options) => {
    calls.push({target, body: JSON.parse(body), options});
    if (target.endpoint.endsWith('/due')) throw Object.assign(new Error('gone'), {statusCode: 410});
    if (target.endpoint.endsWith('/tre')) throw Object.assign(new Error('not found'), {statusCode: 404});
    if (target.endpoint.endsWith('/quattro')) throw Object.assign(new Error('server error'), {statusCode: 500});
  };
  const report = {id: '22222222-2222-4222-8222-222222222222', tipo: 'errore', messaggio: '  La  gittata è sbagliata. '.repeat(10), email_risposta: 'segnalatore@esempio.it'};
  const payload = push.feedbackPayload(report, 'Errore', 'Palla di fuoco');
  assert.equal(payload.title, 'Nuova segnalazione');
  assert.equal(payload.url, '/admin/segnalazioni/22222222-2222-4222-8222-222222222222');
  const [line, start] = payload.body.split('\n');
  assert.equal(line, 'Errore · Palla di fuoco');
  assert.ok(start.length <= 80 && start.endsWith('…') && start.startsWith('La gittata è sbagliata.'), 'the start of the message, at most 80 characters');
  assert.ok(!JSON.stringify(payload).includes('segnalatore@esempio.it'), 'never the reply address');
  assert.equal(push.feedbackPayload({...report, messaggio: 'Breve'}, 'Consiglio', null).body, 'Consiglio · Generale\nBreve');
  assert.equal(push.feedbackPayload(report, 'Errore', null, 3).badge, 3, 'the number for the app icon travels with the notification');
  assert.ok(!('badge' in push.feedbackPayload(report, 'Errore', null, null)), 'count not available: the badge stays as it is');
  const result = await push.sendPush('segnalazioni', payload, {send});
  assert.deepEqual(result, {sent: 1, removed: 2, failed: 1});
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].options.vapidDetails, {subject: 'https://ilgrimorio.app', publicKey: first.publicKey, privateKey: first.privateKey});
  assert.deepEqual(calls[0].body, payload);
  devices = await push.listDevices();
  assert.deepEqual(devices.map(d => d.endpoint.split('/').pop()).sort(), ['quattro', 'uno'], 'expired and refused subscriptions are removed');

  // Test notification to this device only; the switch of a kind.
  calls.length = 0;
  // The action uses the real library (here a stand-in that fails): a failure is a message, never an exception.
  assert.deepEqual(await actions.testPushAction('https://push.esempio.it/uno'), {ok: false, error: 'Invio non riuscito. Riprova tra poco.'});
  assert.deepEqual(await push.sendPush('segnalazioni', payload, {send, endpoint: 'https://push.esempio.it/uno'}), {sent: 1, removed: 0, failed: 0});
  assert.equal(calls.length, 1);
  assert.deepEqual(await actions.setNotificationTypeAction('segnalazioni', false), {ok: true});
  assert.deepEqual(await actions.setNotificationTypeAction('inventato', false), {ok: false, error: 'Tipo di notifica sconosciuto.'});
  assert.deepEqual(await push.notificationTypes(), {segnalazioni: false, proposte: true});
  assert.deepEqual(await push.sendPush('segnalazioni', payload, {send}), {sent: 0, removed: 0, failed: 0, skipped: 'type-off'});
  await actions.setNotificationTypeAction('segnalazioni', true);
  assert.deepEqual(push.NOTIFICATION_TYPES.map(t => [t.key, t.default]), [['segnalazioni', true], ['proposte', true]], 'Segnalazioni and Nuova proposta homebrew, on by default');
  const proposal = push.proposalPayload({id: 'p1', nickname: 'Master Ombra', scheda: {nome: 'Drago di nebbia', grado_sfida: '5', edizione: 'entrambe'}}, 3);
  assert.deepEqual(proposal, {title: 'Nuova proposta homebrew', body: 'Drago di nebbia · GS 5 · 2014 e 2024\ndi Master Ombra', url: '/admin/proposte', tag: 'proposta-p1', badge: 3});

  // Removal: by this device's address and by id from the list.
  assert.deepEqual(await actions.removeDeviceAction({endpoint: 'https://push.esempio.it/quattro'}), {ok: true});
  assert.deepEqual(await actions.removeDeviceAction({id: devices.find(d => d.endpoint.endsWith('/uno')).id}), {ok: true});
  assert.deepEqual(await actions.removeDeviceAction({id: 'non-un-id'}), {ok: false, error: 'Dispositivo sconosciuto.'});
  assert.equal((await push.listDevices()).length, 0);
  assert.deepEqual(await push.sendPush('segnalazioni', payload, {send}), {sent: 0, removed: 0, failed: 0, skipped: 'no-devices'});

  // The report route: saved and answered «ok» first; email and push after, a failing push changes nothing.
  const later = [];
  let emails = 0, pushes = 0;
  deps['next/server'] = {after: fn => later.push(fn), NextResponse: {json: (value, init) => ({value, status: init?.status ?? 200})}};
  deps['@/lib/feedback-input'] = {BODY_MAX_BYTES: 8192, TYPE_LABELS: {errore: 'Errore'}, parseFeedback: () => ({ok: true, value: {tipo: 'errore'}, token: 't'})};
  deps['@/lib/feedback'] = {
    FORM_UNAVAILABLE: 'Modulo temporaneamente non disponibile.', feedbackAvailable: () => true,
    checkFormToken: () => 'ok', deviceKey: () => null, feedbackLimited: async () => false, issueFormToken: () => 't', turnstilePassed: async () => true,
    saveFeedback: async () => report, recordFeedbackSend: async () => {}, markEmailSent: async () => {}, countNewFeedback: async () => 7,
    sendFeedbackEmail: async () => { emails++; return 'sent'; },
  };
  deps['@/lib/feedback-names'] = {pageName: async () => 'Palla di fuoco'};
  // The badge counts new reports and homebrew proposals to review (lib/admin-badge.ts).
  deps['@/lib/admin-badge'] = {adminBadgeCount: async () => 7};
  let pushed;
  deps['@/lib/push'] = {feedbackPayload: push.feedbackPayload, sendPush: async (type, body) => { pushes++; pushed = body; throw new Error('push service down'); }};
  const route = load('app/api/segnalazioni/route.ts');
  const headers = new Map([['origin', 'https://ilgrimorio.app'], ['host', 'ilgrimorio.app'], ['content-type', 'application/json']]);
  const response = await route.POST({headers: {get: name => headers.get(name) ?? null}, text: async () => '{}'});
  assert.deepEqual(response, {value: {ok: true}, status: 200}, 'the visitor gets the answer before any push');
  assert.equal(pushes, 0);
  const warn = console.warn; const warnings = []; console.warn = message => warnings.push(message);
  for (const fn of later) await fn();
  console.warn = warn;
  assert.equal(pushes, 1); assert.equal(emails, 1, 'the email is still sent');
  assert.equal(pushed.badge, 7, 'the push carries the number for the badge');
  assert.deepEqual(warnings, ['[notifiche] Invio della notifica non riuscito.'], 'only a short warning: no key, address or text in the logs');

  // Without FEEDBACK_SECRET the form is closed: no token, nothing saved, «Modulo temporaneamente non disponibile».
  let saved = 0;
  Object.assign(deps['@/lib/feedback'], {feedbackAvailable: () => false, issueFormToken: () => null, saveFeedback: async () => { saved++; return report; }});
  const closed = load('app/api/segnalazioni/route.ts');
  assert.deepEqual(closed.GET(), {value: {error: 'Modulo temporaneamente non disponibile.', unavailable: true}, status: 503});
  assert.deepEqual(await closed.POST({headers: {get: name => headers.get(name) ?? null}, text: async () => '{}'}), {value: {error: 'Modulo temporaneamente non disponibile.', unavailable: true}, status: 503});
  assert.equal(saved, 0, 'nothing saved without the secret');

  await pg.close();
  console.log('Push: keys from the variables or generated once, admin-only subscriptions, one notification per device, 404/410 removed, kinds with their switch, no reply address, report saved and answered before the push.');
})().catch(error => { console.error(error); process.exit(1); });
