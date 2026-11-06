import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { COMMUNITY_TITLE, GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// PROMPT 66: /api/tpk/creature-originali, the list Total Party Kill reads from its server. Rows written in the local
// test database only (never a real one), the switches moved from the reserved area (their saves refresh the cached
// state), everything put back at the end: the other specs find the database as it was.
const PATH = "/api/tpk/creature-originali";
const OURS = "homebrew-prova-tpk-squartatore"; // the editorial staff, 2024, with hidden sections and a picture
const CAT = "homebrew-prova-tpk-gatto"; // community, 2024, «Bilanciamento verificato»
const MOTH = "homebrew-prova-tpk-falena"; // community, «Entrambe»
const OLD = "homebrew-prova-tpk-lupo"; // community, 2014
const NO_LICENSE = "homebrew-prova-tpk-senza-licenza"; // community, proposed before the licence
const EYE = "homebrew-prova-tpk-occhio"; // community, 2024, hidden with the eye in a test
const ROWS = [OURS, CAT, MOTH, OLD, NO_LICENSE, EYE];
const PROPOSALS = ["4f1c2b9e-1111-4c4c-8a8a-000000000066", "4f1c2b9e-2222-4c4c-8a8a-000000000066"];
const SECRET = {
  tattiche: "TATTICA RISERVATA TPK: colpisce alle spalle.", tana: "TANA RISERVATA TPK sotto il mulino.",
  agganci: "AGGANCIO RISERVATO TPK per il master.", varianti: "VARIANTE RISERVATA TPK con le ali.",
  email: "proposta-tpk@example.com", nickname: "AutoreSegretoTPK", motivo: "MOTIVO RISERVATO TPK", proposta: "Proposta riservata TPK",
};
const draft = (nome, edizione, extra = {}) => ({
  edizione, nome, taglia: "Media", tipo: "Mostruosità", allineamento: "caotico malvagio", ca: 15, ca_nota: "armatura naturale", pf: 52, dadi_vita: "8d8 + 16",
  velocita: "9 m", forza: 16, destrezza: 14, costituzione: 14, intelligenza: 6, saggezza: 12, carisma: 7, ts_competenti: [], abilita: "",
  vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: "3", tratti: [],
  azioni: [{ nome: "Artiglio", testo: "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 10 (2d6 + 3) danni taglienti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [], descrizione: `Descrizione pubblica di ${nome}.`, ...extra,
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
  const admin = await context.newPage();
  await admin.goto("/admin");
  await admin.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await admin.getByRole("button", { name: "Entra" }).click();
  await expect(admin.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, admin };
}

/** «Attiva» / «Disattiva» of the «Modalità solo SRD» card in /admin, then «Conferma». */
async function srdOnly(admin, on) {
  await admin.goto("/admin");
  const card = admin.locator("#solo-srd");
  await card.getByRole("button", { name: on ? "Attiva modalità solo SRD" : "Disattiva modalità solo SRD" }).click();
  await card.getByRole("button", { name: "Conferma" }).click();
  await expect(card).toHaveAttribute("data-srd-only", on ? "accesa" : "spenta");
}

/** The ids of the list now, read as a visitor would (no cookie). */
const listIds = async request => (await (await request.get(PATH)).json()).creature.map(creature => creature.id).filter(id => ROWS.includes(id));
const keysOf = value => (Array.isArray(value) ? value.flatMap(keysOf) : value && typeof value === "object" ? Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]) : []);

test.describe.configure({ mode: "serial" });

// What the switches of this spec leave in the database, put back at the end: the rows of /admin/registro written from
// `since`, the states of the two parts and the row of the «Modalità solo SRD» that were not there before
// (e2e/app.spec.mjs, later in the same half, expects the log of the reserved area empty).
let since;
let partsBefore = [];
let srdOnlyBefore = false;
const rowsOf = (client, sql, params = []) => client.query(sql, params).then(result => result.rows, () => []);

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await database(async client => {
    since = (await client.query("SELECT now() AS t")).rows[0].t;
    partsBefore = (await rowsOf(client, "SELECT parte FROM grimorio_section_parts WHERE sezione = 'bestiario'")).map(row => row.parte);
    srdOnlyBefore = (await rowsOf(client, "SELECT 1 FROM grimorio_srd_only WHERE id = 1")).length > 0;
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew_proposals (id uuid PRIMARY KEY, stato text NOT NULL DEFAULT 'da-vedere',
      scheda jsonb NOT NULL, nickname text NOT NULL, email text, originale boolean NOT NULL, autorizza boolean NOT NULL, impronta text,
      creata_il timestamptz NOT NULL DEFAULT now(), decisa_il timestamptz, motivo text, homebrew_id text, licenza text)`);
    const insert = `INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, proposta_id, licenza, bilanciamento, verificato, pubblicata_il)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`;
    await client.query(insert, [OURS, JSON.stringify(draft("Squartatore di prova", "2024", {
      storia: "Storia pubblica dello squartatore.", ...Object.fromEntries(["tattiche", "tana", "agganci", "varianti"].map(key => [key, SECRET[key]])),
      sezioni_nascoste: ["tattiche", "tana", "agganci", "varianti"], testo_ricco: true,
      immagine: { v: "0123456789abcdef", w: 800, h: 533 }, immagine_alt: "Lo squartatore di prova", immagine_crediti: "Illustrazione di prova",
    })), "2024", null, null, "CC BY-NC-SA 4.0", "fuori dal gs", false, "2026-10-30T10:00:00Z"]);
    await client.query(insert, [CAT, JSON.stringify(draft("Gatto d’ombra di prova", "2024")), "2024", "Lia", PROPOSALS[0], "CC BY-NC-SA 4.0", "in linea", true, "2026-11-03T10:00:00Z"]);
    await client.query(insert, [MOTH, JSON.stringify(draft("Falena di prova", "entrambe")), "entrambe", "Teo", null, "CC BY-NC-SA 4.0", null, false, "2026-11-02T10:00:00Z"]);
    await client.query(insert, [OLD, JSON.stringify(draft("Lupo di prova", "2014")), "2014", "Lia", null, "CC BY-NC-SA 4.0", null, false, "2026-11-04T10:00:00Z"]);
    await client.query(insert, [NO_LICENSE, JSON.stringify(draft("Senza licenza di prova", "2024")), "2024", "Max", null, null, null, false, "2026-11-04T10:00:00Z"]);
    await client.query(insert, [EYE, JSON.stringify(draft("Occhio di prova", "2024")), "2024", "Lia", null, "CC BY-NC-SA 4.0", null, false, "2026-11-01T10:00:00Z"]);
    // Proposals still to see and refused: never in the list.
    const proposal = `INSERT INTO grimorio_homebrew_proposals (id, stato, scheda, nickname, email, originale, autorizza, licenza, motivo)
      VALUES ($1, $2, $3, $4, $5, true, true, 'CC BY-NC-SA 4.0', $6) ON CONFLICT (id) DO NOTHING`;
    await client.query(proposal, [PROPOSALS[0], "da-vedere", JSON.stringify(draft(SECRET.proposta, "2024")), SECRET.nickname, SECRET.email, null]);
    await client.query(proposal, [PROPOSALS[1], "rifiutata", JSON.stringify(draft(`${SECRET.proposta} rifiutata`, "2024")), SECRET.nickname, null, SECRET.motivo]);
  });
  // «Mostri del Grimorio» starts «In arrivo»: shown for these tests (the save refreshes the cached state).
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  await context.close();
});

// The rows go first, then the last switch refreshes the cached state and the lists without them.
test.afterAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await database(async client => {
    await client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [ROWS]);
    await client.query("DELETE FROM grimorio_homebrew_proposals WHERE id = ANY($1)", [PROPOSALS]);
    await client.query("DELETE FROM grimorio_card_visibility WHERE tipo = 'mostro' AND scheda = ANY($1)", [ROWS]).catch(() => undefined);
  });
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  await setBestiaryPart(admin, GRIMORIO_TITLE, "In arrivo");
  await context.close();
  // The states saved by these switches are the starting ones («Mostri del Grimorio» in arrivo, the community visible):
  // the rows that were not there before go, with every row of the log written by this spec.
  await database(async client => {
    await client.query("DELETE FROM grimorio_section_parts WHERE sezione = 'bestiario' AND parte IN ('grimorio', 'homebrew') AND NOT (parte = ANY($1))", [partsBefore]);
    if (!srdOnlyBefore) await client.query("DELETE FROM grimorio_srd_only WHERE id = 1 AND NOT attiva").catch(() => undefined);
    for (const table of ["grimorio_section_parts_log", "grimorio_section_visibility_log", "grimorio_card_visibility_log", "grimorio_srd_only_log"]) {
      await client.query(`DELETE FROM ${table} WHERE creata_il >= $1`, [since]).catch(() => undefined);
    }
  });
});

test("the public list: editorial staff and community, the newest first, only what the cards show", async ({ request, browser }) => {
  const response = await request.get(PATH);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^application\/json/);
  expect(response.headers()["cache-control"]).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
  expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
  const raw = await response.text();
  const list = JSON.parse(raw);
  expect(Object.keys(list)).toEqual(["versione", "generato_il", "fonte", "nota_licenza", "creature"]);
  expect(list.versione).toBe(1);
  expect(list.fonte).toBe("https://ilgrimorio.app");
  expect(new Date(list.generato_il).toISOString()).toBe(list.generato_il);
  expect(list.nota_licenza).toContain("CC BY-NC-SA 4.0: uso solo non commerciale");

  // Included and excluded, in order of publication (newest first): never 2014, never without a licence, never a proposal.
  expect(list.creature.map(creature => creature.id).filter(id => ROWS.includes(id))).toEqual([CAT, MOTH, EYE, OURS]);
  const dates = list.creature.map(creature => creature.pubblicata_il);
  expect([...dates].sort().reverse()).toEqual(dates);

  const ours = list.creature.find(creature => creature.id === OURS);
  expect({ ...ours, scheda: undefined }).toEqual({
    id: OURS, url: `https://ilgrimorio.app/mostro/${OURS}`, origine: "redazione", autore: null,
    licenza: "© 2026 D.d.B. – Il Grimorio.App, uso consentito a Total Party Kill", licenza_url: "https://ilgrimorio.app/info",
    verificato: false, giudizio_bilanciamento: null, pubblicata_il: "2026-10-30T10:00:00.000Z", aggiornata_il: ours.aggiornata_il,
    immagine: { url: "https://ilgrimorio.app/immagini-mostri/0123456789abcdef-m.webp", alt: "Lo squartatore di prova", crediti: "Illustrazione di prova" },
    scheda: undefined,
  });
  expect(ours.scheda.storia).toBe("Storia pubblica dello squartatore.");
  expect(ours.scheda.nome).toBe("Squartatore di prova");
  for (const key of ["tattiche", "tana", "agganci", "varianti", "sezioni_nascoste"]) expect(ours.scheda, key).not.toHaveProperty(key);

  const cat = list.creature.find(creature => creature.id === CAT);
  expect(cat).toMatchObject({ origine: "community", autore: "Lia", licenza: "CC BY-NC-SA 4.0", licenza_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it",
    verificato: true, giudizio_bilanciamento: "In linea", immagine: null, url: `https://ilgrimorio.app/mostro/${CAT}` });
  expect(cat.scheda.azioni).toEqual(draft("x", "2024").azioni);
  expect(list.creature.find(creature => creature.id === MOTH).scheda.edizione).toBe("entrambe");

  // No private field, by key and by text.
  const PRIVATE = ["email", "nickname", "proposta", "proposta_id", "motivo", "note", "commento", "cronologia", "ip", "token", "impronta", "picco", "stato",
    "decisa_il", "creata_il", "homebrew_id", "bilanciamento", "sezioni_nascoste", "device_hash"];
  expect(keysOf(list).filter(key => PRIVATE.includes(key))).toEqual([]);
  for (const secret of [...Object.values(SECRET), "fuori dal gs", ...PROPOSALS, OLD, NO_LICENSE]) expect(raw, secret).not.toContain(secret);

  // The same answer for the administrator: the cookies of the reserved area change nothing.
  const { context } = await signIn(browser);
  expect(await listIds(context.request)).toEqual([CAT, MOTH, EYE, OURS]);
  await context.close();
});

