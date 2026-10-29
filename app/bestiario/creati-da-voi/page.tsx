import { notFound, redirect } from "next/navigation";

import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { HiddenPartBar } from "@/components/sections/part-block";
import { getMonsterListIndex } from "@/lib/monster-index";
import { collectionOf } from "@/lib/monsters-types";
import { partId, soonHref } from "@/lib/public-sections";
import { CLOSED_PART_METADATA, bestiaryList, partState, sectionPage, visibleCards } from "@/lib/section-view";

export const revalidate = 300;

/** While the section is closed to the visitors, nothing of it in the title either (lib/community.ts). */
export async function generateMetadata() {
  const state = await partState("bestiario", "homebrew");
  return state.shown ? {
  title: "I mostri creati da voi — Bestiario Il Grimorio.App",
  description: "Creature inventate dai master della community del Grimorio, controllate prima di pubblicarle.",
} : CLOSED_PART_METADATA;
}

/**
 * «I mostri creati da voi» (screen ②, PROMPT 13; the community only since PROMPT 25), with the same columns,
 * search and filters as the Bestiario. Not found for the visitors while the section is off (lib/community.ts) or
 * hidden from /admin/sezioni; the administrator sees it with «Nascosta».
 */
export default async function CommunityPage() {
  await sectionPage("bestiario");
  const state = await partState("bestiario", "homebrew");
  if (!state.shown) {
    // «In arrivo» (PROMPT 25): the page «in arrivo» of the part, as the tile of the Bestiario.
    if (state.soon) redirect(soonHref(partId("bestiario", "homebrew")));
    notFound();
  }
  // The community only (PROMPT 25): the creatures of the editorial staff are in /bestiario/del-grimorio.
  const monsters = (await bestiaryList(await visibleCards("mostro", await getMonsterListIndex()))).filter(monster => collectionOf(monster) === "homebrew");
  return (
    <div className="lg:mx-auto lg:max-w-2xl">
      {state.hidden && <div className="px-6 pt-4"><HiddenPartBar id={partId("bestiario", "homebrew")} /></div>}
      <BestiarioWithFilters monsters={monsters} section="community" />
    </div>
  );
}
