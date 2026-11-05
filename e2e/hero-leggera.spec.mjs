import { test, expect, devices } from "./fixtures.mjs";

// PROMPT 59: the library picture of the Home. Phones (up to 672 px, also 3× screens): one file at most 828 px wide,
// quality 60. Computers: the same file as before (quality 75, the width chosen by the sizes of the page). One download
// only: the preload in the HTML names the same files as the picture, and the «Scegli l'edizione» screen of the first
// visit reuses the phone file.
const PHONE = { ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 };
delete PHONE.defaultBrowserType;
// A real computer: screen as wide as the window, no touch (the project defaults are an iPhone; with a phone screen
// under a 1280 px window Chromium's first look at the page would use the 390 px screen, which no real device does).
const COMPUTER = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, screen: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
delete COMPUTER.defaultBrowserType;

async function open(browser, options, { firstVisit = false } = {}) {
  const context = await browser.newContext({ ...options, baseURL: test.info().project.use.baseURL, serviceWorkers: "block" });
  await context.addInitScript(first => {
    try {
      if (!first) localStorage.setItem("grimorio.edizione", "2024");
      localStorage.setItem("grimorio.statistiche", "no");
    } catch { /* no storage */ }
  }, firstVisit);
  const hero = [];
  context.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/_next/image" && url.searchParams.get("url") === "/hero-atmosfera.webp")
      hero.push({ w: Number(url.searchParams.get("w")), q: Number(url.searchParams.get("q")) });
  });
  const page = await context.newPage();
  const response = await page.goto("/", { waitUntil: "load" });
  const html = await response.text();
  const picture = page.getByRole("img", { name: "Antica biblioteca con scaffali di libri e una scala a chiocciola" });
  await expect.poll(() => picture.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.waitForTimeout(1500);
  return { context, page, html, hero, picture };
}

const preloads = html => [...html.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(match => match[0].replace(/&amp;/g, "&"));
const attribute = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;

test("phone 390 px, 3× screen: one picture, at most 828 px wide, quality 60", async ({ browser }) => {
  const { context, page, hero, picture } = await open(browser, PHONE);
  expect(hero).toHaveLength(1);
  expect(hero[0].w).toBeLessThanOrEqual(828);
  expect(hero[0].q).toBe(60);
  const current = new URL(await picture.evaluate(img => img.currentSrc));
  expect(Number(current.searchParams.get("w"))).toBe(hero[0].w);
  expect(current.searchParams.get("q")).toBe("60");
  // Same place and shade as before: the picture fills the section, the shade is above it.
  const box = await picture.boundingBox();
  const section = await page.locator("section[aria-labelledby='home-quote']").boundingBox();
  expect(Math.round(box.width)).toBe(Math.round(section.width));
  expect(await picture.evaluate(img => getComputedStyle(img).objectFit)).toBe("cover");
  await context.close();
});

test("first visit on a phone: the «Scegli l'edizione» screen uses the same file, no second download", async ({ browser }) => {
  const { context, page, hero } = await open(browser, PHONE, { firstVisit: true });
  await expect(page.locator("[data-first-launch]")).toBeVisible();
  const screen = page.locator("[data-first-launch] img");
  await expect.poll(() => screen.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(new URL(await screen.evaluate(img => img.currentSrc)).searchParams.get("q")).toBe("60");
  expect(hero).toHaveLength(1);
  await context.close();
});

test("computer 1280 px: the same file as before (quality 75, 1080 px)", async ({ browser }) => {
  const { context, hero, picture } = await open(browser, COMPUTER);
  expect(hero).toEqual([{ w: 1080, q: 75 }]);
  expect(new URL(await picture.evaluate(img => img.currentSrc)).searchParams.get("q")).toBe("75");
  await context.close();
});

test("the preloads in the HTML name the files of the picture, each for its screens", async ({ browser }) => {
  const { context, html, page } = await open(browser, PHONE);
  const links = preloads(html).filter(link => link.includes("hero-atmosfera"));
  expect(links).toHaveLength(2);
  const phone = links.find(link => attribute(link, "media") === "(max-width: 672px)");
  const wide = links.find(link => attribute(link, "media") === "not all and (max-width: 672px)");
  expect(phone && wide).toBeTruthy();
  const source = await page.locator("picture source").first();
  expect(attribute(phone, "imageSrcSet")).toBe(await source.getAttribute("srcset"));
  expect(attribute(phone, "imageSrcSet")).not.toContain("q=75");
  expect(attribute(wide, "imageSrcSet")).toBe(await page.locator("picture img").first().getAttribute("srcset"));
  expect(attribute(wide, "fetchPriority")).toBe("high");
  expect(attribute(phone, "fetchPriority")).toBe("high");
  await context.close();
});
