// Scheda TPK v1: formato comune per scambiare personaggi tra Total Party Kill e Il Grimorio.App.
// File AUTONOMO (nessun import): si copia identico in entrambi i repository.
// Il link porta i dati dopo "#" (non arrivano a nessun server):
//   #pg=<dati>      un PG, JSON compresso (deflate-raw) in base64url
//   #pg0=<dati>     un PG, JSON non compresso in base64url (browser senza CompressionStream)
//   #party=<dati>   da 1 a 4 PG (array), compresso; #party0= non compresso
// Validazione solo STRUTTURALE (forma, versione, id negli elenchi SRD 5.2.1): le regole
// di legalità (numero di incantesimi, liste di classe…) sono di chi importa.

export type Caratteristica = 'for' | 'des' | 'cos' | 'int' | 'sag' | 'car';
export const CARATTERISTICHE: readonly Caratteristica[] = ['for', 'des', 'cos', 'int', 'sag', 'car'];

export const CLASSI = ['barbaro', 'bardo', 'chierico', 'druido', 'guerriero', 'ladro', 'mago', 'monaco', 'paladino', 'ranger', 'stregone', 'warlock'] as const;
export type ClasseV1 = (typeof CLASSI)[number];

export const SOTTOCLASSI = ['barbaro/berserker', 'bardo/sapienza', 'chierico/vita', 'druido/terra', 'guerriero/campione', 'ladro/furfante', 'mago/invocatore', 'monaco/mano-aperta', 'paladino/devozione', 'ranger/cacciatore', 'stregone/draconica', 'warlock/immondo'] as const;

/** Specie e loro opzioni (lignaggio, antenato draconico, discendenza gigantica, retaggio immondo). */
export const SPECIE: Readonly<Record<string, readonly string[]>> = {
  dragonide: ['argento', 'bianco', 'blu', 'bronzo', 'nero', 'oro', 'ottone', 'rame', 'rosso', 'verde'],
  elfo: ['drow', 'alto', 'boschi'],
  gnomo: ['foreste', 'rocce'],
  goliath: ['nuvole', 'fuoco', 'gelo', 'colline', 'pietra', 'tempesta'],
  halfling: [],
  nano: [],
  orco: [],
  tiefling: ['abissale', 'ctonio', 'infernale'],
  umano: [],
};

/** Background e le tre caratteristiche che possono aumentare. */
export const BACKGROUND: Readonly<Record<string, readonly Caratteristica[]>> = {
  accolito: ['int', 'sag', 'car'],
  criminale: ['des', 'cos', 'int'],
  sapiente: ['cos', 'int', 'sag'],
  soldato: ['for', 'des', 'cos'],
};

export const ABILITA = ['acrobazia', 'addestrare-animali', 'arcano', 'atletica', 'furtivita', 'indagare', 'inganno', 'intimidire', 'intrattenere', 'intuizione', 'medicina', 'natura', 'percezione', 'persuasione', 'rapidita-di-mano', 'religione', 'sopravvivenza', 'storia'] as const;

export const TALENTI = ['abile', 'aggressore-selvaggio', 'allerta', 'iniziato-alla-magia', 'aumento-dei-punteggi-di-caratteristica', 'lottatore', 'combattere-con-armi-possenti', 'combattere-con-due-armi', 'difesa', 'tiro'] as const;
/** Talenti di Stile di combattimento (cs.fs). */
export const STILI = ['combattere-con-armi-possenti', 'combattere-con-due-armi', 'difesa', 'tiro'] as const;

export const ORDINI_DIVINI = ['protettore', 'taumaturgo'] as const;
export const ORDINI_PRIMORDIALI = ['custode', 'mago'] as const;
export const PREDE = ['sterminatore-di-colossi', 'devastatore-dell-orda'] as const;
export const TERRE = ['arida', 'polare', 'temperata', 'tropicale'] as const;

/** Livello massimo accettato per ora (il formato regge fino al 20º). */
export const LIVELLO_MAX = 4;

export interface TalentoV1 {
  id: string;
  /** Da dove viene: "bg" background, "sp" specie (umano Versatile), oppure il livello di classe. */
  o?: 'bg' | 'sp' | number;
  /** Parametri: iniziato-alla-magia {lista, car, tr, inc}; aumento-dei-punteggi-di-caratteristica {for: 2…}; abile {sk}. */
  p?: Record<string, string | number | string[]>;
}

