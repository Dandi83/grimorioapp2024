// PROMPT 66: the public list of the original creatures for Total Party Kill (/api/tpk/creature-originali).
// The rules of lib/tpk-creatures.ts on made-up rows (no database), then the route file and the places it must stay out of.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const tpk = require('../lib/tpk-creatures.ts');
const {HOMEBREW_LICENSE, HOMEBREW_LICENSE_URL} = require('../lib/homebrew-types.ts');

const draft = (nome, edizione, extra = {}) => ({
  edizione, nome, taglia: 'Media', tipo: 'Mostruosità', allineamento: 'caotico malvagio', ca: 15, ca_nota: 'armatura naturale', pf: 52, dadi_vita: '8d8 + 16',
  velocita: '9 m', forza: 16, destrezza: 14, costituzione: 14, intelligenza: 6, saggezza: 12, carisma: 7, ts_competenti: ['forza'],
  abilita: 'Percezione +3', vulnerabilita: '', resistenze: '', immunita_danni: '', immunita_condizioni: '', sensi: 'scurovisione 18 m', linguaggi: '',
  habitat: ['foresta'], grado_sfida: '3', tratti: [{nome: 'Fiuto', testo: 'Vantaggio alle prove di Saggezza (Percezione) basate sull’olfatto.'}],
  azioni: [{nome: 'Artiglio', testo: 'Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 10 (2d6 + 3) danni taglienti.'}],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [], descrizione: 'Una belva delle foreste.', ...extra,
});
const row = (id, edizione, autore, extra = {}) => ({
  id, scheda: draft(id, edizione), edizione, autore, licenza: HOMEBREW_LICENSE, verificato: false,
  pubblicata_il: '2026-11-01T10:00:00.000Z', aggiornata_il: '2026-11-02T10:00:00.000Z', ...extra,
});

const SECRET = {
  storia: 'Storia visibile dello squartatore.',
  tattiche: 'TATTICA SEGRETA: attacca alle spalle.', tana: 'TANA SEGRETA nel bosco.', agganci: 'AGGANCIO SEGRETO per il master.', varianti: 'VARIANTE SEGRETA alata.',
};
const ours = {
  ...row('homebrew-squartatore', '2024', null),
  scheda: draft('Squartatore', '2024', {...SECRET, sezioni_nascoste: ['tattiche', 'tana', 'agganci', 'varianti'], testo_ricco: true,
    immagine: {v: '0123456789abcdef', w: 800, h: 533}, immagine_alt: 'Lo squartatore nel bosco', immagine_crediti: 'Illustrazione di prova'}),
  // Columns of the table that must never go out, even if a row carried them.
  proposta_id: '00000000-0000-4000-8000-000000000000', bilanciamento: 'fuori dal gs',
  pubblicata_il: '2026-10-30T10:00:00.000Z',
};
const community = row('homebrew-gatto-ombra', '2024', 'Lia', {verificato: true, pubblicata_il: '2026-11-03T10:00:00.000Z'});
const both = row('homebrew-falena', 'entrambe', 'Teo', {pubblicata_il: '2026-11-02T10:00:00.000Z'});
const old2014 = row('homebrew-lupo-2014', '2014', 'Lia');
const noLicense = row('homebrew-senza-licenza', '2024', 'Max', {licenza: null});
const eyeHidden = row('homebrew-nascosto', '2024', 'Lia');
const rows = [ours, community, both, old2014, noLicense, eyeHidden];

const open = {sections: [], parts: [], cardHidden: id => id === 'homebrew-nascosto', srdOnly: false};
const ids = view => tpk.tpkCreatureList(rows, view).creature.map(creature => creature.id);

