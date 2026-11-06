import { test, expect, devices } from "@playwright/test";
import { dispatched, invite, shownAtOnce, tpkVisitor, UA } from "./invito-tpk.mjs";

// PROMPT 70, iPhone and iPad in WebKit (the engine of every browser on iOS): who arrives from Total Party Kill sees the
// invite at once; «Installa» turns it into the guide in 3 steps with the arrow towards Condividi (at the bottom on
// iPhone, at the top right on iPad), «Ho capito» closes it; in Chrome for iOS or inside an app, «Apri questa pagina in
// Safari» first, with «Copia il link» of the address without da=tpk. Not a real iPhone: Safari's own bar and menu are
// not on the screen of the test. INVITO_IPHONE_ENGINE=chromium runs the same checks where WebKit is not installed.
const engine = process.env.INVITO_IPHONE_ENGINE ?? "webkit";
test.use(engine === "webkit" ? { browserName: "webkit", launchOptions: {} } : { browserName: engine });
const plainHttp = engine === "webkit";
const phone = (name, extra = {}) => {
  const device = { ...devices[name], ...extra };
  delete device.defaultBrowserType;
  // Firefox and Chromium have no «isMobile» like WebKit; the size, touch and user agent are what the page reads.
  if (engine !== "webkit" && engine !== "chromium") delete device.isMobile;
  return device;
};
const base = () => test.info().project.use.baseURL;
const STEPS = ["Tocca Condividi ⬆ nella barra di Safari", "Scorri e scegli «Aggiungi alla schermata Home»", "Tocca «Aggiungi»"];

test("iPhone Safari: «Installa» opens the guide in 3 steps, the arrow down at the middle; «Ho capito» closes it", async ({ browser }) => {
  test.setTimeout(90_000);
  const { context, page } = await tpkVisitor(browser, { ...phone("iPhone 13", { userAgent: UA.iphoneSafari }), baseURL: base() }, { plainHttp });
  await shownAtOnce(page, "/mostro/aboleth", "ios-safari");
  const nav = await page.locator("[data-bottom-nav]").boundingBox();
  await invite(page).getByRole("button", { name: "Installa", exact: true }).click();
  await expect(invite(page)).toHaveAttribute("data-tpk-guide", "open");
  const steps = invite(page).locator("[data-tpk-step]");
  await expect(steps).toHaveCount(3);
  for (const [index, text] of STEPS.entries()) await expect(steps.nth(index)).toContainText(text);
  const arrow = invite(page).locator("[data-tpk-arrow='iphone']");
  await expect(arrow).toBeVisible();
  const box = await arrow.boundingBox();
  const width = page.viewportSize().width;
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(4);
  // The guide is the bottom of the box, above the bottom bar, which has not moved.
  const region = await invite(page).getByRole("region").boundingBox();
  expect(region.y + region.height).toBeLessThanOrEqual(nav.y + 1);
  expect(await page.locator("[data-bottom-nav]").boundingBox()).toEqual(nav);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(invite(page).locator("[data-tpk-arrow='ipad']")).toHaveCount(0);
  await invite(page).getByRole("button", { name: "Ho capito" }).click();
  await expect(invite(page)).toHaveCount(0);
  // Handed to the statistics provider; what it sends (origin «tpk», device) is checked in e2e/invito-tpk.spec.mjs.
  await expect.poll(() => dispatched(page)).toEqual(["tpk_invite_shown", "tpk_invite_tapped", "tpk_invite_guide"]);
  await context.close();
});

test("iPad Safari: the arrow at the top right, towards Condividi", async ({ browser }) => {
  const { context, page } = await tpkVisitor(browser, { ...phone("iPad Pro 11"), baseURL: base() }, { plainHttp });
  await shownAtOnce(page, "/grimorio", "ios-safari");
  await invite(page).getByRole("button", { name: "Installa", exact: true }).click();
  const arrow = page.locator("[data-tpk-arrow='ipad']");
  await expect(arrow).toBeVisible();
  const box = await arrow.boundingBox();
  expect(box.x).toBeGreaterThan(page.viewportSize().width * 0.75);
  expect(box.y).toBeLessThan(80);
  await expect(page.locator("[data-tpk-arrow='iphone']")).toHaveCount(0);
  await context.close();
});

for (const [name, userAgent, gesture] of [["Chrome per iOS", UA.iosChrome, /apri Safari e incollalo/], ["Instagram", UA.instagram, /«Apri nel browser»/]]) {
  test(`iPhone, ${name}: «Installa» says «Apri questa pagina in Safari» first, with «Copia il link» without da=tpk`, async ({ browser }) => {
    const { context, page } = await tpkVisitor(browser, { ...phone("iPhone 13", { userAgent }), baseURL: base() }, { plainHttp });
    if (engine === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await shownAtOnce(page, "/mostro/aboleth", "ios-altro");
    await invite(page).getByRole("button", { name: "Installa", exact: true }).click();
    const open = invite(page).locator("[data-tpk-open-safari]");
    await expect(open).toContainText("Apri questa pagina in Safari");
    await expect(open).toContainText(gesture);
    await expect(invite(page).locator("[data-tpk-step]")).toHaveCount(3);
    await expect(invite(page).locator("[data-tpk-arrow]")).toHaveCount(0);
    // What «Copia il link» copies: the address of the page without the mark.
    await page.evaluate(() => {
      window.__copied = null;
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copied = text; } } });
    });
    await invite(page).getByRole("button", { name: "Copia il link" }).click();
    await expect(invite(page).getByText("Link copiato")).toBeVisible();
    expect(await page.evaluate(() => window.__copied)).toBe(`${base()}/mostro/aboleth`);
    await context.close();
  });
}

test("iPhone: the app installed, nothing; who prefers less motion sees the arrow still", async ({ browser }) => {
  const installed = await tpkVisitor(browser, { ...phone("iPhone 13", { userAgent: UA.iphoneSafari }), baseURL: base() }, { installed: true, plainHttp });
  await installed.page.goto("/mostro/aboleth?da=tpk");
  await installed.page.waitForTimeout(2500);
  await expect(invite(installed.page)).toHaveCount(0);
  await installed.context.close();

  const still = await tpkVisitor(browser, { ...phone("iPhone 13", { userAgent: UA.iphoneSafari }), reducedMotion: "reduce", baseURL: base() }, { plainHttp });
  await shownAtOnce(still.page, "/mostro/aboleth", "ios-safari");
  await invite(still.page).getByRole("button", { name: "Installa", exact: true }).click();
  const arrow = still.page.locator("[data-tpk-arrow='iphone'] svg");
  await expect(arrow).toHaveCSS("animation-name", "none");
  await still.context.close();
  const moving = await tpkVisitor(browser, { ...phone("iPhone 13", { userAgent: UA.iphoneSafari }), baseURL: base() }, { plainHttp });
  await shownAtOnce(moving.page, "/mostro/aboleth", "ios-safari");
  await invite(moving.page).getByRole("button", { name: "Installa", exact: true }).click();
  await expect(moving.page.locator("[data-tpk-arrow='iphone'] svg")).toHaveCSS("animation-name", "tpk-freccia");
  await moving.context.close();
});