export interface SchedaV1 {
  v: 1;
  /** Nome. */
  n: string;
  /** Classe. */
  c: ClasseV1;
  /** Sottoclasse "classe/sottoclasse" (dal 3º livello). */
  sc?: string;
  /** Livello (1–20). */
  l: number;
  /** Specie e sua opzione. */
  sp: string;
  so?: string;
  /** Caratteristica da incantatore dei tratti di specie (int, sag, car). */
  sa?: Caratteristica;
  /** Trucchetto di specie (id pubblico dell'incantesimo). */
  st?: string;
  bg: string;
  /** Caratteristiche prima del background, in ordine For Des Cos Int Sag Car. */
  base: number[];
  /** Bonus del background: +2/+1 oppure +1/+1/+1. */
  bb: Partial<Record<Caratteristica, number>>;
  /** Abilità con competenza. */
  sk: string[];
  /** Talenti con parametri. */
  ft: TalentoV1[];
  /** Armi con la padronanza. */
  ms: string[];
  /** Trucchetti, incantesimi preparati e libro (mago): id pubblici. */
  tr: string[];
  pr: string[];
  lb?: string[];
  /** Scelte di classe: stile, ordine divino, ordine primordiale, suppliche, preda del cacciatore, terra del circolo. */
  cs: { fs?: string; do?: string; po?: string; inv?: string[]; hp?: string; land?: string };
  /** Scelte per livello ("2".."20"): punti ferita guadagnati. */
  lv?: Record<string, { pf?: number }>;
  /** Equipaggiamento iniziale: opzione della classe e opzione A del background. */
  eq: { k: 'A' | 'B' | 'C'; bgA: boolean };
  /** Ritratto (seme o nome). */
  pt?: string | number;
  /** Valori calcolati da chi esporta (solo da mostrare). */
  calc?: { pf: number; ca: number; cd?: number; att?: number; ini: number; vel: number };
}

export interface ErroreCampo {
  campo: string;
  messaggio: string;
}

// ---------------------------------------------------------------- id pubblici degli incantesimi
// Tabella generata da scripts/import-srd.mjs (data-src/srd/public-spell-ids.json del Grimorio):
// identificativo salvato -> indirizzo pubblico /spell/<id>.
// <tabella-id-pubblici>
const ID_PUBBLICI: Readonly<Record<string, string>> = {
  "armatura-di-agathis": "armatura-di-agata-2014",
  "armatura-di-agathys": "armatura-di-agata",
  "aura-magica-di-nystul": "aura-magica-dell-arcanista",
  "braccia-di-hadar-2": "braccia-di-ada-2014",
  "braccia-di-hadar": "braccia-di-ada",
  "calderone-ribollente-di-tasha": "calderone-ribollente-di-ash",
  "capanna-di-leomund": "capanna",
  "disco-fluttuante-di-tenser": "disco-fluttuante",
  "evocazioni-istantanee-di-drawmij": "evocazioni-istantanee",
  "fame-di-hadar-2": "fame-di-ada-2014",
  "fame-di-hadar": "fame-di-ada",
  "freccia-acida-di-melf": "freccia-acida",
  "i-re-spirare-sott-acqua-2": "respirare-sott-acqua",
  "legame-telepatico-di-rary": "legame-telepatico",
  "mano-di-bigby": "mano-arcana",
  "presenza-regale-di-yolande": "presenza-regale-di-iolanda",
  "reggia-meravigliosa-di-mordenkainen": "reggia-meravigliosa",
  "risata-incontenibile-di-tasha": "risata-incontenibile",
  "santuario-privato-di-mordenkainen": "santuario-privato",
  "scrigno-segreto-di-leomund": "scrigno-segreto",
  "segugio-fedele-di-mordenkainen": "segugio-fedele",
  "sfera-congelante-di-0tiluke": "sfera-congelante",
  "sfera-elastica-di-0tiluke": "sfera-elastica",
  "spada-di-mordenkainen": "spada-arcana",
  "tentacoli-neri-di-evard": "tentacoli-neri",
  "veleni": "individuazione-delle-malattie-e-dei-veleni",
};
// </tabella-id-pubblici>
const ID_SALVATI: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(ID_PUBBLICI).map(([a, b]) => [b, a]));

/** Id salvato dell'incantesimo -> id pubblico (indirizzo /spell/<id> del Grimorio). */
export function idPubblicoIncantesimo(id: string): string {
  return ID_PUBBLICI[id] ?? id;
}
/** Id pubblico -> id salvato. */
export function idSalvatoIncantesimo(id: string): string {
  return ID_SALVATI[id] ?? id;
}

// ---------------------------------------------------------------- validazione strutturale

const COSTO_PUNTI: Readonly<Record<number, number>> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');

