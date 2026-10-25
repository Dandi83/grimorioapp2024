// Subclasses added by the administrator (lib/subclass-types.ts, components/classes/subclass-card.tsx): the empty
// draft at the SRD levels of the class, the server check, the card with the links of the common display chain
// and «NO SRD», the same structure as the SRD card, the «Modifica» address.
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { classEntries, CLASS_IDS } = require("../lib/classes.ts");
const types = require("../lib/classes-types.ts");
const { emptySubclass, parseSubclassDraft, subclassBaseId, isSubclassId, subclassClass } = require("../lib/subclass-types.ts");
const { AddedSubclassCard, SubclassCard } = require("../components/classes/subclass-card.tsx");
const { adminEditHref } = require("../lib/admin-edit-link.ts");

assert.deepEqual([...CLASS_IDS], [...types.CLASS_IDS], "one list of classes");
// Levels from the SRD of the same edition; names and texts empty.
const guerriero = classEntries.find(entry => entry.id === "guerriero");
const draft = emptySubclass("guerriero", "2024", guerriero.editions["2024"].livelliSottoclasse);
assert.deepEqual(draft.privilegi.map(feature => feature.livello), [3, 7, 10, 15, 18]);
assert.ok(draft.privilegi.every(feature => feature.nome === "" && feature.testo === "" && feature.voci.length === 0));
assert.equal(draft.nome, "");
assert.equal(draft.descrizione, "");
assert.deepEqual(emptySubclass("chierico", "2014", classEntries.find(entry => entry.id === "chierico").editions["2014"].livelliSottoclasse).privilegi.map(f => f.livello), [1, 2, 6, 8, 17]);
for (const entry of classEntries) for (const edition of ["2024", "2014"]) {
  const card = entry.editions[edition];
  assert.ok(card.livelliSottoclasse.length >= 3, `${entry.id} ${edition}: levels of the subclass`);
}

// The server check.
assert.equal(parseSubclassDraft({ ...draft }).ok, false, "the name is needed");
assert.match(parseSubclassDraft({ ...draft, nome: "Guerriero <b>" }).error, /nome/);
assert.equal(parseSubclassDraft({ ...draft, classe: "pirata", nome: "X" }).ok, false);
assert.equal(parseSubclassDraft({ ...draft, edizione: "2020", nome: "X" }).ok, false);
assert.match(parseSubclassDraft({ ...draft, nome: "X", privilegi: [{ livello: 21, nome: "", testo: "", voci: [] }] }).error, /livello/);
const written = {
  ...draft, nome: "Guerriero di prova", descrizione: "Un guerriero che usa la mente.\n\nSecondo paragrafo.",
  privilegi: [
    { livello: 3, nome: "Lama psichica", testo: "Il bersaglio subisce 1d6 danni psichici e diventa prono.", voci: [{ nome: "Spinta", testo: "Lancia palla di fuoco contro un nemico." }, { nome: "", testo: "" }] },
    { livello: 7, nome: "Difesa mentale", testo: "Vantaggio contro la condizione spaventato.", voci: [] },
    { livello: 10, nome: "", testo: "", voci: [] },
  ],
};
const checked = parseSubclassDraft(written);
assert.equal(checked.ok, true);
assert.equal(checked.draft.privilegi[0].voci.length, 1, "empty entries are dropped");
assert.equal(checked.draft.privilegi.length, 3, "empty features stay in the draft (shown only when written)");

// The card: NO SRD, links to conditions and spells of the edition, damage icons, empty features left out.
const html = renderToStaticMarkup(React.createElement(AddedSubclassCard, { draft: checked.draft, from: 3 }));
assert.match(html, /<a href="\/fonti#no-srd" data-no-srd=""[^>]*>NO SRD<\/a>/);
assert.match(html, /<h2[^>]*>Guerriero di prova<\/h2>/);
assert.match(html, /href="\/manuale\/condizioni-prono" class="ref-pill">prono<\/a>/);
assert.match(html, /href="\/manuale\/condizioni-spaventato" class="ref-pill">spaventato<\/a>/);
assert.match(html, /href="\/spell\/palla-di-fuoco" class="ref-pill">palla di fuoco<\/a>/);
assert.match(html, /data-damage-type="psychic"/);
assert.match(html, /<strong class="font-bold italic">Spinta\. <\/strong>/);
assert.equal((html.match(/Livello \d+/g) || []).length, 2, "the feature without name and text is not shown");
assert.match(html, />Secondo paragrafo\.</);
const legacy = renderToStaticMarkup(React.createElement(AddedSubclassCard, { draft: { ...checked.draft, edizione: "2014" }, from: 3 }));
// 2014: only the conditions printed in SRD 5.1 (Prono and Spaventato are not there: plain text).
assert.doesNotMatch(legacy, /href="\/manuale\/condizioni-prono"/);

// Same structure as the SRD card: the outer markup of both is built by SubclassCard.
const srd = renderToStaticMarkup(React.createElement(SubclassCard, { name: "Campione", from: 3, intro: null, features: [{ livello: 3, titolo: "Critico migliorato", content: null }] }));
const tags = markup => [...markup.matchAll(/<(article|h2|ul|li|section|h3|p)\b[^>]*class="([^"]*)"/g)].map(match => `${match[1]}.${match[2]}`);
for (const tag of new Set(tags(srd))) assert.ok(tags(html).includes(tag), `the added card has ${tag}`);

// Addresses: class and name; «Modifica» opens its editor in the admin page of the class.
assert.equal(subclassBaseId("guerriero", "Guerriero psionico"), "guerriero--guerriero-psionico");
assert.equal(isSubclassId("guerriero--guerriero-psionico-2"), true);
assert.equal(isSubclassId("pirata--x"), false);
assert.equal(subclassClass("mago--scuola-x"), "mago");
assert.equal(adminEditHref({ kind: "sottoclasse", id: "guerriero--guerriero-psionico", edition: "2024" }, "/classi/guerriero"),
  "/admin/contenuti/classi/guerriero/sottoclassi/guerriero--guerriero-psionico?ritorno=%2Fclassi%2Fguerriero");
console.log("Subclasses: empty draft at the SRD levels of every class and edition, server check, card with NO SRD, condition and spell links, damage icons, SRD structure, editor address.");
