// NO SRD cards: the box at the bottom (components/card-origin-box.tsx) and the «Sintesi originale» switch of the
// editor (components/admin-summary-field.tsx, lib/content-editions.ts). Loaded with tests/register-ts.cjs.
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { CardOriginBox } = require("../components/card-origin-box.tsx");
const { AdminSummaryField, previewSource, summaryFieldState } = require("../components/admin-summary-field.tsx");

const box = source => renderToStaticMarkup(React.createElement(CardOriginBox, { source }));
const text = html => html.replace(/<[^>]+>/g, "");

// Original summaries (the 49 of the project and the switch on) and the other added cards; no manual, no page.
assert.equal(text(box("Sintesi originale")), "Sintesi originale del Grimorio, scritta con parole nostre: non è il testo del manuale.Schede NO SRD · Attribuzione e licenza");
assert.match(box("Sintesi originale"), /href="\/fonti#no-srd"[^>]*>Schede NO SRD<\/a> · <a[^>]*href="\/fonti"[^>]*>Attribuzione e licenza<\/a>/);
assert.equal(text(box("Aggiunta da te")), "Scheda inserita dal Grimorio: non fa parte dell’SRD.Schede NO SRD");
for (const source of ["Sintesi originale", "Aggiunta da te"]) assert.doesNotMatch(box(source), /SRD 5\.|pagina|Fonte ufficiale|Aggiunta da te/);
// SRD cards, SRD cards edited and homebrew: no box (homebrew keeps its licence box).
for (const source of ["SRD 5.1", "SRD 5.2.1", "Homebrew", undefined]) assert.equal(box(source), "", String(source));

// The switch: offered for new cards and cards added here, fixed for the 49 summaries, absent on SRD cards.
assert.equal(summaryFieldState(null), "switch");
assert.equal(summaryFieldState({ fonte_scheda: "Aggiunta da te" }), "switch");
assert.equal(summaryFieldState({ fonte_scheda: "Sintesi originale" }), "switch");
assert.equal(summaryFieldState({ fonte_scheda: "Sintesi originale", sintesi_progetto: true }), "fixed");
for (const fonte_scheda of ["SRD 5.1", "SRD 5.2.1", "Homebrew", undefined]) assert.equal(summaryFieldState({ fonte_scheda }), "none");
const field = renderToStaticMarkup(React.createElement(AdminSummaryField, { state: "switch", initial: false }));
assert.match(field, /<input type="hidden" name="sintesi-campo" value="1"\/>/);
assert.match(field, /type="checkbox" role="switch"[^>]*name="sintesi"/);
assert.doesNotMatch(field, / checked=""/, "off by default");
assert.match(renderToStaticMarkup(React.createElement(AdminSummaryField, { state: "switch", initial: true })), / checked=""/);
assert.equal(renderToStaticMarkup(React.createElement(AdminSummaryField, { state: "none", initial: false })), "");
// The preview follows the switch; without the switch, the label the card has.
assert.equal(previewSource({ "sintesi-campo": "1", sintesi: "on" }, "Aggiunta da te"), "Sintesi originale");
assert.equal(previewSource({ "sintesi-campo": "1" }, "Sintesi originale"), "Aggiunta da te");
assert.equal(previewSource({}, "SRD 5.1"), "SRD 5.1");

console.log("NO SRD origin: summary and added-card boxes with /fonti#no-srd, none on SRD and homebrew cards; the «Sintesi originale» switch off by default, fixed for the 49 summaries, absent on SRD cards.");