/** Caratteristiche base valide: schieramento standard o compravendita a 27 punti. */
export function baseValida(base: number[]): boolean {
  if (base.length !== 6 || !base.every(isInt)) return false;
  if ([...base].sort((a, b) => b - a).join() === '15,14,13,12,10,8') return true;
  return base.every((v) => v in COSTO_PUNTI) && base.reduce((s, v) => s + COSTO_PUNTI[v], 0) <= 27;
}

/** Bonus del background: +2/+1 o +1/+1/+1 sulle sue tre caratteristiche. */
export function bonusValido(bg: string, bb: Partial<Record<Caratteristica, number>>): boolean {
  const ab = BACKGROUND[bg];
  if (!ab || !isObj(bb)) return false;
  const e = Object.entries(bb).filter(([, v]) => v);
  if (!e.every(([k, v]) => ab.includes(k as Caratteristica) && isInt(v))) return false;
  const vals = e.map(([, v]) => v as number).sort().join();
  return vals === '1,2' || vals === '1,1,1';
}

/** Controlla la forma di una scheda. Restituisce gli errori per campo (vuoto = valida). */
export function validaScheda(x: unknown): ErroreCampo[] {
  const err: ErroreCampo[] = [];
  const no = (campo: string, messaggio: string) => err.push({ campo, messaggio });
  const fuoriSrd = (campo: string, nome: string, v: unknown) => no(campo, `${nome} «${String(v)}»: non presente nell'SRD 5.2.1`);
  if (!isObj(x)) return [{ campo: 'scheda', messaggio: 'Scheda: non è un oggetto' }];
  if (x.v !== 1) no('v', `Versione «${String(x.v)}»: non supportata (attesa 1)`);
  if (typeof x.n !== 'string' || !x.n.trim()) no('n', 'Nome: mancante');
  else if (x.n.length > 40) no('n', 'Nome: troppo lungo (massimo 40 caratteri)');
  if (!CLASSI.includes(x.c as ClasseV1)) fuoriSrd('c', 'Classe', x.c);
  if (!isInt(x.l) || x.l < 1 || x.l > 20) no('l', `Livello «${String(x.l)}»: deve essere un numero intero da 1 a 20`);
  else if (x.l > LIVELLO_MAX) no('l', `Livello ${x.l}: per ora sono ammessi i livelli 1–${LIVELLO_MAX}`);
  if (x.sc !== undefined) {
    if (!(SOTTOCLASSI as readonly string[]).includes(x.sc as string)) fuoriSrd('sc', 'Sottoclasse', x.sc);
    else if (!(x.sc as string).startsWith(`${String(x.c)}/`)) no('sc', `Sottoclasse «${String(x.sc)}»: non appartiene alla classe ${String(x.c)}`);
    else if (isInt(x.l) && x.l < 3) no('sc', 'Sottoclasse: si sceglie dal 3º livello');
  }
  const opz = SPECIE[x.sp as string];
  if (!opz) fuoriSrd('sp', 'Specie', x.sp);
  else if (x.so !== undefined && !opz.includes(x.so as string)) fuoriSrd('so', 'Opzione di specie', x.so);
  else if (x.so === undefined && opz.length) no('so', `Opzione di specie: mancante per ${String(x.sp)}`);
  if (x.sa !== undefined && !['int', 'sag', 'car'].includes(x.sa as string)) no('sa', `Caratteristica della specie «${String(x.sa)}»: deve essere Intelligenza, Saggezza o Carisma`);
  if (x.st !== undefined && (typeof x.st !== 'string' || !SLUG.test(x.st))) no('st', 'Trucchetto di specie: id non valido');
  if (!BACKGROUND[x.bg as string]) fuoriSrd('bg', 'Background', x.bg);
  if (!Array.isArray(x.base) || !baseValida(x.base as number[])) no('base', 'Caratteristiche: servono sei valori dallo schieramento standard (15, 14, 13, 12, 10, 8) o dalla compravendita a 27 punti (8–15)');
  if (BACKGROUND[x.bg as string] && !bonusValido(x.bg as string, x.bb as Partial<Record<Caratteristica, number>>)) no('bb', `Bonus del background: +2/+1 o +1/+1/+1 su ${BACKGROUND[x.bg as string].join(', ')}`);
  if (!isStrArr(x.sk)) no('sk', 'Abilità: elenco mancante');
  else for (const s of x.sk) if (!(ABILITA as readonly string[]).includes(s)) fuoriSrd('sk', 'Abilità', s);
  if (!Array.isArray(x.ft)) no('ft', 'Talenti: elenco mancante');
  else
    for (const f of x.ft) {
      if (!isObj(f) || !(TALENTI as readonly string[]).includes(f.id as string)) fuoriSrd('ft', 'Talento', isObj(f) ? f.id : f);
      else if (f.p !== undefined && !isObj(f.p)) no('ft', `Talento «${String(f.id)}»: parametri non validi`);
      else if (f.o !== undefined && f.o !== 'bg' && f.o !== 'sp' && !isInt(f.o)) no('ft', `Talento «${String(f.id)}»: origine non valida`);
    }
  for (const k of ['ms', 'tr', 'pr'] as const) if (!isStrArr(x[k]) || !(x[k] as string[]).every((s) => SLUG.test(s))) no(k, `${{ ms: 'Padronanze', tr: 'Trucchetti', pr: 'Incantesimi preparati' }[k]}: elenco di id non valido`);
  if (x.lb !== undefined && (!isStrArr(x.lb) || !x.lb.every((s) => SLUG.test(s)))) no('lb', 'Libro degli incantesimi: elenco di id non valido');
  if (!isObj(x.cs)) no('cs', 'Scelte di classe: mancanti');
  else {
    const cs = x.cs;
    const tra = (k: string, nome: string, ok: readonly string[]) => cs[k] !== undefined && !ok.includes(cs[k] as string) && fuoriSrd(`cs.${k}`, nome, cs[k]);
    tra('fs', 'Stile di combattimento', STILI);
    tra('do', 'Ordine divino', ORDINI_DIVINI);
    tra('po', 'Ordine primordiale', ORDINI_PRIMORDIALI);
    tra('hp', 'Preda del cacciatore', PREDE);
    tra('land', 'Terra del Circolo', TERRE);
    if (cs.inv !== undefined && !isStrArr(cs.inv)) no('cs.inv', 'Suppliche occulte: elenco non valido');
  }
  if (x.lv !== undefined && (!isObj(x.lv) || !Object.entries(x.lv).every(([k, v]) => /^([2-9]|1[0-9]|20)$/.test(k) && isObj(v)))) no('lv', 'Scelte per livello: chiavi da "2" a "20"');
  if (!isObj(x.eq) || !['A', 'B', 'C'].includes(x.eq.k as string) || typeof x.eq.bgA !== 'boolean') no('eq', 'Equipaggiamento: serve {k: "A" o "B", bgA: sì/no}');
  if (x.pt !== undefined && typeof x.pt !== 'string' && typeof x.pt !== 'number') no('pt', 'Ritratto: valore non valido');
  if (x.calc !== undefined && (!isObj(x.calc) || !Object.values(x.calc).every((v) => typeof v === 'number'))) no('calc', 'Valori calcolati: devono essere numeri');
  return err;
}

