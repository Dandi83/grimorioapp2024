import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { COMMUNITY_TITLE, GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// PROMPT 26: a creature of the editorial staff saved with its verdict, the box «Mostra "Bilanciamento verificato"» in
// /admin/bilanciamento and in the editor, «Ricalcola», the two verdicts of a creature «2014 e 2024» with the selector of
// the reserved area on 2014 and on 2024, the public page of the method with the numbers of the calibration.
// Local test database only.
const SHOTS = process.env.TARATURA_SHOTS;

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser, width) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, page };
}

async function chooseAdminEdition(page, edition) {
  await page.goto("/admin/mostri");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: edition }).click();
  await expect(page.getByTestId("admin-edition-band")).toHaveText(edition);
}

test.describe.configure({ mode: "serial" });

for (const width of [390, 1280]) {
  const name = `Sentinella tarata ${width}`;
  const id = `homebrew-sentinella-tarata-${width}`;

  test(`administrator at ${width}: «In linea» saved at the creation, the box, the pill on the public sheet, «Ricalcola», two verdicts`, async ({ browser }) => {
    test.setTimeout(240_000);
    const { context, page } = await signIn(browser, width);
    await setBestiaryPart(page, GRIMORIO_TITLE, "Visibile");
    await chooseAdminEdition(page, "2024");

    // A new creature «2014 e 2024» of the editorial staff: the box waits for the first save.
    await page.getByRole("button", { name: "Nuovo", exact: true }).click();
    await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Nuovo mostro della redazione", exact: true }).click();
    const editor = page.getByRole("dialog");
    const newBox = editor.locator("[data-editor-verified]");
    await expect(newBox).toHaveAttribute("data-editor-verified", "nuova");
    await expect(newBox.getByRole("checkbox")).toBeDisabled();
    await editor.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: "Entrambe" }).click();
    await editor.locator("#admin-hb-nome").fill(name);
    await editor.locator("#admin-hb-gs").selectOption("3");
    await editor.locator("#admin-hb-ca").fill("14");
    await editor.locator("#admin-hb-pf").fill("60");
    await editor.locator("#admin-hb-dadi").fill("8d10 + 16");
    await editor.locator("#admin-hb-azioni-0-nome").fill("Artiglio");
    await editor.locator("#admin-hb-azioni-0-testo").fill("Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 20 (3d10 + 4) danni taglienti.");
    await editor.getByRole("button", { name: "Salva" }).click();
    await expect(editor).toHaveCount(0);
    // Saved with its verdict; the pill off until the administrator turns it on.
    await expect.poll(async () => (await database(client => client.query("SELECT bilanciamento, verificato, edizione FROM grimorio_homebrew WHERE id = $1", [id]))).rows[0])
      .toEqual({ bilanciamento: "in linea", verificato: false, edizione: "entrambe" });

    // /admin/bilanciamento, with the selector on 2024 and on 2014: the two verdicts, the saved one, the box.
    for (const edition of ["2024", "2014"]) {
      await chooseAdminEdition(page, edition);
      await page.goto("/admin/bilanciamento");
      const item = page.locator(`[data-balance-item="${id}"]`);
      await expect(item, edition).toContainText("2014 e 2024");
      await expect(item.locator("[data-balance-editions]")).toHaveText("2014: In linea · 2024: In linea");
      await expect(item.locator("[data-balance-edition-verdict]")).toHaveCount(2);
      await expect(item.locator("[data-balance-outcome]")).toHaveAttribute("data-balance-outcome", "in-linea");
      await expect(item.locator("[data-saved-verdict]")).toHaveAttribute("data-saved-verdict", "in linea");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    // The filters count the creature by its worse verdict: «In linea».
    await expect(page.locator('[data-balance-filter="in-linea"]')).toContainText(/In linea · [1-9]/);
    await page.goto("/admin/bilanciamento?filtro=in-linea");
    await expect(page.locator(`[data-balance-item="${id}"]`)).toHaveCount(1);
    await page.goto("/admin/bilanciamento?filtro=fuori");
    await expect(page.locator(`[data-balance-item="${id}"]`)).toHaveCount(0);

    // The box: on, then the pill on the public sheet.
    await page.goto("/admin/bilanciamento");
    const item = page.locator(`[data-balance-item="${id}"]`);
    const box = item.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ });
    await expect(box).toBeEnabled();
    await box.check();
    await expect(item.locator("[data-verified-state]")).toHaveAttribute("data-verified-state", "si");
    if (SHOTS) await item.screenshot({ path: `${SHOTS}/admin-bilanciamento-${width}.png` });
    const guest = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
    const visitor = await guest.newPage();
    await expect.poll(async () => { await visitor.goto(`/mostro/${id}`); return visitor.locator("[data-verified-pill]").count(); }).toBeGreaterThan(0);
    await expect(visitor.locator("[data-verified-pill]").first()).toContainText("Bilanciamento verificato");
    if (SHOTS) await visitor.screenshot({ path: `${SHOTS}/scheda-pillola-${width}.png` });

    // «Ricalcola»: a creature without a saved verdict (as one made before PROMPT 19) gets it again; the pill stays off.
    await database(client => client.query("UPDATE grimorio_homebrew SET bilanciamento = NULL, verificato = false WHERE id = $1", [id]));
    await page.reload();
    await expect(item.locator("[data-saved-verdict]")).toHaveAttribute("data-saved-verdict", "nessuno");
    await expect(box).toBeDisabled();
    await item.getByRole("button", { name: "Ricalcola" }).click();
    await expect(item.locator("[data-saved-verdict]")).toHaveAttribute("data-saved-verdict", "in linea");
    await expect(box).toBeEnabled();
    await expect(box).not.toBeChecked();
    await expect.poll(async () => { await visitor.goto(`/mostro/${id}`); return visitor.locator("[data-verified-pill]").count(); }).toBe(0);

    // The editor: the same box, enabled by the saved verdict; ticked and saved, the pill is back.
    await page.goto(`/mostro/${id}`);
    await page.locator("[data-admin-edit]").filter({ visible: true }).first().click();
    const edit = page.getByRole("dialog");
    const editBox = edit.locator("[data-editor-verified]");
    await expect(editBox).toHaveAttribute("data-editor-verified", "in linea");
    await editBox.getByRole("checkbox").check();
    await edit.getByRole("button", { name: "Salva" }).click();
    await expect(edit).toHaveCount(0);
    await expect.poll(async () => (await database(client => client.query("SELECT verificato FROM grimorio_homebrew WHERE id = $1", [id]))).rows[0].verificato).toBe(true);
    await expect.poll(async () => { await visitor.goto(`/mostro/${id}`); return visitor.locator("[data-verified-pill]").count(); }).toBeGreaterThan(0);
    await guest.close();

    // Clean up: the bin of the reserved area, «Mostri del Grimorio» back to «In arrivo».
    await chooseAdminEdition(page, "2024");
    await page.getByPlaceholder("Cerca per nome o tipo…").fill(name.toLowerCase());
    page.once("dialog", dialog => dialog.accept());
    await page.locator("main ul li[data-card-row]").filter({ hasText: name }).dispatchEvent("contextmenu");
    await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
    await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
    await setBestiaryPart(page, GRIMORIO_TITLE, "In arrivo");
    await context.close();
  });
}

