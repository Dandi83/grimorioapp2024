import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { listFeedback, type FeedbackFilter } from "@/lib/feedback";
import { pageName } from "@/lib/feedback-names";
import { FEEDBACK_STATES, FEEDBACK_TYPES, aboutLabel, formatWhen, type FeedbackState, type FeedbackType } from "@/lib/feedback-input";
import { TypePill } from "@/components/feedback/type-pill";
import { EditionChip } from "@/components/admin-edition/edition-chip";
import { isAdminEdition } from "@/lib/admin-edition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Segnalazioni — Il Grimorio.App", robots: { index: false, follow: false } };

const TYPE_FILTERS: { value?: FeedbackType; label: string }[] = [
  { label: "Tutte" }, { value: "errore", label: "Errori" }, { value: "mancanza", label: "Mancanze" }, { value: "consiglio", label: "Consigli" },
];
const STATE_FILTERS: { value: FeedbackState; label: string }[] = [
  { value: "nuova", label: "Nuove" }, { value: "letta", label: "Lette" }, { value: "risolta", label: "Risolte" }, { value: "archiviata", label: "Archiviate" },
];

function href(filter: FeedbackFilter) {
  const params = new URLSearchParams();
  if (filter.tipo) params.set("tipo", filter.tipo);
  if (filter.stato) params.set("stato", filter.stato);
  return `/admin/segnalazioni${params.size ? `?${params}` : ""}`;
}

export default async function FeedbackListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Login in place: a link opened from an email (no strict cookie on arrival) still reaches this page.
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  const filter: FeedbackFilter = {
    tipo: (FEEDBACK_TYPES as readonly unknown[]).includes(query.tipo) ? (query.tipo as FeedbackType) : undefined,
    stato: (FEEDBACK_STATES as readonly unknown[]).includes(query.stato) ? (query.stato as FeedbackState) : undefined,
  };
  const { reports, nuove } = await listFeedback(filter);
  const names = await Promise.all(reports.map(report => pageName(report.percorso, report.edizione)));
  const now = new Date();
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-8 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold text-primary">
        <ChevronLeft size={18} aria-hidden="true" /> Amministrazione
      </Link>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-[30px] font-bold text-primary">Segnalazioni</h1>
        <span className="text-sm text-muted">{nuove} {nuove === 1 ? "nuova" : "nuove"}</span>
      </div>
      <nav aria-label="Tipo" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TYPE_FILTERS.map(item => {
          const on = filter.tipo === item.value;
          return (
            <Link key={item.label} href={href({ ...filter, tipo: item.value })} aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-[22px] border-[1.5px] px-4 text-[15px] font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Stato" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {STATE_FILTERS.map(item => {
          const on = filter.stato === item.value;
          return (
            <Link key={item.value} href={href({ ...filter, stato: on ? undefined : item.value })} aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-[18px] px-3.5 text-sm ${on ? "bg-foreground font-semibold text-background" : "bg-elevated text-muted"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {reports.length === 0 ? (
        <p className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-6 text-center text-[15px] text-muted">Nessuna segnalazione{filter.tipo || filter.stato ? " con questi filtri" : ""}.</p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
          {reports.map((report, i) => (
            <li key={report.id} className="border-t border-elevated first:border-t-0">
              <Link href={`/admin/segnalazioni/${report.id}`} prefetch={false} className="flex flex-col gap-1 px-3.5 py-3">
                <span className="flex items-center gap-2">
                  <TypePill tipo={report.tipo} />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">
                    {formatWhen(new Date(report.creato_il), now)} · {report.percorso ? aboutLabel(names[i], report.percorso, null) : "nessuna pagina"}
                  </span>
                  {isAdminEdition(report.edizione) && <EditionChip edition={report.edizione} />}
                  {report.stato === "nuova" && <span className="shrink-0 rounded-[10px] bg-amber px-2 py-0.5 text-[11px] font-bold text-foreground">NUOVA</span>}
                </span>
                <span className="line-clamp-2 break-words text-[15px] leading-[1.3]">{report.messaggio}</span>
                {!report.email_inviata && <span className="text-xs font-bold text-primary">Email di avviso non inviata</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
