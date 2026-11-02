// «Condividi come immagine» (PROMPT 50): the excerpt is the beginning of the text as printed (never rewritten), cut at
// a whole word with «…»; the short attribution; the link of the Square; the statistics events accepted from every
// sheet with the format and the kind, and nothing else; the code of the card out of the initial bundle.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { excerpt, plainText, srdLine, friendLink, EXCERPT_MAX, SHARE_KINDS, SHARE_SIZES } = require("../lib/share-card.ts");
const { parseAnalyticsInput } = require("../lib/analytics-events.ts");
const { getMastery } = require("../lib/weapon-masteries.ts");
const { feats } = require("../lib/feats.ts");

// plainText: tags, *marks* and spaces away, the words as printed.
assert.equal(plainText("<strong>Corpo di brace.</strong> Chi lo tocca<br><br>subisce 5 (1d10) danni &amp; fuoco."), "Corpo di brace. Chi lo tocca subisce 5 (1d10) danni & fuoco.");
assert.equal(plainText("**Allerta.** Ottieni *+5* all’iniziativa \\* nota"), "Allerta. Ottieni +5 all’iniziativa * nota");
assert.equal(plainText("• Una creatura accecata non vede.\n• Fallisce le prove."), "Una creatura accecata non vede. Fallisce le prove.");

// excerpt: whole, or cut at a whole word with «…»; always the beginning of the plain text.
assert.equal(excerpt("Breve testo."), "Breve testo.");
const long = "Una sfera luminosa sfreccia dal tuo dito, esplode in un lampo, e ogni creatura nel raggio effettua un tiro salvezza. ".repeat(8);
const cut = excerpt(long);
assert.ok(cut.endsWith("…"));
assert.ok(cut.length <= EXCERPT_MAX + 1);
const body = cut.slice(0, -1);
assert.ok(plainText(long).startsWith(body), "the excerpt is the beginning of the text");
assert.ok(/[^\s,;:.–—-]$/.test(body), "no space or punctuation right before «…»");
assert.equal(plainText(long)[body.length].match(/[\s,;:.]/) !== null, true, "cut at the end of a word");
assert.equal(excerpt("parola ".repeat(200), 20), "parola parola parola…");
assert.equal(excerpt("parola ".repeat(200), 19), "parola parola…");
// The real texts: a mastery and every feat, whole or a cut prefix.
for (const text of [getMastery("colpo-di-striscio").testo, ...feats.flatMap(feat => Object.values(feat.editions).flatMap(view => view.paragrafi.map(p => (p.lead ? `${p.lead}. ${p.text}` : p.text))))]) {
  const made = excerpt(text);
  assert.ok(made === plainText(text) || (made.endsWith("…") && plainText(text).startsWith(made.slice(0, -1))), made);
}

// The attribution of a card and the link of the Square.
assert.equal(srdLine("2024"), "Testo SRD 5.2.1 · CC BY 4.0 · Wizards of the Coast");
assert.equal(srdLine("2014"), "Testo SRD 5.1 · CC BY 4.0 · Wizards of the Coast");
assert.equal(friendLink("/spell/palla-di-fuoco"), "https://ilgrimorio.app/spell/palla-di-fuoco?da=amico");
assert.equal(friendLink("/talenti/lottatore?edizione=2014"), "https://ilgrimorio.app/talenti/lottatore?edizione=2014&da=amico");
assert.deepEqual(SHARE_SIZES, { storia: { w: 1080, h: 1920 }, quadrato: { w: 1080, h: 1080 } });

// The events: from every sheet, with a known format and kind; never from a list or a made-up value.
const event = (name, path, props = {}) => ({ event: name, id: randomUUID(), view: randomUUID(), session: randomUUID(), path, test: false, source: "direct", activeSeconds: 0, scrollPercent: 0, device: "iphone", ...props });
for (const path of ["/spell/palla-di-fuoco", "/mostro/aboleth", "/oggetti-magici/ali-del-volo", "/manuale/condizioni-accecato", "/regole/concentrazione", "/talenti/allerta",
  "/equipaggiamento/armi/spada-lunga", "/equipaggiamento/armature/cuoio", "/equipaggiamento/avventura/acido", "/equipaggiamento/strumenti/liuto", "/equipaggiamento/padronanze/colpo-di-striscio", "/equipaggiamento/proprieta/accurata"]) {
  for (const name of ["share_image_open", "share_image_sent", "share_image_saved"]) {
    const parsed = parseAnalyticsInput(event(name, path, { imageFormat: "quadrato", imageKind: "incantesimo" }));
    assert.ok(parsed, `${name} ${path}`);
    assert.equal(parsed.imageFormat, "quadrato");
    assert.equal(parsed.imageKind, "incantesimo");
    assert.equal(parsed.device, "iphone");
  }
  // The link of the sheet, as before (now from every sheet).
  assert.ok(parseAnalyticsInput(event("share_click", path)), path);
}
for (const kind of SHARE_KINDS) assert.ok(parseAnalyticsInput(event("share_image_open", "/spell/palla-di-fuoco", { imageFormat: "storia", imageKind: kind })), kind);
assert.equal(parseAnalyticsInput(event("share_image_sent", "/spell/palla-di-fuoco", { imageFormat: "panorama", imageKind: "incantesimo" })), undefined);
assert.equal(parseAnalyticsInput(event("share_image_sent", "/spell/palla-di-fuoco", { imageFormat: "storia", imageKind: "classe" })), undefined);
assert.equal(parseAnalyticsInput(event("share_image_sent", "/spell/palla-di-fuoco", { imageFormat: "storia" })), undefined);
for (const path of ["/grimorio", "/bestiario", "/oggetti-magici", "/equipaggiamento/armi", "/", "/talenti"])
  assert.equal(parseAnalyticsInput(event("share_image_open", path, { imageFormat: "storia", imageKind: "incantesimo" })), undefined, path);

// The card is drawn by the browser only: the module is imported on demand, never by a page; no server function.
const button = fs.readFileSync("components/share-button.tsx", "utf8");
assert.match(button, /import\("\.\/share\/share-image-dialog"\)/);
assert.doesNotMatch(button, /^import .*share-card-draw|^import .*share-image-dialog/m);
for (const file of ["components/share/share-image-dialog.tsx", "lib/share-card-draw.ts"]) assert.doesNotMatch(fs.readFileSync(file, "utf8"), /fetch\(["'`]\/api|https?:\/\/(?!ilgrimorio\.app)/, file);
assert.ok(!fs.existsSync("app/api/card") && !fs.existsSync("app/api/condividi"), "no new API");

console.log("Share card: excerpt as printed, attribution, Square link, statistics events from every sheet and the card loaded on demand passed.");
