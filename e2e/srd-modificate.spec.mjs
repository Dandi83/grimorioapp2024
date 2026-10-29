import { test, expect } from "@playwright/test";

// «Schede SRD modificate» (lib/srd-modified.ts): the list of the reserved area, the warning of the editor before a
// save that takes the SRD box away, the «SRD modificate» quick filter of the list of the reserved area, «Ripristina testo SRD».
// Visitors see none of it and their pages and /api/catalogo/* stay the same. Test database only: the card changed
// here is restored at the end.
const WARNING = "Con questa modifica la scheda non coinciderà più con l’SRD e perderà il riquadro di provenienza.";
const SOURCE = "Testo integrale: SRD 5.1 italiano";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

async function visitorView(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2014"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  const calls = [];
  page.on("request", request => { if (request.url().includes("/api/admin/no-srd")) calls.push(request.url()); });
  await page.goto("/spell/guida-2014");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Guida");
  const main = (await page.locator("main").innerText()).replace(/\s+/g, " ");
  const html = await (await page.request.get("/spell/guida-2014")).text();
  const sorted = list => [...list].sort((a, b) => a.id.localeCompare(b.id));
  const api2014 = sorted((await (await page.request.get("/api/catalogo/incantesimi?edizione=2014")).json()).spells);
  const api2024 = sorted((await (await page.request.get("/api/catalogo/incantesimi?edizione=2024")).json()).spells);
  const monsters = sorted((await (await page.request.get("/api/catalogo/bestiario")).json()).monsters);
  // Nothing of the reserved area for a visitor: the page, its HTML, the catalogue, the endpoint, the admin page.
  for (const text of [main, html, JSON.stringify(api2014), JSON.stringify(monsters)]) expect(text).not.toMatch(/SRD modificat|Ripristina testo SRD|data-srd-|modificate/);
  await openFilters(page, "/grimorio");
  await page.waitForTimeout(600);
  await expect(page.getByRole("button", { name: "SRD modificate" })).toHaveCount(0);
  expect((await page.request.get("/api/admin/no-srd")).status()).toBe(401);
  await page.goto("/admin/srd-modificate");
  await expect(page.getByLabel("Passcode")).toBeVisible();
  await expect(page.getByText("Schede SRD modificate")).toHaveCount(0);
  expect(calls).toEqual([]);
  const view = { main, hasSource: main.includes(SOURCE), api2014, api2024, monsters };
  await context.close();
  return view;
}

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

const listed = page => page.locator("[data-srd-modified]");

