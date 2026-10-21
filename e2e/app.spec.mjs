import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const catalogRows = page => page.locator("li.catalog-row");

test("home: header, bottom navigation and security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
  await expect(page.getByText("Il Grimorio", { exact: false }).first()).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navigazione principale" });
  for (const label of ["Home", "Incantesimi", "Bestiario", "Preferiti"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
});

test("spells: 40-row pages, search, detail, favorite and back", async ({ page }) => {
  await page.goto("/grimorio");
  await expect(catalogRows(page)).toHaveCount(40);
  await page.getByRole("button", { name: /Mostra altri/ }).click();
  await expect(catalogRows(page)).toHaveCount(80);
  await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("dardo incantato");
  await expect(catalogRows(page)).toHaveCount(1);
  await page.getByRole("link", { name: /Dardo Incantato/i }).click();
  await expect(page).toHaveURL(/\/spell\/dardo-incantato$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dardo Incantato/i);
  await page.getByRole("button", { name: "Aggiungi ai preferiti" }).click();
  await expect(page.getByRole("button", { name: "Rimuovi dai preferiti" })).toBeVisible();
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/grimorio$/);
  await page.getByRole("navigation", { name: "Navigazione principale" }).getByRole("link", { name: "Preferiti" }).click();
  await expect(page.getByRole("region", { name: "Incantesimi preferiti" }).getByRole("link", { name: /Dardo Incantato/i })).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 incantesimo salvato", { exact: false })).toBeVisible();
});

