// «Provenienza» of the lists (lib/provenance.ts): the rule of the «NO SRD» pill, the switch splits NO SRD into
// original summaries and added cards; SRD cards that no longer match their record («SRD modificate») are NO SRD
// too, never SRD; homebrew apart. Loaded with tests/register-ts.cjs.
const assert = require("node:assert/strict");
const { matchesProvenance, provenanceIds, PROVENANCE_LABEL } = require("../lib/provenance.ts");

const cards = [
  { id: "srd", fonte_scheda: "SRD 5.2.1" }, { id: "srd-2014", fonte_scheda: "SRD 5.1" }, { id: "modificata" },
  { id: "sintesi", fonte_scheda: "Sintesi originale" }, { id: "aggiunta", fonte_scheda: "Aggiunta da te" },
  { id: "homebrew-x", fonte_scheda: "Homebrew", homebrew: true },
];
const ids = provenanceIds(cards, ["modificata"]);
assert.deepEqual([...ids.sintesi], ["sintesi"]);
assert.deepEqual([...ids.aggiunte], ["aggiunta"]);
const pick = value => cards.filter(card => matchesProvenance(card, value, ids)).map(card => card.id);
assert.deepEqual(pick("tutte"), cards.map(card => card.id));
assert.deepEqual(pick("srd"), ["srd", "srd-2014"]);
assert.deepEqual(pick("nosrd"), ["modificata", "sintesi", "aggiunta"]);
assert.deepEqual(pick("modificate"), ["modificata"]);
assert.deepEqual(pick("sintesi"), ["sintesi"]);
assert.deepEqual(pick("aggiunte"), ["aggiunta"]);
assert.deepEqual(Object.values(PROVENANCE_LABEL), ["Tutte", "Solo SRD", "Solo NO SRD", "Sintesi originali", "Aggiunte da me", "SRD modificate"]);
console.log("Provenienza: SRD, NO SRD = summaries + added (the switch) + SRD modificate, homebrew apart, labels of the filter.");
