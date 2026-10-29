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
  const mod = {exports: {}}; cache.set(filename, mod);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true}}).outputText;
  function local(id) {
    if (id in deps) return deps[id];
    if (id.startsWith('@/') || id.startsWith('./')) {
      const file = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename), id);
      if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
      if (fs.existsSync(file + '.ts')) return load(file + '.ts');
    }
    return createRequire(filename)(id);
  }
  new Function('require', 'module', 'exports', code)(local, mod, mod.exports);
  return mod.exports;
}

const types = load('lib/homebrew-types.ts');
const cr = load('lib/homebrew-cr.ts');
const reference = JSON.parse(fs.readFileSync('lib/data/gs-riferimento.json', 'utf8'));

const draft = (over = {}) => ({...types.EMPTY_DRAFT, nome: 'Drago di nebbia', taglia: 'Grande', tipo: 'Drago', allineamento: 'caotico neutrale', ca: 16, ca_nota: 'armatura naturale',
  pf: 110, dadi_vita: '13d10+39', velocita: '12 m, volo 24 m', forza: 19, destrezza: 14, costituzione: 17, intelligenza: 12, saggezza: 13, carisma: 15,
  ts_competenti: ['destrezza', 'saggezza'], abilita: 'Percezione +5, Furtività +6', sensi: 'scurovisione 36 m', linguaggi: 'Comune, Draconico', habitat: ['Montagna', 'Palude'], grado_sfida: '7',
  tratti: [{nome: 'Nebbia vivente', testo: 'Il drago può muoversi attraverso la nebbia.'}],
  azioni: [{nome: 'Multiattacco', testo: 'Il drago effettua due attacchi con Morso.'}, {nome: 'Morso', testo: 'Tiro per colpire in mischia: +7, portata 3 m. Colpito: 15 (2d10 + 4) danni perforanti.'},
    {nome: 'Soffio di nebbia (ricarica 5–6)', testo: 'Tiro salvezza su Costituzione: CD 15. Fallimento: 33 (6d10) danni da freddo. Successo: danni dimezzati.'}],
  ...over});

// Server checks of the form: lengths, numbers, choices, plain text.
const ok = types.parseDraft(draft());
assert.equal(ok.ok, true, JSON.stringify(ok));
assert.equal(ok.draft.dadi_vita, '13d10 + 39', 'dice written the SRD way');
for (const [over, error] of [
  [{nome: ''}, /nome/], [{nome: 'x'.repeat(61)}, /nome/], [{nome: 'Drago <b>finto</b>'}, /nome/], [{taglia: 'Gigantesca'}, /taglia/],
  [{ca: 31}, /Classe armatura/], [{pf: 0}, /Punti ferita/], [{dadi_vita: '13d7'}, /Dadi vita/], [{forza: 40}, /For/], [{grado_sfida: '31'}, /grado di sfida/],
  [{azioni: []}, /almeno un’azione/], [{azioni: [{nome: 'Morso', testo: '<script>alert(1)</script>'}]}, /caratteri non ammessi/],
  [{azioni: Array.from({length: 13}, () => ({nome: 'A', testo: 'B'}))}, /al massimo 12/], [{habitat: ['Luna']}, /Habitat/], [{ts_competenti: ['fortuna']}, /Tiri salvezza/],
  [{edizione: '2020'}, /edizione/], [{abilita: 'x'.repeat(161)}, /Abilità/],
]) {
  const result = types.parseDraft(draft(over));
  assert.equal(result.ok, false, JSON.stringify(over));
  assert.match(result.error, error, JSON.stringify(over));
}
assert.deepEqual(types.parseDraft(draft({edizione: '2014', azioni_bonus: [{nome: 'Scatto', testo: 'Si muove.'}]})).draft.azioni_bonus, [], 'the 2014 sheets have no bonus actions');

