import { BAND, FAR_COUNT, FAR_LIMIT, MAX_OUT, MIN_GROUP } from "./monster-balance/compare";
import { cleric, fighter, heroDc, party, rogue, wizard } from "./monster-balance/party";
import { BASE_FIGHTS, REFERENCE_FIGHTS, STRESS, STRESS_FIGHTS } from "./monster-balance/scenarios";
import { TACTICS } from "./monster-balance/simulate";

/**
 * «Come valutiamo il bilanciamento» (PROMPT 19): the method of the Bilanciamento in plain words, for the public page
 * (/bestiario/creati-da-voi/bilanciamento) and docs/metodo-bilanciamento.md (tests/balance-method.cjs checks that the
 * two say the same). Only the method: never a number of a monster, never anything of the reserved area.
 */
/** «3.000»: the Italian format of the browsers does not group numbers of 4 digits. */
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const inTen = Math.round((BAND.high - BAND.low) * 10);
const percentile = (fraction: number) => `${Math.round(fraction * 100)}°`;

/**
 * The calibration (PROMPT 26): the SRD monsters judged with the rule, each against its group without itself. Written
 * here because the page never reads the data of the monsters; tests/balance-calibration.cjs checks these numbers
 * against lib/monster-balance/calibration.ts and fails when the data or the rule change them.
 */
export const CALIBRATION = {
  2014: { total: 319, inLine: 266, check: 43, out: 10 },
  2024: { total: 328, inLine: 267, check: 60, out: 1 },
} as const;
const share = ({ inLine, total }: { inLine: number; total: number }) => `${inLine} su ${total} (${Math.round((inLine / total) * 100)}%)`;

export const METHOD_TITLE = "Come valutiamo il bilanciamento";
export const METHOD_INTRO = "Ogni creatura originale, di «I mostri creati da voi» e dei «Mostri del Grimorio», passa da un controllo prima di essere pubblicata: la mettiamo alla prova contro un gruppo di personaggi e la confrontiamo con i mostri ufficiali dello stesso Grado di sfida (GS). Ecco come funziona, senza segreti. La pillola «✓ Bilanciamento verificato» compare sulle schede risultate «in linea», quando la redazione la conferma.";

export const METHOD_STEPS: { title: string; text: string }[] = [
  {
    title: "I numeri di base",
    text: "Leggiamo la scheda come la leggerebbe un master: Classe Armatura, punti ferita, tiri salvezza, attacchi e danni, capacità a ricarica, azioni leggendarie, resistenze e rigenerazione. Poi confrontiamo Classe Armatura, bonus per colpire e CD con quelli dei mostri ufficiali dello stesso GS.",
  },
  {
    title: "Migliaia di combattimenti",
    text: `La creatura affronta ${thousands(BASE_FIGHTS)} volte, per ogni modo di giocarla, un gruppo di riferimento di ${party(1).length} personaggi (guerriero, chierico, ladro e mago) di livello pari al suo GS, da 1 a 20. Misuriamo i danni che fa a ogni round, quanti round resiste e quanto spesso un personaggio finisce a terra. Facciamo lo stesso con i mostri ufficiali dell’SRD (5.1 per il 2014, 5.2.1 con gli animali per il 2024): per ogni misura c’è una fascia, quella dove si trovano ${inTen} mostri ufficiali su 10 del suo GS. Con questa regola, circa 8 mostri ufficiali su 10 risultano "in linea": ${share(CALIBRATION[2014])} nel 2014 e ${share(CALIBRATION[2024])} nel 2024.`,
  },
  {
    title: "Tre modi di giocarlo",
    text: `Un mostro deve restare del suo GS qualunque scelta faccia il master. Lo proviamo con ${TACTICS.length} stili: ottimale (sceglie sempre la mossa che fa più danni), a caso (sceglie a caso tra le azioni disponibili) e prudente (preferisce il multiattacco e usa le capacità a ricarica una volta su due). Il giudizio guarda i tre stili insieme: sei misure in tutto, danni e round per ognuno. È «in linea» con al massimo ${MAX_OUT} misure fuori dalla fascia, come capita anche ai mostri ufficiali.`,
  },
  {
    title: "Gruppi diversi e controlli extra",
    text: `Lo mettiamo alla prova anche in ${STRESS.length} situazioni: gruppi di 3, 5 e 6 personaggi, personaggi di un livello in meno o in più, un gruppo tutto armi e uno tutto magia. Queste prove non cambiano il giudizio, ma ci avvisano se il mostro stermina il gruppo, resiste o vince molto più dei mostri ufficiali. Controlliamo poi cose che il GS non misura: condizioni che bloccano un personaggio senza un nuovo tiro salvezza, colpi che abbattono un personaggio in un solo turno, mostri forti senza abbastanza azioni per stare da soli, difese che lasciano poche contromosse e numeri fuori scala.`,
  },
  {
    title: "La prova del tavolo",
    text: "La simulazione è solo l’inizio. In fondo a ogni scheda chi l’ha giocata può dirci se è stata troppo facile, giusta o troppo difficile rispetto al suo GS. Dopo 5 prove mostriamo il conteggio, e confrontiamo i voti dei master con il giudizio del simulatore.",
  },
];

