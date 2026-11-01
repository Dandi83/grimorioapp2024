import { test, expect } from "./fixtures.mjs";
import { writeFileSync } from "node:fs";

// The space between the end of the text of a card and the box under it (SRD source, «Scheda completa dello
// spirito», NO SRD origin, rule source…): the same on every card, phone and computer, whatever the text ends with
// (list, table, «Utilizzo di uno slot…», spell list…). Every spell of both editions and a wide sample of the other
// cards. SPAZIO_REPORT=<file> writes every measure (the list of the report).
const STANDARD = 16;
const TOLERANCE = 1;
const REPORT = process.env.SPAZIO_REPORT;
const WIDTHS = [390, 1280];
const PARALLEL = 6;

/**
 * In the page: the first source box of the card and the bottom of the last thing shown before it: the block of a
 * line of text (paragraph, list item, cell…), a picture or icon, a visible border (table, framed block). Paddings
 * of the containers and empty margins do not count.
 */
function measure() {
  const box = document.querySelector("main [data-source-box]") ?? document.querySelector("main aside.rounded-xl.bg-card.p-4");
  if (!box) return null;
  const card = box.closest("article") ?? box.parentElement;
  const top = box.getBoundingClientRect().top;
  let bottom = -Infinity, last = null;
  const consider = (rect, node) => {
    if (!rect.height || !rect.width || rect.bottom > top + 1) return;
    if (rect.bottom > bottom) { bottom = rect.bottom; last = node; }
  };
  const before = node => !!(box.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) && !box.contains(node);
  const shown = element => {
    for (let node = element; node && node !== card; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.position === "fixed" || style.position === "sticky" || style.visibility === "hidden" || style.display === "none") return false;
    }
    return true;
  };
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim() || !before(node) || !shown(node.parentElement)) continue;
    // The line box of the text: its nearest block (paragraph, list item, cell, heading…), as Guida 2014 measures 16 px.
    let block = node.parentElement;
    while (block !== card && !/^(block|list-item|table|table-cell|flex|grid|flow-root)$/.test(getComputedStyle(block).display)) block = block.parentElement;
    consider(block.getBoundingClientRect(), block);
  }
  for (const element of card.querySelectorAll("*")) {
    if (element.contains(box) || !before(element) || !shown(element)) continue;
    const style = getComputedStyle(element);
    if (["IMG", "SVG", "svg", "HR"].includes(element.tagName) || parseFloat(style.borderBottomWidth) > 0) consider(element.getBoundingClientRect(), element);
  }
  if (!last) return null;
  const tag = element => element.tagName.toLowerCase() + (typeof element.className === "string" && element.className ? `.${element.className.split(/\s+/).slice(0, 2).join(".")}` : "");
  return { gap: Math.round((top - bottom) * 10) / 10, last: tag(last), parent: last.parentElement ? tag(last.parentElement) : "", text: (last.textContent || "").trim().slice(-50) };
}

async function catalogPaths(request) {
  const paths = [];
  for (const edition of ["2014", "2024"]) {
    const { spells } = await (await request.get(`/api/catalogo/incantesimi?edizione=${edition}`)).json();
    for (const spell of spells) if ((edition === "2014") === (spell.edizione === "2014")) paths.push([`/spell/${spell.id}`, edition]);
  }
  const { monsters } = await (await request.get("/api/catalogo/bestiario")).json();
  // A wide sample of the creatures: every 6th of each edition (spellcasters, legendary, animals included).
  monsters.filter((_, i) => i % 6 === 0).forEach(monster => paths.push([`/mostro/${monster.id}`, monster.edizione === "2014" ? "2014" : "2024"]));
  for (const list of ["/oggetti-magici", "/equipaggiamento/armi", "/equipaggiamento/armature", "/equipaggiamento/avventura", "/equipaggiamento/strumenti", "/compendio/condizioni"]) {
    const html = await (await request.get(list)).text();
    const prefix = list === "/compendio/condizioni" ? "/manuale/" : `${list}/`;
    const links = [...new Set([...html.matchAll(/href="([^"#?]+)"/g)].map(match => match[1]).filter(href => href.startsWith(prefix) && href !== list))];
    links.filter((_, i) => i % 5 === 0).slice(0, 25).forEach(href => { paths.push([href, "2024"]); paths.push([href, "2014"]); });
  }
  for (const id of ["concentrazione", "concentrazione-2014", "resistenza", "immunita", "vulnerabilita", "resistenza-vulnerabilita-2014", "immunita-2014"]) paths.push([`/regole/${id}`, id.endsWith("2014") ? "2014" : "2024"]);
  return paths;
}

test("the same space before the box under the text of every card", async ({ browser, request }) => {
  test.setTimeout(1_800_000);
  const paths = await catalogPaths(request);
  expect(paths.filter(([path]) => path.startsWith("/spell/")).length).toBeGreaterThan(600);
  const results = [];
  // One load per card: measured on the phone, then on the computer after a resize (the layout is CSS only).
  for (const edition of ["2014", "2024"]) {
    const context = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 } });
    await context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, edition);
    // Pictures, fonts of other pages and analytics are not needed to measure a page.
    await context.route(/\.(?:webp|png|jpg|avif|woff2?)(?:\?|$)/, route => route.request().url().includes("/damage-icons/") || route.request().resourceType() === "font" ? route.continue() : route.abort());
    const queue = paths.filter(([, e]) => e === edition);
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      const page = await context.newPage();
      for (let item = queue.shift(); item; item = queue.shift()) {
        await page.goto(item[0], { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          const result = await page.evaluate(measure);
          if (result) results.push({ path: item[0], edition, width, ...result });
        }
        await page.setViewportSize({ width: WIDTHS[0], height: 900 });
      }
      await page.close();
    }));
    await context.close();
  }
  if (REPORT) writeFileSync(REPORT, JSON.stringify(results, null, 1));
  const wrong = results.filter(result => Math.abs(result.gap - STANDARD) > TOLERANCE);
  expect(results.length).toBeGreaterThan(1200);
  expect(wrong.map(result => `${result.width} ${result.path}: ${result.gap}px after ${result.last}`)).toEqual([]);
});
