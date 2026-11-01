import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { COMMUNITY_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// PROMPT 29: the names of PROMPT 25 in the reserved area too. «+» → «Nuovo mostro della redazione» (and the title of its
// window); Contenuti → Mostri with «Dalla redazione N» and «Dalla community N» instead of «Creati da voi N»; no
// «Creati da voi» / «Creato dal Grimorio» left in the admin pages; the row Mostri of /admin/contenuti tells the parts
// «in arrivo» from the hidden ones. 390 and 1280. Local test database only.
const OURS = "homebrew-prova-nomi-redazione";
const THEIRS = ["homebrew-prova-nomi-community-1", "homebrew-prova-nomi-community-2"];
const OLD = /Creati da voi|Creat[oa] dal Grimorio|Creat[oa] da voi|Nuovo «Dalla redazione»/;
const draft = nome => ({
  edizione: "2024", nome, taglia: "Media", tipo: "Bestia", allineamento: "neutrale", ca: 13, ca_nota: "", pf: 22, dadi_vita: "4d8 + 4",
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

/** The original creatures of 2024 in the database: of the editorial staff (no author) and of the community. */
const expected = () => database(client => client.query(
  "SELECT count(*) FILTER (WHERE autore IS NULL)::int AS redazione, count(*) FILTER (WHERE autore IS NOT NULL)::int AS community FROM grimorio_homebrew WHERE edizione IN ('2024', 'entrambe')",
)).then(result => result.rows[0]);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    const insert = "INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, '2024', $3, $4) ON CONFLICT (id) DO NOTHING";
    await client.query(insert, [OURS, JSON.stringify(draft("Lince dei nomi nuovi")), null, null]);
    for (const [index, id] of THEIRS.entries()) await client.query(insert, [id, JSON.stringify(draft(`Lince della community ${index + 1}`)), "Lia", "CC BY-NC-SA 4.0"]);
  });
});

// The rows from the database, then the bin of the reserved area on one of them: it refreshes the cached lists of the
// site (e2e/homebrew.spec.mjs starts with no creature of the community).
test.afterAll(async ({ browser }) => {
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [THEIRS]));
  const { context, page } = await signIn(browser, 1280);
  await chooseAdminEdition(page, "2024");
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("lince dei nomi");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Lince dei nomi nuovi" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
});

for (const width of [390, 1280]) {
  test(`reserved area at ${width}: «Nuovo mostro della redazione», «Dalla redazione» / «Dalla community», no old names, parts «in arrivo» apart`, async ({ browser }) => {
    test.setTimeout(180_000);
    const { context, page } = await signIn(browser, width);
    const noSideScroll = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    // Contenuti → Mostri: two quick filters with the right counts, each showing only its creatures.
    await chooseAdminEdition(page, "2024");
    const want = await expected();
    expect(want.redazione).toBeGreaterThanOrEqual(1);
    expect(want.community).toBeGreaterThanOrEqual(2);
    const ours = page.locator("[data-counter='redazione']"), theirs = page.locator("[data-counter='community']");
    await expect(ours).toContainText("Dalla redazione");
    await expect(ours).toContainText(String(want.redazione));
    await expect(theirs).toContainText("Dalla community");
    await expect(theirs).toContainText(String(want.community));
    await expect(page.locator("[data-counter='creati']")).toHaveCount(0);
    await expect(page.locator("main[data-admin-list]")).not.toContainText(OLD);
    const rows = page.locator("main ul li[data-card-row]");
    await ours.click();
    await expect(rows).toHaveCount(want.redazione);
    await expect(rows.filter({ hasText: "Lince dei nomi nuovi" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "Lince della community" })).toHaveCount(0);
    await ours.click();
    await theirs.click();
    await expect(rows).toHaveCount(want.community);
    await expect(rows.filter({ hasText: "Lince della community" })).toHaveCount(2);
    await theirs.click();
    await noSideScroll();

    // «+»: «Nuovo mostro della redazione», and the window with the same title.
    await page.getByRole("button", { name: "Nuovo", exact: true }).click();
    const choose = page.getByRole("dialog", { name: "Nuova creatura" });
    await expect(choose).not.toContainText(OLD);
    await choose.getByRole("button", { name: "Nuovo mostro della redazione", exact: true }).click();
    const editor = page.getByRole("dialog");
    await expect(editor).toContainText("Nuovo mostro della redazione");
    await expect(editor).not.toContainText(OLD);
    await editor.getByRole("button", { name: "Chiudi editor" }).click();
    await expect(editor).toHaveCount(0);

    // No old name in the pages of the reserved area.
    for (const path of ["/admin", "/admin/contenuti", "/admin/proposte", "/admin/bilanciamento", "/admin/statistiche", "/admin/sezioni", "/admin/registro"]) {
      await page.goto(path);
      await expect(page.locator("main").first(), path).not.toContainText(OLD);
    }

    // /admin/contenuti, row Mostri: «Mostri del Grimorio» in arrivo (its default), the community visible.
    await page.goto("/admin/contenuti");
    const monsters = page.locator('[data-content-row="mostri"]');
    await expect(monsters).toContainText("1 parte in arrivo per gli utenti");
    await expect(monsters).not.toContainText("nascost");
    await noSideScroll();
    // The community hidden too: both, each with its number.
    await setBestiaryPart(page, COMMUNITY_TITLE, "Nascosta");
    try {
      await page.goto("/admin/contenuti");
      await expect(monsters).toContainText("1 parte in arrivo · 1 parte nascosta per gli utenti");
      await expect(monsters).toHaveAttribute("aria-label", /1 parte in arrivo · 1 parte nascosta per gli utenti/);
    } finally {
      await setBestiaryPart(page, COMMUNITY_TITLE, "Visibile");
    }
    await page.goto("/admin/contenuti");
    await expect(monsters).toContainText("1 parte in arrivo per gli utenti");
    await context.close();
  });
}
