// «Importa mostro» and the new sections of the creatures «Dalla redazione» (PROMPT 44): the check of the JSON (errors
// field by field, nothing saved, dangerous HTML taken away), the sheet with the five sections and the hidden ones,
// the public copy without them, the old cards unchanged, the public form unable to set the new fields, the picture
// made of three WebP sizes under 150 KB. No database: the storage of the pictures is replaced here.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// lib/monster-picture-server.ts: server-only and the database are not needed for the conversion.
const load = Module._load;
Module._load = function (request, parent, ...rest) {
  if (request === 'server-only') return {};
  if (/(^|[\\/])db$/.test(request) && parent && /monster-picture-server/.test(parent.filename)) return { pool: { query: async () => ({ rows: [] }) } };
  return load.call(this, request, parent, ...rest);
};

const root = path.resolve(__dirname, '..');
const { checkImport, draftChanges, htmlToMarks } = require(path.join(root, 'lib/monster-import.ts'));
const types = require(path.join(root, 'lib/homebrew-types.ts'));
const { draftToMonster, parseDraft, richHtml, EMPTY_DRAFT } = types;
const { parseEditorialExtras, HIDEABLE_SECTIONS } = require(path.join(root, 'lib/editorial-draft.ts'));
const { publicSheet } = require(path.join(root, 'lib/public-sheet.ts'));

const VALID = {
  id: 'custode-delle-ceneri', nome: 'Custode delle ceneri', tipo: 'Costrutto', taglia: 'Grande', allineamento: 'neutrale',
  grado_sfida: '5', gs_num: 5, px: '1.800', bonus_competenza: '+3', classe_armatura: '16 (armatura naturale)', iniziativa: '+1 (11)',
  punti_ferita: '95 (10d10 + 40)', velocita: '9 m', forza: 19, destrezza: 12, costituzione: 18, intelligenza: 6, saggezza: 12, carisma: 5,
  tiri_salvezza: 'For +7, Des +1, Cos +7, Int −2, Sag +1, Car −3', abilita: 'Percezione +4', resistenze: 'Fuoco', immunita: 'Veleno; Avvelenato',
  sensi: 'Scurovisione 18 m, Percezione passiva 14', linguaggi: 'capisce il Comune ma non parla', habitat: ['Sottosuolo', 'montagna'],
  descrizione: 'Un guardiano di pietra.<br><br>Veglia sulle <em>tombe</em>.',
  tratti: '<strong>Corpo di brace.</strong> Chi lo tocca subisce 5 (1d10) danni da fuoco.',
  azioni: '<strong>Multiattacco.</strong> Due attacchi con il Pugno.<br><br><strong>Pugno.</strong> <em>Tiro per colpire in mischia:</em> +7, portata 1,5 m. <em>Colpito:</em> 13 (2d8 + 4) danni contundenti e il bersaglio è prono.',
  azioni_bonus: '', reazioni: '', azioni_leggendarie: '',
  storia: 'Forgiato dai <strong>nani</strong>.<br><br>Secondo paragrafo, *non* HTML.', tattiche: 'Combatte fino alla fine; rende <em>spaventato</em> chi fugge.', tana: '',
  agganci: 'Un mercante cerca chi lo distrugga.', varianti: '', sezioni_nascoste: ['agganci'], immagine_alt: 'Un gigante di pietra',
};
const json = value => JSON.stringify(value);

// A correct JSON: no errors, the draft of 2014 and 2024, the computed numbers, the address.
let result = checkImport(json(VALID));
assert.deepEqual(result.errori, []);
assert.equal(result.id, 'homebrew-custode-delle-ceneri');
const draft = result.draft;
assert.equal(draft.edizione, 'entrambe');
assert.equal(draft.testo_ricco, true);
assert.deepEqual(draft.ts_competenti, ['forza', 'costituzione']);
assert.deepEqual(draft.habitat, ['Montagna', 'Sottosuolo']);
assert.equal(draft.immunita_danni, 'Veleno');
assert.equal(draft.immunita_condizioni, 'Avvelenato');
assert.equal(draft.sensi, 'Scurovisione 18 m');
assert.deepEqual(draft.sezioni_nascoste, ['agganci']);
assert.deepEqual(result.avvisi, []);
// An array with one object is the same.
assert.deepEqual(checkImport(json([VALID])).draft, draft);

