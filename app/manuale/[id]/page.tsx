import Link from "next/link";
import { notFound } from "next/navigation";
import { getManualEntry, manualAvailable, manualEntries } from "@/lib/manual";
import { MANUAL_CATEGORIES } from "@/lib/manual-types";
import { ManualContent } from "@/components/manual-content";
import { BackButton } from "@/components/back-button";

// The text never changes at runtime: pages are generated at build time.
// Production builds only public conditions; other entries stay preview-only.
export const dynamicParams = true;

export function generateStaticParams() {
  const preview = manualAvailable(process.env.VERCEL_ENV);
  return manualEntries.filter(entry => preview || entry.category === "condizioni").map(entry => ({ id: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getManualEntry(id);
  return { title: `${entry?.title || "Voce non trovata"} — ${entry?.category === "condizioni" ? "Condizioni" : "Manuale"} · Il Grimorio.App` };
}

export default async function ManualEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getManualEntry(id);
  if (!entry) notFound();
  const isCondition = entry.category === "condizioni";
  // Conditions are public reference details; the Manual and its other entries stay preview-only.
  if (!isCondition && !manualAvailable(process.env.VERCEL_ENV)) notFound();

  return (
    <article className="min-w-0 px-6 py-7">
      {isCondition ? (
        <div className="relative -ml-4 h-12"><BackButton /></div>
      ) : (
        <Link href={`/manuale?sezione=${entry.category}`} className="text-sm font-semibold text-primary">← {MANUAL_CATEGORIES[entry.category]}</Link>
      )}
      <header className={isCondition ? "mb-6 mt-3 border-b border-primary/40 pb-5" : "mb-6 mt-6"}>
        <p className="mb-2 text-xs uppercase tracking-widest text-primary">{entry.subgroup || (isCondition ? "Condizione" : "")}</p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-foreground">{entry.title}</h1>
      </header>
      {entry.subgroup === "Classi" && ["Bardo", "Chierico", "Druido", "Mago", "Paladino", "Ranger", "Stregone", "Warlock"].includes(entry.title) && (
        <Link href={`/grimorio?classe=${entry.title.toLowerCase()}`} className="mb-6 inline-block rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary">Consulta gli incantesimi della classe →</Link>
      )}
      <ManualContent entry={entry} />
    </article>
  );
}
