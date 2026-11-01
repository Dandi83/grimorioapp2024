import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// «Descrizione in alto» (PROMPT 20): the sheets of «I mostri creati da voi» (community and «Dalla redazione») open
// with their description in italics, under the pills and the author line and above the ink strip; on the phone 4 lines
// and «Leggi tutto». The form preview does the same. The official sheets keep «Descrizione» at the bottom. A creature
// «2014 e 2024» keeps its pill and its dark label follows the chosen edition. Local test database only.
const SHOTS = process.env.DESCRIZIONE_SHOTS;
const LONG = "homebrew-prova-descrizione-lunga";
const SHORT_2014 = "homebrew-prova-descrizione-2014";
const OURS = "homebrew-prova-descrizione-grimorio";
const BOTH = "homebrew-prova-descrizione-entrambe";
// A sheet made in the reserved area (not of «Creati da voi»), with a description: it stays at the bottom.
const MADE = "prova-descrizione-in-fondo";
const LONG_TEXT = [
  "Un guardiano di pietra nera che veglia sulle rovine di un tempio dimenticato da secoli, immobile come una statua finché qualcuno non ne profana la soglia.",
  "Quando si risveglia, le rune incise sul petto si accendono di una luce color brace e la creatura avanza lenta ma inarrestabile, colpendo con pugni capaci di frantumare gli scudi.",
  "I saggi dicono che fu creato da un ordine di chierici scomparso, e che obbedisca ancora alla parola d’ordine dei suoi creatori: chi la conosce può passare senza combattere.",
].join("\n\n");
const draft = (nome, edizione, descrizione) => ({
  edizione, nome, taglia: "Grande", tipo: "Costrutto", allineamento: "neutrale", ca: 16, ca_nota: "", pf: 90, dadi_vita: "12d10 + 24",
  velocita: "6 m", forza: 18, destrezza: 8, costituzione: 15, intelligenza: 3, saggezza: 10, carisma: 1, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: "5",
  tratti: [], azioni: [{ nome: "Pugno", testo: "Tiro per colpire in mischia: +7, portata 1,5 m. Colpito: 15 (2d10 + 4) danni contundenti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [], descrizione,
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function visitor(browser, width, edition = "2024") {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(value => {
    try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  }, edition);
  return context;
}

/** Where the description is: «alto» (before the ink strip, after the title and its byline), «fondo», or none. */
async function place(page) {
  return page.locator("article").first().evaluate(article => {
    const lead = article.querySelector("[data-monster-lead]");
    const strip = article.querySelector("[data-monster-strip]");
    const header = article.querySelector("header");
    const sections = [...article.querySelectorAll("[data-monster-section] > h2")].map(h2 => h2.textContent.trim());
    if (lead) {
      const beforeStrip = !!(lead.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING);
      const afterHeader = !!(header.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { where: beforeStrip && afterHeader ? "alto" : "altrove", sections };
    }
    return { where: sections.at(-1) === "Descrizione" ? "fondo" : "nessuna", sections };
  });
}

test.beforeAll(async () => {
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    await client.query(`INSERT INTO monsters (id, nome, tipo, taglia, grado_sfida, classe_armatura, punti_ferita, azioni, descrizione, sort_key)
      VALUES ($1, 'Statua in fondo', 'Costrutto', 'Media', '2', '14', '30 (4d8 + 12)', '<strong>Pugno.</strong> Colpisce.', 'Una statua che si anima di notte.', 'statua in fondo') ON CONFLICT (id) DO NOTHING`, [MADE]);
    const insert = "INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING";
    await client.query(insert, [LONG, JSON.stringify(draft("Guardiano delle rovine", "2024", LONG_TEXT)), "2024", "Lia", "CC BY-NC-SA 4.0"]);
    await client.query(insert, [SHORT_2014, JSON.stringify(draft("Guardiano antico", "2014", "Un costrutto dei tempi antichi.")), "2014", "Lia", "CC BY-NC-SA 4.0"]);
    await client.query(insert, [OURS, JSON.stringify(draft("Custode del Grimorio", "2024", "Creato dal Grimorio per le cripte.")), "2024", null, null]);
    await client.query(insert, [BOTH, JSON.stringify(draft("Custode delle due edizioni", "entrambe", "Vale per il 2014 e per il 2024.")), "entrambe", "Lia", "CC BY-NC-SA 4.0"]);
  });
});


/**
 * Clean-up: the other rows from the database, ours with the bin of the reserved area, which refreshes the cached lists of
 * the site (e2e/homebrew.spec.mjs starts with no creature of «Creati da voi»); the cache is read again until it is empty.
 */
/** An administrator page of its own context, signed in. */
async function signIn(browser) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await context.newPage();
  await admin.goto("/admin");
  await admin.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await admin.getByRole("button", { name: "Entra" }).click();
  await expect(admin.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, admin };
}

// Ours is «Dalla redazione»: «Mostri del Grimorio» starts «In arrivo» (PROMPT 25), shown for these tests.
test.beforeAll(async ({ browser }) => {
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  await context.close();
});

async function cleanUp(browser, ids, binned) {
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [ids.filter(id => id !== binned.id)]));
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "In arrivo");
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill(binned.name.toLowerCase());
  admin.once("dialog", dialog => dialog.accept());
  await admin.locator("main ul li[data-card-row]").filter({ hasText: binned.name }).dispatchEvent("contextmenu");
  await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
}

