import { test, expect } from "./fixtures.mjs";

// Every spell of the public list (both editions) has the level and school its card shows: the list and the card
// read the same values (lib/spell-display-row.ts), so the filters by school never lose a card.
test("every spell of the list: level and school as on its card, 2014 and 2024", async ({ request }) => {
  test.setTimeout(600_000);
  const { spells } = await (await request.get("/api/catalogo/incantesimi")).json();
  expect(spells.length).toBeGreaterThan(600);
  expect(spells.some(spell => spell.edizione === "2014")).toBe(true);
  const wrong = [];
  for (let i = 0; i < spells.length; i += 8) {
    await Promise.all(spells.slice(i, i + 8).map(async spell => {
      const html = await (await request.get(`/spell/${encodeURIComponent(spell.id)}`)).text();
      const badge = html.match(/>(Trucchetto|(\d+)° Livello)(?:<!-- -->)? · (?:<!-- -->)?([A-Za-zà-ù]*)</);
      const level = badge ? (badge[1] === "Trucchetto" ? 0 : Number(badge[2])) : null;
      const school = badge ? badge[3] : null;
      if (level !== spell.livello_num || school !== spell.scuola) wrong.push(`${spell.id}: elenco ${spell.livello_num}/${spell.scuola || "—"}, scheda ${level}/${school || "—"}`);
    }));
  }
  expect(wrong).toEqual([]);
  // The three cantrips that had no school in the list are back in their filters.
  const byId = new Map(spells.map(spell => [spell.id, spell]));
  expect(byId.get("luce")).toMatchObject({ livello_num: 0, scuola: "Invocazione" });
  expect(byId.get("resistenza")).toMatchObject({ livello_num: 0, scuola: "Abiurazione" });
  expect(byId.get("scheggia-della-mente")).toMatchObject({ livello_num: 0, scuola: "Ammaliamento" });
});
