import { test, expect } from "./fixtures.mjs";

// PROMPT 51: in every class sheet, 2024 and 2014, one note under the SRD subclass of the level where the class gets it,
// with the exact text and the article of the class, the link to /fonti; never in the search index, the sitemap or the
// description; one H1; no sideways scrolling at 390 and 1280. (Hidden subclass part: e2e/sezioni.spec.mjs.)
const ARTICLE = {
  barbaro: "il barbaro", bardo: "il bardo", chierico: "il chierico", druido: "il druido", guerriero: "il guerriero", ladro: "il ladro",
  mago: "il mago", monaco: "il monaco", paladino: "il paladino", ranger: "il ranger", stregone: "lo stregone", warlock: "il warlock",
};
// The level where each class gets its subclass in the SRD 5.1 (2014); 3 for all in 2024.
const LEVEL_2014 = { chierico: 1, stregone: 1, warlock: 1, druido: 2, mago: 2 };
const TITLE = "ℹ️ Perché c'è una sola sottoclasse?";
const text = (id, edition) => edition === "2014"
  ? `Il Grimorio pubblica solo le regole dell'SRD 5.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Per ${ARTICLE[id]} contiene una sola sottoclasse: le altre si trovano nel Manuale del Giocatore 2014. Fonti e licenza`
  : `Il Grimorio pubblica solo le regole dell'SRD 5.2.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Per ${ARTICLE[id]} contiene una sola sottoclasse: le altre 3 si trovano nel Manuale del Giocatore 2024. Fonti e licenza`;

async function reader(browser, edition, width) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);
  return { context, page: await context.newPage() };
}

for (const edition of ["2024", "2014"]) {
  test(`${edition}: the note in all 12 classes, once, in the subclass level, exact text, link to /fonti`, async ({ browser }) => {
    test.setTimeout(240_000);
    const { context, page } = await reader(browser, edition, 390);
    for (const id of Object.keys(ARTICLE)) {
      const level = edition === "2014" ? LEVEL_2014[id] ?? 3 : 3;
      await page.goto(`/classi/${id}${edition === "2014" ? "?edizione=2014" : ""}`);
      const notes = page.locator(`[data-subclass-note="${edition}"]`);
      await expect(notes, id).toHaveCount(1);
      // In the card of its level, right after the box of the SRD subclass.
      const card = page.locator("li", { has: notes });
      await expect(card.locator("summary .tabular-nums"), id).toHaveText(String(level));
      await card.locator("summary").click();
      const note = page.getByRole("note").filter({ hasText: TITLE });
      await expect(note, id).toBeVisible();
      await expect(note.locator("p").first()).toHaveText(TITLE);
      await expect(note.locator("p").nth(1), id).toHaveText(text(id, edition));
      await expect(note.getByRole("link", { name: "Fonti e licenza" })).toHaveAttribute("href", "/fonti");
      expect(await note.evaluate(node => node.previousElementSibling?.textContent ?? ""), id).toMatch(/^Privilegio della sottoclasse · /);
      // Not a heading: the order of the titles does not change; one H1.
      await expect(note.getByRole("heading")).toHaveCount(0);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(note).toHaveCSS("background-color", "rgb(251, 241, 214)");
      await expect(note).toHaveCSS("border-top-style", "dashed");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), id).toBeLessThanOrEqual(390);
    }
    await context.close();
  });
}

test("mago and stregone at 1280; never in the search index, the sitemap or the description", async ({ browser }) => {
  for (const edition of ["2024", "2014"]) {
    const { context, page } = await reader(browser, edition, 1280);
    for (const id of ["mago", "stregone"]) {
      await page.goto(`/classi/${id}${edition === "2014" ? "?edizione=2014" : ""}`);
      const note = page.locator(`[data-subclass-note="${edition}"]`);
      await page.locator("li", { has: note }).locator("summary").click();
      await expect(note).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description).not.toMatch(/Manuale del Giocatore|sola sottoclasse/);
    }
    await context.close();
  }
  const { context, page } = await reader(browser, "2024", 390);
  for (const address of ["/ricerca-indice.json", "/sitemap.xml"]) expect(await (await page.request.get(address)).text(), address).not.toMatch(/sola sottoclasse|Manuale del Giocatore/);
  await context.close();
});
