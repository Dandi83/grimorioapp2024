// PROMPT 69 (parte B): no bold title of the SRD creatures split by a break, and not a word changed by the repair.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const FILES = ["srd-monsters-5.2.1-it.json", "srd-animals-5.2.1-it.json", "srd-monsters-5.1-it.json"];
const read = file => JSON.parse(fs.readFileSync(path.join("lib/data", file), "utf8"));
const plain = value => (typeof value === "string" ? value.replace(/<[^>]*>/g, "") : value);
const words = monster => crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(monster).map(([key, value]) => [key, plain(value)])))).digest("hex");
// A bold title that goes on after the break: before it the bold text does not end a sentence («nella », «o », «attacchi »).
const SPLIT = /<strong>([^<]*)<\/strong>(?:\s*<br\s*\/?>\s*)+<strong>/g;
const splitTitles = text => [...text.matchAll(SPLIT)].filter(match => !/[.:!?]\s*$/.test(match[1])).map(match => match[0]);

const before = JSON.parse(fs.readFileSync("tests/fixtures/srd-monster-words-20261106.json", "utf8")).file;
let blocks = 0;
for (const file of FILES) {
  const records = read(file).records;
  assert.equal(records.length, Object.keys(before[file]).length, `${file}: same cards as before`);
  for (const { monster } of records) {
    // Same words, in the same order, field by field (tags removed): only the markup may change.
    assert.equal(words(monster), before[file][monster.id], `${file} ${monster.id}: the text without tags changed`);
    for (const [field, value] of Object.entries(monster)) {
      if (typeof value !== "string") continue;
      blocks++;
      assert.deepEqual(splitTitles(value), [], `${file} ${monster.id}.${field}: bold title split by a break`);
    }
  }
}

// The 28 blocks repaired on 6 November 2026: the title on one line.
const byId = Object.fromEntries(FILES.slice(0, 2).flatMap(file => read(file).records.map(record => [record.monster.id, record.monster])));
const ADULT = ["drago-bianco-adulto", "drago-blu-adulto", "drago-d-argento-adulto", "drago-di-bronzo-adulto", "drago-di-rame-adulto", "drago-d-oro-adulto",
  "drago-d-ottone-adulto", "drago-nero-adulto", "drago-rosso-adulto", "drago-verde-adulto", "signore-delle-mummie", "sfinge-della-conoscenza", "sfinge-del-valore", "vampiro"];
const ANCIENT = ["drago-bianco-antico", "drago-blu-antico", "drago-d-argento-antico", "drago-di-bronzo-antico", "drago-di-rame-antico", "drago-d-oro-antico",
  "drago-d-ottone-antico", "drago-nero-antico", "drago-rosso-antico", "drago-verde-antico", "kraken", "lich"];
for (const id of ADULT) assert.match(byId[id].tratti, /<strong>Resistenza leggendaria \(3\/giorno o 4\/giorno nella tana\)\. ?<\/strong>/, id);
for (const id of ANCIENT) assert.match(byId[id].tratti, /<strong>Resistenza leggendaria \(4\/giorno o 5\/giorno nella tana\)\. ?<\/strong>/, id);
assert.match(byId["tigre-mannara"].azioni_bonus, /<strong>Movimento predatorio \(solo in forma di tigre o ibrida\)\.<\/strong>/);
assert.match(byId.triceratopo.azioni, /^<strong>Multiattacco\.<\/strong> Il triceratopo effettua due attacchi Trafiggere\.<br><br><strong>Trafiggere\. <\/strong>/);
assert.equal(ADULT.length + ANCIENT.length + 2, 28);
assert.ok(byId["drago-nero-adulto"].tratti.includes("<strong>Resistenza leggendaria (3/giorno o 4/giorno nella tana).</strong>"), "the example of the request");

console.log(`[srd-grassetti] ${blocks} SRD blocks: no bold title split by a break; text without tags identical to before for every card; 28 repaired blocks checked.`);
