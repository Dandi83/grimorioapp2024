import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { COMMUNITY_TITLE, GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// «Creature originali» (PROMPT 25): the block above the list of the Bestiario, its three pages, the two parts of
// /admin/sezioni in every combination, the new pills, the editorial note, «indietro». Local test database only.
const SHOTS = process.env.ORIGINALI_SHOTS;
const ONLY_2014 = "homebrew-prova-originali-lupo"; // community, 2014
const BOTH = "homebrew-prova-originali-falena"; // community, «2014 e 2024»
const OURS = "homebrew-sentinella-di-brace"; // the editorial staff, 2024, made from the reserved area
const OURS_NAME = "Sentinella di brace";
const NOTE = "Creatura originale della redazione del Grimorio, non ufficiale. Non fa parte dell’SRD e non è materiale Wizards of the Coast.";
const draft = (nome, edizione) => ({
  edizione, nome, taglia: "Media", tipo: "Bestia", allineamento: "neutrale", ca: 13, ca_nota: "", pf: 22, dadi_vita: "4d8 + 4",
  velocita: "12 m", forza: 14, destrezza: 15, costituzione: 12, intelligenza: 3, saggezza: 12, carisma: 6, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: "1",
  tratti: [], azioni: [{ nome: "Morso", testo: "Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 7 (2d4 + 2) danni perforanti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
});
const STATES = ["Visibile", "In arrivo", "Nascosta"];

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
  await context.addInitScript(() => { try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
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

const noSideScroll = async (page, width) => expect(await page.evaluate(() => document.documentElement.scrollWidth), page.url()).toBeLessThanOrEqual(width);

test.describe.configure({ mode: "serial" });

// Two creatures of the community written in the database, ours saved from the reserved area: its save refreshes the
// cached lists with all three. «Mostri del Grimorio» shown for the tests that need it.
test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    const insert = "INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, $3, 'Lia', 'CC BY-NC-SA 4.0') ON CONFLICT (id) DO NOTHING";
    await client.query(insert, [ONLY_2014, JSON.stringify(draft("Lupo di cenere", "2014")), "2014"]);
    await client.query(insert, [BOTH, JSON.stringify(draft("Falena d’ambra", "entrambe")), "entrambe"]);
  });
  const { context, admin } = await signIn(browser);
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await expect(admin.getByTestId("admin-edition-band")).toHaveText("2024");
  await admin.getByRole("button", { name: "Nuovo", exact: true }).click();
  await admin.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Nuovo mostro della redazione", exact: true }).click();
  const editor = admin.getByRole("dialog");
  await editor.locator("#admin-hb-nome").fill(OURS_NAME);
  await editor.locator("#admin-hb-azioni-0-nome").fill("Artiglio");
  await editor.locator("#admin-hb-azioni-0-testo").fill("Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 6 (1d8 + 2) danni da fuoco.");
  await editor.getByRole("button", { name: "Salva" }).click();
  await expect(editor).toHaveCount(0);
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.filter(monster => monster.homebrew).length).toBe(3);
  await context.close();
});

// Clean up: both parts back to their first states («Mostri del Grimorio» in arrivo, the community visible), the rows of
// the community from the database, ours with the bin (the lists refreshed: e2e/homebrew.spec.mjs starts with none).
test.afterAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[ONLY_2014, BOTH]]));
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "In arrivo");
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill(OURS_NAME.toLowerCase());
  admin.once("dialog", dialog => dialog.accept());
  await admin.locator("main ul li[data-card-row]").filter({ hasText: OURS_NAME }).dispatchEvent("contextmenu");
  await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
});

