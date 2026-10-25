import { Clock, FlaskConical, Hourglass, Target } from "lucide-react";

import { AdminCardSource } from "./admin-edit/admin-card-source";
import { adminOnlySource, LABEL_PILL, NoSrdTag, SourcePill } from "./card-source-pill";
import { HtmlText } from "./html-text";
import { MetaCell } from "./meta-cell";
import { RulesEditionBadge } from "./rules-edition-badge";
import { prepareSpellDisplay, type CardDisplayContext, type CardSource } from "../lib/card-display";
import { capitalizeWords, type Spell } from "../lib/spells-types";

/**
 * One spell sheet for every card — SRD files, cards edited or added in the reserved area — and for the
 * editor preview: what the preview shows is what the public will see (lib/card-display.ts).
 */
type SheetSpell = Pick<Spell, "id" | "nome_italiano" | "edizione" | "livello_num" | "scuola" | "tempo_di_lancio" | "gittata" | "componenti" | "durata" | "livello" | "descrizione" | "classi"> & { fonte_scheda?: CardSource };

/**
 * «Rituale» and where the card comes from («SRD 5.2.1», «SRD 5.1»). A card not from the SRD (added in the reserved
 * area, original summary) shows «NO SRD» to everyone, the same pill as the added subclasses; «Aggiunta da te» and
 * «Sintesi originale» are for the administrator only (AdminCardSource). Concentration has no label: the
 * «Concentrazione» of the Durata box links to its rule (lib/card-display.ts).
 */
export function CardLabels({ rituale, source }: { rituale?: boolean; source?: CardSource }) {
  const adminOnly = adminOnlySource(source);
  if (!rituale && !source) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-1.5" data-card-labels="">
      {rituale && <span className={`${LABEL_PILL} border-primary/30 bg-primary/10 text-primary`}>Rituale</span>}
      {adminOnly ? <><NoSrdTag /><AdminCardSource code={adminOnly} /></> : source && <SourcePill source={source} />}
    </p>
  );
}

/** Level and school in the colour of the school, the name, the edition and the labels. */
export function SpellSheetHeading({ spell, context, heading: Heading = "h1" }: { spell: SheetSpell; context?: CardDisplayContext; heading?: "h1" | "h2" }) {
  const view = prepareSpellDisplay(spell, context);
  return (
    <>
      {/* Proposal B (bolder): level and school on a band in the colour of the school, darkened towards the ink
          so the parchment text keeps at least 4.5:1. */}
      <span className="mb-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider text-card shadow-[0_2px_8px_rgb(43_33_24_/_25%)]" style={{ backgroundColor: `color-mix(in srgb, ${view.color} 55%, #2B2118)` }}>
        <span className="h-2 w-2 rounded-full bg-amber" />
        {view.badge}
      </span>
      <Heading className="font-serif text-[44px] font-bold leading-[1.05] tracking-tight text-foreground text-balance">
        {view.title}
      </Heading>
      <RulesEditionBadge edition={spell.edizione} variant="dark" />
      <CardLabels rituale={view.rituale} source={view.source} />
    </>
  );
}

/** Casting time, range, components and duration, the classes and the description with its links. */
export function SpellSheetBody({ spell, context }: { spell: SheetSpell; context?: CardDisplayContext }) {
  const view = prepareSpellDisplay(spell, context);
  return (
    <>
      <div className="flex flex-wrap gap-3 p-6">
        <MetaCell icon={<Clock size={14} strokeWidth={2.2} className="text-primary" aria-hidden="true" />} label="Tempo di lancio" value={view.castingTime} />
        <MetaCell icon={<Target size={14} strokeWidth={2.2} className="text-primary" aria-hidden="true" />} label="Gittata" value={spell.gittata} />
        <MetaCell icon={<FlaskConical size={14} strokeWidth={2.2} className="text-primary" aria-hidden="true" />} label="Componenti" value={spell.componenti} />
        <MetaCell icon={<Hourglass size={14} strokeWidth={2.2} className="text-primary" aria-hidden="true" />} label="Durata" value={view.concentration ? <><a href={view.concentration.href} className="ref-pill">{view.concentration.word}</a>{view.concentration.rest}</> : spell.durata} />
      </div>
      {spell.classi.length > 0 && (
        <section className="mb-4 px-6">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-primary">Classi</h2>
          <div className="flex flex-wrap gap-2">
            {spell.classi.map(c => (
              <span key={c} className="rounded-full border border-primary-dim bg-primary-faint px-3 py-1.5 text-[13px] font-semibold text-primary">{capitalizeWords(c)}</span>
            ))}
          </div>
        </section>
      )}
      <section className="px-6 pb-4" data-card-description="" data-drop-cap="">
        <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-primary">Descrizione</h2>
        {view.html ? (
          <HtmlText html={view.html} damageIcons references={view.conditionLinks} spellReferences={view.spellLinks} />
        ) : (
          <p className="font-serif text-[15px] italic leading-6 text-muted">Descrizione non disponibile per questo incantesimo.</p>
        )}
      </section>
    </>
  );
}