export const METHOD_LIMITS_TITLE = "Cosa il simulatore non sa fare";
export const METHOD_LIMITS: string[] = [
  "Posizioni, coperture e terreno: il combattimento è senza mappa.",
  "Gli incantesimi di controllo dei personaggi, che bloccano, rallentano o allontanano il mostro.",
  "Gli oggetti magici e le tattiche furbe dei giocatori.",
  "Il vostro gruppo: quello del simulatore è un modello, il vostro tavolo è diverso.",
];
export const METHOD_LIMITS_CLOSING = "È una stima seria, non una garanzia. Il giudizio finale resta al master, e al tavolo.";
export const METHOD_REPORT = "Hai trovato un errore nel metodo o in una scheda? Scrivici da Info → Segnala un problema.";

export const METHOD_DETAILS_TITLE = "Per chi vuole i dettagli";

/** The thresholds of the verdict, in words. */
export const METHOD_THRESHOLDS: string[] = [
  `La fascia: dal ${percentile(BAND.low)} al ${percentile(BAND.high)} percentile dei mostri ufficiali dello stesso GS, della stessa edizione e con lo stesso modo di giocare (${inTen} su 10).`,
  `Le misure: danni a round e round di resistenza, per ciascuno dei tre modi di giocare; sei in tutto.`,
  `In linea: al massimo ${MAX_OUT} misure su 6 fuori dalla fascia.`,
  `Fuori dal GS: almeno ${FAR_COUNT} misure fuori dalla fascia di più del ${FAR_LIMIT}%.`,
  "Da controllare: tutti gli altri casi.",
  `Taratura sui mostri ufficiali: ognuno, confrontato con il suo gruppo senza sé stesso, riceve il giudizio come una creatura nuova. Con questa regola risultano «in linea» ${share(CALIBRATION[2014])} nel 2014 e ${share(CALIBRATION[2024])} nel 2024; «fuori dal GS» ${CALIBRATION[2014].out} nel 2014 e ${CALIBRATION[2024].out} nel 2024. La stessa regola vale per tutti, senza eccezioni per singoli mostri.`,
  `Gruppo di confronto: almeno ${MIN_GROUP} mostri ufficiali dello stesso GS e della stessa edizione; se sono meno, si aggiungono quelli dei GS vicini.`,
  `Combattimenti: ${thousands(BASE_FIGHTS)} per ogni modo di giocare e ${thousands(STRESS_FIGHTS)} per ogni situazione di prova; ${thousands(REFERENCE_FIGHTS)} per ogni modo di giocare dei mostri ufficiali, sempre con lo stesso seme, così il calcolo dà sempre lo stesso risultato.`,
  `Situazioni di prova: un avviso quando la creatura stermina il gruppo o resiste più del ${percentile(BAND.high)} percentile dei mostri ufficiali nella stessa situazione, o quando i personaggi vincono meno del ${percentile(BAND.low)} percentile. Ogni avviso scatta al massimo su 1 mostro ufficiale su 10.`,
];

/** The warnings of the checks the CR does not measure. */
export const METHOD_WARNINGS: string[] = [
  "Controllo pesante: paralizzato, pietrificato, stordito, privo di sensi o incapacitato per più di un turno senza poter ripetere il tiro salvezza; più forte a GS 4 o meno.",
  "In un colpo solo: un personaggio passa da punti ferita pieni a 0 in un solo turno del mostro (azioni leggendarie comprese) più spesso del 95° percentile dei mostri ufficiali.",
  "Economia d’azione: GS 5 o più senza multiattacco, senza azioni bonus e senza azioni leggendarie, quindi da solo rischia di essere sopraffatto.",
  "Poche contromosse: resistenza ai danni contundenti, perforanti e taglienti a GS 8 o meno; immunità a 6 condizioni o più; resistenza alla magia insieme alle resistenze leggendarie a GS 10 o meno.",
  "Numeri fuori scala: Classe Armatura, bonus per colpire o CD fuori dalla fascia dei mostri ufficiali dello stesso GS, con il valore tipico.",
];

/** The reference group level by level: what the characters have (the same numbers the simulator uses). */
export function referenceTable() {
  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const heroes = party(level), f = fighter(level), c = cleric(level), r = rogue(level), w = wizard(level);
    const dice = (list: { count: number; sides: number; flat: number }[]) => list.map(item => `${item.count}d${item.sides}${item.flat ? ` + ${item.flat}` : ""}`).join(" + ");
    return {
      level,
      ac: heroes.map(hero => hero.ac).join(" / "),
      hp: heroes.map(hero => hero.hp).join(" / "),
      attacks: `${f.attacks} × +${f.toHit}`,
      damage: `guerriero ${dice(f.damage)}; ladro ${dice(r.damage)}; mago ${dice(w.cantrip.damage)}${c.aura ? `; chierico ${dice([c.aura])} ad area` : ""}`,
      dc: heroDc(level),
    };
  });
}
