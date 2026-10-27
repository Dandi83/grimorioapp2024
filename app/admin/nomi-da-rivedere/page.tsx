import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { REVIEW_NAMES } from "@/lib/review-names";
import { getReviewNameCards } from "@/lib/review-names-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nomi da rivedere — Il Grimorio.App", robots: { index: false, follow: false } };

/**
 * «Nomi da rivedere»: the NO SRD spells and creatures, 2014 and 2024, whose name or text holds a proper name or a
 * trademark of lib/data/nomi-da-rivedere.json (lib/review-names-server.ts). Read only: no text is proposed.
 */
export default async function ReviewNamesPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const cards = await getReviewNameCards();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-10 pt-3">
      <Link href="/admin" className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-2 text-[15px] font-semibold text-primary">
        <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" /> Amministrazione
      </Link>
      <h1 className="font-serif text-[30px] font-bold leading-tight text-primary">Nomi da rivedere</h1>
      <p className="text-[15px] leading-6 text-muted">
        Incantesimi e mostri NON SRD (aggiunti da te, sintesi originali e homebrew), 2014 e 2024, visibili o nascosti, che nel nome o nel testo
        contengono un nome proprio o un marchio dell’elenco. Le schede SRD non sono controllate.
      </p>
      <details className="text-[14px] text-muted">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-foreground">Nomi cercati ({REVIEW_NAMES.length})</summary>
        <p data-review-name-list="" className="leading-6">{REVIEW_NAMES.map(item => item.nome).join(", ")}</p>
      </details>
      {cards.length === 0 ? (
        <p data-review-names-empty="" className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-5 text-center text-[16px] font-semibold text-[#2E6B3F]">
          Nessuna scheda NON SRD contiene questi nomi
        </p>
      ) : (
        <>
          <p aria-live="polite" className="text-[14px] font-semibold text-foreground">{cards.length === 1 ? "1 scheda" : `${cards.length} schede`}</p>
          <ul aria-label="Schede con nomi da rivedere" className="flex flex-col gap-3">
            {cards.map(card => (
              <li key={`${card.kind}:${card.id}`} data-review-name={`${card.kind}:${card.id}`} className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h2 className="font-serif text-[21px] font-bold leading-tight">{card.name}</h2>
                  <p className="text-[13px] font-semibold text-muted">
                    {card.kind === "incantesimo" ? "Incantesimo" : "Mostro"} · {card.edition} · {card.hidden ? "nascosta" : "visibile"}
                  </p>
                </div>
                <p className="mt-1 text-[15px]">
                  Nome trovato: <b data-review-found="" className="text-primary">{card.found.join(", ")}</b>
                  {card.source && <span className="text-muted"> · {card.source}</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-5">
                  <Link href={card.href} prefetch={false} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-primary underline underline-offset-4">Apri la scheda</Link>
                  <Link href={card.editHref} prefetch={false} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-primary underline underline-offset-4">Modifica</Link>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
