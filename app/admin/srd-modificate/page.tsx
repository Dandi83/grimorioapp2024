import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AdminLogin } from "@/components/admin-login";
import { FieldDiff } from "@/components/admin-srd/diff-text";
import { RestoreSrdButton } from "@/components/admin-srd/restore-button";
import { isAdmin } from "@/lib/admin-auth";
import { getSrdModifiedCards } from "@/lib/srd-modified-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schede SRD modificate — Il Grimorio.App", robots: { index: false, follow: false } };

/**
 * «Schede SRD modificate»: spells and creatures of both editions with an SRD record of the same id whose text no
 * longer matches it, so they have lost the source box (lib/srd-modified.ts, the same comparison as the box).
 * Read only, except «Ripristina testo SRD», which the administrator confirms card by card.
 */
export default async function SrdModifiedPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const cards = await getSrdModifiedCards();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-10 pt-3">
      <Link href="/admin" className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-2 text-[15px] font-semibold text-primary">
        <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" /> Amministrazione
      </Link>
      <h1 className="font-serif text-[30px] font-bold leading-tight text-primary">Schede SRD modificate</h1>
      <p className="text-[15px] leading-6 text-muted">
        Incantesimi e mostri, 2014 e 2024, che hanno un testo SRD ma non coincidono più con la fonte: per questo non mostrano il riquadro di provenienza. Le riparazioni di visualizzazione già approvate non contano.
      </p>
      {cards.length === 0 ? (
        <p data-srd-modified-empty="" className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-5 text-center text-[16px] font-semibold text-[#2E6B3F]">
          Tutte le schede SRD coincidono con la fonte
        </p>
      ) : (
        <>
          <p aria-live="polite" className="text-[14px] font-semibold text-foreground">{cards.length === 1 ? "1 scheda" : `${cards.length} schede`}</p>
          <ul aria-label="Schede SRD modificate" className="flex flex-col gap-4">
            {cards.map(card => {
              const diff = card.fields.map(field => <FieldDiff key={field.field} label={field.label} parts={field.diff} />);
              return (
                <li key={`${card.kind}:${card.id}`} data-srd-modified={`${card.kind}:${card.id}`} className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h2 className="font-serif text-[21px] font-bold leading-tight">{card.name}</h2>
                    <p className="text-[13px] font-semibold text-muted">{card.kind === "incantesimo" ? "Incantesimo" : "Mostro"} · {card.edition}</p>
                  </div>
                  <Link href={card.href} prefetch={false} className="mt-1 inline-flex min-h-9 items-center text-[14px] font-semibold text-primary underline underline-offset-4">Apri la scheda pubblica</Link>
                  <p className="text-[13px] text-muted">{card.fields.length === 1 ? "1 campo diverso" : `${card.fields.length} campi diversi`}</p>
                  {diff}
                  <RestoreSrdButton kind={card.kind} id={card.id} name={card.name}>{diff}</RestoreSrdButton>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