async function openFilters(page, path) {
  await page.goto(path);
  await page.locator("li.catalog-row").first().waitFor();
  await page.getByRole("button", { name: /^Filtri/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
/**
 * The «SRD modificate» quick filter of the 2014 spells of the reserved area (PROMPT 24: no longer in the Filtri panel of
 * the site): its count, and the rows it shows.
 */
async function modifiedCount(page) {
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  const counter = page.locator('[data-counter="modificate"]');
  await expect(counter).toBeVisible();
  const n = Number((await counter.innerText()).match(/\d+/)[0]);
  await counter.click();
  await expect.poll(() => page.locator("main li[data-card-row]").count()).toBe(n);
  return n;
}

test("Schede SRD modificate: list, editor warning, filter option, restore; visitors see nothing and keep the same pages", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2014"); } catch { /* no storage */ } });
  const before = await visitorView(browser);
  expect(before.hasSource, "Guida 2014 starts with its SRD box").toBe(true);

  await login(page);
  // The test database: how many cards are modified before this test (the report counts them).
  await page.goto("/admin/srd-modificate");
  await expect(page.getByRole("heading", { level: 1, name: "Schede SRD modificate" })).toBeVisible();
  const baseline = await listed(page).count();
  console.log(`[srd-modificate] test database: ${baseline} modified SRD cards`);
  if (!baseline) await expect(page.getByText("Tutte le schede SRD coincidono con la fonte")).toBeVisible();
  await page.goto("/admin");
  // «Da fare» of the Home: the check only while there are modified cards.
  await expect(page.locator('[data-due="srd-modificate"]')).toHaveCount(baseline ? 1 : 0);

  // The editor: a change that takes the SRD box away asks first; «Annulla» saves nothing.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi%2Fguida-2014");
  const editor = page.getByRole("dialog");
  await expect(editor.getByLabel("Nome *")).toHaveValue(/Guida/);
  const name = await editor.getByLabel("Nome *").inputValue();
  await editor.getByLabel("Nome *").fill(`${name} di prova`);
  await editor.getByRole("button", { name: "Salva modifiche" }).click();
  const warning = editor.locator("[data-srd-warning]");
  await expect(warning).toContainText(WARNING);
  await warning.getByRole("button", { name: "Annulla" }).click();
  await expect(warning).toHaveCount(0);
  await expect(editor.getByLabel("Nome *")).toHaveValue(`${name} di prova`);
  await page.goto("/admin/srd-modificate");
  await expect(listed(page)).toHaveCount(baseline);
  // «Salva comunque»: saved; the card leaves the box and enters the list.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi%2Fguida-2014");
  await editor.getByLabel("Nome *").fill(`${name} di prova`);
  await editor.getByRole("button", { name: "Salva modifiche" }).click();
  await editor.locator("[data-srd-warning]").getByRole("button", { name: "Salva comunque" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/admin/srd-modificate");
  await expect(listed(page)).toHaveCount(baseline + 1);
  const item = page.locator('[data-srd-modified="incantesimo:guida-2014"]');
  await expect(item.getByRole("heading", { level: 2 })).toHaveText(`${name} di prova`);
  await expect(item).toContainText("Incantesimo · 2014");
  await expect(item.getByRole("link", { name: "Apri la scheda pubblica" })).toHaveAttribute("href", "/spell/guida-2014");
  // The fields of the card (the closed confirmation holds the same preview).
  const fields = item.locator(":scope > [data-srd-field]");
  await expect(fields).toHaveCount(1);
  await expect(fields).toContainText("Nome");
  await expect(fields.locator("[data-srd-text]")).toHaveText(name);
  await expect(fields.locator("[data-current-text] ins")).toHaveText(" di prova");
  // The «SRD modificate» quick filter of the list of the reserved area (2014): the card is there.
  const modified2014 = await modifiedCount(page);
  expect(modified2014).toBeGreaterThanOrEqual(1);
  await expect(page.locator("main li[data-card-row]").filter({ hasText: `${name} di prova` })).toHaveCount(1);
  await page.goto("/spell/guida-2014");
  await expect(page.locator("main")).not.toContainText(SOURCE);

  // «Ripristina testo SRD»: a confirmation with the differences first, then only the changed field goes back.
  const modifiedWith = await modifiedCount(page);
  await page.goto("/admin/srd-modificate");
  await item.getByRole("button", { name: "Ripristina testo SRD" }).click();
  const confirm = item.getByRole("dialog");
  await expect(confirm).toContainText(`Ripristinare il testo SRD di ${name} di prova?`);
  await expect(confirm.locator("[data-srd-text]")).toHaveText(name);
  await confirm.getByRole("button", { name: "Annulla" }).click();
  await expect(listed(page)).toHaveCount(baseline + 1);
  await item.getByRole("button", { name: "Ripristina testo SRD" }).click();
  await confirm.getByRole("button", { name: "Conferma ripristino" }).click();
  await expect(item).toHaveCount(0);
  await expect(listed(page)).toHaveCount(baseline);
  await page.goto("/spell/guida-2014");
  await expect(page.locator("main")).toContainText(SOURCE);
  expect(await modifiedCount(page), "restored: one less in the filter").toBe(modifiedWith - 1);

  // Visitors: the same card, the same catalogue as before the test.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Esci" }).click();
  const after = await visitorView(browser);
  expect(after.main).toBe(before.main);
  expect(after.api2014).toEqual(before.api2014);
  expect(after.api2024).toEqual(before.api2024);
  expect(after.monsters).toEqual(before.monsters);
});
