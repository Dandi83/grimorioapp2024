import Link from "next/link";
import { BarChart3, BookOpen, ChevronRight, Eye, History, LogOut, Scale, TriangleAlert } from "lucide-react";

import { logoutAction } from "@/app/actions/admin";
import { AdminGlobalSearch } from "@/components/admin-home/global-search";
import { AdminLogin } from "@/components/admin-login";
import { dueChecks } from "@/lib/admin-checks";
import { isAdmin } from "@/lib/admin-auth";
import { adminEdition } from "@/lib/admin-edition-server";
import { editableEntries } from "@/lib/admin-lists";
import { readStatistics } from "@/lib/analytics";
import { periodRange } from "@/lib/analytics-stats";
import { SrdOnlyCard } from "@/components/admin-home/srd-only-card";
import { srdOnlyOverview } from "@/lib/srd-only";
import { romeTime } from "@/lib/srd-only-time";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Area riservata — Il Grimorio.App",
  robots: { index: false, follow: false },
};

/** People of the last 7 days (with consent), for the Statistiche tile; null when the statistics cannot be read. */
async function peopleThisWeek(): Promise<number | null> {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  return readStatistics(periodRange("7", today)).then(data => data.people).catch(() => null);
}

/**
 * The Home of the reserved area: the search of every card, «Da fare» (only the checks with something to do,
 * lib/admin-checks.ts) and four large tiles. The edition pill and the bell are in the bar above (app/admin/layout.tsx).
 */
export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const edition = await adminEdition();
  const [entries, due, people, srdOnly] = await Promise.all([editableEntries(edition), dueChecks(), peopleThisWeek(), srdOnlyOverview().catch(() => null)]);
  const tile = "flex min-h-[132px] flex-col justify-between rounded-[18px] p-4 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E0A21A]";
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-10 pt-3 lg:max-w-[960px]">
      <h1 className="font-serif text-[34px] font-bold leading-tight text-[#7A1F2B]">Area riservata</h1>
      <AdminGlobalSearch entries={entries} />

      {due.length > 0 && (
        <section id="da-fare" aria-labelledby="da-fare-titolo" data-due-list="" className="scroll-mt-20">
          <h2 id="da-fare-titolo" className="px-1 pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#7A4E00]">Da fare · {due.length}</h2>
          <ul className="flex flex-col gap-2">
            {due.map(check => (
              <li key={check.key}>
                <Link href={check.href} prefetch={false} data-due={check.key}
                  className={`flex min-h-14 items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-2 text-[16px] font-semibold ${check.urgent ? "border-[#A3262E] bg-[#F8E1E1] text-[#7A1F2B]" : "border-[#E0A21A] bg-[#FCEFD0] text-[#7A4E00]"}`}>
                  <TriangleAlert size={20} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                  <span className="flex-1">{check.text}</span>
                  <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Sezioni dell’area riservata" className="grid grid-cols-2 gap-3">
        <Link href="/admin/contenuti" prefetch={false} className={`${tile} bg-[#7A1F2B] text-[#FFFBF0]`}>
          <BookOpen size={26} strokeWidth={1.8} aria-hidden="true" />
          <span><span className="block font-serif text-[22px] font-bold leading-tight">Contenuti</span><span className="text-[14px] text-[#F6E3D6]">Schede {edition}</span></span>
        </Link>
        <Link href="/admin/statistiche" prefetch={false} className={`${tile} bg-[#2B2118] text-[#FFFBF0]`}>
          <BarChart3 size={26} strokeWidth={1.8} className="text-[#E0A21A]" aria-hidden="true" />
          <span><span className="block font-serif text-[22px] font-bold leading-tight">Statistiche</span>
            <span className="text-[14px] text-[#EDE3CC]" data-tile-people={people ?? ""}>{people === null ? "Ultimi 7 giorni" : `${people.toLocaleString("it-IT")} ${people === 1 ? "persona" : "persone"} · 7 giorni`}</span></span>
        </Link>
        <Link href="/admin/sezioni" prefetch={false} className={`${tile} border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]`}>
          <Eye size={26} strokeWidth={1.8} className="text-[#7A1F2B]" aria-hidden="true" />
          <span><span className="block font-serif text-[22px] font-bold leading-tight">Sezioni</span><span className="text-[14px] text-[#5E4E3E]">Cosa vedono gli utenti</span></span>
        </Link>
        <Link href="/admin/registro" prefetch={false} className={`${tile} border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]`}>
          <History size={26} strokeWidth={1.8} className="text-[#7A1F2B]" aria-hidden="true" />
          <span><span className="block font-serif text-[22px] font-bold leading-tight">Registro</span><span className="text-[14px] text-[#5E4E3E]">Ultime modifiche</span></span>
        </Link>
      </nav>
      {/* Bilanciamento (PROMPT 11): a tool of the administrator, under the four sections. */}
      <Link href="/admin/bilanciamento" prefetch={false} data-balance-link="" className="mt-3 flex min-h-[72px] items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-[#7A4E00] bg-[#FCEFD0] p-4 text-[#2B2118] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E0A21A]">
        <Scale size={26} strokeWidth={1.8} className="text-[#7A4E00]" aria-hidden="true" />
        <span><span className="block font-serif text-[22px] font-bold leading-tight">Bilanciamento</span><span className="text-[14px] text-[#5E4E3E]">Mostri originali rispetto al loro GS</span></span>
      </Link>
      {/* «Modalità solo SRD» (PROMPT 39): the emergency switch, the last card. */}
      {srdOnly && <SrdOnlyCard attiva={srdOnly.attiva} dal={srdOnly.dal ? romeTime(srdOnly.dal) : null} quanti={srdOnly.quanti} counts={srdOnly.counts} />}

      <div className="mt-4 flex items-center justify-between border-t border-[#DDCFAE] pt-3 lg:hidden">
        <Link href="/" className="inline-flex min-h-11 items-center text-[14px] text-[#5E4E3E]">‹ Torna al sito</Link>
        <form action={logoutAction}>
          <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-[#5E4E3E]"><LogOut size={16} aria-hidden="true" /> Esci</button>
        </form>
      </div>
    </main>
  );
}
