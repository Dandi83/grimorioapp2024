import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { GearEditionPanels } from "@/components/equipment/gear-edition-panels";
import { PartBlock } from "@/components/sections/part-block";
import { linksOut, pageEditions, sectionPage, CLOSED_METADATA, sectionClosed } from "@/lib/section-view";
import { MagicItemSheet } from "@/components/magic-items/magic-item-sheet";
import { SectionCorrectionNote } from "@/components/correction-note";
import { getCorrectedMagicItems } from "@/lib/corrected-content";
import { compareMagicItem, findMagicItemEntry, magicItemEntries, magicItemEntryHref, seeAlso, type MagicItemChange } from "@/lib/magic-items-editions";
import type { MagicItemEdition } from "@/lib/magic-items-types";
import { ReportLink } from "@/components/feedback/report-link";
import { AdminEditButton } from "@/components/admin-edit/admin-edit-button";

export const dynamicParams = false;
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

const LIST = "/oggetti-magici";

export function generateStaticParams() {
  return magicItemEntries.flatMap(entry => [entry.id, ...(entry.id2014 ? [entry.id2014] : [])]).map(id => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Hidden or «In arrivo»: no name or description of the card in the answer.
  if (await sectionClosed("oggetti-magici")) return CLOSED_METADATA;
  const found = findMagicItemEntry((await params).id, (await getCorrectedMagicItems()).list);
  const item = found && (found.entry.editions[found.edition ?? "2024"] ?? found.entry.editions["2014"]);
  return { title: item ? `${item.nome} — Oggetti magici — Il Grimorio.App` : "Oggetto non trovato" };
}

/** "2014 → 2024": name, rarity and attunement when they change (the edition is chosen with the pill only). */
function Changes({ changes }: { changes: MagicItemChange[] }) {
  return (
    <section className="space-y-2.5" aria-label="Differenze tra le edizioni">
      <h2 className="font-serif text-[22px] font-bold text-primary">2014 → 2024</h2>
      <table className="w-full table-fixed overflow-hidden rounded-[14px] border border-border bg-card text-[14px]">
        <thead className="bg-elevated text-left text-[12px] font-bold tracking-[0.06em] text-muted">
          <tr><th className="w-[24%] px-2.5 py-2"><span className="sr-only">Voce</span></th><th className="px-2 py-2">2014</th><th className="px-2 py-2">2024</th></tr>
        </thead>
        <tbody>
          {changes.map(row => (
            <tr key={row.label} className="border-t border-divider align-top">
              <th scope="row" className="px-2.5 py-2.5 text-left font-normal text-muted">{row.label}</th>
              <td className="break-words px-2 py-2.5">{row.before}</td>
              <td className="break-words px-2 py-2.5 font-bold text-primary">{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function MagicItemPage({ params }: { params: Promise<{ id: string }> }) {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("oggetti-magici");
  const corrected = await getCorrectedMagicItems();
  const found = findMagicItemEntry((await params).id, corrected.list);
  if (!found) notFound();
  const { entry, edition } = found;
  // An edition hidden from /admin/sezioni is not in the page; an address of that edition is not found.
  const shown = await pageEditions("oggetti-magici");
  if ((edition && !shown.includes(edition)) || !shown.some(value => entry.editions[value])) notFound();
  const changes = shown.length === 2 ? compareMagicItem(entry) : [];
  const hidden = await linksOut();
  const also = seeAlso(entry, corrected.list);
  const corrections = corrected.corrections.get(entry.id);
  const hrefs: Partial<Record<MagicItemEdition, string>> = {};
  const panels: Partial<Record<MagicItemEdition, React.ReactNode>> = {};
  for (const value of ["2024", "2014"] as const) {
    const item = entry.editions[value];
    if (!item || !shown.includes(value)) continue;
    hrefs[value] = magicItemEntryHref(entry, value);
    panels[value] = (
      <div className="space-y-5">
        {/* «Modifica» for the administrator only, drawn in the browser (never in the cached page). */}
        <AdminEditButton target={{ kind: "contenuto", section: "oggetti-magici", id: entry.id, edition: value }} />
        <MagicItemSheet item={item} edition={value} hidden={hidden} />
        <SectionCorrectionNote section="oggetti-magici" id={entry.id} edition={value} corrections={corrections?.[value]} />
        {changes.length > 0 && <PartBlock section="oggetti-magici" part="confronto"><Changes changes={changes} /></PartBlock>}
      </div>
    );
  }
  return (
    <article className="space-y-5 px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback={LIST} label="Tutti gli oggetti magici" />
      <div>
        <GearEditionPanels section="oggetti-magici" panels={panels} hrefs={hrefs} fixed={edition} listHref={LIST} />
      </div>
      {also.length > 0 && (
        <section aria-label="Vedi anche" className="rounded-[14px] border border-border bg-card px-4 py-3 text-[15px] leading-6">
          <p className="font-semibold">Vedi anche nel 2024:</p>
          <ul className="mt-1 list-disc pl-5">
            {also.map(other => <li key={other.id}><Link className="text-primary underline underline-offset-4" href={magicItemEntryHref(other, "2024")}>{other.editions["2024"]!.nome}</Link></li>)}
          </ul>
        </section>
      )}
      <ReportLink />
    </article>
  );
}
