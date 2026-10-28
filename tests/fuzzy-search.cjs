// Search tolerant of accents, capitals and typos (lib/fuzzy-search.ts): normalization, distance, order, «Forse
// cercavi», on the real names of the catalog, and the time of one keystroke on the whole index.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const mod = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(relative), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  new Function('module', 'exports', 'require', code)(mod, mod.exports, require);
  return mod.exports;
}
const {normalizeSearch, allowedTypos, typoDistance, matchName, searchRows, searchList, didYouMean, wordStem, MATCH} = load('lib/fuzzy-search.ts');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

// Normalization: case, accents, apostrophes and dashes.
assert.equal(normalizeSearch('Palla di Fuoco'), 'palla di fuoco');
assert.equal(normalizeSearch('Evocazióne'), 'evocazione');
assert.equal(normalizeSearch('  Dell’Aria   e  l\'ACQUA '), 'dell aria e l acqua');
assert.equal(normalizeSearch('Mezzo-Orco'), 'mezzo orco');
assert.equal(normalizeSearch('Antipatia/Simpatia'), 'antipatia simpatia');

// Distance: Damerau-Levenshtein, two swapped letters are one typo; tolerance by length.
assert.equal(typoDistance('fuoco', 'fuoco'), 0);
assert.equal(typoDistance('foco', 'fuoco'), 1);
assert.equal(typoDistance('plla', 'palla'), 1);
assert.equal(typoDistance('fuoco', 'fouco'), 1, 'swapped letters are one typo');
assert.equal(typoDistance('incantao', 'incantato'), 1);
assert.equal(typoDistance('drago', 'mago'), 2);
assert.equal(typoDistance('abcdefgh', 'zzzzzzzz', 2), 3, 'stops over the maximum');
assert.deepEqual([3, 4, 7, 8, 12].map(allowedTypos), [0, 1, 1, 2, 2]);

// Matches: exact, starts with, contains, approximate.
assert.deepEqual(matchName('Palla di fuoco', 'PALLA DI FUÓCO'), {kind: MATCH.exact, typos: 0, start: 0});
assert.equal(matchName('Palla di fuoco', 'palla d').kind, MATCH.start);
assert.equal(matchName('Palla di fuoco', 'fuoco').kind, MATCH.contains);
assert.equal(matchName('Forma di drago', 'ago', {wordStart: true}), null, 'the Home search: only at the start of a word');
assert.equal(matchName('Forma di drago', 'ago').kind, MATCH.contains, 'the lists: anywhere, as before');
for (const [name, query] of [['Palla di fuoco', 'palla di foco'], ['Palla di fuoco', 'plla di fuoco'], ['Dardo incantato', 'dardo incantao'], ['Beholder', 'beholdr'], ['Goblin', 'goblinn'], ['Palla di fuoco', 'pall di fouco']])
  assert.equal(matchName(name, query)?.kind, MATCH.approximate, `${query} → ${name}`);
assert.equal(matchName('Mago', 'lag'), null, 'no tolerance under 4 letters');
assert.equal(matchName('Palla di fuoco', 'palla da fuoco'), null, '«di» → «da» is a typo in a 2-letter word: not tolerated');
assert.equal(matchName('Dardo incantato', 'dardo incxyzao'), null, 'more typos than allowed');

// Order: exact, starts with, contains; singular and plural are the same word; the list order inside each kind.
const names = ['Scudo della fede', 'Scudo', 'Muro di scudi', 'Scudi', 'Sfera di fuoco', 'Scusa'];
assert.deepEqual(searchRows(names, 'scudo', n => n), ['Scudo', 'Scudo della fede', 'Scudi', 'Muro di scudi'], '«Scusa» is never shown: there are exact results');
assert.deepEqual(searchRows(names, 'scudi', n => n), ['Scudi', 'Scudo della fede', 'Scudo', 'Muro di scudi'], 'same kind: the order of the list');
// Singular and plural (only the final vowel, with the h of -chi/-ghi and the i of -ia/-ie).
assert.deepEqual(['palla', 'palle', 'fuoco', 'fuochi', 'magia', 'magie', 'di'].map(wordStem), ['pall', 'pall', 'fuoc', 'fuoc', 'mag', 'mag', 'di']);
assert.equal(matchName('Bacchetta delle palle di fuoco', 'palla').kind, MATCH.contains, '«palla» = «palle»: exact');
assert.equal(matchName('Bacchetta delle palle di fuoco', 'palla', {wordStart: true}).length, 5);
assert.equal(matchName('Dardi di fuochi', 'fuoco').kind, MATCH.contains);
assert.equal(matchName('Palla di fuoco', 'palle di fuoco').kind, MATCH.start);

