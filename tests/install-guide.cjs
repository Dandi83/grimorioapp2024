// The invite to install the app, browser by browser (lib/install-guide.ts): button where Chromium offers it,
// the steps of the browser's menu elsewhere, «open in the browser» inside WhatsApp, Instagram and the others.
const assert = require('node:assert/strict');
const {detectDevice, installGuide, STEPS, SHORT, OPEN_BROWSER, OPEN_SAFARI} = require('../lib/install-guide.ts');

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  iphoneChromeOld: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/124.2478.71 Mobile/15E148 Safari/605.1.15',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15',
  iphoneOpera: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 OPT/4.6.0',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  pixelChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  huawei: 'Mozilla/5.0 (Linux; Android 12; HarmonyOS; NOH-NX9; HMSCore 6.13.0.302) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Mobile Safari/537.36',
  mi: 'Mozilla/5.0 (Linux; U; Android 13; it-it; 2201117TG Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.10.1.3-gn',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0',
  androidEdge: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0.2478.64',
  whatsappAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.9.78',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.31.92 (iPhone14,5; iOS 17_4; it_IT; it; scale=3.00; 1170x2532; 600000000)',
  facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0.0.37.104;FBBV/600000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBLC/it_IT]',
  messenger: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/450.0.0.39.109;]',
  telegram: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Telegram-Android/10.12.0 (Google Pixel 7; Android 14; SDK 34; HIGH)',
  tiktok: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 musical_ly_2023405030 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.5.3 ByteLocale/it-IT',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  desktopEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  macSafari16: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
};
const guide = (ua, touch = 0) => installGuide(detectDevice(ua, touch));

// iPhone and iPad: the steps of the Share button of each browser.
let g = guide(UA.iphoneSafari);
assert.equal(g.kind, 'steps'); assert.equal(g.label, 'Safari su iPhone e iPad'); assert.deepEqual(g.steps, STEPS.ios.safari);
assert.match(g.steps[0], /Condividi/); assert.match(g.steps[1], /Aggiungi alla schermata Home/);
assert.deepEqual(guide(UA.iphoneChrome).steps, STEPS.ios.chrome, 'Chrome since iOS 16.4');
assert.match(STEPS.ios.chrome[0], /in alto a destra/, 'Chrome: Share next to the address');
assert.equal(guide(UA.iphoneChromeOld).kind, 'open-safari', 'before iOS 16.4 only Safari adds to the Home screen');
assert.deepEqual(guide(UA.iphoneChromeOld).steps, OPEN_SAFARI);
assert.deepEqual(guide(UA.iphoneEdge).steps, STEPS.ios.edge);
assert.deepEqual(guide(UA.iphoneFirefox).steps, STEPS.ios.firefox);
assert.deepEqual(guide(UA.iphoneOpera).steps, STEPS.ios.opera);
assert.equal(detectDevice(UA.ipadDesktop, 5).platform, 'ios', 'an iPad asking for the desktop site');
assert.equal(guide(UA.ipadDesktop, 5).kind, 'steps');
for (const g of [guide(UA.iphoneSafari), guide(UA.iphoneChrome)]) assert.equal(g.promptFirst, false);

// Android: button first on Chromium, the menu steps for every browser.
g = guide(UA.pixelChrome);
assert.deepEqual([g.kind, g.promptFirst, g.label], ['steps', true, 'Chrome su Android']); assert.deepEqual(g.steps, STEPS.android.chrome);
assert.deepEqual([guide(UA.samsung).promptFirst, guide(UA.samsung).steps], [true, STEPS.android.samsung]);
assert.deepEqual([guide(UA.androidEdge).promptFirst, guide(UA.androidEdge).steps], [true, STEPS.android.edge]);
for (const [ua, steps, label] of [[UA.huawei, STEPS.android.huawei, 'Huawei Browser'], [UA.mi, STEPS.android.mi, 'Mi Browser'], [UA.androidFirefox, STEPS.android.firefox, 'Firefox']]) {
  g = guide(ua);
  assert.deepEqual([g.kind, g.promptFirst, g.label], ['steps', false, `${label} su Android`], label); assert.deepEqual(g.steps, steps);
}

// Inside other apps: open the link in the browser.
for (const [ua, name] of [[UA.whatsappAndroid, 'WhatsApp'], [UA.instagram, 'Instagram'], [UA.facebook, 'Facebook'], [UA.messenger, 'Messenger'], [UA.telegram, 'Telegram'], [UA.tiktok, 'TikTok']]) {
  g = guide(ua);
  assert.deepEqual([g.kind, g.label], ['inapp', `Browser di ${name}`], name); assert.deepEqual(g.steps, OPEN_BROWSER);
}

// Computer: Chrome and Edge only with their event; Safari 17 «Aggiungi al Dock»; Firefox nothing.
assert.deepEqual([guide(UA.desktopChrome).kind, guide(UA.desktopChrome).promptFirst], ['button', true]);
assert.deepEqual([guide(UA.desktopEdge).kind, guide(UA.desktopEdge).label], ['button', 'Edge su computer']);
assert.equal(guide(UA.desktopFirefox).kind, 'none');
assert.deepEqual([guide(UA.macSafari).kind, guide(UA.macSafari).steps], ['steps', STEPS.desktop.safari]);
assert.match(STEPS.desktop.safari[0], /Archivio → «Aggiungi al Dock»/);
assert.equal(guide(UA.macSafari16).kind, 'none', 'Safari 16 cannot add to the Dock');

// The small invite says it in one line; the steps are on /installa.
assert.equal(guide(UA.iphoneSafari).short, SHORT.ios.safari);
assert.equal(guide(UA.huawei).short, SHORT.android.huawei);
assert.equal(guide(UA.instagram).short, 'Per installare l’app apri il link nel browser.');
for (const line of [...Object.values(SHORT.ios), ...Object.values(SHORT.android), ...Object.values(SHORT.desktop)]) assert.ok(line.length <= 90 && line.endsWith('.'), line);

// Every step ends with a full stop and is short enough for the small invite.
for (const list of [...Object.values(STEPS.ios), ...Object.values(STEPS.android), ...Object.values(STEPS.desktop), OPEN_BROWSER, OPEN_SAFARI]) {
  for (const step of list) { assert.match(step, /\.$/, step); assert.ok(step.length <= 140, step); }
}
console.log('install-guide: ok');
