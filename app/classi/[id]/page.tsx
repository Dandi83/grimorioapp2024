import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassBody, ClassHeader, CLASS_PARTS, CLASS_SOURCES, type ClassParts } from "@/components/classes/class-sheet";
import { ClassSheetEditions } from "@/components/classes/class-editions";
import { SectionCorrectionNote } from "@/components/correction-note";
import { ReportLink } from "@/components/feedback/report-link";
import { AdminEditButton } from "@/components/admin-edit/admin-edit-button";
import { getCorrectedClasses } from "@/lib/corrected-content";
import { CLASS_IDS, isClassId } from "@/lib/classes";
import type { ClassEdition } from "@/lib/classes-types";
import { pageEditions, partState, sectionsOut } from "@/lib/section-view";

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
  const spellsLink = !(await sectionsOut()).includes("incantesimi");
  // Editions and parts of the sheet hidden from /admin/sezioni: left out for the public, labelled for the administrator.
  const shown = await pageEditions("classi");
  if (!shown.some(edition => entry.editions[edition])) notFound();
  const parts = Object.fromEntries(await Promise.all(CLASS_PARTS.map(async key => [key, await partState("classi", key)]))) as ClassParts;
  const headers: Partial<Record<ClassEdition, React.ReactNode>> = {};
  const bodies: Partial<Record<ClassEdition, React.ReactNode>> = {};
  for (const edition of shown) {
    const card = entry.editions[edition];
    const name = (card ?? entry.editions["2024"]!).nome;
    headers[edition] = (
      <div className="relative">
        <ClassHeader id={id} name={name} line={card ? `Classe · ${CLASS_SOURCES[edition]}, p. ${card.pagina}` : `Classe · ${CLASS_SOURCES[edition]}`} />
        {/* «Modifica» for the administrator only, drawn in the browser (never in the cached page). */}
        {card && <AdminEditButton target={{ kind: "contenuto", section: "classi", id, edition }} desktop="lg:absolute lg:right-6 lg:top-6" />}
      </div>
    );
    bodies[edition] = card ? (
      <div className="space-y-5 px-4 pt-4 sm:px-6">
        <ClassBody card={card} id={id} edition={edition} spellsLink={spellsLink} parts={parts} />
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
