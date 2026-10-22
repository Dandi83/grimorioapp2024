import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassBody, ClassHeader, CLASS_SOURCES } from "@/components/classes/class-sheet";
import { ClassSheetEditions } from "@/components/classes/class-editions";
import { SectionCorrectionNote } from "@/components/correction-note";
import { ReportLink } from "@/components/feedback/report-link";
import { getCorrectedClasses } from "@/lib/corrected-content";
import { CLASS_IDS, isClassId } from "@/lib/classes";
import type { ClassEdition } from "@/lib/classes-types";

export const dynamicParams = false;
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export function generateStaticParams() {
  return CLASS_IDS.map(id => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = (await getCorrectedClasses()).list.find(item => item.id === id);
  return { title: entry ? `${entry.editions["2024"]!.nome} — Classi — Il Grimorio.App` : "Classe non trovata" };
}

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isClassId(id)) notFound();
  const corrected = await getCorrectedClasses();
  const entry = corrected.list.find(item => item.id === id);
  if (!entry) notFound();
  const corrections = corrected.corrections.get(id);
  const headers = {} as Record<ClassEdition, React.ReactNode>;
  const bodies = {} as Record<ClassEdition, React.ReactNode>;
  for (const edition of ["2024", "2014"] as const) {
    const card = entry.editions[edition];
    const name = (card ?? entry.editions["2024"]!).nome;
    headers[edition] = <ClassHeader id={id} name={name} line={card ? `Classe · ${CLASS_SOURCES[edition]}, p. ${card.pagina}` : `Classe · ${CLASS_SOURCES[edition]}`} />;
    bodies[edition] = card ? (
      <div className="space-y-5 px-4 pt-4 sm:px-6">
        <ClassBody card={card} id={id} edition={edition} other={entry.editions[edition === "2024" ? "2014" : "2024"] ? { edition: edition === "2024" ? "2014" : "2024", href: `/classi/${id}?edizione=${edition === "2024" ? "2014" : "2024"}` } : undefined} />
        <SectionCorrectionNote section="classi" id={id} edition={edition} corrections={corrections?.[edition]} />
        <p className="text-center text-[13px] text-muted">Fonte: <Link href="/fonti" className="underline underline-offset-4">{CLASS_SOURCES[edition]} (CC-BY-4.0)</Link></p>
      </div>
    ) : (
      <div className="px-4 pt-4 sm:px-6">
        <p role="note" className="rounded-[14px] border border-border bg-card px-4 py-3 text-center text-[15px] font-semibold text-muted">
          La scheda 2014 (SRD 5.1) di questa classe è in arrivo.
        </p>
      </div>
    );
  }
  return (
    <article className="pb-8">
      <ClassSheetEditions headers={headers} bodies={bodies} />
      <ReportLink edition="2024" />
    </article>
  );
}
