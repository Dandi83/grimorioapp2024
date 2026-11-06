import { test, expect, devices } from "@playwright/test";
import { invite, LINE, sendInstallEvent, sent, shownAtOnce, tpkVisitor, UA } from "./invito-tpk.mjs";

// PROMPT 70, Android (Chromium) and computer: who arrives from Total Party Kill (?da=tpk) without the app installed sees
// the invite at once (no gesture), with «Installa» opening the browser's window; «Non ora» closes it for 7 days; the app
// installed, or a page without the mark, as before. The edition 2024 without the welcome screen for who had not chosen,
// the origin «Total Party Kill» and the events of the invite. Not a real phone: the browser's window is simulated.
const PIXEL = { ...devices["Pixel 7"] };
delete PIXEL.defaultBrowserType;
const DESKTOP = { ...devices["Desktop Chrome"] };
delete DESKTOP.defaultBrowserType;
const base = () => test.info().project.use.baseURL;

test("Android Chrome: invite at once, «Installa» opens the browser's window; origin and events «da TPK»; edition 2024 chosen", async ({ browser }) => {
  const { context, page, events } = await tpkVisitor(browser, { ...PIXEL, baseURL: base() });
  // Chromium's event once the page runs (headless browsers never send it), before any gesture.
  await shownAtOnce(page, "/mostro/aboleth", "prompt", { afterLoad: sendInstallEvent });
  expect(await page.evaluate(() => localStorage.getItem("grimorio.edizione"))).toBe("2024");
  await expect(page.locator("[data-first-launch]")).toHaveCount(0);
  await invite(page).getByRole("button", { name: "Installa", exact: true }).click();
  await expect(invite(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__installPrompted)).toBe(true);
  await expect.poll(() => sent(events).names).toEqual(["tpk_invite_shown", "tpk_invite_tapped", "tpk_invite_installed"]);
  expect(sent(events).origin).toBe("tpk");
  expect(events.filter(event => event.event.startsWith("tpk_invite_")).every(event => event.device === "android")).toBe(true);
  // A link shared from here is clean.
  expect(page.url()).toBe(`${base()}/mostro/aboleth`);
  await context.close();
});

test("Android: «Non ora» closes it for 7 days (the same reminder as «Installala»); the app installed: nothing", async ({ browser }) => {
  const { context, page, events } = await tpkVisitor(browser, { ...PIXEL, baseURL: base() });
  await page.goto("/grimorio?da=tpk");
  await sendInstallEvent(page);
  await expect(invite(page)).toHaveAttribute("data-tpk-invite", "prompt", { timeout: 15_000 });
  const close = invite(page).getByRole("button", { name: "Non ora" });
  const size = await close.boundingBox();
  expect(size.height).toBeGreaterThanOrEqual(44);
  const cross = await invite(page).getByRole("button", { name: "Chiudi" }).boundingBox();
  expect(Math.min(cross.width, cross.height)).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(invite(page)).toHaveCount(0);
  const until = Number(await page.evaluate(() => localStorage.getItem("grimorio-install-dismissed")));
  expect(until - Date.now()).toBeGreaterThan(6.9 * 864e5);
  await expect.poll(() => sent(events).names).toEqual(["tpk_invite_shown", "tpk_invite_closed"]);
  await page.goto("/mostro/aboleth?da=tpk");
  await sendInstallEvent(page);
  await page.waitForTimeout(2500);
  await expect(invite(page)).toHaveCount(0);
  await context.close();

  const installed = await tpkVisitor(browser, { ...PIXEL, baseURL: base() }, { installed: true });
  await installed.page.goto("/mostro/aboleth?da=tpk");
  await sendInstallEvent(installed.page);
  await installed.page.waitForTimeout(2500);
  await expect(invite(installed.page)).toHaveCount(0);
  await expect(installed.page).not.toHaveURL(/da=tpk/);
  await installed.context.close();
});

