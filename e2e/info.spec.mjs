import { test, expect } from "./fixtures.mjs";

// Home with only «Area riservata» at the top and «Info e note legali» at the foot; the /info page and its tiles.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

const SHOTS = process.env.INFO_SHOTS;

test("Home: «Area riservata» with the lock, «Info e note legali» at the foot; /info opens the right pages", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("navigation", { name: "Area riservata" });
  const admin = header.getByRole("link", { name: "Area riservata" });
  await expect(admin).toBeVisible();
  await expect(admin.locator("svg")).toHaveCount(1);
  expect((await admin.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText("Termini e condizioni")).toHaveCount(0);
  await expect(page.getByText("Segnala un errore o un consiglio")).toHaveCount(0);
  const info = page.getByRole("link", { name: "Info e note legali" });
  await expect(info).toBeVisible();
  await expect(info).toHaveCSS("font-size", "13px");
  await expect(info).toHaveCSS("color", "rgb(94, 78, 62)");
  // Under the share card «Porta il Grimorio al tavolo» (28 October 2026): reached by scrolling on short screens,
  // never covered by the bar.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const box = await info.boundingBox();
  const bar = await page.getByRole("navigation", { name: "Navigazione principale" }).boundingBox();
  expect(box.y + box.height, "above the bar").toBeLessThanOrEqual(bar.y);
  expect(box.x + box.width).toBeGreaterThan(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-390.png`, fullPage: true });

  await info.click();
  await expect(page).toHaveURL(/\/info$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Info e note legali");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "34px");
  await expect(page.getByText("Il Grimorio.App è gratuito e non ufficiale.")).toBeVisible();
  // First tile: the Termini d'uso.
  await expect(page.getByRole("list").first().getByRole("link").first()).toHaveAccessibleName(/^Termini d’uso/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/info-390.png`, fullPage: true });
  for (const [name, url, heading] of [[/^Termini d’uso/, /\/termini$/, "Termini d’uso"], [/^Fonti e licenze SRD/, /\/fonti$/, "Fonti e licenze"], [/^Privacy/, /\/privacy$/, "Come usiamo i dati"]]) {
    await page.goto("/info");
    const tile = page.getByRole("link", { name });
    expect((await tile.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await tile.click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
  await page.goto("/info");
  await page.getByRole("link", { name: /^Scrivici/ }).click();
  await expect(page).toHaveURL(/\/segnala$/);
  await expect(page.getByLabel("Messaggio")).toBeVisible();
  await expect(page.getByText(/^Riguarda:/)).toHaveCount(0);
  // The two «Scrivici» of the Termini d'uso open the same form.
  await page.goto("/termini");
  const write = page.getByRole("main").getByRole("link", { name: "Scrivici", exact: true });
  await expect(write).toHaveCount(2);
  for (const i of [0, 1]) await expect(write.nth(i)).toHaveAttribute("href", "/segnala");
  await write.nth(1).click();
  await expect(page).toHaveURL(/\/segnala$/);
  await expect(page.getByLabel("Messaggio")).toBeVisible();
  await page.goto("/info");
  await page.getByRole("link", { name: "Fonti e licenze", exact: true }).click();
  await expect(page).toHaveURL(/\/fonti$/);
  // The internal links to the legal pages answer.
  for (const path of ["/info", "/termini", "/fonti", "/privacy", "/segnala"]) expect((await page.request.get(path)).status(), path).toBe(200);
});

test("computer: at the bottom of the side column only «Info e note legali» and «Area riservata»", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const side = page.getByRole("navigation", { name: "Navigazione laterale" });
  await expect(side.getByRole("link", { name: "Info e note legali" })).toBeVisible();
  await expect(side.getByRole("link", { name: "Area riservata" }).locator("svg")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Info e note legali" }).filter({ visible: true })).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/colonna-1440.png` });
});