test("first state: «Mostri del Grimorio» in arrivo, the community visible; ours nowhere for the visitors", async ({ browser, request }) => {
  const context = await visitor(browser, 390, "2024");
  const page = await context.newPage();
  await page.goto("/bestiario");
  const block = page.locator("[data-originals-block]").filter({ visible: true });
  await expect(block.locator("[data-originals-row]")).toBeVisible();
  await expect(block.locator("[data-originals-all]")).toHaveAttribute("data-originals-all", "1");
  await expect(block.locator("[data-originals-tile=grimorio]")).toHaveAttribute("data-tile-state", "in-arrivo");
  await expect(block.locator("[data-originals-tile=grimorio] [data-soon-tag]")).toHaveText("In arrivo");
  await expect(block.locator("[data-originals-tile=grimorio] [data-originals-count]")).toHaveCount(0);
  await expect(block.locator("[data-originals-link=grimorio]")).toHaveAttribute("href", "/in-arrivo/bestiario%3Agrimorio");
  await expect(page.locator(`a[href="/mostro/${OURS}"]`)).toHaveCount(0);
  expect((await request.get(`/mostro/${OURS}`)).status()).toBe(404);
  expect(await (await request.get("/api/catalogo/bestiario")).text()).not.toContain(OURS);
  await block.locator("[data-originals-link=grimorio]").click();
  await expect(page).toHaveURL(/\/in-arrivo\/bestiario%3Agrimorio$/);
  await page.goto("/bestiario/del-grimorio");
  await expect(page).toHaveURL(/\/in-arrivo\/bestiario%3Agrimorio$/);
  await context.close();
});

test("the old «Dal Grimorio» addresses lead to «Mostri del Grimorio»", async ({ request }) => {
  for (const query of ["chi=grimorio", "filtro=grimorio", "categoria=redazione"]) {
    const response = await request.get(`/bestiario/creati-da-voi?${query}`, { maxRedirects: 0 });
    expect(response.status(), query).toBe(308);
    expect(response.headers().location, query).toMatch(/\/bestiario\/del-grimorio(\?|$)/);
  }
});