// The sheet: the five sections as HTML of <strong>, <em> and <br> only, in the order of the page; the hidden list.
const sheet = draftToMonster(draft, result.id);
assert.equal(sheet.storia, 'Forgiato dai <strong>nani</strong>.<br><br>Secondo paragrafo, <em>non</em> HTML.');
assert.ok(sheet.tattiche.includes('<em>spaventato</em>'));
assert.equal(sheet.tana, undefined);
assert.equal(sheet.agganci, 'Un mercante cerca chi lo distrugga.');
assert.deepEqual(sheet.sezioni_nascoste, ['agganci']);
assert.equal(sheet.azioni, '<strong>Multiattacco.</strong> Due attacchi con il Pugno.<br><br><strong>Pugno.</strong> <em>Tiro per colpire in mischia:</em> +7, portata 1,5 m. <em>Colpito:</em> 13 (2d8 + 4) danni contundenti e il bersaglio è prono.');
assert.equal(sheet.px, '1.800');
assert.equal(sheet.bonus_competenza, '+3');
// The public copy: the hidden sections are gone, the others stay.
const shown = publicSheet(sheet);
assert.equal('agganci' in shown, false);
assert.equal('sezioni_nascoste' in shown, false);
assert.equal(shown.storia, sheet.storia);
const allHidden = publicSheet(draftToMonster({ ...draft, sezioni_nascoste: ['descrizione', 'tratti', 'azioni', 'storia', 'tattiche'] }, 'x'));
for (const key of ['descrizione', 'tratti', 'azioni', 'storia', 'tattiche']) assert.equal(key in allHidden, false, key);
console.log('[import] correct JSON: draft 2014 e 2024, computed numbers, five sections, hidden sections out of the public copy.');

// Errors, field by field, and no draft: nothing can be saved.
const broken = { ...VALID, nome: '', forza: 'tanta', px: '2.300', bonus_competenza: '+4', gs_num: 4, sconosciuta: 1, classe_armatura: 'alta', habitat: ['Luna'], sezioni_nascoste: ['caratteristiche'] };
result = checkImport(json(broken));
assert.equal(result.draft, undefined);
const fields = result.errori.map(issue => issue.campo);
for (const field of ['sconosciuta', 'nome', 'px', 'bonus_competenza', 'gs_num', 'forza', 'classe_armatura', 'habitat', 'sezioni_nascoste']) assert.ok(fields.includes(field), field);
assert.match(result.errori.find(issue => issue.campo === 'nome').messaggio, /campo obbligatorio mancante/);
assert.match(result.errori.find(issue => issue.campo === 'px').messaggio, /non è coerente con il GS 5 \(deve essere 1\.800\)/);
assert.match(result.errori.find(issue => issue.campo === 'bonus_competenza').messaggio, /deve essere \+3/);
assert.match(result.errori.find(issue => issue.campo === 'forza').messaggio, /non è un numero valido/);
assert.match(result.errori.find(issue => issue.campo === 'sconosciuta').messaggio, /Chiave sconosciuta «sconosciuta»/);
assert.match(checkImport('{ "nome": ').errori[0].messaggio, /non è un JSON valido/);
assert.match(checkImport(json([VALID, VALID])).errori[0].messaggio, /un solo mostro/);
assert.match(checkImport(json({ ...VALID, azioni: '' })).errori[0].messaggio, /Azioni: campo obbligatorio mancante/);
console.log('[import] errors in Italian field by field (missing, numbers, GS against PE and bonus, unknown key), no draft.');

// Dangerous HTML: scripts, links, images, attributes and events taken away and said; never in the sheet.
const dangerous = {
  ...VALID,
  descrizione: 'Prima<script>alert(1)</script> riga<br><br><img src=x onerror="alert(2)">Seconda <a href="javascript:alert(3)">riga</a>',
  tratti: '<strong onclick="x()">Tratto.</strong> Testo <iframe src="//male"></iframe><style>body{}</style>pulito &lt;b&gt;.',
  storia: '<p>Paragrafo</p><!-- nascosto --><em class="x">ok</em>',
};
result = checkImport(json(dangerous));
assert.deepEqual(result.errori, []);
assert.deepEqual(result.avvisi.map(issue => issue.campo).sort(), ['descrizione', 'storia', 'tratti']);
assert.ok(result.avvisi.every(issue => /HTML non ammesso rimosso/.test(issue.messaggio)));
const clean = draftToMonster(result.draft, result.id);
const everything = [clean.descrizione, clean.tratti, clean.storia].join(' ');
assert.doesNotMatch(everything, /<(?!\/?(?:strong|em|br)>)/, 'only <strong>, <em> and <br> are left');
assert.doesNotMatch(everything, /script|onerror|onclick|javascript|iframe|alert|href|class=/);
assert.equal(clean.descrizione, 'Prima riga<br><br>Seconda riga');
assert.equal(htmlToMarks('a<br>b<br><br><strong>c</strong> <em>d</em>').text, 'a\nb\n\n**c** *d*');
assert.equal(richHtml('**a** & *b* <c>'), '<strong>a</strong> &amp; <em>b</em> &lt;c&gt;');
console.log('[import] dangerous HTML removed and listed: scripts, links, images, frames, styles, attributes, comments.');

