import { test, expect, devices } from "@playwright/test";
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
  expect(response.headers()["content-security-policy"]).toMatch(/^default-src 'self'; script-src 'self' 'unsafe-inline'; .*frame-ancestors 'none'/);
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
  await expect(page.getByRole("link", { name: "Passa alla versione 2024" })).toHaveAttribute("href", "/spell/aiuto");
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
  const cookie = (await page.context().cookies()).find(c => c.name === "__Host-grimorio_admin");
  expect(cookie?.value).toMatch(/^v3\.\d+\.[0-9a-f]{36}\.[0-9a-f]{64}$/);
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Strict");
  expect(cookie?.expires - Date.now() / 1000).toBeLessThanOrEqual(7 * 24 * 3600 + 60);
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
  // Logout revokes the session on the server: the same cookie, put back, no longer opens the admin area.
  await page.context().addCookies([cookie]);
  await page.goto("/admin");
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
  await expect(page.locator("main ul > li")).toHaveText([/Classi/, /Equipaggiamento/, /Avanzamento di livello/, /Oggetti magici/, /Condizioni/]);
  for (const path of ["/compendio", "/classi", "/classi/guerriero", "/equipaggiamento", "/equipaggiamento/armi", "/equipaggiamento/armi/pugnale", "/avanzamento", "/oggetti-magici", "/oggetti-magici/ali-del-volo", "/compendio/condizioni"]) {
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

test("tools: tile, lists of both editions, search, sheets, instrument 2014 → 2024 and missing edition", async ({ page }) => {
  const errors = [];
  // The browser's own request for /favicon.ico (the site has icon.png) is not a page error.
  page.on("console", message => { if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  const widths = async label => {
    for (const width of [360, 375, 390]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${label} ${width}`).toBeLessThanOrEqual(width);
    }
  };
  await page.goto("/equipaggiamento");
  await page.locator("main").getByRole("link", { name: /Strumenti/ }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/strumenti$/);
  await expect(page.getByText(/^25 strumenti · SRD 5\.2\.1$/)).toBeVisible();
  await expect(page.locator("main section h2")).toHaveText(["Strumenti da artigiano", "Altri strumenti"]);
  const search = page.getByRole("searchbox", { name: "Cerca uno strumento" });
  await search.fill("scasso");
  await expect(page.locator("main section li")).toHaveText([/Arnesi da scasso/]);
  await search.fill("");
  await widths("list 2024");
  const selector = page.getByRole("group", { name: "Edizione delle regole" });
  await selector.getByRole("button", { name: "2014" }).click();
  await expect(page.getByText(/^35 strumenti · SRD 5\.1$/)).toBeVisible();
  await expect(page.locator("main section h2")).toHaveText(["Strumenti da artigiano", "Giochi", "Strumenti musicali", "Altri strumenti"]);
  await search.fill("liuto");
  await expect(page.locator("main section li")).toHaveText([/Liuto/]);
  await search.fill("scasso");
  await expect(page.locator("main section li")).toHaveText([/Arnesi da scasso/]);
  await search.fill("");
  await widths("list 2014");
  // 2024 sheet with Creazione.
  await page.goto("/equipaggiamento/strumenti/scorte-da-alchimista");
  await selector.getByRole("button", { name: "2024" }).click();
  await expect(page.locator('[data-edition="2024"]').getByRole("heading", { name: "Creazione" })).toBeVisible();
  await expect(page.locator('[data-edition="2024"]')).toContainText("Intelligenza");
  await widths("sheet 2024");
  // 2014 sheet with its description.
  await page.goto("/equipaggiamento/strumenti/arnesi-da-scasso");
  await selector.getByRole("button", { name: "2014" }).click();
  await expect(page.locator('[data-edition="2014"]')).toContainText("Questo set di arnesi");
  // Liuto 2014 → Strumento musicale 2024, then back to the list for 2014.
  await page.goto("/equipaggiamento/strumenti/liuto");
  await expect(page.getByText(/Nel 2024: Strumento musicale, variante «Liuto»/)).toBeVisible();
  await widths("liuto");
  await selector.getByRole("button", { name: "2024" }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/strumenti\/strumento-musicale$/);
  await expect(page.locator('[data-edition="2024"]').getByRole("heading", { name: "Varianti" })).toBeVisible();
  await selector.getByRole("button", { name: "2014" }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/strumenti$/);
  await expect(page.getByText("Questo strumento non c’è nel 2014.")).toBeVisible();
  // Mazzo di carte 2014 → Gioco 2024, variant «carte da gioco» (approved pairing, same cost 5 ma).
  await page.goto("/equipaggiamento/strumenti/mazzo-di-carte");
  await expect(page.getByText(/Nel 2024: Gioco, variante «Carte da gioco»/)).toBeVisible();
  await selector.getByRole("button", { name: "2024" }).click();
  await expect(page).toHaveURL(/\/equipaggiamento\/strumenti\/gioco$/);
  expect(errors).toEqual([]);
});

test("magic items 2024: Compendio tile, search, combined filters in the address, sheets with tables, narrow phones", async ({ page, request }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !/favicon\.ico/.test(message.location().url)) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/compendio");
  const tiles = page.getByRole("list", { name: "Regole e oggetti" }).locator("li a");
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
    await expect(page.locator('[data-edition="2024"]').getByRole("heading", { level: 1 })).toHaveText(name);
    const counts = await page.locator('[data-edition="2024"] [data-table-rows]').evaluateAll(tables => tables.map(t => Number(t.getAttribute("data-table-rows"))));
    expect(counts, id).toEqual(tableRows);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), id).toBeLessThanOrEqual(360);
  }
  // Chips from the type line, the attunement requirement as printed, a back link, the source page.
  await page.goto("/oggetti-magici/bacchetta-del-mago-da-guerra-1-2-o-3");
  const chips = page.locator('[data-edition="2024"]').getByRole("list", { name: "Tipo, rarità e sintonia" });
  await expect(chips).toContainText("Bacchetta");
  await expect(chips).toContainText("Non comune (+1), rara (+2) o molto rara (+3)");
  await expect(chips).toContainText("Richiede sintonia con un incantatore");
  await expect(page.getByRole("button", { name: "Torna indietro" })).toBeVisible();
  await expect(page.locator('[data-edition="2024"]').getByRole("link", { name: /Fonte ufficiale, pagina 247/ })).toHaveAttribute("href", /IT_SRD_CC_v5\.2\.1\.pdf#page=247$/);
  // The rules stay in the manual, which production does not publish: no link there.
  await expect(page.getByRole("link", { name: "Regole sugli oggetti magici" })).toHaveCount(0);
  // A stat block inside an item.
  await page.goto("/oggetti-magici/mazzo-delle-meraviglie");
  await expect(page.locator('[data-edition="2024"]').getByRole("region", { name: "Scheda delle statistiche" })).toContainText("Avatar della morte");
  const hrefs = await page.evaluate(async () => [...new DOMParser().parseFromString(await (await fetch("/oggetti-magici")).text(), "text/html").querySelectorAll('main a[href^="/oggetti-magici/"]')].map(a => a.getAttribute("href")));
  expect(hrefs).toHaveLength(258);
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
  expect((await request.get("/oggetti-magici/inesistente")).status()).toBe(404);
  expect(errors).toEqual([]);
});

test("magic items 2014: selector remembered, search, renamed and single-edition items, 2014 → 2024 box", async ({ page, request }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !/favicon\.ico/.test(message.location().url)) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/oggetti-magici");
  const rows = page.locator('main a[href^="/oggetti-magici/"]');
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(rows).toHaveCount(240);
  await expect(page.getByText("SRD 5.1", { exact: true })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Cerca un oggetto magico" });
  await search.fill("spada");
  for (const text of await rows.allInnerTexts()) expect(text.toLowerCase()).toContain("spada");
  await search.fill("pozione");
  await expect(rows.filter({ hasText: "Pozione dell'invisibilità" })).toHaveCount(1);
  await search.fill("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  // The choice is remembered (shared with the Equipaggiamento section).
  await page.reload();
  await expect(rows).toHaveCount(240);
  // A renamed item has its own 2014 address; the box shows name and rarity, and leads to the 2024 sheet.
  await rows.filter({ hasText: "Pozione dell'invisibilità" }).click();
  await expect(page).toHaveURL(/\/oggetti-magici\/pozione-dell-invisibilita$/);
  const panel2014 = page.locator('[data-edition="2014"]');
  await expect(panel2014.getByRole("heading", { level: 1 })).toHaveText("Pozione dell'invisibilità");
  const box = panel2014.getByRole("region", { name: "Differenze tra le edizioni" });
  await expect(box).toContainText("Molto rara");
  await expect(box).toContainText("Rara");
  await box.getByRole("link", { name: "Passa alla versione 2024" }).click();
  await expect(page).toHaveURL(/\/oggetti-magici\/pozione-di-invisibilita\?edizione=2024$/);
  await expect(page.locator('[data-edition="2024"]').getByRole("heading", { level: 1 })).toHaveText("Pozione di invisibilità");
  // Same name: both editions on one page, attunement change computed from the data.
  await page.goto("/oggetti-magici/scopa-volante?edizione=2014");
  const scopa = page.locator('[data-edition="2014"]');
  await expect(scopa).toBeVisible();
  await expect(scopa.getByRole("region", { name: "Differenze tra le edizioni" })).toContainText("Non richiesta");
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2024" }).click();
  await expect(page.locator('[data-edition="2024"]')).toBeVisible();
  await expect(page.locator('[data-edition="2024"]').getByRole("region", { name: "Differenze tra le edizioni" })).toContainText("Richiesta");
  // No box when nothing printed changes.
  await page.goto("/oggetti-magici/ali-del-volo");
  await expect(page.getByRole("region", { name: "Differenze tra le edizioni" })).toHaveCount(0);
  // Only in 2014, and only in 2024: the note, and back to the list with a notice.
  await page.goto("/oggetti-magici/unguento-rigenerativo");
  await expect(page.getByRole("note")).toHaveText("Solo edizione 2014");
  await page.goto("/oggetti-magici/arco-energetico");
  await expect(page.getByRole("note")).toHaveText("Solo edizione 2024");
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page).toHaveURL(/\/oggetti-magici$/);
  await expect(page.getByRole("status").filter({ hasText: "non c’è" })).toHaveText("Questo oggetto non c’è nel 2014.");
  // 2014 Sfera di cristallo points to the three 2024 crystal balls.
  await page.goto("/oggetti-magici/sfera-di-cristallo?edizione=2014");
  await expect(page.getByRole("region", { name: "Vedi anche" }).getByRole("link")).toHaveCount(3);
  // A 2014 table at 360 px.
  await page.goto("/oggetti-magici/ampolla-di-ferro?edizione=2014");
  await expect(page.locator('[data-edition="2014"] [data-table-rows]')).toHaveAttribute("data-table-rows", "20");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  for (const id of ["piuma-magica", "sfera-della-stirpe-dei-draghi", "armatura-demoniaca", "freccia-assassina"]) expect((await request.get(`/oggetti-magici/${id}`)).status(), id).toBe(200);
  expect(errors).toEqual([]);
});

test("conditions: Compendio tile like the others, list per edition, note of the 2014 list, every link opens its page, narrow phones", async ({ page, request }) => {
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !/favicon\.ico/.test(message.location().url)) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/compendio");
  const tile = page.getByRole("list", { name: "Regole e oggetti" }).locator("li a").nth(3);
  await expect(tile).toContainText("Condizioni");
  await expect(tile).toContainText("Accecato, Avvelenato, Spaventato…");
  await expect(page.locator("main").getByText("NUOVO")).toHaveCount(0);
  // Same border and height as the other tiles.
  const styles = await page.locator("main ul[aria-label] > li a").evaluateAll(links => links.map(a => [getComputedStyle(a).borderTopWidth, getComputedStyle(a).borderTopColor, a.className]));
  for (const style of styles) expect(style).toEqual(styles[0]);
  await tile.click();
  await expect(page).toHaveURL(/\/compendio\/condizioni$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Condizioni");
  await expect(page.getByRole("navigation", { name: "Navigazione principale" }).locator('a[aria-current="page"]')).toHaveText("Compendio");
  const rows = page.locator('main ul a[href^="/manuale/condizioni-"]');
  await expect(rows).toHaveCount(15);
  await expect(rows.first()).toHaveText("Accecato");
  await expect(rows.filter({ hasText: "Indebolimento" })).toHaveCount(1);
  for (const box of await rows.evaluateAll(links => links.map(a => a.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `list ${width}`).toBeLessThanOrEqual(width);
  }
  const selector = page.getByRole("group", { name: "Edizione delle regole" });
  await selector.getByRole("button", { name: "2014" }).click();
  await expect(rows).toHaveCount(11);
  await expect(rows.first()).toHaveAttribute("href", "/manuale/condizioni-accecato-2014");
  const note = page.getByText(/Nell’SRD 5\.1 italiano non sono stampate/);
  await expect(note).toHaveText("Nell’SRD 5.1 italiano non sono stampate: Prono, Spaventato, Stordito, Trattenuto. Le trovi nell’edizione 2024.");
  expect(await note.getByRole("link").evaluateAll(links => links.map(a => a.getAttribute("href")))).toEqual(["/manuale/condizioni-prono", "/manuale/condizioni-spaventato", "/manuale/condizioni-stordito", "/manuale/condizioni-trattenuto"]);
  // The choice is remembered, as in the other Compendio sections.
  await page.reload();
  await expect(rows).toHaveCount(11);
  for (const href of await rows.evaluateAll(links => links.map(a => a.getAttribute("href")))) expect((await request.get(href)).status(), href).toBe(200);
  await selector.getByRole("button", { name: "2024" }).click();
  await expect(rows).toHaveCount(15);
  await expect(page.getByText(/non sono stampate/)).toHaveCount(0);
  expect(await selector.getByRole("button").allInnerTexts()).toEqual(["2024", "2014"]);
  for (const href of await rows.evaluateAll(links => links.map(a => a.getAttribute("href")))) expect((await request.get(href)).status(), href).toBe(200);
  await rows.filter({ hasText: "Avvelenato" }).click();
  await expect(page).toHaveURL(/\/manuale\/condizioni-avvelenato$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Avvelenato");
  expect(errors).toEqual([]);
});

test("search in Home: field only, panel with filters, results by section, back and Annulla, every address", async ({ page, request }) => {
  test.setTimeout(240_000);
  const errors = [], indexRequests = [];
  page.on("console", message => { if (message.type() === "error" && !/favicon\.ico/.test(message.location().url)) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => { if (req.url().includes("/ricerca-indice.json")) indexRequests.push(req.url()); });
  await page.goto("/");
  const field = page.getByRole("button", { name: "Cerca in tutto il Grimorio…" });
  await expect(field).toBeVisible();
  // Only the sentence and the field: the quick suggestions were removed (21 October 2026).
  await expect(page.getByRole("list", { name: "Ricerche rapide" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "spada lunga" })).toHaveCount(0);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `home ${width}`).toBeLessThanOrEqual(width);
    const box = await field.boundingBox(), quote = await page.locator("#home-quote").boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(54);
    expect(box.y).toBeGreaterThan(quote.y + quote.height);
    // The field keeps its place over the shade of the picture, not at its bottom edge.
    const picture = await page.locator("#home-quote").locator("xpath=ancestor::section[1]").boundingBox();
    expect(picture.y + picture.height - (box.y + box.height)).toBeGreaterThanOrEqual(90);
  }
  // The Home stays light: the index is loaded only when the panel opens.
  await page.waitForTimeout(500);
  expect(indexRequests).toEqual([]);
  await field.click();
  const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  const input = dialog.getByRole("searchbox");
  await expect(input).toBeFocused();
  expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await expect(dialog.getByText("Prova a scrivere…")).toBeVisible();
  const filters = dialog.getByRole("group", { name: "Sezioni" }).getByRole("button");
  await expect(filters).toHaveText(["Tutto", "Incantesimi", "Mostri", "Classi", "Equipaggiamento", "Oggetti magici", "Condizioni"]);
  expect(indexRequests.length).toBe(1);
  // "dra": spells and monsters while typing, the typed part highlighted.
  await input.fill("dra");
  const group = name => dialog.getByRole("region", { name });
  await expect(group("Incantesimi")).toBeVisible();
  await expect(group("Mostri")).toBeVisible();
  await expect(group("Mostri").locator("mark").first()).toHaveText(/^dra$/i);
  for (const height of await dialog.locator("#search-results a").evaluateAll(links => links.map(a => a.getBoundingClientRect().height))) expect(height).toBeGreaterThanOrEqual(52);
  await filters.filter({ hasText: "Mostri" }).click();
  await expect(group("Incantesimi")).toHaveCount(0);
  await expect(group("Mostri")).toBeVisible();
  await filters.filter({ hasText: "Tutto" }).click();
  await input.fill("avvelenato");
  await expect(group("Condizioni")).toBeVisible();
  await expect(group("Condizioni").getByRole("link").first()).toContainText("Condizione");
  await input.fill("xyzqw");
  await expect(dialog.locator("p:not(.sr-only)", { hasText: "Nessun risultato per «xyzqw»" })).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Nessun risultato per «xyzqw»");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `panel ${width}`).toBeLessThanOrEqual(width);
  }
  // A magic item: its sheet; back comes to the search with the text still written.
  await input.fill("anello di res");
  await group("Oggetti magici").getByRole("link", { name: /Anello di resistenza/ }).click();
  await expect(page).toHaveURL(/\/oggetti-magici\/anello-di-resistenza$/);
  await expect(page.locator('[data-edition="2024"] h1')).toHaveText("Anello di resistenza");
  await page.goBack();
  await expect(page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" }).getByRole("searchbox")).toHaveValue("anello di res");
  // "Mostra tutti" opens the whole group.
  await input.fill("anello");
  const rings = group("Oggetti magici");
  await expect(rings.getByRole("link")).toHaveCount(8);
  await rings.getByRole("button", { name: /^Mostra tutti \(\d+\)$/ }).click();
  expect(await rings.getByRole("link").count()).toBeGreaterThan(8);
  // Annulla: back to the Home.
  await dialog.getByRole("button", { name: "Annulla" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  // Tapping the field opens the panel again.
  await field.click();
  await page.getByRole("dialog").getByRole("searchbox").fill("spada lunga");
  await expect(group("Equipaggiamento").getByRole("link", { name: /Spada lunga/ })).toBeVisible();
  // Every address of the index exists.
  const index = await (await request.get("/ricerca-indice.json")).json();
  expect(index.sections.map(s => s.k)).not.toContain("manuale");
  const hrefs = [...new Set(index.rows.flatMap(row => row.slice(3)))];
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
  expect(errors).toEqual([]);
});

test("reports: Segnala from a card with its edition, without email, invalid email, thanks, spam refused, admin list and detail", async ({ page, request }) => {
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(String(error)));
  // From a weapon card shown in 2014: the page and the edition on screen are filled in.
  await page.goto("/equipaggiamento/armi/spada-lunga");
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await page.getByRole("link", { name: "Segnala", exact: true }).click();
  await expect(page).toHaveURL(/\/segnala\?pagina=%2Fequipaggiamento%2Farmi%2Fspada-lunga&titolo=Spada\+lunga&edizione=2014$/);
  await expect(page.getByRole("heading", { name: "Segnala", level: 1 })).toBeVisible();
  await expect(page.getByText("Riguarda: Spada lunga (2014)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Errore" })).toHaveAttribute("aria-pressed", "true");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `form ${width}`).toBeLessThanOrEqual(width);
  }
  const message = page.getByLabel("Messaggio");
  const email = page.getByLabel("Email per ricevere risposta (facoltativa)");
  expect(await message.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await email.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // Too short, then an invalid email: clear messages, nothing sent, the text stays.
  await message.fill("corto");
  await page.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(page.getByText("Scrivi almeno 10 caratteri.")).toBeVisible();
  await message.fill("Il costo nella tabella 2014 non corrisponde.");
  await expect(page.getByText("44 / 2000")).toBeVisible();
  await email.fill("nome@");
  await page.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(page.getByText("Email non valida: controllala o lasciala vuota.")).toBeVisible();
  await expect(message).toHaveValue("Il costo nella tabella 2014 non corrisponde.");
  await email.fill("lettore@esempio.it");
  await page.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(page.getByRole("heading", { name: "Grazie!" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Ho ricevuto la tua segnalazione. La leggerò appena possibile.")).toBeVisible();
  // Without email, from the Home link, as a suggestion.
  await page.getByRole("link", { name: "Torna alla Home" }).click();
  await page.getByRole("link", { name: "Segnala un errore o un consiglio" }).click();
  await expect(page.getByText(/^Riguarda:/)).toHaveCount(0);
  await page.getByRole("button", { name: "Consiglio" }).click();
  await page.getByLabel("Messaggio").fill("Una modalità per giocare la sera sarebbe comoda.");
  await page.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(page.getByRole("heading", { name: "Grazie!" })).toBeVisible({ timeout: 15000 });
  // Spam: the hidden field filled by a program; the answer looks the same, nothing is saved.
  await page.goto("/segnala");
  await page.getByLabel("Messaggio").fill("Compra ora, offerta imperdibile per tutti.");
  await page.locator('input[name="sito"]').evaluate(el => { el.value = "https://spam.example"; });
  await page.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(page.getByRole("heading", { name: "Grazie!" })).toBeVisible({ timeout: 15000 });
  // Direct calls: another site, a forged token, a token used at once.
  const body = { tipo: "errore", messaggio: "Messaggio inviato da uno script.", token: "f1.1.abc" };
  expect((await request.post("/api/segnalazioni", { data: body, headers: { origin: "https://evil.example" } })).status()).toBe(403);
  expect((await request.post("/api/segnalazioni", { data: body, headers: { origin: "http://127.0.0.1:3100" } })).status()).toBe(400);
  const { token } = await (await request.get("/api/segnalazioni")).json();
  expect((await request.post("/api/segnalazioni", { data: { ...body, token }, headers: { origin: "http://127.0.0.1:3100" } })).status()).toBe(429);

  // Admin: without login the list asks for the passcode.
  await page.goto("/admin/segnalazioni");
  await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  // Login in place: the same page opens with the list.
  await expect(page).toHaveURL(/\/admin\/segnalazioni$/);
  await expect(page.getByRole("heading", { name: "Segnalazioni" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "2 segnalazioni nuove" })).toBeVisible();
  await page.getByRole("link", { name: "2 segnalazioni nuove" }).click();
  await expect(page.getByText("2 nuove")).toBeVisible();
  const rows = page.locator("main ul li");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Una modalità per giocare la sera");
  await expect(rows.first()).toContainText("Consiglio");
  await expect(rows.nth(1)).toContainText("Spada lunga (2014)");
  await expect(page.getByText("Compra ora")).toHaveCount(0);
  await expect(rows.first().getByText("Email di avviso non inviata")).toBeVisible();
  // Filters.
  await page.getByRole("link", { name: "Errori", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole("link", { name: "Tutte", exact: true }).click();
  await expect(rows).toHaveCount(2);
  // Detail: opening marks it as read; reply link; state; private note; deletion.
  await rows.nth(1).getByRole("link").click();
  await expect(page.getByText("stato: letta")).toBeVisible();
  await expect(page.getByText("Il costo nella tabella 2014 non corrisponde.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Spada lunga" })).toHaveAttribute("href", "/equipaggiamento/armi/spada-lunga?edizione=2014");
  await expect(page.getByRole("link", { name: "Rispondi via email" })).toHaveAttribute("href", /^mailto:lettore@esempio\.it\?subject=/);
  await page.getByRole("button", { name: "Risolta" }).click();
  await expect(page.getByRole("button", { name: "Risolta" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Nota privata").fill("Verificare sul PDF, p. 149");
  await page.getByRole("button", { name: "Salva nota" }).click();
  await expect(page.getByText("Nota salvata.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nota privata")).toHaveValue("Verificare sul PDF, p. 149");
  await expect(page.getByRole("button", { name: "Risolta" })).toHaveAttribute("aria-pressed", "true");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Elimina segnalazione" }).click();
  await expect(page).toHaveURL(/\/admin\/segnalazioni$/);
  await expect(rows).toHaveCount(1);
  await expect(page.getByText("1 nuova")).toBeVisible();
  // Never indexed.
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toMatch(/noindex/);
  expect(errors).toEqual([]);
});

test("security: headers on every kind of page, admin pages and API closed without login or secret", async ({ page, request }) => {
  const pages = ["/", "/grimorio", "/spell/dardo-incantato", "/mostro/lich", "/equipaggiamento/armi/spada-lunga", "/oggetti-magici", "/segnala", "/admin", "/admin/segnalazioni", "/admin/statistiche", "/ricerca-indice.json", "/sw.js", "/api/segnalazioni"];
  for (const path of pages) {
    const response = await request.get(path);
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toMatch(/default-src 'self'.*object-src 'none'.*frame-ancestors 'none'/);
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["strict-transport-security"], path).toMatch(/max-age=\d+/);
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
  }
  // Admin pages without login: the login form, never the data.
  for (const path of ["/admin", "/admin/segnalazioni", "/admin/statistiche", "/admin/segnalazioni/11111111-1111-4111-8111-111111111111"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain("Area riservata");
    expect(html, path).not.toMatch(/Rispondi via email|Visitatori unici|incantesimi · \d+ mostri/);
  }
  // Maintenance API: 401 without the secret or with a wrong one.
  expect((await request.get("/api/analytics/maintenance")).status()).toBe(401);
  expect((await request.get("/api/analytics/maintenance", { headers: { authorization: "Bearer sbagliato" } })).status()).toBe(401);
  // A report from another site is refused.
  expect((await request.post("/api/segnalazioni", { data: { tipo: "errore", messaggio: "Prova da un altro sito." }, headers: { origin: "https://evil.example" } })).status()).toBe(403);
  // Pages work under the policy: no blocked script, style, image or font.
  const violations = [];
  page.on("console", message => { if (/Content Security Policy/i.test(message.text())) violations.push(message.text()); });
  for (const path of ["/", "/spell/dardo-incantato", "/mostro/lich", "/oggetti-magici/bacchetta-delle-meraviglie", "/segnala", "/admin"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});

test("admin corrections: tiles, weapons list per edition, edit with reason, public card with note, search, log, undo, export", async ({ page, request }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(String(error)));
  // Without login: no editor, no export.
  await page.goto("/admin/contenuti/armi");
  await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
  expect((await request.get("/admin/registro/esporta")).status()).toBe(401);
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("heading", { name: "Armi", level: 1 })).toBeVisible();
  // Home of the admin area: tiles and counters.
  await page.goto("/admin");
  const tiles = page.getByRole("navigation", { name: "Sezioni da modificare" });
  for (const name of ["Incantesimi", "Mostri", "Armi", "Armature", "Equipaggiamento", "Strumenti", "Oggetti magici", "Condizioni", "Manuale"]) await expect(tiles.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(tiles.getByText("In arrivo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /0\s*modifiche manuali/ })).toBeVisible();
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin ${width}`).toBeLessThanOrEqual(width);
  }
  // The spell and creature editors are still there.
  await tiles.getByRole("link", { name: /^Mostri/ }).click();
  await expect(page.getByRole("tab", { name: "Mostri" })).toHaveAttribute("aria-selected", "true");
  await page.goto("/admin");
  await tiles.getByRole("link", { name: /^Armi/ }).click();
  // Weapons list: 2014 selector and search.
  await page.getByRole("navigation", { name: "Edizione" }).getByRole("link", { name: "2014" }).click();
  await expect(page).toHaveURL(/edizione=2014/);
  await page.getByRole("searchbox", { name: "Cerca una scheda" }).fill("trid");
  await expect(page.locator("main ul li")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Cerca una scheda" }).fill("");
  await page.getByRole("navigation", { name: "Edizione" }).getByRole("link", { name: "2024" }).click();
  await page.getByRole("link", { name: /^Tridente/ }).click();
  await expect(page.getByRole("heading", { name: "Tridente (2024)" })).toBeVisible();
  // Edit: invalid values and missing reason are refused before saving.
  const peso = page.getByLabel("Peso", { exact: true });
  await expect(page.getByText("Testo originale del manuale: 2 kg")).toBeVisible();
  await peso.fill("2 hg");
  await page.getByRole("button", { name: "Salva modifica" }).click();
  await expect(page.getByText(/Peso: Usa un peso come/)).toBeVisible();
  await expect(page.getByText(/Il motivo è obbligatorio/)).toBeVisible();
  await peso.fill("4 kg");
  await page.getByLabel("Nome", { exact: true }).fill("Tridente da pesca");
  await page.locator("#campo-peso-originale").getByRole("button", { name: "Ripristina originale" }).click();
  await expect(page.getByLabel("Peso", { exact: true })).toHaveValue("2 kg");
  await peso.fill("4 kg");
  await page.getByLabel("Motivo della modifica (obbligatorio)").fill("Prova automatica: peso e nome corretti");
  page.once("dialog", dialog => { expect(dialog.message()).toContain("Peso: «2 kg» → «4 kg»"); dialog.accept(); });
  await page.getByRole("button", { name: "Salva modifica" }).click();
  await expect(page.getByText("Salvato: 2 modifiche.")).toBeVisible();
  // Public card: new values and the note with the printed ones; the 2014 card is unchanged.
  await page.goto("/equipaggiamento/armi/tridente?edizione=2024");
  const card = page.locator('[data-edition="2024"]');
  await expect(card.getByRole("heading", { level: 1 })).toHaveText("Tridente da pesca");
  await expect(card.getByText("4 kg")).toBeVisible();
  await expect(card.getByText("Corretto rispetto al manuale originale")).toBeVisible();
  await expect(card.getByText("Peso: nel manuale «2 kg»")).toBeVisible();
  await expect(card.getByText("Nome: nel manuale «Tridente»")).toBeVisible();
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { level: 1 })).toHaveText("Tridente");
  await expect(page.locator('[data-edition="2014"]').getByText("Corretto rispetto al manuale originale")).toHaveCount(0);
  // Weapons list and search use the corrected name.
  await page.goto("/equipaggiamento/armi?edizione=2024");
  await expect(page.getByText("Tridente da pesca").first()).toBeVisible();
  const index = await (await request.get("/ricerca-indice.json")).json();
  expect(index.rows.some(row => row[1] === "Tridente da pesca")).toBe(true);
  // Log: before → after, reason, export, undo.
  await page.goto("/admin/registro");
  const log = page.getByRole("list", { name: "Modifiche" });
  await expect(log.getByRole("listitem")).toHaveCount(2);
  await expect(log.getByText("Prova automatica: peso e nome corretti").first()).toBeVisible();
  await expect(page.getByText(/Correzioni documentate \(\d+, sola lettura\)/)).toBeVisible();
  const exported = await page.request.get("/admin/registro/esporta");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-disposition"]).toMatch(/attachment; filename="grimorio-correzioni-\d{4}-\d{2}-\d{2}\.json"/);
  expect((await exported.json()).correzioni).toHaveLength(2);
  const pesoRow = log.getByRole("listitem").filter({ hasText: "Tridente · peso" });
  page.once("dialog", dialog => dialog.accept());
  await pesoRow.getByRole("button", { name: "Annulla modifica" }).click();
  await expect(log.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("link", { name: "Tutto lo storico" }).click();
  await expect(log.getByRole("listitem")).toHaveCount(2);
  await expect(log.getByText(/annullata oggi/)).toBeVisible();
  await page.goto("/equipaggiamento/armi/tridente?edizione=2024");
  await expect(page.locator('[data-edition="2024"]').getByText("Peso: nel manuale «2 kg»")).toHaveCount(0);
  await expect(page.locator('[data-edition="2024"]').getByText("Nome: nel manuale «Tridente»")).toBeVisible();
  // Clean up: back to the manual for the next tests.
  await page.goto("/admin/registro");
  page.once("dialog", dialog => dialog.accept());
  await log.getByRole("button", { name: "Annulla modifica" }).click();
  await expect(page.getByText("Nessuna modifica.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin corrections in every section: armor, magic item text, condition title on list and page, spell editor change undone from the log", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("heading", { name: "Amministrazione" })).toBeVisible();
  const save = async (url, fill, reason) => {
    await page.goto(url);
    await fill();
    await page.getByLabel("Motivo della modifica (obbligatorio)").fill(reason);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Salva modifica" }).click();
    await expect(page.getByText(/^Salvato:/)).toBeVisible();
  };
  // Armor 2014: the weight; the 2014 description (found by the printed name) is still there.
  await save("/admin/contenuti/armature/cuoio?edizione=2014", () => page.getByLabel("Peso", { exact: true }).fill("4,5 kg"), "Prova: peso dell’armatura");
  await page.goto("/equipaggiamento/armature/cuoio?edizione=2014");
  const leather = page.locator('[data-edition="2014"]');
  await expect(leather.getByText("4,5 kg")).toBeVisible();
  await expect(leather.getByText("Peso: nel manuale «5 kg»")).toBeVisible();
  // Magic item: one paragraph, the tables untouched.
  await page.goto("/admin/contenuti/oggetti-magici/bacchetta-delle-meraviglie?edizione=2024");
  const first = page.getByLabel("Paragrafo 1", { exact: true });
  const printed = await first.inputValue();
  await save("/admin/contenuti/oggetti-magici/bacchetta-delle-meraviglie?edizione=2024", () => first.fill(`${printed} Prova di correzione.`), "Prova: testo dell’oggetto");
  await page.goto("/oggetti-magici/bacchetta-delle-meraviglie");
  const wand = page.locator('[data-edition="2024"]');
  await expect(wand.getByText("Prova di correzione.")).toBeVisible();
  await expect(wand.locator("[data-table-rows]")).toHaveAttribute("data-table-rows", "18");
  await expect(wand.getByText("Corretto rispetto al manuale originale")).toBeVisible();
  // Condition 2024: the title on the Compendio list and on its page.
  await save("/admin/contenuti/condizioni/condizioni-accecato?edizione=2024", () => page.getByLabel("Nome", { exact: true }).fill("Accecato (prova)"), "Prova: nome della condizione");
  await page.goto("/compendio/condizioni?edizione=2024");
  await expect(page.getByRole("link", { name: "Accecato (prova)" })).toBeVisible();
  await page.goto("/manuale/condizioni-accecato");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accecato (prova)");
  await expect(page.getByText("Nome: nel manuale «Accecato»")).toBeVisible();
  // Spell editor (database record): the change appears in the log and can be undone.
  await page.goto("/admin/incantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("dardo incantato");
  await page.getByRole("button", { name: "Modifica", exact: true }).first().click();
  const editor = page.getByRole("dialog");
  const range = editor.getByLabel("Gittata", { exact: true });
  const before = await range.inputValue();
  await range.selectOption(before === "90 metri" ? "45 metri" : "90 metri");
  await editor.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(editor).toHaveCount(0);
  await page.goto("/admin/registro?sezione=incantesimi");
  const log = page.getByRole("list", { name: "Modifiche" });
  await expect(log.getByText(/· gittata$/)).toBeVisible();
  await expect(log.getByText("Modifica dall’editor").first()).toBeVisible();
  // Every field the save changed is in the log: undo them all.
  const count = await log.getByRole("listitem").count();
  for (let i = count; i > 0; i--) {
    page.once("dialog", dialog => dialog.accept());
    await log.getByRole("button", { name: "Annulla modifica" }).first().click();
    if (i > 1) await expect(log.getByRole("listitem")).toHaveCount(i - 1);
  }
  await expect(page.getByText("Nessuna modifica.")).toBeVisible();
  await page.goto("/spell/dardo-incantato");
  await expect(page.getByText(before).first()).toBeVisible();
  // Clean up the corrections for the next tests.
  await page.goto("/admin/registro");
  for (let i = 0; i < 3; i++) {
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("list", { name: "Modifiche" }).getByRole("button", { name: "Annulla modifica" }).first().click();
    await expect(page.getByRole("list", { name: "Modifiche" }).getByRole("listitem")).toHaveCount(2 - i, { timeout: 10000 }).catch(() => undefined);
  }
  await expect(page.getByText("Nessuna modifica.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("classes 2024 and 2014: Compendio group, list with selector, sheets with tabs, levels, table, subclass, search, narrow phones", async ({ page }) => {
  test.setTimeout(360_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !/favicon\.ico/.test(message.location().url)) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/compendio");
  await expect(page.getByRole("heading", { level: 2, name: "Personaggi" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Regole e oggetti" })).toBeVisible();
  const tile = page.getByRole("list", { name: "Personaggi" }).getByRole("link");
  await expect(tile).toHaveCount(1);
  await expect(tile).toContainText("Barbaro, Bardo, Chierico…");
  await tile.click();
  await expect(page).toHaveURL(/\/classi$/);
  await expect(page.getByRole("navigation", { name: "Navigazione principale" }).locator('a[aria-current="page"]')).toHaveText("Compendio");
  // Title and selector on one row; 12 cards with hit die and primary abilities from the data.
  const title = await page.getByRole("heading", { level: 1, name: "Classi" }).boundingBox();
  const selector = await page.getByRole("group", { name: "Edizione delle regole" }).boundingBox();
  expect(Math.abs(title.y + title.height / 2 - (selector.y + selector.height / 2))).toBeLessThan(12);
  const cards = page.locator('[data-edition="2024"] a[href^="/classi/"]');
  await expect(cards).toHaveCount(12);
  await expect(page.locator('[data-edition="2024"]')).toContainText("12 classi, ognuna con la sua sottoclasse del manuale.");
  await expect(cards.filter({ hasText: "Guerriero" })).toContainText("D10 · Forza o Destrezza");
  await expect(cards.filter({ hasText: "Mago" })).toContainText("D6 · Intelligenza");
  // 2014: the same twelve classes from the SRD 5.1, hit dice as printed («1d10»), no primary ability line.
  await page.getByRole("button", { name: "2014", exact: true }).click();
  const cards2014 = page.locator('[data-edition="2014"] a[href^="/classi/"]');
  await expect(cards2014).toHaveCount(12);
  await expect(cards2014.filter({ hasText: "Guerriero" })).toContainText("1d10");
  await expect(cards2014.filter({ hasText: "Guerriero" })).not.toContainText("Forza");
  await page.getByRole("button", { name: "2024", exact: true }).click();
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `list ${width}`).toBeLessThanOrEqual(width);
    for (const box of [await cards.first().boundingBox(), await page.getByRole("button", { name: "2014", exact: true }).boundingBox()]) expect(box.height).toBeGreaterThanOrEqual(44);
  }

  // Sheet: coloured header, key data, skills and equipment, the three tabs.
  await page.goto("/classi/guerriero");
  const sheet = page.locator('[data-edition="2024"]');
  await expect(sheet.getByRole("heading", { level: 1 })).toHaveText("Guerriero");
  await expect(sheet).toContainText("Classe · SRD 5.2.1, p. 53");
  const body = page.locator("main");
  await expect(body).toContainText("Forza e Costituzione");
  await body.getByText("Abilità ed equipaggiamento iniziale").filter({ visible: true }).click();
  await expect(body).toContainText("Percezione, Persuasione, Sopravvivenza o Storia");
  const levels = body.getByRole("list", { name: "Livelli 1–5" }).locator(":scope > li");
  await expect(levels).toHaveCount(5);
  await levels.first().locator("summary").click();
  await expect(levels.first().getByRole("heading", { name: "Stile di combattimento" })).toBeVisible();
  // Level 3: subclass level in amber, with the feature of the Campione.
  await expect(levels.nth(2).locator(".bg-amber")).toHaveCount(1);
  await levels.nth(2).locator("summary").click();
  await expect(levels.nth(2)).toContainText("Privilegio della sottoclasse · Campione");
  await expect(levels.nth(2).getByRole("heading", { name: "Critico migliorato" })).toBeVisible();
  await body.getByText("Mostra i livelli 6–20").filter({ visible: true }).click();
  await expect(body.getByRole("list", { name: "Livelli 6–20" }).locator(":scope > li")).toHaveCount(15);
  await body.getByRole("tab", { name: "Tabella" }).click();
  const table = body.getByRole("tabpanel").getByRole("table");
  await expect(table.locator("tbody tr")).toHaveCount(20);
  await expect(table.locator("tbody tr").nth(2)).toHaveClass(/FBEFCF/);
  expect(await table.locator("tbody th").first().evaluate(cell => getComputedStyle(cell).position)).toBe("sticky");
  await body.getByRole("tab", { name: "Sottoclasse" }).click();
  await expect(body.getByRole("tabpanel")).toContainText("Sottoclasse · dal 3º livello");
  await expect(body.getByRole("tabpanel").getByRole("heading", { level: 2 })).toHaveText("Campione");
  await expect(body.getByRole("tabpanel")).toContainText("Raggiungi l'eccellenza fisica nel combattimento");
  await expect(body.getByRole("tabpanel").getByRole("listitem").filter({ hasText: "18 · Sopravvissuto" })).toHaveCount(1);
  // 2014 on the same page: header with its source page, the Campione with the levels printed in its text.
  await page.getByRole("button", { name: "2014", exact: true }).click();
  const sheet2014 = page.locator('[data-edition="2014"]');
  await expect(sheet2014).toContainText("Classe · SRD 5.1, p. 24");
  await expect(body).toContainText("Tutte le armature, scudi");
  await body.getByRole("tab", { name: "Sottoclasse" }).filter({ visible: true }).click();
  await expect(body.getByRole("tabpanel").filter({ visible: true }).getByRole("listitem").filter({ hasText: "18 · Sopravvissuto" })).toHaveCount(1);
  await body.getByRole("tab", { name: "Tabella" }).filter({ visible: true }).click();
  await expect(body.getByRole("tabpanel").filter({ visible: true }).locator("tbody tr")).toHaveCount(20);
  await expect(body.getByRole("link", { name: "Passa alla versione 2024" })).toHaveAttribute("href", "/classi/guerriero?edizione=2024");
  await page.getByRole("button", { name: "2024", exact: true }).click();
  await expect(body.getByRole("link", { name: "Passa alla versione 2014" })).toHaveAttribute("href", "/classi/guerriero?edizione=2014");
  await body.getByRole("link", { name: "Passa alla versione 2014" }).click();
  await expect(page.locator('[data-edition="2014"]')).toBeVisible();
  await page.goto("/classi/guerriero?edizione=2024");
  // «Segnala» carries the page, the class name and the edition shown.
  await body.getByRole("link", { name: "Segnala" }).click();
  await expect(page).toHaveURL(/\/segnala\?pagina=%2Fclassi%2Fguerriero&titolo=Guerriero&edizione=2024/);
  await page.goto("/classi/mago?edizione=2014");
  await expect(page.getByRole("link", { name: "Incantesimi del mago →" }).filter({ visible: true })).toHaveAttribute("href", "/grimorio?classe=mago&edizione=2014");

  // A caster: spell list, the button to the spells of the class, every sheet without horizontal scroll.
  await page.goto("/classi/mago");
  await expect(page.locator("main")).toContainText("Lista degli incantesimi da mago");
  const spells = page.getByRole("link", { name: "Incantesimi del mago →" });
  await expect(spells).toHaveAttribute("href", "/grimorio?classe=mago&edizione=2024");
  await page.goto("/classi/warlock");
  await expect(page.locator("main")).toContainText("Opzioni di suppliche occulte");
  await expect(page.getByRole("link", { name: "Incantesimi del warlock →" })).toBeVisible();
  await page.goto("/classi/stregone");
  await expect(page.getByRole("link", { name: "Incantesimi dello stregone →" })).toBeVisible();
  await page.goto("/classi/barbaro");
  await expect(page.getByRole("link", { name: /^Incantesimi del/ })).toHaveCount(0);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const id of ["barbaro", "bardo", "chierico", "druido", "guerriero", "ladro", "mago", "monaco", "paladino", "ranger", "stregone", "warlock"]) {
      // Both editions at 360 px, the 2024 sheets also at 375 and 390.
      for (const edition of width === 360 ? ["2024", "2014"] : ["2024"]) {
        await page.goto(`/classi/${id}?edizione=${edition}`);
        await expect(page.locator(`[data-edition="${edition}"]`)).toBeVisible();
        for (const tab of ["Tabella", "Sottoclasse", "Privilegi"]) {
          await page.getByRole("tab", { name: tab }).filter({ visible: true }).click();
          expect(await page.evaluate(() => document.documentElement.scrollWidth), `${id} ${edition} ${tab} ${width}`).toBeLessThanOrEqual(width);
        }
      }
    }
  }
  for (const box of [await page.getByRole("tab", { name: "Tabella" }).filter({ visible: true }).boundingBox(), await page.locator("main summary").filter({ visible: true }).first().boundingBox()]) expect(box.height).toBeGreaterThanOrEqual(44);

  // Home search: a subclass opens the sheet on its tab.
  await page.goto("/");
  await page.locator("button[aria-haspopup=dialog]").first().click();
  await page.getByRole("dialog").getByRole("searchbox").fill("campione");
  const result = page.getByRole("dialog").getByRole("link", { name: /Campione/ });
  await expect(result).toHaveAttribute("href", "/classi/guerriero#sottoclasse");
  await result.click();
  await expect(page.getByRole("tab", { name: "Sottoclasse" })).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});

test("sections of the app: admin hides and shows every section; public 404 page, Compendio, bar, search and links; dark band with Mostra", async ({ page, browser }) => {
  test.setTimeout(600_000);
  // The public: a second phone without the admin session.
  const publicContext = await browser.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
  await publicContext.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
  const pub = await publicContext.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  pub.on("pageerror", error => errors.push(error.message));

  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await page.getByRole("link", { name: "Sezioni dell’app" }).click();
  await expect(page).toHaveURL(/\/admin\/sezioni$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sezioni dell’app" })).toBeVisible();
  await expect(page.getByText("Tocca l’occhio per mostrare o nascondere una sezione al pubblico. L’effetto è immediato e non cancella niente.")).toBeVisible();
  await expect(page.getByText("10 visibili")).toBeVisible();
  await expect(page.getByText("0 nascoste")).toBeVisible();
  await expect(page.getByText("Ogni cambio finisce nel Registro modifiche. Le sezioni nascoste restano visibili a te, con l’etichetta «Nascosta».")).toBeVisible();
  const rows = page.getByRole("list", { name: "Sezioni" }).locator(":scope > li");
  await expect(rows).toHaveCount(10);
  await expect(rows.nth(2)).toContainText("Classi");
  await expect(rows.nth(2)).toContainText("Compendio · Personaggi · Visibile");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin ${width}`).toBeLessThanOrEqual(width);
    for (const box of await rows.locator("button").evaluateAll(buttons => buttons.map(b => b.getBoundingClientRect().toJSON()))) {
      expect(Math.round(box.width)).toBe(52);
      expect(Math.round(box.height)).toBe(44);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });

  const toggle = async (title, hide) => {
    if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
    const button = page.getByRole("button", { name: `${hide ? "Nascondi" : "Mostra"} ${title}`, exact: true });
    await expect(button).toHaveAttribute("aria-pressed", hide ? "true" : "false");
    await button.click();
    await expect(page.getByRole("status")).toHaveText(`${title} ora è ${hide ? "nascosta" : "visibile"}`);
    await expect(page.getByRole("button", { name: `${hide ? "Mostra" : "Nascondi"} ${title}`, exact: true })).toHaveAttribute("aria-pressed", hide ? "false" : "true");
  };
  const unavailable = async path => {
    const response = await pub.goto(path);
    expect(response.status(), path).toBe(404);
    await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente non disponibile");
    await expect(pub.getByText("Ci stiamo lavorando. Torna a trovarci tra un po': il link che hai aperto funzionerà di nuovo.")).toBeVisible();
    await expect(pub.getByRole("link", { name: "Torna alla Home" })).toHaveAttribute("href", "/");
    expect((await pub.locator('meta[name="robots"]').evaluateAll(metas => metas.map(m => m.content))).join(" "), path).toContain("noindex");
  };
  const band = () => page.getByRole("note").filter({ hasText: "Nascosta · il pubblico non vede questa sezione. La vedi solo tu." });

  // Every section, one at a time: hidden → 404 for the public (list and card), the admin still sees it with the band.
  const SECTIONS = [
    { title: "Incantesimi", list: "/grimorio", card: "/spell/dardo-incantato" },
    { title: "Bestiario", list: "/bestiario", card: "/mostro/aboleth" },
    { title: "Classi", list: "/classi", card: "/classi/mago" },
    { title: "Armi", list: "/equipaggiamento/armi", card: "/equipaggiamento/armi/tridente" },
    { title: "Armature", list: "/equipaggiamento/armature", card: "/equipaggiamento/armature/scudo" },
    { title: "Equipaggiamento d’avventura", list: "/equipaggiamento/avventura", card: "/equipaggiamento/avventura/abaco" },
    { title: "Strumenti", list: "/equipaggiamento/strumenti", card: "/equipaggiamento/strumenti/liuto" },
    { title: "Oggetti magici", list: "/oggetti-magici", card: "/oggetti-magici/ali-del-volo" },
    { title: "Condizioni", list: "/compendio/condizioni", card: "/manuale/condizioni-accecato" },
    { title: "Avanzamento", list: "/avanzamento" },
  ];
  for (const section of SECTIONS) {
    await toggle(section.title, true);
    await expect(page.getByText("9 visibili")).toBeVisible();
    await expect(page.getByText("1 nascosta")).toBeVisible();
    await expect(page.getByRole("list", { name: "Sezioni" }).locator(":scope > li").filter({ hasText: section.title }).first()).toContainText("Nascosta");
    for (const path of [section.list, section.card].filter(Boolean)) {
      await unavailable(path);
      expect((await page.goto(path)).status(), `admin ${path}`).toBe(200);
      await expect(band()).toBeVisible();
      await expect(band().getByRole("button", { name: "Mostra" })).toBeVisible();
    }
    await toggle(section.title, false);
    for (const path of [section.list, section.card].filter(Boolean)) expect((await pub.goto(path)).status(), `public ${path} visible again`).toBe(200);
  }
  await expect(page.getByText("10 visibili")).toBeVisible();

  // Links between sections: Incantesimi hidden → no «Incantesimi del mago →», no spell links in the creatures.
  await pub.goto("/classi/mago");
  await expect(pub.getByRole("link", { name: "Incantesimi del mago →" })).toBeVisible();
  await toggle("Incantesimi", true);
  await pub.goto("/classi/mago");
  await expect(pub.locator("main")).toContainText("Lista degli incantesimi da mago");
  await expect(pub.getByRole("link", { name: "Incantesimi del mago →" })).toHaveCount(0);
  await toggle("Condizioni", true);
  await pub.goto("/mostro/aboleth");
  await expect(pub.locator('main a[href^="/manuale/condizioni-"]')).toHaveCount(0);
  await expect(pub.locator('main a[href^="/spell/"]')).toHaveCount(0);
  await page.goto("/mostro/aboleth");
  await expect(page.locator('main a[href^="/manuale/condizioni-"]').first()).toBeVisible();

  // Classi and the whole Equipaggiamento hidden: empty groups and tiles leave the Compendio, the hub is unavailable.
  for (const title of ["Classi", "Armi", "Armature", "Equipaggiamento d’avventura", "Strumenti", "Bestiario"]) await toggle(title, true);
  await expect(page.getByText("2 visibili")).toBeVisible();
  await expect(page.getByText("8 nascoste")).toBeVisible();
  await pub.goto("/compendio");
  await expect(pub.getByRole("heading", { level: 2, name: "Personaggi" })).toHaveCount(0);
  const publicTiles = pub.getByRole("list", { name: "Regole e oggetti" }).getByRole("link");
  expect(await publicTiles.evaluateAll(links => links.map(a => a.getAttribute("href")))).toEqual(["/avanzamento", "/oggetti-magici"]);
  await unavailable("/equipaggiamento");
  // The bottom bar without Incantesimi and Bestiario.
  const nav = pub.getByRole("navigation", { name: "Navigazione principale" });
  expect(await nav.getByRole("link").allTextContents()).toEqual(["Home", "Compendio", "Preferiti"]);
  // Search: no page of a hidden section.
  const index = await (await pub.request.get("/ricerca-indice.json")).json();
  expect(index.sections.map(section => section.k)).toEqual(["oggetti-magici"]);
  expect(index.rows.every(row => row[3].startsWith("/oggetti-magici/"))).toBe(true);
  await pub.goto("/");
  await pub.locator("button[aria-haspopup=dialog]").first().click();
  await pub.getByRole("dialog").getByRole("searchbox").fill("campione");
  await expect(pub.getByRole("dialog")).toContainText("Nessun risultato");
  // Narrow phones: the 404 page and the admin pages with the band, no horizontal scroll, taps of 44 px.
  for (const width of [360, 375, 390]) {
    await pub.setViewportSize({ width, height: 800 });
    await unavailable("/classi/guerriero");
    expect(await pub.evaluate(() => document.documentElement.scrollWidth), `404 ${width}`).toBeLessThanOrEqual(width);
    expect((await pub.getByRole("link", { name: "Torna alla Home" }).boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/classi/guerriero");
    await expect(band()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `band ${width}`).toBeLessThanOrEqual(width);
    expect((await band().getByRole("button", { name: "Mostra" }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  }

  // The administrator sees everything, labelled «Nascosta»: Compendio tiles and bottom bar.
  await page.goto("/compendio");
  await expect(page.getByRole("list", { name: "Personaggi" }).getByRole("link")).toContainText("Nascosta");
  const adminNav = page.getByRole("navigation", { name: "Navigazione principale" });
  await expect(adminNav.getByRole("link", { name: /Incantesimi/ })).toContainText("Nascosta");
  // «Mostra» in the band: the section is visible again at once.
  await page.goto("/classi");
  await band().getByRole("button", { name: "Mostra" }).click();
  await expect(band()).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Classi" })).toBeVisible();
  expect((await pub.goto("/classi")).status()).toBe(200);
  await pub.goto("/compendio");
  await expect(pub.getByRole("heading", { level: 2, name: "Personaggi" })).toBeVisible();

  // The log: every switch, with section and new state.
  await page.goto("/admin/registro?sezione=sezioni&stato=tutte");
  const log = page.getByRole("list", { name: "Modifiche" }).locator(":scope > li");
  await expect(log.first()).toContainText("Classi · visibilità");
  await expect(log.first()).toContainText("Visibile");
  // 10 sections hidden and shown again, 8 hidden together, Classi shown from the band.
  await expect(log).toHaveCount(29);

  // Back to the start: every section visible.
  for (const title of ["Incantesimi", "Condizioni", "Armi", "Armature", "Equipaggiamento d’avventura", "Strumenti", "Bestiario"]) await toggle(title, false);
  await expect(page.getByText("10 visibili")).toBeVisible();
  await pub.goto("/compendio");
  await expect(pub.getByRole("list", { name: "Regole e oggetti" }).getByRole("link")).toHaveCount(4);
  expect(await pub.getByRole("navigation", { name: "Navigazione principale" }).getByRole("link").count()).toBe(5);
  // The test server keeps in memory only which saved pages are out of date (Vercel keeps it in its cache):
  // the pages built while sections were hidden are built again now, so the next server finds them current.
  for (const path of [...SECTIONS.flatMap(section => [section.list, section.card]).filter(Boolean), "/", "/compendio", "/equipaggiamento", "/preferiti", "/classi/guerriero", "/ricerca-indice.json"]) {
    expect((await pub.request.get(path)).status(), path).toBe(200);
  }
  expect((await (await pub.request.get("/ricerca-indice.json")).json()).sections).toHaveLength(6);
  await publicContext.close();
  expect(errors).toEqual([]);
});
