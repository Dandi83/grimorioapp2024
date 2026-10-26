// «Schede SRD modificate» (lib/srd-modified.ts): the SRD cards whose text no longer matches their record, with the very
// comparison that decides the source box; the restore form sends only the fields that differ; the «SRD modificate»
// option of the «Provenienza» filter (lib/provenance.ts).
const assert = require('node:assert/strict');
const {modifiedSpell, modifiedMonster, spellSrdDifferences, srdModifiedCards, restoreEntries} = require('../lib/srd-modified.ts');
const {getLegacySpellSource} = require('../lib/srd-spells-2014.ts');
const {getSrdSource} = require('../lib/srd-descriptions.ts');
const {getSrdMonsterSource} = require('../lib/srd-monsters.ts');
const {repairSpellText} = require('../lib/spell-text-repairs.ts');
const {wordDiff} = require('../lib/word-diff.ts');
const {matchesProvenance, provenanceIds, PROVENANCE_OPTIONS, PROVENANCE_LABEL} = require('../lib/provenance.ts');
const legacySpells = require('../lib/data/srd-spells-5.1-it.json');
const srd2024 = require('../lib/data/srd-italiano-5.2.1.json');
const legacyMonsters = require('../lib/data/srd-monsters-5.1-it.json');
const monsters2024 = require('../lib/data/srd-monsters-5.2.1-it.json');

// Guida 2014: «tirare 1d4» in the card, «tirare un d4» in the SRD 5.1 PDF.
const guida = {...legacySpells.records.find(record => record.spell.id === 'guida-2014').spell};
assert.match(guida.descrizione, /tirare un d4/);
assert.equal(modifiedSpell(guida), undefined, 'the SRD text: not listed');
assert.ok(getLegacySpellSource(guida), 'and it has the box');
const edited = {...guida, descrizione: guida.descrizione.replace('tirare un d4', 'tirare 1d4')};
const item = modifiedSpell(edited);
assert.ok(item, '«1d4»: listed');
assert.equal(getLegacySpellSource(edited), undefined, 'and the box is gone: list and box agree');
assert.deepEqual([item.kind, item.id, item.edition, item.href, item.fields.map(field => field.field)], ['incantesimo', 'guida-2014', '2014', '/spell/guida-2014', ['descrizione']]);
assert.equal(item.fields[0].label, 'Descrizione');
assert.equal(item.fields[0].srd, guida.descrizione, 'the exact SRD value, byte for byte');
assert.equal(item.fields[0].current, edited.descrizione);
// The word diff: only «un d4» → «1d4» marked.
assert.deepEqual(item.fields[0].diff.filter(part => part.kind !== 'same'), [{kind: 'srd', text: 'un d4'}, {kind: 'attuale', text: '1d4'}]);
assert.equal(item.fields[0].diff.filter(part => part.kind !== 'attuale').map(part => part.text).join(''), guida.descrizione, 'the SRD line rebuilds the SRD text');
assert.equal(item.fields[0].diff.filter(part => part.kind !== 'srd').map(part => part.text).join(''), edited.descrizione, 'the current line rebuilds the current text');