// The sheet in the format of each edition, as the SRD sheets of that edition.
const sheet2024 = types.draftToMonster(ok.draft, 'homebrew-drago-di-nebbia');
assert.equal(sheet2024.sottotitolo_fonte, 'Drago Grande, caotico neutrale');
assert.equal(sheet2024.iniziativa, '+2 (12)', 'Iniziativa from Dexterity');
assert.equal(sheet2024.bonus_competenza, '+3');
assert.equal(sheet2024.px, '2.900');
assert.equal(sheet2024.tiri_salvezza, 'For +4, Des +5, Cos +3, Int +1, Sag +4, Car +2', 'all six, proficient ones with the bonus');
assert.equal(sheet2024.sensi, 'Percezione passiva 15; scurovisione 36 m');
assert.equal(sheet2024.classe_armatura, '16 (armatura naturale)');
assert.equal(sheet2024.punti_ferita, '110 (13d10 + 39)');
assert.match(sheet2024.azioni, /^<strong>Multiattacco\.<\/strong> Il drago effettua due attacchi con Morso\.<br><br><strong>Morso\.<\/strong> <em>Tiro per colpire in mischia:<\/em> \+7, portata 3 m\. <em>Colpito:<\/em> 15/);
assert.match(sheet2024.azioni, /<em>Fallimento:<\/em> 33 \(6d10\) danni da freddo\. <em>Successo:<\/em>/);
assert.equal(sheet2024.edizione, '2024');
const sheet2014 = types.draftToMonster({...ok.draft, edizione: '2014', immunita_danni: 'freddo', immunita_condizioni: 'spaventato'}, 'homebrew-x');
assert.equal(sheet2014.iniziativa, undefined, 'no Iniziativa on 2014 sheets');
assert.equal(sheet2014.tiri_salvezza, 'Des +5, Sag +4', '2014: only the proficient saves');
assert.equal(sheet2014.sensi, 'Percezione passiva 15, scurovisione 36 m');
assert.equal(sheet2014.immunita_danni, 'freddo'); assert.equal(sheet2014.immunita_condizioni, 'spaventato'); assert.equal(sheet2014.immunita, undefined);
assert.equal(types.draftToMonster({...ok.draft, immunita_danni: 'freddo', immunita_condizioni: 'spaventato'}, 'x').immunita, 'freddo; spaventato', '2024: one Immunità line');
assert.equal(types.draftToMonster({...ok.draft, edizione: 'entrambe'}, 'x').edizione, '2024', '«Entrambe» uses the 2024 format');
assert.equal(types.entriesHtml([{nome: 'A & B', testo: 'x < y'}]), '<strong>A &amp; B.</strong> x &lt; y', 'escaped, never raw HTML');

// Format hint, both ways.
const text = types.draftActionText(ok.draft);
assert.equal(types.mismatchedFormat({edizione: '2014', text}), '2024');
assert.deepEqual(types.formatWords(text, '2024'), ['Tiro per colpire in mischia', 'Fallimento:', 'Successo:']);
assert.equal(types.mismatchedFormat({edizione: '2024', text}), undefined);
assert.equal(types.mismatchedFormat({edizione: '2024', text: 'Attacco con arma da mischia: +5 al tiro per colpire'}), '2014');
assert.equal(types.mismatchedFormat({edizione: '2014', text: 'Attacco con arma da mischia: +5 al tiro per colpire'}), undefined);

// Similar names of the catalog.
assert.equal(types.similarName('Beholdr', ['Beholder', 'Lich']), 'Beholder');
assert.equal(types.similarName('Lich delle nebbie', ['Lich']), 'Lich');
assert.equal(types.similarName('Drago di nebbia', ['Drago rosso adulto', 'Lich']), undefined);
assert.equal(types.homebrewId('Drago di nébbia!'), 'homebrew-drago-di-nebbia');

