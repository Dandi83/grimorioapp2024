import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 39: «Modalità solo SRD», the emergency switch at the bottom of /admin. Administrator at 390 and 1280: the
// card is the last one, with its counts; «Attiva» asks, «Annulla» changes nothing, «Conferma» switches it on; the
// band on the reserved pages; «Disattiva» → «Conferma» gives everything back, a card hidden one by one stays hidden.
// Visitor in 2024 and 2014 with the mode on: an original summary answers «non trovata» and leaves the lists, the
// search, the catalogs; the SRD cards, the creatures of the redazione and of the community stay. Registro. Local test
// database only.
const REDAZIONE = "homebrew-prova-solo-srd-redazione";
const COMMUNITY = "homebrew-prova-solo-srd-community";
const SUMMARY = { "2024": "scossa-sinaptica", "2014": "manto-del-crociato-2014" };
const SUMMARY_NAME = { "2024": "Scossa sinaptica", "2014": "Manto del crociato" };
const SRD = { "2024": "palla-di-fuoco", "2014": "palla-di-fuoco-2014" };
const draft = nome => ({
  edizione: "2024", nome, taglia: "Media", tipo: "Non morto", allineamento: "neutrale malvagio", ca: 13, ca_nota: "", pf: 22, dadi_vita: "5d8",
  velocita: "9 m", forza: 12, destrezza: 14, costituzione: 10, intelligenza: 8, saggezza: 10, carisma: 6, ts_competenti: [], abilita: "", vulnerabilita: "",
  resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "—", habitat: [], grado_sfida: "1",
  tratti: [], azioni: [{ nome: "Artiglio", testo: "Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 5 (1d6 + 2) danni taglienti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}
const englishNames = async request => ((await (await request.get("/ricerca-indice.json")).json()).en ?? []).map(([name]) => name);
const modeRow = () => database(client => client.query("SELECT attiva, cardinality(schede) AS n FROM grimorio_srd_only WHERE id = 1").then(r => r.rows[0] ?? null, () => null));

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

async function visitor(browser, edition, width = 390) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 844 } });
  await context.addInitScript(value => {
    try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  }, edition);
  return context;
}

/** «Attiva» / «Disattiva», then «Conferma»; the card says the new state. */
async function switchMode(page, on) {
  await page.goto("/admin");
  const card = page.locator("#solo-srd");
  await card.getByRole("button", { name: on ? "Attiva modalità solo SRD" : "Disattiva modalità solo SRD" }).click();
  await card.getByRole("button", { name: "Conferma" }).click();
  await expect(card).toHaveAttribute("data-srd-only", on ? "accesa" : "spenta");
}

/** The eye of one card in /admin/incantesimi: hidden (false) or shown (true). */
async function eye(page, id, name, visible) {
  await page.goto("/admin/incantesimi");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await page.getByPlaceholder("Cerca per nome o scuola…").fill(name.toLowerCase());
  const row = page.locator(`[data-card-row="${id}"]`).filter({ visible: true }).first();
  const toggle = row.getByRole("switch", { name: `Visibile sul sito: ${name}` });
  if ((await toggle.getAttribute("aria-checked")) !== String(visible)) await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", String(visible));
}

/** What a visitor sees of the summary of the edition and of the cards the mode never touches. */
async function publicView(browser, edition) {
  const context = await visitor(browser, edition);
  const page = await context.newPage();
  const id = SUMMARY[edition];
  const status = async path => (await context.request.get(path)).status();
  const index = await (await context.request.get("/ricerca-indice.json")).text();
  const catalog = await (await context.request.get("/api/catalogo/incantesimi")).json();
  await page.goto("/grimorio");
  await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).filter({ visible: true }).first().fill(SUMMARY_NAME[edition].toLowerCase());
  await page.waitForTimeout(400);
  const inList = await page.locator(`a[href="/spell/${id}"]`).count();
  await page.goto(`/?cerca=${encodeURIComponent(SUMMARY_NAME[edition].toLowerCase())}`);
  const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog.getByRole("status")).toHaveText(/risultat/);
  const inSearch = await dialog.locator(`a[href="/spell/${id}"]`).count();
  const view = {
    card: await status(`/spell/${id}`), inList, inSearch, inIndex: index.includes(`/spell/${id}"`), inCatalog: catalog.spells.some(spell => spell.id === id),
    srd: await status(`/spell/${SRD[edition]}`), redazione: await status(`/mostro/${REDAZIONE}`), community: await status(`/mostro/${COMMUNITY}`),
  };
  await context.close();
  return view;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await database(async client => {
    await client.query("DELETE FROM grimorio_srd_only").catch(() => {});
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, '2024', NULL, NULL) ON CONFLICT (id) DO NOTHING", [REDAZIONE, JSON.stringify(draft("Cineraio di prova"))]);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, '2024', 'Lia', 'CC BY-NC-SA 4.0') ON CONFLICT (id) DO NOTHING", [COMMUNITY, JSON.stringify(draft("Spettro della community"))]);
  });
});

