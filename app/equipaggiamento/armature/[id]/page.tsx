import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { ArmorBadge } from "@/components/equipment/armor-badge";
import { EditionPanels } from "@/components/equipment/edition-panels";
import { armorBadge, armorClassRest, armorDescription, armorRuleCards, armorSources, armors, getArmor, type ArmorEditionView } from "@/lib/armor";
import { ARMOR_CATEGORY_NAMES, type ArmorCategory } from "@/lib/equipment-types";
import { ReportLink } from "@/components/feedback/report-link";
import { SectionCorrectionNote } from "@/components/correction-note";
import { getCorrectedArmors } from "@/lib/corrected-content";

export const dynamicParams = false;
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export function generateStaticParams() {
  return armors.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const armor = getArmor((await params).id, (await getCorrectedArmors()).list);
  return { title: armor ? `${armor.editions["2024"].nome} — Armature — Il Grimorio.App` : "Armatura non trovata" };
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-divider px-2 py-3 text-center last:border-r-0">
      <p className="text-[12px] font-bold tracking-[0.06em] text-muted">{label}</p>
      <p className="font-serif text-2xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function Sheet({ armor, category }: { armor: ArmorEditionView; category: ArmorCategory }) {
  const source = armorSources[armor.edition];
  const badge = armorBadge(armor);
  const description = armorDescription(armor);
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-1.5 pt-4 text-center">
        <ArmorBadge ca={badge.ca} note={["CA"]} size="sheet" />
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight">{armor.nome}</h1>
        <p className="text-[15px] text-muted">{ARMOR_CATEGORY_NAMES[category]}</p>
        {armorClassRest(armor) && <p className="mt-1 font-serif text-xl font-bold text-primary">{armorClassRest(armor)}</p>}
      </div>
      <div className="grid grid-cols-2 rounded-[14px] border border-border bg-card">
        <Cell label="PESO" value={armor.peso} />
        <Cell label="COSTO" value={armor.costo} />
      </div>
      {description && (
        <p className="font-serif text-[1.05rem] leading-7">{description.testo}</p>
      )}
      <section className="space-y-2.5" aria-label="Regole">
        <h2 className="font-serif text-[22px] font-bold text-primary">Regole</h2>
        {armorRuleCards(armor, category).map(card => (
          <div key={card.title} className="space-y-1.5 rounded-[14px] border border-border bg-card p-3.5">
            <p className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-chip-border bg-primary-faint px-3 py-0.5 text-sm font-bold text-primary">{card.title}</span>
              {card.detail && <span className="text-sm text-muted">{card.detail}</span>}
            </p>
            {card.text.split("\n\n").map((paragraph, i) => <p key={i} className="text-[15px] leading-6">{paragraph}</p>)}
          </div>
        ))}
      </section>
      <aside aria-label="Fonte" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: {source.document} italiano — tabella Armature{armor.edition === "2014" ? " e regole delle armature" : " e voce «Armature» del Manuale"}.</p>
        <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${armor.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {armor.page}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </div>
  );
}

export default async function ArmorSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corrected = await getCorrectedArmors();
  const armor = getArmor(id, corrected.list);
  if (!armor) notFound();
  const corrections = corrected.corrections.get(id);
  const panel = (edition: "2014" | "2024") => (
    <>
      <Sheet armor={armor.editions[edition]} category={armor.categoria} />
      <div className="mt-5"><SectionCorrectionNote section="armature" id={id} edition={edition} corrections={corrections?.[edition]} /></div>
    </>
  );
  return (
    <article className="px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback="/equipaggiamento/armature" label="Tutte le armature" />
      <EditionPanels
        panels={{ "2024": panel("2024"), "2014": panel("2014") }}
        missing={{}}
      />
      <ReportLink />
    </article>
  );
}
