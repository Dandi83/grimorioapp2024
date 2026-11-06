// PROMPT 72: «Dungeons & Dragons» and «D&D» are trademarks of Wizards of the Coast. In the code of the site (app/,
// components/, lib/ without the SRD data, public/) they appear only: in the legal notes (lib/trademark.ts and the heading of
// the SRD 5.1 in /fonti), in the descriptive form «compatibile/compatibili con D&D 5e» of the metadata, and in comments.
// Never as a label, a badge, an edition choice, a name of the site or of the installed app, a keyword or a shared text.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");

const MARK = /D&D|D&amp;D|Dungeons/;
const ROOTS = ["app", "components", "lib", "public"];
const SKIP = [/^lib\/data\//, /^lib\/trademark\.ts$/];
const ALLOWED_LINES = [
  // /fonti: the heading of the SRD 5.1 attribution names the edition of the rules it is (legal note).
  ["app/fonti/page.tsx", "System Reference Document 5.1 italiano — D&amp;D 2014"],
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

const problems = [];
let checked = 0;
for (const root of ROOTS) for (const file of walk(root)) {
  const name = file.split(path.sep).join("/");
  if (SKIP.some(rule => rule.test(name)) || !/\.(tsx?|mjs|js|json|css|webmanifest|html|txt)$/.test(name)) continue;
  fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (!MARK.test(line)) return;
    checked++;
    const trimmed = line.trim();
    if (/^(\/\/|\*|\/\*|\{\/\*)/.test(trimmed)) return;
    if (ALLOWED_LINES.some(([where, text]) => where === name && line.includes(text))) return;
    // Every mark of the line is in the descriptive form, and «Dungeons & Dragons» is never written out.
    const rest = line.replace(/compatibil[ei] con D&D 5e/g, "");
    if (!MARK.test(rest)) return;
    problems.push(`${name}:${index + 1}: ${trimmed.slice(0, 160)}`);
  });
}
assert.deepEqual(problems, [], `«D&D» used outside the legal notes and the descriptive form:\n${problems.join("\n")}`);

// The descriptions of lib/seo.ts: one «D&D» per description, always «compatibili con D&D 5e».
const seo = require("../lib/seo.ts");
for (const text of [
  seo.spellDescription({ nome: "Palla di fuoco", livello: 3, scuola: "Invocazione", edizione: "2024" }),
  seo.monsterDescription({ nome: "Aboleth", tipo: "Aberrazione", taglia: "Grande", gs: "10", edizione: "entrambe" }),
  seo.itemDescription("Spada lunga", "arma da guerra da mischia", "2014", "Danni, proprietà, costo e padronanza"),
  seo.fitDescription("Breve."),
]) {
  assert.ok(text.split("D&D").length - 1 <= 1, text);
  assert.doesNotMatch(text.replace(/compatibil[ei] con D&D 5e/, ""), MARK, text);
}
assert.doesNotMatch(seo.SITE_TITLE, MARK);

// The installed app and the shared text of the app.
const manifest = require("../app/manifest.ts").default();
assert.equal(manifest.name, "Il Grimorio.App");
assert.equal(manifest.short_name, "Grimorio");
assert.equal(manifest.description, "Incantesimi, mostri e regole 5e in italiano");
assert.doesNotMatch(JSON.stringify(manifest), MARK);

// The legal notes: the sentence on non-affiliation, word for word.
const trademark = require("../lib/trademark.ts");
assert.equal(trademark.NON_AFFILIATION_NOTE, "Il Grimorio.App è un progetto non ufficiale, non affiliato né approvato da Wizards of the Coast. Dungeons & Dragons e D&D sono marchi di Wizards of the Coast LLC.");
assert.equal(trademark.NON_AFFILIATION_SHORT, "Progetto non ufficiale, non affiliato a Wizards of the Coast");
for (const page of ["app/fonti/page.tsx", "app/info/page.tsx"]) assert.match(fs.readFileSync(page, "utf8"), /<p data-non-affiliazione=""[^>]*>{NON_AFFILIATION_NOTE}<\/p>/, page);
assert.ok(fs.readFileSync("app/page.tsx", "utf8").includes("<Link href=\"/fonti\" prefetch={false}>{NON_AFFILIATION_SHORT}</Link>"), "the line at the foot of the Home");

// The «Condividi come immagine» cards: no «D&D» in the drawing or in the data of the card.
for (const file of ["lib/share-card-draw.ts", "lib/share-card-server.ts"]) assert.doesNotMatch(fs.readFileSync(file, "utf8"), MARK, file);

console.log(`Marchio D&D: ${checked} righe con «D&D» controllate in app/, components/, lib/, public/: solo note legali, forma «compatibili con D&D 5e» e commenti; titolo del sito, manifest, descrizioni e card condivise senza «D&D».`);
