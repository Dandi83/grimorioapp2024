import { test, expect } from "./fixtures.mjs";

// PROMPT 54: note «Perché non ci sono tutti i talenti?» at the top of /talenti, with the text of the chosen edition
// (17 feats SRD 5.2.1, one feat SRD 5.1). It follows the section: shown → note and feats in the general search, also by
// English name; «In arrivo» → no page, no note, no results. Test database only; «In arrivo» again at the end.
const TITLE = "ℹ️ Perché non ci sono tutti i talenti?";
const TEXT = {
  2024: "Il Grimorio pubblica solo le regole dell'SRD 5.2.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Contiene 17 talenti: gli altri si trovano nel Manuale del Giocatore 2024.",
  2014: "Il Grimorio pubblica solo le regole dell'SRD 5.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Contiene un solo talento, Lottatore: gli altri si trovano nel Manuale del Giocatore 2014.",
};
const stateRadio = (scope, title, label) => scope.getByRole("radiogroup", { name: `Stato di ${title}`, exact: true }).getByRole("radio", { name: label, exact: true });

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}
async function setTalenti(page, label) {
  if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
  const radio = stateRadio(page, "Talenti", label);
  if ((await radio.getAttribute("aria-checked")) === "true") return;
  await radio.click();
  await expect(radio).toHaveAttribute("aria-checked", "true");
}
async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  }, edition);
  return context;
}
async function searchLinks(pub, query) {
  await pub.goto(`/?cerca=${encodeURIComponent(query)}`);
  const dialog = pub.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog.locator("#search-count")).toHaveText(/risultat/i);
  return dialog.locator('a[href^="/talenti/"]');
}

test.describe.configure({ mode: "serial" });
test.afterAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await login(page);
  await setTalenti(page, "In arrivo");
  await context.close();
});

test("shown: the note on top of /talenti with the exact text of each edition, not on the sheets; feats in the general search also in English", async ({ browser, page, request }) => {
  test.setTimeout(300_000);
  await login(page);
  await setTalenti(page, "Visibile");
  await expect.poll(async () => (await request.get("/talenti")).status()).toBe(200);
  for (const [edition, width] of [["2024", 390], ["2024", 1280], ["2014", 390], ["2014", 1280]]) {
    const context = await visitor(browser, width, edition);
    const pub = await context.newPage();
    await pub.goto("/talenti");
    await pub.waitForLoadState("networkidle");
    const note = pub.locator(`[data-feats-note="${edition}"]`);
    await expect(note).toBeVisible();
    await expect(pub.locator("[data-feats-note]")).toHaveCount(1);
    await expect(note).toHaveAttribute("role", "note");
    await expect(note.locator("p").first()).toHaveText(TITLE);
    await expect(note.locator("p").nth(1)).toHaveText(`${TEXT[edition]} Fonti e licenza`);
    await expect(note.getByRole("link", { name: "Fonti e licenza" })).toHaveAttribute("href", "/fonti");
    // Under the title, above search box, filters and list.
    const y = async locator => (await locator.boundingBox()).y;
    const noteY = await y(note);
    expect(noteY, `${edition} ${width} title`).toBeGreaterThan(await y(pub.getByRole("heading", { level: 1, name: "Talenti" })));
    expect(noteY, `${edition} ${width} search`).toBeLessThan(await y(pub.getByRole("searchbox")));
    expect(noteY, `${edition} ${width} list`).toBeLessThan(await y(pub.locator("[data-feat-row]").first()));
    expect(await pub.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${edition} ${width} scroll`).toBe(true);
    await context.close();
  }
  // Not on the single sheets.
  for (const path of ["/talenti/allerta", "/talenti/lottatore?edizione=2014"]) {
    expect(await (await request.get(path)).text(), path).not.toContain("data-feats-note");
  }
  // General search: Italian and English names.
  expect(await (await request.get("/ricerca-indice.json")).text()).toContain("/talenti/dono-del-fato");
  const context = await visitor(browser, 390, "2024");
  const pub = await context.newPage();
  for (const [query, id] of [["Allerta", "allerta"], ["Alert", "allerta"], ["Lottatore", "lottatore"], ["Grappler", "lottatore"], ["Boon of Fate", "dono-del-fato"], ["Dono del fato", "dono-del-fato"]]) {
    const links = await searchLinks(pub, query);
    await expect(links.and(pub.locator(`[href^="/talenti/${id}"]`)).first(), query).toBeVisible();
  }
  await context.close();
});

test("«In arrivo»: no page, no note, no feats in the general search", async ({ browser, page, request }) => {
  test.setTimeout(180_000);
  await login(page);
  await setTalenti(page, "In arrivo");
  await expect.poll(async () => (await request.get("/talenti")).status()).toBe(404);
  await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).not.toContain("/talenti");
  for (const edition of ["2024", "2014"]) {
    const context = await visitor(browser, 390, edition);
    const pub = await context.newPage();
    const response = await pub.goto("/talenti");
    expect(response.status()).toBe(404);
    await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente in costruzione");
    await expect(pub.locator("[data-feats-note]")).toHaveCount(0);
    expect(await response.text()).not.toContain("Perché non ci sono tutti i talenti");
    for (const query of ["Alert", "Grappler", "Boon of Fate", "Lottatore"]) {
      await expect(await searchLinks(pub, query), `${edition} ${query}`).toHaveCount(0);
    }
    await context.close();
  }
});
