import { test, expect } from "@playwright/test";

// «*» after the NO SRD cards in the lists, for the administrator only: asked from /api/admin/no-srd (401 without
// a session, never stored) after the session check, never in the pages, their data or /api/catalogo/*.
// Local test database only: the spell made here is deleted at the end.
const NAME = "Incantesimo di prova asterisco";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

const edition = (page, value) => page.addInitScript(v => { try { window.localStorage.setItem("grimorio.edizione", v); } catch { /* no storage */ } }, value);
const searchList = async (page, text) => {
  await page.getByRole("searchbox").first().fill(text);
  await page.waitForTimeout(400);
};

test("NO SRD asterisk: visitors never get it nor the ids; the administrator sees it in the lists until «Esci»", async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  // The endpoint is closed without a session.
  const closed = await request.get("/api/admin/no-srd");
  expect(closed.status()).toBe(401);
  expect(closed.headers()["cache-control"]).toContain("no-store");

  // Visitor: no asterisk, no NO SRD id in the pages or in the answers the lists load (phone and computer).
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const guest = await context.newPage();
    const answers = [];
    guest.on("response", async response => {
      if (response.url().includes("/api/admin/no-srd")) answers.push("ASKED");
      if (/\/api\/catalogo\//.test(response.url())) answers.push(await response.text().catch(() => ""));
    });
    for (const value of ["2024", "2014"]) {
      await context.addInitScript(v => { try { localStorage.setItem("grimorio.edizione", v); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, value);
      for (const path of ["/grimorio", "/bestiario"]) {
        await guest.goto(path);
        await guest.locator("li.catalog-row").first().waitFor();
        await guest.waitForTimeout(800);
        await expect(guest.locator("[data-no-srd-mark]"), `${path} ${value} ${width}`).toHaveCount(0);
        expect(await guest.content()).not.toContain("data-no-srd-mark");
      }
    }
    // The spell page side by side with the list (computer) is a list too.
    await guest.goto("/spell/amicizia");
    await guest.waitForTimeout(800);
    await expect(guest.locator("[data-no-srd-mark]")).toHaveCount(0);
    expect(answers.includes("ASKED"), "a visitor never asks for the ids").toBe(false);
    for (const body of answers) expect(body).not.toMatch(/fonte_scheda|Aggiunta da te|Sintesi originale|no-srd/);
    await context.close();
  }

  // Administrator: an added 2014 spell and an original 2024 summary have it; an SRD card does not.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("link", { name: "Sezioni dell’app" })).toBeVisible();
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Nome *").fill(NAME);
  await editor.locator("#spell-level").selectOption("1");
  await editor.locator("#spell-school").selectOption({ label: "Ammaliamento" });
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");

  const ids = await page.evaluate(async () => (await fetch("/api/admin/no-srd", { cache: "no-store" })).json());
  expect(ids.incantesimi).toContain("amicizia");
  expect(ids.incantesimi).not.toContain("palla-di-fuoco");
  expect(ids.incantesimi.length).toBeGreaterThanOrEqual(50);
  const row = name => page.locator("li.catalog-row").filter({ hasText: name }).first();

  await edition(page, "2014");
  await page.goto("/grimorio");
  await searchList(page, "asterisco");
  await expect(row(NAME).locator("[data-no-srd-mark]")).toHaveAttribute("aria-label", "NO SRD (visibile solo a te)");
  await expect(row(NAME).locator("[data-no-srd-mark]")).toHaveText("*");
  await expect(row(NAME).locator("[data-no-srd-mark]")).toHaveCSS("color", "rgb(122, 31, 43)");
  await edition(page, "2024");
  await page.goto("/grimorio");
  await searchList(page, "amicizia");
  await expect(page.locator("li.catalog-row").filter({ has: page.locator('a[href="/spell/amicizia"]') }).locator("[data-no-srd-mark]")).toHaveCount(1);
  await searchList(page, "palla di fuoco");
  await expect(row("Palla di fuoco").locator("[data-no-srd-mark]")).toHaveCount(0);
  // Every marked row is in the list of the endpoint, and every listed NO SRD card is marked.
  await searchList(page, "");
  const shown = await page.locator("li.catalog-row").evaluateAll(list => list.map(item => ({ href: item.querySelector('a[href^="/spell/"]')?.getAttribute("href"), mark: !!item.querySelector("[data-no-srd-mark]") })));
  for (const item of shown) expect(item.mark, item.href).toBe(ids.incantesimi.includes(item.href.split("/").pop()));
  // The row keeps its height: the asterisk sits on the line of the name.
  const jumps = await page.locator("li.catalog-row").evaluateAll(list => list.filter(item => item.querySelector("[data-no-srd-mark]")).map(item => {
    const mark = item.querySelector("[data-no-srd-mark]");
    const before = item.getBoundingClientRect().height;
    mark.style.display = "none";
    const after = item.getBoundingClientRect().height;
    mark.style.display = "";
    return before - after;
  }));
  expect(jumps.length).toBeGreaterThan(0);
  expect(jumps.filter(jump => Math.abs(jump) > 0.5), "rows of the same height with or without «*»").toEqual([]);
  // Bestiario and the computer column: same rule (the asterisk only where the endpoint says so).
  await page.goto("/bestiario");
  await page.locator("li.catalog-row").first().waitFor();
  await page.waitForTimeout(800);
  const monsters = await page.locator("li.catalog-row").evaluateAll(list => list.map(item => ({ href: item.querySelector('a[href^="/mostro/"]')?.getAttribute("href"), mark: !!item.querySelector("[data-no-srd-mark]") })));
  for (const item of monsters) expect(item.mark, item.href).toBe(ids.mostri.includes(item.href.split("/").pop()));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/spell/amicizia");
  await expect(page.locator("[data-no-srd-mark]").first()).toBeVisible();
  // Not on the card (its public «NO SRD» pill stays), not in search, favorites or the reserved area.
  await expect(page.locator("main [data-card-labels] [data-no-srd-mark]")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/?cerca=amicizia", "/preferiti", "/admin/incantesimi"]) {
    await page.goto(path);
    await page.waitForTimeout(800);
    await expect(page.locator("[data-no-srd-mark]"), path).toHaveCount(0);
  }

  // Clean up, then «Esci»: the asterisks go with the session.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("asterisco");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: NAME }).getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: NAME })).toHaveCount(0);
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByLabel("Passcode")).toBeVisible();
  await edition(page, "2024");
  await page.goto("/grimorio");
  await page.locator("li.catalog-row").first().waitFor();
  await page.waitForTimeout(800);
  await expect(page.locator("[data-no-srd-mark]")).toHaveCount(0);
  expect((await page.request.get("/api/admin/no-srd")).status()).toBe(401);
});