// No noise while typing «palla» (28 October 2026): the right names only, never «Allarme» («alla»), «Interdizione
// alla morte», «Parlare con…» («parla») or «Pala»; the similar ones only when nothing is found exactly.
const noisy = ['Allarme', 'Interdizione alla morte', 'Parlare con gli animali', 'Parlare con i morti', 'Parlare con i vegetali', 'Pala', 'Palla di fuoco', 'Palla di fuoco ritardata', 'Bacchetta delle palle di fuoco'];
for (const settled of [false, true]) {
  const found = searchList(noisy, 'palla', n => n, {settled});
  assert.deepEqual(found.exact, ['Palla di fuoco', 'Palla di fuoco ritardata', 'Bacchetta delle palle di fuoco'], `settled ${settled}`);
  assert.deepEqual(found.approximate, [], 'no similar names next to the right ones');
  assert.equal(found.suggestion, null);
}
// A typo needs the same first letter, a name word of 4 letters at least and not a common short word.
assert.equal(matchName('Allarme', 'pallarme'), null, 'another first letter: never similar');
assert.equal(matchName('Interdizione alla morte', 'palla'), null);
assert.equal(matchName('Pala', 'palla').kind, MATCH.approximate, 'alone, «Pala» is a similar name');
assert.equal(matchName('Fuoco della vita', 'fuoco dela'), null, 'no typos on «della»');
// The last word being typed: only the start of a name word; after the pause (or «Cerca») typos too.
assert.equal(matchName('Palla di fuoco', 'palla di foco', {settled: false}), null);
assert.equal(matchName('Palla di fuoco', 'palla di foco', {settled: true}).kind, MATCH.approximate);
assert.equal(matchName('Palla di fuoco', 'plla di fuo', {settled: false}).kind, MATCH.approximate, 'the complete words may have typos');
assert.deepEqual(searchRows(names, '', n => n), names, 'no query: the list as it is');
// «Forse cercavi»: only when nothing matches exactly.
assert.equal(didYouMean(['Palla di fuoco', 'Palla di neve'], 'palla di foco', n => n), 'Palla di fuoco');
assert.equal(didYouMean(['Palla di fuoco', 'Palla di neve'], 'palla di', n => n), null);
assert.equal(didYouMean(['Palla di fuoco'], 'zzzz', n => n), null);

// The whole catalog of the browser: spells of both editions and creatures; «palla di foco» finds Palla di fuoco in both.
const spells2024 = [...new Set([...read('lib/data/incantesimi_2024.json').map(s => s.nome_italiano), ...read('lib/data/srd-italiano-5.2.1.json').spells.map(s => s.appName)])];
const spells2014 = read('lib/data/srd-spells-5.1-it.json').records.map(r => r.spell.nome_italiano);
const monsters = [...read('lib/data/srd-monsters-5.2.1-it.json').records, ...read('lib/data/srd-monsters-5.1-it.json').records].map(r => r.monster?.nome).filter(Boolean);
for (const list of [spells2024, spells2014]) {
  const found = searchRows(list, 'palla di foco', n => n);
  assert.equal(normalizeSearch(found[0]), 'palla di fuoco', found.slice(0, 3).join());
  assert.equal(normalizeSearch(didYouMean(list, 'palla di foco', n => n)), 'palla di fuoco');
  assert.equal(normalizeSearch(searchRows(list, 'dardo incantao', n => n)[0]), 'dardo incantato');
}
// Time of one keystroke on the whole index (Home: spells + creatures + the rest), every prefix of a mistyped query.
const index = [...spells2024, ...spells2014, ...monsters, ...read('lib/data/srd-magic-items-5.2.1-it.json').oggetti.map(i => i.nome)];
assert.ok(index.length > 1000, `${index.length} names`);
const typed = 'palla di foco';
searchRows(index, 'warm up', n => n);
const times = [];
for (let round = 0; round < 5; round++)
  for (let i = 1; i <= typed.length; i++) {
    const start = process.hrtime.bigint();
    searchRows(index, typed.slice(0, i), n => n, {wordStart: true});
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)], worst = times[times.length - 1];
assert.ok(median < 16, `median ${median.toFixed(2)} ms per keystroke`);
console.log(`Fuzzy search: normalization, Damerau-Levenshtein, order and «Forse cercavi» passed; ${index.length} names, ${median.toFixed(2)} ms per keystroke (median), ${worst.toFixed(2)} ms the slowest.`);
