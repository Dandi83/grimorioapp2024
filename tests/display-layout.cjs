// Layout of the cards (lib/display-layout.ts): every text the site shows, from every data file, passes
// through the same display repairs. The test fails when a PDF layout error comes back — a break inside a
// sentence, a bold split by a break, soft hyphens or words split by a hyphen, double spaces or spaces before
// punctuation, page numbers or headers of the PDF — and when a repair changes a single word.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(id => (id.startsWith("./data/") ? JSON.parse(fs.readFileSync(path.join("lib", id), "utf8")) : require(id)), mod, mod.exports);
  return mod.exports;
}
const { normalizeLayout, wordsOf } = load("lib/display-layout.ts");

// The texts of the cards: every data file the site reads (not the repair lists, indexes and the PDF transcripts).
// The Manual (srd-manual-5.2.1-it.json) is left out: plain text of the PDF lines with its own renderer, shown
// only in the preview; its 36 end-of-line hyphenations are listed in the report, to check one by one.
const NOT_CARDS = /repairs|layout-repairs|reference-index|-ids\.json|links\.json|paper-fields|gs-riferimento|habitat-mostri|merged-spell|srd-manual-5\.2\.1/;
const SKIP_FIELDS = new Set(["sourceText", "bodyText", "sourceSha256", "sourcePdfSha256", "sourceUrl", "transcriptionNotes", "attribution", "license", "id", "page"]);
const texts = [];
function visit(value, where) {
  if (Array.isArray(value)) value.forEach((item, index) => visit(item, `${where}/${index}`));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (SKIP_FIELDS.has(key)) continue;
      if (typeof item === "string" && item.length > 3) texts.push({ where: `${where}/${key}`, text: item });
      else visit(item, `${where}/${key}`);
    }
  }
}
for (const file of fs.readdirSync("lib/data").filter(name => name.endsWith(".json") && !NOT_CARDS.test(name)).sort()) {
  visit(JSON.parse(fs.readFileSync(path.join("lib/data", file), "utf8")), file);
}
assert.ok(texts.length > 25000, `card texts read: ${texts.length}`);

