// «Provenienza» of the lists (lib/provenance.ts): the rule of the «NO SRD» pill, the switch splits NO SRD into
// original summaries and added cards; homebrew and SRD cards edited are never NO SRD. Loaded with tests/register-ts.cjs.
const assert = require("node:assert/strict");
const { matchesProvenance, provenanceIds, PROVENANCE_LABEL } = require("../lib/provenance.ts");

const cards = [
  { id: "srd", fonte_scheda: "SRD 5.2.1" }, { id: "srd-2014", fonte_scheda: "SRD 5.1" }, { id: "modificata" },
  { id: "sintesi", fonte_scheda: "Sintesi originale" }, { id: "aggiunta", fonte_scheda: "Aggiunta da te" },
  { id: "homebrew-x", fonte_scheda: "Homebrew", homebrew: true },
];
const ids = provenanceIds(cards);
assert.deepEqual([...ids.sintesi], ["sintesi"]);
assert.deepEqual([...ids.aggiunte], ["aggiunta"]);
const pick = value => cards.filter(card => matchesProvenance(card, value, ids)).map(card => card.id);
assert.deepEqual(pick("tutte"), cards.map(card => card.id));
assert.deepEqual(pick("srd"), ["srd", "srd-2014", "modificata"]);
assert.deepEqual(pick("nosrd"), ["sintesi", "aggiunta"]);
assert.deepEqual(pick("sintesi"), ["sintesi"]);
assert.deepEqual(pick("aggiunte"), ["aggiunta"]);
assert.deepEqual(Object.values(PROVENANCE_LABEL), ["Tutte", "Solo SRD", "Solo NO SRD", "Sintesi originali", "Aggiunte da me"]);
console.log("Provenienza: SRD (also edited), NO SRD = summaries + added (the switch), homebrew apart, labels of the filter.");
