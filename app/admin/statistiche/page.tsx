import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { analyticsConfigured, POSTHOG_DASHBOARD, readAnalytics } from "@/lib/analytics";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Statistiche — Il Grimorio.App",
  robots: { index: false, follow: false },
};
function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(value).getTime()) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Login in place: a link opened from an email (no strict cookie on arrival) still reaches this page.
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const shift = (days: number) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
  };
  const period =
    query.period === "today"
      ? "today"
      : query.period === "7"
        ? "7"
        : query.period === "custom"
          ? "custom"
          : "30";
  let from = period === "today" ? today : shift(period === "7" ? 6 : 29),
    to = today;
  if (
    period === "custom" &&
    validDate(query.from) &&
    validDate(query.to) &&
    query.from <= query.to
  ) {
    from = query.from;
    to = query.to;
  }
  if (from < shift(89)) from = shift(89);
  if (to > today) to = today;
  const { summary, cards, days, firstEvent } = await readAnalytics(from, to);
  const number = (value: number) => value.toLocaleString("it-IT");
  const max = Math.max(1, ...days.map((d) => d.visitors));
  return (
    <main className="space-y-6 px-5 py-8">
      <nav
        aria-label="Statistiche amministrative"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-primary">
          ← Amministrazione
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-primary">
          Torna al sito
        </Link>
      </nav>
      <header>
        <p className="mb-1 text-xs uppercase tracking-widest text-primary">Il Grimorio.App</p>
        <h1 className="font-serif text-3xl text-foreground">Statistiche</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Dati delle visite con consenso. Browser unici nel periodo, test e visite amministrative
          esclusi. Fuso orario: Italia.
        </p>
      </header>
      {!analyticsConfigured() && (
        <p role="alert" className="rounded-xl border border-primary/40 p-4 text-sm text-primary">
          Collegamento PostHog non ancora configurato.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {[
          ["today", "Oggi"],
          ["7", "7 giorni"],
          ["30", "30 giorni"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/statistiche?period=${key}`}
            aria-current={period === key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm ${period === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="period" value="custom" />
        <label className="min-w-0 text-xs text-muted">
          Dal
          <input
            type="date"
            name="from"
            min={shift(89)}
            max={today}
            defaultValue={from}
            required
            className="mt-1 block min-h-11 w-36 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
          />
        </label>
        <label className="min-w-0 text-xs text-muted">
          Al
          <input
            type="date"
            name="to"
            min={shift(89)}
            max={today}
            defaultValue={to}
            required
            className="mt-1 block min-h-11 w-36 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
          />
        </label>
        <button className="min-h-11 rounded-lg border border-primary/40 px-3 text-sm text-primary">
          Applica
        </button>
      </form>
      <p className="text-xs text-muted">
        Periodo: {from.split("-").reverse().join("/")} — {to.split("-").reverse().join("/")}. Ultimi
        90 giorni disponibili.
      </p>
      <section aria-label="Riepilogo" className="grid grid-cols-2 gap-3">
        {[
          ["Visitatori unici", summary.visitors],
          ["Visualizzazioni", summary.views],
          ["Aperture schede", summary.opens],
          ["Lettori stimati unici", summary.readers],
          ["Utenti del tasto Condividi", summary.sharers],
          ["Link copiati", summary.copies],
          ["Arrivi da link condivisi", summary.sharedArrivals],
          ["Nuovi browser osservati", summary.newVisitors],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs leading-5 text-muted">{label}</p>
            <p className="mt-2 font-serif text-3xl text-primary">{number(Number(value))}</p>
          </div>
        ))}
      </section>
      {!firstEvent && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          Non ci sono ancora visite con consenso da mostrare. Le visite di verifica sono escluse: i
          contatori iniziano dai primi visitatori reali.
        </p>
      )}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-foreground">Visitatori per giorno</h2>
        <p className="text-xs text-muted">
          Gli unici giornalieri non si sommano per ottenere gli unici del periodo.
        </p>
        {days.length ? (
          days.map((day) => (
            <div
              key={day.day}
              className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-3 text-xs"
            >
              <span className="text-muted">{day.day.slice(5).split("-").reverse().join("/")}</span>
              <div className="h-3 rounded-full bg-elevated">
                <div
                  style={{ width: `${(day.visitors / max) * 100}%` }}
                  className="h-3 rounded-full bg-primary"
                />
              </div>
              <span className="text-right text-foreground">{number(day.visitors)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Nessun dato nel periodo scelto.</p>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-foreground">Schede consultate</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[540px] text-left text-xs">
            <thead className="bg-card text-muted">
              <tr>
                {["Scheda", "Aperture", "Unici", "Lettori stimati", "Condividi"].map((label) => (
                  <th key={label} className="px-3 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.path} className="border-t border-border">
                  <td className="px-3 py-3">
                    <Link href={card.path} className="font-medium text-primary">
                      {card.title}
                    </Link>
                    <span className="mt-1 block text-[10px] text-muted">
                      {card.kind === "spell"
                        ? "Incantesimo"
                        : card.kind === "animal"
                          ? "Animale"
                          : "Mostro"}
                    </span>
                  </td>
                  {[card.opens, card.visitors, card.readers, card.sharers].map((v, i) => (
                    <td key={i} className="px-3 py-3 text-foreground">
                      {number(v)}
                    </td>
                  ))}
                </tr>
              ))}
              {!cards.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-5 text-muted">
                    Nessuna scheda consultata nel periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted">
        <h2 className="font-serif text-xl text-foreground">Come leggere questi dati</h2>
        <p>
          Unico significa un browser riconosciuto, non una persona identificata. La lettura è
          stimata da almeno 20 secondi attivi e il 50% della scheda visualizzato. «Condividi» conta
          chi usa il pulsante, non messaggi inviati o destinatari raggiunti. Gli arrivi tracciati
          provengono dai link generati dal pulsante.
        </p>
        <p>
          I nuovi browser sono nuovi rispetto ai dati conservati negli ultimi 90 giorni. Il rifiuto
          e i blocchi del tracciamento rendono i dati parziali. Lo storico AGAIN non entra in questa
          dashboard.
        </p>
        <p>
          {summary.pending
            ? `${number(summary.pending)} eventi in attesa di sincronizzazione PostHog; già presenti nei conteggi del sito.`
            : "Sincronizzazione PostHog: nessun evento del periodo in attesa."}
        </p>
        <a
          href={POSTHOG_DASHBOARD}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        >
          Apri la dashboard privata in PostHog ↗
        </a>
      </section>
    </main>
  );
}
