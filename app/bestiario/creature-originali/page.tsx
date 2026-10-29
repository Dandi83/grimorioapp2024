import { notFound } from "next/navigation";

import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { getMonsterListIndex } from "@/lib/monster-index";
import { CLOSED_PART_METADATA, bestiaryList, partState, sectionPage, visibleCards } from "@/lib/section-view";

export const revalidate = 300;

async function groups() {
  const [grimorio, community] = await Promise.all([partState("bestiario", "grimorio"), partState("bestiario", "homebrew")]);
  return { grimorio, community, shown: grimorio.shown || community.shown };
}

export async function generateMetadata() {
  return (await groups()).shown ? {
    title: "Creature originali — Bestiario Il Grimorio.App",
    description: "Le creature originali della redazione e della community del Grimorio, in un unico elenco.",
  } : CLOSED_PART_METADATA;
}

/**
 * «Creature originali» (PROMPT 25): the creatures of the editorial staff and of the community in one alphabetical list,
 * only the groups shown (bestiaryList leaves out the collections hidden or «In arrivo»). None shown: not found.
 */
export default async function OriginalsPage() {
  await sectionPage("bestiario");
  if (!(await groups()).shown) notFound();
  const monsters = (await bestiaryList(await visibleCards("mostro", await getMonsterListIndex()))).filter(monster => monster.homebrew);
  return (
    <div className="lg:mx-auto lg:max-w-2xl">
      <BestiarioWithFilters monsters={monsters} section="originali" />
    </div>
  );
}
