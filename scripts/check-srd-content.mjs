import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A missing/partial transcription must fail before this release can be built.
const data = JSON.parse(readFileSync(new URL("../lib/data/srd-italiano-5.2.1.json", import.meta.url), "utf8"));
assert.equal(data.spells.length, 340, "All 339 SRD spells and the preserved historical duplicate must have full source transcriptions");
assert.equal(new Set(data.spells.map(s => s.id)).size, 340);
assert.equal(new Set(data.spells.map(s => s.sourceName)).size, 339);
assert.equal(data.license, "CC-BY-4.0");
assert.ok(data.attribution.includes('Wizards of the Coast LLC'));
for (const spell of data.spells) {
  for (const field of ['livello', 'tempo_di_lancio', 'gittata', 'componenti', 'durata']) {
    assert.ok(spell[field]?.trim(), `${spell.id}: missing original metadata ${field}`);
  }
  assert.ok(spell.descrizione.length > 70, `${spell.id}: incomplete transcription`);
  assert.ok(spell.pages.length > 0 && spell.pages.every(p => p >= 121 && p <= 201));
  assert.ok(!spell.descrizione.includes("System Reference Document"), `${spell.id}: PDF footer leaked`);
  assert.ok(!spell.descrizione.includes("\u00ad"), `${spell.id}: unjoined line hyphen`);
  assert.ok(!spell.descrizione.includes('&#x27;'), `${spell.id}: apostrophes must render as Italian punctuation`);
  assert.equal((spell.descrizione.match(/<pre>/g) || []).length, (spell.descrizione.match(/<\/pre>/g) || []).length);
}
const byId = Object.fromEntries(data.spells.map(s => [s.id, s]));
const additions = [
  ['bacche-benefiche', 'Bacche benefiche'], ['bagliore-lunare', 'Bagliore lunare'],
  ['bagliore-solare', 'Bagliore solare'], ['dardo-di-fuoco', 'Dardo di fuoco'],
  ['fiotto-acido', 'Fiotto acido'], ['forme-animali', 'Forme animali'],
  ['guscio-anti-vita', 'Guscio anti-vita'], ['invisibilita-superiore', 'Invisibilità superiore'],
  ['levitazione', 'Levitazione'], ['muro-di-fuoco', 'Muro di fuoco'],
  ['palla-di-fuoco', 'Palla di fuoco'], ['palla-di-fuoco-ritardata', 'Palla di fuoco ritardata'],
  ['ragnatela', 'Ragnatela'], ['salto', 'Salto'], ['scritto-illusorio', 'Scritto illusorio'],
  ['scudo-di-fuoco', 'Scudo di fuoco'], ['spruzzo-colorato', 'Spruzzo colorato'],
  ['tempesta-di-fuoco', 'Tempesta di fuoco'], ['tocco-del-vampiro', 'Tocco del vampiro'],
  ['tocco-gelido', 'Tocco gelido'],
];
for (const [id, name] of additions) assert.equal(byId[id]?.sourceName, name, `${id}: missing official spell`);
assert.ok(byId['palla-di-fuoco'].descrizione.includes('8d6'), 'Fireball must include its source damage');
const animals = byId['evoca-animali'].descrizione;
assert.ok(animals.includes('branco') && animals.includes('3d10'), 'Conjure Animals continuation must cross the PDF column');
assert.ok(!animals.includes('Luce curatrice'), 'Conjure Celestial must not leak into Conjure Animals');
assert.ok(byId['desiderio'].descrizione.includes('33%') && byId['desiderio'].descrizione.includes('2d4 giorni') && byId['desiderio'].descrizione.includes('multiverso'), 'Wish must include the final stress rules and adjudication');
assert.ok(byId['teletrasporto'].descrizione.includes('01–05') && byId['teletrasporto'].descrizione.includes('25–00'), 'Teleport outcome table must be complete');
assert.ok(byId['richiama-drago'].descrizione.includes('Spirito draconico'), 'Summon Dragon stat block must be included');
assert.equal(byId['i-re-spirare-sott-acqua'].descrizione, byId['i-re-spirare-sott-acqua-2'].descrizione);
assert.ok(!byId['dardo-stregato'], 'Non-SRD descriptions must not be invented');
assert.ok(byId['dardo-incantato'].descrizione.includes('1d4 + 1'), 'The reviewed Magic Missile must use the full official source');
assert.equal(byId['deflagrazione-occulta'].sourceName, 'Deflagrazione occulta');
assert.equal(byId['aura-magica-di-nystul'].sourceName, "Aura magica dell'arcanista");
assert.equal(byId['capanna-di-leomund'].sourceName, 'Capanna');
assert.ok(!byId['amicizia'], 'An existing non-SRD spell must not receive an invented SRD source');
console.log(`[srd] Verified ${data.spells.length} complete transcriptions, 339 distinct spells, source references and tables.`);
