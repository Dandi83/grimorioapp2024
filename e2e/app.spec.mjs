import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const catalogRows = page => page.locator("li.catalog-row");

// The tests run as an iPhone, where Safari shows the "Aggiungi alla schermata Home" prompt after
// 1.2 s over the bottom bar: on a slow machine it covered the navigation the tests tap.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

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
  // A row that can be centred: one near the end of the list may sit under the fixed bottom bar,
  // and Playwright then scrolls again before tapping (CI failures of 21 October 2026).
  const target = catalogRows(page).nth(60).getByRole("link");
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.addEventListener("click", () => { sessionStorage.setItem("e2e-scroll-at-click", String(window.scrollY)); }, { capture: true, once: true }));
  await target.click();
  const scrollBefore = Number(await page.evaluate(() => sessionStorage.getItem("e2e-scroll-at-click")));
  expect(scrollBefore).toBeGreaterThan(1000);
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
  await expect(page.locator("main ul > li")).toHaveText([/Equipaggiamento/, /Avanzamento di livello/, /Oggetti magici/]);
  for (const path of ["/compendio", "/equipaggiamento", "/equipaggiamento/armi", "/equipaggiamento/armi/pugnale", "/avanzamento", "/oggetti-magici", "/oggetti-magici/ali-del-volo"]) {
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

test("equipment: armor list per edition with times, sheets in both editions, no repeated labels, no horizontal scroll", async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/equipaggiamento");
  await page.getByRole("link", { name: /Armature/ }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/armature$/);
  await expect(page.getByRole("link", { name: /Armatura imbottita/ })).toBeVisible();
  await expect(page.getByText("Indossare o togliere: azione di Utilizzo")).toBeVisible();
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page.getByRole("link", { name: /^\s*11\s*\+ Des\s*Imbottita/ })).toBeVisible();
  await expect(page.getByText("Indossare 1 azione · togliere 1 azione")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  // Each row says a thing once: no "+ Des" chip next to the badge, no label twice.
  for (const edition of ["2014", "2024"]) {
    await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: edition }).click();
    const rows = await page.locator('main a[href^="/equipaggiamento/armature/"]').evaluateAll(links => links.map(a => a.innerText.split("\n").map(t => t.trim()).filter(Boolean)));
    expect(rows).toHaveLength(13);
    for (const row of rows) {
      expect(new Set(row).size, row.join(" | ")).toBe(row.length);
      expect(row.filter(t => t.includes("Des")).length, row.join(" | ")).toBeLessThanOrEqual(1);
    }
    const badges = await page.locator('main a[href^="/equipaggiamento/armature/"] > span:first-child').evaluateAll(spans => spans.map(s => s.scrollWidth <= s.clientWidth + 1));
    expect(badges.every(Boolean)).toBe(true);
  }
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await page.getByRole("link", { name: /Cotta di maglia/ }).click();
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { level: 1 })).toHaveText("Cotta di maglia");
  await expect(page.locator('[data-edition="2014"]')).toContainText("For 13");
  await expect(page.locator('[data-edition="2014"]').getByText("16", { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-edition="2014"]').getByText("For 13", { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-edition="2014"]')).toContainText("Una cotta di maglia, composta da anelli di metallo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const ids = JSON.parse(readFileSync("lib/data/srd-armor-it.json", "utf8")).armature.map(a => a.id);
  expect(ids).toHaveLength(13);
  for (const id of ids) expect((await request.get(`/equipaggiamento/armature/${id}`)).status(), id).toBe(200);
});

