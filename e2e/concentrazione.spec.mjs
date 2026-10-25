import { test, expect } from "@playwright/test";

// Concentration on the spell cards: no «Concentrazione» label under the name, the source label in its place;
// the word in the Durata box links, like a condition, to the rule of the edition of the card (SRD 5.2.1 glossary
// or SRD 5.1 «Lanciare incantesimi»). Local test database only: the spell made here is deleted at the end.
const SHOTS = process.env.CONCENTRAZIONE_SHOTS;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

const edition = (page, value) => page.addInitScript(v => { try { window.localStorage.setItem("grimorio.edizione", v); } catch { /* no storage */ } }, value);
const durata = page => page.locator("p", { hasText: /^Durata$/ }).locator("xpath=..");

async function checkCard(page, path, { word, href, source }) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const labels = page.locator("[data-card-labels]");
  await expect(labels).not.toContainText("Concentrazione");
  // The source label takes the place of the old one: first of the row, on the left.
  if (source) await expect(labels.locator("> span").first()).toHaveAttribute("data-card-source", source);
  const link = durata(page).getByRole("link", { name: word, exact: true });
  await expect(link).toHaveAttribute("href", href);
  await expect(link).toHaveClass(/ref-pill/);
  await expect(durata(page)).toContainText(/, fino a \S+/);
  return link;
}

test("concentration: no label, the Durata word links to the rule of the edition; filter unchanged", async ({ page, request }) => {
  test.setTimeout(240_000);
  // Colpo accurato 2024: «Istantanea» in SRD 5.2.1, no concentration and no link; the source label first.
  await edition(page, "2024");
  await page.goto("/spell/colpo-accurato");
  await expect(durata(page)).toContainText(/istantanea/i);
  await expect(page.locator('a[href^="/regole/"]')).toHaveCount(0);
  await expect(page.locator("[data-card-labels]")).not.toContainText("Concentrazione");
  await expect(page.locator("[data-card-labels] > span").first()).toHaveAttribute("data-card-source", "SRD 5.2.1");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/colpo-accurato-2024-390.png`, fullPage: true });
  // A 2024 card with «concentrazione, fino a 1 ora»: the link to the 2024 rule.
  let link = await checkCard(page, "/spell/forma-gassosa", { word: /^concentrazione$/i, href: "/regole/concentrazione", source: "SRD 5.2.1" });
  await expect(durata(page)).toContainText(/fino a 1 ora/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forma-gassosa-2024-390.png`, fullPage: true });
  await link.click();
  await expect(page).toHaveURL(/\/regole\/concentrazione$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Concentrazione");
  await expect(page.locator("main")).toContainText("Per rimanere attivi, alcuni incantesimi e altri effetti richiedono concentrazione");
  await expect(page.locator("strong", { hasText: "Danni." })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Fonte della regola" })).toContainText("SRD 5.2.1 italiano, Glossario delle regole");
  await expect(page.getByRole("link", { name: "Fonte ufficiale, pagina 206" })).toHaveAttribute("href", /IT_SRD_CC_v5\.2\.1\.pdf#page=206$/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/regola-concentrazione-2024-390.png`, fullPage: true });
  // Back to the card.
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/spell\/forma-gassosa$/);

  await edition(page, "2014");
  link = await checkCard(page, "/spell/colpo-accurato-2014", { word: /^concentrazione$/i, href: "/regole/concentrazione-2014", source: "SRD 5.1" });
  await expect(durata(page)).toContainText(/concentrazione, fino a 1 round/i);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/colpo-accurato-2014-390.png`, fullPage: true });
  await link.click();
  await expect(page).toHaveURL(/\/regole\/concentrazione-2014$/);
  await expect(page.locator("main")).toContainText("Alcuni incantesimi richiedono all'incantatore di mantenere la concentrazione");
  await expect(page.locator("main li")).toHaveCount(3);
  await expect(page.getByRole("complementary", { name: "Fonte della regola" })).toContainText("SRD 5.1 italiano, Lanciare incantesimi");
  await expect(page.getByRole("link", { name: "Fonte ufficiale, pagine 116, 117" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/regola-concentrazione-2014-390.png`, fullPage: true });

  // A spell without concentration has no link.
  await edition(page, "2024");
  await page.goto("/spell/palla-di-fuoco");
  await expect(durata(page)).toContainText(/istantanea/i);
  await expect(page.locator('a[href^="/regole/"]')).toHaveCount(0);
  await expect(page.locator("[data-card-labels] > span").first()).toHaveAttribute("data-card-source", "SRD 5.2.1");

  // The «Concentrazione» filter of the list: as many spells as the list data marks.
  for (const value of ["2024", "2014"]) {
    await edition(page, value);
    await page.goto("/grimorio");
    await page.locator("li.catalog-row").first().waitFor();
    await page.getByRole("button", { name: /^Filtri/ }).click();
    await page.getByRole("dialog").getByText("Concentrazione", { exact: true }).click();
    const shown = Number((await page.getByRole("button", { name: /^Mostra \d+ risultat/ }).innerText()).match(/\d+/)[0]);
    const data = (await (await request.get(`/api/catalogo/incantesimi?edizione=${value}`)).json()).spells;
    const marked = data.filter(spell => spell.concentrazione && (value === "2014" ? spell.edizione === "2014" : spell.edizione !== "2014")).length;
    expect(shown, value).toBe(marked);
    expect(shown, value).toBeGreaterThan(100);
  }
});

test("concentration on a spell added by the administrator (Amicizia 2014)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("link", { name: "Sezioni dell’app" })).toBeVisible();
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Nome *").fill("Amicizia");
  await editor.locator("#spell-level").selectOption("0");
  await editor.locator("#spell-school").selectOption({ label: "Ammaliamento" });
  await editor.locator("#durata").selectOption("concentrazione, fino a 1 minuto");
  // The editor preview shows the same link.
  await editor.getByRole("button", { name: "Anteprima" }).click();
  await expect(editor.getByRole("link", { name: /^concentrazione$/i })).toHaveAttribute("href", "/regole/concentrazione-2014");
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  const row = page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first();
  const path = await row.locator('a[href^="/spell/"]').first().getAttribute("href");

  const visitor = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
  await visitor.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2014"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const guest = await visitor.newPage();
  await checkCard(guest, path, { word: /^concentrazione$/i, href: "/regole/concentrazione-2014" });
  await visitor.close();

  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first().getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ })).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");
});
