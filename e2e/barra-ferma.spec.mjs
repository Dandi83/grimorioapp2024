import { test, expect, devices } from "@playwright/test";

// PROMPT 23: the bottom bar stays at the bottom while a long list scrolls down and up, slowly and fast, in WebKit (the
// engine of every browser on iPhone) at 390 × 844; the last row of the list stays readable above it; on a computer
// there is no bar, as before. Not a real iPhone: Safari's toolbar, the app installed on the Home screen and the iOS
// bug of the shifted visible area cannot be reproduced here (tests/viewport-anchor.cjs checks the computed move).
test.use({ browserName: "webkit", launchOptions: {} });
const IPHONE = { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } };
delete IPHONE.defaultBrowserType;
const base = () => test.info().project.use.baseURL;
/**
 * The test server is plain http: WebKit follows «upgrade-insecure-requests» (CSP) and HSTS of the site and asks its
 * styles and scripts over https, which the test server does not have. Here only, those two headers are left out.
 */
async function plainHttp(context) {
  await context.route("**/*", async route => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    delete headers["strict-transport-security"];
    await route.fulfill({ response, headers });
  });
}

async function bar(page) {
  const box = await page.locator("[data-bottom-nav]").boundingBox();
  return box && { top: Math.round(box.y), bottom: Math.round(box.y + box.height) };
}

for (const edition of ["2024", "2014"]) {
  for (const path of ["/bestiario", "/grimorio"]) {
    test(`${path} (${edition}), iPhone 390 × 844 in WebKit: the bar stays put while scrolling; the last row above it`, async ({ browser }) => {
      test.setTimeout(120_000);
      const context = await browser.newContext({ ...IPHONE, baseURL: base() });
      await context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, edition);
      await plainHttp(context);
      const page = await context.newPage();
      await page.goto(path);
      const rows = page.locator(".catalog-row");
      await expect(rows.first()).toBeVisible();
      const start = await bar(page);
      expect(start.bottom).toBe(844);
      const seen = [start];
      const check = async () => seen.push(await bar(page));

      // The whole list, as after «Mostra altri» pressed until the end (322 creatures in the Bestiario of the site).
      const more = page.getByRole("button", { name: /^Mostra altri/ });
      while (await more.count()) { await more.click(); await check(); }
      expect(await rows.count()).toBeGreaterThan(100);
      // Down to the bottom in steps, back to the top, then fast flicks (no pause between the wheel turns).
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= height; y += 900) { await page.evaluate(top => window.scrollTo(0, top), y); await check(); }
      // The rows take their real height as they come into view (content-visibility): the page grows while it scrolls,
      // so the very end is reached when the height no longer changes.
      let previous = -1;
      for (let i = 0; i < 30; i++) {
        const now = await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); return document.documentElement.scrollHeight; });
        await page.waitForTimeout(150);
        await check();
        if (now === previous) break;
        previous = now;
      }
      // The last row of the list is whole above the bar.
      const last = await rows.last().boundingBox();
      expect(Math.round(last.y + last.height), "the last row not covered").toBeLessThanOrEqual((await bar(page)).top);
      for (let y = height; y >= 0; y -= 1200) { await page.evaluate(top => window.scrollTo(0, top), y); await check(); }
      // Fast scrolling: 600 px a frame down to the end and back up, the bar measured at every frame.
      const frames = await page.evaluate(() => new Promise(resolve => {
        const nav = document.querySelector("[data-bottom-nav]");
        const seen = [];
        let direction = 1;
        const step = () => {
          window.scrollBy(0, 600 * direction);
          const box = nav.getBoundingClientRect();
          seen.push([Math.round(box.top), Math.round(box.bottom)]);
          if (direction === 1 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1) direction = -1;
          if (direction === -1 && window.scrollY <= 0) return resolve(seen);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }));
      expect(frames.length).toBeGreaterThan(10);
      for (const [top, bottom] of frames) seen.push({ top, bottom });
      await page.evaluate(() => window.scrollTo(0, 0));
      await check();
      for (const position of seen) expect(position).toEqual(start);
      // Nothing shifted here: the bar is not moved at all.
      expect(await page.locator("[data-bottom-nav]").evaluate(node => node.style.transform)).toBe("");
      await context.close();
    });
  }
}

test("computer 1280, WebKit: no bottom bar, as before", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, baseURL: base() });
  await plainHttp(context);
      const page = await context.newPage();
  for (const path of ["/bestiario", "/grimorio"]) {
    await page.goto(path);
    await expect(page.locator(".catalog-row").first()).toBeVisible();
    await expect(page.locator("[data-bottom-nav]")).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator("[data-bottom-nav]")).toBeHidden();
  }
  await context.close();
});

test("the search field with the keyboard: the bar is not moved (as today)", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, baseURL: base() });
  await plainHttp(context);
      const page = await context.newPage();
  await page.goto("/bestiario");
  const field = page.getByRole("searchbox").or(page.getByPlaceholder(/Cerca/)).first();
  await field.focus();
  await field.fill("drago");
  await page.waitForTimeout(200);
  expect(await page.locator("[data-bottom-nav]").evaluate(node => node.style.transform)).toBe("");
  expect((await bar(page)).bottom).toBe(844);
  await context.close();
});
