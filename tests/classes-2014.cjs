// Classi 2014: lib/data/srd-classes-5.1-it.json against the SRD 5.1 PDF. Each block carries the
// fingerprint of the characters of the PDF lines it comes from (fonte); the data must use exactly those
// characters (only the hyphen of a word rejoined at a line end is missing, classes-repairs-2014.json).
// scripts/transcribe-srd51-classes.py also checks, with the PDF, that every line of pp. 8-59 is used.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const data = require('../lib/data/srd-classes-5.1-it.json');
const repairs = require('../lib/data/classes-repairs-2014.json');
const data2024 = require('../lib/data/srd-classes-5.2.1-it.json');

const proof = text => {
  const list = [];
  for (const c of text.replace(/\xad/g, '').normalize('NFKC')) if (!/\s/u.test(c)) list.push(c.toLowerCase());
  return crypto.createHash('sha256').update(list.sort().join('')).digest('hex');
};

const IDS = ['barbaro', 'bardo', 'chierico', 'druido', 'guerriero', 'ladro', 'mago', 'monaco', 'paladino', 'ranger', 'stregone', 'warlock'];
assert.equal(data.sourceSha256, '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7');
assert.deepEqual(data.classi.map(c => c.id), IDS, 'the twelve classes of the SRD 5.1, in order');
assert.deepEqual(data.classi.map(c => c.nome), data2024.classi.map(c => c.nome), 'same names as 2024');

let checked = 0;
const hyphens = (cls, page) => repairs.sillabazioni.filter(r => r.classe === cls && r.pagina === page && r.dove !== 'testo').length;
const same = (cls, text, fonte, where, page) => {
  const ok = [0, hyphens(cls, page)].some(n => proof(text + '-'.repeat(n)) === fonte);
  assert.ok(ok, `${cls} ${where}: «${text.slice(0, 70)}»`);
  checked++;
};
const blocks = (cls, list, where) => list.forEach((block, i) => {
  const at = `${where} §${i + 1}`;
  if (block.tipo === 'p' || block.tipo === 'h') same(cls, block.testo, block.fonte, at, block.pagina);
  else if (block.tipo === 'tabella') {
    same(cls, [block.titolo, block.gruppo?.testo ?? '', ...block.colonne, ...block.righe.flat()].join(' '), block.fonte, at, block.pagina);
    for (const row of block.righe) assert.equal(row.length, block.colonne.length, `${cls} ${at}: celle`);
  } else same(cls, [block.titolo, ...block.paragrafi.map(p => p.testo)].join(' '), block.fonte, at, block.pagina);
});