// Approved display repairs never count (spell texts and the 2014 creature subtitle).
for (const id of Object.keys(require('../lib/data/spell-text-repairs-20261021.json').testi)) {
  const legacy = legacySpells.records.find(record => record.spell.id === id)?.spell;
  if (legacy) {
    const repaired = {...legacy, descrizione: repairSpellText(id, legacy.descrizione)};
    assert.equal(modifiedSpell(repaired), undefined, `${id}: repaired, not listed`);
    assert.ok(getLegacySpellSource(repaired), id);
    continue;
  }
  const record = srd2024.spells.find(spell => spell.id === id);
  const spell = {id, nome_italiano: record.sourceName, descrizione: repairSpellText(id, record.descrizione)};
  assert.notEqual(spell.descrizione, record.descrizione, `${id}: the repair changes the text`);
  assert.deepEqual(spellSrdDifferences(spell), [], `${id}: repaired, not listed`);
  assert.ok(getSrdSource(id, spell.descrizione), id);
}
const duergar = {...legacyMonsters.records.find(record => record.monster.id === 'duergar-2014').monster};
assert.equal(modifiedMonster({...duergar, sottotitolo_fonte: ''}), undefined, '2014 creature saved before the subtitle: not listed');
assert.ok(getSrdMonsterSource({...duergar, sottotitolo_fonte: ''}));
const lich = {...monsters2024.records.find(record => record.monster.id === 'lich').monster};
assert.equal(modifiedMonster(lich), undefined);
const editedLich = {...lich, classe_armatura: '18', azioni: `${lich.azioni} `};
const lichItem = modifiedMonster(editedLich);
assert.deepEqual([lichItem.kind, lichItem.edition, lichItem.href, lichItem.fields.map(field => field.field).sort()], ['mostro', '2024', '/mostro/lich', ['azioni', 'classe_armatura']]);
assert.equal(getSrdMonsterSource(editedLich), undefined, 'list and box agree');
// A card without an SRD record (added here) is never listed.
assert.equal(modifiedSpell({id: 'lampo-di-prova', nome_italiano: 'Lampo', descrizione: 'x'}), undefined);
assert.equal(modifiedMonster({id: 'beholder', nome: 'Beholder'}), undefined);
const list = srdModifiedCards([guida, edited, {id: 'lampo-di-prova', nome_italiano: 'Lampo', descrizione: 'x'}], [lich, editedLich]);
assert.deepEqual(list.map(card => `${card.kind}:${card.id}`), ['incantesimo:guida-2014', 'mostro:lich']);

// «Ripristina testo SRD»: only the fields that differ, with the exact SRD value; applied, the card matches again.
assert.deepEqual(restoreEntries(item), [['id', 'guida-2014'], ['descrizione', guida.descrizione]]);
const restored = {...edited, ...Object.fromEntries(restoreEntries(item).slice(1))};
assert.equal(modifiedSpell(restored), undefined);
assert.ok(getLegacySpellSource(restored));
const lichEntries = restoreEntries(lichItem);
assert.deepEqual(lichEntries.map(([field]) => field).sort(), ['azioni', 'classe_armatura', 'id']);
assert.equal(Object.fromEntries(lichEntries).azioni, lich.azioni);
const restoredLich = {...editedLich, ...Object.fromEntries(lichEntries.slice(1))};
assert.equal(modifiedMonster(restoredLich), undefined);
// The challenge rating restores «gs_num» with it: never sent on its own.
const gsItem = modifiedMonster({...lich, grado_sfida: '1', gs_num: 1});
assert.ok(gsItem.fields.some(field => field.field === 'gs_num'));
assert.ok(!restoreEntries(gsItem).some(([field]) => field === 'gs_num'));

// The filter: one option more, «SRD modificate»; those cards are in «Solo NO SRD» and not in «Solo SRD».
assert.equal(PROVENANCE_OPTIONS.at(-1), 'modificate');
assert.equal(PROVENANCE_LABEL.modificate, 'SRD modificate');
const cards = [
  {id: 'palla-di-fuoco', fonte_scheda: 'SRD 5.2.1'}, {id: 'guida-2014'}, {id: 'amicizia', fonte_scheda: 'Sintesi originale'},
  {id: 'lampo-di-prova', fonte_scheda: 'Aggiunta da te'}, {id: 'homebrew-x', homebrew: true},
];
const ids = provenanceIds(cards, ['guida-2014']);
const count = value => cards.filter(card => matchesProvenance(card, value, ids)).map(card => card.id);
assert.deepEqual(count('modificate'), ['guida-2014']);
assert.deepEqual(count('srd'), ['palla-di-fuoco']);
assert.deepEqual(count('nosrd'), ['guida-2014', 'amicizia', 'lampo-di-prova']);
assert.deepEqual(count('tutte').length, 5);
assert.deepEqual(count('modificate').length + count('srd').length + count('sintesi').length + count('aggiunte').length + 1, 5, 'every card in one group (homebrew aside)');
assert.deepEqual(provenanceIds(cards).modificate.size, 0, 'none by default');

// The word diff on its own.
assert.deepEqual(wordDiff('a b c', 'a b c'), [{kind: 'same', text: 'a b c'}]);
assert.deepEqual(wordDiff('', 'nuovo'), [{kind: 'attuale', text: 'nuovo'}]);
console.log('srd-modified: guida-2014 «1d4» listed, «un d4» not; repairs not counted; restore writes only the fields that differ; «SRD modificate» filter counts.');
