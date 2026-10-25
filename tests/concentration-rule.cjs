// The concentration rule of both editions (scripts/transcribe-concentration.py): the printed text with its
// source, every block proved by its hash; the link of the Durata box for every spell with concentration.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { concentrationRules, getRule } = require("../lib/concentration.ts");
const { concentrationRuleHref, splitConcentration } = require("../lib/concentration-link.ts");
const { concentrationLink } = require("../lib/card-display.ts");
const { spellListFlags } = require("../lib/spells-types.ts");

const sha = text => crypto.createHash("sha256").update(text).digest("hex");
assert.deepEqual(concentrationRules.map(rule => rule.id), ["concentrazione", "concentrazione-2014"]);
for (const rule of concentrationRules) {
  for (const block of rule.blocks) {
    assert.equal(block.sourceHash, sha(block.text), `${rule.id}: ${block.text.slice(0, 30)}`);
    assert.doesNotMatch(block.text, /­|\s{2}/, "soft hyphens joined, single spaces");
    if (block.label) assert.ok(block.text.replace(/^•\s*/, "").startsWith(block.label));
  }
}
const rule2024 = getRule("concentrazione");
assert.equal(rule2024.document, "SRD 5.2.1 italiano");
assert.equal(rule2024.chapter, "Glossario delle regole");
assert.equal(rule2024.sourceSha256, "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718");
assert.deepEqual(rule2024.pages, [206]);
assert.deepEqual(rule2024.blocks.map(block => block.label ?? null), [null, null, "Un altro effetto di concentrazione.", "Danni.", "Incapacitato o morto."]);
assert.match(rule2024.blocks[3].text, /fino a una CD di massimo 30\.$/);
const rule2014 = getRule("concentrazione-2014");
assert.equal(rule2014.document, "SRD 5.1 italiano");
assert.equal(rule2014.chapter, "Lanciare incantesimi");
assert.equal(rule2014.sourceSha256, "2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7");
assert.deepEqual(rule2014.pages, [116, 117]);
assert.deepEqual(rule2014.blocks.filter(block => block.text.startsWith("•")).map(block => block.label), ["Lanciare un altro incantesimo che richiede concentrazione.", "Subire danni.", "Essere incapacitato o ucciso."]);
assert.match(rule2014.blocks.at(-1).text, /CD 10 per mantenere la concentrazione su un incantesimo\.$/);

// The link: the word as printed (capital or not), the rest plain; the same test as the «Concentrazione» filter.
assert.deepEqual(splitConcentration("Concentrazione, fino a 1 round"), { word: "Concentrazione", rest: ", fino a 1 round" });
assert.deepEqual(splitConcentration("concentrazione, fino a 1 ora"), { word: "concentrazione", rest: ", fino a 1 ora" });
assert.equal(splitConcentration("Istantanea"), undefined);
assert.equal(concentrationLink("Concentrazione, fino a 1 minuto", true).href, "/regole/concentrazione-2014");
assert.equal(concentrationRuleHref(false), "/regole/concentrazione");
const catalog = [
  ...JSON.parse(fs.readFileSync("lib/data/srd-italiano-5.2.1.json", "utf8")).spells,
  ...JSON.parse(fs.readFileSync("lib/data/incantesimi_2024.json", "utf8")),
];
let linked = 0;
for (const spell of catalog) {
  assert.equal(Boolean(splitConcentration(spell.durata)), Boolean(spellListFlags(spell).concentrazione), spell.id);
  if (splitConcentration(spell.durata)) linked++;
}
assert.ok(linked > 100, `${linked} spells with concentration`);
console.log(`Concentration rule: 2024 (SRD 5.2.1 p. 206) and 2014 (SRD 5.1 pp. 116-117) as printed, hashes checked; Durata link on ${linked} spells, same test as the filter.`);
