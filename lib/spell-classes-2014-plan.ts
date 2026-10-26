/**
 * The classes of the Manuale del Giocatore 2014 for the 34 spells added by the administrator without them, and
 * the name of Parola del potere guarire. Pure: the preview and the transaction (lib/spell-classes-2014.ts) and
 * the tests use the same plan.
 */
export const CLASSES_2014: Record<string, string> = {
  "amicizia-2": "Bardo, Mago, Stregone, Warlock", "frusta-di-spine-2": "Druido", "interdizione-alle-lame-2": "Bardo, Mago, Stregone, Warlock",
  "armatura-di-agathis": "Warlock", "braccia-di-hadar-2": "Warlock", "colpo-intrappolante-2": "Ranger", "dardo-stregato-2": "Mago, Stregone, Warlock",
  "duello-obbligato-2": "Paladino", "globo-cromatico-2": "Mago, Stregone", "raffica-di-spine-2": "Ranger", "raggio-di-infermita-2": "Mago, Stregone",
  "sortilegio-2": "Warlock", "sussurri-dissonanti-2": "Bardo", "corona-di-frecce": "Ranger", "corona-di-follia-2": "Bardo, Mago, Stregone, Warlock",
  "nube-di-pugnali-2": "Bardo, Mago, Stregone, Warlock", "percezione-delle-bestie-2": "Druido, Ranger", "arma-elementale-2": "Paladino",
  "aura-di-vitalita-2": "Paladino", "evoca-raffica-2": "Ranger", "fame-di-hadar-2": "Warlock", "freccia-folgorante-2": "Ranger",
  "morte-apparente-2": "Bardo, Chierico, Druido, Mago", "aura-di-purezza-2": "Paladino", "aura-di-vita-2": "Paladino",
  "rampicante-afferrante-2": "Druido, Ranger", "cerchio-di-potere-2": "Paladino", "evoca-pioggia-di-armi-2": "Ranger", "faretra-rapida-2": "Ranger",
  "onda-distruttiva-2": "Paladino", "portale-arcano-2": "Mago, Stregone, Warlock", "telepatia-2": "Mago", "tsunami-2": "Druido",
  "parola-del-poter-guarire": "Bardo",
};

export const RENAME_2014 = { id: "parola-del-poter-guarire", from: "Parola del poter Guarire", to: "Parola del potere guarire" } as const;

export interface SpellClassesPlan {
  changes: { id: string; before: string; after: string }[];
  /** The name is changed only if it is exactly RENAME_2014.from. */
  rename: boolean;
  /** The current name of RENAME_2014.id, for the preview. */
  currentName?: string;
  skipped: { id: string; reason: string }[];
}

/** Same format as the SRD 2014 cards: «Invocazione di 8° livello (mago)», «Trucchetto di Ammaliamento (bardo, mago)». */
export function withClasses(livello: string, classes: string): string {
  return `${livello.trim()} (${classes.toLowerCase()})`;
}

export function planSpellClasses(rows: { id: string; livello: string | null; nome_italiano: string }[]): SpellClassesPlan {
  const byId = new Map(rows.map(row => [row.id, row]));
  const plan: SpellClassesPlan = { changes: [], rename: false, skipped: [] };
  for (const [id, classes] of Object.entries(CLASSES_2014)) {
    const row = byId.get(id);
    if (!row) { plan.skipped.push({ id, reason: "non esiste" }); continue; }
    const before = row.livello ?? "";
    if (before.includes("(")) { plan.skipped.push({ id, reason: `ha già le classi: «${before}»` }); continue; }
    if (!/(\d+\s*[°º]\s*livello|trucchetto)/i.test(before)) { plan.skipped.push({ id, reason: `formato inatteso: «${before}»` }); continue; }
    plan.changes.push({ id, before, after: withClasses(before, classes) });
  }
  const named = byId.get(RENAME_2014.id);
  plan.currentName = named?.nome_italiano;
  plan.rename = named?.nome_italiano === RENAME_2014.from;
  return plan;
}

/** Nothing left to do: every spell has its classes (or is missing) and the name is already right. */
export const planDone = (plan: SpellClassesPlan) => !plan.changes.length && !plan.rename;