test("the page of the method: the rule after the calibration (PROMPT 29) and its real numbers; open while one group of original creatures is", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const html = await (await request.get("/bestiario/creati-da-voi/bilanciamento")).text();
  expect(html).toContain("Con questa regola, circa 8 mostri ufficiali su 10 risultano &quot;in linea&quot;");
  // The rule of PROMPT 29 and its numbers: seven measures, tolerance 20%.
  expect(html).toContain("240 su 319 (75%) nel 2014");
  expect(html).toContain("247 su 328 (75%) nel 2024");
  expect(html).toContain("al massimo 2 misure su 7 fuori dalla fascia, ciascuna di non più del 20%");
  expect(html).toContain("oppure una sola di più del 100%");
  expect(html).toContain("più i PG a terra");
  expect(html).not.toContain("266 su 319");
  expect(html).toContain("dal 5° al 95° percentile");
  // Never a number of a creature or of the box of the reserved area.
  expect(html).not.toMatch(/data-balance|monster-balance-srd/);
  const { context, page } = await signIn(browser, 1280);
  const guest = path => request.get(path, { maxRedirects: 0 }).then(response => response.status());
  try {
    // «I mostri creati da voi» hidden, «Mostri del Grimorio» visible: the page stays, back to «Mostri del Grimorio».
    await setBestiaryPart(page, COMMUNITY_TITLE, "Nascosta");
    await setBestiaryPart(page, GRIMORIO_TITLE, "Visibile");
    await expect.poll(() => guest("/bestiario/creati-da-voi/bilanciamento")).toBe(200);
    expect(await (await request.get("/bestiario/creati-da-voi/bilanciamento")).text()).toContain("‹ Mostri del Grimorio");
    // Both closed to the visitors: not found (the administrator still sees it).
    await setBestiaryPart(page, GRIMORIO_TITLE, "In arrivo");
    await expect.poll(() => guest("/bestiario/creati-da-voi/bilanciamento")).toBe(404);
    await page.goto("/bestiario/creati-da-voi/bilanciamento");
    await expect(page.locator("[data-method-page]")).toBeVisible();
  } finally {
    await setBestiaryPart(page, COMMUNITY_TITLE, "Visibile");
    await setBestiaryPart(page, GRIMORIO_TITLE, "In arrivo");
    await context.close();
  }
  await expect.poll(() => guest("/bestiario/creati-da-voi/bilanciamento")).toBe(200);
});
