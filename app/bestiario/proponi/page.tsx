import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { ProposalForm } from "@/components/homebrew/proposal-form";
import { BetaPill } from "@/components/homebrew/beta-pill";
import { HiddenPartBar } from "@/components/sections/part-block";
import { turnstileConfigured } from "@/lib/feedback";
import { partId } from "@/lib/public-sections";
import { CLOSED_PART_METADATA, partState, publicLinksOut, sectionPage } from "@/lib/section-view";
import { CardDisplayProvider } from "@/components/card-display-context";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";

/** While the section is closed to the visitors, nothing of it in the title either (lib/community.ts). */
export async function generateMetadata() {
  const state = await partState("bestiario", "homebrew");
  return state.shown || state.soon ? {
  title: "Proponi un mostro — I mostri creati da voi · Il Grimorio.App",
  robots: { index: false, follow: true },
} : CLOSED_PART_METADATA;
}

/**
 * «Proponi un mostro» (screen ③, PROMPT 13), in four steps: not found for the visitors while «I mostri creati da voi»
 * is off (lib/community.ts) or hidden; the administrator sees it, labelled.
 */
export default async function ProposePage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("bestiario");
  const state = await partState("bestiario", "homebrew");
  // «In arrivo» (PROMPT 25): the form stays open, as «Proponi il tuo» on the tile of the Bestiario.
  if (!state.shown && !state.soon) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-4">
      {state.hidden && state.shown && <HiddenPartBar id={partId("bestiario", "homebrew")} />}
      <BackButton fallback="/bestiario/creati-da-voi" label="I mostri creati da voi" />
      <h1 className="mt-2 font-serif text-[32px] font-bold leading-tight text-foreground">Proponi un mostro <BetaPill /></h1>
      <p className="mt-1 text-[15px] leading-6 text-muted">
        Compila la scheda in quattro passi, con l’anteprima dal vivo. La controlliamo prima di pubblicarla tra «I mostri creati da voi», con il tuo nome.
      </p>
      <div className="mt-4">
        {/* The preview of the sheet links spells and conditions as the published sheet will. */}
        <CardDisplayProvider value={{ catalog: await getSpellReferenceCatalog(), hidden: await publicLinksOut() }}>
          <ProposalForm turnstileSiteKey={turnstileConfigured() ? process.env.TURNSTILE_SITE_KEY : undefined} />
        </CardDisplayProvider>
      </div>
    </div>
  );
}
