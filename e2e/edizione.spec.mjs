import { test, expect } from "@playwright/test";

// «La tua edizione»: one edition for the whole app, chosen at the first launch (only over the Home),
// changed from the pill of the Home or from the 2024 · 2014 buttons of any section. Local test database only.
// The edition hidden by the administrator is in e2e/sezioni.spec.mjs (it changes what the server builds).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

const firstLaunch = page => page.getByRole("dialog", { name: "Con quale edizione giochi?" });
const selector = page => page.getByRole("group", { name: "Edizione delle regole" }).first();
const pressed = (page, edition) => expect(selector(page).getByRole("button", { name: edition })).toHaveAttribute("aria-pressed", "true");
const stored = page => page.evaluate(() => window.localStorage.getItem("grimorio.edizione"));

test("first launch: only over the Home, 2014 chosen once for every section, search and counts of 2014", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  // Never over a direct link: those pages start from 2024 and nothing is saved.
  for (const path of ["/spell/palla-di-fuoco", "/mostro/aboleth", "/grimorio", "/bestiario", "/compendio"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(300);
    await expect(firstLaunch(page), path).toHaveCount(0);
  }
  await page.goto("/grimorio");
  await pressed(page, "2024");
  expect(await stored(page)).toBeNull();

  // Entering from the Home with nothing chosen: the screen over the library.
  await page.goto("/");
  await expect(firstLaunch(page)).toBeVisible();
  await expect(firstLaunch(page).getByRole("heading", { name: "Con quale edizione giochi?" })).toHaveCSS("font-size", "40px");
  await expect(firstLaunch(page)).toContainText("Incantesimi, bestiario, classi e regole partiranno sempre dalla tua edizione.");
  await expect(firstLaunch(page)).toContainText("Puoi cambiarla quando vuoi dalla Home.");
  const choice2024 = firstLaunch(page).getByRole("button", { name: /^2024 Regole 2024/ });
  const choice2014 = firstLaunch(page).getByRole("button", { name: /^2014 Quinta edizione classica/ });
  await expect(choice2024).toBeFocused();
  for (const [button, color] of [[choice2024, "rgb(122, 31, 43)"], [choice2014, "rgb(45, 76, 122)"]]) {
    await expect(button).toHaveCSS("background-color", color);
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(100);
  }
  // The Home rendered by the server is the normal one (search engines, previews): the screen is added in the browser.
  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain("Con quale edizione giochi?");
  expect(html).toContain("Il sapere è la più");

  await choice2014.click();
  await expect(firstLaunch(page)).toHaveCount(0);
  expect(await stored(page)).toBe("2014");
  await expect(page.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerca nel Grimorio 2014…" })).toBeVisible();
  await page.reload();
  await page.waitForTimeout(500);
  await expect(firstLaunch(page)).toHaveCount(0);

  // Every section starts from 2014.
  for (const path of ["/grimorio", "/bestiario", "/classi", "/classi/mago", "/compendio/condizioni", "/oggetti-magici", "/equipaggiamento/armi", "/equipaggiamento/armature", "/equipaggiamento/avventura", "/equipaggiamento/strumenti"]) {
    await page.goto(path);
    await pressed(page, "2014");
  }
  await page.goto("/grimorio");
  await expect(page.locator('main a[href^="/spell/"]').first()).toHaveAttribute("href", /-2014$/);

  // Search of the Home: 2014 first; a 2024-only name at «Cerca anche nel 2024».
  await page.goto("/");
  await page.getByRole("button", { name: "Cerca nel Grimorio 2014…" }).click();
  const panel = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(panel.getByRole("searchbox")).toHaveAttribute("placeholder", "Cerca nel Grimorio 2014…");
  await panel.getByRole("searchbox").fill("palla di fuoco");
  await expect(panel.getByRole("link", { name: /Palla di fuoco/ }).first()).toHaveAttribute("href", "/spell/palla-di-fuoco-2014");
  await panel.getByRole("searchbox").fill("cesto");
  await expect(panel.getByText("Nessun risultato per «cesto» nel 2014")).toBeVisible();
  await panel.getByRole("button", { name: /^Cerca anche nel 2024 \(\d+\)$/ }).click();
  await expect(panel.getByText("Solo nel 2024")).toBeVisible();
  await expect(panel.getByRole("link", { name: /Cesto/ })).toHaveAttribute("href", /\?edizione=2024$/);
  expect(errors).toEqual([]);
});

test("old choices: all 2014 adopted without the first launch; different ones ask once", async ({ page }) => {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("seeded")) return;
    window.sessionStorage.setItem("seeded", "1");
    window.localStorage.setItem("grimorio.incantesimi.edizione", "2014");
    window.localStorage.setItem("grimorio.bestiario.edizione", "2014");
    window.localStorage.setItem("grimorio.equipaggiamento.edizione", "2014");
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" })).toBeVisible();
  await expect(firstLaunch(page)).toHaveCount(0);
  expect(await stored(page)).toBe("2014");
  await page.goto("/bestiario");
  await pressed(page, "2014");

  const other = await page.context().browser().newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const mixed = await other.newPage();
  await mixed.addInitScript(() => {
    if (window.sessionStorage.getItem("seeded")) return;
    window.sessionStorage.setItem("seeded", "1");
    window.localStorage.setItem("grimorio.incantesimi.edizione", "2014");
    window.localStorage.setItem("grimorio.bestiario.edizione", "2024");
  });
  await mixed.goto("/");
  await expect(firstLaunch(mixed)).toBeVisible();
  await firstLaunch(mixed).getByRole("button", { name: /^2024/ }).click();
  await mixed.reload();
  await mixed.waitForTimeout(500);
  await expect(firstLaunch(mixed)).toHaveCount(0);
  await other.close();
});

