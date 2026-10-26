// The display chain of the cards: one step for the spells and one for the creatures, the same for every card
// whatever its origin — SRD file, SRD card edited in the database, card added in the reserved area, approved
// homebrew — and for the previews of the editor and of the proposals. The stored text is plain; everything
// the page adds (layout, condition and spell links, labels) comes from here. Pure, safe in client code.

import { concentrationRuleHref, splitConcentration } from "./concentration-link";
import { inlineConditionReferences, legacyInlineConditionReferences } from "./conditions";
import { damageRuleLinks } from "./damage-rule-link";
import { normalizeLayout } from "./display-layout";
import { visibleLinks } from "./public-sections";
import { schoolColor } from "./school-colors";
import { formatMonsterSpellLists, inlineSpellReferences, markSpellNames, fileSpellCatalog, type SpellReferenceCatalog } from "./spell-references";
import { spellName } from "./spell-name";
import { castingTimeLabel, spellListFlags, type Spell } from "./spells-types";

/** Where a card comes from, as its label says. No label for an SRD card edited (its text is no longer the SRD one). */
export type CardSource = "SRD 5.2.1" | "SRD 5.1" | "Sintesi originale" | "Aggiunta da te" | "Homebrew";

/**
 * NO SRD: a card not transcribed from the SRD, added in the reserved area or an original summary of the 2024 rules
 * (the «NO SRD» pill of the sheets, the admin asterisk of the lists). Homebrew cards have their own label.
 */
export const NO_SRD_SOURCES: readonly CardSource[] = ["Aggiunta da te", "Sintesi originale"];
export const isNoSrdSource = (source: CardSource | undefined) => !!source && NO_SRD_SOURCES.includes(source);

/** catalog: the spell names to link (lib/spell-reference-catalog.ts); hidden: what the links may not lead to (linksOut). */
export interface CardDisplayContext { catalog?: SpellReferenceCatalog; hidden?: readonly string[] }

/** Written in the reserved area or proposed: plain text, the spell names are recognised in the prose. */
const writtenHere = (source: CardSource | undefined) => source === "Aggiunta da te" || source === "Homebrew";

/** Condition links of the edition of the card (2014 sheets lead to the SRD 5.1 conditions only). */
export function conditionLinks(legacy: boolean, hidden: readonly string[] = []) {
  return visibleLinks(legacy ? legacyInlineConditionReferences : inlineConditionReferences, hidden);
}

/** «Concentrazione, fino a 1 minuto» → the word linked to the concentration rule of the edition, the rest as it is. */
export function concentrationLink(durata: string | null | undefined, legacy: boolean) {
  const parts = splitConcentration(durata);
  return parts ? { ...parts, href: concentrationRuleHref(legacy) } : undefined;
}

/** A spell card ready for the page or the preview: name, casting time, labels, text and its links. */
export function prepareSpellDisplay(spell: Pick<Spell, "id" | "nome_italiano" | "edizione" | "livello_num" | "scuola" | "tempo_di_lancio" | "durata" | "livello" | "descrizione"> & { fonte_scheda?: CardSource }, context: CardDisplayContext = {}) {
  const legacy = spell.edizione === "2014";
  const catalog = context.catalog ?? fileSpellCatalog;
  const hidden = context.hidden ?? [];
  const html = normalizeLayout(writtenHere(spell.fonte_scheda) ? markSpellNames(spell.descrizione || "", legacy, catalog) : spell.descrizione || "");
  return {
    legacy,
    title: spellName(spell.nome_italiano, spell.edizione),
    badge: spell.livello_num === 0 ? `Trucchetto · ${spell.scuola}` : `${spell.livello_num}° Livello · ${spell.scuola}`,
    color: schoolColor(spell.scuola),
    castingTime: castingTimeLabel(spell.tempo_di_lancio),
    // «Concentrazione» of the Durata box, linked to the rule of the edition of the card like a condition.
    concentration: concentrationLink(spell.durata, legacy),
    ...spellListFlags(spell),
    source: spell.fonte_scheda,
    html,
    conditionLinks: conditionLinks(legacy, hidden),
    // «Resistenza», «immunità», «vulnerabilità» linked to the rules of the edition (lib/damage-rule-link.ts).
    ruleLinks: damageRuleLinks(legacy, hidden),
    spellLinks: visibleLinks(inlineSpellReferences(html, legacy, catalog), hidden),
  };
}

/** One text of a creature (traits, actions…) ready for MonsterText: layout, spell lists, links. */
export function prepareMonsterText(html: string, legacy: boolean, source: CardSource | undefined, context: CardDisplayContext = {}) {
  const catalog = context.catalog ?? fileSpellCatalog;
  const hidden = context.hidden ?? [];
  const text = normalizeLayout(writtenHere(source) ? markSpellNames(html, legacy, catalog) : html);
  return {
    html: formatMonsterSpellLists(text, legacy, catalog),
    references: conditionLinks(legacy, hidden),
    rules: damageRuleLinks(legacy, hidden),
    spellReferences: visibleLinks(inlineSpellReferences(text, legacy, catalog), hidden),
  };
}
