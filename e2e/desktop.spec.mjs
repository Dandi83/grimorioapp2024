import { test, expect } from "@playwright/test";

// Tablet and computer layouts (the phone is covered by the other files, unchanged).
test.use({ isMobile: false, hasTouch: false, viewport: { width: 1440, height: 900 } });

const noHorizontalScroll = async (page, label) => {
  const width = page.viewportSize().width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth), label).toBeLessThanOrEqual(width);
};

test("computer: side column, list and card side by side keeping search, edition and scroll; two-column creature card; Home shortcuts", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(String(error)));
  // Side column instead of the bottom bar.
  await page.goto("/grimorio");
  const side = page.getByRole("navigation", { name: "Navigazione laterale" });
  await expect(side).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigazione principale" })).toBeHidden();
  await expect(side.getByRole("link", { name: "Incantesimi" })).toHaveAttribute("aria-current", "page");
  for (const label of ["Segnala un errore", "Area riservata", "Termini e condizioni", "Privacy"]) await expect(side.getByRole("link", { name: label })).toBeVisible();
  const box = await side.boundingBox();
  expect(Math.round(box.width)).toBe(240);
  // /grimorio: list on the left, an empty card on the right.
  await expect(page.getByText("Scegli un incantesimo dall’elenco")).toBeVisible();
  const list = page.getByRole("complementary", { name: "Elenco degli incantesimi" });
  await expect(list.getByRole("heading", { name: "Incantesimi", level: 1 })).toBeVisible();
  // Edition, search and scroll of the list, then a card.
  await list.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await list.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("a");
  await list.evaluate(element => { element.scrollTop = 900; });
  const scrolled = await list.evaluate(element => element.scrollTop);
  expect(scrolled).toBeGreaterThan(500);
  const rows = list.locator("ul > li a[href^='/spell/']");
  const first = rows.nth(12);
  const firstName = (await first.locator("span").first().textContent()).trim();
  await first.click();
  await expect(page).toHaveURL(/\/spell\/.+-2014$/);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(firstName, "i") }).last()).toBeVisible();
  await expect(list.getByRole("searchbox", { name: "Cerca un incantesimo" })).toHaveValue("a");
  await expect(list.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" })).toHaveAttribute("aria-pressed", "true");
  expect(Math.abs(await list.evaluate(element => element.scrollTop) - scrolled)).toBeLessThan(5);
  await expect(list.locator('a[aria-current="page"]')).toHaveCount(1);
  // Another row: only the card changes.
  const second = rows.nth(13);
  const secondHref = await second.getAttribute("href");
  await second.click();
  await expect(page).toHaveURL(new RegExp(`${secondHref}$`));
  await expect(list.getByRole("searchbox", { name: "Cerca un incantesimo" })).toHaveValue("a");
  expect(Math.abs(await list.evaluate(element => element.scrollTop) - scrolled)).toBeLessThan(5);
  await expect(list.locator(`a[href="${secondHref}"]`)).toHaveAttribute("aria-current", "page");
  await noHorizontalScroll(page, "spell 1440");

  // Creature: list of 320 px, card on two columns (statistics left, actions right), GS pill.
  await page.goto("/mostro/aboleth");
  const beasts = page.getByRole("complementary", { name: "Elenco del bestiario" });
  await expect(beasts.getByRole("heading", { name: "Bestiario", level: 1 })).toBeVisible();
  expect(Math.round((await beasts.boundingBox()).width)).toBe(320);
  await expect(page.getByRole("heading", { level: 1, name: "Aboleth" })).toBeVisible();
  const stats = await page.getByRole("heading", { level: 2, name: "Caratteristiche" }).boundingBox();
  const actions = await page.getByRole("heading", { level: 2, name: "Azioni", exact: true }).boundingBox();
  expect(actions.x).toBeGreaterThan(stats.x + 200);
  expect(Math.abs(actions.y - stats.y)).toBeLessThan(200);
  await expect(page.getByText(/^GS 10 · 5\.900 PE/)).toBeVisible();
  await noHorizontalScroll(page, "creature 1440");

  // Home: shortcuts with the real numbers of the lists.
  await page.goto("/grimorio");
  await list.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2024" }).click();
  const count = async () => Number((await list.getByRole("status").filter({ hasText: /risultat/ }).textContent()).match(/(\d+)/)[1]);
  const spells2024 = await count();
  await list.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  const spells2014 = await count();
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "Scorciatoie" });
  await expect(shortcuts.getByRole("link", { name: `Incantesimi · ${spells2024 + spells2014}` })).toBeVisible();
  await expect(shortcuts.getByRole("link", { name: /^Bestiario · \d+$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Il sapere è la più/ })).toHaveCSS("font-size", "64px");
  // ⌘K / Ctrl+K opens the search.
  await page.keyboard.press("Control+k");
  await expect(page).toHaveURL(/\?cerca=/);
  await noHorizontalScroll(page, "home 1440");

  // Admin area: no public column, wide content.
  await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "Navigazione laterale" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("tablet and iPad landscape: bar of about 620 px, tiles on three columns, no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto("/compendio");
  const bar = page.getByRole("navigation", { name: "Navigazione principale" });
  await expect(bar).toBeVisible();
  expect(Math.round((await bar.boundingBox()).width)).toBe(620);
  const tiles = page.getByRole("list", { name: "Regole e oggetti" }).getByRole("listitem");
  const [a, b, c] = await Promise.all([0, 1, 2].map(i => tiles.nth(i).boundingBox()));
  expect(Math.abs(a.y - b.y) < 2 && Math.abs(b.y - c.y) < 2).toBe(true);
  expect(a.height).toBeGreaterThanOrEqual(150);
  for (const [width, height] of [[834, 1112], [1194, 834]]) {
    await page.setViewportSize({ width, height });
    for (const url of ["/", "/grimorio", "/spell/dardo-incantato", "/bestiario", "/mostro/aboleth", "/compendio", "/classi", "/equipaggiamento", "/oggetti-magici", "/fonti"]) {
      await page.goto(url);
      await noHorizontalScroll(page, `${url} ${width}`);
    }
  }
  // iPad landscape (1194): the side column.
  await expect(page.getByRole("navigation", { name: "Navigazione laterale" })).toBeVisible();
});

