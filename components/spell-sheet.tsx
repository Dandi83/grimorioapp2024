import { BookOpen } from "lucide-react";

import { HtmlText } from "./html-text";
import { MetaCell } from "./meta-cell";
import { RulesEditionBadge } from "./rules-edition-badge";
import { SpellProvenanceMarker } from "./spell-provenance-marker";
import { prepareSpellDisplay, type CardDisplayContext, type CardSource } from "../lib/card-display";
import { capitalizeWords, type Spell } from "../lib/spells-types";

/**
 * One spell sheet for every card — SRD files, cards edited or added in the reserved area — and for the
 * editor preview: what the preview shows is what the public will see (lib/card-display.ts).
 */
type SheetSpell = Pick<Spell, "id" | "nome_italiano" | "edizione" | "livello_num" | "scuola" | "tempo_di_lancio" | "gittata" | "componenti" | "durata" | "livello" | "descrizione" | "classi"> & { fonte_scheda?: CardSource };

/** «Concentrazione», «Rituale» and where the card comes from («SRD 5.2.1», «Aggiunta da te»…). */
export function CardLabels({ concentrazione, rituale, source }: { concentrazione?: boolean; rituale?: boolean; source?: CardSource }) {
  if (!concentrazione && !rituale && !source) return null;
  const pill = "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4";
  return (
    <p className="mt-2 flex flex-wrap gap-1.5" data-card-labels="">
      {concentrazione && <span className={`${pill} border-primary/30 bg-primary/10 text-primary`}>Concentrazione</span>}
      {rituale && <span className={`${pill} border-primary/30 bg-primary/10 text-primary`}>Rituale</span>}
      {source && (
        <span className={`${pill} gap-1 border-border bg-card text-muted`} data-card-source={source}>
          <BookOpen size={11} className="shrink-0" aria-hidden="true" />{source}
        </span>
      )}
    </p>
  );
}

/** Level and school in the colour of the school, the name, the edition and the labels. */
export function SpellSheetHeading({ spell, context, heading: Heading = "h1" }: { spell: SheetSpell; context?: CardDisplayContext; heading?: "h1" | "h2" }) {
  const view = prepareSpellDisplay(spell, context);
  return (
    <>
      <span className="mb-3 inline-flex items-center gap-2 rounded-full border bg-elevated/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground" style={{ borderColor: view.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: view.color }} />
        {view.badge}
      </span>
      <Heading className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground text-balance">
        {view.title}
        <SpellProvenanceMarker id={spell.id} />
      </Heading>
      <RulesEditionBadge edition={spell.edizione} />
      <CardLabels concentrazione={view.concentrazione} rituale={view.rituale} source={view.source} />
    </>
  );
}

/** Casting time, range, components and duration, the classes and the description with its links. */
export function SpellSheetBody({ spell, context }: { spell: SheetSpell; context?: CardDisplayContext }) {
  const view = prepareSpellDisplay(spell, context);
  return (
    <>
      <div className="flex flex-wrap gap-3 p-6">
        <MetaCell label="Tempo di lancio" value={view.castingTime} />
        <MetaCell label="Gittata" value={spell.gittata} />
        <MetaCell label="Componenti" value={spell.componenti} />
        <MetaCell label="Durata" value={spell.durata} />
      </div>
      {spell.classi.length > 0 && (
        <section className="mb-4 px-6">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">Classi</h2>
          <div className="flex flex-wrap gap-2">
            {spell.classi.map(c => (
              <span key={c} className="rounded-full border border-primary-dim bg-primary-faint px-3 py-1.5 text-xs font-semibold text-primary">{capitalizeWords(c)}</span>
            ))}
          </div>
        </section>
      )}
      <section className="px-6 pb-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">Descrizione</h2>
        {view.html ? (
          <HtmlText html={view.html} damageIcons references={view.conditionLinks} spellReferences={view.spellLinks} />
        ) : (
          <p className="font-serif text-[15px] italic leading-6 text-muted">Descrizione non disponibile per questo incantesimo.</p>
        )}
      </section>
    </>
  );
}
