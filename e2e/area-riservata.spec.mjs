import { test, expect } from "./fixtures.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// The reserved area of the approved design: Home («Da fare» only with something to do, four tiles), Contenuti, the one
// list of every content (switch, selection, filters and counters, groups), Notifiche, Sezioni, Registro, on a phone and
// on a computer; a visitor sees none of it. Test database only: the cards and the report added here are removed at the end.
const SHOTS = process.env.AREA_SHOTS;
const SEARCH = "Cerca qualsiasi scheda da modificare";
const CARDS = ["prova-area-alfa", "prova-area-beta"];

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder(SEARCH)).toBeVisible();
}

async function withDb(work) {
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try { return await work(db); } finally { await db.end(); }
}

/** Rows of the eye's table, none while it is not made yet (it comes with the first switch of the run). */
const visibilityRows = (sql, params) => withDb(db => db.query(sql, params)).then(result => result.rows, () => []);

/** The number in the label of a counter or a filter: «NO SRD 12», «SRD (310)». */
const numberIn = async locator => Number((await locator.innerText()).match(/(\d+)\)?\s*$/)[1]);
const resultCount = async page => Number(await page.locator("[data-result-count]").getAttribute("data-result-count"));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

test("a visitor sees nothing of the reserved area", async ({ page, request }) => {
  for (const path of ["/admin", "/admin/contenuti", "/admin/incantesimi", "/admin/mostri", "/admin/notifiche", "/admin/sezioni", "/admin/registro", "/admin/contenuti/armi"]) {
    await page.goto(path);
    await expect(page.getByLabel("Passcode"), path).toBeVisible();
    await expect(page.getByPlaceholder(SEARCH), path).toHaveCount(0);
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(/data-due-list|data-admin-list|data-card-switch|data-notice=|Da fare ·|Segna tutte lette|Cosa vedono gli utenti/);
  }
});

test("Home: Da fare shows a check only while it has something, tiles, search; phone and computer", async ({ page }) => {
  test.setTimeout(180_000);
  const id = randomUUID();
  await page.setViewportSize({ width: 390, height: 844 });
  // The Home reads the reports (and creates their table the first time); then one new report of the test.
  await login(page);
  await withDb(db => db.query("INSERT INTO grimorio_feedback_reports (id, tipo, messaggio, percorso) VALUES ($1, 'errore', 'Prova del Da fare: il raggio è sbagliato.', '/spell/palla-di-fuoco')", [id]));
  try {
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Area riservata" })).toBeVisible();
    const due = page.locator("[data-due-list]");
    await expect(due.locator('[data-due="segnalazioni"]')).toHaveText(/Leggi \d+ segnalazion[ei] nuov[ae]/);
    await expect(due.getByRole("heading")).toHaveText(new RegExp(`^Da fare · ${await due.locator("[data-due]").count()}$`));
    // Four tiles; the Statistiche tile counts the people of 7 days.
    const tiles = page.getByRole("navigation", { name: "Sezioni dell’area riservata" }).getByRole("link");
    await expect(tiles).toHaveCount(4);
    await expect(tiles.nth(1)).toContainText(/Statistiche\s*\d+ person[ae] · 7 giorni/);
    await expect(tiles.nth(2)).toContainText("Cosa vedono gli utenti");
    await expect(tiles.nth(3)).toContainText("Ultime modifiche");
    // The bell counts the unread notifications.
    await expect(page.locator("[data-admin-bell]")).toHaveAttribute("aria-label", /^Notifiche · \d+ non lett[ae]$/);
    // The search finds any card of the edition and opens its editor.
    await page.getByPlaceholder(SEARCH).fill("palla di fuo");
    await expect(page.locator("[data-admin-search-results] a").first()).toHaveAttribute("href", /^\/admin\/incantesimi\/palla-di-fuoco(\?|$)/);
    await page.getByPlaceholder(SEARCH).fill("");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-home-390.png`, fullPage: true });
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}`).toBeLessThanOrEqual(width);
    }

    // «Segna tutte lette» brings the check to 0: it disappears by itself.
    await page.goto("/admin/notifiche");
    await expect(page.locator(`[data-notice="s-${id}"]`)).toHaveAttribute("data-unread", "");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-notifiche-390.png`, fullPage: true });
    await page.getByRole("button", { name: "Segna tutte lette" }).click();
    await expect(page.locator(`[data-notice="s-${id}"]`)).not.toHaveAttribute("data-unread", "");
    await page.goto("/admin");
    await expect(page.locator('[data-due="segnalazioni"]')).toHaveCount(0);

    // Computer: the side menu with every place of the area.
    await page.setViewportSize({ width: 1280, height: 900 });
    const menu = page.locator("[data-admin-side-nav]");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link")).toContainText(["Area riservata", "Da fare", "Contenuti", "Statistiche", "Sezioni", "Registro", "Notifiche"]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-home-1280.png`, fullPage: true });
  } finally {
    await withDb(db => db.query("DELETE FROM grimorio_feedback_reports WHERE id = $1", [id]));
  }
});