test("only GET: the other methods answer 405", async ({ request }) => {
  for (const method of ["post", "put", "delete", "patch"]) {
    const response = await request[method](PATH, { data: {} });
    expect(response.status(), method).toBe(405);
  }
});

test("a card hidden with the eye, the parts «In arrivo» or hidden, the «Modalità solo SRD»: out of the list", async ({ request, browser }) => {
  test.setTimeout(240_000);
  const { context, admin } = await signIn(browser);
  // The eye of a card: its row, then a switch of /admin/sezioni refreshes the cached state as the eye does.
  await database(client => client.query(`INSERT INTO grimorio_card_visibility (tipo, scheda, nascosta) VALUES ('mostro', $1, true)
    ON CONFLICT (tipo, scheda) DO UPDATE SET nascosta = true`, [EYE]));
  await setBestiaryPart(admin, COMMUNITY_TITLE, "In arrivo");
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  expect(await listIds(request)).toEqual([CAT, MOTH, OURS]);
  expect((await request.get(`/mostro/${EYE}`)).status()).toBe(404);
  await database(client => client.query("DELETE FROM grimorio_card_visibility WHERE tipo = 'mostro' AND scheda = $1", [EYE]));

  // «Mostri del Grimorio» in arrivo, then hidden: the editorial staff goes; the community stays.
  for (const state of ["In arrivo", "Nascosta"]) {
    await setBestiaryPart(admin, GRIMORIO_TITLE, state);
    expect(await listIds(request), state).toEqual([CAT, MOTH, EYE]);
  }
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  // «I mostri creati da voi» in arrivo, then hidden: only the editorial staff.
  for (const state of ["In arrivo", "Nascosta"]) {
    await setBestiaryPart(admin, COMMUNITY_TITLE, state);
    expect(await listIds(request), state).toEqual([OURS]);
  }
  await setBestiaryPart(admin, COMMUNITY_TITLE, "Visibile");
  expect(await listIds(request)).toEqual([CAT, MOTH, EYE, OURS]);

  // «Modalità solo SRD» on: the list is empty (still a valid answer, version 1); off: as before.
  await srdOnly(admin, true);
  const empty = await (await request.get(PATH)).json();
  expect(empty.versione).toBe(1);
  expect(empty.creature).toEqual([]);
  await srdOnly(admin, false);
  expect(await listIds(request)).toEqual([CAT, MOTH, EYE, OURS]);
  await context.close();
});

test("not in the sitemap", async ({ request }) => {
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/api/tpk");
});
