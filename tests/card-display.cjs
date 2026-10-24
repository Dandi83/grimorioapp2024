// The display chain of the cards (lib/card-display.ts, components/spell-sheet.tsx, components/monster-sheet.tsx):
// a card written in the reserved area — plain text — gets the same links, icons, highlighted blocks and labels as
// an SRD card; the spells of the database are linked with their edition; hidden cards stay plain text; the
// previews use the same components. Loaded with tests/register-ts.cjs (npm test).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { markSpellNames, inlineSpellReferences, fileSpellCatalog } = require("../lib/spell-references.ts");
const { prepareSpellDisplay, prepareMonsterText } = require("../lib/card-display.ts");
const { SpellSheetBody, SpellSheetHeading } = require("../components/spell-sheet.tsx");
const { MonsterSheetBody, MonsterSheetTitle } = require("../components/monster-sheet.tsx");

// A catalog as lib/spell-reference-catalog.ts builds it: the SRD names plus the cards of the database.
const catalog = {
  current: [...fileSpellCatalog.current, { id: "fiamma-del-grimorio", name: "Fiamma del grimorio" }],
  legacy: [...fileSpellCatalog.legacy, { id: "amicizia-2", name: "Amicizia" }],
};

// Plain text of the reserved area: names of two words or more become spell names; one word only in lists.
assert.equal(markSpellNames("Lancia palla di fuoco, poi luce.", false, catalog), "Lancia <em>palla di fuoco</em>, poi luce.");
assert.equal(markSpellNames("<strong>Palla di fuoco.</strong> Il mago lancia Fiamma del Grimorio.", false, catalog), "<strong>Palla di fuoco.</strong> Il mago lancia <em>Fiamma del Grimorio</em>.");
assert.equal(markSpellNames("Ha già <em>palla di fuoco</em> in corsivo.", false, catalog), "Ha già <em>palla di fuoco</em> in corsivo.");
// Ordinary prose after an article or an elision: «un'arma magica», «la luce diurna» are not the spells.
assert.equal(markSpellNames("Un'arma non magica che l'incantatore tocca diventa un'arma magica.", true, catalog), "Un'arma non magica che l'incantatore tocca diventa un'arma magica.");
assert.equal(markSpellNames("Illumina come la luce diurna, poi lancia luce diurna.", false, catalog), "Illumina come la luce diurna, poi lancia <em>luce diurna</em>.");
assert.deepEqual(inlineSpellReferences(markSpellNames("Lancia Fiamma del Grimorio.", false, catalog), false, catalog), [{ label: "Fiamma del grimorio", href: "/spell/fiamma-del-grimorio" }]);
// The edition: a 2014 card links the 2014 spells only (Amicizia added by the administrator).
assert.deepEqual(inlineSpellReferences("A volontà: <em>amicizia</em>", true, catalog), [{ label: "Amicizia", href: "/spell/amicizia-2" }]);

// A spell added in the reserved area: conditions, fire icon, the other spell, the highlighted block, labels.
const added = {
  id: "fiamma-del-grimorio", nome_italiano: "FIAMMA DEL GRIMORIO", edizione: "2024", livello: "Invocazione di 2º livello (mago)", livello_num: 2, scuola: "Invocazione",
  classi: ["mago"], tempo_di_lancio: "1 azione o rituale", gittata: "18 metri", componenti: "V, S", durata: "Concentrazione, fino a 1 minuto", fonte_scheda: "Aggiunta da te",
  descrizione: "Il bersaglio subisce 2d6 danni da fuoco e resta accecato. Funziona come palla di fuoco ma più piccola.<br>Utilizzo di uno slot incantesimo di livello superiore. I danni aumentano di 1d6 per ogni slot.",
};
const view = prepareSpellDisplay(added, { catalog });
assert.equal(view.title, "Fiamma del grimorio");
assert.equal(view.castingTime, "Azione o rituale");
assert.equal(view.concentrazione, true);
assert.equal(view.rituale, true);
assert.equal(view.source, "Aggiunta da te");
assert.deepEqual(view.spellLinks.map(link => link.href), ["/spell/palla-di-fuoco"]);
const sheet = renderToStaticMarkup(React.createElement(React.Fragment, null,
  React.createElement(SpellSheetHeading, { spell: added, context: { catalog } }),
  React.createElement(SpellSheetBody, { spell: added, context: { catalog } })));
