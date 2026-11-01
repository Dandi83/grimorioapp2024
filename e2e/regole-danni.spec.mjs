import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «Resistenza», «immunità», «vulnerabilità» on the cards: rule pills like the conditions, leading to the rule of
// the edition of the card (SRD 5.2.1 glossary, SRD 5.1 «Combattimento» and «Mostri»); the words as printed.
// Local test database only: the spell made here is deleted at the end.
const SHOTS = process.env.REGOLE_DANNI_SHOTS;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});
const edition = (page, value) => page.addInitScript(v => { try { localStorage.setItem("grimorio.edizione", v); } catch { /* no storage */ } }, value);
const pill = (page, name, href) => page.locator(`main a.ref-pill[data-rule-term][href="${href}"]`, { hasText: name });

test("rule pills: spells, creatures, magic items, classes; the rule pages of both editions", async ({ page }) => {
  test.setTimeout(240_000);
  await edition(page, "2024");
  // Pelle di pietra 2024 → Resistenza (Glossario, p. 212).
  await page.goto("/spell/pelle-di-pietra");
  await expect(page.locator("main a[data-rule-term]")).toHaveCount(1);
  const stone = pill(page, /^resistenza$/, "/regole/resistenza");
  await expect(stone).toBeVisible();
  // The pill keeps the word as printed (no capital letter changed by the style).
  expect(await stone.evaluate(element => getComputedStyle(element, "::first-letter").textTransform)).toBe("none");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/pelle-di-pietra-2024-390.png`, fullPage: true });
  await stone.click();
  await expect(page).toHaveURL(/\/regole\/resistenza$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resistenza");
  await expect(page.locator("main")).toContainText("Se un personaggio è dotato di resistenza a un tipo di danno, i danni di quel tipo che subisce sono dimezzati (arrotondando per difetto).");
  await expect(page.getByRole("complementary", { name: "Fonte della regola" })).toContainText("SRD 5.2.1 italiano, Glossario delle regole — Resistenza.");
  await expect(page.getByRole("link", { name: "Fonte ufficiale, pagina 212" })).toHaveAttribute("href", /IT_SRD_CC_v5\.2\.1\.pdf#page=212$/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/regola-resistenza-2024-390.png`, fullPage: true });
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/spell\/pelle-di-pietra$/);

  // Creatures 2024: the label of the line, the trait of the text.
  await page.goto("/mostro/drago-rosso-adulto");
  await expect(pill(page, /^Immunità$/, "/regole/immunita")).toBeVisible();
  await expect(page.locator("main a[data-rule-term]", { hasText: /Resistenza leggendaria/ })).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/drago-rosso-adulto-2024-390.png`, fullPage: true });
  await page.goto("/mostro/testuggine-dragona");
  await expect(pill(page, /^Resistenze$/, "/regole/resistenza")).toBeVisible();
  // Magic item and class feature.
  await page.goto("/oggetti-magici/anello-di-resistenza");
  await expect(pill(page, /^resistenza$/, "/regole/resistenza").first()).toBeVisible();
  await page.goto("/classi/barbaro");
  await expect(page.locator('main a[data-rule-term][href="/regole/resistenza"]').first()).toBeAttached();
  for (const id of ["immunita", "vulnerabilita"]) {
    await page.goto(`/regole/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(id === "immunita" ? "Immunità" : "Vulnerabilità");
    await expect(page.getByRole("link", { name: /^Fonte ufficiale, pagina (208|219)$/ })).toBeVisible();
  }

  // 2014: the rules of SRD 5.1.
  await edition(page, "2014");
  await page.goto("/spell/pelle-di-pietra-2014");
  const resistant = pill(page, /^resistente$/, "/regole/resistenza-vulnerabilita-2014");
  await expect(resistant).toBeVisible();
  await resistant.click();
  await expect(page).toHaveURL(/\/regole\/resistenza-vulnerabilita-2014$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resistenza e vulnerabilità ai danni");
  await expect(page.locator("main article > div > p")).toHaveCount(4);
  await expect(page.getByRole("complementary", { name: "Fonte della regola" })).toContainText("SRD 5.1 italiano, Combattimento");
  await expect(page.getByRole("link", { name: "Fonte ufficiale, pagina 111" })).toHaveAttribute("href", /SRD_CC_v5\.1_IT\.pdf#page=111$/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/regola-resistenza-2014-390.png`, fullPage: true });
  await page.goto("/mostro/drago-rosso-adulto-2014");
  await expect(pill(page, /^Immunità ai danni$/, "/regole/immunita-2014")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/drago-rosso-adulto-2014-390.png`, fullPage: true });
  // «Immunità alle condizioni» leads to the conditions; «Resistenza leggendaria» is a trait name.
  await page.goto("/mostro/lich-2014");
  await expect(pill(page, /^Immunità alle condizioni$/, "/compendio/condizioni")).toBeVisible();
  await expect(page.locator("main a[data-rule-term]", { hasText: /Resistenza leggendaria/ })).toHaveCount(0);
  await page.goto("/mostro/testuggine-dragona-2014");
  await expect(pill(page, /^Resistenze$/, "/regole/resistenza-vulnerabilita-2014")).toBeVisible();
  await page.goto("/regole/immunita-2014");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vulnerabilità, resistenze e immunità");
  await expect(page.getByRole("complementary", { name: "Fonte della regola" })).toContainText("SRD 5.1 italiano, Mostri");
});

test("rule pills on a spell added by the administrator (Interdizione alle lame 2014)", async ({ browser }) => {
  test.setTimeout(120_000);
  const id = "interdizione-alle-lame-e2e";
  const text = "Fino alla fine del suo turno successivo, il personaggio ottiene resistenza ai danni contundenti, perforanti e taglienti inferti dagli attacchi con le armi.";
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query("INSERT INTO spells (id, nome_italiano, livello, tempo_di_lancio, durata, descrizione, sort_key) VALUES ($1, 'Interdizione alle lame', 'Trucchetto di Abiurazione', '1 azione', '1 round', $2, 'interdizione alle lame')", [id, text]);
    await db.query("INSERT INTO grimorio_content_editions (content_kind, content_id, edition) VALUES ('spell', $1, '2014')", [id]);
    const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await visitor.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2014"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
    const guest = await visitor.newPage();
    await guest.goto(`/spell/${id}`);
    await expect(pill(guest, /^resistenza$/, "/regole/resistenza-vulnerabilita-2014")).toBeVisible();
    // The words as stored: the pill only wraps them.
    await expect(guest.locator("main")).toContainText(text);
    if (SHOTS) await guest.screenshot({ path: `${SHOTS}/interdizione-alle-lame-2014-390.png`, fullPage: true });
    await visitor.close();
  } finally {
    await db.query("DELETE FROM grimorio_content_editions WHERE content_id = $1", [id]).catch(() => undefined);
    await db.query("DELETE FROM spells WHERE id = $1", [id]);
    await db.end();
  }
});