test("one choice everywhere: a section's buttons change the others, the pill and the other tabs; explicit addresses do not change it", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024"); });
  // A second tab on the Bestiario follows the change made in the Incantesimi.
  const tab = await context.newPage();
  await tab.goto("/bestiario");
  await pressed(tab, "2024");
  await page.goto("/grimorio");
  await selector(page).getByRole("button", { name: "2014" }).click();
  expect(await stored(page)).toBe("2014");
  await pressed(tab, "2014");
  await page.goto("/compendio/condizioni");
  await pressed(page, "2014");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" })).toHaveCSS("background-color", "rgb(45, 76, 122)");
  await page.goto("/oggetti-magici");
  await selector(page).getByRole("button", { name: "2024" }).click();
  await page.goto("/bestiario");
  await pressed(page, "2024");

  // Addresses with an edition open it without changing «la tua edizione».
  await page.goto("/classi/mago?edizione=2014");
  await pressed(page, "2014");
  await page.goto("/spell/palla-di-fuoco-2014");
  await expect(page.locator("main")).toContainText("Palla di fuoco");
  await page.goto("/grimorio?edizione=2014");
  await pressed(page, "2014");
  expect(await stored(page)).toBe("2024");
  await page.goto("/grimorio");
  await pressed(page, "2024");
  // Touching the buttons on such an address does change it (and the address drops its edition).
  await page.goto("/grimorio?edizione=2014");
  await selector(page).getByRole("button", { name: "2024" }).click();
  await selector(page).getByRole("button", { name: "2014" }).click();
  expect(await stored(page)).toBe("2014");
  await expect(page).toHaveURL(/\/grimorio$/);
});

test("keyboard: first launch and panel reachable with Tab, visible focus, Esc closes (2024 on the first launch)", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)));
  const page = await context.newPage();
  await page.goto("/");
  await expect(firstLaunch(page)).toBeVisible();
  const outline = () => page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  // Focus on «2024» without the ring until a key is pressed (:focus-visible only).
  await expect(firstLaunch(page).getByRole("button", { name: /^2024/ })).toBeFocused();
  expect(await outline()).toBe("none");
  await page.keyboard.press("Tab");
  await expect(firstLaunch(page).getByRole("button", { name: /^2014/ })).toBeFocused();
  expect(await outline()).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(firstLaunch(page).getByRole("button", { name: /^2024/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(firstLaunch(page)).toHaveCount(0);
  expect(await stored(page)).toBe("2024");
  await page.reload();
  await page.waitForTimeout(500);
  await expect(firstLaunch(page)).toHaveCount(0);

  // Computer: the pill in the side column, under the logo; a small box under it.
  const side = page.getByRole("navigation", { name: "Navigazione laterale" });
  const pill = side.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" });
  await expect(pill).toBeVisible();
  expect((await pill.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await pill.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "La tua edizione" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: /^2024/ })).toBeFocused();
  expect(await outline(), "opened with the keyboard: visible focus").not.toBe("none");
  await expect(panel.getByRole("status")).toHaveText("Ora tutta l’app parte dal 2024.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toHaveText("Ora tutta l’app parte dal 2014.");
  await expect(panel.getByRole("button", { name: /^2014/ })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "Fatto" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: /^2024/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(side.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" })).toBeFocused();
  // A click outside closes the box.
  await side.getByRole("button", { name: /Edizione 2014/ }).click();
  await page.mouse.click(1000, 600);
  await expect(panel).toHaveCount(0);
  await context.close();
});

test("phone: pill on the picture of the Home, sheet from the bottom closed by Fatto or a tap outside", async ({ page }) => {
  await page.addInitScript(() => { if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024"); });
  await page.goto("/");
  const pill = page.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" });
  await expect(pill).toBeVisible();
  const box = await pill.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeGreaterThan(330);
  await pill.click();
  const panel = page.getByRole("dialog", { name: "La tua edizione" });
  // Opened with a tap: focus on the active choice, no ring.
  await expect(panel.getByRole("button", { name: /^2024/ })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).toBe("none");
  await expect(panel).toContainText("Vale per tutta l’app: incantesimi, bestiario, classi, regole e ricerca.");
  await panel.getByRole("button", { name: /^2014/ }).click();
  await expect(page.getByRole("button", { name: "Cerca nel Grimorio 2014…" })).toBeVisible();
  await panel.getByRole("button", { name: "Fatto" }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" }).click();
  await page.mouse.click(195, 120);
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
