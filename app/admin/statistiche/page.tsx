import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { readStatistics, VERCEL_ANALYTICS_URL } from "@/lib/analytics";
import { bestDay, dayLabel, fillDays, percentChange, periodOf, periodRange, share, signed, summarySentence, PERIODS } from "@/lib/analytics-stats";
import { Bars, DailyChart, Ring } from "@/components/statistics/charts";
import { PeriodSelect } from "@/components/statistics/period-select";
import { MarkerForm } from "@/components/statistics/marker-form";
import { deleteMarkerAction } from "@/app/actions/admin-statistics";

// Administrator only, drawn on every request: never in a cached page or a saved copy of the service worker.
export const dynamic = "force-dynamic";
export const metadata = { title: "Statistiche — Il Grimorio.App", robots: { index: false, follow: false } };

const PAPER = "rounded-2xl border border-[#DDCFAE] bg-[#FFFBF0] p-4";
const QUESTION = "font-serif text-[22px] font-bold leading-tight text-[#2B2118]";
const SOFT = "text-[15px] leading-6 text-[#5E4E3E]";

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-[#5E4E3E]">nessun confronto con il periodo prima</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[15px] font-bold ${up ? "text-[#2E6B3F]" : "text-[#A3262E]"}`} data-change={value}>
      {up ? <ArrowUp size={18} aria-hidden="true" /> : <ArrowDown size={18} aria-hidden="true" />}
      {signed(value)} <span className="font-normal text-[#5E4E3E]">rispetto al periodo prima</span>
    </span>
  );
}

