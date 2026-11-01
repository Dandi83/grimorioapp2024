import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures.mjs";
import { chooseEdition } from "./edition-pill.mjs";

// PROMPT 8: the four summaries added on 28/10/2026, «Sfera elastica» / «Sfera congelante» without the proper name,
// spell addresses without proper names (the old ones answer 308) and favorites saved with the old ids.
// Local test database only (e2e/test-db.mjs): nothing is written to the shared database.
const publicIds = JSON.parse(readFileSync("lib/data/public-spell-ids.json", "utf8")).ids;
const merged = JSON.parse(readFileSync("lib/data/merged-spell-ids.json", "utf8"));
const ADDED = [
  { id: "manto-del-crociato-2014", name: "Manto del crociato", edition: "2014", level: /3° livello/i },
  { id: "punizione-accecante-2024", name: "Punizione accecante", edition: "2024", level: /3° livello/i },
  { id: "tempesta-radiosa", name: "Tempesta radiosa", edition: "2024", level: /5° livello/i },
  { id: "rombo-di-tuono", name: "Rombo di tuono", edition: "2024", level: /Trucchetto/i },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

test("the four new cards: in the catalog with their edition, open on phone and computer with either edition chosen", async ({ page, request }) => {
  test.setTimeout(180_000);
  const catalog = await (await request.get("/api/catalogo/incantesimi")).json();
  for (const card of ADDED) {
    const row = catalog.spells.find(spell => spell.id === card.id);
    expect(row, card.id).toBeTruthy();
    expect(row.edizione ?? "2024", card.id).toBe(card.edition);
  }
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const chosen of ["2024", "2014"]) {
      await page.goto("/grimorio");
      await chooseEdition(page, chosen);
      for (const card of ADDED) {
        const response = await page.goto(`/spell/${card.id}`);
        expect(response.status(), `${card.id} ${chosen} ${viewport.width}`).toBe(200);
        await expect(page.getByRole("heading", { level: 1, name: card.name })).toBeVisible();
        await expect(page.locator("main")).toContainText(card.level);
        await expect(page.locator("main")).toContainText("NO SRD");
      }
    }
  }
});

test("«Otiluke» appears in no visible name: list, search index, card", async ({ page, request }) => {
  const index = await (await request.get("/ricerca-indice.json")).text();
  expect(index).not.toMatch(/tiluke/i);
  await page.goto("/grimorio");
  const search = page.getByRole("searchbox", { name: "Cerca un incantesimo" });
  await search.fill("sfera");
  await expect(page.locator('main a[href="/spell/sfera-elastica"]').filter({ hasText: /^Sfera elastica/ })).toBeVisible();
  await expect(page.locator('main a[href="/spell/sfera-congelante"]').filter({ hasText: /^Sfera congelante/ })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/tiluke/i);
  await page.goto("/spell/sfera-elastica");
  await expect(page.getByRole("heading", { level: 1, name: "Sfera elastica" })).toBeVisible();
  expect(await page.title()).toBe("Sfera elastica — Incantesimi · Il Grimorio.App");
  await expect(page.locator("body")).not.toContainText(/tiluke/i);
});

test("every old address with a proper name answers 308 straight to its new address, which opens", async ({ request }) => {
  const moved = { ...publicIds };
  for (const [id, kept] of Object.entries(merged)) moved[id] = publicIds[kept] ?? kept;
  // The 2014 rows «-2» and «armatura-di-agathis» are rows of the shared database only: the 308 holds, the page is not in the local test database.
  const local = new Set(["armatura-di-agata-2014", "braccia-di-ada-2014", "fame-di-ada-2014"]);
  for (const [id, open] of Object.entries(moved)) {
    const response = await request.get(`/spell/${id}`, { maxRedirects: 0 });
    expect(response.status(), id).toBe(308);
    expect(new URL(response.headers().location, "http://x").pathname, id).toBe(`/spell/${open}`);
    if (!local.has(open)) expect((await request.get(`/spell/${open}`, { maxRedirects: 0 })).status(), open).toBe(200);
  }
  expect(Object.keys(moved)).toHaveLength(27);
});

test("favorites saved with the old ids still open, at the new addresses; the lists link the new addresses", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(ids => localStorage.setItem("grimorio.favorites.v1", JSON.stringify(ids)), ["sfera-elastica-di-0tiluke", "veleni", "i-re-spirare-sott-acqua", "mano-di-bigby"]);
  await page.goto("/preferiti");
  for (const [href, name] of [["/spell/sfera-elastica", /^Sfera elastica/], ["/spell/individuazione-delle-malattie-e-dei-veleni", /^Individuazione delle malattie e dei veleni/], ["/spell/respirare-sott-acqua", /^Respirare sott'acqua/], ["/spell/mano-arcana", /^Mano/]])
    // («Mano arcana» is the name in the shared database; the local test database still has the old stored name.)
    await expect(page.locator(`main a[href="${href}"]`).filter({ hasText: name })).toBeVisible();
  await page.locator('main a[href="/spell/sfera-elastica"]').click();
  await expect(page).toHaveURL(/\/spell\/sfera-elastica$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sfera elastica" })).toBeVisible();
  // The card added to the favorites from its new address is the same favorite (stored id).
  await expect(page.getByRole("button", { name: /preferiti/i }).first()).toHaveAttribute("aria-pressed", "true");
  // No link of the public pages leads to an old address.
  for (const path of ["/grimorio", "/preferiti", "/ricerca-indice.json"]) {
    await page.goto(path);
    const html = await page.content();
    for (const id of Object.keys(publicIds)) expect(html, `${path} ${id}`).not.toContain(`/spell/${id}"`);
  }
});

test("search finds the new cards, also with typos, in the list and in the Home", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/grimorio");
  const search = page.getByRole("searchbox", { name: "Cerca un incantesimo" });
  for (const [edition, queries, href] of [
    ["2024", ["tempesta radiosa", "tempsta radiossa"], "/spell/tempesta-radiosa"],
    ["2024", ["rombo di tuono", "rombo di tunono"], "/spell/rombo-di-tuono"],
    ["2024", ["punizione accecante", "punizone acecante"], "/spell/punizione-accecante-2024"],
    ["2014", ["manto del crociato", "manto del crocato"], "/spell/manto-del-crociato-2014"],
  ]) {
    await chooseEdition(page, edition);
    for (const query of queries) {
      await search.fill(query);
      await expect(page.locator(`main a[href="${href}"]`).first(), `${edition} ${query}`).toBeVisible();
    }
  }
  for (const [edition, query, href] of [["2024", "tempsta radiosa", "/spell/tempesta-radiosa"], ["2014", "manto del crocato", "/spell/manto-del-crociato-2014"]]) {
    await page.addInitScript(value => { try { window.localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);
    await page.goto(`/?cerca=${encodeURIComponent(query)}`);
    const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
    await expect(dialog.locator(`a[href="${href}"]`), `${edition} ${query}`).toBeVisible();
  }
});
