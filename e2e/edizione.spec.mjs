import { test, expect } from "./fixtures.mjs";
import { chooseEdition, editionPill, expectEdition } from "./edition-pill.mjs";

// «La tua edizione»: one edition for the whole app, chosen at the first launch (only over the Home),
// changed from the pill of the Home or from the 2024 · 2014 buttons of any section. Local test database only.
// The edition hidden by the administrator is in e2e/sezioni.spec.mjs (it changes what the server builds).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

const firstLaunch = page => page.locator("[data-first-launch]");
// The page shows this edition: its pill says so (the old 2024 · 2014 buttons are gone from the lists).
const pressed = (page, edition) => expectEdition(page, edition);
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
  await expect(firstLaunch(page)).toHaveAttribute("role", "dialog");
  await expect(firstLaunch(page).getByRole("heading", { name: "Scegli l’edizione" })).toHaveCSS("font-size", "40px");
  // Only the logo, the title and the two choices.
  await expect(firstLaunch(page)).toHaveText("Il Grimorio.AppScegli l’edizioneD&D 2024D&D 2014");
  const choice2024 = firstLaunch(page).getByRole("button", { name: "D&D 2024", exact: true });
  const choice2014 = firstLaunch(page).getByRole("button", { name: "D&D 2014", exact: true });
  await expect(choice2024).toBeFocused();
  for (const [button, color] of [[choice2024, "rgb(122, 31, 43)"], [choice2014, "rgb(45, 76, 122)"]]) {
    await expect(button).toHaveCSS("background-color", color);
    await expect(button).toHaveCSS("font-size", "40px");
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(96);
  }
  // The Home rendered by the server is the normal one (search engines, previews): the screen is added in the browser.
  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain("data-first-launch");
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
  await firstLaunch(mixed).getByRole("button", { name: "D&D 2024" }).click();
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
  await chooseEdition(page, "2014");
  expect(await stored(page)).toBe("2014");
  await pressed(tab, "2014");
  await page.goto("/compendio/condizioni");
  await pressed(page, "2014");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" })).toHaveCSS("background-color", "rgb(45, 76, 122)");
  await page.goto("/oggetti-magici");
  await chooseEdition(page, "2024");
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
  // The pill of such a page is blue and its panel says so.
  await expect(editionPill(page)).toHaveCSS("background-color", "rgb(45, 76, 122)");
  await editionPill(page).click();
  await expect(page.getByTestId("page-edition-note")).toHaveText("Questa pagina mostra il 2014. La tua edizione è il 2024.");
  // Esc closes it without changing anything.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Scegli l’edizione" })).toHaveCount(0);
  expect(await stored(page)).toBe("2024");
  await page.goto("/grimorio");
  await pressed(page, "2024");
  // A choice in the panel on such an address does change it (and the address drops its edition).
  await page.goto("/grimorio?edizione=2014");
  await chooseEdition(page, "2024");
  await chooseEdition(page, "2014");
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
  await expect(firstLaunch(page).getByRole("button", { name: "D&D 2024" })).toBeFocused();
  expect(await outline()).toBe("none");
  await page.keyboard.press("Tab");
  await expect(firstLaunch(page).getByRole("button", { name: "D&D 2014" })).toBeFocused();
  expect(await outline()).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(firstLaunch(page).getByRole("button", { name: "D&D 2024" })).toBeFocused();
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
  const panel = page.getByRole("dialog", { name: "Scegli l’edizione" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "D&D 2024" })).toBeFocused();
  await expect(panel.getByRole("button", { name: "D&D 2024" })).toHaveAttribute("aria-pressed", "true");
  expect(await outline(), "opened with the keyboard: visible focus").not.toBe("none");
  await expect(panel.getByRole("button", { name: "Fatto" })).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "D&D 2014" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "D&D 2024" })).toBeFocused();
  // Esc closes it without changing anything.
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  expect(await stored(page)).toBe("2024");
  await expect(pill).toBeFocused();
  // A choice: applied, said to screen readers, and the box closes by itself.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
  expect(await stored(page)).toBe("2014");
  await expect(page.getByTestId("edition-status")).toHaveText("Ora tutta l’app parte dal 2014.");
  await expect(side.getByRole("button", { name: "Edizione 2014: cambia la tua edizione" })).toBeFocused();
  // A click outside closes the box.
  await side.getByRole("button", { name: /Edizione 2014/ }).click();
  await page.mouse.click(1000, 600);
  await expect(panel).toHaveCount(0);
  await context.close();
});

test("phone: pill on the picture of the Home, sheet from the bottom closed by a choice, a tap outside or its handle", async ({ page }) => {
  await page.addInitScript(() => { if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024"); });
  await page.goto("/");
  const pill = page.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" });
  await expect(pill).toBeVisible();
  const box = await pill.boundingBox();
  // Centred on the picture, larger (canvas «Prima visita», G1).
  expect(box.height).toBeGreaterThanOrEqual(52);
  const width = page.viewportSize().width;
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(2);
  await pill.click();
  const panel = page.getByRole("dialog", { name: "Scegli l’edizione" });
  // Opened with a tap: focus on the active choice, no ring.
  await expect(panel.getByRole("button", { name: "D&D 2024" })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).toBe("none");
  // Only the title and the two large choices: the active one full, the other cream with a border.
  await expect(panel).toHaveText("Scegli l’edizioneD&D 2024D&D 2014");
  for (const [name, background, color] of [["D&D 2024", "rgb(122, 31, 43)", "rgb(255, 255, 255)"], ["D&D 2014", "rgb(255, 251, 240)", "rgb(45, 76, 122)"]]) {
    const choice = panel.getByRole("button", { name });
    await expect(choice).toHaveCSS("background-color", background);
    await expect(choice).toHaveCSS("color", color);
    await expect(choice).toHaveCSS("font-size", "40px");
    await expect(choice).toHaveCSS("border-radius", "18px");
    expect((await choice.boundingBox()).height).toBeGreaterThanOrEqual(96);
  }
  // A tap outside closes it as it is.
  await page.mouse.click(195, 120);
  await expect(panel).toHaveCount(0);
  expect(await stored(page)).toBe("2024");
  // The handle dragged down closes it as it is.
  await pill.click();
  const handle = (await panel.locator(":scope > [aria-hidden=true]").first().boundingBox());
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 200, { steps: 8 });
  await page.mouse.up();
  await expect(panel).toHaveCount(0);
  expect(await stored(page)).toBe("2024");
  // A tap on «D&D 2014» applies it and closes the sheet by itself.
  await pill.click();
  await panel.getByRole("button", { name: "D&D 2014" }).click();
  await expect(panel).toHaveCount(0);
  expect(await stored(page)).toBe("2014");
  await expect(page.getByRole("button", { name: "Cerca nel Grimorio 2014…" })).toBeVisible();
  await expect(page.getByTestId("edition-status")).toHaveText("Ora tutta l’app parte dal 2014.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
