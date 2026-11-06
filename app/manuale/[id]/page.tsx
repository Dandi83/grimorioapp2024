import { Breadcrumbs } from "@/components/seo/json-ld";
import { Divisore, Etichetta } from "@/components/pergamena/pergamena";
import { fitDescription, dndEdition, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { HiddenPartBar } from "@/components/sections/part-block";
import { partId } from "@/lib/public-sections";
import { editionCard, CLOSED_METADATA, sectionClosed, sectionPage, sectionPublic } from "@/lib/section-view";
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
import { ShareRow } from "@/components/share/share-row";
import { ruleCard } from "@/lib/share-card-server";
import { englishName } from "@/lib/english-names";
import { srdLine } from "@/lib/share-card";

// Pages are generated at build time and stay static (PROMPT 55: no timed regeneration); a manual correction from the
// admin area refreshes its page at once (app/actions/admin-content.ts). Production builds only public conditions; other entries stay preview-only.
export const dynamicParams = true;

export function generateStaticParams() {
  const preview = manualAvailable(process.env.VERCEL_ENV);
  return [...manualEntries.filter(entry => preview || entry.category === "condizioni"), ...legacyConditions].map(entry => ({ id: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Hidden or «In arrivo»: no name of the condition in the answer.
  if (id.startsWith("condizioni-") && await sectionClosed("condizioni")) return CLOSED_METADATA;
  const entry = (await getCorrectedManualEntry(id))?.entry;
  // Not found as in the page (missing, a preview-only entry, a condition of a hidden edition): the generic 404 metadata.
  if (!entry) notFound();
  if (entry.category === "condizioni") await editionCard("condizioni", entry.edizione === "2014" ? "2014" : "2024");
  else if (!manualAvailable(process.env.VERCEL_ENV)) notFound();
  const edition = entry.edizione === "2014" ? "2014" : "2024";
  const isCondition = entry.category === "condizioni";
  return pageMetadata({ name: entry.title, section: isCondition ? "Condizioni" : "Manuale", edition: isCondition ? edition : undefined, path: `/manuale/${entry.id}`,
    description: isCondition
      ? fitDescription(`${entry.title}, condizione delle ${dndEdition(edition)}: cosa comporta per la creatura e come si conclude, in italiano su Il Grimorio.App.`)
      : fitDescription(`${entry.title}: voce del manuale delle regole compatibili con D&D 5e, spiegata in italiano su Il Grimorio.App.`) });
}

export default async function ManualEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  if (id.startsWith("condizioni-")) await sectionPage("condizioni");
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
      {isCondition && <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Condizioni", path: "/compendio/condizioni" }, { name: `${entry.title}${edition === "2014" ? " (2014)" : ""}`, path: `/manuale/${entry.id}` }]} />}
      {hiddenEdition && <HiddenPartBar id={partId("condizioni", edition)} />}
      {isCondition ? (
        <div className="relative -ml-4 h-12"><BackButton /></div>
      ) : null}
      {/* «Condividi come immagine» (PROMPT 50): the conditions the public sees; never the other entries of the Manual. */}
      {isCondition && !hiddenEdition && await sectionPublic("condizioni") && <ShareRow path={`/manuale/${entry.id}`} title={entry.title} card={{
        ...ruleCard({ kind: "condizione", kicker: `Condizione · ${edition}`, title: entry.title, en: englishName("condizioni", edition, entry.id), edition,
          text: entry.blocks.filter(block => block.kind === "prose").map(block => block.text).join(" ") }),
        // The four 2014 conditions translated by us from the English SRD 5.1 (lib/manual-types.ts fonte).
        ...(entry.fonte === "traduzione-nostra" ? { attribution: `Da SRD 5.1, traduzione nostra · CC BY 4.0 · Wizards of the Coast` } : { attribution: srdLine(edition) }),
      }} />}
      {!isCondition && (
        <Link href={`/manuale?sezione=${entry.category}`} className="text-sm font-semibold text-primary">← {MANUAL_CATEGORIES[entry.category]}</Link>
      )}
      <header className={isCondition ? "mb-6 mt-3" : "mb-6 mt-6"}>
        {/* «Modifica» for the administrator only, drawn in the browser (never in the cached page). */}
        <AdminEditButton target={isCondition ? { kind: "contenuto", section: "condizioni", id: entry.id, edition } : { kind: "contenuto", section: "manuale", id: entry.id, edition: "2024" }} />
        {/* A condition (PROMPT 65): «CONDIZIONE» as the label of the style, capilettera and the divider with ✦ in the
            place of the thin rule. The other entries of the Manual stay as they were. */}
        {isCondition ? <Etichetta parti={[]} className="mb-1">{entry.subgroup || "Condizione"}</Etichetta>
          : <p className="mb-2 text-xs uppercase tracking-widest text-primary">{entry.subgroup}</p>}
        <h1 className={`${isCondition ? "pg-capolettera " : ""}font-serif text-4xl font-bold leading-tight text-foreground`}>{entry.title}</h1>
        {isCondition && <Divisore className="mt-2" />}
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
