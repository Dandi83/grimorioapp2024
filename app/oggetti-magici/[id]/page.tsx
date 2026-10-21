import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { GearEditionPanels } from "@/components/equipment/gear-edition-panels";
import { MagicItemSheet } from "@/components/magic-items/magic-item-sheet";
import { compareMagicItem, findMagicItemEntry, magicItemEntries, magicItemEntryHref, seeAlso, type MagicItemChange } from "@/lib/magic-items-editions";
import type { MagicItemEdition } from "@/lib/magic-items-types";

export const dynamicParams = false;

const LIST = "/oggetti-magici";

export function generateStaticParams() {
  return magicItemEntries.flatMap(entry => [entry.id, ...(entry.id2014 ? [entry.id2014] : [])]).map(id => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = findMagicItemEntry((await params).id);
  const item = found && (found.entry.editions[found.edition ?? "2024"] ?? found.entry.editions["2014"]);
  return { title: item ? `${item.nome} — Oggetti magici — Il Grimorio.App` : "Oggetto non trovato" };
}

/** "2014 → 2024": name, rarity and attunement when they change, and the way to the other edition's sheet. */
function Changes({ changes, other, href }: { changes: MagicItemChange[]; other: MagicItemEdition; href: string }) {
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
      {/* A full load: the edition is read from the address when the page opens. */}
      <a className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline underline-offset-4" href={`${href}?edizione=${other}`}>
        Vedi anche la scheda {other}
      </a>
    </section>
  );
}

export default async function MagicItemPage({ params }: { params: Promise<{ id: string }> }) {
  const found = findMagicItemEntry((await params).id);
  if (!found) notFound();
  const { entry, edition } = found;
  const changes = compareMagicItem(entry);
  const also = seeAlso(entry);
  const hrefs: Partial<Record<MagicItemEdition, string>> = {};
  const panels: Partial<Record<MagicItemEdition, React.ReactNode>> = {};
  for (const value of ["2024", "2014"] as const) {
    const item = entry.editions[value];
    if (!item) continue;
    hrefs[value] = magicItemEntryHref(entry, value);
    const other = value === "2024" ? "2014" : "2024";
    panels[value] = (
      <div className="space-y-5">
        <MagicItemSheet item={item} edition={value} />
        {changes.length > 0 && <Changes changes={changes} other={other} href={magicItemEntryHref(entry, other)} />}
      </div>
    );
  }
  return (
    <article className="space-y-5 px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback={LIST} label="Tutti gli oggetti magici" />
      <div>
        <GearEditionPanels panels={panels} hrefs={hrefs} fixed={edition} listHref={LIST} />
      </div>
      {also.length > 0 && (
        <section aria-label="Vedi anche" className="rounded-[14px] border border-border bg-card px-4 py-3 text-[15px] leading-6">
          <p className="font-semibold">Vedi anche nel 2024:</p>
          <ul className="mt-1 list-disc pl-5">
            {also.map(other => <li key={other.id}><Link className="text-primary underline underline-offset-4" href={magicItemEntryHref(other, "2024")}>{other.editions["2024"]!.nome}</Link></li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