const number = (value: number) => value.toLocaleString("it-IT");

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Login in place: a link opened from an email (no strict cookie on arrival) still reaches this page.
  if (!(await isAdmin())) return <AdminLogin />;
  const period = periodOf((await searchParams).periodo);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const range = periodRange(period, today);
  const data = await readStatistics(range);
  const days = fillDays(range.from, range.to, data.days);
  const change = percentChange(data.people, data.previousPeople);
  const best = bestDay(days);
  const bestMarkers = best ? data.markers.filter(marker => marker.giorno === best.day) : [];
  const markersInPeriod = data.markers.filter(marker => marker.giorno >= range.from && marker.giorno <= range.to);
  const returning = share(data.returning, data.people);
  const origins = [
    { label: "Instagram", value: data.origins.instagram }, { label: "Diretto", value: data.origins.diretto },
    { label: "Google", value: data.origins.google }, { label: "Link condivisi", value: data.origins.condiviso }, { label: "Altro", value: data.origins.altro },
  ];
  const known = origins.reduce((sum, row) => sum + row.value, 0);
  const devices = data.devices.iphone + data.devices.android + data.devices.computer + data.devices.altro;
  const areas = data.areas.incantesimi + data.areas.bestiario + data.areas.compendio;

  return (
    <main className="mx-auto max-w-xl space-y-4 bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118]">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B]">‹ Area riservata</Link>
      <h1 className="font-serif text-[34px] font-bold leading-tight text-[#7A1F2B]">Statistiche</h1>
      <PeriodSelect value={period} />

      <section aria-labelledby="in-breve" className="rounded-2xl bg-[#2B2118] p-4 text-[#F6EFDF]" data-in-breve="">
        <h2 id="in-breve" className="text-xs font-bold uppercase tracking-[0.12em] text-[#E0A21A]">In breve</h2>
        <p className="mt-2 font-serif text-[19px] leading-snug">{summarySentence(period, data.people, change, range.length)}</p>
        {best && best.visitors > 0 && (
          <p className="mt-2 text-[15px] leading-6 text-[#EDE3CC]">
            Il giorno migliore è stato {dayLabel(best.day)}, con {number(best.visitors)} {best.visitors === 1 ? "persona" : "persone"}
            {bestMarkers.length ? `: ${bestMarkers.map(marker => marker.etichetta).join(", ")}.` : "."}
          </p>
        )}
      </section>

      <section aria-labelledby="quante" className={PAPER}>
        <h2 id="quante" className={QUESTION}>Quante persone lo usano?</h2>
        <p className="mt-2 font-serif text-[44px] font-bold leading-none text-[#7A1F2B]" data-people={data.people}>{number(data.people)}</p>
        <p className="mt-1"><Change value={change} /></p>
        <div className="mt-3"><DailyChart days={days} markers={markersInPeriod} /></div>
        <ul className="mt-3 space-y-1" aria-label="Eventi segnati">
          {data.markers.map(marker => (
            <li key={marker.id} className="flex items-center gap-2 text-sm text-[#5E4E3E]" data-marker-row="">
              <span className="h-3 w-0 border-l-2 border-dashed border-[#E0A21A]" aria-hidden="true" />
              <span className="min-w-0 flex-1"><b className="text-[#2B2118]">{marker.etichetta}</b> · {dayLabel(marker.giorno)}</span>
              <form action={deleteMarkerAction}>
                <input type="hidden" name="id" value={marker.id} />
                <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-[#7A1F2B]" aria-label={`Cancella l’evento ${marker.etichetta}`}>Cancella</button>
              </form>
            </li>
          ))}
        </ul>
        <div className="mt-2"><MarkerForm today={today} /></div>
      </section>

      <section aria-labelledby="tornano" className={PAPER}>
        <h2 id="tornano" className={QUESTION}>Tornano?</h2>
        <div className="mt-3 flex items-center gap-4">
          <Ring percent={returning} label={`${returning}% delle persone è tornato almeno una seconda volta nel periodo: ${data.returning} su ${data.people}.`} />
          <p className={SOFT}>
            <b className="text-[#2B2118]">{number(data.returning)}</b> {data.returning === 1 ? "persona è tornata" : "persone sono tornate"} almeno una seconda volta, su {number(data.people)}.
          </p>
        </div>
        <p className={`${SOFT} mt-3 border-t border-[#DDCFAE] pt-3`} data-installed={data.installed}>
          <b className="text-[#2B2118]">{number(data.installed)}</b> la usano dall’app installata sulla schermata Home.
        </p>
      </section>

      <section aria-labelledby="arrivano" className={PAPER}>
        <h2 id="arrivano" className={QUESTION}>Da dove arrivano?</h2>
        <div className="mt-3">
          <Bars rows={origins} label={`Provenienza di ${known} persone: ${origins.map(row => `${row.label} ${share(row.value, known)}%`).join(", ")}.`} />
        </div>
        <p className={`${SOFT} mt-3`} data-devices="">
          Su iPhone {share(data.devices.iphone, devices)}% · Android {share(data.devices.android, devices)}% · computer {share(data.devices.computer, devices)}%
        </p>
      </section>

      <section aria-labelledby="usano" className={PAPER}>
        <h2 id="usano" className={QUESTION}>Cosa usano di più?</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2" aria-label="Quote delle pagine viste">
          {([["Incantesimi", data.areas.incantesimi], ["Bestiario", data.areas.bestiario], ["Compendio", data.areas.compendio]] as const).map(([name, views]) => (
            <li key={name} className="rounded-xl border border-[#DDCFAE] bg-[#F6EFDF] p-3 text-center" data-area={name}>
              <span className="block font-serif text-[26px] font-bold text-[#7A1F2B]">{share(views, areas)}%</span>
              <span className="text-[13px] font-semibold text-[#5E4E3E]">{name}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 text-sm font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">Le schede più aperte</h3>
        {data.cards.length ? (
          <ol className="mt-2 divide-y divide-[#DDCFAE]" data-top-cards="">
            {data.cards.map((card, index) => (
              <li key={`${card.kind}-${card.id}`} className="flex items-center gap-3 py-2">
                <span className="w-5 text-right font-serif font-bold text-[#7A1F2B]">{index + 1}</span>
                <Link href={`/${card.kind === "spell" ? "spell" : "mostro"}/${encodeURIComponent(card.id)}`} className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#2B2118] underline-offset-4 hover:underline">{card.title}</Link>
                <span className="rounded-full bg-[#2B2118] px-2 py-0.5 text-[11px] font-bold text-[#F6EFDF]">{card.id.endsWith("-2014") ? "2014" : "2024"}</span>
                <span className="w-10 text-right text-sm tabular-nums text-[#5E4E3E]">{number(card.opens)}</span>
              </li>
            ))}
          </ol>
        ) : <p className={`${SOFT} mt-2`}>Nessuna scheda aperta nel periodo.</p>}
        <h3 className="mt-4 text-sm font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">Cercano senza trovare</h3>
        {data.notFound.length ? (
          <ul className="mt-2 flex flex-wrap gap-2" data-not-found="">
            {data.notFound.map(row => (
              <li key={row.query} className="rounded-full border border-[#DDCFAE] bg-[#F6EFDF] px-3 py-1 text-sm text-[#2B2118]">«{row.query}» <span className="text-[#5E4E3E]">× {row.times}</span></li>
            ))}
          </ul>
        ) : <p className={`${SOFT} mt-2`}>Nessuna ricerca senza risultati ripetuta almeno 2 volte.</p>}
      </section>

      <section aria-labelledby="contano" className="px-1">
        <h2 id="contano" className="font-serif text-lg font-bold text-[#2B2118]">Come si contano</h2>
        <p className={`${SOFT} mt-1`}>Dettagli solo di chi accetta le statistiche. Le tue visite da admin non contano.</p>
        <a href={VERCEL_ANALYTICS_URL} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B] underline underline-offset-4">
          Totale di tutti i visitatori su Vercel Analytics
        </a>
        <p className="text-xs text-[#5E4E3E]">Periodo: {PERIODS[period].charAt(0).toLowerCase() + PERIODS[period].slice(1)} (dal {dayLabel(range.from)}), fuso orario italiano.</p>
      </section>
    </main>
  );
}
