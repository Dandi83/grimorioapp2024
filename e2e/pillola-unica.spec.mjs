import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// PROMPT 28: a creature «2014 e 2024» has one dark label «📖 2014 e 2024» (sheet and form preview), a creature of one
// edition only its year; «Mostro originale, bilanciato…» only without «✓ Bilanciamento verificato»; the SRD sheets
// unchanged. 390 and 1280, the chosen edition on 2014 and on 2024. Local test database only.
const BOTH = "homebrew-prova-pillola-entrambe";
const ONLY = "homebrew-prova-pillola-2014";
const PLAIN = "homebrew-prova-pillola-redazione";
const GREEN = "homebrew-prova-pillola-verificata";
const LINE = "Mostro originale, bilanciato sui mostri ufficiali dello stesso GS";
const draft = (nome, edizione) => ({
  edizione, nome, taglia: "Media", tipo: "Bestia", allineamento: "neutrale", ca: 13, ca_nota: "", pf: 22, dadi_vita: "4d8 + 4",
  velocita: "12 m", forza: 14, destrezza: 15, costituzione: 12, intelligenza: 3, saggezza: 12, carisma: 6, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: "1",
  tratti: [], azioni: [{ nome: "Morso", testo: "Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 7 (2d4 + 2) danni perforanti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await context.newPage();
  await admin.goto("/admin");
  await admin.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await admin.getByRole("button", { name: "Entra" }).click();
  await expect(admin.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, admin };
}

async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(value => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); window.localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ }
  }, edition);
  return context;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await database(async client => {
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text").catch(() => {});
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false").catch(() => {});
    const insert = "INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza, bilanciamento, verificato) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING";
    await client.query(insert, [BOTH, JSON.stringify(draft("Lince delle due ere", "entrambe")), "entrambe", "Lia", "CC BY-NC-SA 4.0", null, false]);
    await client.query(insert, [ONLY, JSON.stringify(draft("Lince antica", "2014")), "2014", "Lia", "CC BY-NC-SA 4.0", null, false]);
    await client.query(insert, [PLAIN, JSON.stringify(draft("Lince della redazione", "2024")), "2024", null, null, "in linea", false]);
    await client.query(insert, [GREEN, JSON.stringify(draft("Lince verificata", "entrambe")), "entrambe", null, null, "in linea", true]);
  });
  // The creatures of the editorial staff need «Mostri del Grimorio» shown (PROMPT 25).
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  await context.close();
});

// The rows from the database, then the bin of the reserved area on one of ours: it refreshes the cached lists of the
// site (e2e/homebrew.spec.mjs starts with no creature of «Creati da voi»); «Mostri del Grimorio» back to «In arrivo».
test.afterAll(async ({ browser }) => {
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[BOTH, ONLY, GREEN]]));
  const { context, admin } = await signIn(browser);
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill("lince della redazione");
  admin.once("dialog", dialog => dialog.accept());
  await admin.locator("main ul li[data-card-row]").filter({ hasText: "Lince della redazione" }).dispatchEvent("contextmenu");
  await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "In arrivo");
  await context.close();
});

for (const width of [390, 1280]) {
  for (const edition of ["2014", "2024"]) {
    test(`sheets at ${width}, chosen edition ${edition}: one edition label; «Mostro originale…» only without the green pill; SRD unchanged`, async ({ browser }) => {
      test.setTimeout(120_000);
      const context = await visitor(browser, width, edition);
      const page = await context.newPage();
      const header = () => page.locator("article header").first();
      const noSideScroll = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      // «2014 e 2024»: one dark label, whatever the edition chosen.
      for (const id of [BOTH, GREEN]) {
        await page.goto(`/mostro/${id}`);
        await expect(header().locator("[data-edition-pill]"), id).toHaveText("2014 e 2024");
        await expect(header().getByText("2014 e 2024", { exact: true })).toHaveCount(1);
        await expect(header().locator("[data-monster-provenance]")).toHaveCount(0);
        await noSideScroll();
      }
      // One edition: only its year.
      await page.goto(`/mostro/${ONLY}`);
      await expect(header().locator("[data-monster-provenance]")).toHaveText("2014");
      await expect(header().locator("[data-edition-pill]")).toHaveCount(0);
      await expect(header().getByText("2014 e 2024", { exact: true })).toHaveCount(0);
      // The editorial staff: the line without the green pill, not with it.
      await page.goto(`/mostro/${PLAIN}`);
      await expect(header().locator("[data-monster-provenance]")).toHaveText("2024");
      await expect(page.locator("[data-verified-pill]")).toHaveCount(0);
      await expect(page.locator("[data-homebrew-byline=grimorio]")).toHaveText(LINE);
      await page.goto(`/mostro/${GREEN}`);
      await expect(page.locator("[data-verified-pill]").first()).toBeVisible();
      await expect(page.locator("[data-homebrew-byline=grimorio]")).toHaveCount(0);
      await expect(page.getByText(LINE)).toHaveCount(0);
      // An SRD sheet: its dark edition label as before, nothing of this.
      await page.goto("/mostro/drago-nero-adulto");
      await expect(header().locator("[data-monster-provenance]")).toHaveCount(1);
      await expect(header().locator("[data-edition-pill]")).toHaveCount(0);
      await noSideScroll();

      // The preview of the form: «Entrambe», one label; one edition, its year.
      await page.goto("/bestiario/proponi");
      await page.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: "Entrambe" }).click();
      await page.locator("#hb-nome").fill("Lince di prova");
      await page.locator("[data-proposal-preview]").click();
      const preview = page.locator("[data-homebrew-preview]");
      await expect(preview.locator("[data-edition-pill]")).toHaveText("2014 e 2024");
      await expect(preview.getByText("2014 e 2024", { exact: true })).toHaveCount(1);
      await expect(preview.locator("[data-monster-provenance]")).toHaveCount(0);
      await noSideScroll();
      await page.evaluate(() => localStorage.removeItem("grimorio.proposta-bozza"));
      await context.close();
    });
  }
}

test("the lists keep the small «2014 e 2024» pill", async ({ browser }) => {
  const context = await visitor(browser, 390, "2024");
  const page = await context.newPage();
  await page.goto("/bestiario/creature-originali");
  const row = page.locator("li.catalog-row").filter({ has: page.locator(`a[href="/mostro/${BOTH}"]`) });
  await expect(row).toContainText("2014 e 2024");
  await expect(row.locator("[data-edition-pill]")).toHaveCount(0);
  await context.close();
});
