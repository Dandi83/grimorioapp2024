import { test, expect, devices } from "./fixtures.mjs";
import { editionPill, expectEdition } from "./edition-pill.mjs";

// PROMPT 57 (A1, M3, M5): the page under a panel does not scroll and comes back where it was; a tap anywhere in the
// search box of a list opens the keyboard; the room of the statistics bar stays while the reader is at the end of the page.
const base = () => test.info().project.use.baseURL;
const bodyLock = page => page.evaluate(() => ({ position: document.body.style.position, top: document.body.style.top, y: window.scrollY }));

test("search panel of the Home: the page is held (body fixed at its position) and put back when the panel closes", async ({ browser }) => {
  // A short screen: the Home scrolls (at 844 px it fits in one screen).
  const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 600 }, baseURL: base() });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio.statistiche", "no"); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, 140));
  await page.waitForTimeout(100);
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(100);
  await page.getByRole("button", { name: /Cerca nel Grimorio/ }).click();
  const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => bodyLock(page)).toEqual({ position: "fixed", top: `-${y}px`, y: 0 });
  // A scroll attempt moves nothing under the panel.
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(150);
  expect((await bodyLock(page)).y).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => bodyLock(page)).toEqual({ position: "", top: "", y });
  await context.close();
});

test("edition sheet of a list and welcome screen: the page is held and put back", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, baseURL: base() });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio.statistiche", "no"); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/grimorio");
  await expect(page.locator(".catalog-row").first()).toBeVisible();
  // A little down, with the pill still on screen (a tap on a pill out of sight would scroll back to it first).
  await page.evaluate(() => window.scrollTo(0, 30));
  await page.waitForTimeout(100);
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBe(30);
  await editionPill(page).click();
  const panel = page.getByRole("dialog", { name: "Scegli l’edizione" });
  await expect(panel).toBeVisible();
  await expect.poll(() => bodyLock(page)).toEqual({ position: "fixed", top: `-${y}px`, y: 0 });
  await panel.getByRole("button", { name: "Regole 2014" }).click();
  await expect(panel).toHaveCount(0);
  await expectEdition(page, "2014");
  await expect.poll(() => bodyLock(page)).toEqual({ position: "", top: "", y });
  await context.close();
  // First visit: the welcome screen holds the Home; the choice gives the page back.
  const fresh = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, baseURL: base() });
  await fresh.addInitScript(() => { try { localStorage.setItem("grimorio.statistiche", "no"); } catch { /* no storage */ } });
  const first = await fresh.newPage();
  await first.goto("/");
  await expect(first.locator("[data-first-launch]")).toBeVisible();
  await expect.poll(() => bodyLock(first)).toEqual({ position: "fixed", top: "0px", y: 0 });
  await first.locator("[data-first-launch]").getByRole("button", { name: "Regole 2024" }).click();
  await expect(first.locator("[data-first-launch]")).toHaveCount(0);
  await expect.poll(() => bodyLock(first)).toEqual({ position: "", top: "", y: 0 });
  await fresh.close();
});

test("search box of the lists: a tap on its edge, away from the text, opens the field (M3)", async ({ page }) => {
  for (const path of ["/bestiario", "/grimorio", "/oggetti-magici"]) {
    await page.goto(path);
    const box = page.locator("[data-list-search-box]").first();
    await expect(box).toBeVisible();
    const rect = await box.boundingBox();
    // Near the right edge of the box, below the text line: not on the <input> itself.
    await page.mouse.click(rect.x + rect.width - 6, rect.y + rect.height - 4);
    expect(await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.getAttribute("type") || "")), path).toBe("INPUT:search");
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    expect(label, path).toMatch(/^Cerca/);
  }
});

test("statistics bar: its room at the end of the page stays while the reader is at the end, goes when they scroll away (M5)", async ({ browser }) => {
  // The statistics are counted only on http://localhost in the tests (e2e/run.mjs); a new visitor sees the bar.
  const origin = base().replace("127.0.0.1", "localhost");
  const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, baseURL: origin });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
  const page = await context.newPage();
  // Marked as test traffic (analytics_test=1): this visit never changes the counts the statistics tests expect.
  await page.goto("/fonti?analytics_test=1");
  const bar = page.locator("[data-statistics-bar]");
  await expect(bar).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-statistics-room"))).toBe(true);
  const padding = () => page.evaluate(() => getComputedStyle(document.querySelector("main")).paddingBottom);
  const withRoom = await padding();
  // To the very end of the page, then «No»: the bar goes, the room stays, nothing jumps.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const end = await page.evaluate(() => ({ y: window.scrollY, height: document.documentElement.scrollHeight }));
  expect(end.y).toBeGreaterThan(0);
  await bar.getByRole("button", { name: "No" }).click();
  await expect(bar).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-statistics-room")), "the room stays at the end").toBe(true);
  expect(await padding()).toBe(withRoom);
  expect(await page.evaluate(() => ({ y: window.scrollY, height: document.documentElement.scrollHeight }))).toEqual(end);
  // Away from the end: the room goes, out of sight.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-statistics-room"))).toBe(false);
  expect(await padding()).not.toBe(withRoom);
  await context.close();
});