test("bestiary: one list with 40-row pages, filter panel, animals and a creature sheet", async ({ page }) => {
  await page.goto("/bestiario");
  await expect(catalogRows(page)).toHaveCount(40);
  await expect(page.getByRole("button", { name: /Mostra altri \(290\)/ })).toBeVisible();
  await page.getByRole("button", { name: /Mostra altri/ }).click();
  await expect(catalogRows(page)).toHaveCount(80);
  await page.getByRole("button", { name: "Filtri" }).click();
  const panel = page.getByRole("dialog", { name: "Filtri" });
  await panel.getByRole("button", { name: "Animali", exact: true }).click();
  await panel.getByRole("button", { name: "Mostra 95 risultati" }).click();
  await expect(page.getByRole("button", { name: "Filtri, 1 attivo" })).toBeVisible();
  await expect(catalogRows(page)).toHaveCount(40);
  await page.getByRole("searchbox", { name: "Cerca una creatura" }).fill("gatto");
  await expect(catalogRows(page)).toHaveCount(1);
  await page.getByRole("link", { name: /Gatto/ }).click();
  await expect(page).toHaveURL(/\/mostro\/gatto$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gatto");
});

// Every SRD 5.1 sheet in the project files belongs to the 2014 list.
const sheets2014 = JSON.parse(readFileSync(new URL("../lib/data/srd-monsters-5.1-it.json", import.meta.url), "utf8")).records.length;

test("bestiary: 2014 edition list, remembered on the phone, and old 2014 links", async ({ page }) => {
  await page.goto("/bestiario");
  await expect(page.getByRole("status")).toHaveText("Nome · 330 risultati");
  await page.getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(`Nome · ${sheets2014} risultati`);
  await page.reload();
  await expect(page.getByRole("button", { name: "2014", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toHaveText(`Nome · ${sheets2014} risultati`);
  await page.getByRole("searchbox", { name: "Cerca una creatura" }).fill("orco");
  await page.getByRole("link", { name: /^Orco/ }).click();
  await expect(page).toHaveURL(/\/mostro\/orco-2014$/);
  await page.goto("/mostro/orco");
  await expect(page).toHaveURL(/\/mostro\/orco-2014$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Orco");
});

// The 2014 spells published so far (SRD 5.1) come from the project files.
const spells2014 = JSON.parse(readFileSync(new URL("../lib/data/srd-spells-5.1-it.json", import.meta.url), "utf8")).records.length;

test("spells: 2014 selector, 2014 card with its source and 2024 link, 2014 creature bollini", async ({ page }) => {
  await page.goto("/grimorio");
  await page.getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(`${spells2014} risultati`);
  await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("aiuto");
  await page.getByRole("link", { name: /^Aiuto/ }).click();
  await expect(page).toHaveURL(/\/spell\/aiuto-2014$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aiuto");
  await expect(page.getByRole("link", { name: "Versione 2024 →" })).toHaveAttribute("href", "/spell/aiuto");
  await expect(page.getByText("Testo integrale: SRD 5.1 italiano — Aiuto.")).toBeVisible();
  await page.goto("/mostro/accolito-2014");
  const bollino = page.getByRole("link", { name: /^benedizione$/i });
  await expect(bollino).toHaveAttribute("href", "/spell/benedizione-2014");
  await bollino.click();
  await expect(page).toHaveURL(/\/spell\/benedizione-2014$/);
  // Approved alias: the 2014 sheet says «conoscenza delle leggende», the 2014 spell is «Conoscenza delle legende».
  await page.goto("/mostro/ginosfinge-2014");
  await expect(page.getByRole("link", { name: /^conoscenza delle leggende$/i })).toHaveAttribute("href", "/spell/conoscenza-delle-legende-2014");
});

test("spells: the duplicate Water Breathing address opens the kept card", async ({ page }) => {
  await page.goto("/spell/i-re-spirare-sott-acqua");
  await expect(page).toHaveURL(/\/spell\/i-re-spirare-sott-acqua-2$/);
  await page.goto("/grimorio");
  await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("respirare");
  await expect(page.locator('a[href="/spell/i-re-spirare-sott-acqua"]')).toHaveCount(0);
  await expect(page.locator('a[href="/spell/i-re-spirare-sott-acqua-2"]')).toHaveCount(1);
});

test("spells: casting time filter, together with the other filters, in both editions", async ({ page }) => {
  await page.goto("/grimorio");
  for (const edition of ["2024", "2014"]) {
    await page.getByRole("button", { name: edition, exact: true }).click();
    await page.getByRole("button", { name: /^Filtri/ }).click();
    const group = page.getByRole("group", { name: "Tempo di lancio" });
    await group.getByRole("button", { name: "Reazione", exact: true }).click();
    const apply = page.getByRole("button", { name: /^Mostra \d+ risultat/ });
    const shown = Number((await apply.textContent()).match(/\d+/)[0]);
    expect(shown).toBeGreaterThan(0);
    await apply.click();
    await expect(page.getByRole("status")).toHaveText(`${shown} ${shown === 1 ? "risultato" : "risultati"}`);
    await page.getByRole("button", { name: /^Filtri/ }).click();
    await page.getByRole("button", { name: "Azzera" }).click();
    await page.getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
  }
});

test("conditions: inline links open the prebuilt condition page", async ({ page }) => {
  await page.goto("/mostro/aboleth");
  const condition = page.locator('a[href^="/manuale/condizioni-"]').first();
  await expect(condition).toBeVisible();
  const href = await condition.getAttribute("href");
  await condition.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Manual entries other than conditions stay preview-only.
  expect((await page.goto("/manuale")).status()).toBe(404);
});

test("shared link without history: unknown cards return 404", async ({ page }) => {
  expect((await page.goto("/spell/non-esiste")).status()).toBe(404);
  expect((await page.goto("/mostro/non-esiste")).status()).toBe(404);
});

test("admin: wrong passcode, login, logout", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
  await page.getByLabel("Passcode").fill("sbagliata");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Passcode errata." })).toBeVisible();
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("heading", { name: "Amministrazione" })).toBeVisible();
  const cookie = (await page.context().cookies()).find(c => c.name === "grimorio_admin");
  expect(cookie?.value).toMatch(/^v2\.\d+\.[0-9a-f]{64}$/);
  expect(cookie?.httpOnly).toBe(true);
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
});

test("back from a card restores search, pages and scroll; the navigation bar starts fresh", async ({ page }) => {
  await page.goto("/grimorio");
  const search = page.getByRole("searchbox", { name: "Cerca un incantesimo" });
  await search.fill("a");
  await page.getByRole("button", { name: /Mostra altri/ }).click();
  await page.getByRole("button", { name: /Mostra altri/ }).click();
  await expect(catalogRows(page)).toHaveCount(120);
  const target = catalogRows(page).nth(100).getByRole("link");
  await target.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(1000);
  await target.click();
  await expect(page).toHaveURL(/\/spell\//);
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/grimorio$/);
  await expect(search).toHaveValue("a");
  await expect(catalogRows(page)).toHaveCount(120);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore - 200);
  // A new visit from the navigation bar is not a "back": the list starts fresh.
  const nav = page.getByRole("navigation", { name: "Navigazione principale" });
  await nav.getByRole("link", { name: "Home" }).click();
  await nav.getByRole("link", { name: "Incantesimi" }).click();
  await expect(page.getByRole("searchbox", { name: "Cerca un incantesimo" })).toHaveValue("");
  await expect(catalogRows(page)).toHaveCount(40);
});

test("a shared card link: back goes to its list instead of leaving the site", async ({ page }) => {
  await page.goto("/spell/dardo-incantato?ref=share");
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/grimorio$/);
  await page.goto("/mostro/aboleth?ref=share");
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/bestiario$/);
});

test("compendium: five-item navigation on narrow phones, Compendio active inside Equipaggiamento", async ({ page }) => {
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/");
    await expect(page.locator('a[href="/equipaggiamento"]')).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Navigazione principale" });
    const links = nav.getByRole("link");
    await expect(links).toHaveText(["Home", "Incantesimi", "Bestiario", "Compendio", "Preferiti"]);
    const boxes = await links.evaluateAll(items => items.map(a => {
      const box = a.getBoundingClientRect(), label = a.querySelector("span");
      return { left: box.left, right: box.right, width: box.width, height: box.height, labelLines: Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight)), labelOverflow: label.scrollWidth > label.clientWidth + 1 };
    }));
    for (const [i, box] of boxes.entries()) {
      expect(box.width, `width ${width} item ${i}`).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.labelLines, `label lines ${width} item ${i}`).toBe(1);
      expect(box.labelOverflow).toBe(false);
      if (i) expect(box.left).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.5);
    }
    expect(boxes.at(-1).right).toBeLessThanOrEqual(width + 0.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const nav = page.getByRole("navigation", { name: "Navigazione principale" });
  await nav.getByRole("link", { name: "Compendio" }).click();
  await expect(page).toHaveURL(/\/compendio$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compendio");
  await expect(page.getByText("Regole, equipaggiamento e strumenti per il tavolo")).toBeVisible();
  await expect(page.locator("main ul > li")).toHaveCount(1);
  for (const path of ["/compendio", "/equipaggiamento", "/equipaggiamento/armi", "/equipaggiamento/armi/pugnale"]) {
    await page.goto(path);
    await expect(nav.locator('a[aria-current="page"]'), path).toHaveText("Compendio");
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(390);
  }
  await page.goto("/equipaggiamento");
  await page.locator("main").getByRole("link", { name: "Compendio", exact: true }).click();
  await expect(page).toHaveURL(/\/compendio$/);
});