// Notices that do not block: initiative, passive Perception and saving throws that disagree are computed again.
result = checkImport(json({ ...VALID, iniziativa: '+5 (15)', sensi: 'Percezione passiva 20', tiri_salvezza: 'For +9' }));
assert.deepEqual(result.errori, []);
assert.deepEqual(result.avvisi.map(issue => issue.campo).sort(), ['iniziativa', 'sensi', 'tiri_salvezza']);

// «Sovrascrivi»: the summary of what changes.
const changed = checkImport(json({ ...VALID, punti_ferita: '105 (11d10 + 44)', tana: 'Una cripta.' })).draft;
assert.deepEqual(draftChanges(draft, changed).map(change => change.campo), ['Punti ferita', 'Dadi vita', 'Tana']);
assert.deepEqual(draftChanges(draft, draft), []);
console.log('[import] notices for computed numbers; the overwrite summary lists only the changed fields.');

// The old cards: the same sheet, the same keys, no new section, no hidden list, no picture.
const old = { ...EMPTY_DRAFT, nome: 'Vecchia creatura', azioni: [{ nome: 'Morso', testo: 'Tiro per colpire in mischia: +4. Colpito: 5 danni, anche *asterischi* restano.' }], descrizione: 'Testo **com’era**.' };
const oldSheet = draftToMonster(old, 'homebrew-vecchia');
const OLD_KEYS = ['id', 'nome', 'tipo', 'taglia', 'allineamento', 'sottotitolo_fonte', 'grado_sfida', 'px', 'gs_num', 'classe_armatura', 'punti_ferita', 'velocita', 'forza', 'destrezza', 'costituzione', 'intelligenza', 'saggezza', 'carisma', 'tiri_salvezza', 'abilita', 'vulnerabilita', 'resistenze', 'immunita_danni', 'immunita_condizioni', 'immunita', 'iniziativa', 'bonus_competenza', 'azioni_bonus', 'sensi', 'linguaggi', 'tratti', 'azioni', 'reazioni', 'azioni_leggendarie', 'descrizione', 'habitat', 'edizione'];
assert.deepEqual(Object.keys(oldSheet), OLD_KEYS);
assert.equal(oldSheet.azioni, '<strong>Morso.</strong> <em>Tiro per colpire in mischia:</em> +4. <em>Colpito:</em> 5 danni, anche *asterischi* restano.');
assert.equal(oldSheet.descrizione, 'Testo **com’era**.');
assert.equal(publicSheet(oldSheet), oldSheet);

// The public form (parseDraft) never keeps the new fields; the admin check does, with its own rules.
const proposed = parseDraft({ ...old, storia: 'Inventata', sezioni_nascoste: ['azioni'], immagine: { v: 'a'.repeat(16), w: 10, h: 10 }, testo_ricco: true });
assert.ok(proposed.ok);
for (const key of ['storia', 'sezioni_nascoste', 'immagine', 'testo_ricco']) assert.equal(key in proposed.draft, false, key);
assert.equal(parseEditorialExtras({ immagine: { v: 'a'.repeat(16), w: 10, h: 10 } }).ok, false, 'a picture needs its alternative text');
assert.match(parseEditorialExtras({ immagine: { v: 'a'.repeat(16), w: 10, h: 10 } }).error, /testo alternativo/);
assert.equal(parseEditorialExtras({ immagine: { v: '../x', w: 10, h: 10 }, immagine_alt: 'x' }).ok, false);
assert.equal(parseEditorialExtras({ sezioni_nascoste: ['caratteristiche'] }).ok, false);
assert.equal(parseEditorialExtras({ storia: '<script>' }).ok, false);
assert.ok(parseDraft({ ...old, descrizione: 'x'.repeat(700) }, { editorial: true }).ok);
assert.equal(parseDraft({ ...old, descrizione: 'x'.repeat(700) }).ok, false, 'the public form keeps its 600 characters');
console.log('[import] old cards unchanged (keys, asterisks as written); the public form cannot set the new fields.');

