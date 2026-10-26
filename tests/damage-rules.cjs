// «Resistenza», «immunità» and «vulnerabilità» as rule pills (lib/damage-rule-link.ts): the rule pages of both
// editions as printed in the SRD (scripts/transcribe-damage-rules.py, every block proved by its hash), the
// terms recognised only in their rule meaning, one pill per term per paragraph, the edition of the card, and
// the text of the cards unchanged: the pill only wraps the printed words. Loaded with tests/register-ts.cjs.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { damageRules, getRule, rulePages } = require("../lib/concentration.ts");
const link = require("../lib/damage-rule-link.ts");
const { damageRuleLinks, damageLineHref, findRuleTerms } = link;
const { HtmlText } = require("../components/html-text.tsx");
const { SpellSheetBody } = require("../components/spell-sheet.tsx");
const { MonsterSheetBody } = require("../components/monster-sheet.tsx");
const { MagicItemText } = require("../components/magic-items/magic-item-text.tsx");
const { ClassBlocks } = require("../components/classes/class-blocks.tsx");
const { AddedSubclassCard } = require("../components/classes/subclass-card.tsx");
const { magicItems } = require("../lib/magic-items.ts");
const { classEntries } = require("../lib/classes.ts");

const h = React.createElement;
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const text = html => html.replace(/<[^>]+>/g, "");
const pills = html => [...html.matchAll(/<a href="([^"]+)" class="ref-pill" data-rule-term="">([^<]*)<\/a>/g)].map(match => [match[2], match[1]]);