// Who goes out: the newest first; never 2014, a card hidden with the eye or a community card without a licence.
assert.deepEqual(ids(open), ['homebrew-gatto-ombra', 'homebrew-falena', 'homebrew-squartatore']);
// The parts of the Bestiario (hidden or «In arrivo»: both stored among the hidden parts).
assert.deepEqual(ids({...open, parts: ['bestiario:grimorio']}), ['homebrew-gatto-ombra', 'homebrew-falena']);
assert.deepEqual(ids({...open, parts: ['bestiario:homebrew']}), ['homebrew-squartatore']);
assert.deepEqual(ids({...open, parts: ['bestiario:2024']}), [], 'the 2024 edition hidden: «Entrambe» too');
assert.deepEqual(ids({...open, parts: ['bestiario:2014']}), ['homebrew-gatto-ombra', 'homebrew-falena', 'homebrew-squartatore']);
assert.deepEqual(ids({...open, parts: ['bestiario:mostri', 'bestiario:animali']}), ['homebrew-gatto-ombra', 'homebrew-falena', 'homebrew-squartatore']);
// The whole Bestiario hidden or «In arrivo», or every collection of it hidden.
assert.deepEqual(ids({...open, sections: ['bestiario']}), []);
assert.deepEqual(ids({...open, parts: ['bestiario:mostri', 'bestiario:animali', 'bestiario:homebrew', 'bestiario:grimorio']}), []);
// Another section hidden changes nothing.
assert.deepEqual(ids({...open, sections: ['talenti', 'personaggi']}), ['homebrew-gatto-ombra', 'homebrew-falena', 'homebrew-squartatore']);
// «Modalità solo SRD» on: nothing.
assert.deepEqual(ids({...open, srdOnly: true}), []);

const list = tpk.tpkCreatureList(rows, open, new Date('2026-11-06T08:00:00.000Z'));
assert.deepEqual(Object.keys(list), ['versione', 'generato_il', 'fonte', 'nota_licenza', 'creature']);
assert.equal(list.versione, 1);
assert.equal(list.generato_il, '2026-11-06T08:00:00.000Z');
assert.equal(list.fonte, 'https://ilgrimorio.app');
assert.equal(list.nota_licenza, 'Le creature della community sono CC BY-NC-SA 4.0: uso solo non commerciale, con autore, licenza e link alla scheda. Se Total Party Kill diventasse a pagamento o con pubblicità, vanno tolte o serve un consenso diverso.');

const [cat, moth, ripper] = list.creature;
// The editorial staff: their licence, no author, the picture (medium WebP), the visible sections only.
assert.deepEqual({...ripper, scheda: undefined}, {
  id: 'homebrew-squartatore', url: 'https://ilgrimorio.app/mostro/homebrew-squartatore', origine: 'redazione', autore: null,
  licenza: '© 2026 D.d.B. – Il Grimorio.App, uso consentito a Total Party Kill', licenza_url: 'https://ilgrimorio.app/info',
  verificato: false, giudizio_bilanciamento: null, pubblicata_il: '2026-10-30T10:00:00.000Z', aggiornata_il: '2026-11-02T10:00:00.000Z',
  immagine: {url: 'https://ilgrimorio.app/immagini-mostri/0123456789abcdef-m.webp', alt: 'Lo squartatore nel bosco', crediti: 'Illustrazione di prova'},
  scheda: undefined,
});
assert.equal(ripper.scheda.storia, SECRET.storia);
for (const key of ['tattiche', 'tana', 'agganci', 'varianti', 'sezioni_nascoste', 'immagine', 'immagine_alt', 'immagine_crediti']) assert.ok(!(key in ripper.scheda), key);
assert.equal(ripper.scheda.testo_ricco, true);
assert.deepEqual(Object.keys(ripper.scheda), ['edizione', 'nome', 'taglia', 'tipo', 'allineamento', 'ca', 'ca_nota', 'pf', 'dadi_vita', 'velocita',
  'forza', 'destrezza', 'costituzione', 'intelligenza', 'saggezza', 'carisma', 'ts_competenti', 'abilita', 'vulnerabilita', 'resistenze',
  'immunita_danni', 'immunita_condizioni', 'sensi', 'linguaggi', 'habitat', 'grado_sfida', 'tratti', 'azioni', 'azioni_bonus', 'reazioni',
  'azioni_leggendarie', 'descrizione', 'storia', 'testo_ricco']);
