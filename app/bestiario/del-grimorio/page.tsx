import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { notFound, redirect } from "next/navigation";

import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { HiddenPartBar } from "@/components/sections/part-block";
import { getMonsterListIndex } from "@/lib/monster-index";
import { collectionOf } from "@/lib/monsters-types";
import { partId, soonHref } from "@/lib/public-sections";
import { CLOSED_PART_METADATA, bestiaryList, partState, sectionPage, visibleCards } from "@/lib/section-view";

export const revalidate = 300;

const PART = partId("bestiario", "grimorio");

export async function generateMetadata() {
  const state = await partState("bestiario", "grimorio");
  return state.shown ? pageMetadata({ name: "Mostri del Grimorio", section: "Bestiario", path: "/bestiario/del-grimorio",
    description: "I mostri originali della redazione di Il Grimorio.App per D&D 2014 e 2024, bilanciati con il nostro simulatore sui mostri ufficiali." }) : CLOSED_PART_METADATA;
}

/**
 * «Mostri del Grimorio» (PROMPT 25): the original creatures of the editorial staff, with the search and the filters of the
 * Bestiario. «In arrivo»: the page «in arrivo» of the part; hidden: not found (the administrator sees it, labelled).
 */
export default async function GrimorioPage() {
  await sectionPage("bestiario");
  const state = await partState("bestiario", "grimorio");
  if (!state.shown) {
    if (state.soon) redirect(soonHref(PART));
    notFound();
  }
  const monsters = (await bestiaryList(await visibleCards("mostro", await getMonsterListIndex()))).filter(monster => collectionOf(monster) === "grimorio");
  return (
    <>
      <Breadcrumbs crumbs={[{ name: "Bestiario", path: "/bestiario" }, { name: "Mostri del Grimorio", path: "/bestiario/del-grimorio" }]} />
    <div className="lg:mx-auto lg:max-w-2xl">
      {state.hidden && <div className="px-6 pt-4"><HiddenPartBar id={PART} /></div>}
      <BestiarioWithFilters monsters={monsters} section="grimorio" />
    </div>
    </>
  );
}
