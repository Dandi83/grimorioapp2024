import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 37/38: the English names of the NO SRD cards. The administrator approves a proposal of the project
// (Scossa sinaptica → Synaptic Static, the two Manto del crociato → Crusader's Mantle): the public search shows it
// «in inglese: …» with the letters found, like the SRD names, at once; «Scarta» takes it out; a protected name
// («Tasha», «Mordenkainen») is refused and never shown; the cards do not change. Local test database only.
const CARDS = ["scossa-sinaptica", "manto-del-crociato", "manto-del-crociato-2014"];
const PROTECTED = /tasha|mordenkainen|hadar|agathys|yolande|bigby/i;

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}
const reset = () => database(client => client.query("DELETE FROM grimorio_search_english WHERE card_id = ANY($1)", [CARDS]).catch(() => {}));

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

async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  }, edition);
  return context;
}

/** The Home search for query: the dialog, with the results of the other edition shown too. */
async function homeSearch(page, query) {
  await page.goto(`/?cerca=${encodeURIComponent(query)}`);
  const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog.locator("#search-results")).toBeVisible();
  // The results are there (the index loaded): then the button of the other edition, if any.
  await expect(dialog.getByRole("status")).toHaveText(/risultat|trovat/i);
  const other = dialog.getByRole("button", { name: /^Cerca anche nel/ });
  if (await other.count()) await other.first().click();
  return dialog;
}

const englishNames = async request => ((await (await request.get("/ricerca-indice.json")).json()).en ?? []).map(([name]) => name);
const row = (page, kind, id) => page.locator(`[data-search-english="${kind}:${id}"]`);

/** Approva from «Nomi inglesi da verificare»: the row moves to «Approvati». */
async function approve(page, id) {
  await page.goto("/admin/contenuti/nomi-inglesi");
  await row(page, "incantesimo", id).getByRole("button", { name: "Approva", exact: true }).click();
  await expect(page.locator(`[data-search-english-approved] [data-search-english="incantesimo:${id}"]`)).toBeVisible();
}
async function discard(page, id) {
  await page.goto("/admin/contenuti/nomi-inglesi");
  await page.locator(`[data-search-english-approved] [data-search-english="incantesimo:${id}"]`).getByRole("button", { name: "Scarta" }).click();
  await expect(row(page, "incantesimo", id)).toHaveCount(0);
}

test.describe.configure({ mode: "serial" });
test.afterAll(reset);

