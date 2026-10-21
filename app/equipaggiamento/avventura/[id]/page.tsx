import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { gearItems, getGearItem, type GearTable } from "@/lib/adventuring-gear";

export const dynamicParams = false;

const SRD_521 = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";

export function generateStaticParams() {
  return gearItems.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const item = getGearItem((await params).id);
  return { title: item ? `${item.nome} — Equipaggiamento d’avventura — Il Grimorio.App` : "Oggetto non trovato" };
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

export default async function GearItemPage({ params }: { params: Promise<{ id: string }> }) {
  const item = getGearItem((await params).id);
  if (!item) notFound();
  return (
    <article className="space-y-5 px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback="/equipaggiamento/avventura" label="Tutti gli oggetti" />
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold leading-tight">{item.nome}</h1>
        <p className="mt-1 text-[15px] text-muted">{item.dotazione ? "Dotazione" : "Equipaggiamento d’avventura"} · edizione 2024</p>
      </div>
      <div className="grid grid-cols-2 rounded-[14px] border border-border bg-card">
        <Cell label="COSTO" value={item.prezzo || "non verificato"} />
        <Cell label="PESO" value={item.peso ?? "non verificato"} />
      </div>
      <div className="space-y-3">
        {item.paragraphs.map((paragraph, i) => <p key={i} className="font-serif text-[1.05rem] leading-7">{paragraph}</p>)}
      </div>
      {item.tables.map(table => <TableCards key={table.title} table={table} />)}
      <aside aria-label="Fonte" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: SRD 5.2.1 italiano — «Equipaggiamento d’avventura». Edizione 2024; la 2014 arriva presto.</p>
        <a className="underline underline-offset-4" href={`${SRD_521}#page=${item.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {item.page}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </article>
  );
}
