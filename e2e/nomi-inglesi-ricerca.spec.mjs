import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 37: English names «solo ricerca» of the NO SRD cards. The administrator approves a proposal of the project
// (Scossa sinaptica → Synaptic Static), the public search finds the card by it without ever showing it; «Scarta» takes
// it out; a protected name («Tasha») is refused, in the page and in the editor. Local test database only.
const CARD = "scossa-sinaptica";

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}
const reset = () => database(client => client.query("DELETE FROM grimorio_search_english WHERE card_id = $1", [CARD]).catch(() => {}));

async function admin(browser, width) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, page };
}

async function visitorSearch(browser, width, query) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto(`/?cerca=${encodeURIComponent(query)}`);
  const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog.locator("#search-results")).toBeVisible();
  return { context, page, dialog };
}

const keysOf = async request => ((await (await request.get("/ricerca-indice.json")).json()).k ?? []).map(([key]) => key);

test.describe.configure({ mode: "serial" });
test.afterAll(reset);

for (const width of [390, 1280]) {
  test(`at ${width}: proposal → Approva → found, never shown; Scarta → out; «Tasha» refused`, async ({ browser }) => {
    test.setTimeout(240_000);
    await reset();
    const { context, page } = await admin(browser, width);

    // The page, from /admin/contenuti.
    await page.goto("/admin/contenuti");
    await page.locator('[data-content-row="nomi-inglesi"]').click();
    await expect(page).toHaveURL(/\/admin\/contenuti\/nomi-inglesi$/);
    const row = page.locator(`[data-search-english="incantesimo:${CARD}"]`);
    await expect(row).toContainText("Scossa sinaptica");
    await expect(row.locator("[data-search-english-name]")).toHaveText("Synaptic Static");
    await expect(row).toContainText("da verificare");
    expect(await page.locator("[data-search-english-pending] li").count()).toBe(50);

    // «Modifica» with a protected name: refused, nothing saved.
    await row.locator("summary", { hasText: "Modifica" }).click();
    await row.getByRole("textbox", { name: "Nome inglese di Scossa sinaptica" }).fill("Tasha's Synaptic Static");
    await row.getByRole("button", { name: "Salva e approva" }).click();
    await expect(row.locator("[data-search-english-error]")).toContainText("«Tasha» è un nome protetto e non si può usare");
    expect(await database(async client => (await client.query("SELECT count(*)::int AS n FROM grimorio_search_english WHERE card_id=$1", [CARD])).rows[0].n)).toBe(0);
    expect(await keysOf(context.request)).not.toContain("synaptic static");

    // «Approva»: in the list of the approved; the index gets only the normalized key.
    await row.getByRole("button", { name: "Approva", exact: true }).click();
    await expect(page.locator(`[data-search-english-approved] [data-search-english="incantesimo:${CARD}"]`)).toBeVisible();
    await expect.poll(() => keysOf(context.request)).toContain("synaptic static");
    const served = await (await context.request.get("/ricerca-indice.json")).text();
    expect(served).not.toContain("Synaptic");

    // The visitor: «synaptic static» finds the card, with no English line and no English word on the page.
    const visitor = await visitorSearch(browser, width, "synaptic static");
    const link = visitor.dialog.locator(`a[href="/spell/${CARD}"]`);
    await expect(link).toBeVisible();
    await expect(link).toContainText("Scossa sinaptica");
    await expect(visitor.dialog.locator("[data-similar-results]")).toHaveCount(0);
    await expect(visitor.dialog.locator("[data-in-inglese]")).toHaveCount(0);
    expect((await visitor.page.locator("body").innerText()).toLowerCase()).not.toContain("synaptic");
    await visitor.dialog.getByRole("searchbox").fill("synaptic");
    await expect(link).toBeVisible();
    await expect(visitor.dialog.locator("[data-in-inglese]")).toHaveCount(0);
    // The card and the list: never the English name, in the HTML either.
    for (const path of [`/spell/${CARD}`, "/grimorio", "/api/catalogo/incantesimi"]) {
      const response = await visitor.context.request.get(path);
      expect((await response.text()).toLowerCase(), path).not.toContain("synaptic");
    }
    await visitor.context.close();

    // The editor: the field with its note, the approved name; a protected name refuses the save.
    await page.goto(`/admin/incantesimi/${CARD}`);
    const field = page.getByLabel("Nome inglese (solo ricerca)").filter({ visible: true }).first();
    await expect(field).toHaveValue("Synaptic Static");
    await expect(page.getByText("Serve solo a trovarla cercando in inglese: non compare mai nell’app.").filter({ visible: true }).first()).toBeVisible();
    await field.fill("Mordenkainen's Static");
    await page.getByRole("button", { name: "Salva modifiche" }).filter({ visible: true }).first().click();
    await expect(page.getByText(/«Mordenkainen» è un nome protetto/).filter({ visible: true }).first()).toBeVisible();
    expect(await database(async client => (await client.query("SELECT name FROM grimorio_search_english WHERE card_id=$1", [CARD])).rows[0].name)).toBe("Synaptic Static");

    // «Scarta» from the approved: out of the index, the search finds it only as a similar name.
    await page.goto("/admin/contenuti/nomi-inglesi");
    await page.locator(`[data-search-english-approved] [data-search-english="incantesimo:${CARD}"]`).getByRole("button", { name: "Scarta" }).click();
    await expect(page.locator(`[data-search-english="incantesimo:${CARD}"]`)).toHaveCount(0);
    await expect.poll(() => keysOf(context.request)).not.toContain("synaptic static");
    const after = await visitorSearch(browser, width, "synaptic static");
    await expect(after.dialog.locator(`a[href="/spell/${CARD}"]`).filter({ has: after.page.locator("mark") })).toHaveCount(0);
    expect(await after.dialog.locator(`a[href="/spell/${CARD}"]`).count() === 0 || await after.dialog.locator("[data-similar-results]").count() > 0).toBe(true);
    await after.context.close();
    if (process.env.INGLESE_SHOTS) {
      await reset();
      await page.goto("/admin/contenuti/nomi-inglesi");
      await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/nomi-inglesi-admin-${width}.png` });
    }
    await context.close();
  });
}
