import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { getFeedback, markFeedbackRead } from "@/lib/feedback";
import { pageName } from "@/lib/feedback-names";
import { STATE_LABELS, aboutLabel, formatWhen } from "@/lib/feedback-input";
import { TypePill } from "@/components/feedback/type-pill";
import { FeedbackControls } from "@/components/feedback/feedback-controls";
import { contestedCard, hideContestedCardAction } from "@/app/actions/admin-cards";
import { hiddenCardPaths } from "@/lib/section-visibility";

export const dynamic = "force-dynamic";
export const metadata = { title: "Segnalazione — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Login in place: a link opened from an email (no strict cookie on arrival) still reaches this page.
  if (!(await isAdmin())) return <AdminLogin />;
  const { id } = await params;
  const found = await getFeedback(id);
  if (!found) notFound();
  // Opening a new report marks it as read.
  if (found.stato === "nuova") await markFeedbackRead(found.id);
  const report = found.stato === "nuova" ? { ...found, stato: "letta" as const } : found;
  const name = await pageName(report.percorso, report.edizione);
  const rights = report.tipo === "diritti";
  const card = rights ? await contestedCard(report.percorso) : undefined;
  const hidden = card && report.percorso ? (await hiddenCardPaths()).includes(report.percorso) : false;
  const subject = encodeURIComponent(rights ? "La tua richiesta di rimozione su Il Grimorio.App" : "La tua segnalazione su Il Grimorio.App");
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3.5 px-4 pb-8 pt-4">
      <Link href="/admin/segnalazioni" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold text-primary">
        <ChevronLeft size={18} aria-hidden="true" /> Segnalazioni
      </Link>
      <h1 className="sr-only">Segnalazione</h1>
      <p className="flex flex-wrap items-center gap-2">
        <TypePill tipo={report.tipo} />
        <span className="text-[13px] text-muted">{formatWhen(new Date(report.creato_il))} · stato: {STATE_LABELS[report.stato].toLowerCase()}</span>
      </p>
      {rights && (
        <section data-rights-detail="" className="rounded-[14px] border-l-4 border-primary bg-[#F3D3D3]/45 px-3.5 py-3 text-[15px] leading-6">
          <h2 className="font-serif text-[20px] font-bold text-primary">Richiesta di rimozione per diritti</h2>
          {report.percorso && (
            <Link href={report.percorso} prefetch={false} data-contested-link="" className="inline-flex min-h-11 items-center break-all font-bold text-primary underline underline-offset-4">
              Apri la pagina contestata: {report.percorso}
            </Link>
          )}
          {card ? (
            hidden ? (
              <p className="font-semibold text-foreground">La scheda è nascosta dal sito, in attesa di verifica.</p>
            ) : (
              <form action={hideContestedCardAction}>
                <input type="hidden" name="segnalazione" value={report.id} />
                <input type="hidden" name="pagina" value={report.percorso ?? ""} />
                <button type="submit" className="mt-1 min-h-11 rounded-3xl bg-primary px-5 font-bold text-primary-foreground">Nascondi la scheda in attesa di verifica</button>
              </form>
            )
          ) : (
            <p className="text-muted">Non è una scheda di incantesimo o mostro: per nasconderla usa <Link href="/admin/sezioni" className="font-semibold text-primary underline">Sezioni dell’app</Link> o l’editor della pagina.</p>
          )}
          <p className="mt-1 text-muted">Rispondi alla persona all’email indicata qui sotto.</p>
        </section>
      )}
      <div className="whitespace-pre-wrap break-words rounded-[14px] border-[1.5px] border-border bg-card p-3.5 text-[17px] leading-[1.4]">{report.messaggio}</div>
      <p className="text-sm text-muted">
        Riguarda:{" "}
        {report.percorso ? (
          <><Link href={report.edizione ? `${report.percorso}?edizione=${report.edizione}` : report.percorso} className="font-bold text-primary underline underline-offset-4">{aboutLabel(name, report.percorso, null)}</Link>
            {report.edizione ? ` · edizione ${report.edizione}` : ""}
            <span className="block break-all text-[13px]">{report.percorso}</span></>
        ) : "nessuna pagina indicata"}
      </p>
      <p className="text-sm text-muted">Email di avviso: {report.email_inviata ? "inviata" : <b className="text-primary">non inviata</b>}</p>
      {!report.email_inviata && report.email_esito && <p className="text-sm text-muted" data-email-reason="">Motivo: {report.email_esito}</p>}
      {report.email_risposta ? (
        <>
          <p className="break-all text-sm text-muted">Risposta a: <b className="text-foreground">{report.email_risposta}</b></p>
          <a href={`mailto:${encodeURIComponent(report.email_risposta).replace("%40", "@")}?subject=${subject}`}
            className="flex min-h-12 items-center justify-center rounded-3xl bg-primary font-bold text-primary-foreground">Rispondi via email</a>
        </>
      ) : <p className="text-sm text-muted">Nessuna email per la risposta.</p>}
      <FeedbackControls id={report.id} stato={report.stato} nota={report.nota_admin ?? ""} />
    </div>
  );
}
