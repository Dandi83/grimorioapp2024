import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// Bilanciamento (PROMPT 11): the administrator sees the box under the monster sheets (phone and computer, 2014 and
// 2024), in the editor on «Ricalcola» and in /admin/bilanciamento; a visitor never, not even in the HTML.
// Two sheets made «in the reserved area» are written only in the local test database, then deleted.
const SHOTS = process.env.BILANCIAMENTO_SHOTS;
const BITE = (bonus, average, dice) => `<strong>Morso.</strong> <em>Tiro per colpire in mischia:</em> +${bonus}, portata 1,5 m. <em>Colpito:</em> ${average} (${dice}) danni perforanti.`;
const MADE = [
  ["prova-bilanciamento-guardiano", "Guardiano di prova", "2", "13", "45 (6d8 + 18)", `<strong>Multiattacco.</strong> Il guardiano effettua due attacchi Morso.<br><br>${BITE(4, 9, "2d6 + 2")}`],
  ["prova-bilanciamento-colosso", "Colosso di prova", "1", "18", "300 (24d12 + 144)", `<strong>Multiattacco.</strong> Il colosso effettua quattro attacchi Morso.<br><br>${BITE(12, 40, "6d10 + 7")}`],
];

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test.beforeAll(async () => {
  await database(async client => {
    for (const [id, nome, gs, ca, pf, azioni] of MADE)
      await client.query(`INSERT INTO monsters (id, nome, tipo, taglia, grado_sfida, classe_armatura, punti_ferita, forza, azioni, sort_key)
        VALUES ($1,$2,'Costrutto','Media',$3,$4,$5,16,$6,$7) ON CONFLICT (id) DO NOTHING`, [id, nome, gs, ca, pf, azioni, nome.toLowerCase()]);
  });
});
test.afterAll(async () => {
  await database(client => client.query("DELETE FROM monsters WHERE id LIKE 'prova-bilanciamento-%'"));
});

test("administrator: the box under the sheets, 2024 and 2014, phone and computer", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const [id, edition, level] of [["drago-nero-adulto", "2024", 14], ["troll-2014", "2014", 5]]) {
      await page.goto(`/mostro/${id}`);
      const box = page.locator("[data-balance-box]");
      await expect(box, `${id} ${viewport.width}`).toBeVisible();
      await expect(box).toContainText("BILANCIAMENTO");
      await expect(box.locator("[data-balance-row]")).toHaveCount(3);
      for (const label of ["Danni ai PG per round", "Round che resiste", "PG a terra (% scontri)"]) await expect(box).toContainText(label);
      await expect(box.locator("[data-balance-verdict]")).toHaveCount(3);
      await expect(box).toContainText(`Simulazione contro 4 PG di livello ${level}`);
      await expect(box).toContainText(`mostri SRD ${edition}`);
      await expect(box.locator("[data-balance-typical]")).toContainText("Valori tipici per questo GS");
      await expect(box).toHaveCSS("border-style", "dashed");
      await expect(box).toHaveCSS("background-color", "rgb(252, 239, 208)");
      // Under the sheet, inside the width of the page.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      if (SHOTS && id === "drago-nero-adulto") await box.screenshot({ path: `${SHOTS}/1-riquadro-${viewport.width}.png` });
    }
  }
});

test("administrator: the sheets made here in /admin/bilanciamento, farthest first, and the editor on «Ricalcola»", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin");
  await page.getByRole("link", { name: /Bilanciamento/ }).click();
  await expect(page).toHaveURL(/\/admin\/bilanciamento$/);
  const items = page.locator("[data-balance-item]");
  await expect(items.first()).toHaveAttribute("data-balance-item", "prova-bilanciamento-colosso");
  await expect(page.locator('[data-balance-item="prova-bilanciamento-colosso"] [data-balance-outcome]')).toHaveAttribute("data-balance-outcome", "fuori");
  await expect(page.locator('[data-balance-item="prova-bilanciamento-guardiano"]')).toContainText("Creata qui · GS 2 · 2024");
  if (SHOTS) await page.locator("[data-balance-page]").screenshot({ path: `${SHOTS}/2-pagina-bilanciamento.png` });
  // The box of a sheet made here, on its page.
  await page.goto("/mostro/prova-bilanciamento-colosso");
  await expect(page.locator("[data-balance-result]")).toHaveAttribute("data-balance-result", "fuori");
  await expect(page.locator("[data-balance-result]")).toContainText("Danni ai PG per round sopra la fascia");
  // The editor: nothing until «Ricalcola», then the box of the sheet as written.
  await page.goto("/admin/mostri/prova-bilanciamento-guardiano");
  const section = page.locator("[data-editor-balance]").filter({ visible: true }).first();
  await expect(section).toBeVisible();
  await expect(section.locator("[data-balance-box]")).toHaveCount(0);
  await section.getByRole("button", { name: "Ricalcola" }).click();
  await expect(section.locator("[data-balance-box]")).toBeVisible();
  await expect(section.locator("[data-balance-box]")).toContainText("Simulazione contro 4 PG di livello 2");
  // A change in the form, then «Ricalcola» again: a CR of 10 is compared with level 10.
  await page.locator("#grado_sfida").selectOption("10");
  await section.getByRole("button", { name: "Ricalcola" }).click();
  await expect(section.locator("[data-balance-box]")).toContainText("Simulazione contro 4 PG di livello 10");
  // Nothing was saved: the page of the sheet still shows CR 2.
  await page.goto("/mostro/prova-bilanciamento-guardiano");
  await expect(page.locator("[data-balance-box]")).toContainText("livello 2");
});

test("a visitor: no box, no word of it in the HTML, the API refuses", async ({ browser, request }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const id of ["drago-nero-adulto", "troll-2014", "prova-bilanciamento-colosso"]) {
    const response = await request.get(`/mostro/${id}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toMatch(/Bilanciamento|BILANCIAMENTO|data-balance/);
    await page.goto(`/mostro/${id}`);
    await page.waitForTimeout(500);
    await expect(page.locator("[data-balance-box]")).toHaveCount(0);
  }
  const api = await request.get("/api/admin/pannello-mostro?id=drago-nero-adulto");
  expect(api.status()).toBe(401);
  expect(api.headers()["cache-control"]).toBe("private, no-store");
  const list = await request.get("/admin/bilanciamento");
  expect(await list.text()).not.toMatch(/Colosso di prova|data-balance-list/);
  await context.close();
});