// The sheet component: the order after the legendary actions, «Nascosta al pubblico» only in the previews,
// nothing new on a sheet without the new fields.
const { MonsterSheetBody } = require(path.join(root, 'components/monster-sheet.tsx'));
const render = (monster, props = {}) => renderToStaticMarkup(React.createElement(MonsterSheetBody, { monster: { ...monster, fonte_scheda: 'Homebrew' }, legacy: false, descriptionFirst: true, ...props }));
let html = render(sheet, { hiddenSections: sheet.sezioni_nascoste });
const order = ['>Azioni<', '>Storia e leggenda<', '>Tattiche<', '>Agganci per l’avventura<'].map(title => html.indexOf(title));
assert.ok(order.every(index => index > 0) && order.every((index, i) => !i || index > order[i - 1]), `order ${order}`);
assert.match(html, /Agganci per l’avventura<span[^>]*data-hidden-section="">Nascosta al pubblico/);
assert.match(html, /data-condition|ref-pill|href="\/manuale\/condizioni/, 'conditions become pills');
html = render(shown);
assert.doesNotMatch(html, /Agganci|Un mercante|Nascosta al pubblico/);
assert.match(html, /Storia e leggenda/);
const plain = render(oldSheet);
assert.doesNotMatch(plain, /data-section=|data-hidden-section|data-monster-picture|Storia e leggenda/);
console.log('[import] sheet: five sections after the legendary actions in order, condition pills, «Nascosta al pubblico» only in previews.');

// The picture: three WebP sizes (480, 800, 1200 px wide), each under 150 KB, from a large noisy JPG.
(async () => {
  const sharp = require('sharp');
  const width = 2400, height = 1600;
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761 >>> 7) & 255;
  const jpg = await sharp(noise, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const { makePictureFiles, PICTURE_MAX_BYTES } = require(path.join(root, 'lib/monster-picture-server.ts'));
  const made = await makePictureFiles(jpg);
  assert.ok(made.ok, made.error);
  assert.match(made.v, /^[a-f0-9]{16}$/);
  // Pure noise, the worst case: the widths may come down a little to stay under 150 KB, never above 480/800/1200.
  assert.deepEqual(made.files.map(file => file.size), ['s', 'm', 'l']);
  assert.ok(made.files.every(file => file.w <= { s: 480, m: 800, l: 1200 }[file.size] && Math.abs(file.w / file.h - 1.5) < 0.01));
  // A photo-like picture keeps the three widths.
  const photo = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#6B4A2B' } })
    .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600"><defs><radialGradient id="g"><stop offset="0" stop-color="#E0A21A"/><stop offset="1" stop-color="#2B2118"/></radialGradient></defs><rect width="2400" height="1600" fill="url(#g)"/><circle cx="1200" cy="800" r="500" fill="#7A1F2B"/></svg>'), top: 0, left: 0 }])
    .jpeg({ quality: 92 }).toBuffer();
  const photoMade = await makePictureFiles(photo);
  assert.deepEqual(photoMade.files.map(file => [file.size, file.w, file.h]), [['s', 480, 320], ['m', 800, 533], ['l', 1200, 800]]);
  for (const file of made.files) {
    assert.ok(file.data.length <= PICTURE_MAX_BYTES, `${file.size}: ${file.data.length} bytes`);
    assert.equal(file.data.subarray(0, 4).toString(), 'RIFF');
    assert.equal(file.data.subarray(8, 12).toString(), 'WEBP');
  }
  // A small picture is never enlarged; a file that is not JPG or PNG is refused.
  const small = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#7A1F2B' } }).png().toBuffer();
  const smallMade = await makePictureFiles(small);
  assert.deepEqual(smallMade.files.map(file => file.w), [480, 600, 600]);
  const gif = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#000' } }).gif().toBuffer();
  assert.equal((await makePictureFiles(gif)).ok, false);
  assert.equal((await makePictureFiles(Buffer.from('not an image'))).ok, false);
  console.log(`[import] picture: WebP 480/800/1200 px, ${made.files.map(file => Math.round(file.data.length / 1024) + ' KB').join(' / ')} (≤ 150 KB), never enlarged, only JPG or PNG.`);
})().catch(error => { console.error(error); process.exit(1); });
// lib/public-sheet.ts keeps its own list of the sections: the same as lib/homebrew-types.ts.
assert.match(require('node:fs').readFileSync(path.join(root, 'lib/public-sheet.ts'), 'utf8'), new RegExp(JSON.stringify(HIDEABLE_SECTIONS).slice(1, -1).replace(/"/g, '"').replace(/,/g, ', ')));