test.afterAll(async ({ browser }) => {
  // The creatures of the test leave before the last switch, which makes the cached lists again.
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[REDAZIONE, COMMUNITY]]).catch(() => {}));
  const { context, page } = await admin(browser, 1280);
  await eye(page, "manto-del-crociato", "Manto del crociato", true);
  if ((await modeRow())?.attiva) await switchMode(page, false);
  await switchMode(page, true);
  await switchMode(page, false);
  await context.close();
});

// The creatures of the redazione follow their part of the Bestiario («In arrivo» by default in the test database):
// whatever it answers with the mode off, it answers the same with the mode on.
let redazione;
test("visitor with the mode off: everything as before", async ({ browser }) => {
  for (const edition of ["2024", "2014"]) {
    const view = await publicView(browser, edition);
    redazione ??= view.redazione;
    expect(view, edition).toEqual({ card: 200, inList: 1, inSearch: 1, inIndex: true, inCatalog: true, srd: 200, redazione, community: 200 });
  }
});

for (const width of [390, 1280]) {
  test(`admin at ${width}: the last card with its counts; Attiva → Annulla changes nothing; Conferma; the band; Disattiva → Conferma`, async ({ browser }) => {
    test.setTimeout(240_000);
    const { context, page } = await admin(browser, width);
    await page.goto("/admin");
    const card = page.locator("#solo-srd");
    await expect(card).toHaveAttribute("data-srd-only", "spenta");
    await expect(card.getByRole("heading", { name: "Modalità solo SRD" })).toBeVisible();
    await expect(card).toContainText("Nasconde subito a tutti i visitatori ciò che non viene dall’SRD. Tutto resta salvato: si riaccende con un tocco.");
    // The last card of the page: after every other tile, the Bilanciamento too.
    expect(await page.evaluate(() => {
      const cards = [...document.querySelectorAll("main nav a, main > a, main > section")];
      return cards.at(-1)?.id;
    })).toBe("solo-srd");
    const total = Number((await card.locator("[data-srd-only-total]").innerText()).replace(/\D/g, ""));
    expect(total).toBeGreaterThan(40);
    const counts = (await card.locator("[data-srd-only-counts] li").allInnerTexts()).join("\n");
    expect(counts).toMatch(/Sintesi originali\s+\d+ incantesim[oi] · \d+ mostr[oi]/);
    if (process.env.SOLO_SRD_SHOTS) await card.screenshot({ path: `${process.env.SOLO_SRD_SHOTS}/solo-srd-spenta-${width}.png` });

    // «Attiva»: the question in the card; «Annulla»: nothing changes.
    await card.getByRole("button", { name: "Attiva modalità solo SRD" }).click();
    await expect(card.locator("[data-srd-only-confirm]")).toContainText(`Nascondere ${total} contenuti a tutti? Spariscono da liste, ricerca, preferiti e copie offline.`);
    if (process.env.SOLO_SRD_SHOTS) await card.screenshot({ path: `${process.env.SOLO_SRD_SHOTS}/solo-srd-conferma-${width}.png` });
    await card.getByRole("button", { name: "Annulla" }).click();
    await expect(card.locator("[data-srd-only-confirm]")).toHaveCount(0);
    await expect(card).toHaveAttribute("data-srd-only", "spenta");
    expect((await modeRow())?.attiva ?? false).toBe(false);

    // «Conferma»: on, with the band on the pages of the reserved area.
    await switchMode(page, true);
    expect(await modeRow()).toEqual({ attiva: true, n: total });
    for (const path of ["/admin", "/admin/registro", "/admin/contenuti"]) {
      await page.goto(path);
      await expect(page.locator("[data-srd-only-band]"), path).toHaveText(new RegExp(`^Modalità solo SRD attiva dalle \\d{2}:\\d{2} · ${total} contenuti nascosti · Disattiva$`));
    }
    if (process.env.SOLO_SRD_SHOTS) await page.screenshot({ path: `${process.env.SOLO_SRD_SHOTS}/solo-srd-fascia-${width}.png` });
    await page.locator("[data-srd-only-band]").getByRole("link", { name: "Disattiva" }).click();
    await expect(page).toHaveURL(/\/admin#solo-srd$/);
    // The administrator still sees the card, with «Nascosta» in the list.
    expect((await context.request.get(`/spell/${SUMMARY["2024"]}`)).status()).toBe(200);
    // The visitors never see the band.
    const guest = await visitor(browser, "2024");
    const guestPage = await guest.newPage();
    await guestPage.goto("/");
    await expect(guestPage.locator("[data-srd-only-band]")).toHaveCount(0);
    expect(await guestPage.content()).not.toContain("Modalità solo SRD");
    await guest.close();

    // The Registro.
    await page.goto("/admin/registro?sezione=sezioni");
    await expect(page.getByRole("list", { name: "Modifiche" }).locator("[data-log-entry]").first()).toContainText(`Hai attivato la modalità solo SRD (${total} contenuti nascosti)`);

    // «Disattiva» → «Conferma».
    await switchMode(page, false);
    await page.goto("/admin/registro");
    await expect(page.locator("[data-srd-only-band]")).toHaveCount(0);
    await page.goto("/admin/registro?sezione=sezioni");
    await expect(page.getByRole("list", { name: "Modifiche" }).locator("[data-log-entry]").first()).toContainText(`Hai disattivato la modalità solo SRD (${total} contenuti di nuovo visibili)`);
    await context.close();
  });
}

test("visitor with the mode on, in 2024 and 2014: the summaries gone everywhere, SRD and creatures of the redazione and community kept; off: back, the card hidden by hand stays hidden", async ({ browser }) => {
  test.setTimeout(240_000);
  const { context, page } = await admin(browser, 1280);
  // Manto del crociato 2024 hidden by hand before; Synaptic Static approved (PROMPT 37/38), in the search.
  await eye(page, "manto-del-crociato", "Manto del crociato", false);
  await page.goto("/admin/contenuti/nomi-inglesi");
  await page.locator('[data-search-english="incantesimo:scossa-sinaptica"]').getByRole("button", { name: "Approva", exact: true }).click();
  await expect(page.locator('[data-search-english-approved] [data-search-english="incantesimo:scossa-sinaptica"]')).toBeVisible();
  expect(await englishNames(context.request)).toContain("Synaptic Static");
  await page.goto("/admin");
  await expect(page.locator("#solo-srd [data-srd-only-counts]")).toContainText(/Nomi inglesi approvati \(escono dalla ricerca\)\s*[1-9]/);
  await switchMode(page, true);
  expect(await englishNames(context.request)).not.toContain("Synaptic Static");
  // The creatures of the redazione and of the community are never in the list of the mode.
  const hidden = await database(client => client.query("SELECT schede FROM grimorio_srd_only WHERE id = 1").then(r => r.rows[0].schede));
  expect(hidden).toContain(`/spell/${SUMMARY["2024"]}`);
  expect(hidden.filter(path => path.includes("homebrew"))).toEqual([]);
  expect(hidden).not.toContain(`/spell/${SRD["2024"]}`);
  for (const edition of ["2024", "2014"]) {
    expect(await publicView(browser, edition), edition).toEqual({ card: 404, inList: 0, inSearch: 0, inIndex: false, inCatalog: false, srd: 200, redazione, community: 200 });
  }
  // The page «non trovata» of the hidden cards.
  const guest = await visitor(browser, "2024");
  const guestPage = await guest.newPage();
  await guestPage.goto(`/spell/${SUMMARY["2024"]}`);
  await expect(guestPage.getByRole("heading", { level: 1 }).first()).toContainText(/non trovat/i);
  if (process.env.SOLO_SRD_SHOTS) await guestPage.screenshot({ path: `${process.env.SOLO_SRD_SHOTS}/solo-srd-visitatore-404.png` });
  await guest.close();

  // Off: everything back; Manto del crociato 2024, hidden by hand, stays hidden.
  await switchMode(page, false);
  for (const edition of ["2024", "2014"]) {
    expect(await publicView(browser, edition), edition).toEqual({ card: 200, inList: 1, inSearch: 1, inIndex: true, inCatalog: true, srd: 200, redazione, community: 200 });
  }
  expect(await englishNames(context.request)).toContain("Synaptic Static");
  await page.goto("/admin/contenuti/nomi-inglesi");
  await page.locator('[data-search-english-approved] [data-search-english="incantesimo:scossa-sinaptica"]').getByRole("button", { name: "Scarta" }).click();
  await expect(page.locator('[data-search-english="incantesimo:scossa-sinaptica"]')).toHaveCount(0);
  await database(client => client.query("DELETE FROM grimorio_search_english WHERE card_id = 'scossa-sinaptica'"));
  const check = await visitor(browser, "2024");
  expect((await check.request.get("/spell/manto-del-crociato")).status()).toBe(404);
  await check.close();
  await eye(page, "manto-del-crociato", "Manto del crociato", true);
  await context.close();
});
