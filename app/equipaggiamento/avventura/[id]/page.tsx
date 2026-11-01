import { Breadcrumbs } from "@/components/seo/json-ld";
import { editionOfPage, itemDescription, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { GearEditionPanels } from "@/components/equipment/gear-edition-panels";
import { PartBlock } from "@/components/sections/part-block";
import { pageEditions, sectionPage, CLOSED_METADATA, sectionClosed } from "@/lib/section-view";
import type { GearItem, GearTable } from "@/lib/adventuring-gear";
import { gear2014Source, type Gear2014Item } from "@/lib/adventuring-gear-2014";
import { compareGear, findGearEntry, gearEntries, gearHref } from "@/lib/adventuring-gear-editions";
import { SectionCorrectionNote } from "@/components/correction-note";
import { getCorrectedGear } from "@/lib/corrected-content";
import type { EquipmentEdition } from "@/lib/equipment-types";
import { ReportLink } from "@/components/feedback/report-link";

export const dynamicParams = false;
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

const SRD_521 = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const LIST = "/equipaggiamento/avventura";

export function generateStaticParams() {
  return gearEntries.flatMap(entry => [entry.id, ...(entry.id2014 ? [entry.id2014] : [])]).map(id => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Hidden or «In arrivo»: no name or description of the card in the answer.
  if (await sectionClosed("avventura")) return CLOSED_METADATA;
  const found = findGearEntry((await params).id, (await getCorrectedGear()).list);
  // Not found as in the page (missing, or of a hidden edition): the generic metadata of the site's 404.
  const shown = await pageEditions("avventura");
  if (!found || (found.edition && !shown.includes(found.edition))) notFound();
  const item = (found.edition ? [found.edition] : (["2024", "2014"] as const).filter(value => shown.includes(value))).map(value => found.entry.editions[value]).find(Boolean);
  if (!item) notFound();
  const edition = found.edition ?? editionOfPage(found.entry.editions, shown);
  return pageMetadata({ name: item.nome, section: "Equipaggiamento d’avventura", edition, path: `/equipaggiamento/avventura/${(await params).id}`,
    description: itemDescription(item.nome, "equipaggiamento d’avventura", edition, "Costo, peso e uso") });
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-divider px-2 py-3 text-center last:border-r-0">
      <p className="text-[12px] font-bold tracking-[0.06em] text-muted">{label}</p>
      <p className="font-serif text-xl font-bold leading-tight">{value}</p>
    </div>
  );
}

/** A printed table as one card per row: first column as title, the others as label and value. */
function TableCards({ table }: { table: GearTable }) {
  return (
    <section className="space-y-2" aria-label={table.title || "Tabella"}>
      {table.title && <h2 className="font-serif text-[22px] font-bold text-primary">{table.title}</h2>}
      <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
        {table.rows.map(row => (
          <li key={row[0]} className="border-b border-divider px-3.5 py-2.5 last:border-b-0">
            <p className="font-serif text-[19px] font-bold leading-tight">{row[0]}</p>
            <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[15px]">
              {table.columns.slice(1).map((column, i) => (
                <div key={column} className="flex gap-1"><dt className="text-muted">{column}:</dt><dd className="font-semibold">{row[i + 1]}</dd></div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** level: one H1 per page (PROMPT 45): the 2014 panel next to a 2024 one has the same title as an H2, same look. */
function Heading({ nome, kind, edition, level: Title = "h1" }: { nome: string; kind: string; edition: EquipmentEdition; level?: "h1" | "h2" }) {
  return (
    <div className="text-center">
      <Title className="font-serif text-4xl font-bold leading-tight">{nome}</Title>
      <p className="mt-1 text-[15px] text-muted">{kind} · edizione {edition}</p>
    </div>
  );
}

function Sheet2024({ item }: { item: GearItem }) {
  return (
    <div className="space-y-5 pt-4">
      <Heading nome={item.nome} kind={item.dotazione ? "Dotazione" : "Equipaggiamento d’avventura"} edition="2024" />
      <div className="grid grid-cols-2 rounded-[14px] border border-border bg-card">
        <Cell label="COSTO" value={item.prezzo || "non verificato"} />
        <Cell label="PESO" value={item.peso ?? "non verificato"} />
      </div>
      <div className="space-y-3">
        {item.paragraphs.map((paragraph, i) => <p key={i} className="font-serif text-[1.05rem] leading-7">{paragraph}</p>)}
      </div>
      {item.tables.map(table => <TableCards key={table.title} table={table} />)}
      <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: SRD 5.2.1 italiano — «Equipaggiamento d’avventura».</p>
        <a className="underline underline-offset-4" href={`${SRD_521}#page=${item.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {item.page}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </div>
  );
}

function Sheet2014({ item, level }: { item: Gear2014Item; level?: "h1" | "h2" }) {
  const cells = [
    ...(item.costo ? [["COSTO", item.costo]] : []),
    ...(item.peso ? [["PESO", item.peso]] : []),
  ];
  return (
    <div className="space-y-5 pt-4">
      <Heading nome={item.nome} kind={item.dotazione ? "Dotazione" : item.gruppo ? "Gruppo di oggetti" : "Equipaggiamento d’avventura"} edition="2014" level={level} />
      {cells.length > 0 && (
        <div className={`grid rounded-[14px] border border-border bg-card ${cells.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {cells.map(([label, value]) => <Cell key={label} label={label} value={value} />)}
        </div>
      )}
      {item.capienza && (
        <div className="rounded-[14px] border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-bold tracking-[0.06em] text-muted">CAPIENZA</p>
          <p className="text-[16px] font-semibold">{item.capienza}</p>
          {item.capienzaNota && <p className="mt-1 text-sm text-muted">{item.capienzaNota}</p>}
        </div>
      )}
      <div className="space-y-3">
        {item.paragraphs.map((paragraph, i) => <p key={i} className="font-serif text-[1.05rem] leading-7">{paragraph}</p>)}
      </div>
      {item.righe && <TableCards table={{ title: "", columns: ["Oggetto", "Costo", "Peso"], rows: item.righe.map(row => [row.nome, row.costo, row.peso]) }} />}
      <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: SRD 5.1 italiano — «Equipaggiamento d’avventura»{item.dotazione ? ", «Dotazioni»" : ""}.</p>
        <a className="underline underline-offset-4" href={`${gear2014Source.sourceUrl}#page=${item.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {item.page}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </div>
  );
}

export default async function GearItemPage({ params }: { params: Promise<{ id: string }> }) {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("avventura");
  const corrected = await getCorrectedGear();
  const found = findGearEntry((await params).id, corrected.list);
  if (!found) notFound();
  const { entry, edition } = found;
  // An edition hidden from /admin/sezioni is not in the page; an address of that edition is not found.
  const shown = await pageEditions("avventura");
  const has = (value: EquipmentEdition) => Boolean(entry.editions[value]) && shown.includes(value);
  if ((edition && !shown.includes(edition)) || !(has("2024") || has("2014"))) notFound();
  const corrections = corrected.corrections.get(entry.id);
  const note = (value: EquipmentEdition) => <div className="mt-5"><SectionCorrectionNote section="avventura" id={entry.id} edition={value} corrections={corrections?.[value]} /></div>;
  const rows = shown.length === 2 ? compareGear(entry) : [];
  const panels: Partial<Record<EquipmentEdition, React.ReactNode>> = {};
  if (has("2024")) panels["2024"] = <><Sheet2024 item={entry.editions["2024"]!} />{note("2024")}</>;
  if (has("2014")) panels["2014"] = <><Sheet2014 item={entry.editions["2014"]!} level={has("2024") ? "h2" : "h1"} />{note("2014")}</>;
  return (
    <article className="space-y-5 px-4 pb-8 pt-4 sm:px-6">
      <Breadcrumbs crumbs={[{ name: "Equipaggiamento", path: "/equipaggiamento" }, { name: "Equipaggiamento d’avventura", path: LIST }, { name: (entry.editions[edition ?? "2024"] ?? entry.editions["2014"] ?? entry.editions["2024"])!.nome, path: gearHref(entry, edition ?? (entry.editions["2024"] ? "2024" : "2014")) }]} />
      <BackButton fallback={LIST} label="Tutti gli oggetti" />
      <div>
        <GearEditionPanels section="avventura" panels={panels} fixed={edition} listHref={LIST}
          hrefs={{ ...(has("2014") ? { "2014": gearHref(entry, "2014") } : {}), ...(has("2024") ? { "2024": gearHref(entry, "2024") } : {}) }} />
      </div>
      {rows.length > 0 && (
        <PartBlock section="avventura" part="confronto">
        <section className="space-y-2.5" aria-label="Differenze tra le edizioni">
          <h2 className="font-serif text-[22px] font-bold text-primary">2014 → 2024</h2>
          <table className="w-full table-fixed overflow-hidden rounded-[14px] border border-border bg-card text-[14px]">
            <thead className="bg-elevated text-left text-[12px] font-bold tracking-[0.06em] text-muted">
              <tr><th className="w-[24%] px-2.5 py-2"><span className="sr-only">Voce</span></th><th className="px-2 py-2">2014</th><th className="px-2 py-2">2024</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-t border-divider align-top">
                  <th scope="row" className="px-2.5 py-2.5 text-left font-normal text-muted">{row.label}</th>
                  <td className="break-words px-2 py-2.5">{row.before}</td>
                  <td className="break-words px-2 py-2.5 font-bold text-primary">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        </PartBlock>
      )}
      <ReportLink />
    </article>
  );
}