// The rule pages: the SRD text as printed, its source; every edition its own pages.
assert.deepEqual(rulePages.map(rule => rule.id), ["concentrazione", "concentrazione-2014", "immunita", "resistenza", "vulnerabilita", "resistenza-vulnerabilita-2014", "immunita-2014"]);
const SOURCES = {
  "2024": { document: "SRD 5.2.1 italiano", sha: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718", url: /IT_SRD_CC_v5\.2\.1\.pdf$/ },
  "2014": { document: "SRD 5.1 italiano", sha: "2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7", url: /SRD_CC_v5\.1_IT\.pdf$/ },
};
for (const rule of damageRules) {
  const source = SOURCES[rule.edizione];
  assert.equal(rule.document, source.document, rule.id);
  assert.equal(rule.sourceSha256, source.sha, rule.id);
  assert.match(rule.sourceUrl, source.url, rule.id);
  for (const block of rule.blocks) {
    assert.equal(block.sourceHash, sha(block.text), `${rule.id}: ${block.text.slice(0, 30)}`);
    assert.doesNotMatch(block.text, /­|\s{2}/, "soft hyphens joined, single spaces");
  }
}
const pages = Object.fromEntries(damageRules.map(rule => [rule.id, [rule.edizione, rule.chapter, rule.title, rule.pages.join(), rule.blocks.length]]));
assert.deepEqual(pages, {
  immunita: ["2024", "Glossario delle regole", "Immunità", "208", 1],
  resistenza: ["2024", "Glossario delle regole", "Resistenza", "212", 1],
  vulnerabilita: ["2024", "Glossario delle regole", "Vulnerabilità", "219", 1],
  "resistenza-vulnerabilita-2014": ["2014", "Combattimento", "Resistenza e vulnerabilità ai danni", "111", 4],
  "immunita-2014": ["2014", "Mostri", "Vulnerabilità, resistenze e immunità", "295", 1],
});
assert.equal(getRule("immunita").blocks[0].text, "Se il personaggio è immune a un tipo di danno o a una condizione, significa che non ne subisce gli effetti in alcun modo.");
assert.match(getRule("resistenza").blocks[0].text, /^Se un personaggio è dotato di resistenza a un tipo di danno, i danni di quel tipo che subisce sono dimezzati \(arrotondando per difetto\)\./);
assert.match(getRule("vulnerabilita").blocks[0].text, /^Se un personaggio è vulnerabile a un tipo di danno, i danni di quel tipo che subisce sono raddoppiati\./);
assert.match(getRule("resistenza-vulnerabilita-2014").blocks[1].text, /^Se una creatura o un oggetto è dotato di resistenza a un tipo di danno/);
assert.match(getRule("immunita-2014").blocks[0].text, /alcune creature sono immuni a certe condizioni\.$/);

// Where each edition leads; the conditions page only while it is shown.
assert.deepEqual(damageRuleLinks(false), { resistenza: "/regole/resistenza", immunita: "/regole/immunita", vulnerabilita: "/regole/vulnerabilita", condizioni: "/compendio/condizioni" });
assert.deepEqual(damageRuleLinks(true), { resistenza: "/regole/resistenza-vulnerabilita-2014", immunita: "/regole/immunita-2014", vulnerabilita: "/regole/resistenza-vulnerabilita-2014", condizioni: "/compendio/condizioni" });
assert.equal(damageRuleLinks(false, ["condizioni"]).condizioni, undefined);
// Every rule page is where a term leads.
const destinations = [...Object.values(damageRuleLinks(false)), ...Object.values(damageRuleLinks(true))];
for (const rule of damageRules) assert.ok(destinations.includes(`/regole/${rule.id}`), rule.id);

// The rule meaning only.
const rules = damageRuleLinks(false);
const found = plain => findRuleTerms(plain, rules).map(spot => [plain.slice(spot.start, spot.end), spot.href]);
assert.deepEqual(found("Ottiene resistenza ai danni contundenti, perforanti e taglienti."), [["resistenza", "/regole/resistenza"]]);
assert.deepEqual(found("Il bersaglio è vulnerabile ai danni da fuoco e immune ai danni da freddo."), [["vulnerabile", "/regole/vulnerabilita"], ["immune", "/regole/immunita"]]);
assert.deepEqual(found("Ha resistenza per 1 ora a un tipo di danno a scelta."), [["resistenza", "/regole/resistenza"]]);
assert.deepEqual(found("La creatura è immune alla condizione avvelenato."), [["immune", "/regole/immunita"]]);
assert.deepEqual(found("Ottiene resistenza e immunità ai danni da veleno."), [["resistenza", "/regole/resistenza"], ["immunità", "/regole/immunita"]]);
assert.deepEqual(found("Immunità alle condizioni affascinato, spaventato."), [["Immunità", "/compendio/condizioni"]]);
for (const plain of [
  "Resistenza alla magia. Il diavolo dispone di vantaggio ai tiri salvezza contro incantesimi.",
  "Resistenza leggendaria (3/giorno). Se il drago fallisce un tiro salvezza, può invece superarlo.",
  "La creatura è immune a questo effetto per 24 ore.",
  "È immune alla Presenza terrificante del drago per le 24 ore successive.",
  "Un tessuto resistente, flessibile ed erto di spine.",
  "Ha una resistenza fisica a cui può attingere per proteggersi dai danni.",
  "Lancia resistenza su un alleato.",
  "Non riesce a resistere al richiamo.",
  "È immune ai tiri salvezza su Forza.",
]) assert.deepEqual(found(plain), [], plain);
// «immune a questo effetto se è immune ai danni»: the second one is the rule.
assert.deepEqual(found("È immune a questo effetto se è immune ai danni taglienti."), [["immune", "/regole/immunita"]]);
const effect = "È immune a questo effetto se è immune ai danni taglienti.";
assert.equal(findRuleTerms(effect, rules)[0].start, effect.lastIndexOf("immune"));
// One pill per term per paragraph; a new paragraph (blank line) links again.
assert.deepEqual(found("Resistenza ai danni da fuoco; poi resistenza ai danni da freddo. Immune ai danni da veleno."), [["Resistenza", "/regole/resistenza"], ["Immune", "/regole/immunita"]]);
assert.equal(findRuleTerms("resistenza ai danni da fuoco.\n\nresistenza ai danni da freddo.", rules).length, 2);
assert.equal(findRuleTerms("resistenza ai danni da fuoco.\nresistenza ai danni da freddo.", rules).length, 1);
assert.deepEqual(findRuleTerms("resistenza ai danni", undefined), []);
// The lines of a creature sheet.
assert.equal(damageLineHref("Resistenze", rules), "/regole/resistenza");
assert.equal(damageLineHref("Vulnerabilità", rules), "/regole/vulnerabilita");
assert.equal(damageLineHref("Immunità ai danni", damageRuleLinks(true)), "/regole/immunita-2014");
assert.equal(damageLineHref("Immunità", rules), "/regole/immunita");
assert.equal(damageLineHref("Immunità alle condizioni", rules), "/compendio/condizioni");
assert.equal(damageLineHref("Sensi", rules), undefined);

// Without the pills: the same text, character by character.
function samePlainText(element) {
  const withPills = renderToStaticMarkup(element);
  const saved = { f: link.findRuleTerms, d: link.damageLineHref };
  link.findRuleTerms = () => []; link.damageLineHref = () => undefined;
  try { assert.equal(text(withPills), text(renderToStaticMarkup(element))); } finally { link.findRuleTerms = saved.f; link.damageLineHref = saved.d; }
  return withPills;
}

// A 2014 spell added by the administrator (Interdizione alle lame): plain text, the 2014 rule.
const blade = samePlainText(h(SpellSheetBody, { spell: {
  id: "interdizione-alle-lame-2", nome_italiano: "Interdizione alle lame", edizione: "2014", livello: "Trucchetto di Abiurazione", livello_num: 0, scuola: "Abiurazione",
  classi: [], tempo_di_lancio: "1 azione", gittata: "Incantatore", componenti: "V, S", durata: "1 round", fonte_scheda: "Aggiunta da te",
  descrizione: "Il personaggio tende la mano e traccia un sigillo di interdizione nell'aria. Fino alla fine del suo turno successivo, il personaggio ottiene resistenza ai danni contundenti, perforanti e taglienti inferti dagli attacchi con le armi.",
} }));
assert.deepEqual(pills(blade), [["resistenza", "/regole/resistenza-vulnerabilita-2014"]]);
// SRD 2024: Pelle di pietra.
const spells2024 = require("../lib/data/srd-italiano-5.2.1.json").spells;
const stoneskin = spells2024.find(spell => spell.id === "pelle-di-pietra");
const stone = samePlainText(h(HtmlText, { html: stoneskin.descrizione, damageIcons: true, rules }));
assert.deepEqual(pills(stone), [["resistenza", "/regole/resistenza"]]);
// A spell name in italics is never a rule term («*resistenza*», the cantrip).
assert.deepEqual(pills(renderToStaticMarkup(h(HtmlText, { html: "Lancia <em>resistenza</em> e ottiene resistenza ai danni da fuoco.", rules, spellReferences: [{ label: "Resistenza", href: "/spell/resistenza" }] }))), [["resistenza", "/regole/resistenza"]]);
assert.match(renderToStaticMarkup(h(HtmlText, { html: "Lancia <em>resistenza</em> e ottiene resistenza ai danni da fuoco.", rules, spellReferences: [{ label: "Resistenza", href: "/spell/resistenza" }] })), /<a href="\/spell\/resistenza" class="ref-pill">resistenza<\/a>/);

// Creature sheets: the labels of the damage lines and the traits, each edition its pages; the order unchanged.
const monsters = [
  ...require("../lib/data/srd-monsters-5.1-it.json").records.map(record => [record.monster, true]),
  ...require("../lib/data/srd-monsters-5.2.1-it.json").records.map(record => [record.monster, false]),
];
const sheet = (id, legacy) => samePlainText(h(MonsterSheetBody, { monster: monsters.find(([monster, old]) => monster.id === id && old === legacy)[0], legacy }));
assert.deepEqual(pills(sheet("drago-rosso-adulto-2014", true)), [["Immunità ai danni", "/regole/immunita-2014"]]);
assert.deepEqual(pills(sheet("drago-rosso-adulto", false)), [["Immunità", "/regole/immunita"]]);
// «Trovarsi sott'acqua non conferisce resistenza a tali danni»: the rule too, in the action.
assert.deepEqual(pills(sheet("testuggine-dragona-2014", true)), [["Resistenze", "/regole/resistenza-vulnerabilita-2014"], ["resistenza", "/regole/resistenza-vulnerabilita-2014"]]);
assert.deepEqual(pills(sheet("testuggine-dragona", false)), [["Resistenze", "/regole/resistenza"], ["resistenza", "/regole/resistenza"], ["resistenza", "/regole/resistenza"]]);
const lich2014 = sheet("lich-2014", true);
assert.ok(pills(lich2014).some(([label, href]) => label === "Immunità alle condizioni" && href === "/compendio/condizioni"));
assert.ok(!/data-rule-term="">Resistenza leggendaria/.test(lich2014), "Resistenza leggendaria is a trait name");
const sheetOrder = text(lich2014);
assert.ok(sheetOrder.indexOf("Caratteristiche") < sheetOrder.indexOf("Tratti") && sheetOrder.indexOf("Tratti") < sheetOrder.indexOf("Azioni") && sheetOrder.indexOf("Azioni") < sheetOrder.indexOf("Azioni leggendarie"));

// Magic items and class features.
for (const [edition, href] of [["2014", "/regole/resistenza-vulnerabilita-2014"], ["2024", "/regole/resistenza"]]) {
  const ring = magicItems[edition].find(item => item.id === "anello-di-resistenza");
  assert.deepEqual(pills(samePlainText(h(MagicItemText, { blocks: ring.blocchi, rules: damageRuleLinks(edition === "2014") }))), [["resistenza", href]], edition);
}
const rage = classEntries.find(entry => entry.id === "barbaro").editions["2024"].privilegi.find(feature => feature.titolo === "Ira");
const rageHtml = samePlainText(h(ClassBlocks, { blocks: rage.contenuto, rules }));
assert.ok(pills(rageHtml).some(([word, href]) => word === "resistenza" && href === "/regole/resistenza"));
assert.ok(!/data-rule-term="">Resistenza ai danni/.test(rageHtml), "the run-in label is a name");
assert.ok(!/resistenza straordinarie<\/a>|data-rule-term="">resistenza<\/a> straordinarie/.test(rageHtml), "«una potenza e una resistenza straordinarie» is not the rule");
// A subclass added by the administrator: plain text, the same pills.
const addedSub = renderToStaticMarkup(h(AddedSubclassCard, { from: 3, draft: { nome: "Cammino di prova", edizione: "2014", descrizione: "", privilegi: [{ livello: 3, nome: "Pelle dura", testo: "Ottiene resistenza ai danni da fuoco.", voci: [] }] } }));
assert.deepEqual(pills(addedSub), [["resistenza", "/regole/resistenza-vulnerabilita-2014"]]);

console.log("Damage rules: 5 rule pages as printed (SRD 5.2.1 pp. 208, 212, 219; SRD 5.1 pp. 111, 295), hashes checked; pills only in the rule meaning, one per term per paragraph, edition of the card, text unchanged on spells, creatures, magic items, class features and added subclasses.");
