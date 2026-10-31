import { test, expect } from "@playwright/test";

// PROMPT 38: one example text «Cerca per nome…» in every search field of the lists, and the Italian name marked in
// their results as in the search of the Home (components/search/marked.tsx). The visitor at 390 and 1280.
const LISTS = [
  { path: "/grimorio", label: "Cerca un incantesimo", query: "palla", href: "/spell/palla-di-fuoco", marked: "Palla" },
  { path: "/bestiario", label: "Cerca una creatura", query: "aboleth", href: "/mostro/aboleth", marked: "Aboleth" },
  { path: "/oggetti-magici", label: null, query: "borsa", href: "/oggetti-magici/borsa-conservante", marked: "Borsa" },
  { path: "/equipaggiamento/armi", label: "Cerca un’arma", query: "spada", href: "/equipaggiamento/armi/spada-lunga", marked: "Spada" },
  { path: "/equipaggiamento/armature", label: "Cerca un’armatura", query: "cotta", href: "/equipaggiamento/armature/cotta-di-maglia", marked: "Cotta" },
  { path: "/equipaggiamento/avventura", label: "Cerca un oggetto", query: "corda", href: null, marked: /^corda$/i },
  { path: "/equipaggiamento/strumenti", label: "Cerca uno strumento", query: "scasso", href: "/equipaggiamento/strumenti/arnesi-da-scasso", marked: "scasso" },
];

for (const width of [390, 1280]) {
  test(`at ${width}: «Cerca per nome…» in every list, the Italian name marked in the results`, async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
    await context.addInitScript(() => {
      try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    const calls = [];
    page.on("request", request => { if (["fetch", "xhr"].includes(request.resourceType())) calls.push(new URL(request.url()).pathname); });

    for (const list of LISTS) {
      await page.goto(list.path);
      const field = (list.label ? page.getByRole("searchbox", { name: list.label }) : page.getByRole("searchbox")).filter({ visible: true }).first();
      await expect(field, list.path).toHaveAttribute("placeholder", "Cerca per nome…");
      // Nothing marked before a search.
      await expect(page.locator("main mark").filter({ visible: true }), list.path).toHaveCount(0);
      await field.fill(list.query);
      const scope = list.href ? page.locator(`a[href="${list.href}"]`).filter({ visible: true }).first() : page.locator("main");
      const mark = scope.locator("mark").filter({ visible: true }).first();
      await expect(mark, list.path).toHaveText(list.marked);
      await expect(mark).toHaveCSS("background-color", "rgb(246, 226, 168)");
      await expect(mark).toHaveCSS("font-weight", "700");
      // The English line is not shown when the Italian name is found.
      if (list.href) await expect(scope.locator("[data-in-inglese]")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), list.path).toBeLessThanOrEqual(width);
      if (process.env.ELENCHI_SHOTS) await page.screenshot({ path: `${process.env.ELENCHI_SHOTS}/${list.path.split("/").pop()}-${width}.png` });
    }
    // No request more: besides the statistics, only the lists of the computer column (as before).
    expect(calls.filter(path => path.startsWith("/api/") && path !== "/api/analytics" && !path.startsWith("/api/catalogo/")), calls.join(" ")).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}
