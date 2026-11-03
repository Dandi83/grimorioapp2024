import { test, expect, devices } from "./fixtures.mjs";
import { barBox, fakeVisualViewport, movedBarComesBack } from "./barra-scenario.mjs";

// PROMPT 56: Android (Chrome, 65% of the visitors), Pixel 5 at 412 × 915 in Chromium, browser and app installed («standalone»):
// the bar stays at the bottom while a long list scrolls, and a bar moved after the keyboard comes back with the next scroll.
const PIXEL = { ...devices["Pixel 5"], viewport: { width: 412, height: 915 } };
delete PIXEL.defaultBrowserType;
const base = () => test.info().project.use.baseURL;

for (const path of ["/", "/bestiario", "/grimorio", "/mostro/drago-nero-adulto"]) {
  test(`${path}, Android 412 × 915: the bar stays at the bottom down the page and back; no bounce`, async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ ...PIXEL, baseURL: base() });
    await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator("[data-bottom-nav]")).toBeVisible();
    const start = await barBox(page);
    expect(start.bottom).toBe(915);
    expect(await page.evaluate(() => [getComputedStyle(document.documentElement).overscrollBehaviorY, getComputedStyle(document.body).overscrollBehaviorY])).toEqual(["none", "none"]);
    const more = page.getByRole("button", { name: /^Mostra altri/ });
    while (await more.count()) await more.click();
    const seen = [];
    for (let i = 0; i < 40; i++) {
      const end = await page.evaluate(() => { window.scrollBy(0, 700); return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1; });
      seen.push(await barBox(page));
      if (end) break;
    }
    for (let i = 0; i < 40; i++) {
      const top = await page.evaluate(() => { window.scrollBy(0, -900); return window.scrollY <= 0; });
      seen.push(await barBox(page));
      if (top) break;
    }
    expect(seen.length, "measured down and up (a short page gives two)").toBeGreaterThanOrEqual(2);
    for (const position of seen) expect(position).toEqual(start);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no side scroll").toBe(true);
    await context.close();
  });
}

for (const mode of ["Chrome", "app installata"]) {
  test(`/bestiario, Android (${mode}): the bar moved after the keyboard comes back with the next scroll`, async ({ browser }) => {
    const context = await browser.newContext({ ...PIXEL, baseURL: base() });
    await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
    if (mode === "app installata") await context.addInitScript(() => {
      const query = window.matchMedia.bind(window);
      window.matchMedia = media => (/display-mode:\s*standalone/.test(media) ? { ...query("(min-width: 0px)"), media, matches: true } : query(media));
    });
    await context.addInitScript(fakeVisualViewport);
    const page = await context.newPage();
    await page.goto("/bestiario");
    await movedBarComesBack(page, 915);
    await context.close();
  });
}