test("computer: a card opened from a direct link shows its row in the list column; a click on a row in view does not move the list; short creature placeholder", async ({ page }) => {
  test.setTimeout(120_000);
  const inView = async (aside, row) => {
    const [a, r] = [await aside.boundingBox(), await row.boundingBox()];
    return r.y >= a.y - 1 && r.y + r.height <= a.y + a.height + 1;
  };
  // A 2014 card far down the list: the column switches to 2014, loads the page with it and shows the row.
  await page.goto("/spell/desiderio-2014");
  const spells = page.getByRole("complementary", { name: "Elenco degli incantesimi" });
  const wish = spells.locator('a[aria-current="page"]');
  await expect(wish).toHaveAttribute("href", "/spell/desiderio-2014");
  await expect(spells.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => inView(spells, wish)).toBe(true);
  expect(await spells.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  // A row already in view: the card changes, the list stays where it is.
  const before = await spells.evaluate(node => node.scrollTop);
  const near = wish.locator("xpath=preceding::a[starts-with(@href, '/spell/')][1]");
  const href = await near.getAttribute("href");
  expect(await inView(spells, near)).toBe(true);
  await near.click();
  await expect(page).toHaveURL(href);
  await expect(spells.locator('a[aria-current="page"]')).toHaveAttribute("href", href);
  await page.waitForTimeout(300);
  expect(await spells.evaluate(node => node.scrollTop)).toBe(before);

  // Creatures: the last challenge rating, and a placeholder that fits the 320 px column.
  await page.goto("/mostro/tarrasque");
  const creatures = page.getByRole("complementary", { name: "Elenco del bestiario" });
  const tarrasque = creatures.locator('a[aria-current="page"]');
  await expect(tarrasque).toHaveAttribute("href", "/mostro/tarrasque");
  await expect.poll(() => inView(creatures, tarrasque)).toBe(true);
  const search = creatures.getByRole("searchbox", { name: "Cerca una creatura" });
  await expect(search).toHaveAttribute("placeholder", "Cerca…");
  expect(await search.evaluate(input => {
    const probe = document.createElement("span");
    probe.style.font = getComputedStyle(input).font;
    probe.style.position = "absolute";
    probe.textContent = input.placeholder;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width <= input.clientWidth;
  })).toBe(true);
  // The phone keeps its text.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bestiario");
  await expect(page.getByRole("searchbox", { name: "Cerca una creatura" })).toHaveAttribute("placeholder", "Cerca per nome…");
});
