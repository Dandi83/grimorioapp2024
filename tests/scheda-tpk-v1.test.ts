// Scheda TPK v1 (file condiviso con Il Grimorio.App): codifica, decodifica, validazione strutturale, id pubblici.
// Usa solo il file condiviso: si copia identico nel Grimorio (aggiornando il percorso dell'import).
import { afterEach, describe, expect, test, vi } from 'vitest';
import { decodeHash, encodeParty, encodePg, idPubblicoIncantesimo, idSalvatoIncantesimo, validaScheda, type SchedaV1 } from '../lib/shared/scheda-tpk-v1';

/** Un mago di 4º livello con il libro pieno: il PG più lungo da codificare. */
const MAGO: SchedaV1 = {
  v: 1,
  n: 'Aldric il Grigio',
  c: 'mago',
  sc: 'mago/invocatore',
  l: 4,
  sp: 'elfo',
  so: 'alto',
  sa: 'int',
  st: 'spruzzo-velenoso',
  bg: 'sapiente',
  base: [8, 12, 13, 15, 14, 10],
  bb: { int: 2, cos: 1 },
  sk: ['arcano', 'storia', 'indagare', 'medicina'],
  ft: [
    { id: 'iniziato-alla-magia', o: 'bg', p: { lista: 'mago', car: 'int', tr: ['stretta-folgorante', 'colpo-accurato'], inc: 'vita-falsata' } },
    { id: 'aumento-dei-punteggi-di-caratteristica', o: 4, p: { int: 2 } },
  ],
  ms: [],
  tr: ['dardo-di-fuoco', 'raggio-di-gelo', 'fiotto-acido', 'tocco-gelido'],
  pr: ['dardo-incantato', 'mani-brucianti', 'scudo', 'onda-tonante', 'sonno', 'raggio-rovente', 'immagine-speculare'],
  lb: ['dardo-incantato', 'mani-brucianti', 'scudo', 'sonno', 'onda-tonante', 'armatura-magica', 'raggio-di-infermita', 'spruzzo-colorato', 'raggio-rovente', 'frantumare', 'immagine-speculare', 'sfocatura', 'ragnatela', 'passo-velato'],
  cs: {},
  lv: { 2: { pf: 5 }, 3: { pf: 5 }, 4: { pf: 5 } },
  eq: { k: 'A', bgA: true },
  calc: { pf: 26, ca: 12, cd: 15, att: 7, ini: 2, vel: 9 },
};
const party = (): SchedaV1[] => [MAGO, { ...MAGO, n: 'Brenna', c: 'druido', sc: 'druido/terra', cs: { po: 'mago', land: 'polare' }, lb: undefined }, { ...MAGO, n: 'Torvald', c: 'barbaro', sc: 'barbaro/berserker', ms: ['ascia-bipenne', 'ascia', 'giavellotto'], tr: [], pr: [], lb: undefined }, { ...MAGO, n: 'Morwen', c: 'warlock', sc: 'warlock/immondo', cs: { inv: ['armatura-ombre', 'deflagrazione-agonizzante', 'mente-occulta'] }, lb: undefined }];

afterEach(() => vi.unstubAllGlobals());

describe('codifica e decodifica', () => {
  test('#pg= compresso, andata e ritorno', async () => {
    const hash = await encodePg(MAGO);
    expect(hash.startsWith('#pg=')).toBe(true);
    expect(hash).toMatch(/^#pg=[A-Za-z0-9_-]+$/);
    const r = await decodeHash(hash);
    expect(r).toEqual({ ok: true, party: false, schede: [MAGO] });
  });

  test('#pg0= senza CompressionStream, e si legge anche dove c’è', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const hash = await encodePg(MAGO);
    expect(hash.startsWith('#pg0=')).toBe(true);
    vi.unstubAllGlobals();
    expect(await decodeHash(hash)).toEqual({ ok: true, party: false, schede: [MAGO] });
  });

  test('#party= con 4 PG; più di 4 rifiutati', async () => {
    const hash = await encodeParty(party());
    expect(hash.startsWith('#party=')).toBe(true);
    const r = await decodeHash(hash);
    expect(r.ok && r.party && r.schede.map((s) => s.n)).toEqual(['Aldric il Grigio', 'Brenna', 'Torvald', 'Morwen']);
    await expect(encodeParty([...party(), MAGO])).rejects.toThrow();
  });

  test('lunghezza dei link: PG di 4º sotto 900 caratteri, party di 4 sotto 2.000', async () => {
    const pg = `https://ilgrimorio.app/personaggi${await encodePg(MAGO)}`;
    const p4 = `https://ilgrimorio.app/personaggi${await encodeParty(party())}`;
    expect(pg.length).toBeLessThan(900);
    expect(p4.length).toBeLessThan(2000);
  });

  test('link non validi o danneggiati', async () => {
    expect(await decodeHash('#altro=abc')).toMatchObject({ ok: false });
    expect(await decodeHash('#pg=!!!')).toMatchObject({ ok: false });
    expect(await decodeHash('#pg=AAAA')).toMatchObject({ ok: false, errore: 'Il link è danneggiato: i dati non si leggono.' });
    const bad = await encodePg({ ...MAGO, sp: 'mezzorco' } as SchedaV1);
    const r = await decodeHash(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errori?.[0]).toContainEqual({ campo: 'sp', messaggio: "Specie «mezzorco»: non presente nell'SRD 5.2.1" });
  });
});