test("equipment: Compendio tile, weapons list and cards per edition, combined filters, every sheet", async ({ page, request }) => {
  await page.goto("/compendio");
  await page.locator("main").getByRole("link", { name: /Equipaggiamento/ }).click();
  await expect(page).toHaveURL(/\/equipaggiamento$/);
  await page.getByRole("link", { name: /Armi/ }).click();
  await expect(page.getByText(/^38 armi ·/)).toBeVisible();
  const edition = page.getByRole("group", { name: "Edizione delle regole" });
  await edition.getByRole("button", { name: "2014" }).click();
  await expect(page.getByText(/^37 armi ·/)).toBeVisible();
  await expect(page.getByRole("link", { name: /^Rete/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Pistola/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Vedi come carte" }).click();
  await expect(page).toHaveURL(/vista=carte/);
  await page.getByRole("group", { name: "Categoria" }).getByRole("button", { name: "Da guerra" }).click();
  await page.getByRole("group", { name: "Distanza" }).getByRole("button", { name: "Distanza" }).click();
  await expect(page.getByRole("status").filter({ hasText: /armi?$/ })).toHaveText("5 armi");
  await edition.getByRole("button", { name: "2024" }).click();
  await expect(page.getByRole("status").filter({ hasText: /armi?$/ })).toHaveText("6 armi");
  await expect(page.getByRole("link", { name: /Moschetto/ })).toBeVisible();
  await page.getByRole("group", { name: "Categoria" }).getByRole("button", { name: "Semplici" }).click();
  await expect(page.getByRole("status").filter({ hasText: /armi?$/ })).toHaveText("4 armi");
  // No horizontal scrolling on a narrow phone, in the cards and in a sheet with its comparison.
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.goto("/equipaggiamento/armi/lancia-da-cavaliere");
  await expect(page.locator('[data-edition="2024"]').getByRole("heading", { level: 1 })).toHaveText("Lancia da cavaliere");
  await expect(page.getByRole("heading", { name: "2014 → 2024" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { name: "Arma speciale" })).toBeVisible();
  await page.goto("/equipaggiamento/armi/rete");
  await expect(page.getByText(/Non presente nella tabella 2024/).first()).toBeVisible();
  const ids = JSON.parse(readFileSync("lib/data/srd-weapons-it.json", "utf8")).armi.map(w => w.id);
  for (const id of ids) expect((await request.get(`/equipaggiamento/armi/${id}`)).status(), id).toBe(200);
  expect((await request.get("/equipaggiamento/armi/inesistente")).status()).toBe(404);
});
