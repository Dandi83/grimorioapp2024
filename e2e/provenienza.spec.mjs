import { test, expect } from "@playwright/test";

// PROMPT 24: no «Provenienza» in the Filtri panel of Incantesimi and Bestiario, for the administrator too: the same
// groups for everyone (phone and computer, 2014 and 2024). The provenance stays in the lists of the reserved area
// (quick filters «NO SRD», «SRD modificate», «Nascoste») and in the «*» the administrator sees after the names. A
// «Provenienza» remembered from before (list memory, address) is ignored: the list opens with everything.
const LISTS = ["/grimorio", "/bestiario"];

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

async function context(browser, width, edition) {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await ctx.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, edition);
  return ctx;
}

/** The titles of the groups in the Filtri panel of a list. */
async function filterGroups(page, path) {
  await page.goto(path);
  await page.locator("li.catalog-row").first().waitFor();
  // The administrator: the «*» data arrive after the session check; the panel is read once they are in.
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Filtri/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const groups = await sheet.locator("legend").evaluateAll(nodes => nodes.map(node => node.textContent.trim()).filter(Boolean));
  await page.keyboard.press("Escape");
  return groups;
}

for (const width of [390, 1280]) {
  for (const edition of ["2024", "2014"]) {
    test(`Filtri at ${width}, ${edition}: no «Provenienza», the same groups for the administrator and a visitor`, async ({ browser }) => {
      test.setTimeout(180_000);
      const guestContext = await context(browser, width, edition);
      const guest = await guestContext.newPage();
      const adminContext = await context(browser, width, edition);
      const admin = await adminContext.newPage();
      await login(admin);
      for (const path of LISTS) {
        const seen = await filterGroups(guest, path);
        const own = await filterGroups(admin, path);
        expect(seen.length, `${path}: some groups`).toBeGreaterThan(1);
        expect(seen.join("|")).not.toMatch(/Provenienza/);
        expect(own.join("|")).not.toMatch(/Provenienza/);
        expect(own, `${path}: the same panel for the administrator`).toEqual(seen);
        // The «*» of the administrator stay (asked after the session check), never for a visitor.
        if (path === "/grimorio" && edition === "2024") await expect(admin.locator("[data-no-srd-mark]").first()).toBeAttached();
        await expect(guest.locator("[data-no-srd-mark]")).toHaveCount(0);
        await expect(admin.getByText("Solo NO SRD")).toHaveCount(0);
      }
      await guestContext.close();
      await adminContext.close();
    });
  }
}

test("the lists of the reserved area keep their quick filters", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  for (const list of ["incantesimi", "mostri"]) {
    await page.goto(`/admin/edizione?valore=2024&poi=%2Fadmin%2F${list}`);
    const rows = page.locator("main li[data-card-row]");
    await expect(rows.first()).toBeVisible();
    const all = await rows.count();
    for (const key of ["nosrd", "modificate", "nascoste"]) {
      const counter = page.locator(`[data-counter="${key}"]`);
      await expect(counter, `${list} ${key}`).toBeVisible();
      const n = Number((await counter.innerText()).match(/\d+/)[0]);
      await counter.click();
      await expect(counter).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => rows.count(), `${list} ${key}`).toBe(n);
      await counter.click();
      await expect.poll(() => rows.count()).toBe(all);
    }
  }
});

test("a «Provenienza» remembered from before is ignored: the list opens with everything, without errors", async ({ browser }) => {
  for (const asAdmin of [false, true]) {
    const ctx = await context(browser, 390, "2024");
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    if (asAdmin) await login(page);
    for (const path of LISTS) {
      await page.goto(path);
      await page.locator("li.catalog-row").first().waitFor();
      const total = (await page.getByRole("status").filter({ hasText: /risultat/ }).first().textContent()).trim();
      // The memory of the list with an old «Provenienza», restored as after «indietro»; then an old address.
      await page.evaluate(key => {
        const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
        sessionStorage.setItem(key, JSON.stringify({ ...saved, provenienza: "nosrd", origin: "nosrd" }));
        sessionStorage.setItem("grimorio:ripristina-elenco", "1");
      }, `grimorio:list:${path === "/grimorio" ? "grimorio" : "bestiario"}`);
      await page.reload();
      await page.locator("li.catalog-row").first().waitFor();
      await expect(page.getByRole("status").filter({ hasText: /risultat/ }).first()).toHaveText(total);
      await page.goto(`${path}?provenienza=nosrd`);
      await page.locator("li.catalog-row").first().waitFor();
      await expect(page.getByRole("status").filter({ hasText: /risultat/ }).first()).toHaveText(total);
      await expect(page.getByRole("button", { name: /NO SRD/ })).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  }
});
