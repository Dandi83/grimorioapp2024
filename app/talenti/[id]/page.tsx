import Link from "next/link";
import { Divisore, Etichetta } from "@/components/pergamena/pergamena";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EditionPanels } from "@/components/equipment/edition-panels";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import { Breadcrumbs } from "@/components/seo/json-ld";
import { featSources, feats, getFeat, type FeatEdition } from "@/lib/feats";
import type { EquipmentEdition } from "@/lib/equipment-types";
import { CLOSED_METADATA, sectionClosed, sectionPage, sectionPublic } from "@/lib/section-view";
import { ShareRow } from "@/components/share/share-row";
import { ruleCard } from "@/lib/share-card-server";
import { dndEdition, editionOfPage, fitDescription, pageMetadata } from "@/lib/seo";

/**
 * A feat of the SRD (PROMPT 49): «Allerta (Alert)», the edition pill, the amber pill of the category, the text as printed
 * with the names of the benefits in bordeaux, the attribution. Built with the site, no short revalidation.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return feats.map(({ id }) => ({ id }));
}

const editionsOf = (editions: Partial<Record<EquipmentEdition, FeatEdition>>) => (["2024", "2014"] as const).filter(edition => editions[edition]);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  if (await sectionClosed("talenti")) return CLOSED_METADATA;
  const feat = getFeat((await params).id);
  if (!feat) notFound();
  const edition = editionOfPage(feat.editions);
  const view = feat.editions[editionsOf(feat.editions)[0]]!;
  const kind = view.categoria ? `talento ${view.categoria === "Generale" ? "generale" : `di ${view.categoria === "Origini" ? "origine" : view.categoria.toLowerCase()}`}` : "talento";
  return pageMetadata({
    name: view.en ? `${view.nome} (${view.en})` : view.nome, section: "Talenti", edition, path: `/talenti/${feat.id}`,
    description: fitDescription(`${view.nome}${view.en ? ` (${view.en})` : ""}: ${kind} di ${dndEdition(edition)}${view.prerequisito ? `, prerequisito ${view.prerequisito}` : ""}. Il testo delle regole in italiano su Il Grimorio.App.`),
  });
}

function Panel({ id, view, edition, heading: Heading, share }: { id: string; view: FeatEdition; edition: EquipmentEdition; heading: "h1" | "h2"; share: boolean }) {
  const source = featSources[edition];
  return (
    <div className="space-y-5">
      {/* «Condividi come immagine» (PROMPT 50): only when the section is visible to the public. */}
      {share && <ShareRow path={`/talenti/${id}${edition === "2014" ? "?edizione=2014" : ""}`} title={view.nome} card={ruleCard({
        kind: "talento", kicker: view.categoria ? `Talento ${view.categoria} · ${edition}` : `Talento · ${edition}`, title: view.nome, en: view.en, edition,
        boxes: [{ label: "Prerequisito", value: view.prerequisito }],
        text: [...view.paragrafi.map(paragraph => (paragraph.lead ? `${paragraph.lead}. ${paragraph.text}` : paragraph.text)), ...(view.elenco ?? [])].join(" "),
      })} />}
      <header className="flex flex-col items-center gap-1.5 pt-4 text-center">
        {/* PROMPT 65: «TALENTO · ORIGINI» (the category of the pill), capilettera, divider with ✦. */}
        <Etichetta parti={["Talento", view.categoria]} />
        <Heading className="pg-capolettera font-serif text-4xl font-bold leading-tight">
          {view.nome}{view.en && <span className="ml-2 align-middle font-sans text-[20px] font-normal italic text-muted" lang="en" data-english-name="">({view.en})</span>}
        </Heading>
        <Divisore />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <RulesEditionBadge edition={edition} variant="dark" />
          {/* The category as printed under the name («Talento Origini»); in 2014 the feats have none. */}
          <span className="mt-1 rounded-full bg-amber px-2.5 py-1 text-[13px] font-bold leading-4 text-foreground" data-feat-category="">{view.categoria ? `Talento ${view.categoria}` : "Talento"}</span>
        </div>
        {view.prerequisito && <p className="text-[15px] text-muted" data-feat-prerequisite="">Prerequisito: {view.prerequisito}</p>}
      </header>
      <div className="space-y-3 rounded-[14px] border border-border bg-card p-4" data-feat-text="">
        {view.paragrafi.map((paragraph, i) => (
          <p key={i} className="text-[16px] leading-7">
            {paragraph.lead && <><b className="font-bold text-primary" data-feat-benefit="">{paragraph.lead}.</b>{" "}</>}{paragraph.text}
          </p>
        ))}
        {view.elenco && <ul className="list-disc space-y-2 pl-5 text-[16px] leading-7">{view.elenco.map((item, i) => <li key={i}>{item}</li>)}</ul>}
      </div>
      <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: {source.document} italiano — {edition === "2014" ? "«Talenti»" : "capitolo «Talenti»"}.</p>
        <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${view.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {view.page}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </div>
  );
}

export default async function FeatPage({ params }: { params: Promise<{ id: string }> }) {
  await sectionPage("talenti");
  const feat = getFeat((await params).id);
  if (!feat) notFound();
  const panels: Partial<Record<EquipmentEdition, React.ReactNode>> = {};
  const share = await sectionPublic("talenti");
  for (const edition of editionsOf(feat.editions)) panels[edition] = <Panel id={feat.id} view={feat.editions[edition]!} edition={edition} heading={Object.keys(panels).length ? "h2" : "h1"} share={share} />;
  const name = (feat.editions["2024"] ?? feat.editions["2014"])!.nome;
  return (
    <article className="px-4 pb-8 pt-4 sm:px-6">
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Talenti", path: "/talenti" }, { name, path: `/talenti/${feat.id}` }]} />
      <Link href="/talenti" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary" data-feat-back="">
        <ChevronLeft size={22} aria-hidden="true" /><span>Talenti</span>
      </Link>
      <EditionPanels section="talenti" panels={panels} missing={{ "2014": "Talento solo nelle regole 2024", "2024": "Talento solo nelle regole 2014" }} />
    </article>
  );
}
