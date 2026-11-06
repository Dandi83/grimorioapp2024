// PROMPT 69: «⚔ Affrontalo in Total Party Kill» at the bottom of the 2024 creatures. The link, the creatures it is
// for, the part «Affrontalo in TPK» hidden from the start, the event of the statistics, where it sits on the page.
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { tpkSummonUrl, TPK_URL } = require("../lib/tpk.ts");
const { tpkSummonApplies, TPK_SUMMON_PART } = require("../lib/tpk-summon.ts");
const ps = require("../lib/public-sections.ts");
const { parseAnalyticsInput, ANALYTICS_EVENTS } = require("../lib/analytics-events.ts");

// The link: the public id of /mostro/<id>, in a new tab.
assert.equal(TPK_URL, "https://www.totalpartykill.app");
assert.equal(tpkSummonUrl("drago-nero-adulto"), "https://www.totalpartykill.app/evoca?mostro=drago-nero-adulto&da=grimorio");
assert.equal(tpkSummonUrl("homebrew-squartatore"), "https://www.totalpartykill.app/evoca?mostro=homebrew-squartatore&da=grimorio");

// The creatures: 2024 only.
const legacy = JSON.parse(fs.readFileSync("lib/data/srd-monsters-5.1-it.json", "utf8")).records.map(record => record.monster);
const current = JSON.parse(fs.readFileSync("lib/data/srd-monsters-5.2.1-it.json", "utf8")).records.map(record => record.monster);
const animals = JSON.parse(fs.readFileSync("lib/data/srd-animals-5.2.1-it.json", "utf8")).records.map(record => record.monster);
for (const monster of [...current, ...animals]) assert.equal(tpkSummonApplies(monster), true, `${monster.id}: SRD 5.2.1`);
for (const monster of legacy) assert.equal(tpkSummonApplies({ ...monster, edizione: "2014" }), false, `${monster.id}: SRD 5.1, never`);
assert.equal(tpkSummonApplies({ id: "drago-nero-adulto", edizione: "2014" }), false, "a sheet shown as 2014");
assert.equal(tpkSummonApplies({ id: "mostro-da-manuale" }), false, "NO SRD from a manual or added in the reserved area: TPK does not have it");
const homebrew = (homebrew_edizione, homebrew_autore = null, homebrew_licenza = null) => ({ id: "homebrew-squartatore", homebrew_edizione, homebrew_autore, homebrew_licenza });
assert.equal(tpkSummonApplies(homebrew("2024")), true, "editorial staff, 2024");
assert.equal(tpkSummonApplies(homebrew("entrambe")), true, "editorial staff, both editions");
assert.equal(tpkSummonApplies(homebrew("2014")), false, "2014 creature");
assert.equal(tpkSummonApplies(homebrew("2024", "Brenna", "CC BY-NC-SA 4.0")), true, "community with its licence");
assert.equal(tpkSummonApplies(homebrew("2024", "Brenna", null)), false, "community without a licence: never to TPK (lib/tpk-creatures.ts)");

// The part: in the Bestiario, «Nascosta» from the start, in /admin/sezioni and in «Nascondi tutto».
assert.equal(TPK_SUMMON_PART, "tpk");
const part = ps.sectionParts("bestiario").find(item => item.key === "tpk");
assert.equal(part.title, "Affrontalo in TPK");
assert.equal(part.set, undefined, "hiding it never hides the Bestiario");
assert.deepEqual(ps.effectiveHidden([], ["bestiario:tpk"]), []);
assert.equal(ps.isHiddenPath("/mostro/drago-nero-adulto", ["bestiario:tpk"]), false, "the creature itself stays visible");
const visibility = fs.readFileSync("lib/section-visibility.ts", "utf8");
assert.match(visibility, /DEFAULT_PART_STATES[^=]*= \{[^}]*"bestiario:tpk": "nascosta"/);
assert.match(visibility, /export function bulkKeys[\s\S]*section\.parts\.map/, "«Nascondi tutto» takes every part of the registry");

// The event: only from a creature, nothing else sent.
assert.ok(ANALYTICS_EVENTS.includes("tpk_summon_click"));
const event = (path, extra = {}) => ({ event: "tpk_summon_click", id: "11111111-1111-4111-8111-111111111111", view: "22222222-2222-4222-8222-222222222222",
  session: "33333333-3333-4333-8333-333333333333", path, ...extra });
assert.equal(parseAnalyticsInput(event("/mostro/drago-nero-adulto")).path, "/mostro/drago-nero-adulto");
assert.equal(parseAnalyticsInput(event("/mostro/homebrew-squartatore")).event, "tpk_summon_click");
for (const path of ["/spell/palla-di-fuoco", "/grimorio", "/bestiario", "/"]) assert.equal(parseAnalyticsInput(event(path)), undefined, path);
const provider = fs.readFileSync("components/analytics-provider.tsx", "utf8");
assert.match(provider, /name === "tpk_summon_click"\) void send\("tpk_summon_click"\)/);
assert.match(fs.readFileSync("lib/analytics.ts", "utf8"), /people\("'tpk_summon_click'"\)\} AS tpk/);
assert.match(fs.readFileSync("components/statistics/insights-more.tsx", "utf8"), /<Bar name="tpk" label="Affrontalo in TPK"/);

// The button: a plain link (no Next.js Link, no prefetch, no request to TPK), new tab, touch area ≥ 44 px.
const button = fs.readFileSync("components/tpk/tpk-summon-button.tsx", "utf8");
assert.match(button, /href=\{tpkSummonUrl\(id\)\}/);
assert.match(button, /target="_blank"/);
assert.match(button, /rel="noopener"/);
assert.ok(!/next\/link|fetch\(|totalpartykill/.test(button), "no request and no address of its own");
assert.match(button, /min-h-16/);
for (const text of ["Affrontalo in Total Party Kill", "Scegli il tuo party e combatti · si apre in una nuova scheda", "⚔", "›", "pg-angoli", "border-[1.5px] border-primary"]) assert.ok(button.includes(text), text);
const block = fs.readFileSync("components/tpk/tpk-summon.tsx", "utf8");
assert.match(block, /if \(!state\.shown\) return null;/, "hidden or «In arrivo»: nothing for the public");
assert.match(block, /state\.hidden && <HiddenPartBar/, "the administrator sees «Nascosta»");

// On the page: after the sheet, before the source; never on the reserved area, the list API or the TPK list.
const page = fs.readFileSync("app/mostro/[id]/page.tsx", "utf8");
const at = page.indexOf("<TpkSummon ");
assert.ok(at > page.indexOf("<MonsterSheetBody") && at < page.indexOf("data-source-box") && at < page.indexOf("<CardOriginBox"), "after the last block, before the source");
assert.match(page, /tpkSummonApplies\(monster\) && <TpkSummon id=\{monster\.id\} \/>/);
for (const file of ["lib/tpk-creatures.ts", "app/api/tpk/creature-originali/route.ts", "lib/sw/service-worker.js", "next.config.mjs"]) {
  assert.ok(!fs.readFileSync(file, "utf8").includes("evoca"), `${file}: nothing of the button`);
}
// TPK is opened only by links: never in the CSP or in CORS.
assert.ok(!fs.readFileSync("next.config.mjs", "utf8").includes("totalpartykill"));

console.log("[tpk-summon] «Affrontalo in Total Party Kill»: exact link, 2024 creatures only, part hidden from the start, event of the statistics, after the sheet and before the source.");
