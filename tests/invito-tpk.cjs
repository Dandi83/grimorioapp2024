// PROMPT 70: the invite to install for who arrives from Total Party Kill (?da=tpk), the edition 2024 without the welcome
// screen, the origin «Total Party Kill» and the events of the invite in the statistics, «da=grimorio» on every link to TPK.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

const tpk = require("../lib/tpk.ts");
const { detectDevice, installGuide, isIpad, tpkInvite, TPK_IOS_STEPS, TPK_INVITE_TITLE, TPK_INVITE_LINE, TPK_OPEN_SAFARI, OPEN_BROWSER, STEPS } = require("../lib/install-guide.ts");
const { withoutTpkMark, tpkArrived } = require("../lib/tpk-arrival.ts");
const { originOf, ORIGINS } = require("../lib/analytics-stats.ts");
const { parseAnalyticsInput, ANALYTICS_EVENTS, TPK_INVITE_EVENTS } = require("../lib/analytics-events.ts");

// 1. Every link to TPK says where the visitor comes from; the #pg= of the character stays after the parameters.
assert.equal(tpk.TPK_CREATE_URL, "https://www.totalpartykill.app/crea?ritorno=grimorio&da=grimorio");
assert.equal(tpk.tpkImportUrl("#pg=abc_-1"), "https://www.totalpartykill.app/importa?da=grimorio#pg=abc_-1");
assert.equal(tpk.tpkImportUrl(""), "https://www.totalpartykill.app/importa?da=grimorio");
assert.equal(new URL(tpk.tpkImportUrl("#pg=abc")).searchParams.get("da"), "grimorio");
assert.equal(new URL(tpk.tpkImportUrl("#pg=abc")).hash, "#pg=abc");
assert.equal(tpk.tpkSummonUrl("drago-rosso-adulto"), "https://www.totalpartykill.app/evoca?mostro=drago-rosso-adulto&da=grimorio");
// The address of TPK is written only in lib/tpk.ts: the components use its constants.
for (const file of ["components/characters-beta/characters-app.tsx", "components/tpk/tpk-summon-button.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.ok(!/totalpartykill|da=grimorio/.test(source), `${file}: the links come from lib/tpk.ts`);
}

// 2. The mark: read only in the browser, taken off the address (the rest of the address kept).
assert.equal(tpkArrived(), false, "never on the server");
assert.equal(withoutTpkMark("https://ilgrimorio.app/mostro/drago-rosso-adulto?da=tpk"), "https://ilgrimorio.app/mostro/drago-rosso-adulto");
assert.equal(withoutTpkMark("https://ilgrimorio.app/grimorio?edizione=2014&da=tpk#x"), "https://ilgrimorio.app/grimorio?edizione=2014#x");
assert.equal(withoutTpkMark("https://ilgrimorio.app/?da=bio"), "https://ilgrimorio.app/?da=bio", "the other marks are not touched here");
const arrival = fs.readFileSync("lib/tpk-arrival.ts", "utf8");
assert.match(arrival, /history\.replaceState\(window\.history\.state/, "no reload");
assert.ok(!/localStorage|sessionStorage|fetch\(/.test(arrival), "nothing saved, nothing sent");

// 3. The variant of each system.
const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  ipadSafari: "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
  iphoneFirefox: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.31.92 (iPhone14,5; iOS 17_4; it_IT; it; scale=3.00; 1170x2532; 600000000)",
  facebook: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0.0.37.104;FBBV/600000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBLC/it_IT]",
  webview: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  pixelChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
  whatsappAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.9.78",
  desktopChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  desktopEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67",
  desktopFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
};
const invite = (ua, { touch = 0, prompt = false } = {}) => {
  const device = detectDevice(ua, touch);
  return tpkInvite(device, installGuide(device), prompt, isIpad(ua, touch));
};
assert.equal(TPK_INVITE_TITLE, "Installa Il Grimorio.App");
assert.equal(TPK_INVITE_LINE, "Arrivi da Total Party Kill: tieni il Grimorio sempre a portata di mano, anche offline.");
assert.deepEqual([...TPK_IOS_STEPS], ["Tocca Condividi ⬆ nella barra di Safari", "Scorri e scegli «Aggiungi alla schermata Home»", "Tocca «Aggiungi»"]);
assert.equal(TPK_OPEN_SAFARI, "Apri questa pagina in Safari");

// iPhone and iPad in Safari: the guide, the arrow at the bottom on iPhone, at the top right on iPad (also «desktop site»).
assert.deepEqual(invite(UA.iphoneSafari), { kind: "ios-safari", steps: TPK_IOS_STEPS, openInSafari: null, arrow: "iphone" });
assert.equal(invite(UA.ipadSafari, { touch: 5 }).arrow, "ipad");
assert.equal(invite(UA.ipadDesktop, { touch: 5 }).kind, "ios-safari");
assert.equal(invite(UA.ipadDesktop, { touch: 5 }).arrow, "ipad");
// Another browser or an app on iPhone: open in Safari first, then the same steps, never an arrow.
for (const [ua, gesture] of [[UA.iphoneChrome, /apri Safari e incollalo/], [UA.iphoneFirefox, /apri Safari e incollalo/], [UA.instagram, /«Apri nel browser»/],
  [UA.facebook, /«Apri nel browser esterno»/], [UA.webview, /«Apri in Safari»/]]) {
  const result = invite(ua);
  assert.equal(result.kind, "ios-altro", ua);
  assert.equal(result.steps, TPK_IOS_STEPS);
  assert.equal(result.arrow, null);
  assert.match(result.openInSafari, gesture, ua);
}
// Android and computer with the install event: the browser's own window.
assert.equal(invite(UA.pixelChrome, { prompt: true }).kind, "prompt");
assert.equal(invite(UA.samsung, { prompt: true }).kind, "prompt");
assert.equal(invite(UA.desktopChrome, { prompt: true }).kind, "prompt");
assert.equal(invite(UA.desktopEdge, { prompt: true }).kind, "prompt");
// Without the event: the menu steps on Android, nothing on a computer (installed already, or not offered now).
assert.deepEqual(invite(UA.pixelChrome).steps, STEPS.android.chrome);
assert.equal(invite(UA.desktopChrome).kind, "none");
// Firefox on Android: menu ⋮ → Installa; Safari on Mac: Archivio (File) → Aggiungi al Dock; Firefox on a computer: nothing.
assert.equal(invite(UA.androidFirefox).kind, "steps");
assert.match(invite(UA.androidFirefox).steps.join(" "), /⋮.*«Installa»/);
assert.equal(invite(UA.macSafari).kind, "steps");
assert.match(invite(UA.macSafari).steps[0], /Archivio \(File\).*«Aggiungi al Dock»/);
assert.equal(invite(UA.desktopFirefox).kind, "none");
// An app on Android: open the link in the browser.
assert.deepEqual(invite(UA.whatsappAndroid), { kind: "inapp", steps: OPEN_BROWSER, openInSafari: null, arrow: null });

// 4. The box: one at a time, the same 7 days, sizes of the controls, the arrow still for who prefers less motion.
const prompt = fs.readFileSync("components/install-prompt.tsx", "utf8");
const box = fs.readFileSync("components/install/tpk-invite.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
assert.match(prompt, /if \(tpk\) \{[\s\S]*?!free \|\| rating \|\| closed[\s\S]*?<TpkInviteBox/, "the variant waits for the statistics bar, the welcome screen and the question of the Home");
assert.match(prompt, /const waiting = !!guide && !tpk &&/, "no first gesture for the variant");
assert.match(prompt, /const TpkInviteBox = dynamic\(\(\) => import\("@\/components\/install\/tpk-invite"\)/, "its own chunk, only for who arrives from TPK");
assert.match(prompt, /onClose=\{\(\) => \{ setClosed\(true\); dismissInvite\(\);/, "«Non ora» and ✕: the same 7 days");
assert.match(box, /aria-label="Chiudi"[\s\S]{0,120}h-11 w-11/, "✕ at least 44 px");
assert.match(box, />\s*Non ora\s*</);
assert.match(box, />\s*Ho capito\s*</);
assert.match(box, /rounded-t-2xl border border-primary\/70 bg-card/, "cream, thin bordeaux border, top corners rounded");
assert.match(box, /bottom-\[calc\(80px\+env\(safe-area-inset-bottom,0px\)\)\]/, "above the bottom bar, never over it");
assert.match(box, /font-serif/, "the title in EB Garamond");
assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*\.tpk-freccia \{ animation/);
assert.ok(!/withoutTpkMark|copyLink\(\)/.test(box) || /copyLink\(withoutTpkMark\(window\.location\.href\)\)/.test(box), "«Copia il link» without da=tpk");

// 5. The edition: 2024 for who arrives from TPK without a choice, no welcome screen; a choice already made stays.
const edition = fs.readFileSync("components/edition/edition-provider.tsx", "utf8");
assert.match(edition, /if \(!stored\.chosen && tpkArrived\(\)\) \{\s*write\("2024"\);\s*stored = \{ edition: "2024", chosen: true \};/);

// 6. The statistics: the origin «Total Party Kill», the five events of the invite from any public page, with the device only.
assert.ok(ORIGINS.includes("tpk"));
const own = "ilgrimorio.app";
assert.equal(originOf("", "?da=tpk", own), "tpk");
assert.equal(originOf("https://www.instagram.com/", "?da=tpk", own), "tpk", "the mark wins over the referrer");
assert.equal(originOf("https://www.totalpartykill.app/evoca", "", own), "tpk");
assert.equal(originOf("https://totalpartykill.app.example.com/", "", own), "altro");
assert.equal(originOf("", "?da=bio", own), "instagram", "the bio of Instagram as before");
assert.deepEqual([...TPK_INVITE_EVENTS], ["tpk_invite_shown", "tpk_invite_tapped", "tpk_invite_guide", "tpk_invite_installed", "tpk_invite_closed"]);
for (const name of TPK_INVITE_EVENTS) assert.ok(ANALYTICS_EVENTS.includes(name));
const event = (name, props = {}) => ({ event: name, id: randomUUID(), view: randomUUID(), session: randomUUID(), path: "/", test: false, source: "direct", activeSeconds: 0, scrollPercent: 0, ...props });
for (const name of TPK_INVITE_EVENTS) for (const path of ["/", "/mostro/drago-rosso-adulto", "/grimorio", "/talenti"]) {
  const parsed = parseAnalyticsInput(event(name, { path, device: "iphone", origin: "tpk" }));
  assert.ok(parsed, `${name} on ${path}`);
  assert.equal(parsed.device, "iphone");
  assert.equal(parsed.origin, undefined, "the origin rides with the page view only");
}
assert.equal(parseAnalyticsInput(event("tpk_invite_shown", { path: "/admin" })), undefined, "never from the reserved area");
assert.equal(parseAnalyticsInput(event("page_view", { origin: "tpk" })).origin, "tpk");
const provider = fs.readFileSync("components/analytics-provider.tsx", "utf8");
assert.match(provider, /tpkArrived\(\) \? `\?da=\$\{TPK_ARRIVAL\}` : window\.location\.search/);
assert.match(provider, /name\.startsWith\("tpk_invite_"\)\) void send\(name, \{ device \}\)/);
const page = fs.readFileSync("app/admin/statistiche/page.tsx", "utf8");
assert.match(page, /\{ key: "tpk", label: "Total Party Kill", value: data\.origins\.tpk \}/);
assert.match(fs.readFileSync("components/statistics/insights-more.tsx", "utf8"), /<InstallInvite counts=\{invite\} \/>\s*<TpkInvite counts=\{tpkInvite\} \/>/, "next to «Installala»");

console.log("invito-tpk: ok");