// The texts of the sheet stay exactly as stored.
assert.deepEqual(ripper.scheda.azioni, ours.scheda.azioni);
assert.equal(ripper.scheda.descrizione, ours.scheda.descrizione);
// A hidden block of the sheet (descrizione, tratti…) goes away too, like on the page.
const hiddenBlocks = tpk.tpkSheet(draft('X', '2024', {sezioni_nascoste: ['descrizione', 'tratti']}), true);
assert.ok(!('descrizione' in hiddenBlocks) && !('tratti' in hiddenBlocks) && 'azioni' in hiddenBlocks);
// The community: author, the licence of the row, its link; the verdict only as the card shows it (the green pill).
assert.equal(cat.origine, 'community');
assert.equal(cat.autore, 'Lia');
assert.equal(cat.licenza, 'CC BY-NC-SA 4.0');
assert.equal(cat.licenza_url, HOMEBREW_LICENSE_URL);
assert.equal(cat.verificato, true);
assert.equal(cat.giudizio_bilanciamento, 'In linea');
assert.equal(cat.immagine, null);
assert.equal(moth.scheda.edizione, 'entrambe');
assert.equal(moth.giudizio_bilanciamento, null);
// A community card never carries the editorial sections, even if its draft had them.
const strange = tpk.tpkCreature({...community, scheda: draft('Strano', '2024', {storia: 'non sua', immagine: {v: 'ffffffffffffffff', w: 1, h: 1}, immagine_alt: 'x'})});
assert.ok(!('storia' in strange.scheda));
assert.equal(strange.immagine, null);
// An unknown key of the stored draft never goes out by itself.
assert.ok(!('nota_admin' in tpk.tpkSheet({...draft('Y', '2024'), nota_admin: 'privata'}, true)));

// No private field anywhere, by key and by text.
const PRIVATE_KEYS = ['email', 'nickname', 'proposta', 'proposta_id', 'motivo', 'note', 'nota', 'commento', 'cronologia', 'ip', 'token', 'impronta', 'picco',
  'stato', 'decisa_il', 'creata_il', 'homebrew_id', 'bilanciamento', 'sezioni_nascoste', 'autore_modifica', 'device_hash', 'originale', 'autorizza'];
const keys = value => (Array.isArray(value) ? value.flatMap(keys) : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, inner]) => [key, ...keys(inner)]) : []);
for (const key of keys(list)) assert.ok(!PRIVATE_KEYS.includes(key), `private key: ${key}`);
const text = JSON.stringify(list);
for (const secret of [SECRET.tattiche, SECRET.tana, SECRET.agganci, SECRET.varianti, 'fuori dal gs', '00000000-0000-4000-8000-000000000000', 'homebrew-lupo-2014', 'homebrew-senza-licenza', 'homebrew-nascosto']) {
  assert.ok(!text.includes(secret), secret);
}

// The route: GET only, dynamic, the exact network cache, no ISR timer, no CORS, no write.
const route = fs.readFileSync('app/api/tpk/creature-originali/route.ts', 'utf8');
assert.equal(tpk.TPK_LIST_CACHE, 'public, s-maxage=3600, stale-while-revalidate=86400');
assert.deepEqual([...route.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(match => match[1]), ['dynamic', 'GET']);
assert.ok(route.includes('export const dynamic = "force-dynamic";'));
assert.ok(route.includes('"Cache-Control": TPK_LIST_CACHE'));
assert.ok(!/export const revalidate|revalidate:|revalidatePath|Access-Control|INSERT|UPDATE|DELETE|ensure\w*Tables|console\./.test(route), 'no ISR, no CORS, no write, no log');
assert.ok(!/export const revalidate|revalidate:|Access-Control|console\./.test(fs.readFileSync('lib/tpk-creatures.ts', 'utf8')));
// Out of the sitemap, the service worker and the search index; not a page of the statistics.
for (const file of ['lib/sitemap.ts', 'app/sitemap.ts', 'lib/sw/service-worker.js', 'app/ricerca-indice.json/route.ts']) assert.ok(!fs.readFileSync(file, 'utf8').includes('/api/tpk'), file);

console.log('API TPK: creature originali pubbliche (redazione e community) con le regole di /mostro/<id>, niente 2014, schede nascoste, parti chiuse o modalità solo SRD; nessun campo privato; GET con cache di rete esatta.');
