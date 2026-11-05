import { test, expect } from "./fixtures.mjs";

// PROMPT 49: the section «Talenti» (17 SRD 5.2.1 feats, Lottatore 2014) starts «In arrivo»: for the visitors only the
// Compendio tile with the pill; the pages answer «in costruzione», nothing in the sitemap or the search. The administrator
// sees list and sheets. Shown from /admin/sezioni (test database only), everything enters on its own; «In arrivo» again at the end.
const SITE = "https://ilgrimorio.app";
const stateRadio = (scope, title, label) => scope.getByRole("radiogroup", { name: `Stato di ${title}`, exact: true }).getByRole("radio", { name: label, exact: true });

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}
async function setTalenti(page, label) {
  if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
  const radio = stateRadio(page, "Talenti", label);
  if ((await radio.getAttribute("aria-checked")) === "true") return;
  await radio.click();
  await expect(radio).toHaveAttribute("aria-checked", "true");
}
async function visitor(browser, width, edition = "2024") {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  }, edition);
  return context;
}
const noSideScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe.configure({ mode: "serial" });
test.afterAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await login(page);
  await setTalenti(page, "In arrivo");
  await context.close();
});

test("«In arrivo» from the start: the visitor sees only the Compendio tile; pages, sitemap and search without feats", async ({ browser, page, request }) => {
  test.setTimeout(180_000);
  await login(page);
  await page.goto("/admin/sezioni");
  await expect(stateRadio(page, "Talenti", "In arrivo")).toHaveAttribute("aria-checked", "true");
  const context = await visitor(browser, 390);
  const pub = await context.newPage();
  const tile = pub.locator("main a").filter({ hasText: "Talenti" });
  // A page built while the section was shown is served once more, then built again.
  // PROMPT 65: the tilted «PRESTO» stamp in the place of the «In arrivo» pill.
  await expect.poll(async () => { await pub.goto("/compendio"); return tile.locator("[data-timbro-presto]").count(); }).toBe(1);
  await expect(tile).not.toContainText("In arrivo");
  await expect(tile).toHaveAttribute("href", "/in-arrivo/talenti");
  for (const path of ["/talenti", "/talenti/allerta", "/talenti/lottatore"]) {
    const response = await pub.goto(path);
    expect(response.status(), path).toBe(404);
    await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente in costruzione");
    expect(await response.text(), path).not.toMatch(/Competenza in iniziativa|Scambio di iniziativa|data-feat-text/);
  }
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/talenti");
  expect(await (await request.get("/ricerca-indice.json")).text()).not.toContain("/talenti");
  await context.close();
  // The administrator: list and sheets, to try them.
  await page.goto("/talenti");
  await expect(page.getByRole("heading", { level: 1, name: "Talenti" })).toBeVisible();
  await page.goto("/talenti/allerta");
  await expect(page.locator('[data-edition="2024"] h1')).toContainText("Allerta");
});

test("shown (test database): list, filters, sheets with the English name and the SRD text, Lottatore in both editions, search, sitemap", async ({ browser, page, request }) => {
  test.setTimeout(300_000);
  await login(page);
  await setTalenti(page, "Visibile");
  await expect.poll(async () => (await request.get("/talenti")).status()).toBe(200);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(`<loc>${SITE}/talenti/allerta</loc>`);
  expect(await (await request.get("/ricerca-indice.json")).text()).toContain("/talenti/allerta");
  for (const width of [390, 1280]) {
    const context = await visitor(browser, width, "2024");
    const pub = await context.newPage();
    await pub.goto("/talenti");
    await expect(pub.locator("[data-feat-row]")).toHaveCount(17);
    await expect(pub.locator("[data-feat-group]")).toHaveText([/^Origini/, /^Generali/, /^Stile di combattimento/, /^Doni epici/]);
    await expect(pub.locator('[data-feat-row="allerta"]')).toContainText("Alert");
    await pub.getByRole("group", { name: "Categorie" }).getByRole("button", { name: "Doni epici" }).click();
    await expect(pub.locator("[data-feat-row]")).toHaveCount(7);
    await pub.getByRole("group", { name: "Categorie" }).getByRole("button", { name: "Tutti" }).click();
    await pub.getByRole("searchbox").fill("lotta");
    await expect(pub.locator("[data-feat-row]")).toHaveCount(1);
    await pub.getByRole("searchbox").fill("");
    expect(await noSideScroll(pub), `list ${width}`).toBe(true);
    await pub.locator('[data-feat-row="allerta"]').click();
    const panel = pub.locator('[data-edition="2024"]');
    await expect(panel.locator("h1")).toHaveText("Allerta(Alert)");
    await expect(panel.locator("[data-feat-category]")).toHaveText("Talento Origini");
    await expect(panel.locator("[data-feat-benefit]")).toHaveText(["Competenza in iniziativa.", "Scambio di iniziativa."]);
    await expect(panel.locator("[data-feat-benefit]").first()).toHaveCSS("color", "rgb(122, 31, 43)");
    await expect(panel.locator("[data-source-box]")).toContainText("Fonte ufficiale, pagina 98");
    expect(await noSideScroll(pub), `sheet ${width}`).toBe(true);
    await context.close();
  }
  // 2014: Lottatore, the others «Solo nel 2024»; Lottatore with both editions.
  const context = await visitor(browser, 390, "2014");
  const pub = await context.newPage();
  await pub.goto("/talenti");
  await expect(pub.locator('[data-feat-group="Talenti"] [data-feat-row]')).toHaveCount(1);
  await expect(pub.locator('[data-feat-group="Solo nel 2024"] [data-feat-row]')).toHaveCount(16);
  await pub.locator('[data-feat-group="Talenti"] [data-feat-row="lottatore"]').click();
  await expect(pub).toHaveURL(/\/talenti\/lottatore\?edizione=2014$/);
  await expect(pub.locator('[data-edition="2014"]').getByRole("heading").first()).toHaveText("Lottatore(Grappler)");
  await expect(pub.locator('[data-edition="2014"] [data-feat-prerequisite]')).toHaveText("Prerequisito: Forza 13 o superiore");
  await expect(pub.locator('[data-edition="2014"] [data-feat-text] li')).toHaveCount(2);
  await expect(pub.locator('[data-edition="2014"] [data-source-box]')).toContainText("SRD 5.1 italiano");
  await expect(pub.locator('[data-edition="2024"]')).toHaveCount(1);
  await pub.goto("/talenti/allerta");
  await expect(pub.getByRole("status").filter({ hasText: "Talento solo nelle regole 2024" })).toBeVisible();
  // Search: «alert» with «in inglese: Alert», «lotta».
  await pub.goto("/?cerca=alert");
  const dialog = pub.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog.locator("#search-results")).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText(/risultat|trovat|simil/i);
  // Allerta is 2024 only: in 2014 among the results of the other edition.
  await dialog.getByRole("button", { name: /^Cerca anche nel 2024/ }).first().click();
  await expect(dialog.locator('a[href^="/talenti/allerta"] [data-in-inglese]')).toHaveText("in inglese: Alert");
  await pub.goto("/?cerca=lotta");
  await expect(pub.getByRole("dialog", { name: "Cerca in tutto il Grimorio" }).locator('a[href^="/talenti/lottatore"]')).toContainText("Lottatore");
  await context.close();
  await setTalenti(page, "In arrivo");
  await expect.poll(async () => (await request.get("/talenti")).status()).toBe(404);
});
