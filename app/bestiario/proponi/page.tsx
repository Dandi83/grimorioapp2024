import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { ProposalForm } from "@/components/homebrew/proposal-form";
import { HiddenPartBar } from "@/components/sections/part-block";
import { turnstileConfigured } from "@/lib/feedback";
import { partId } from "@/lib/public-sections";
import { partState } from "@/lib/section-view";

export const metadata = {
  title: "Proponi una creatura — Bestiario Il Grimorio.App",
  robots: { index: false, follow: true },
};

/** The form of the Homebrew collection: not found while the collection is hidden (the administrator sees it, labelled). */
export default async function ProposePage() {
  const state = await partState("bestiario", "homebrew");
  if (!state.shown) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-4">
      {state.hidden && <HiddenPartBar id={partId("bestiario", "homebrew")} />}
      <BackButton fallback="/bestiario" label="Bestiario" />
      <h1 className="mt-2 font-serif text-[32px] font-bold leading-tight text-foreground">Proponi una creatura</h1>
      <p className="mt-1 text-[15px] leading-6 text-muted">
        Una creatura homebrew per la raccolta della community. Compila la scheda come nel Bestiario: l’amministratore la guarda prima di pubblicarla.
      </p>
      <div className="mt-4">
        <ProposalForm turnstileSiteKey={turnstileConfigured() ? process.env.TURNSTILE_SITE_KEY : undefined} />
      </div>
    </div>
  );
}
