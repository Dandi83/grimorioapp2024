// Classi 2024: every text of lib/data/srd-classes-5.2.1-it.json against the «Classi» entries of the
// 2024 manual. Each manual block keeps its sha256 fingerprint (sourceHash, characters of the PDF), and
// the class data use exactly the characters of the blocks they come from: only the hyphens of the
// words rejoined at a line end (lib/data/classes-repairs-2024.json) are missing.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const manual = require('../lib/data/srd-manual-5.2.1-it.json');
const data = require('../lib/data/srd-classes-5.2.1-it.json');
const repairs = require('../lib/data/classes-repairs-2024.json');

const chars = text => {
  const counts = new Map();
  for (const c of text.replace(/\xad/g, '').normalize('NFKC')) {
    if (/\s/u.test(c)) continue;
    const key = c.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};
const proof = text => {
  const list = [];
  for (const [c, n] of chars(text)) for (let i = 0; i < n; i++) list.push(c);
  return crypto.createHash('sha256').update(list.sort().join('')).digest('hex');
};
/** Characters of `a` minus those of `b`, as a string (empty when equal). */
const minus = (a, b) => {
  const out = [];
  for (const [c, n] of a) { const d = n - (b.get(c) ?? 0); for (let i = 0; i < d; i++) out.push(c); }
  return out.join('');
};
const add = (...texts) => chars(texts.join(' '));

const IDS = ['barbaro', 'bardo', 'chierico', 'druido', 'guerriero', 'ladro', 'mago', 'monaco', 'paladino', 'ranger', 'stregone', 'warlock'];
assert.equal(data.sourceSha256, manual.sourceSha256);
assert.deepEqual(data.classi.map(c => c.id), IDS, 'the twelve classes of the SRD 5.2.1, in order');

const blockText = items => items.flatMap(item => {
  if (item.tipo === 'p') return [item.testo];
  if (item.tipo === 'tabella') return [item.titolo, ...item.colonne, ...item.righe.flat()];
  return [item.titolo, ...item.paragrafi.map(p => p.testo)];
});

let checked = 0;
for (const card of data.classi) {
  const entry = manual.entries.find(e => e.id === `personaggi-${card.id}`);
  assert.ok(entry, card.id);
  const blocks = entry.blocks;
  // The manual blocks are still those of the PDF.
  for (const block of blocks) assert.equal(proof(block.text), block.sourceHash, `${card.id}: blocco del manuale cambiato`);

  // Paragraphs and headings: exactly the characters of their blocks.
  const used = new Set();
  const paragraph = (item, where) => {
    assert.ok(item.blocchi?.length, `${card.id} ${where}: blocchi di origine`);
    const source = item.blocchi.map(i => { used.add(i); return blocks[i].text; }).join(' ');
    assert.equal(minus(chars(item.testo), chars(source)) + minus(chars(source), chars(item.testo)), '', `${card.id} ${where}: «${item.testo.slice(0, 60)}»`);
    if (item.etichetta) assert.ok(item.testo.startsWith(item.etichetta), `${card.id} ${where}: etichetta`);
    checked++;
  };
  const heading = (idx, text, where) => {
    used.add(idx);
    assert.equal(blocks[idx].kind, 'heading', `${card.id} ${where}`);
    assert.equal(proof(text), blocks[idx].sourceHash, `${card.id} ${where}: «${text}»`);
    checked++;
  };
  // Tables of one block: the characters of the block minus only the hyphens of rejoined words.
  const tableBlocks = new Map();
  const table = (idx, texts) => { used.add(idx); tableBlocks.set(idx, [...(tableBlocks.get(idx) ?? []), ...texts]); };
  const content = (items, where) => items.forEach((item, n) => {
    if (item.tipo === 'p') paragraph(item, `${where} §${n + 1}`);
    else table(item.blocco, blockText([item]));
  });

  table(0, [card.tratti.titolo, ...card.tratti.voci.flatMap(v => [v.etichetta, v.valore])]);
  const t = card.tabella;
  assert.deepEqual(t.righe.map(r => Number(r[0])), Array.from({ length: 20 }, (_, i) => i + 1), `${card.id}: livelli 1–20`);
  for (const row of t.righe) assert.equal(row.length, t.colonne.length, `${card.id}: celle della riga ${row[0]}`);
  // The title is printed in the first block (alone, when the table continues in a second block);
  // for four classes it was transcribed at the end of the «Tratti» block (titoloBlocco 0).
  table(t.titoloBlocco ?? t.blocchi[0], [t.titolo]);
  table(t.blocchi.at(-1), [...(t.gruppo ? [t.gruppo.testo] : []), ...t.colonne, ...t.righe.flat()]);

  heading(card.diventare.blocco, card.diventare.titolo, 'Diventare');
  for (const part of card.diventare.parti) { heading(part.blocco, part.titolo, part.titolo); content(part.contenuto, part.titolo); }
  heading(card.introPrivilegi.blocco, card.introPrivilegi.titolo, 'Privilegi di classe');
  content(card.introPrivilegi.contenuto, 'introduzione');
  for (const feature of card.privilegi) {
    heading(feature.blocco, `Livello ${feature.livello}: ${feature.titolo}`, feature.titolo);
    content(feature.contenuto, feature.titolo);
  }
  for (const option of card.opzioni) {
    heading(option.blocco, option.titolo, option.titolo);
    content(option.intro, option.titolo);
    for (const voce of option.voci) { heading(voce.blocco, voce.titolo, voce.titolo); content(voce.contenuto, voce.titolo); }
  }
  if (card.incantesimi) {
    const list = card.incantesimi;
    heading(list.blocco, list.titolo, list.titolo);
    content(list.intro, list.titolo);
    assert.ok(list.livelli.length >= 5 && list.livelli.every(level => level.voci.length > 0), `${card.id}: livelli della lista`);
    assert.deepEqual(list.livelli.map(l => l.livello), [...new Set(list.livelli.map(l => l.livello))].sort((a, b) => a - b), `${card.id}: livelli in ordine`);
    for (const level of list.livelli) {
      table(level.blocchi[0], [level.titolo]);
      for (const v of level.voci) table(v.blocco, [v.nome, v.scuola, v.speciale]);
    }
    // The header «Incantesimo Scuola Speciale» printed before each level and at each column/page start.
    for (const i of new Set(list.livelli.flatMap(l => l.blocchi))) {
      const headers = blocks[i].text.split('\n').filter(line => /^\s*Incantesimo\s+Scuola\s+Speciale\s*$/.test(line)).length;
      table(i, Array(headers).fill('Incantesimo Scuola Speciale'));
    }
  }
  const sub = card.sottoclasse;
  heading(sub.blocco, sub.titolo, 'sottoclasse');
  assert.ok(sub.titolo.endsWith(`: ${sub.nome}`));
  paragraph({ testo: sub.motto.testo, blocchi: sub.motto.blocchi }, 'motto');
  content(sub.descrizione, 'descrizione della sottoclasse');
  for (const feature of sub.privilegi) {
    heading(feature.blocco, `Livello ${feature.livello}: ${feature.titolo}`, feature.titolo);
    content(feature.contenuto, feature.titolo);
  }

  const hyphens = repairs.sillabazioni.filter(r => r.classe === card.id && r.dove !== 'testo' && r.da.includes('-')).length;
  let removed = '';
  for (const [i, texts] of tableBlocks) {
    const out = add(...texts), source = chars(blocks[i].text);
    assert.equal(minus(out, source), '', `${card.id}: caratteri in più nella tabella del blocco ${i}`);
    removed += minus(source, out);
  }
  assert.equal(removed, '-'.repeat(hyphens), `${card.id}: nelle tabelle mancano solo i trattini delle sillabazioni documentate`);

  // Every block of the entry is used, so nothing printed is left out.
  assert.deepEqual(blocks.map((_, i) => i).filter(i => !used.has(i)), [], `${card.id}: blocchi non usati`);

  // Every name in the «Privilegi di classe» column has a feature with its text, at that level or before.
  const known = name => name.toLowerCase();
  for (const row of t.righe) {
    const level = Number(row[0]);
    let rest = known(row[2]);
    const titles = [...card.privilegi, ...sub.privilegi].filter(f => f.livello <= level).map(f => known(f.titolo)).sort((a, b) => b.length - a.length);
    for (const title of [...titles, 'privilegio della sottoclasse', known(`sottoclasse ${card.id === 'stregone' ? 'dello' : 'del'} ${card.id}`)]) {
      rest = rest.split(title).join('|');
    }
    rest = rest.replace(/\([^)]*\)/g, '').replace(/\||,|\be\b|—/g, '').trim();
    const allowed = { 'ladro:20': 'pietra della buona fortuna' }[`${card.id}:${level}`];
    assert.equal(rest, allowed ?? '', `${card.id} livello ${level}: «${row[2]}» senza testo`);
  }
  assert.ok(card.livelliSottoclasse.includes(card.livelloSottoclasse), `${card.id}: livello della sottoclasse`);
}
assert.ok(repairs.sillabazioni.every(r => r.motivo && r.pagina && r.da && r.a));
console.log(`Classi 2024: 12 classes, ${checked} texts and every table checked against the fingerprints of the 2024 manual, levels 1–20, no feature of the tables without text.`);

// Offline: the list and the twelve sheets are public pages of the service worker.
const fs = require('node:fs');
const sw = fs.readFileSync('lib/sw/service-worker.js', 'utf8');
const publicPage = new RegExp(sw.match(/const PUBLIC_PAGE = \/(.*)\/;/)[1]);
for (const page of ['/classi', ...IDS.map(id => `/classi/${id}`)]) assert.ok(publicPage.test(page), page);
assert.ok(!publicPage.test('/classi/a/b'));
// Compendio: «Personaggi» with the Classi tile above «Regole e oggetti»; no empty tiles for what comes later.
const compendio = fs.readFileSync('app/compendio/page.tsx', 'utf8');
assert.ok(compendio.indexOf('{ label: "Personaggi"') < compendio.indexOf('{ label: "Regole e oggetti"'));
assert.ok(compendio.includes('{ href: "/classi", title: "Classi", text: "Barbaro, Bardo, Chierico…", Icon: Shield, square: true, sections: ["classi"] }'));
assert.ok(!/Specie|Background|Talenti/.test(compendio.replace(/\/\/.*$/gm, '')));
console.log('Classi pages: offline list and sheets, Compendio group «Personaggi».');
