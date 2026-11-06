import { test, expect } from "./fixtures.mjs";

// PROMPT 72: «D&D» and «Dungeons & Dragons» are trademarks of Wizards of the Coast. On the main public pages they appear
// only in the metadata for Google, in the descriptive form «compatibili con D&D 5e» (at most once per description), and
// in the legal notes ([data-trademark-note], [data-non-affiliazione]); never in the visible page, the title, the
// keywords, the JSON-LD, the labels, the edition badges, the edition choices or the name of the installed app.

const PAGES = ["/", "/grimorio", "/bestiario", "/compendio", "/spell/allarme", "/spell/allarme-2014", "/mostro/aboleth", "/mostro/aboleth-2014", "/classi/mago"];
const MARK = /D&D|D&amp;D|D\\u0026D|Dungeons/;
const NOTE = "Il Grimorio.App è un progetto non ufficiale, non affiliato né approvato da Wizards of the Coast. Dungeons & Dragons e D&D sono marchi di Wizards of the Coast LLC.";
const SHORT = "Progetto non ufficiale, non affiliato a Wizards of the Coast";
const headOf = html => html.slice(0, html.indexOf("</head>"));
const decode = text => text.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio.statistiche", "no"); } catch { /* no storage */ } });
});

test("metadata: no «D&D» in titles, keywords or JSON-LD; descriptions only «compatibili con D&D 5e», at most once", async ({ request }) => {
  test.setTimeout(120_000);
  for (const path of PAGES) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    const head = headOf(html);
    expect(decode(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""), path).not.toMatch(MARK);
    expect(head.match(/<meta name="keywords" content="([^"]*)"/)?.[1] ?? "", path).not.toMatch(MARK);
    // Every «D&D» of the head is in a description (description, og:description, twitter:description), in the descriptive form.
    for (const [tag] of head.matchAll(/<meta [^>]*>/g)) {
      const content = decode(tag.match(/content="([^"]*)"/)?.[1] ?? "");
      if (!MARK.test(content)) continue;
      expect(tag, path).toMatch(/(name|property)="(description|og:description|twitter:description)"/);
      expect(content.split("D&D").length - 1, `${path}: ${content}`).toBe(1);
      expect(content, path).toMatch(/compatibil[ei] con D&D 5e/);
      expect(content, path).not.toMatch(/Dungeons/);
    }
    for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) expect(json, path).not.toMatch(MARK);
  }
  const home = headOf(await (await request.get("/")).text());
  expect(decode(home.match(/<title>([^<]*)<\/title>/)[1])).toBe("Il Grimorio.App — Incantesimi, mostri e regole 5e in italiano");
  expect(decode(home.match(/<meta property="og:title" content="([^"]*)"/)[1])).toBe("Il Grimorio.App — Incantesimi, mostri e regole 5e in italiano");
});

test("visible page: no «D&D» in the text, labels, badges or accessible names, except the legal notes", async ({ page }) => {
  test.setTimeout(180_000);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first(), path).toBeVisible();
    await page.waitForLoadState("networkidle");
    const body = await page.evaluate(() => {
      const copy = document.body.cloneNode(true);
      copy.querySelectorAll("script, style, noscript, template, [data-trademark-note], [data-non-affiliazione]").forEach(node => node.remove());
      return { html: copy.outerHTML, text: copy.textContent };
    });
    expect(body.text, path).not.toMatch(MARK);
    // Attributes too: aria-label and title of the edition badges, alt texts.
    expect(body.html, path).not.toMatch(MARK);
  }
  // The badge of a card: «5e 2014» for screen readers, «2014» on screen.
  await page.goto("/spell/allarme-2014");
  const badge = page.locator('main span[title="Edizione delle regole: 5e 2014. Questa etichetta non attesta una licenza."]');
  await expect(badge).toHaveCount(1);
  await expect(badge).toHaveText("5e 2014");
  // The edition sheet of the Home: «Regole 2024» · «Regole 2014».
  await page.goto("/");
  await page.getByRole("button", { name: /^Edizione 2024/ }).first().click();
  const sheet = page.getByRole("dialog", { name: "Scegli l’edizione" });
  await expect(sheet).toHaveText("Scegli l’edizioneRegole 2024Regole 2014");
  expect(await page.evaluate(() => document.body.innerText)).not.toMatch(/D&D/);
});

test("non-affiliation: the sentence in /fonti and /info, the line at the foot of the Home links to /fonti", async ({ page }) => {
  for (const path of ["/fonti", "/info"]) {
    await page.goto(path);
    await expect(page.locator("p[data-non-affiliazione]"), path).toHaveText(NOTE);
  }
  await page.goto("/");
  const line = page.locator("[data-non-affiliazione]");
  await expect(line).toHaveText(SHORT);
  await expect(line.getByRole("link", { name: SHORT })).toHaveAttribute("href", "/fonti");
  // The line fits a phone screen and stays readable (12 px, at least 24 px to tap).
  const box = await line.getByRole("link").boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(box.height).toBeGreaterThanOrEqual(24);
});

test("installed app: manifest named «Il Grimorio.App», without «D&D»", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe("Il Grimorio.App");
  expect(manifest.short_name).toBe("Grimorio");
  expect(manifest.description).toBe("Incantesimi, mostri e regole 5e in italiano");
  expect(JSON.stringify(manifest)).not.toMatch(MARK);
});