// Breaks that are right where they are: the spell lists of the creatures («1° livello (3 slot):», «3/giorno
// ciascuno:», «2 volte al giorno:») and numbered lists. Anything else after a break inside a sentence is an error.
const EXCEPTIONS = [/^\d+\s*[°º]\s*livello/i, /^\d+\s*\/\s*(?:giorno|riposo)/i, /^\d+\s+volt[ae]\b/i, /^\d+\s*[.)]\s/];
const CHECKS = {
  "a) a capo dentro una frase": text => [...text.matchAll(/([\p{L}\p{N},'’])((?:\s*<br\s*\/?>\s*)+)((?:<\/?(?:strong|b|em|i)>\s*)*)(?=[\p{Ll}\p{N}'’])/gu)]
    .filter(match => !EXCEPTIONS.some(rule => rule.test(text.slice(match.index + match[0].length)))).map(match => text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 30)),
  "b) grassetto o corsivo spezzato": text => [...text.matchAll(/<(strong|b|em|i)>([^<]*)<\/\1>(?:\s*<br\s*\/?>\s*)+<\1>([^<]*)<\/\1>/gi)]
    .filter(match => (match[2].match(/\(/g) || []).length > (match[2].match(/\)/g) || []).length || (!/[.:!?]\s*$/.test(match[2]) && /^\s*[\p{Ll}\p{N}]/u.test(match[3]))).map(match => match[0]),
  "c) sillabazione": text => [...text.matchAll(/­|\p{L}{2}-\s+\p{Ll}{2}/gu)].map(match => text.slice(Math.max(0, match.index - 20), match.index + 20)),
  "d) spazi": text => [...text.matchAll(text.includes("\n") ? /(\p{L}) +([,;]|\.(?!\.))/gu : /[^\s>] {2,}[^\s<]|(\p{L}) +([,;]|\.(?!\.))/gu)].map(match => text.slice(Math.max(0, match.index - 20), match.index + 20))
    .concat([...text.matchAll(/(?:^|[^\p{L}])(?:l|d|un|dell|dall|nell|sull|all|coll|quest|quell|tutt|c|s|m|t|v|n)['’] +\p{L}/giu)].map(match => match[0])),
  "e) resti del PDF": text => [...text.matchAll(/System Reference Document|<br\s*\/?>\s*\d{1,3}\s*<br\s*\/?>|(?<!\p{N}\s?)[°º]/gu)].map(match => text.slice(Math.max(0, match.index - 20), match.index + 30)),
};
const found = Object.fromEntries(Object.keys(CHECKS).map(name => [name, []]));
let repaired = 0;
// Casting times broken by the PDF extraction are shown repaired (lib/spell-catalog-repairs.ts): checked as shown.
const castingTimes = new Map(Object.values(JSON.parse(fs.readFileSync("lib/data/spell-casting-time-repairs-20261021.json", "utf8")).tempi).map(row => [row.da, row.a]));
for (const { where, text: stored } of texts) {
  const text = where.endsWith("/tempo_di_lancio") ? castingTimes.get(stored) ?? stored : stored;
  const shown = normalizeLayout(text);
  if (shown !== text) {
    repaired++;
    assert.equal(wordsOf(shown), wordsOf(text), `${where}: a layout repair changed the words`);
  }
  const prose = shown.replace(/<pre>[\s\S]*?<\/pre>/gi, " ");
  for (const [name, check] of Object.entries(CHECKS)) for (const sample of check(prose)) found[name].push(`${where}: ${JSON.stringify(sample)}`);
}
for (const [name, list] of Object.entries(found)) assert.deepEqual(list, [], `${name}: ${list.length} cases\n${list.slice(0, 20).join("\n")}`);

// The cards of the report: the same words, without the breaks of the PDF.
const json = file => JSON.parse(fs.readFileSync(path.join("lib/data", file), "utf8"));
const spells2024 = json("srd-italiano-5.2.1.json").spells;
const spell = id => spells2024.find(row => row.id === id).descrizione;
const monster = (file, id) => [...json(file).records].find(row => row.monster.id === id).monster;
const shownSpell = id => normalizeLayout(spell(id));
assert.match(shownSpell("marchio-del-cacciatore"), /utilizzando uno slot incantesimo di 3º o 4º livello \(fino a 8 ore\)/);
assert.match(shownSpell("santificare"), /Le creature di qualsiasi tipo scelto dall'incantatore non possono/);
assert.match(shownSpell("santuario-privato-di-mordenkainen"), /• Nulla può teletrasportarsi dentro o fuori dall'area protetta\./);
assert.match(shownSpell("vigilanza-e-interdizione"), /con lato di 1,5 metri\. Qualsiasi creatura/);
assert.match(shownSpell("creare-o-distruggere-acqua"), /fino a 40 litri d'acqua pulita/);
assert.match(shownSpell("animare-oggetti"), /20 \(taglia Grande\), 40 \(taglia Enorme\)/);
const red = monster("srd-monsters-5.2.1-it.json", "drago-rosso-adulto");
assert.match(normalizeLayout(red.tratti), /<strong>Resistenza leggendaria \(3\/giorno o 4\/giorno nella tana\)\.<\/strong>/);
assert.match(normalizeLayout(monster("srd-animals-5.2.1-it.json", "triceratopo").azioni), /^<strong>Multiattacco\.<\/strong> Il triceratopo effettua due attacchi Trafiggere\.<br><br><strong>Trafiggere\. <\/strong>/);
// Ten repaired cards: word for word the same text as before.
for (const [label, before] of [
  ["Marchio del cacciatore", spell("marchio-del-cacciatore")], ["Santificare", spell("santificare")],
  ["Santuario privato di Mordenkainen", spell("santuario-privato-di-mordenkainen")], ["Vigilanza e interdizione", spell("vigilanza-e-interdizione")],
  ["Creare o distruggere acqua", spell("creare-o-distruggere-acqua")], ["Animare oggetti", spell("animare-oggetti")],
  ["Drago rosso adulto", red.tratti], ["Drago blu antico", monster("srd-monsters-5.2.1-it.json", "drago-blu-antico").tratti],
  ["Aboleth", monster("srd-monsters-5.2.1-it.json", "aboleth").tratti], ["Triceratopo", monster("srd-animals-5.2.1-it.json", "triceratopo").azioni],
]) assert.equal(wordsOf(normalizeLayout(before)), wordsOf(before), label);

// The breaks that are right stay: a 2014 spell list, a table, a sentence that ends.
const list = "<strong>Incantesimi.</strong> Il mago ha preparato:<br>Trucchetti (a volontà): <em>luce</em>, <em>mano magica</em><br>1° livello (4 slot): <em>scudo</em><br>2/giorno ciascuno: <em>volare</em>";
assert.equal(normalizeLayout(list), list);
const table = "<pre>Livello   Effetto\n1         Svantaggio</pre>";
assert.equal(normalizeLayout(table), table);
assert.equal(normalizeLayout("Fine della frase.<br><br>altro paragrafo"), "Fine della frase.<br><br>altro paragrafo");
// Typed in the reserved area or in a proposal: the same rules.
assert.equal(normalizeLayout("Il bersaglio subisce danni da fuoco e diventa<br>accecato fino alla fine del turno."), "Il bersaglio subisce danni da fuoco e diventa accecato fino alla fine del turno.");
assert.equal(normalizeLayout("l' incantatore  sceglie , poi aboleth­e"), "l'incantatore sceglie, poi abolethe");

console.log(`Card layout: ${texts.length} texts of the data files checked, ${repaired} repaired for display (same words), no break inside a sentence, split bold, soft hyphen, double space or PDF residue left; spell lists and tables untouched.`);