for (const card of data.classi) {
  const cls = card.id;
  // Traits: the three groups as printed («Punti ferita», «Competenze», «Equipaggiamento»), labels with their colon.
  const traits = card.tratti.voci.map(v => (v.etichetta === 'Equipaggiamento' ? v.valore : `${v.etichetta}: ${v.valore}`));
  same(cls, [...card.tratti.gruppi, ...traits].join(' '), card.tratti.fonte, 'tratti', card.pagina);
  for (const key of ['Armature', 'Armi', 'Strumenti', 'Tiri Salvezza', 'Abilità', 'Equipaggiamento']) {
    assert.ok(card.tratti.voci.some(v => v.etichetta === key), `${cls}: tratto ${key}`);
  }
  assert.ok(card.tratti.voci.some(v => /^Dadi [Vv]ita$/.test(v.etichetta) && /^1d\d+ per ogni livello/.test(v.valore)), `${cls}: Dadi Vita`);

  // The class table: its title is the class name, levels 1°–20°, every row complete.
  const t = card.tabella;
  same(cls, [t.titolo, t.gruppo?.testo ?? '', ...t.colonne, ...t.righe.flat()].join(' '), t.fonte, 'tabella', t.pagina);
  assert.equal(t.titolo, card.nome);
  assert.deepEqual(t.righe.map(r => r[0]), Array.from({ length: 20 }, (_, i) => `${i + 1}°`), `${cls}: livelli 1–20`);
  for (const row of t.righe) assert.equal(row.length, t.colonne.length, `${cls}: celle della riga ${row[0]}`);
  if (t.gruppo) assert.deepEqual(t.colonne.slice(t.gruppo.da, t.gruppo.a + 1), Array.from({ length: t.gruppo.a - t.gruppo.da + 1 }, (_, i) => `${i + 1}°`), `${cls}: colonne degli slot`);

  blocks(cls, card.introPrivilegi.contenuto, 'introduzione');
  for (const feature of card.privilegi) {
    same(cls, feature.titolo, feature.fonte, feature.titolo, feature.pagina);
    blocks(cls, feature.contenuto, feature.titolo);
  }
  for (const option of card.opzioni) {
    same(cls, option.titolo, option.fonte, option.titolo, option.voci[0].pagina);
    blocks(cls, option.intro, option.titolo);
    for (const voce of option.voci) { same(cls, voce.titolo, voce.fonte, voce.titolo, voce.pagina); blocks(cls, voce.contenuto, voce.titolo); }
  }
  const sub = card.sottoclasse;
  same(cls, sub.nome, sub.fonte, 'sottoclasse', sub.pagina);
  blocks(cls, sub.descrizione, 'descrizione della sottoclasse');
  for (const feature of sub.privilegi) {
    same(cls, feature.titolo, feature.fonte, feature.titolo, feature.pagina);
    blocks(cls, feature.contenuto, feature.titolo);
    // The level of a subclass feature is the one printed at the start of its text.
    const first = feature.contenuto.find(b => b.tipo === 'p');
    assert.ok(new RegExp(`\\b(?:[Aa]l|[Dd]al|[Aa]ll'|[Dd]all')\\s?${feature.livello}° livello`).test(first.testo), `${cls} ${feature.titolo}: livello ${feature.livello} stampato`);
  }
  assert.ok(sub.privilegi.length >= 3, `${cls}: privilegi della sottoclasse`);
  assert.deepEqual(card.livelliSottoclasse, [...new Set(sub.privilegi.map(f => f.livello))].sort((a, b) => a - b));

  // No feature missing: every name of the «Privilegi» column has a feature with its text (at that
  // level or before), or refers to the subclass («Privilegio dell'Archetipo Marziale»).
  const column = t.colonne.findIndex(name => name.startsWith('Privilegi'));
  const titles = [...card.privilegi, ...sub.privilegi].map(f => ({ livello: f.livello, titolo: f.titolo.toLowerCase() }));
  for (const row of t.righe) {
    const level = Number.parseInt(row[0], 10);
    let rest = row[column].toLowerCase().replace(/\([^)]*\)/g, '');
    for (const { titolo } of titles.filter(f => f.livello <= level).sort((a, b) => b.titolo.length - a.titolo.length)) rest = rest.split(titolo).join('|');
    // «Forma Selvatica Migliorata», «Aure Migliorate»: improvements printed without a heading of their
    // own, described in the text of the base feature («Al 18° livello, il raggio di queste aure…»).
    rest = rest.split(',').map(part => part.replace(/\|/g, '').trim())
      .filter(part => part && part !== '—' && !/^privilegi[oa]? d/.test(part) && !/^migliorat[oaie]$/.test(part) && !(cls === 'paladino' && part === 'aure migliorate')).join(', ');
    assert.equal(rest, '', `${cls} livello ${level}: «${row[column]}» senza testo`);
  }
  // Every feature of the class has the level of the first row naming it.
  for (const feature of card.privilegi) {
    const first = t.righe.find(row => row[column].toLowerCase().replace(/\([^)]*\)/g, '').split(',').some(name => name.trim() === feature.titolo.toLowerCase()));
    assert.ok(first, `${cls}: «${feature.titolo}» nella tabella`);
    assert.equal(Number.parseInt(first[0], 10), feature.livello, `${cls}: livello di «${feature.titolo}»`);
  }
  assert.ok(card.privilegi.some(f => f.livello === card.livelloSottoclasse), `${cls}: livello della sottoclasse`);
}
assert.ok(repairs.sillabazioni.every(r => r.motivo && r.pagina && r.da && r.a));
console.log(`Classi 2014: 12 classes from the SRD 5.1, ${checked} texts and tables with the characters of the PDF, levels 1°–20°, every feature of the tables with its text, subclass levels as printed.`);
