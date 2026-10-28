import { test, expect } from "@playwright/test";

// Every search field, public and reserved: the attributes that keep Safari on iPhone from offering «Inserisci info»
// and the saved addresses over the keyboard (lib/search-input.ts), never inside a <form>; the search still works.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

async function expectSearchField(field, where) {
  await expect(field, where).toBeVisible();
  const attributes = await field.evaluate(input => ({
    type: input.getAttribute("type"),
    name: input.getAttribute("name"),
    id: input.getAttribute("id"),
    enterkeyhint: input.getAttribute("enterkeyhint"),
    autocomplete: input.getAttribute("autocomplete"),
    autocorrect: input.getAttribute("autocorrect"),
    autocapitalize: input.getAttribute("autocapitalize"),
    spellcheck: input.getAttribute("spellcheck"),
    inForm: !!input.closest("form"),
  }));
  expect(attributes, where).toEqual({
    type: "search", name: "grimorio-search", id: null, enterkeyhint: "search", autocomplete: "off",
    autocorrect: "off", autocapitalize: "none", spellcheck: "false", inForm: false,
  });
  expect(attributes.name, where).not.toMatch(/address|street|city|zip|cap|indirizz|citt|via|email|tel|name|nome/i);
}

// /manuale is not published in production (404): its field has the same attributes (components/manual-browser.tsx).
test("search fields of every public page: search attributes, no address autofill, no form", async ({ page }) => {
  for (const [path, label] of [
    ["/grimorio", "Cerca un incantesimo"],
    ["/bestiario", "Cerca una creatura"],
    ["/oggetti-magici", "Cerca un oggetto magico"],
    ["/equipaggiamento/avventura", "Cerca un oggetto"],
    ["/equipaggiamento/strumenti", "Cerca uno strumento"],
  ]) {
    await page.goto(path);
    await expectSearchField(page.getByRole("searchbox", { name: label }), path);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Cerca nel Grimorio 2024…" }).click();
  const field = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" }).getByRole("searchbox");
  await expectSearchField(field, "Home");
  // The search works as before: typos tolerated, «Forse cercavi», the «Cerca» key changes nothing.
  await field.fill("palla di foco");
  await field.press("Enter");
  await expect(page.locator("[data-did-you-mean]")).toHaveText("Forse cercavi: Palla di fuoco");
  await expect(page.getByRole("dialog").locator('a[href="/spell/palla-di-fuoco"]')).toBeVisible();
});

test("search fields of the reserved area: the same attributes", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expectSearchField(page.getByPlaceholder("Cerca qualsiasi scheda da modificare"), "admin home");
  await page.goto("/admin/incantesimi");
  await expectSearchField(page.getByRole("searchbox", { name: "Cerca in Incantesimi" }), "admin list");
});