test.afterAll(async ({ browser }) => {
  await database(client => client.query("DELETE FROM monsters WHERE id = $1", [MADE]));
  await cleanUp(browser, [LONG, SHORT_2014, OURS, BOTH], { id: OURS, name: "Custode del Grimorio" });
});

for (const width of [390, 1280]) {
  test(`homebrew sheets at ${width}: description at the top, in italics; «Leggi tutto» only on the phone`, async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await visitor(browser, width);
    const page = await context.newPage();
    for (const [id, text] of [[SHORT_2014, "Un costrutto dei tempi antichi."], [OURS, "Creato dal Grimorio per le cripte."], [BOTH, "Vale per il 2014 e per il 2024."]]) {
      await page.goto(`/mostro/${id}`);
      const lead = page.locator("[data-monster-lead]");
      await expect(lead).toHaveText(text);
      expect(await place(page), id).toMatchObject({ where: "alto" });
      expect((await place(page)).sections).not.toContain("Descrizione");
      await expect(page.locator("[data-lead-more]")).toHaveCount(0);
    }
    // «Dalla redazione»: its pill and line under the title, then the description.
    await page.goto(`/mostro/${OURS}`);
    await expect(page.locator("[data-homebrew-pill='grimorio']")).toBeVisible();
    await expect(page.locator("[data-homebrew-byline='grimorio']")).toBeVisible();

    await page.goto(`/mostro/${LONG}`);
    await expect(page.locator("[data-homebrew-byline='community']")).toBeVisible();
    const box = page.locator("[data-monster-lead] [data-lead-open]");
    const style = await box.evaluate(node => { const css = getComputedStyle(node); return { size: css.fontSize, style: css.fontStyle, line: css.lineHeight, color: css.color, family: css.fontFamily }; });
    expect(style).toMatchObject({ size: "19px", style: "italic", line: "28.5px", color: "rgb(61, 49, 40)" });
    expect(style.family).toMatch(/Garamond/i);
    expect(await page.locator("[data-monster-lead]").evaluate(node => getComputedStyle(node).marginTop)).toBe("14px");
    expect(await place(page)).toMatchObject({ where: "alto" });
    if (width === 390) {
      const more = page.getByRole("button", { name: "Leggi tutto" });
      await expect(more).toBeVisible();
      // 4 lines of 28.5 px.
      expect(Math.round((await box.boundingBox()).height)).toBe(114);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/homebrew-chiusa-390.png` });
      await more.click();
      await expect(more).toHaveCount(0);
      await expect(box).toHaveAttribute("data-lead-open", "true");
      expect((await box.boundingBox()).height).toBeGreaterThan(200);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/homebrew-aperta-390.png` });
      // Not saved: closed again on the next visit.
      await page.reload();
      await expect(page.getByRole("button", { name: "Leggi tutto" })).toBeVisible();
    } else {
      await expect(page.locator("[data-lead-more]")).toHaveCount(0);
      expect((await box.boundingBox()).height).toBeGreaterThan(114);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/homebrew-1280.png` });
    }
    await context.close();
  });

  test(`official sheets at ${width}: nothing at the top, the same sections; «Descrizione» still at the bottom`, async ({ browser }) => {
    // The SRD sheets have no «Descrizione» (as in production today): their sections stay the same, in the same order.
    const official = { ["/mostro/drago-nero-adulto"]: ["Caratteristiche", "Tratti", "Azioni", "Azioni leggendarie"], ["/mostro/drago-rosso-adulto-2014"]: ["Caratteristiche", "Tratti", "Azioni", "Azioni leggendarie"] };
    for (const edition of ["2024", "2014"]) {
      const context = await visitor(browser, width, edition);
      const page = await context.newPage();
      for (const [path, sections] of Object.entries(official)) {
        await page.goto(path);
        await expect(page.locator("[data-monster-strip]")).toBeVisible();
        await expect(page.locator("[data-monster-lead]")).toHaveCount(0);
        expect(await place(page), `${path} (${edition})`).toEqual({ where: "nessuna", sections });
      }
      // A sheet with a description, not of «Creati da voi»: at the bottom, with its title.
      await page.goto(`/mostro/${MADE}`);
      await expect(page.locator("[data-monster-lead]")).toHaveCount(0);
      expect(await place(page)).toMatchObject({ where: "fondo" });
      await expect(page.locator("[data-monster-section]").last()).toContainText("Una statua che si anima di notte.");
      await context.close();
    }
  });
}

test("«2014 e 2024»: one dark label «📖 2014 e 2024» whatever the chosen edition (PROMPT 28)", async ({ browser }) => {
  for (const edition of ["2014", "2024"]) {
    const context = await visitor(browser, 390, edition);
    const page = await context.newPage();
    await page.goto(`/mostro/${BOTH}`);
    const header = page.locator("article header").first();
    await expect(header.locator("[data-edition-pill]")).toHaveText("2014 e 2024");
    await expect(header.getByText("2014 e 2024", { exact: true })).toHaveCount(1);
    await context.close();
  }
});

test("form preview at 390 and 1280: the description at the top, as the sheet will be", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const width of [390, 1280]) {
    const context = await visitor(browser, width);
    const page = await context.newPage();
    // The field of the form comes with PROMPT 21: here the draft saved on the device brings the description.
    await page.addInitScript(([key, saved]) => { try { if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key, saved); sessionStorage.setItem("seeded", "1"); } } catch { /* no storage */ } },
      ["grimorio.proposta-bozza", JSON.stringify({ draft: draft("Guardiano di prova", "2024", LONG_TEXT), nickname: "", originale: false, autorizza: false, step: 1 })]);
    await page.goto("/bestiario/proponi");
    await expect(page.locator("#hb-nome")).toHaveValue("Guardiano di prova");
    await page.locator("[data-proposal-preview]").click();
    const preview = page.locator("[data-homebrew-preview]");
    await expect(preview.locator("[data-monster-lead]")).toContainText("Un guardiano di pietra nera");
    const order = await preview.evaluate(article => !!(article.querySelector("[data-monster-lead]").compareDocumentPosition(article.querySelector("[data-monster-strip]")) & Node.DOCUMENT_POSITION_FOLLOWING));
    expect(order).toBe(true);
    await expect(preview.locator("[data-monster-section] > h2", { hasText: "Descrizione" })).toHaveCount(0);
    await expect(preview.getByRole("button", { name: "Leggi tutto" })).toHaveCount(width === 390 ? 1 : 0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/anteprima-modulo-${width}.png` });
    await context.close();
  }
});