assert.match(sheet, /href="\/manuale\/condizioni-accecato" class="ref-pill">accecato<\/a>/);
assert.match(sheet, /data-damage-type="fire"/);
assert.match(sheet, /href="\/spell\/palla-di-fuoco" class="ref-pill">palla di fuoco<\/a>/);
assert.match(sheet, /<h3[^>]*>Utilizzo di uno slot incantesimo di livello superiore\.<\/h3>/);
assert.match(sheet, />Concentrazione<\/span>/);
assert.match(sheet, />Rituale<\/span>/);
assert.match(sheet, /data-card-source="Aggiunta da te"/);
assert.match(sheet, />Azione o rituale</);
// Hidden with the eye: plain text for the public.
const hidden = renderToStaticMarkup(React.createElement(SpellSheetBody, { spell: added, context: { catalog, hidden: ["/spell/palla-di-fuoco"] } }));
assert.doesNotMatch(hidden, /href="\/spell\/palla-di-fuoco"/);
assert.match(hidden, /palla di fuoco/);
// An SRD card keeps its own italics: no plain-text recognition in its prose.
assert.deepEqual(prepareSpellDisplay({ ...added, fonte_scheda: "SRD 5.2.1" }, { catalog }).spellLinks, []);

// A creature added in the reserved area: the new spell named in its text becomes a link, conditions and damage too.
const monster = {
  id: "guardiano-di-prova", nome: "Guardiano di prova", tipo: "Costrutto", taglia: "Media", allineamento: "neutrale", grado_sfida: "3", px: "700", gs_num: 3,
  classe_armatura: "15", punti_ferita: "40", velocita: "9 m", forza: 14, destrezza: 12, costituzione: 14, intelligenza: 10, saggezza: 10, carisma: 8,
  habitat: ["Sottosuolo"], fonte_scheda: "Aggiunta da te",
  azioni: "<strong>Raggio.</strong> Il guardiano lancia Fiamma del Grimorio: il bersaglio subisce 7 (2d6) danni da fuoco ed è prono.",
};
const text = prepareMonsterText(monster.azioni, false, "Aggiunta da te", { catalog });
assert.deepEqual(text.spellReferences, [{ label: "Fiamma del grimorio", href: "/spell/fiamma-del-grimorio" }]);
const creature = renderToStaticMarkup(React.createElement(React.Fragment, null,
  React.createElement(MonsterSheetTitle, { monster }), React.createElement(MonsterSheetBody, { monster, legacy: false, catalog })));
assert.match(creature, /href="\/spell\/fiamma-del-grimorio" class="ref-pill">Fiamma del Grimorio<\/a>/);
assert.match(creature, /href="\/manuale\/condizioni-prono" class="ref-pill">prono<\/a>/);
assert.match(creature, /data-damage-type="fire"/);
assert.match(creature, /data-card-source="Aggiunta da te"/);
assert.match(creature, /Habitat<\/span> Sottosuolo/);
assert.match(creature, /GS 3 · 700 PE/);
const creatureHidden = renderToStaticMarkup(React.createElement(MonsterSheetBody, { monster, legacy: false, catalog, hidden: ["/spell/fiamma-del-grimorio"] }));
assert.doesNotMatch(creatureHidden, /href="\/spell\/fiamma-del-grimorio"/);
// A homebrew: the same recognition, no second «Homebrew» label (the title already has it).
const brew = renderToStaticMarkup(React.createElement(MonsterSheetBody, { monster: { ...monster, fonte_scheda: "Homebrew" }, legacy: false, catalog }));
assert.match(brew, /href="\/spell\/fiamma-del-grimorio"/);

// The previews use the same components and the catalog of the page.
const editor = fs.readFileSync("components/admin-spell-editor.tsx", "utf8");
assert.match(editor, /<SpellSheetHeading spell=\{spell\} context=\{context\} heading="h2" \/>/);
assert.match(editor, /<SpellSheetBody spell=\{spell\} context=\{context\} \/>/);
assert.match(fs.readFileSync("components/admin-monster-preview.tsx", "utf8"), /<MonsterSheetBody monster=\{monster\} legacy=\{legacy\} catalog=\{display\.catalog\} hidden=\{display\.hidden\} \/>/);
assert.match(fs.readFileSync("components/homebrew/homebrew-editor.tsx", "utf8"), /catalog=\{display\.catalog\} hidden=\{display\.hidden\}/);
for (const file of ["app/spell/[id]/page.tsx", "app/mostro/[id]/page.tsx", "components/admin-editors-view.tsx", "components/admin-card-editor-view.tsx", "app/admin/proposte/page.tsx", "app/admin/proposte/[id]/page.tsx", "app/bestiario/proponi/page.tsx"]) {
  assert.match(fs.readFileSync(file, "utf8"), /getSpellReferenceCatalog\(\)/, file);
}
// A save refreshes the cards that may name the spell.
assert.match(fs.readFileSync("app/actions/admin.ts", "utf8"), /revalidatePath\("\/mostro\/\[id\]", "page"\)/);

console.log("Card display: plain text of the reserved area linked like the SRD cards (conditions, damage icons, spells of the database with their edition, highlighted block, Concentrazione/Rituale/source labels), hidden cards plain, previews on the same components.");
