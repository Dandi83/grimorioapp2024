// PROMPT 51: the note «Perché c'è una sola sottoclasse?» — the exact texts of both editions, the article of each class,
// the level where it goes (the first level with a feature of the SRD subclass = the level printed for the subclass).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { classEntries, levelRows, subclassNoteText } = require("../lib/classes.ts");

const ARTICLE = { barbaro: "il barbaro", bardo: "il bardo", chierico: "il chierico", druido: "il druido", guerriero: "il guerriero", ladro: "il ladro",
  mago: "il mago", monaco: "il monaco", paladino: "il paladino", ranger: "il ranger", stregone: "lo stregone", warlock: "il warlock" };
const LEVEL_2014 = { chierico: 1, stregone: 1, warlock: 1, druido: 2, mago: 2 };
assert.equal(classEntries.length, 12);
for (const entry of classEntries) {
  assert.equal(subclassNoteText(entry.id, "2024"), `Il Grimorio pubblica solo le regole dell'SRD 5.2.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Per ${ARTICLE[entry.id]} contiene una sola sottoclasse: le altre 3 si trovano nel Manuale del Giocatore 2024.`);
  assert.equal(subclassNoteText(entry.id, "2014"), `Il Grimorio pubblica solo le regole dell'SRD 5.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Per ${ARTICLE[entry.id]} contiene una sola sottoclasse: le altre si trovano nel Manuale del Giocatore 2014.`);
  for (const edition of ["2024", "2014"]) {
    const card = entry.editions[edition];
    assert.ok(card, `${entry.id} ${edition}`);
    const first = levelRows(card).find(row => row.sottoclasse.length)?.livello;
    assert.equal(first, card.livelloSottoclasse, `${entry.id} ${edition}: the first subclass feature at the printed level`);
    assert.equal(first, edition === "2024" ? 3 : LEVEL_2014[entry.id] ?? 3, `${entry.id} ${edition}`);
  }
}
assert.match(subclassNoteText("stregone", "2014"), /Per lo stregone contiene/);
// The note is drawn on the server (no code in the browser bundle), as a note with bold text, not a heading.
const sheet = fs.readFileSync("components/classes/class-sheet.tsx", "utf8");
assert.match(sheet, /<InfoNote title="ℹ️ Perché c'è una sola sottoclasse\?" data-subclass-note=\{edition\}>/);
// The box shared with /talenti (PROMPT 54): a note, bold title, no heading, link to /fonti.
const box = fs.readFileSync("components/info-note.tsx", "utf8");
assert.match(box, /role="note"/);
assert.match(box, /<p className="font-bold">\{title\}<\/p>/);
assert.match(box, /href="\/fonti"[^>]*>Fonti e licenza</);
assert.doesNotMatch(box, /<h[1-6]|"use client"/);
assert.doesNotMatch(sheet, /^"use client"/);
console.log("Subclass note: exact texts and articles of the 12 classes, level of the SRD subclass in both editions passed.");