// ---------------------------------------------------------------- codifica

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
const compressione = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function encode(dati: unknown, chiave: 'pg' | 'party'): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(dati));
  if (!compressione()) return `#${chiave}0=${b64url(bytes)}`;
  return `#${chiave}=${b64url(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
}

/** Codifica un PG: "#pg=…" (o "#pg0=…" senza CompressionStream). */
export function encodePg(s: SchedaV1): Promise<string> {
  return encode(s, 'pg');
}
/** Codifica un party di 1–4 PG: "#party=…". */
export function encodeParty(list: SchedaV1[]): Promise<string> {
  if (!list.length || list.length > 4) return Promise.reject(new Error('Un party ha da 1 a 4 personaggi'));
  return encode(list, 'party');
}

export type Decodifica =
  | { ok: true; party: boolean; schede: SchedaV1[] }
  | { ok: false; errore: string; errori?: ErroreCampo[][]; grezzi?: unknown[] };

/** Legge la parte dopo "#" di un link e valida le schede. */
export async function decodeHash(hash: string): Promise<Decodifica> {
  const m = /^#?(pg|pg0|party|party0)=([A-Za-z0-9_-]+)$/.exec(hash.trim());
  if (!m) return { ok: false, errore: 'Il link non contiene un personaggio (#pg= o #party=).' };
  const [, chiave, dati] = m;
  let json: unknown;
  try {
    let bytes = unb64url(dati);
    if (!chiave.endsWith('0')) {
      if (!compressione()) return { ok: false, errore: 'Questo browser non sa leggere i link compressi.' };
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    }
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, errore: 'Il link è danneggiato: i dati non si leggono.' };
  }
  const party = chiave.startsWith('party');
  const list = party ? json : [json];
  if (!Array.isArray(list) || !list.length || list.length > 4) return { ok: false, errore: 'Un party ha da 1 a 4 personaggi.' };
  const errori = list.map(validaScheda);
  if (errori.some((e) => e.length)) return { ok: false, errore: list.length > 1 ? 'Alcune schede non sono valide.' : 'La scheda non è valida.', errori, grezzi: list };
  return { ok: true, party, schede: list as SchedaV1[] };
}
