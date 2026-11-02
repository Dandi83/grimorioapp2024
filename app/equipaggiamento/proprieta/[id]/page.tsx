import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EditionPanels } from "@/components/equipment/edition-panels";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import { Breadcrumbs } from "@/components/seo/json-ld";
import { weaponSources } from "@/lib/equipment";
import { WEAPON_GROUP_NAMES, type EquipmentEdition } from "@/lib/equipment-types";
import { CLOSED_METADATA, pageEditions, sectionClosed, sectionPage } from "@/lib/section-view";
import { dndEdition, editionOfPage, fitDescription, pageMetadata } from "@/lib/seo";
import { getWeaponProperty, weaponProperties, weaponsWithProperty, type WeaponPropertyEntry } from "@/lib/weapon-properties";

/**
 * A weapon property (PROMPT 48), as the masteries of PROMPT 47 but in both editions: «Leggera (Light)», the rule of each
 * edition as on the weapon cards, the weapons of that edition. Built with the site, no short revalidation.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return weaponProperties.map(({ id }) => ({ id }));
}

/** The editions of the property the public sees (an edition of «armi» hidden from /admin/sezioni is left out). */
async function shownEditions(property: WeaponPropertyEntry): Promise<EquipmentEdition[]> {
  const shown = await pageEditions("armi");
  return (["2024", "2014"] as const).filter(edition => property.editions[edition] && shown.includes(edition));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  if (await sectionClosed("armi")) return CLOSED_METADATA;
  const property = getWeaponProperty((await params).id);
  const editions = property ? await shownEditions(property) : [];
  if (!property || !editions.length) notFound();
  const edition = editionOfPage(property.editions, editions);
  const en = property.editions[editions[0]]!.en;
  const counts = editions.map(e => `${weaponsWithProperty(property.id, e).length} nel ${e}`).join(" e ");
  return pageMetadata({
    name: en ? `${property.nome} (${en})` : property.nome, section: "Proprietà", edition, path: `/equipaggiamento/proprieta/${property.id}`,
    description: fitDescription(`${property.nome}${en ? ` (${en})` : ""}: proprietà delle armi di ${dndEdition(edition)}, con la regola e le armi che la hanno (${counts}), in italiano su Il Grimorio.App.`),
  });
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await sectionPage("armi");
  const property = getWeaponProperty((await params).id);
  const editions = property ? await shownEditions(property) : [];
  if (!property || !editions.length) notFound();
  const panels: Partial<Record<EquipmentEdition, React.ReactNode>> = {};
  for (const edition of editions) {
    const rule = property.editions[edition]!;
    const source = weaponSources[edition];
    const list = weaponsWithProperty(property.id, edition);
    const Heading = Object.keys(panels).length ? "h2" : "h1";
    panels[edition] = (
      <div className="space-y-5">
        <header className="flex flex-col items-center gap-1.5 pt-4 text-center">
          <Heading className="font-serif text-4xl font-bold leading-tight">
            {property.nome}{rule.en && <span className="ml-2 align-middle font-sans text-[20px] font-normal italic text-muted" lang="en" data-english-name="">({rule.en})</span>}
          </Heading>
          <RulesEditionBadge edition={edition} variant="dark" />
          <p className="text-[15px] text-muted">Proprietà delle armi</p>
        </header>
        <div className="space-y-1.5 rounded-[14px] border-[1.5px] border-amber bg-[#FBEBC2] p-3.5" data-property-text="">
          {rule.testo.split("\n\n").map((paragraph, i) => <p key={i} className="text-[15px] leading-6">{paragraph}</p>)}
        </div>
        <section className="space-y-2.5" aria-label={`Armi con ${property.nome}`}>
          <h2 className="font-serif text-[22px] font-bold text-primary">Armi con {property.nome}</h2>
          <ul className="overflow-hidden rounded-[14px] border border-border bg-card" data-property-weapons="">
            {list.map(weapon => {
              const view = weapon.editions[edition]!;
              return (
                <li key={weapon.id} className="border-t border-divider first:border-t-0">
                  <Link href={`/equipaggiamento/armi/${weapon.id}${edition === "2014" ? "?edizione=2014" : ""}`} className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-semibold">{view.nome}</span>
                      <span className="block text-[13px] text-muted">{WEAPON_GROUP_NAMES[weapon.gruppo]} · {view.danni || "—"} {view.tipoDanno}</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-muted">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
          <p>Testo integrale: {source.document} italiano — {edition === "2014" ? "«Proprietà delle armi»" : "voce «Armi» del Manuale, «Proprietà»"}.</p>
          <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${rule.page ?? source.pages[0]}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {rule.page ?? source.pages[0]}</a>
          {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
        </aside>
      </div>
    );
  }
  return (
    <article className="px-4 pb-8 pt-4 sm:px-6">
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Armi", path: "/equipaggiamento/armi" }, { name: property.nome, path: `/equipaggiamento/proprieta/${property.id}` }]} />
      {/* «‹ Armi»: always the weapons list (the look of the back button with a label). */}
      <Link href="/equipaggiamento/armi" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary" data-property-back="">
        <ChevronLeft size={22} aria-hidden="true" /><span>Armi</span>
      </Link>
      <EditionPanels section="armi" panels={panels} missing={{ "2024": "Proprietà solo nelle regole 2014", "2014": "Proprietà nuova nel 2024" }} />
    </article>
  );
}