// Proposal of the form: nickname, two boxes, optional email.
const proposal = {scheda: draft(), nickname: 'Master Ombra', email: '', originale: true, autorizza: true, licenza: 'CC BY-NC-SA 4.0', token: 't'};
assert.equal(types.parseProposal(proposal).ok, true);
assert.equal(types.parseProposal(proposal).value.licenza, 'CC BY-NC-SA 4.0', 'the version of the licence is saved with the proposal');
assert.equal(types.HOMEBREW_LICENSE_URL, 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it');
assert.match(types.parseProposal({...proposal, nickname: ''}).error, /nickname/);
assert.match(types.parseProposal({...proposal, email: 'non-una-email'}).error, /Email/);
assert.match(types.parseProposal({...proposal, originale: false}).error, /originale/);
assert.match(types.parseProposal({...proposal, autorizza: false}).error, /licenza CC BY-NC-SA 4\.0 e autorizza/);
// A page opened before the licence (its box did not name it) sends none: refused, the page must be reloaded.
assert.match(types.parseProposal({...proposal, licenza: undefined}).error, /Ricarica la pagina/);
assert.match(types.parseProposal({...proposal, licenza: 'CC BY 4.0'}).error, /Ricarica la pagina/);
assert.equal(types.parseProposal({...proposal, sito: 'http://spam'}).spam, true, 'honeypot');

// Challenge check: reference from the SRD creatures only, then the estimate within ±1 for SRD creatures of different ratings.
assert.ok(reference.righe.length >= 25 && reference.metodo.includes('SRD'), 'reference values from the SRD creatures of the catalog');
assert.ok(reference.righe.every(row => row.n > 0 && row.pf > 0));
const sheets = ['srd-monsters-5.2.1-it', 'srd-monsters-5.1-it', 'srd-animals-5.2.1-it'].flatMap(file => JSON.parse(fs.readFileSync(`lib/data/${file}.json`, 'utf8')).records.map(record => record.monster));
const position = gs => reference.righe.findIndex(row => row.gs === gs);
const samples = ['goblin-2014', 'ogre', 'minotauro-2014', 'troll', 'mago', 'drago-rosso-giovane', 'lich', 'drago-rosso-antico', 'tarrasque-2014'];
const lines = samples.map(id => {
  const monster = sheets.find(sheet => sheet.id === id);
  const result = cr.estimateChallenge(cr.statsOf(monster), reference);
  assert.ok(Math.abs(position(result.stimato) - position(monster.grado_sfida)) <= 1, `${id}: GS ${monster.grado_sfida}, stimato ${result.stimato}`);
  return `${monster.nome} GS ${monster.grado_sfida} → ${result.stimato}`;
});
assert.equal(new Set(samples.map(id => sheets.find(sheet => sheet.id === id).grado_sfida)).size, samples.length, 'different ratings');
let within = 0;
for (const sheet of sheets) {
  if (position(sheet.grado_sfida) < 0) continue;
  if (Math.abs(position(cr.estimateChallenge(cr.statsOf(sheet), reference).stimato) - position(sheet.grado_sfida)) <= 1) within++;
}
assert.ok(within / sheets.length > 0.75, `estimate within ±1 for ${within} of ${sheets.length}`);
const strong = cr.estimateChallenge(cr.statsOf(types.draftToMonster({...ok.draft, grado_sfida: '1'}, 'x')), reference);
assert.equal(strong.esito, 'troppo-forte'); assert.match(strong.spiegazione, /GS \d+/);
const weak = cr.estimateChallenge(cr.statsOf(types.draftToMonster({...ok.draft, grado_sfida: '20'}, 'x')), reference);
assert.equal(weak.esito, 'troppo-debole');
assert.equal(cr.estimateChallenge(cr.statsOf(sheet2024), reference).esito, 'in-linea', 'the sample creature is a GS 7');

(async () => {
  // Database: proposals, approval, refusal, limits; nothing in the tables of the catalog.
  const pg = new PGlite();
  const pool = {query: (sql, params) => pg.query(sql, params), connect: async () => ({query: (sql, params) => pg.query(sql, params), release() {}})};
  deps['server-only'] = {};
  deps['./db'] = deps['@/lib/db'] = {db: {}, pool};
  // The votes «al tavolo» of a card go with it (lib/table-votes.ts), against the same database.
  deps['./table-votes'] = load('lib/table-votes.ts', {'server-only': {}, './db': {pool}, './analytics': {tableVoteKey: visitor => `k-${visitor}`}});
  const homebrew = load('lib/homebrew.ts');
  assert.deepEqual(await homebrew.publishedHomebrew(), [], 'no table yet: no homebrew, no error');
  assert.equal(await homebrew.countProposalsToReview(), 0);
  const licenza = 'CC BY-NC-SA 4.0';
  const saved = await homebrew.saveProposal({draft: ok.draft, nickname: 'Master Ombra', email: 'master@esempio.it', licenza, impronta: 'hash'});
  assert.equal(saved.licenza, licenza, 'the licence accepted is saved with the proposal');
  const both = await homebrew.saveProposal({draft: {...ok.draft, nome: 'Spirito del guado', edizione: 'entrambe'}, nickname: 'Lia', email: null, licenza, impronta: null});
  const refused = await homebrew.saveProposal({draft: {...ok.draft, nome: 'Copia di un manuale'}, nickname: 'X', email: 'x@esempio.it', licenza, impronta: null});
  assert.equal(await homebrew.countProposalsToReview(), 3);
  assert.deepEqual((await homebrew.listProposals('da-vedere')).map(row => row.scheda.nome), ['Drago di nebbia', 'Spirito del guado', 'Copia di un manuale']);
  assert.deepEqual(await homebrew.publishedHomebrew(), [], 'nothing published before the approval');
  const approved = await homebrew.approveProposal(saved.id, {giudizio: 'in linea', verificato: true});
  assert.deepEqual(approved, {homebrewId: 'homebrew-drago-di-nebbia', nome: 'Drago di nebbia', email: 'master@esempio.it'}, 'the email is returned once, for the notice');
  assert.equal((await homebrew.getProposal(saved.id)).email, null, 'then deleted');
  assert.equal(await homebrew.approveProposal(saved.id), null, 'decided once');
  // A verdict out of line: the box ticked all the same never shows the pill (PROMPT 19).
  await homebrew.approveProposal(both.id, {giudizio: 'fuori', verificato: true});
  assert.equal(await homebrew.refuseProposal(refused.id, 'Testo copiato'), true);
  const refusedRow = await homebrew.getProposal(refused.id);
  assert.equal(refusedRow.stato, 'rifiutata'); assert.equal(refusedRow.email, null, 'email deleted at the refusal'); assert.equal(refusedRow.motivo, 'Testo copiato');
  const published = await homebrew.publishedHomebrew();
  assert.deepEqual(published.map(row => [row.id, row.autore, row.edizione]), [['homebrew-drago-di-nebbia', 'Master Ombra', '2024'], ['homebrew-spirito-del-guado', 'Lia', 'entrambe']]);
  const items = published.map(homebrew.homebrewListItem);
  assert.deepEqual(items.map(item => [item.homebrew, item.autore, item.edizione, item.entrambe]), [[true, 'Master Ombra', '2024', undefined], [true, 'Lia', '2024', true]]);
  assert.ok(!items.some(item => 'azioni' in item), 'lists never ship full sheets');
  const card = homebrew.homebrewMonster(published[0]);
  assert.equal(published[0].licenza, licenza, 'the published card keeps the licence of its proposal');
  assert.equal(card.homebrew_licenza, licenza);
  assert.equal(card.homebrew_autore, 'Master Ombra'); assert.equal(card.homebrew_edizione, '2024'); assert.equal(card.nome, 'Drago di nebbia');
  // «Bilanciamento verificato» (PROMPT 19): the verdict saved at the approval, the pill only when «in linea» and left on.
  assert.deepEqual(published.map(row => [row.bilanciamento, row.verificato]), [['in linea', true], ['fuori', false]]);
  assert.equal(card.homebrew_verificato, true);
  assert.equal(homebrew.homebrewMonster(published[1]).homebrew_verificato, undefined, 'no pill and no field when out of line');
  assert.equal(await homebrew.setHomebrewVerified('homebrew-drago-di-nebbia', false), true, 'taken away by the administrator');
  assert.equal(homebrew.homebrewMonster(await homebrew.getHomebrew('homebrew-drago-di-nebbia')).homebrew_verificato, undefined);
  assert.equal(await homebrew.setHomebrewVerified('homebrew-drago-di-nebbia', true), true, 'and back');
  assert.equal(await homebrew.setHomebrewVerified('homebrew-spirito-del-guado', true), false, 'never on with a verdict out of line');
  assert.equal(homebrew.homebrewMonster(await homebrew.getHomebrew('homebrew-spirito-del-guado')).homebrew_verificato, undefined);
  assert.equal(await homebrew.getHomebrew('aboleth'), undefined, 'only homebrew ids');
  // Same name again: a new address, never one taken.
  const second = await homebrew.saveProposal({draft: ok.draft, nickname: 'Altro', email: null, licenza, impronta: null});
  assert.equal((await homebrew.approveProposal(second.id)).homebrewId, 'homebrew-drago-di-nebbia-2');
  // «+ Nuova homebrew» of the administrator: «del Grimorio» (no author), corrections, the bin.
  const own = await homebrew.createHomebrew({...ok.draft, nome: 'Guardiano di sale', edizione: '2014'});
  assert.equal((await homebrew.getHomebrew(own)).autore, null);
  assert.equal((await homebrew.getHomebrew(own)).licenza, licenza, 'the homebrew of the Grimorio has the same licence');
  // A proposal sent before the licence (a row of the old table, the column empty): shown without one, never published.
  await pg.query("INSERT INTO grimorio_homebrew_proposals (id, scheda, nickname, originale, autorizza) VALUES ('22222222-2222-4222-8222-222222222222', $1, 'Vecchia', true, true)", [JSON.stringify({...ok.draft, nome: 'Proposta di prima'})]);
  assert.equal((await homebrew.getProposal('22222222-2222-4222-8222-222222222222')).licenza, null);
  assert.equal(await homebrew.approveProposal('22222222-2222-4222-8222-222222222222'), 'no-license');
  assert.equal((await homebrew.getProposal('22222222-2222-4222-8222-222222222222')).stato, 'da-vedere', 'still to review, nothing published');
  assert.ok(!(await homebrew.publishedHomebrew()).some(row => row.scheda.nome === 'Proposta di prima'));
  await homebrew.refuseProposal('22222222-2222-4222-8222-222222222222', null);
  // The licence a card shows: the one accepted; the Grimorio's own cards have it; a proposed card from before none.
  assert.equal(homebrew.homebrewLicense({autore: 'Lia', licenza: null}), null);
  assert.equal(homebrew.homebrewLicense({autore: null, licenza: null}), licenza);
  assert.equal(homebrew.homebrewLicense({autore: 'Lia', licenza}), licenza);
  assert.equal((await homebrew.getHomebrew(own)).verificato, false, 'ours start without the pill');
  assert.equal(await homebrew.updateHomebrew(own, {...ok.draft, nome: 'Guardiano di sale', edizione: '2014', pf: 90}, 'in linea'), true);
  assert.equal(await homebrew.setHomebrewVerified(own, true), true);
  // A correction out of line takes the pill away.
  assert.equal(await homebrew.updateHomebrew(own, {...ok.draft, nome: 'Guardiano di sale', edizione: '2014', pf: 300}, 'fuori'), true);
  assert.deepEqual([(await homebrew.getHomebrew(own)).bilanciamento, (await homebrew.getHomebrew(own)).verificato], ['fuori', false]);
  // The votes «al tavolo» of a card go with it.
  const votes = deps['./table-votes'];
  for (const visitor of ['a', 'b']) await votes.storeTableVote(visitor, own, 'giusto', false);
  await votes.storeTableVote('c', 'homebrew-drago-di-nebbia', 'facile', false);
  assert.equal((await votes.readAllTableCounts()).get(own).total, 2);
  assert.equal(await homebrew.deleteHomebrew(own), true);
  assert.equal((await votes.readAllTableCounts()).get(own), undefined, 'its votes deleted with the card');
  assert.equal((await votes.readAllTableCounts()).get('homebrew-drago-di-nebbia').total, 1, 'the others stay');
  assert.deepEqual((await homebrew.allHomebrewLog()).map(row => row.azione).sort(), ['corretta', 'corretta', 'creata', 'eliminata', 'pubblicata', 'pubblicata', 'pubblicata', 'rifiutata', 'rifiutata']);
  assert.deepEqual((await homebrew.proposalCounts()), {'da-vedere': 0, approvata: 3, rifiutata: 2});
  const tables = (await pg.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).rows.map(row => row.table_name);
  assert.deepEqual(tables, ['grimorio_homebrew', 'grimorio_homebrew_limits', 'grimorio_homebrew_log', 'grimorio_homebrew_proposals', 'grimorio_table_votes'], 'only its own tables');
  // Send limits per device (salted hash, never the address) and overall.
  for (let i = 0; i < 3; i++) await homebrew.recordProposalSend('device-a');
  assert.equal((await homebrew.proposalLimits('device-a')).limited, true, '3 an hour from one device');
  assert.deepEqual(await homebrew.proposalLimits('device-b'), {limited: false, peak: false});
  for (let i = 0; i < 27; i++) await homebrew.recordProposalSend(`device-${i}`);
  // Over 30 an hour from everyone the form does not close: saved without a notice (28 October 2026).
  assert.deepEqual(await homebrew.proposalLimits('device-nuovo'), {limited: false, peak: true}, '30 an hour from everyone: a peak, not a refusal');
  process.env.FEEDBACK_SECRET = 'segreto-di-prova';
  const key = homebrew.proposalDeviceKey(new Headers({'x-real-ip': '203.0.113.9'}));
  assert.match(key, /^[0-9a-f]{64}$/); assert.ok(!key.includes('203.0.113'));
  // The notice of publication: only with Resend and a sender of the site.
  delete process.env.RESEND_API_KEY; delete process.env.FEEDBACK_FROM_EMAIL;
  assert.equal(await homebrew.sendPublishedEmail('a@esempio.it', 'Drago', 'https://ilgrimorio.app/mostro/x', async () => { throw new Error('no call'); }), 'not-configured');
  process.env.RESEND_API_KEY = 'chiave-finta'; process.env.FEEDBACK_FROM_EMAIL = 'Il Grimorio <info@ilgrimorio.app>';
  let sentBody;
  assert.equal(await homebrew.sendPublishedEmail('a@esempio.it', 'Drago', 'https://ilgrimorio.app/mostro/x', async (url, init) => { sentBody = JSON.parse(init.body); return {ok: true}; }), 'sent');
  assert.equal(sentBody.subject, 'La tua creatura è stata pubblicata'); assert.deepEqual(sentBody.to, ['a@esempio.it']); assert.match(sentBody.text, /mostro\/x/);
  delete process.env.RESEND_API_KEY; delete process.env.FEEDBACK_FROM_EMAIL;

  // Admin actions: refused without the login.
  deps['@/lib/admin-action-helpers'] = {requireAdmin: async () => { throw new Error('Non autorizzato'); }};
  deps['next/cache'] = {revalidatePath() {}, updateTag() {}};
  deps['next/headers'] = {headers: async () => new Headers()};
  deps['@/lib/homebrew-balance'] = {homebrewVerdict: () => 'in linea'};
  const actions = load('app/actions/admin-homebrew.ts');
  for (const call of [() => actions.approveProposalAction(both.id), () => actions.refuseProposalAction(both.id, ''), () => actions.correctProposalAction(both.id, ok.draft),
    () => actions.createHomebrewAction(ok.draft), () => actions.updateHomebrewAction('homebrew-drago-di-nebbia', ok.draft), () => actions.deleteHomebrewAction(new FormData()),
    () => actions.setVerifiedAction('homebrew-drago-di-nebbia', false)]) {
    await assert.rejects(call(), /Non autorizzato/);
  }
  await pg.close();

  // A database with the tables made before the licence (production): the column is added, empty on the rows it
  // already has, and the reads work before it too.
  const old = new PGlite();
  await old.exec(`CREATE TABLE grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL, edizione text NOT NULL, autore text, proposta_id uuid, pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now());
    CREATE TABLE grimorio_homebrew_proposals (id uuid PRIMARY KEY, stato text NOT NULL DEFAULT 'da-vedere', scheda jsonb NOT NULL, nickname text NOT NULL, email text, originale boolean NOT NULL, autorizza boolean NOT NULL, impronta text, creata_il timestamptz NOT NULL DEFAULT now(), decisa_il timestamptz, motivo text, homebrew_id text);`);
  await old.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore) VALUES ('homebrew-di-prima', $1, '2024', 'Lia')", [JSON.stringify({...ok.draft, nome: 'Di prima'})]);
  await old.query("INSERT INTO grimorio_homebrew_proposals (id, scheda, nickname, originale, autorizza) VALUES ('33333333-3333-4333-8333-333333333333', $1, 'Lia', true, true)", [JSON.stringify(ok.draft)]);
  deps['./db'] = deps['@/lib/db'] = {db: {}, pool: {query: (sql, params) => old.query(sql, params), connect: async () => ({query: (sql, params) => old.query(sql, params), release() {}})}};
  cache.delete(path.resolve('lib/homebrew.ts'));
  const before = load('lib/homebrew.ts');
  assert.equal(before.homebrewMonster(await before.getHomebrew('homebrew-di-prima')).homebrew_licenza, null, 'read before the column: no licence shown');
  assert.equal((await before.getProposal('33333333-3333-4333-8333-333333333333')).licenza, undefined);
  await before.ensureHomebrewTables();
  assert.deepEqual((await old.query("SELECT licenza FROM grimorio_homebrew_proposals")).rows, [{licenza: null}], 'column added, the proposal keeps no licence');
  assert.deepEqual((await old.query("SELECT licenza FROM grimorio_homebrew")).rows, [{licenza: null}]);
  assert.equal(await before.approveProposal('33333333-3333-4333-8333-333333333333'), 'no-license');
  await old.close();
  console.log(`Homebrew: plain-text form checked on the server, sheets in the 2014/2024 SRD format, format hint, similar names, proposals approved/refused with the email deleted, licence CC BY-NC-SA 4.0 saved with proposals and cards (none: never published; the column added to the tables made before), «Entrambe» in both editions, limits, notice only with Resend, admin actions closed without login; challenge check from ${sheets.length} SRD creatures, within ±1 for ${within} (${lines.join('; ')}).`);
})().catch(error => { console.error(error); process.exit(1); });