test("adventuring gear 2024: tile, packs, search, a sheet with its table, narrow phones", async ({ page, request }) => {
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/equipaggiamento");
  await page.locator("main").getByRole("link", { name: /Equipaggiamento d’avventura/ }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/avventura$/);
  await expect(page.getByText("La 2014 arriva presto")).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="dotazioni"] li')).toHaveCount(7);
  await expect(page.locator('section[aria-labelledby="tutti"] li')).toHaveCount(81);
  const search = page.getByRole("searchbox", { name: "Cerca un oggetto" });
  await search.fill("corda");
  await expect(page.locator('section[aria-labelledby="tutti"] li')).toHaveText([/Corda/]);
  await search.fill("piede di porco");
  await expect(page.locator('section[aria-labelledby="tutti"] li')).toHaveText([/Piede di porco/]);
  await search.fill("");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `list ${width}`).toBeLessThanOrEqual(width);
  }
  await page.getByRole("link", { name: /^Munizioni/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Munizioni");
  await expect(page.getByRole("heading", { name: "Munizioni", level: 2 })).toBeVisible();
  await expect(page.getByText("Proiettili, arma da fuoco")).toBeVisible();
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `sheet ${width}`).toBeLessThanOrEqual(width);
  }
  await expect(page.getByRole("navigation", { name: "Navigazione principale" }).locator('a[aria-current="page"]')).toHaveText("Compendio");
  const ids = await page.evaluate(async () => [...new DOMParser().parseFromString(await (await fetch("/equipaggiamento/avventura")).text(), "text/html").querySelectorAll('section[aria-labelledby="tutti"] a')].map(a => a.getAttribute("href")));
  expect(ids).toHaveLength(81);
  for (const href of ids) expect((await request.get(href)).status(), href).toBe(200);
  expect(errors).toEqual([]);
});

