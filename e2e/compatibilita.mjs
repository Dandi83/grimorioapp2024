import { spawn } from "node:child_process";
import { test, expect, devices } from "@playwright/test";

// Every browser engine (Chromium, WebKit, Firefox) with phone and computer profiles, and the user agents of the
// browsers that cannot be run here (Samsung Internet, Huawei, Mi Browser, the browsers inside WhatsApp,
// Instagram, Telegram): the right invite to install the app, no sideways scroll, Home, Incantesimi, a spell and
// a creature readable, and the pages already opened readable offline. Not a real phone: what each browser shows
// in its own menus is not checked here. COMPAT_SHOTS=<folder> saves a picture of every invite.
const SHOTS = process.env.COMPAT_SHOTS;
const port = 3300;
const base = `http://127.0.0.1:${port}`;

const UA = {
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
  iosChromeOld: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1",
  iosEdge: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/124.2478.71 Mobile/15E148 Safari/605.1.15",
  iosFirefox: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  huawei: "Mozilla/5.0 (Linux; Android 12; HarmonyOS; NOH-NX9; HMSCore 6.13.0.302) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Mobile Safari/537.36",
  mi: "Mozilla/5.0 (Linux; U; Android 13; it-it; 2201117TG Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.10.1.3-gn",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
  whatsapp: "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.9.78",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.31.92 (iPhone14,5; iOS 17_4; it_IT; it; scale=3.00; 1170x2532; 600000000)",
  telegram: "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Telegram-Android/10.12.0 (Google Pixel 7; Android 14; SDK 34; HIGH)",
};
const PHONE_FIREFOX = { viewport: { width: 412, height: 839 }, userAgent: UA.firefoxAndroid };

/**
 * expect: the invite («steps», «button», «inapp», «open-safari», «none»); text: in the invite; bip: Chromium's
 * install event, sent by hand (headless browsers never send it); pages: the layout check on this profile.
 */
const SCENARIOS = [
  { name: "iPhone · Safari", engine: "webkit", device: devices["iPhone 13"], expect: "steps", text: /Condividi \(il quadrato con la freccia\)/, pages: true },
  { name: "iPhone · Chrome", engine: "webkit", device: { ...devices["iPhone 13"], userAgent: UA.iosChrome }, expect: "steps", text: /Condividi in alto a destra/ },
  { name: "iPhone · Edge", engine: "webkit", device: { ...devices["iPhone 13"], userAgent: UA.iosEdge }, expect: "steps", text: /⋯ in basso, poi Condividi/ },
  { name: "iPhone · Firefox", engine: "webkit", device: { ...devices["iPhone 13"], userAgent: UA.iosFirefox }, expect: "steps", text: /☰ in basso, poi Condividi/ },
  { name: "iPhone iOS 16.1 · Chrome", engine: "webkit", device: { ...devices["iPhone 13"], userAgent: UA.iosChromeOld }, expect: "open-safari", text: /da Safari/ },
  { name: "iPad · Safari", engine: "webkit", device: devices["iPad Pro 11"], expect: "steps", text: /Condividi/, pages: true },
  { name: "Pixel 7 · Chrome", engine: "chromium", device: devices["Pixel 7"], expect: "steps", text: /Installa app/, bip: true, pages: true, offline: true },
  { name: "Galaxy S9+ · Chrome", engine: "chromium", device: devices["Galaxy S9+"], expect: "steps", text: /Installa app/, pages: true },
  { name: "Galaxy · Samsung Internet", engine: "chromium", device: { ...devices["Galaxy S9+"], userAgent: UA.samsung }, expect: "steps", text: /Aggiungi pagina a/, bip: true },
  { name: "Huawei · Huawei Browser", engine: "chromium", device: { ...devices["Pixel 7"], userAgent: UA.huawei }, expect: "steps", text: /Aggiungi a» → «Schermata Home/ },
  { name: "Xiaomi · Mi Browser", engine: "chromium", device: { ...devices["Pixel 7"], userAgent: UA.mi }, expect: "steps", text: /Aggiungi a schermata Home/ },
  { name: "Android · Firefox", engine: "firefox", device: PHONE_FIREFOX, expect: "steps", text: /Aggiungi alla schermata Home/, pages: true, offline: true },
  { name: "WhatsApp (Android)", engine: "chromium", device: { ...devices["Pixel 7"], userAgent: UA.whatsapp }, expect: "inapp", text: /apri il link nel browser/ },
  { name: "Instagram (iPhone)", engine: "webkit", device: { ...devices["iPhone 13"], userAgent: UA.instagram }, expect: "inapp", text: /apri il link nel browser/ },
  { name: "Telegram (Android)", engine: "chromium", device: { ...devices["Pixel 7"], userAgent: UA.telegram }, expect: "inapp", text: /apri il link nel browser/ },
  { name: "Computer · Chrome", engine: "chromium", device: devices["Desktop Chrome"], expect: "none", bip: true, pages: true },
  { name: "Computer · Firefox", engine: "firefox", device: devices["Desktop Firefox"], expect: "none", pages: true },
  { name: "Mac · Safari", engine: "webkit", device: devices["Desktop Safari"], expect: "steps", text: /Archivio scegli «Aggiungi al Dock»/, pages: true },
];