test("both parts visible: block, counts per edition, the three pages, pills, note, «indietro»", async ({ browser }) => {
  test.setTimeout(300_000);
  const { context: adminContext, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  await adminContext.close();

  // «2014 e 2024» counted in both editions; ours is 2024 only.
  const counts = { 2024: { grimorio: 1, community: 1 }, 2014: { grimorio: 0, community: 2 } };
  for (const width of [390, 1280]) {
    for (const edition of ["2024", "2014"]) {
      const context = await visitor(browser, width, edition);
      const page = await context.newPage();
      const label = `${width} ${edition}`;
      await page.goto("/bestiario");
      const block = width < 1024
        ? page.locator("[data-originals-block]:not([data-compact])")
        : page.getByRole("complementary", { name: "Elenco del bestiario" }).locator("[data-originals-block][data-compact]");
      const { grimorio, community } = counts[edition];
      await expect(block.locator("[data-originals-all]"), label).toHaveAttribute("data-originals-all", String(grimorio + community));
      await expect(block.locator("[data-originals-all]")).toHaveText(`Vedi tutte · ${grimorio + community} ›`);
      await expect(block.locator("[data-originals-tile=grimorio] [data-originals-count]")).toHaveText(`${grimorio === 1 ? "1 creatura" : `${grimorio} creature`} ›`);
      await expect(block.locator("[data-originals-tile=community] [data-originals-count]")).toHaveText(`${community === 1 ? "1 creatura" : `${community} creature`} ›`);
      await expect(block.locator("[data-originals-tile=grimorio]")).toContainText("Dalla redazione");
      await expect(block.locator("[data-originals-tile=grimorio]")).toContainText("Mostri del Grimorio");
      await expect(block.locator("[data-originals-tile=community]")).toContainText("Dalla community");
      await expect(block.locator("[data-originals-tile=community]")).toContainText("Creati da voi");
      await expect(block.locator("[data-originals-tile=community] [data-community-propose]")).toHaveText("Proponi il tuo");
      await noSideScroll(page, width);

      // The normal list: ours with its pill (2024), never the community.
      const list = width < 1024 ? page.locator("main") : page.getByRole("complementary", { name: "Elenco del bestiario" });
      await list.getByRole("searchbox").first().fill(edition === "2024" ? "sentinella" : "lupo di cenere");
      if (edition === "2024") {
        const row = list.locator("li.catalog-row").filter({ has: page.locator(`a[href="/mostro/${OURS}"]`) });
        await expect(row, label).toHaveCount(1);
        await expect(row.locator("[data-homebrew-pill=grimorio]")).toHaveText("Dalla redazione");
      } else {
        await expect(list.locator(`a[href="/mostro/${ONLY_2014}"]`), label).toHaveCount(0);
      }
      await list.getByRole("searchbox").first().fill("");

      // «Vedi tutte»: one alphabetical list, the chips.
      await block.locator("[data-originals-all]").click();
      await expect(page).toHaveURL(/\/bestiario\/creature-originali$/);
      // The page itself, not the list column of the computer.
      const main = page.locator("main");
      await expect(page.getByRole("heading", { level: 1, name: /Creature originali/ })).toBeVisible();
      await expect(page.locator("[data-community-chip]").filter({ visible: true })).toHaveText([`Tutte · ${grimorio + community}`, `Dalla redazione · ${grimorio}`, `Dalla community · ${community}`]);
      const names = await main.locator("li.catalog-row:not(aside li) a[href^='/mostro/homebrew-']").filter({ visible: true }).evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute("href")))]);
      expect(names, label).toEqual(edition === "2024" ? [`/mostro/${BOTH}`, `/mostro/${OURS}`] : [`/mostro/${BOTH}`, `/mostro/${ONLY_2014}`]);
      await page.locator('[data-community-chip="community"]').filter({ visible: true }).click();
      await expect(main.locator(`li.catalog-row:not(aside li) a[href="/mostro/${OURS}"]`).filter({ visible: true })).toHaveCount(0);
      await page.locator('[data-community-chip="tutti"]').filter({ visible: true }).click();
      // «Proponi il tuo» at the end of the page.
      const propose = page.locator("main [data-community-propose]:not(aside *)").filter({ visible: true }).last();
      await expect(propose).toHaveText("Proponi il tuo");
      const lastRow = await main.locator("li.catalog-row:not(aside li)").filter({ visible: true }).last().boundingBox();
      expect((await propose.boundingBox()).y).toBeGreaterThan(lastRow.y);
      await noSideScroll(page, width);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/originali-${width}-${edition}.png`, fullPage: width < 1024 });

      // «Creati da voi»: the community only; «Mostri del Grimorio»: ours only, with the method and no «Proponi».
      await page.goto("/bestiario/creati-da-voi");
      await expect(page.locator(`main a:not(aside a)[href="/mostro/${OURS}"]`).filter({ visible: true })).toHaveCount(0);
      await expect(page.locator(`main a:not(aside a)[href="/mostro/${BOTH}"]`).filter({ visible: true }).first()).toBeVisible();
      await noSideScroll(page, width);
      await page.goto("/bestiario/del-grimorio");
      const header = page.locator("[data-grimorio-header]").filter({ visible: true });
      await expect(header.getByRole("heading", { level: 1 })).toHaveText("Mostri del Grimorio");
      await expect(header.locator("[data-method-link=grimorio]")).toHaveAttribute("href", "/bestiario/creati-da-voi/bilanciamento");
      await expect(page.locator("main [data-community-propose]:not(aside *)").filter({ visible: true })).toHaveCount(0);
      await expect(page.locator(`main a:not(aside a)[href="/mostro/${BOTH}"]`).filter({ visible: true })).toHaveCount(0);
      await expect(page.locator(`main a:not(aside a)[href="/mostro/${OURS}"]`).filter({ visible: true })).toHaveCount(edition === "2024" ? 1 : 0);
      await noSideScroll(page, width);
      if (SHOTS && edition === "2024") await page.screenshot({ path: `${SHOTS}/del-grimorio-${width}.png` });

      // The sheets: pill, note, «indietro» to the section they came from.
      if (edition === "2024") {
        await page.locator(`main a:not(aside a)[href="/mostro/${OURS}"]`).filter({ visible: true }).first().click();
        await expect(page).toHaveURL(new RegExp(`/mostro/${OURS}$`));
        await expect(page.locator("[data-homebrew-pill=grimorio]").filter({ visible: true }).first()).toHaveText("Dalla redazione");
        await expect(page.locator("[data-original-note=redazione]")).toContainText(NOTE);
        await page.getByRole("button", { name: "Torna indietro" }).filter({ visible: true }).first().click();
        await expect(page).toHaveURL(/\/bestiario\/del-grimorio$/);
        // Opened directly: «indietro» to its section.
        const direct = await context.newPage();
        await direct.goto(`/mostro/${OURS}`);
        await expect(direct.getByRole("button", { name: "Torna indietro" }).filter({ visible: true }).first()).toContainText("Mostri del Grimorio");
        await direct.getByRole("button", { name: "Torna indietro" }).filter({ visible: true }).first().click();
        await expect(direct).toHaveURL(/\/bestiario\/del-grimorio$/);
        await direct.close();
      }
      const sheet = await context.newPage();
      await sheet.goto(`/mostro/${BOTH}`);
      await expect(sheet.locator("[data-homebrew-pill=community]").filter({ visible: true }).first()).toHaveText("Dalla community");
      await expect(sheet.locator("[data-original-note=redazione]")).toHaveCount(0);
      await expect(sheet.getByRole("button", { name: "Torna indietro" }).filter({ visible: true }).first()).toContainText("I mostri creati da voi");
      await sheet.getByRole("button", { name: "Torna indietro" }).filter({ visible: true }).first().click();
      await expect(sheet).toHaveURL(/\/bestiario\/creati-da-voi$/);
      await context.close();
    }
  }
});

test("every combination of the two parts, visitor (390, 2024) and administrator (1280)", async ({ browser, request }) => {
  test.setTimeout(600_000);
  const { context: adminContext, admin } = await signIn(browser);
  const guest = await visitor(browser, 390, "2024");
  const page = await guest.newPage();
  const tiles = { grimorio: GRIMORIO_TITLE, community: COMMUNITY_TITLE };
  for (const grimorio of STATES) {
    for (const community of STATES) {
      const label = `redazione ${grimorio}, community ${community}`;
      await setBestiaryPart(admin, GRIMORIO_TITLE, grimorio);
      await setBestiaryPart(admin, COMMUNITY_TITLE, community);
      const states = { grimorio, community };

      // The visitor.
      await page.goto("/bestiario");
      await expect(page.getByRole("searchbox", { name: "Cerca una creatura" })).toBeVisible();
      const block = page.locator("[data-originals-block]").filter({ visible: true });
      const shown = grimorio === "Visibile" || community === "Visibile";
      await expect(block.locator("[data-originals-row]"), label).toHaveCount(shown ? 1 : 0);
      if (grimorio === "Nascosta" && community === "Nascosta") await expect(block, label).toHaveCount(0);
      for (const group of ["grimorio", "community"]) {
        const tile = block.locator(`[data-originals-tile=${group}]`);
        if (states[group] === "Nascosta") { await expect(tile, `${label}: ${group}`).toHaveCount(0); continue; }
        await expect(tile, `${label}: ${group}`).toHaveAttribute("data-tile-state", states[group] === "Visibile" ? "visibile" : "in-arrivo");
        await expect(tile.locator("[data-originals-count]")).toHaveCount(states[group] === "Visibile" ? 1 : 0);
        await expect(tile.locator("[data-soon-tag]")).toHaveCount(states[group] === "In arrivo" ? 1 : 0);
        await expect(tile.locator("[data-originals-link]")).toHaveAttribute("href", states[group] === "Visibile"
          ? (group === "grimorio" ? "/bestiario/del-grimorio" : "/bestiario/creati-da-voi")
          : `/in-arrivo/bestiario%3A${group === "grimorio" ? "grimorio" : "homebrew"}`);
        // The community keeps «Proponi il tuo» while «In arrivo».
        if (group === "community") await expect(tile.locator("[data-community-propose]")).toHaveCount(1);
      }
      await noSideScroll(page, 390);
      // Its pages and API.
      const status = path => request.get(path, { maxRedirects: 0 }).then(response => response.status());
      expect(await status("/bestiario/del-grimorio"), label).toBe(grimorio === "Visibile" ? 200 : grimorio === "In arrivo" ? 307 : 404);
      expect(await status("/bestiario/creati-da-voi"), label).toBe(community === "Visibile" ? 200 : community === "In arrivo" ? 307 : 404);
      expect(await status("/bestiario/creature-originali"), label).toBe(shown ? 200 : 404);
      expect(await status("/bestiario/proponi"), label).toBe(community === "Nascosta" ? 404 : 200);
      expect(await status(`/mostro/${OURS}`), label).toBe(grimorio === "Visibile" ? 200 : 404);
      if (SHOTS && community === "Visibile") await page.screenshot({ path: `${SHOTS}/blocco-390-redazione-${grimorio.replace(" ", "-")}.png` });

      // The administrator sees both tiles, labelled.
      await admin.goto("/bestiario");
      const adminBlock = admin.getByRole("complementary", { name: "Elenco del bestiario" }).locator("[data-originals-block][data-compact]");
      for (const group of ["grimorio", "community"]) {
        const tile = adminBlock.locator(`[data-originals-tile=${group}]`);
        await expect(tile, `admin, ${label}: ${tiles[group]}`).toHaveCount(1);
        if (states[group] === "Nascosta") await expect(tile).toContainText("Nascosta");
        if (states[group] === "In arrivo") await expect(tile.locator("[data-soon-tag]")).toHaveCount(1);
      }
      await noSideScroll(admin, 1280);
    }
  }
  await guest.close();
  await adminContext.close();
});

test("the community empty: «Nessuna creatura ancora: proponi la prima!», the tile still open with 0", async ({ browser }) => {
  const { context: adminContext, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  await adminContext.close();
  // No creature of the community in 2024 once BOTH is gone: written in the database, the list refreshed by a save of ours.
  await database(client => client.query("UPDATE grimorio_homebrew SET edizione = '2014', scheda = jsonb_set(scheda, '{edizione}', '\"2014\"') WHERE id = $1", [BOTH]));
  const { context: refresh, admin: again } = await signIn(browser);
  await again.goto(`/mostro/${OURS}`);
  await again.locator("[data-admin-edit]").filter({ visible: true }).first().click();
  await again.getByRole("dialog").getByRole("button", { name: "Salva" }).click();
  await expect(again.getByRole("dialog")).toHaveCount(0);
  await refresh.close();
  for (const width of [390, 1280]) {
    const context = await visitor(browser, width, "2024");
    const page = await context.newPage();
    await expect.poll(async () => {
      await page.goto("/bestiario");
      return page.locator("[data-originals-block]").filter({ visible: true }).locator("[data-originals-tile=community] [data-originals-count]").getAttribute("data-originals-count");
    }).toBe("0");
    await page.locator("[data-originals-block]").filter({ visible: true }).locator("[data-originals-link=community]").click();
    await expect(page).toHaveURL(/\/bestiario\/creati-da-voi$/);
    const empty = page.locator("[data-community-empty]").filter({ visible: true });
    await expect(empty).toContainText("Nessuna creatura ancora: proponi la prima!");
    await expect(empty.locator("[data-community-propose]")).toHaveAttribute("href", "/bestiario/proponi");
    await noSideScroll(page, width);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/vuota-${width}.png` });
    await context.close();
  }
  await database(client => client.query("UPDATE grimorio_homebrew SET edizione = 'entrambe', scheda = jsonb_set(scheda, '{edizione}', '\"entrambe\"') WHERE id = $1", [BOTH]));
});