test("Lists: the switch of a row, the selection of 2 cards, Provenienza and Da controllare counts, creatures by GS", async ({ page }) => {
  test.setTimeout(240_000);
  await withDb(async db => {
    for (const [index, card] of CARDS.entries()) {
      await db.query("INSERT INTO spells (id, nome_italiano, livello, tempo_di_lancio, durata, descrizione, sort_key) VALUES ($1, $2, '1° livello, Evocazione', '1 azione', 'Istantanea', 'Un lampo di prova.', $3)",
        [card, `Prova area ${index ? "beta" : "alfa"}`, `prova area ${card}`]);
      await db.query("INSERT INTO grimorio_content_editions (content_kind, content_id, edition) VALUES ('spell', $1, '2024')", [card]);
    }
  });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto("/admin/incantesimi");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Incantesimi");
    // Groups by level, with the shortcuts.
    await expect(page.locator("section[data-list-group]").first()).toHaveAttribute("data-list-group", "Trucchetti");
    await expect(page.getByRole("navigation", { name: "Vai al gruppo" }).getByRole("button").first()).toHaveText("Trucchetti");

    // Counters and filters: what a counter says is what it shows; SRD + NO SRD = all.
    const all = await resultCount(page);
    const nosrd = await numberIn(page.locator('[data-counter="nosrd"]'));
    await page.locator('[data-counter="nosrd"]').click();
    expect(await resultCount(page)).toBe(nosrd);
    await expect(page.getByRole("list", { name: "Filtri attivi" })).toContainText("NO SRD");
    await page.getByRole("button", { name: "Togli il filtro NO SRD" }).click();
    expect(await resultCount(page)).toBe(all);
    await page.getByRole("button", { name: /^Filtri/ }).click();
    const panel = page.getByRole("dialog", { name: "Filtri" });
    const srd = await numberIn(panel.getByRole("button", { name: /^SRD \(/ }));
    expect(srd + await numberIn(panel.getByRole("button", { name: /^NO SRD \(/ }))).toBe(all);
    expect(await numberIn(panel.getByRole("button", { name: /^Tutte \(/ }))).toBe(all);
    const modified = await numberIn(panel.getByRole("button", { name: /^SRD modificate \(/ }));
    const names = await numberIn(panel.getByRole("button", { name: /^Nomi da rivedere \(/ }));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-filtri-390.png` });
    await panel.getByRole("button", { name: /^Nomi da rivedere \(/ }).click();
    await expect(panel.getByRole("button", { name: /^Mostra \d+ risultat/ })).toHaveText(`Mostra ${names} ${names === 1 ? "risultato" : "risultati"}`);
    await panel.getByRole("button", { name: /^Mostra / }).click();
    expect(await resultCount(page)).toBe(names);
    await expect(page.locator('li[data-card-row] [data-warning="nome-da-rivedere"]')).toHaveCount(names);
    // The same numbers as the pages of the checks, for the spells of this edition.
    await page.goto("/admin/nomi-da-rivedere");
    await expect(page.locator('[data-review-name^="incantesimo:"]').filter({ hasText: "· 2024 ·" })).toHaveCount(names);
    await page.goto("/admin/srd-modificate");
    await expect(page.locator('[data-srd-modified^="incantesimo:"]').filter({ hasText: "· 2024" })).toHaveCount(modified);

    // The switch of a row hides the card and shows it again (the visitors' page answers 404, then 200).
    await page.goto("/admin/incantesimi");
    await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("prova area");
    const alfa = page.locator(`li[data-card-row="${CARDS[0]}"]`);
    const switchOf = row => row.getByRole("switch");
    await expect(switchOf(alfa)).toHaveAttribute("aria-checked", "true");
    await switchOf(alfa).click();
    await expect(switchOf(alfa)).toHaveAttribute("aria-checked", "false");
    await expect(alfa).toHaveAttribute("data-hidden", "");
    await expect.poll(async () => (await visibilityRows("SELECT nascosta FROM grimorio_card_visibility WHERE tipo = 'incantesimo' AND scheda = $1", [CARDS[0]]))[0]?.nascosta).toBe(true);
    await switchOf(alfa).click();
    await expect(switchOf(alfa)).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await visibilityRows("SELECT nascosta FROM grimorio_card_visibility WHERE tipo = 'incantesimo' AND scheda = $1", [CARDS[0]]))[0]?.nascosta).toBe(false);

    // Selection: 2 cards hidden at once, each one in the Registro.
    await page.getByRole("button", { name: "Seleziona" }).click();
    for (const card of CARDS) await page.locator(`li[data-card-row="${card}"]`).getByRole("checkbox").check();
    await expect(page.locator("[data-selection-bar]")).toContainText("2 selezionate");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-selezione-390.png` });
    await page.getByRole("button", { name: "Nascondi 2" }).click();
    for (const card of CARDS) await expect(page.locator(`li[data-card-row="${card}"]`)).toHaveAttribute("data-hidden", "");
    await expect.poll(async () => (await visibilityRows("SELECT count(*)::int AS n FROM grimorio_card_visibility WHERE tipo = 'incantesimo' AND scheda = ANY($1) AND nascosta", [CARDS]))[0]?.n).toBe(2);
    await page.goto("/admin/registro");
    await expect(page.locator("[data-log-entry]").filter({ hasText: "Hai nascosto «Prova area beta»" })).toHaveCount(1);
    await expect(page.locator("[data-log-entry]").filter({ hasText: "Hai nascosto «Prova area alfa»" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Oggi" })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-registro-390.png`, fullPage: true });
    // And shown again together.
    await page.goto("/admin/incantesimi");
    await page.getByRole("button", { name: "Seleziona" }).click();
    await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("prova area");
    await page.getByRole("button", { name: "Tutte", exact: true }).click();
    await page.getByRole("button", { name: "Mostra 2" }).click();
    await expect.poll(async () => (await visibilityRows("SELECT count(*)::int AS n FROM grimorio_card_visibility WHERE tipo = 'incantesimo' AND scheda = ANY($1) AND nascosta", [CARDS]))[0]?.n).toBe(0);
    await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-incantesimi-390.png` });

    // The menu of a row (long press on a phone): open on the site, delete for the cards added here.
    await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("prova area alfa");
    await page.locator(`li[data-card-row="${CARDS[0]}"]`).dispatchEvent("contextmenu");
    const menu = page.locator(`[data-row-menu="${CARDS[0]}"]`);
    await expect(menu.getByRole("link", { name: "Apri sul sito" })).toHaveAttribute("href", `/spell/${CARDS[0]}`);
    await expect(menu.getByRole("button", { name: "Elimina" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Creatures: groups by challenge rating, in numeric order; «+» asks «Scheda o Homebrew?».
    await page.goto("/admin/mostri");
    const groups = await page.locator("section[data-list-group]").evaluateAll(sections => sections.map(section => section.getAttribute("data-list-group")));
    expect(groups.length).toBeGreaterThan(5);
    expect(groups.every(label => /^GS (\d+|1\/[248])$|^GS da indicare$/.test(label)), groups.join(", ")).toBe(true);
    const value = label => (label.includes("/") ? 1 / Number(label.split("/")[1]) : Number(label.slice(3)));
    const values = groups.filter(label => label !== "GS da indicare").map(value);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-mostri-390.png` });
    await page.locator("[data-create-button]").click();
    await expect(page.getByRole("dialog", { name: "Nuova creatura" })).toContainText("Una scheda o un mostro originale della redazione?");
    await page.keyboard.press("Escape");

    // Computer: filters open on the left, the rows in a table with the menu ⋯.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/admin/incantesimi");
    await expect(page.getByRole("complementary", { name: "Filtri" })).toBeVisible();
    await expect(page.locator("table tr[data-card-row]").first()).toBeVisible();
    await expect(page.locator("table thead")).toContainText(/Liv\.\s*Nome\s*Scuola\s*Provenienza e avvisi\s*Visibilità/);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-incantesimi-1280.png` });
    await page.goto("/admin/mostri");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-mostri-1280.png` });
  } finally {
    await withDb(async db => {
      const { rows: [tables] } = await db.query("SELECT to_regclass('grimorio_card_visibility') IS NOT NULL AS ok");
      if (tables.ok) {
        await db.query("DELETE FROM grimorio_card_visibility WHERE scheda = ANY($1)", [CARDS]);
        await db.query("DELETE FROM grimorio_card_visibility_log WHERE scheda = ANY($1)", [CARDS]);
      }
      await db.query("DELETE FROM grimorio_content_editions WHERE content_id = ANY($1)", [CARDS]);
      await db.query("DELETE FROM spells WHERE id = ANY($1)", [CARDS]);
    });
  }
});

test("Contenuti, a content list, Sezioni: phone and computer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin/contenuti");
  for (const group of ["Schede", "Equipaggiamento", "Regole"]) await expect(page.getByRole("heading", { level: 2, name: group })).toBeVisible();
  // The note, or the count of the parts closed to the visitors («Mostri del Grimorio» starts «In arrivo», PROMPT 25).
  await expect(page.locator('[data-content-row="mostri"]')).toContainText(/con le Creature originali|parte in arrivo|parti in arrivo|parte nascosta|parti nascoste/);
  await page.locator('[data-content-row="armi"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Armi");
  await expect(page.locator("section[data-list-group]").first()).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
  await page.goto("/admin/sezioni");
  await expect(page.getByText("Cosa vedono gli utenti")).toBeVisible();
  await expect(page.getByText("Le singole schede si nascondono dall’interruttore nella loro lista.")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Stato di Incantesimi", exact: true }).getByRole("radio", { name: "Visibile" })).toHaveAttribute("aria-checked", "true");
  await page.locator('button[aria-controls="parti-classi"]').click();
  await expect(page.locator("#parti-classi [data-advanced]")).toContainText("Avanzate: scelta diversa per 2014 e 2024");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-sezioni-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-sezioni-1280.png` });
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/admin/contenuti");
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `contenuti ${width}`).toBeLessThanOrEqual(width);
  }
});