const PAGES = [
  { path: "/", heading: /./ },
  { path: "/grimorio", heading: /Incantesimi/ },
  { path: "/spell/dardo-incantato", heading: /Dardo Incantato/i },
  { path: "/mostro/aboleth", heading: /Aboleth/i },
];

let server;
async function startServer() {
  server = spawn("npx", ["next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", env: process.env, detached: true });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(base + "/")).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("server did not start");
}
async function stopServer() {
  if (!server) return;
  const stopping = server;
  server = undefined;
  const exited = new Promise(resolve => stopping.once("exit", resolve));
  try { process.kill(-stopping.pid, "SIGKILL"); } catch { /* already stopped */ }
  if (stopping.exitCode === null && stopping.signalCode === null) await exited;
}

async function open(browser, scenario, init) {
  const device = { ...scenario.device };
  delete device.defaultBrowserType;
  // Firefox has no «mobile» emulation: the size and the user agent of the phone only.
  if (scenario.engine === "firefox") { delete device.isMobile; delete device.hasTouch; }
  const context = await browser.newContext({ ...device, baseURL: base, serviceWorkers: "allow" });
  await context.addInitScript(() => { try { if (!localStorage.getItem("grimorio.edizione")) localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
  if (init) await context.addInitScript(init);
  // WebKit applies «upgrade-insecure-requests» also to 127.0.0.1 (Chromium and Firefox treat it as secure): the test
  // server is plain http, so the directive is taken off here. The site is https: in production nothing changes.
  // Requests routed this way skip the service worker: offline is checked on Chromium and Firefox only.
  if (scenario.engine === "webkit") {
    await context.route(/^http:\/\/127\.0\.0\.1:3300\//, async route => {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      if (headers["content-security-policy"]) headers["content-security-policy"] = headers["content-security-policy"].replace(/upgrade-insecure-requests;?\s*/, "");
      await route.fulfill({ response, headers });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => {
    // WebKit with the route above: a link prefetch (?_rsc=) cut short by the next navigation is reported as an
    // «access control» error of the routed fetch. Only there; any other error counts.
    if (scenario.engine === "webkit" && /\?_rsc=\S* due to access control checks/.test(String(error))) return;
    errors.push(String(error));
  });
  return { context, page, errors };
}

const invite = page => page.locator("[data-install-prompt]");

async function sendInstallEvent(page) {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => { window.__installPrompted = true; };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });
}

/** The invite, the pages and the offline copy of every profile of one engine; the server stops at the end. */
async function runScenarios(browser, scenarios, report) {
  const kept = [];
  for (const scenario of scenarios) {
    const { context, page, errors } = await open(browser, scenario);
    await page.goto("/");
    // PROMPT 43: the invite comes with the first gesture of the person, never with a timer.
    if (scenario.expect === "none") {
      await page.waitForTimeout(500);
      await page.keyboard.press("Shift");
      await page.waitForTimeout(4500);
      await expect(invite(page), scenario.name).toHaveCount(0);
    } else {
      await expect(async () => {
        await page.keyboard.press("Shift");
        await expect(invite(page)).toBeVisible({ timeout: 1000 });
      }, scenario.name).toPass({ timeout: 15_000 });
      await expect(invite(page), scenario.name).toHaveAttribute("data-install-prompt", scenario.expect, { timeout: 10_000 });
      await expect(invite(page), scenario.name).toContainText(scenario.text);
      // Above the bottom bar on the phone, never over it.
      const bar = page.getByRole("navigation", { name: "Navigazione principale" });
      if (await bar.isVisible()) {
        const [card, nav] = await Promise.all([invite(page).locator("[role=region]").boundingBox(), bar.boundingBox()]);
        expect(card.y + card.height, `${scenario.name}: invite above the bar`).toBeLessThanOrEqual(nav.y + 1);
      }
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${scenario.name.replace(/[^\w]+/g, "-")}.png` });
    }
    const shown = scenario.expect === "none" ? "nessun invito" : await invite(page).innerText();
    if (scenario.bip) {
      await sendInstallEvent(page);
      await expect(invite(page), `${scenario.name}: button`).toHaveAttribute("data-install-prompt", "button");
      await invite(page).getByRole("button", { name: "Installa l'app" }).click();
      expect(await page.evaluate(() => window.__installPrompted)).toBe(true);
      await expect(invite(page)).toHaveCount(0);
    }
    report.push(`${scenario.name}: ${shown.replace(/\s+/g, " ").trim()}${scenario.bip ? " | con l'evento di Chrome: pulsante «Installa l'app»" : ""}`);

    if (scenario.pages) {
      for (const { path, heading } of PAGES) {
        await page.goto(path);
        const title = page.getByRole("heading", { level: 1 }).first();
        await expect(title, `${scenario.name} ${path}`).toBeVisible();
        await expect(title).toHaveText(heading);
        const [scrollWidth, width, fontSize] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, parseFloat(getComputedStyle(document.body).fontSize)]);
        expect(scrollWidth, `${scenario.name} ${path}: no sideways scroll`).toBeLessThanOrEqual(width + 1);
        expect(fontSize, `${scenario.name} ${path}: readable text`).toBeGreaterThanOrEqual(14);
      }
      // The card text is there, not only the title.
      await page.goto("/spell/dardo-incantato");
      await expect(page.locator("main")).toContainText(/dardi/i);
    }
    expect(errors, `${scenario.name}: no page errors`).toEqual([]);
    if (scenario.offline) {
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker?.controller), { timeout: 20_000, message: `${scenario.name}: service worker` }).toBe(true);
      // Visited again under the service worker: saved for later.
      await page.goto("/spell/dardo-incantato");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dardo Incantato/i);
      kept.push({ scenario, context, page });
    } else {
      await context.close();
    }
  }
  // Offline: the server stops, the pages opened before still read, with the «copia salvata» notice.
  await stopServer();
  for (const { scenario, context, page } of kept) {
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 }), `${scenario.name} offline`).toContainText(/Dardo Incantato/i);
    await expect(page.getByRole("status").filter({ hasText: "Sei offline" }), `${scenario.name} offline notice`).toBeVisible();
    report.push(`${scenario.name}: offline, la scheda già aperta si legge con l'avviso «copia salvata»`);
    await context.close();
  }
}

/**
 * The test of one engine (e2e/compatibilita-*.spec.mjs): the browser comes from the configuration (Chromium) or
 * from browserName, set at the top of the WebKit and Firefox files.
 */
export function compatibilityTest(engine) {
  test(`install invite, layout and offline: ${engine}`, async ({ browser }) => {
    test.setTimeout(600_000);
    const report = [];
    await startServer();
    try {
      await runScenarios(browser, SCENARIOS.filter(scenario => scenario.engine === engine), report);
      if (engine !== "webkit") return;
      await startServer();
      // «Chiudi»: no invite for 7 days; already installed: never.
      const iphone = SCENARIOS[0];
      let { context, page } = await open(browser, iphone);
      await page.goto("/");
      // The first gesture once the page is ready (a key pressed before it is lost, as for a person).
      await expect(async () => {
        await page.keyboard.press("Shift");
        await expect(invite(page)).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
      await invite(page).getByRole("button", { name: "Chiudi" }).click();
      await expect(invite(page)).toHaveCount(0);
      const until = Number(await page.evaluate(() => localStorage.getItem("grimorio-install-dismissed")));
      expect(Math.round((until - Date.now()) / 864e5)).toBe(7);
      await page.reload();
      await page.keyboard.press("Shift");
      await page.waitForTimeout(2500);
      await expect(invite(page)).toHaveCount(0);
      await context.close();
      ({ context, page } = await open(browser, iphone, () => Object.defineProperty(navigator, "standalone", { get: () => true })));
      await page.goto("/");
      await page.keyboard.press("Shift");
      await page.waitForTimeout(2500);
      await expect(invite(page)).toHaveCount(0);
      await page.goto("/installa");
      await expect(page.locator("[data-install-here]")).toHaveAttribute("data-install-here", "installed");
      await context.close();
      report.push("iPhone · Safari: «Chiudi» nasconde l'invito per 7 giorni; app già installata: nessun invito");

      // /installa from /info: the browser in use first, every browser below.
      ({ context, page } = await open(browser, SCENARIOS[1]));
      await page.goto("/info");
      await page.getByRole("link", { name: /Installa l’app/ }).click();
      await expect(page).toHaveURL(/\/installa$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Installa l’app");
      await expect(page.locator("[data-install-here]")).toHaveAttribute("data-install-here", "steps");
      await expect(page.locator("[data-install-here]")).toContainText("Chrome su iPhone e iPad");
      for (const name of ["iPhone e iPad", "Android", "Computer"]) await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
      await expect(invite(page)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await context.close();
      ({ context, page } = await open(browser, SCENARIOS.find(scenario => scenario.name === "Instagram (iPhone)")));
      await page.goto("/installa");
      await expect(page.locator("[data-install-here]")).toHaveAttribute("data-install-here", "inapp");
      await expect(page.getByRole("button", { name: "Copia il link" })).toBeVisible();
      await context.close();
    } finally {
      await stopServer();
      console.log(`[compatibilita ${engine}]\n${report.join("\n")}`);
    }
  });
}