test("Without da=tpk: the usual invite, only after the first gesture; a choice of 2014 stays with da=tpk", async ({ browser }) => {
  const { context, page, events } = await tpkVisitor(browser, { ...PIXEL, baseURL: base() }, { edition: "2024" });
  await page.goto("/grimorio");
  await page.waitForTimeout(3000);
  await expect(invite(page)).toHaveCount(0);
  await expect(async () => {
    await page.evaluate(() => window.scrollBy(0, 80));
    await expect(invite(page)).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(invite(page)).toContainText("Aggiungi Il Grimorio.App");
  await expect(invite(page)).not.toHaveAttribute("data-install-prompt", "tpk");
  expect(sent(events).names).toEqual([]);
  expect(sent(events).origin).not.toBe("tpk");
  await context.close();

  const chosen = await tpkVisitor(browser, { ...PIXEL, baseURL: base() }, { edition: "2014" });
  await chosen.page.goto("/?da=tpk");
  await expect(invite(chosen.page)).toBeVisible({ timeout: 15_000 });
  expect(await chosen.page.evaluate(() => localStorage.getItem("grimorio.edizione"))).toBe("2014");
  await expect(chosen.page.getByRole("button", { name: /^Edizione 2014/ }).first()).toBeVisible();
  await chosen.context.close();
});

test("Home with da=tpk and no edition yet: no «Scegli l'edizione», the 2024, still changeable from the pill", async ({ browser }) => {
  const { context, page } = await tpkVisitor(browser, { ...PIXEL, baseURL: base() });
  await page.goto("/?da=tpk");
  await expect(invite(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-first-launch]")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("grimorio.edizione"))).toBe("2024");
  await invite(page).getByRole("button", { name: "Chiudi" }).click();
  await page.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" }).click();
  await page.getByRole("dialog", { name: "Scegli l’edizione" }).getByRole("button", { name: /Regole 2014/ }).click();
  expect(await page.evaluate(() => localStorage.getItem("grimorio.edizione"))).toBe("2014");
  await context.close();

  // The same Home without the mark: the welcome screen as before.
  const plain = await tpkVisitor(browser, { ...PIXEL, baseURL: base() });
  await plain.page.goto("/");
  await expect(plain.page.locator("[data-first-launch]")).toBeVisible({ timeout: 15_000 });
  await plain.context.close();
});

test("Android Firefox: «Installa» shows menu ⋮ → Installa; computer Chrome: the browser's window, nothing without it", async ({ browser }) => {
  const firefox = await tpkVisitor(browser, { viewport: { width: 412, height: 839 }, userAgent: UA.firefoxAndroid, hasTouch: true, isMobile: true, baseURL: base() });
  await shownAtOnce(firefox.page, "/mostro/aboleth", "steps");
  await invite(firefox.page).getByRole("button", { name: "Installa", exact: true }).click();
  await expect(invite(firefox.page).locator("[data-tpk-steps]")).toContainText("«Installa»");
  await expect(invite(firefox.page).locator("[data-tpk-steps]")).toContainText("⋮");
  await invite(firefox.page).getByRole("button", { name: "Ho capito" }).click();
  await expect(invite(firefox.page)).toHaveCount(0);
  await firefox.context.close();

  const desktop = await tpkVisitor(browser, { ...DESKTOP, baseURL: base() });
  await desktop.page.goto("/mostro/aboleth?da=tpk");
  await desktop.page.waitForTimeout(2500);
  await expect(invite(desktop.page)).toHaveCount(0);
  await sendInstallEvent(desktop.page);
  await expect(invite(desktop.page)).toHaveAttribute("data-tpk-invite", "prompt");
  await expect(invite(desktop.page)).toContainText(LINE);
  await expect(desktop.page).not.toHaveURL(/da=tpk/);
  await desktop.context.close();
});

test("Never two boxes: with the statistics bar open the invite waits, and comes when the bar is closed", async ({ browser }) => {
  const context = await browser.newContext({ ...PIXEL, baseURL: base() });
  let consent = null;
  await context.route("**/api/analytics", route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent } });
    const body = JSON.parse(request.postData() || "{}");
    if (body.consent) consent = body.consent;
    return route.fulfill({ json: { ok: true, stored: true, consent } });
  });
  const page = await context.newPage();
  await page.goto("/mostro/aboleth?da=tpk");
  await sendInstallEvent(page);
  await expect(page.locator("[data-statistics-bar]")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await expect(invite(page)).toHaveCount(0);
  await page.locator("[data-statistics-bar]").getByRole("button", { name: "Ok" }).click();
  await expect(invite(page)).toHaveAttribute("data-tpk-invite", "prompt");
  await context.close();
});