describe('validazione strutturale per campo', () => {
  const err = (patch: Record<string, unknown>) => validaScheda({ ...MAGO, ...patch });
  test('la scheda d’esempio è valida', () => expect(validaScheda(MAGO)).toEqual([]));
  test.each([
    [{ v: 2 }, 'v', 'Versione «2»: non supportata (attesa 1)'],
    [{ n: ' ' }, 'n', 'Nome: mancante'],
    [{ c: 'artefice' }, 'c', "Classe «artefice»: non presente nell'SRD 5.2.1"],
    [{ sp: 'mezzorco' }, 'sp', "Specie «mezzorco»: non presente nell'SRD 5.2.1"],
    [{ so: 'grigio' }, 'so', "Opzione di specie «grigio»: non presente nell'SRD 5.2.1"],
    [{ bg: 'nobile' }, 'bg', "Background «nobile»: non presente nell'SRD 5.2.1"],
    [{ l: 5 }, 'l', 'Livello 5: per ora sono ammessi i livelli 1–4'],
    [{ l: 21 }, 'l', 'Livello «21»: deve essere un numero intero da 1 a 20'],
    [{ sc: 'mago/necromante' }, 'sc', "Sottoclasse «mago/necromante»: non presente nell'SRD 5.2.1"],
    [{ sc: 'chierico/vita' }, 'sc', 'Sottoclasse «chierico/vita»: non appartiene alla classe mago'],
    [{ l: 2, sc: 'mago/invocatore' }, 'sc', 'Sottoclasse: si sceglie dal 3º livello'],
    [{ sk: ['volare'] }, 'sk', "Abilità «volare»: non presente nell'SRD 5.2.1"],
    [{ ft: [{ id: 'fortunato' }] }, 'ft', "Talento «fortunato»: non presente nell'SRD 5.2.1"],
    [{ cs: { fs: 'protezione' } }, 'cs.fs', "Stile di combattimento «protezione»: non presente nell'SRD 5.2.1"],
    [{ eq: { k: 'D', bgA: true } }, 'eq', 'Equipaggiamento: serve {k: "A" o "B", bgA: sì/no}'],
  ])('%o → %s', (patch, campo, messaggio) => expect(err(patch)).toContainEqual({ campo, messaggio }));

  test('caratteristiche: schieramento standard o compravendita a 27 punti', () => {
    expect(err({ base: [15, 15, 15, 8, 8, 8] })).toEqual([]);
    expect(err({ base: [13, 13, 13, 12, 12, 12] })).toEqual([]);
    expect(err({ base: [16, 14, 13, 12, 10, 8] }).map((e) => e.campo)).toEqual(['base']);
    expect(err({ base: [15, 15, 15, 15, 8, 8] }).map((e) => e.campo)).toEqual(['base']);
  });

  test('bonus del background: +2/+1 o +1/+1/+1 sulle sue caratteristiche', () => {
    expect(err({ bb: { cos: 1, int: 1, sag: 1 } })).toEqual([]);
    expect(err({ bb: { for: 2, int: 1 } }).map((e) => e.campo)).toEqual(['bb']);
    expect(err({ bb: { int: 2, sag: 2 } }).map((e) => e.campo)).toEqual(['bb']);
  });

  test('il tipo regge fino al 20º livello', () => {
    const e = err({ l: 20 });
    expect(e).toEqual([{ campo: 'l', messaggio: 'Livello 20: per ora sono ammessi i livelli 1–4' }]);
  });
});

describe('id pubblici degli incantesimi', () => {
  test('salvato → pubblico e ritorno', () => {
    expect(idPubblicoIncantesimo('risata-incontenibile-di-tasha')).toBe('risata-incontenibile');
    expect(idPubblicoIncantesimo('freccia-acida-di-melf')).toBe('freccia-acida');
    expect(idSalvatoIncantesimo('risata-incontenibile')).toBe('risata-incontenibile-di-tasha');
    expect(idPubblicoIncantesimo('dardo-incantato')).toBe('dardo-incantato');
    expect(idSalvatoIncantesimo('dardo-incantato')).toBe('dardo-incantato');
  });
});
