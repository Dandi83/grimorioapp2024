import Link from "next/link";
import { Divisore, Etichetta } from "@/components/pergamena/pergamena";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";
import { EditionPanels } from "@/components/equipment/edition-panels";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import { Breadcrumbs } from "@/components/seo/json-ld";
import { weaponSources } from "@/lib/equipment";
import { WEAPON_GROUP_NAMES } from "@/lib/equipment-types";
import { CLOSED_METADATA, pageEditions, sectionClosed, sectionPage, sectionPublic } from "@/lib/section-view";
import { ShareRow } from "@/components/share/share-row";
import { ruleCard } from "@/lib/share-card-server";
import { fitDescription, pageMetadata } from "@/lib/seo";
import { getMastery, masteries, weaponsWithMastery } from "@/lib/weapon-masteries";

/**
 * A weapon mastery of the 2024 rules (PROMPT 47): «Vessazione (Vex)», the SRD text as on the weapon cards, the 2024
 * weapons that have it. Built with the site: no short revalidation (a switch of /admin/sezioni refreshes every page).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return masteries.map(({ id }) => ({ id }));
}

/** The page answers only while the section «armi» and its 2024 edition are shown to the public. */
async function closed() {
  return (await sectionClosed("armi")) || !(await pageEditions("armi")).includes("2024");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  if (await sectionClosed("armi")) return CLOSED_METADATA;
  const mastery = getMastery((await params).id);
  if (!mastery || await closed()) notFound();
  const count = weaponsWithMastery(mastery.nome).length;
  return pageMetadata({
    name: mastery.en ? `${mastery.nome} (${mastery.en})` : mastery.nome, section: "Padronanze", edition: "2024", path: `/equipaggiamento/padronanze/${mastery.id}`,
    description: fitDescription(`${mastery.nome}${mastery.en ? ` (${mastery.en})` : ""}: proprietà di padronanza delle armi di D&D 2024, con il testo delle regole e le ${count} armi che la hanno, in italiano su Il Grimorio.App.`),
  });
}

export default async function MasteryPage({ params }: { params: Promise<{ id: string }> }) {
  await sectionPage("armi");
  const mastery = getMastery((await params).id);
  if (!mastery || await closed()) notFound();
  const list = weaponsWithMastery(mastery.nome);
  const source = weaponSources["2024"];
  const share = await sectionPublic("armi");
  const panel = (
    <div className="space-y-5">
      {/* «Condividi come immagine» (PROMPT 50). */}
      {share && <ShareRow path={`/equipaggiamento/padronanze/${mastery.id}`} title={mastery.nome} card={ruleCard({
        kind: "padronanza", kicker: "Padronanza delle armi · 2024", title: mastery.nome, en: mastery.en, edition: "2024", text: mastery.testo,
      })} />}
      <header className="flex flex-col items-center gap-1.5 pt-4 text-center">
        {/* PROMPT 65: label, capilettera, divider with ✦. */}
        <Etichetta parti={["Padronanza delle armi", "2024"]} />
        <h1 className="pg-capolettera font-serif text-4xl font-bold leading-tight">
          {mastery.nome}{mastery.en && <span className="ml-2 align-middle font-sans text-[20px] font-normal italic text-muted" lang="en" data-english-name="">({mastery.en})</span>}
        </h1>
        <Divisore />
        <RulesEditionBadge edition="2024" variant="dark" />
        <p className="text-[15px] text-muted">Padronanza delle armi</p>
      </header>
      <div className="space-y-1.5 rounded-[14px] border-[1.5px] border-amber bg-[#FBEBC2] p-3.5" data-mastery-text="">
        <p className="text-[15px] leading-6">{mastery.testo}</p>
      </div>
      <section className="space-y-2.5" aria-labelledby="armi-con">
        <h2 id="armi-con" className="font-serif text-[22px] font-bold text-primary">Armi con {mastery.nome}</h2>
        <ul className="overflow-hidden rounded-[14px] border border-border bg-card" data-mastery-weapons="">
          {list.map(weapon => (
            <li key={weapon.id} className="border-t border-divider first:border-t-0">
              <Link href={`/equipaggiamento/armi/${weapon.id}`} className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block font-semibold">{weapon.editions["2024"]!.nome}</span>
                  <span className="block text-[13px] text-muted">{WEAPON_GROUP_NAMES[weapon.gruppo]} · {weapon.editions["2024"]!.danni} {weapon.editions["2024"]!.tipoDanno}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: {source.document} italiano — voce «Armi» del Manuale, «Proprietà di padronanza».</p>
        <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${mastery.page ?? source.pages[0]}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {mastery.page ?? source.pages[0]}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </div>
  );
  return (
    <article className="px-4 pb-8 pt-4 sm:px-6">
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Armi", path: "/equipaggiamento/armi" }, { name: mastery.nome, path: `/equipaggiamento/padronanze/${mastery.id}` }]} />
      {/* «‹ Armi»: always the weapons list (the look of the back button with a label). */}
      <Link href="/equipaggiamento/armi" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary" data-mastery-back="">
        <ChevronLeft size={22} aria-hidden="true" /><span>Armi</span>
      </Link>
      <EditionPanels section="armi" panels={{ "2024": panel }} missing={{ "2014": "Regola nuova nel 2024, non presente nelle regole 2014" }} />
    </article>
  );
}
