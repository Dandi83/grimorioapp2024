import { test, expect } from "./fixtures.mjs";

// PROMPT 36: the search field in Armi and Armature, the same as in Strumenti; Italian and English names, the groups
// with nothing found left out, «Nessuna … con questo nome». The visitor at 390 and 1280, in 2024 and 2014.
async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try {
      localStorage.setItem("grimorio.edizione", value);
      localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  }, edition);
  return context;
}

/** What the field looks like: box and the styles that draw it (the placeholder aside). */
const look = field => field.evaluate(input => {
  const style = getComputedStyle(input), box = input.getBoundingClientRect(), label = input.closest("label").getBoundingClientRect();
  const icon = input.parentElement.querySelector("svg").getBoundingClientRect();
  return {
    width: Math.round(box.width), height: Math.round(box.height), labelWidth: Math.round(label.width),
    iconLeft: Math.round(icon.left - box.left), iconSize: Math.round(icon.width),
    ...Object.fromEntries(["font-size", "font-family", "border-top-width", "border-top-color", "border-radius", "background-color", "padding-left", "color"].map(key => [key, style.getPropertyValue(key)])),
    type: input.type, enterKeyHint: input.enterKeyHint, autocorrect: input.getAttribute("autocorrect"), autocapitalize: input.getAttribute("autocapitalize"),
  };
});

for (const width of [390, 1280]) for (const edition of ["2024", "2014"]) {
  test(`at ${width}, ${edition}: Armi and Armature searched by Italian and English name, the field as in Strumenti`, async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await visitor(browser, width, edition);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    const calls = [];
    page.on("request", request => { if (["fetch", "xhr"].includes(request.resourceType())) calls.push(new URL(request.url()).pathname); });

    // The field of Strumenti, the model.
    await page.goto("/equipaggiamento/strumenti");
    const model = await look(page.locator("[data-list-search] input").filter({ visible: true }).first());

    // Armi.
    await page.goto("/equipaggiamento/armi");
    const field = page.getByRole("searchbox", { name: "Cerca un’arma" });
    await expect(field).toHaveAttribute("placeholder", "Cerca per nome…");
    expect(await look(field)).toEqual(model);
    const groups = page.locator("main section h2");
    await expect(groups).toHaveCount(4);
    for (const [query, marked, english] of [["longsword", "", "Longsword"], ["spada", "Spada", ""]]) {
      await field.fill(query);
      const row = page.locator('a[href="/equipaggiamento/armi/spada-lunga"]').filter({ visible: true }).first();
      await expect(row).toContainText("Spada lunga");
      if (marked) await expect(row.locator("mark").first()).toHaveText(marked);
      if (english) await expect(row.locator("[data-in-inglese] mark")).toHaveText(english);
      await expect(row.locator("mark").first()).toHaveCSS("background-color", "rgb(246, 226, 168)");
    }
    // «longsword»: one weapon, one group (Mischia da guerra); the others are not shown.
    await field.fill("longsword");
    await expect(page.locator('[role="status"]').filter({ hasText: /trovat/ })).toHaveText("1 arma trovata");
    await expect(groups).toHaveCount(1);
    await expect(groups).toHaveText("Mischia da guerra");
    await field.fill("zzqxw");
    await expect(page.getByText("Nessuna arma con questo nome.")).toBeVisible();
    await expect(groups).toHaveCount(0);
    await field.fill("");
    await expect(groups).toHaveCount(4);
    if (process.env.ARMI_SHOTS) {
      await field.fill("spada");
      await page.screenshot({ path: `${process.env.ARMI_SHOTS}/armi-spada-${width}-${edition}.png` });
    }

    // Armature.
    await page.goto("/equipaggiamento/armature");
    const armour = page.getByRole("searchbox", { name: "Cerca un’armatura" });
    await expect(armour).toHaveAttribute("placeholder", "Cerca per nome…");
    expect(await look(armour)).toEqual(model);
    const categories = page.locator("main section h2");
    await expect(categories).toHaveCount(4);
    for (const [query, marked, english] of [["chain", "", "Chain"], ["cotta", "Cotta", ""]]) {
      await armour.fill(query);
      const row = page.locator('a[href="/equipaggiamento/armature/cotta-di-maglia"]').filter({ visible: true }).first();
      await expect(row).toContainText("Cotta di maglia");
      if (marked) await expect(row.locator("mark").first()).toHaveText(marked);
      if (english) await expect(row.locator("[data-in-inglese] mark")).toHaveText(english);
    }
    await armour.fill("cotta");
    await expect(categories).toHaveCount(1);
    await expect(categories).toHaveText("Armature pesanti");
    await armour.fill("zzqxw");
    await expect(page.getByText("Nessuna armatura con questo nome.")).toBeVisible();
    await expect(categories).toHaveCount(0);
    if (process.env.ARMI_SHOTS) {
      await armour.fill("chain");
      await page.screenshot({ path: `${process.env.ARMI_SHOTS}/armature-chain-${width}-${edition}.png` });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    // No request more: besides the statistics, only the pages prefetched by the links.
    expect(calls.filter(path => path.startsWith("/api/") && path !== "/api/analytics"), calls.join(" ")).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test("a search with no result in Armi goes to the statistics with the area «armi»", async ({ browser }) => {
  const context = await visitor(browser, 390, "2024");
  const events = [];
  await context.route("**/api/analytics", async route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: "accepted" } });
    events.push(JSON.parse(request.postData() || "{}"));
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  const page = await context.newPage();
  await page.goto("/equipaggiamento/armi");
  await page.getByRole("searchbox", { name: "Cerca un’arma" }).fill("zzqxw");
  await expect.poll(() => events.filter(event => event.event === "search").length).toBe(1);
  expect(events.find(event => event.event === "search")).toMatchObject({ query: "zzqxw", results: 0, area: "armi" });
  await page.goto("/equipaggiamento/armature");
  await page.getByRole("searchbox", { name: "Cerca un’armatura" }).fill("chain");
  await expect.poll(() => events.filter(event => event.event === "search").length).toBe(2);
  expect(events.filter(event => event.event === "search")[1]).toMatchObject({ query: "chain", results: 2, area: "armature" });
  await context.close();
});
