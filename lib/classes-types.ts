/** Classes of the Compendio (/classi): shapes shared by the 2024 and 2014 data files. */

export type ClassEdition = "2024" | "2014";

/** A paragraph as printed; `etichetta` is its bold-italic run-in label (part of `testo`). */
export interface ClassParagraph { tipo: "p"; testo: string; etichetta?: string; pagina?: number }
export interface ClassInnerTable { tipo: "tabella"; titolo: string; colonne: string[]; righe: string[][]; pagina?: number }
/** A sub-heading inside a feature (2014: options of a feature, «Trucchetti», «Slot incantesimo»). */
export interface ClassHeading { tipo: "h"; testo: string; pagina?: number }
/** A boxed sidebar of the manual («Giuramenti infranti»). */
export interface ClassSidebar { tipo: "riquadro"; titolo: string; paragrafi: { testo: string; etichetta?: string }[]; pagina?: number }
export type ClassBlock = ClassParagraph | ClassHeading | ClassInnerTable | ClassSidebar;

export interface ClassFeature { livello: number; titolo: string; contenuto: ClassBlock[]; pagina: number }

export interface ClassLevelTable {
  titolo: string;
  colonne: string[];
  /** 20 rows, one per level, as many cells as columns. */
  righe: string[][];
  /** «—Slot incantesimo per livello di incantesimo—» over the columns from `da` to `a` (indexes). */
  gruppo?: { testo: string; da: number; a: number };
  pagina: number;
  /** Block of the manual entry holding the title, when it is not the table's own block. */
  titoloBlocco?: number;
}

export interface ClassSpellList {
  titolo: string;
  intro: ClassBlock[];
  livelli: { livello: number; titolo: string; voci: { nome: string; scuola: string; speciale: string }[] }[];
}

export interface ClassData {
  id: string;
  nome: string;
  pagina: number;
  pagine: number[];
  /** 2024: the table «Tratti del …»; 2014: «Punti ferita», «Competenze», «Equipaggiamento» (gruppi). */
  tratti: { titolo: string; voci: { etichetta: string; valore: string }[]; pagina: number; gruppi?: string[] };
  tabella: ClassLevelTable;
  diventare?: { titolo: string; parti: { titolo: string; contenuto: ClassBlock[] }[] };
  introPrivilegi?: { titolo: string; contenuto: ClassBlock[] };
  privilegi: ClassFeature[];
  /** Metamagic options, eldritch invocations: a title, an introduction and the options. */
  opzioni: { titolo: string; intro: ClassBlock[]; voci: { titolo: string; contenuto: ClassBlock[]; pagina: number }[] }[];
  incantesimi?: ClassSpellList;
  sottoclasse: {
    nome: string;
    titolo: string;
    pagina: number;
    /** 2024 only: the italic line under the name. */
    motto?: { testo: string };
    descrizione: ClassBlock[];
    privilegi: ClassFeature[];
  };
  /** Level of the feature «Sottoclasse del …». */
  livelloSottoclasse: number;
  /** Levels with a feature of the subclass. */
  livelliSottoclasse: number[];
}