test("advancement: Compendio tile, table, hit points, bonus feats and XP calculator on narrow phones", async ({ page }) => {
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/compendio");
  await page.locator("main").getByRole("link", { name: /Avanzamento di livello/ }).click();
  await expect(page).toHaveURL(/\/avanzamento$/);
  const nav = page.getByRole("navigation", { name: "Navigazione principale" });
  await expect(nav.locator('a[aria-current="page"]')).toHaveText("Compendio");
  await expect(page.locator("main").getByRole("link", { name: "Compendio", exact: true })).toHaveAttribute("href", "/compendio");
  await expect(page.locator("main ol > li")).toHaveCount(20);
  await expect(page.locator("main ol > li").nth(3)).toContainText("2.700");
  await expect(page.locator("main ol > li").nth(19)).toContainText("355.000");
  await expect(page.getByText("Regola 2024")).toBeVisible();
  await expect(page.getByText(/un talento a scelta per ogni 30\.000 PE guadagnati oltre i 355\.000 PE/)).toBeVisible();
  // Calculator: 4 characters, 3 monsters of GS 1 (200 PE each) → 600 total, 150 each.
  const counter = page.getByRole("group", { name: "Riga 1, mostri" });
  await counter.getByRole("button", { name: /più uno/ }).click();
  await counter.getByRole("button", { name: /più uno/ }).click();
  await expect(page.getByTestId("pe-totali")).toHaveText("600");
  await expect(page.getByTestId("pe-testa")).toHaveText("150");
  // A second row with GS 2 (450 PE): 1.050 total, 262 each with 2 PE left over.
  await page.getByRole("button", { name: "Aggiungi riga" }).click();
  await page.getByLabel("Riga 2: grado sfida").selectOption({ label: "GS 2 · 450 PE" });
  await expect(page.getByTestId("pe-totali")).toHaveText("1.050");
  await expect(page.getByTestId("pe-testa")).toHaveText("262");
  await expect(page.getByText(/restano 2 PE non divisibili/)).toBeVisible();
  await page.getByLabel(/PE già posseduti/).fill("2.500");
  await expect(page.getByTestId("pe-nuovo")).toHaveText("2.762");
  await expect(page.getByTestId("livello")).toHaveText("4º");
  await expect(page.getByTestId("mancanti")).toContainText("3.738 PE");
  await page.getByRole("button", { name: "Azzera" }).click();
  await expect(page.getByTestId("pe-totali")).toHaveText("200");
  await expect(page.getByLabel(/PE già posseduti/)).toHaveValue("");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `width ${width}`).toBeLessThanOrEqual(width);
    const small = await page.locator("main button, main select, main input").evaluateAll(items => items.filter(item => { const box = item.getBoundingClientRect(); return box.height < 44 || box.width < 44; }).map(item => item.outerHTML.slice(0, 80)));
    expect(small, `targets at ${width}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("adventuring gear 2014: list with groups and packs, search, sheets, renamed object and missing edition", async ({ page }) => {
  const errors = [];
  // The browser's own request for /favicon.ico (the site has icon.png) is not a page error.
  page.on("console", message => { if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/equipaggiamento/avventura");
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page.getByText(/^106 voci · SRD 5\.1$/)).toBeVisible();
  const all = page.locator('section[aria-labelledby="tutti"] > ul > li');
  await expect(all).toHaveCount(94);
  await expect(page.locator('section[aria-labelledby="dotazioni"] li')).toHaveCount(7);
  await expect(all.filter({ hasText: "Focus arcano" })).toContainText("Globo");
  const search = page.getByRole("searchbox", { name: "Cerca un oggetto" });
  await search.fill("corda");
  await expect(all).toHaveText([/Corda di Canapa/, /Corda di Seta/]);
  await search.fill("piede di porco");
  await expect(all).toHaveText([/Piede di porco/]);
  await search.fill("");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `list ${width}`).toBeLessThanOrEqual(width);
  }
  // A sheet with its 2014 text.
  await all.filter({ hasText: "Acido (fiala)" }).getByRole("link").click();
  await expect(page.locator('[data-edition="2014"]')).toContainText("2d6 danni da acido");
  await page.getByRole("button", { name: "Torna indietro" }).click();
  // A group sheet: Munizioni with its rows.
  await all.filter({ hasText: /^Munizioni/ }).getByRole("link").click();
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { level: 1 })).toHaveText("Munizioni");
  await expect(page.locator('[data-edition="2014"]')).toContainText("Proiettili da fionda (20)");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `group ${width}`).toBeLessThanOrEqual(width);
  }
  // A different name: Canestro (2014) has its own address; 2024 goes to Cesto.
  await page.goto("/equipaggiamento/avventura/canestro");
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { level: 1 })).toHaveText("Canestro");
  await expect(page.locator('[data-edition="2014"]')).toContainText("2 cubi con spigolo di 30 cm/20 kg");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `canestro ${width}`).toBeLessThanOrEqual(width);
  }
  await expect(page.getByRole("heading", { name: "2014 → 2024" })).toBeVisible();
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2024" }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/avventura\/cesto$/);
  await expect(page.locator('[data-edition="2024"]').getByRole("heading", { level: 1 })).toHaveText("Cesto");
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/avventura\/canestro$/);
  // Same name, no change: no comparison table.
  await page.goto("/equipaggiamento/avventura/acido");
  await expect(page.getByRole("heading", { name: "2014 → 2024" })).toHaveCount(0);
  // Only in 2014: the note, then 2024 goes back to the list with a short notice.
  await page.goto("/equipaggiamento/avventura/abaco");
  await expect(page.getByText("Solo edizione 2014")).toBeVisible();
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2024" }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/avventura$/);
  await expect(page.getByText("Questo oggetto non c’è nel 2024.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("magic items 2024: Compendio tile, search, combined filters in the address, sheets with tables, narrow phones", async ({ page, request }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !/favicon\.ico/.test(message.location().url)) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/compendio");
  const tiles = page.locator("main ul > li a");
  await expect(tiles.nth(2)).toContainText("Oggetti magici");
  await expect(tiles.nth(2)).toContainText("Elenco A–Z con rarità e sintonia");
  await tiles.nth(2).click();
  await expect(page).toHaveURL(/\/oggetti-magici$/);
  await expect(page.getByRole("navigation", { name: "Navigazione principale" }).locator('a[aria-current="page"]')).toHaveText("Compendio");
  const rows = page.locator('main a[href^="/oggetti-magici/"]');
  await expect(rows).toHaveCount(258);
  await expect(page.getByRole("status").filter({ hasText: /oggetti/ })).toHaveText("258 oggetti");
  // No edition labels in the list: names, type, rarity and the attunement chip only.
  await expect(page.locator("main").getByText("D&D5e")).toHaveCount(0);
  const search = page.getByRole("searchbox", { name: "Cerca un oggetto magico" });
  await search.fill("spada");
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.allInnerTexts()) expect(text.toLowerCase()).toContain("spada");
  await search.fill("pozione");
  expect(await rows.count()).toBeGreaterThan(10);
  await expect(page).toHaveURL(/q=pozione/);
  await search.fill("");
  // Rarità Raro + Tipo Anello + Sintonia richiesta, then reopened from the address.
  await page.getByRole("button", { name: "Filtri" }).click();
  const sheet = page.getByRole("dialog", { name: "Filtri" });
  await sheet.getByRole("button", { name: "Raro", exact: true }).click();
  await sheet.getByRole("button", { name: "Anello", exact: true }).click();
  await sheet.getByRole("button", { name: "Richiesta", exact: true }).click();
  await sheet.getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
  await expect(page).toHaveURL(/rarita=raro&tipo=anello&sintonia=richiesta/);
  const filtered = await rows.allInnerTexts();
  expect(filtered.length).toBeGreaterThan(2);
  for (const text of filtered) { expect(text).toContain("Anello"); expect(text).toContain("Sintonia"); }
  await page.reload();
  await expect(rows).toHaveCount(filtered.length);
  await expect(page.getByRole("list", { name: "Filtri attivi" }).getByRole("button")).toHaveCount(3);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `list ${width}`).toBeLessThanOrEqual(width);
  }
  // Touch targets of the list: rows, filters button and active filters at least 44 px high.
  for (const box of [await rows.first().boundingBox(), await page.getByRole("button", { name: /^Filtri/ }).boundingBox()]) expect(box.height).toBeGreaterThanOrEqual(44);
  await page.goto("/oggetti-magici");
  // Sheets with tables, read at 360 px without horizontal scroll.
  await page.setViewportSize({ width: 360, height: 800 });
  for (const [id, name, tableRows] of [["amuleto-dei-piani", "Amuleto dei piani", [5]], ["bacchetta-delle-meraviglie", "Bacchetta delle meraviglie", [18]],
    ["apparatus-del-granchio", "Apparatus del granchio", [10]], ["ampolla-di-ferro", "Ampolla di ferro", []], ["zainetto-pratico", "Zainetto pratico", []]]) {
    await page.goto(`/oggetti-magici/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    const counts = await page.locator("[data-table-rows]").evaluateAll(tables => tables.map(t => Number(t.getAttribute("data-table-rows"))));
    expect(counts, id).toEqual(tableRows);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), id).toBeLessThanOrEqual(360);
  }
  // Chips from the type line, the attunement requirement as printed, a back link, the source page.
  await page.goto("/oggetti-magici/bacchetta-del-mago-da-guerra-1-2-o-3");
  const chips = page.getByRole("list", { name: "Tipo, rarità e sintonia" });
  await expect(chips).toContainText("Bacchetta");
  await expect(chips).toContainText("Non comune (+1), rara (+2) o molto rara (+3)");
  await expect(chips).toContainText("Richiede sintonia con un incantatore");
  await expect(page.getByRole("button", { name: "Torna indietro" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fonte ufficiale, pagina 247/ })).toHaveAttribute("href", /IT_SRD_CC_v5\.2\.1\.pdf#page=247$/);
  // The rules stay in the manual, which production does not publish: no link there.
  await expect(page.getByRole("link", { name: "Regole sugli oggetti magici" })).toHaveCount(0);
  // A stat block inside an item.
  await page.goto("/oggetti-magici/mazzo-delle-meraviglie");
  await expect(page.getByRole("region", { name: "Scheda delle statistiche" })).toContainText("Avatar della morte");
  const hrefs = await page.evaluate(async () => [...new DOMParser().parseFromString(await (await fetch("/oggetti-magici")).text(), "text/html").querySelectorAll('main a[href^="/oggetti-magici/"]')].map(a => a.getAttribute("href")));
  expect(hrefs).toHaveLength(258);
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
  expect((await request.get("/oggetti-magici/inesistente")).status()).toBe(404);
  expect(errors).toEqual([]);
});
