import Link from "next/link";
import { HiddenPartBar } from "@/components/sections/part-block";
import { partId } from "@/lib/public-sections";
import { editionCard } from "@/lib/section-view";
import { notFound } from "next/navigation";
import { manualAvailable, manualEntries } from "@/lib/manual";
import { legacyConditions } from "@/lib/conditions";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import { MANUAL_CATEGORIES } from "@/lib/manual-types";
import { ManualContent } from "@/components/manual-content";
import { BackButton } from "@/components/back-button";
import { ReportLink } from "@/components/feedback/report-link";
import { AdminEditButton } from "@/components/admin-edit/admin-edit-button";
import { SectionCorrectionNote } from "@/components/correction-note";
import { getCorrectedManualEntry } from "@/lib/corrected-content";

// Pages are generated at build time; manual corrections from the admin area appear within five
// minutes (at once after saving). Production builds only public conditions; other entries stay preview-only.
export const dynamicParams = true;
export const revalidate = 300;

export function generateStaticParams() {
  const preview = manualAvailable(process.env.VERCEL_ENV);
  return [...manualEntries.filter(entry => preview || entry.category === "condizioni"), ...legacyConditions].map(entry => ({ id: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = (await getCorrectedManualEntry(id))?.entry;
  return { title: `${entry?.title || "Voce non trovata"} — ${entry?.category === "condizioni" ? "Condizioni" : "Manuale"} · Il Grimorio.App` };
}

export default async function ManualEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corrected = await getCorrectedManualEntry(id);
  if (!corrected) notFound();
  const { entry } = corrected;
  const isCondition = entry.category === "condizioni";
  // Conditions are public reference details; the Manual and its other entries stay preview-only.
  if (!isCondition && !manualAvailable(process.env.VERCEL_ENV)) notFound();
  // A condition of an edition hidden from /admin/sezioni is not found (the administrator sees it, labelled).
  const edition = entry.edizione === "2014" ? "2014" : "2024";
  const hiddenEdition = isCondition && await editionCard("condizioni", edition);

  return (
    <article className="min-w-0 px-6 py-7">
      {hiddenEdition && <HiddenPartBar id={partId("condizioni", edition)} />}
      {isCondition ? (
        <div className="relative -ml-4 h-12"><BackButton /></div>
      ) : (
        <Link href={`/manuale?sezione=${entry.category}`} className="text-sm font-semibold text-primary">← {MANUAL_CATEGORIES[entry.category]}</Link>
      )}
      <header className={isCondition ? "mb-6 mt-3 border-b border-primary/40 pb-5" : "mb-6 mt-6"}>
        {/* «Modifica» for the administrator only, drawn in the browser (never in the cached page). */}
        <AdminEditButton target={isCondition ? { kind: "contenuto", section: "condizioni", id: entry.id, edition } : { kind: "contenuto", section: "manuale", id: entry.id, edition: "2024" }} />
        <p className="mb-2 text-xs uppercase tracking-widest text-primary">{entry.subgroup || (isCondition ? "Condizione" : "")}</p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-foreground">{entry.title}</h1>
        {entry.edizione === "2014" && <RulesEditionBadge edition="2014" />}
      </header>
      {entry.subgroup === "Classi" && ["Bardo", "Chierico", "Druido", "Mago", "Paladino", "Ranger", "Stregone", "Warlock"].includes(entry.title) && (
        <Link href={`/grimorio?classe=${entry.title.toLowerCase()}`} className="mb-6 inline-block rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary">Consulta gli incantesimi della classe →</Link>
      )}
      <ManualContent entry={entry} />
      <div className="mt-6"><SectionCorrectionNote section={corrected.section} id={id} edition={corrected.edition} corrections={corrected.corrections} /></div>
      <ReportLink edition={entry.edizione === "2014" ? "2014" : "2024"} />
    </article>
  );
}
