import Link from "next/link";
import { BellRing, ChevronLeft, ChevronRight } from "lucide-react";

import { markAllReadAction } from "@/app/actions/admin-notifications";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { listFeedback } from "@/lib/feedback";
import { aboutLabel, formatWhen, TYPE_LABELS } from "@/lib/feedback-input";
import { pageName } from "@/lib/feedback-names";
import { listProposals } from "@/lib/homebrew";
import { HOMEBREW_EDITION_LABEL } from "@/lib/homebrew-types";
import { listDevices } from "@/lib/push";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifiche — Il Grimorio.App", robots: { index: false, follow: false } };

type Filter = "tutte" | "segnalazioni" | "proposte";
const FILTERS: [Filter, string][] = [["tutte", "Tutte"], ["segnalazioni", "Segnalazioni"], ["proposte", "Proposte"]];

interface Notice {
  id: string; href: string; label: string; text: string; about: string; when: Date; unread: boolean;
  /** Rights requests not handled yet: red, on top until resolved or archived. */
  rights: boolean;
}

const short = (text: string) => { const line = text.replace(/\s+/g, " ").trim(); return line.length > 110 ? `${line.slice(0, 109).trimEnd()}…` : line; };

/**
 * Notifications: reports and homebrew proposals in one list, newest first, with the open rights requests on top.
 * Unread: new reports and proposals to review. The pages Segnalazioni and Proposte homebrew stay one tap away.
 */
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  const filter: Filter = FILTERS.some(([key]) => key === query.tipo) ? (query.tipo as Filter) : "tutte";
  const [{ reports }, toReview, approved, refused, devices] = await Promise.all([
    listFeedback().catch(() => ({ reports: [], nuove: 0 })), listProposals("da-vedere").catch(() => []),
    listProposals("approvata").catch(() => []), listProposals("rifiutata").catch(() => []), listDevices().then(list => list.length).catch(() => 0),
  ]);
  const names = await Promise.all(reports.map(report => pageName(report.percorso, report.edizione).catch(() => null)));
  const notices: Notice[] = [
    ...(filter === "proposte" ? [] : reports.map((report, index): Notice => ({
      id: `s-${report.id}`, href: `/admin/segnalazioni/${report.id}`, label: report.tipo === "diritti" ? "Diritti d’autore o marchi" : TYPE_LABELS[report.tipo],
      text: short(report.messaggio), about: report.percorso ? aboutLabel(names[index], report.percorso, report.edizione) : "Generale",
      when: new Date(report.creato_il), unread: report.stato === "nuova",
      rights: report.tipo === "diritti" && (report.stato === "nuova" || report.stato === "letta"),
    }))),
    ...(filter === "segnalazioni" ? [] : [...toReview, ...approved.slice(0, 30), ...refused.slice(0, 30)].map((proposal): Notice => ({
      id: `p-${proposal.id}`, href: `/admin/proposte/${proposal.id}`, label: proposal.stato === "da-vedere" ? "Proposta homebrew" : proposal.stato === "approvata" ? "Proposta approvata" : "Proposta rifiutata",
      text: `«${proposal.scheda.nome}», proposta da ${proposal.nickname}`, about: `Bestiario ${HOMEBREW_EDITION_LABEL[proposal.scheda.edizione]}`,
      when: new Date(proposal.creata_il), unread: proposal.stato === "da-vedere", rights: false,
    }))),
  ].sort((a, b) => Number(b.rights) - Number(a.rights) || b.when.getTime() - a.when.getTime());
  const unread = notices.filter(notice => notice.unread).length;
  const now = new Date();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-10 pt-3 lg:max-w-[960px]">
      <Link href="/admin" className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start px-2 text-[15px] font-bold text-[#7A1F2B]"><ChevronLeft size={18} aria-hidden="true" /> Area riservata</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-[32px] font-bold leading-tight text-[#7A1F2B]">Notifiche</h1>
        {reports.some(report => report.stato === "nuova") && (
          <form action={markAllReadAction}>
            <button type="submit" className="min-h-11 rounded-full px-2 text-[15px] font-bold text-[#7A1F2B] underline underline-offset-4">Segna tutte lette</button>
          </form>
        )}
      </div>
      <nav aria-label="Tipo di notifica" className="flex gap-2">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={key === "tutte" ? "/admin/notifiche" : `/admin/notifiche?tipo=${key}`} aria-current={filter === key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-[15px] font-semibold ${filter === key ? "border-[#7A1F2B] bg-[#7A1F2B] text-[#FFFBF0]" : "border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]"}`}>{label}</Link>
        ))}
      </nav>
      <p className="text-[14px] text-[#5E4E3E]" aria-live="polite">{unread ? `${unread} ${unread === 1 ? "non letta" : "non lette"}` : "Tutto letto"}</p>
      {notices.length === 0 ? (
        <p className="rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 py-6 text-center text-[15px] text-[#5E4E3E]">Nessuna notifica.</p>
      ) : (
        <ul className="overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]" aria-label="Notifiche">
          {notices.map(notice => (
            <li key={notice.id} data-notice={notice.id} data-unread={notice.unread ? "" : undefined} data-rights={notice.rights ? "" : undefined}
              className={`border-t border-[#DDCFAE]/70 first:border-t-0 ${notice.rights ? "border-l-4 border-l-[#A3262E] bg-[#F8E1E1]" : ""}`}>
              <Link href={notice.href} prefetch={false} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-2 size-2.5 shrink-0 rounded-full ${notice.unread ? (notice.rights ? "bg-[#A3262E]" : "bg-[#7A1F2B]") : "bg-transparent"}`} aria-label={notice.unread ? "Non letta" : undefined} role={notice.unread ? "img" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-[8px] px-2 text-[12px] font-bold leading-5 ${notice.rights ? "bg-[#A3262E] text-[#FFFBF0]" : notice.label.startsWith("Proposta") ? "bg-[#FCEFD0] text-[#7A4E00]" : "bg-[#F3D3D3] text-[#7A1F2B]"}`}>{notice.label}</span>
                    <span className="text-[13px] text-[#5E4E3E]">{formatWhen(notice.when, now)}</span>
                  </span>
                  <span className={`mt-1 block break-words text-[15px] leading-snug ${notice.unread ? "font-semibold" : ""}`}>{notice.text}</span>
                  <span className="mt-0.5 block text-[13px] text-[#5E4E3E]">{notice.about}</span>
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-[#B9A57C]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-x-5">
        <Link href="/admin/segnalazioni" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#7A1F2B] underline underline-offset-4">Tutte le segnalazioni</Link>
        <Link href="/admin/proposte" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#7A1F2B] underline underline-offset-4">Proposte homebrew</Link>
      </div>
      <Link href="/admin/notifiche/dispositivi" className="mt-2 flex min-h-14 items-center gap-3 rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 text-[15px] font-semibold">
        <BellRing size={20} className="text-[#7A1F2B]" aria-hidden="true" />
        <span className="flex-1">Avvisi sul telefono · {devices ? `attivi su ${devices} ${devices === 1 ? "dispositivo" : "dispositivi"}` : "nessun dispositivo"}</span>
        <ChevronRight size={18} className="text-[#B9A57C]" aria-hidden="true" />
      </Link>
    </main>
  );
}