for (const width of [390, 1280]) {
  test(`admin at ${width}: edition and level on every row, the two Manto apart; Approva → found at once; «Tasha» refused; Scarta`, async ({ browser }) => {
    test.setTimeout(240_000);
    await reset();
    const { context, page } = await admin(browser, width);

    // The page, from /admin/contenuti: every row with its edition pill and «scuola · liv.».
    await page.goto("/admin/contenuti");
    await page.locator("[data-search-english-link]").click();
    await expect(page).toHaveURL(/\/admin\/contenuti\/nomi-inglesi$/);
    const rows = page.locator("[data-search-english-pending] > li");
    expect(await rows.count()).toBe(50);
    expect(await page.locator("[data-search-english-pending] [data-search-english-edition]").allInnerTexts()).toEqual(Array(50).fill(expect.stringMatching(/^(D&D5e\s*)?(2014|2024)$/)));
    expect(await page.locator("[data-search-english-pending] [data-search-english-label]").allInnerTexts()).toEqual(Array(50).fill(expect.stringMatching(/^[A-Z][a-z]+ · (trucchetto|liv\. \d)$/)));
    const synaptic = row(page, "incantesimo", "scossa-sinaptica");
    await expect(synaptic).toContainText("Scossa sinaptica");
    await expect(synaptic.locator("[data-search-english-edition]")).toContainText("2024");
    await expect(synaptic.locator("[data-search-english-label]")).toHaveText("Ammaliamento · liv. 5");
    await expect(synaptic.locator("[data-search-english-name]")).toHaveText("Synaptic Static");
    // Manto del crociato 2024 and 2014: same name, told apart by the pill.
    for (const [id, edition] of [["manto-del-crociato", "2024"], ["manto-del-crociato-2014", "2014"]]) {
      const manto = row(page, "incantesimo", id);
      await expect(manto).toContainText("Manto del crociato");
      await expect(manto.locator("[data-search-english-edition]")).toContainText(edition);
      await expect(manto.locator("[data-search-english-label]")).toHaveText("Invocazione · liv. 3");
    }
    await expect(page.getByText("Compare nei risultati di ricerca come «in inglese: …»", { exact: false }).first()).toBeVisible();
    if (process.env.INGLESE_SHOTS) await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/nomi-inglesi-admin-${width}.png` });

    // «Modifica» with a protected name: refused, nothing saved.
    await synaptic.locator("summary", { hasText: "Modifica" }).click();
    await synaptic.getByRole("textbox", { name: "Nome inglese di Scossa sinaptica" }).fill("Tasha's Synaptic Static");
    await synaptic.getByRole("button", { name: "Salva e approva" }).click();
    await expect(synaptic.locator("[data-search-english-error]")).toContainText("«Tasha» è un nome protetto e non si può usare");
    expect(await database(async client => (await client.query("SELECT count(*)::int AS n FROM grimorio_search_english WHERE card_id=$1", ["scossa-sinaptica"])).rows[0].n)).toBe(0);
    expect(await englishNames(context.request)).not.toContain("Synaptic Static");

    // «Approva»: the index has it at once (one request, no waiting), and a new visitor finds it.
    await approve(page, "scossa-sinaptica");
    expect(await englishNames(context.request)).toContain("Synaptic Static");
    const guest = await visitor(browser, width, "2024");
    const dialog = await homeSearch(await guest.newPage(), "synaptic");
    await expect(dialog.locator('a[href="/spell/scossa-sinaptica"] [data-in-inglese]')).toHaveText("in inglese: Synaptic Static");
    await guest.close();

    // The editor: the note, the preview with the edition and «Ammaliamento · liv. 5»; a protected name refuses the save.
    await page.goto("/admin/incantesimi/scossa-sinaptica");
    const field = page.getByLabel("Nome inglese (solo ricerca)").filter({ visible: true }).first();
    await expect(field).toHaveValue("Synaptic Static");
    await expect(page.getByText("Compare nei risultati di ricerca come «in inglese: …».").filter({ visible: true }).first()).toBeVisible();
    const preview = page.locator("[data-search-english-preview]").filter({ visible: true }).first();
    await expect(preview).toContainText("Scossa sinaptica");
    await expect(preview.locator("[data-search-english-edition]")).toContainText("2024");
    await expect(preview.locator("[data-search-english-label]")).toHaveText("Ammaliamento · liv. 5");
    await expect(preview).toContainText("in inglese: Synaptic Static");
    if (process.env.INGLESE_SHOTS) await preview.screenshot({ path: `${process.env.INGLESE_SHOTS}/nomi-inglesi-editor-${width}.png` });
    await field.fill("Mordenkainen's Static");
    await page.getByRole("button", { name: "Salva modifiche" }).filter({ visible: true }).first().click();
    await expect(page.getByText(/«Mordenkainen» è un nome protetto/).filter({ visible: true }).first()).toBeVisible();
    expect(await database(async client => (await client.query("SELECT name FROM grimorio_search_english WHERE card_id=$1", ["scossa-sinaptica"])).rows[0].name)).toBe("Synaptic Static");

    // «Scarta»: out of the index at once; the search shows no English line for it.
    await discard(page, "scossa-sinaptica");
    expect(await englishNames(context.request)).not.toContain("Synaptic Static");
    const after = await visitor(browser, width, "2024");
    const again = await homeSearch(await after.newPage(), "synaptic static");
    await expect(again.locator("[data-in-inglese]", { hasText: /synaptic/i })).toHaveCount(0);
    await after.close();
    await context.close();
    await reset();
  });
}

test.describe("visitor", () => {
  test.beforeAll(async ({ browser }) => {
    await reset();
    const { context, page } = await admin(browser, 1280);
    for (const id of CARDS) await approve(page, id);
    await context.close();
  });
  test.afterAll(async ({ browser }) => {
    const { context, page } = await admin(browser, 1280);
    for (const id of CARDS) await discard(page, id);
    await context.close();
    await reset();
  });

  for (const width of [390, 1280]) for (const edition of ["2024", "2014"]) {
    test(`at ${width}, ${edition}: «synaptic» with «in inglese» marked; not approved and protected names never shown; cards unchanged`, async ({ browser }) => {
      test.setTimeout(180_000);
      const context = await visitor(browser, width, edition);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(String(error)));

      // The Home: Scossa sinaptica (2024 only: in 2014 under «Cerca anche nel 2024»), the English line marked.
      let dialog = await homeSearch(page, "synaptic");
      const line = dialog.locator('a[href="/spell/scossa-sinaptica"] [data-in-inglese]');
      await expect(line).toHaveText("in inglese: Synaptic Static");
      await expect(line.locator("mark")).toHaveText("Synaptic");
      await expect(line.locator("mark")).toHaveCSS("background-color", "rgb(246, 226, 168)");
      await expect(dialog.locator('a[href="/spell/scossa-sinaptica"]')).toContainText("Scossa sinaptica");
      // Manto del crociato in its edition.
      dialog = await homeSearch(page, "crusader");
      const manto = dialog.locator(`a[href="/spell/manto-del-crociato${edition === "2014" ? "-2014" : ""}"] [data-in-inglese]`).first();
      await expect(manto).toHaveText("in inglese: Crusader's Mantle");
      await expect(manto.locator("mark")).toHaveText("Crusader");
      if (process.env.INGLESE_SHOTS) await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/home-crusader-${width}-${edition}.png` });

      // A proposal not approved (Bubbling Cauldron): no English line; a protected name: never shown.
      dialog = await homeSearch(page, "bubbling cauldron");
      await expect(dialog.locator("[data-in-inglese]", { hasText: /bubbling/i })).toHaveCount(0);
      dialog = await homeSearch(page, "tasha");
      await expect(dialog.locator("[data-in-inglese]", { hasText: PROTECTED })).toHaveCount(0);
      expect((await englishNames(context.request)).filter(name => PROTECTED.test(name))).toEqual([]);

      // The list of Incantesimi: the line only while searching, marked.
      await page.goto("/grimorio");
      const field = page.getByRole("searchbox", { name: "Cerca un incantesimo" }).filter({ visible: true }).first();
      const [query, id, name, marked] = edition === "2024" ? ["synaptic", "scossa-sinaptica", "Synaptic Static", "Synaptic"] : ["crusader", "manto-del-crociato-2014", "Crusader's Mantle", "Crusader"];
      await field.fill(query);
      const listLine = page.locator(`a[href="/spell/${id}"] [data-in-inglese]`).filter({ visible: true }).first();
      await expect(listLine).toHaveText(`in inglese: ${name}`);
      await expect(listLine.locator("mark")).toHaveText(marked);
      await field.fill("");
      await expect(page.locator("[data-in-inglese]").filter({ visible: true })).toHaveCount(0);

      // The cards do not change: no English name on them, in the HTML either.
      for (const card of edition === "2024" ? ["scossa-sinaptica", "manto-del-crociato"] : ["manto-del-crociato-2014"]) {
        await page.goto(`/spell/${card}`);
        await expect(page.locator("main [data-in-inglese]")).toHaveCount(0);
        const html = await (await context.request.get(`/spell/${card}`)).text();
        expect(html, card).not.toMatch(/Synaptic Static|Crusader.s Mantle/);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
});
