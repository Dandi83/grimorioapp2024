import { test, expect } from "./fixtures.mjs";
import crypto from "node:crypto";
import fs from "node:fs";

// The author's copyright note (28 October 2026): «Diritti d’autore» in /info before the SRD attributions, «Proprietà
// dei contenuti» in /termini, the small line at the foot of /info, /termini, /fonti and /privacy; the SRD cards carry
// no ©; the SRD attributions and the trademark notes stay byte for byte as they were on main.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

const SHOTS = process.env.DIRITTI_SHOTS;
const LINE = "© 2026 D.D.B. – Il Grimorio.App · Contenuti SRD sotto licenza CC BY 4.0";
const DEED = "https://creativecommons.org/licenses/by/4.0/deed.it";
const SRD52 = JSON.parse(fs.readFileSync(new URL("../lib/data/srd-italiano-5.2.1.json", import.meta.url), "utf8")).attribution;
// sha256 of the HTML of /fonti and /info before this change (main faa4d54), copyright line and section left out.
const MAIN = {
  "/fonti": "fe772158e137e094b6d43772909b6e72e17128b8b33b71e21cfcab997acdadaa",
  "/info": "60d4c0a53f53d145dbc1ad1286970daf0dd9d22e20ee55dc77ca24cf45b376f9",
};

async function legalHtml(page) {
  return page.locator("main article").first().evaluate(article => {
    const copy = article.cloneNode(true);
    // The new parts of the page: the copyright note and «Sostieni il Grimorio» (PROMPT 7), never the attributions.
    copy.querySelectorAll("[data-copyright], [data-copyright-line], [data-support-row]").forEach(node => node.remove());
    return copy.innerHTML;
  });
}

test("the SRD attributions and trademark notes of /fonti and /info are byte for byte the ones on main", async ({ page }) => {
  for (const address of Object.keys(MAIN)) {
    await page.goto(address);
    const hash = crypto.createHash("sha256").update(await legalHtml(page)).digest("hex");
    if (process.env.PRINT_LEGAL_HASH) console.log(`LEGAL_HASH ${address} ${hash}`);
    expect.soft(hash, address).toBe(MAIN[address]);
  }
  await page.goto("/fonti");
  await expect(page.getByText(SRD52, { exact: true })).toBeVisible();
});

test("«Diritti d’autore» in /info before the attributions, «Proprietà dei contenuti» in /termini, the line on the four legal pages", async ({ page }) => {
  await page.goto("/info");
  const section = page.locator("section[data-copyright]");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText("Diritti d’autore");
  await expect(section).toContainText("© 2026 D.D.B. – Il Grimorio.App. Codice, grafica, logo e testi originali dell’app (comprese le traduzioni e i contenuti scritti per Il Grimorio.App) sono opera dell’autore e non possono essere copiati o riutilizzati senza permesso.");
  await expect(section).toContainText("I contenuti tratti dal System Reference Document (SRD 5.1 e SRD 5.2) sono usati secondo la licenza Creative Commons Attribuzione 4.0 e restano liberamente riutilizzabili alle condizioni di quella licenza: vedi le attribuzioni qui sotto e la pagina Fonti.");
  await expect(section).toContainText("Il Grimorio.App non è un prodotto ufficiale e non è affiliato a Wizards of the Coast.");
  await expect(section.getByRole("link", { name: "Fonti" })).toHaveAttribute("href", "/fonti");
  // Before the line pointing to the attributions, and no author's full name anywhere.
  const order = await page.evaluate(() => {
    const copyright = document.querySelector("section[data-copyright]");
    const attributions = [...document.querySelectorAll("main p")].find(p => p.textContent.includes("Le attribuzioni complete sono in"));
    return !!(copyright.compareDocumentPosition(attributions) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
  await expect(page.getByText(/Daniele|De Bellis/)).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/info-${page.viewportSize().width}.png`, fullPage: true });

  await page.goto("/termini");
  await expect(page.getByRole("heading", { name: "Proprietà dei contenuti" })).toBeVisible();
  await expect(page.locator("p[data-copyright]")).toContainText("© 2026 D.D.B. – Il Grimorio.App.");
  // The non-affiliation sentence is said once.
  await expect(page.getByText(/non è affiliat/i)).toHaveCount(1);

  for (const address of ["/info", "/termini", "/fonti", "/privacy"]) {
    await page.goto(address);
    const line = page.locator("[data-copyright-line]");
    await expect(line, address).toHaveText(LINE);
    await expect(line.getByRole("link", { name: "CC BY 4.0" }), address).toHaveAttribute("href", DEED);
    // The line fits the screen (/fonti is a little wider at 390 px because of the long addresses in the SRD 5.1
    // attribution, which stays as it is).
    const box = await line.boundingBox();
    expect(box.x + box.width, address).toBeLessThanOrEqual(page.viewportSize().width);
  }
});

test("the SRD cards carry no ©", async ({ page }) => {
  for (const address of ["/spell/palla-di-fuoco", "/grimorio"]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-copyright], [data-copyright-line]"), address).toHaveCount(0);
    await expect(page.getByText("D.D.B."), address).toHaveCount(0);
  }
});
