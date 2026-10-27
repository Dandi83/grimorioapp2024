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
// No «Concentrazione» label under the name: the word of the Durata box links to the rule of the edition, like a condition.
assert.doesNotMatch(sheet, />Concentrazione<\/span>/);
assert.match(sheet, /<a href="\/regole\/concentrazione" class="ref-pill">Concentrazione<\/a>, fino a 1 minuto</);
const legacySheet = renderToStaticMarkup(React.createElement(SpellSheetBody, { spell: { ...added, edizione: "2014", durata: "concentrazione, fino a 1 ora" }, context: { catalog } }));
assert.match(legacySheet, /<a href="\/regole\/concentrazione-2014" class="ref-pill">concentrazione<\/a>, fino a 1 ora</);
const instant = renderToStaticMarkup(React.createElement(SpellSheetBody, { spell: { ...added, durata: "Istantanea" }, context: { catalog } }));
assert.doesNotMatch(instant, /\/regole\//);
assert.match(instant, />Istantanea</);
assert.match(sheet, />Rituale<\/span>/);
// «Aggiunta da te» only for the administrator, drawn in the browser: never in the server markup.
assert.doesNotMatch(sheet, /Aggiunta da te/);
assert.match(sheet, /<a href="\/fonti#no-srd" data-no-srd=""[^>]*>NO SRD<\/a>/);
assert.match(sheet, />Azione o rituale</);
// The SRD sources stay for everyone; «Sintesi originale» is for the administrator (the visitor has the asterisk).
const heading = fonte_scheda => renderToStaticMarkup(React.createElement(SpellSheetHeading, { spell: { ...added, fonte_scheda }, context: { catalog } }));
assert.match(heading("SRD 5.2.1"), /data-card-source="SRD 5.2.1"/);
assert.doesNotMatch(heading("SRD 5.2.1"), /NO SRD/);
assert.doesNotMatch(heading(undefined), /NO SRD/, "an SRD card edited: no label at all");
assert.match(heading("Sintesi originale"), /<a href="\/fonti#no-srd" data-no-srd=""[^>]*>NO SRD<\/a>/);
assert.doesNotMatch(heading("Sintesi originale"), /Sintesi originale/);
// The previews of the reserved area keep both.
const { PathnameContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime");
const inReserved = element => renderToStaticMarkup(React.createElement(PathnameContext.Provider, { value: "/admin/incantesimi" }, element));
assert.match(inReserved(React.createElement(SpellSheetHeading, { spell: added, context: { catalog } })), /data-card-source="Aggiunta da te"/);
assert.match(inReserved(React.createElement(SpellSheetHeading, { spell: { ...added, fonte_scheda: "Sintesi originale" }, context: { catalog } })), /data-card-source="Sintesi originale"/);
assert.match(inReserved(React.createElement(MonsterSheetTitle, { monster: { nome: "Guardiano", fonte_scheda: "Aggiunta da te" } })), /<p class="mt-2 flex flex-wrap gap-1.5" data-card-labels=""><a href="\/fonti#no-srd" data-no-srd=""[^>]*>NO SRD<\/a><span[^>]*data-card-source="Aggiunta da te"/);
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
assert.doesNotMatch(creature, /Aggiunta da te/);
// «NO SRD» for everyone on a card made in the reserved area (the same pill as the added subclasses).
assert.match(creature, /<a href="\/fonti#no-srd" data-no-srd=""[^>]*>NO SRD<\/a>/);
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
for (const file of ["app/spell/[id]/page.tsx", "app/mostro/[id]/page.tsx", "components/admin-list/admin-list-page.tsx", "components/admin-card-editor-view.tsx", "app/admin/proposte/page.tsx", "app/admin/proposte/[id]/page.tsx", "app/bestiario/proponi/page.tsx"]) {
  assert.match(fs.readFileSync(file, "utf8"), /getSpellReferenceCatalog\(\)/, file);
}
// A save refreshes the cards that may name the spell.
assert.match(fs.readFileSync("app/actions/admin.ts", "utf8"), /revalidatePath\("\/mostro\/\[id\]", "page"\)/);

console.log("Card display: plain text of the reserved area linked like the SRD cards (conditions, damage icons, spells of the database with their edition, highlighted block, Rituale/source labels, Concentrazione linked to its rule), hidden cards plain, previews on the same components.");

// One NO SRD rule for the pill of the sheets and the admin asterisk of the lists.
const { isNoSrdSource, NO_SRD_SOURCES } = require("../lib/card-display.ts");
const { ADMIN_ONLY_SOURCES } = require("../components/card-source-pill.tsx");
assert.deepEqual([...NO_SRD_SOURCES].sort(), Object.values(ADMIN_ONLY_SOURCES).sort());
assert.equal(isNoSrdSource("Aggiunta da te"), true);
assert.equal(isNoSrdSource("Sintesi originale"), true);
for (const source of ["SRD 5.2.1", "SRD 5.1", "Homebrew", undefined]) assert.equal(isNoSrdSource(source), false, String(source));
// The ids reach the browser only from the admin endpoint: no public module imports the server list.
const fs2 = require("node:fs");
for (const file of ["components/grimorio-browser.tsx", "components/bestiario-browser.tsx", "components/admin-edit/no-srd-mark.tsx"]) assert.doesNotMatch(fs2.readFileSync(file, "utf8"), /lib\/no-srd/, file);
const route = fs2.readFileSync("app/api/admin/no-srd/route.ts", "utf8");
for (const part of [/await requireAdmin\(\)/, /status: 401/, /"Cache-Control": "private, no-store"/]) assert.match(route, part);
