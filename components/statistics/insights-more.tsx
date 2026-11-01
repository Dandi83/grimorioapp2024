import { readFunctions, readHeatmap, readInstallInvite, readLcp, readNotFound, type InstallInviteCounts, type StatisticsRange } from "@/lib/analytics";
import { bandLabel, HEAT_COLORS, heatmap, seconds, share, slowPages, twoSteps, WEEK_DAYS } from "@/lib/analytics-stats";
import { RestItem } from "./rest-item";

const SOFT = "text-[15px] leading-6 text-[#5E4E3E]";
const SMALL_TITLE = "mt-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#7A1F2B] [font-variant:small-caps]";
const number = (value: number) => value.toLocaleString("it-IT");

/** A bar with its label and its share on the right. */
function Bar({ name, label, part, whole }: { name: string; label: string; part: number; whole: number }) {
  const percent = share(part, whole);
  return (
    <li data-function={name} data-people={part}>
      <span className="flex items-baseline justify-between gap-3 text-[15px]"><span>{label}</span><b className="tabular-nums">{percent}% <span className="font-normal text-[#5E4E3E]">· {number(part)}</span></b></span>
      <span className="mt-1 block h-2 rounded-full bg-[#EDE3CC]" aria-hidden="true"><span className="block h-2 rounded-full bg-[#7A1F2B]" style={{ width: `${percent}%` }} /></span>
    </li>
  );
}

/** The invite «Installala» (PROMPT 43): people of the last 24 hours and 7 days, whatever the period chosen. */
function InstallInvite({ counts }: { counts: InstallInviteCounts }) {
  const rows: [keyof InstallInviteCounts, string][] = [["shown", "Mostrato"], ["tapped", "Toccato"], ["closed", "Chiuso"], ["installed", "Installata (dove il browser lo dice)"]];
  return (
    <table className="mt-1 w-full text-[15px]" data-install-invite="">
      <thead><tr className="text-[12px] text-[#5E4E3E]"><th scope="col" className="text-left font-semibold">Riquadro «Installala»</th><th scope="col" className="text-right font-semibold">24 ore</th><th scope="col" className="text-right font-semibold">7 giorni</th></tr></thead>
      <tbody>
        {rows.map(([key, label]) => (
          <tr key={key} data-install-invite-row={key} className="border-t border-[#DDCFAE]">
            <th scope="row" className="py-1 text-left font-normal">{label}</th>
            <td className="py-1 text-right font-bold tabular-nums" data-day={counts[key].day}>{number(counts[key].day)}</td>
            <td className="py-1 text-right font-bold tabular-nums" data-week={counts[key].week}>{number(counts[key].week)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** «Proponi il tuo», «Avviso di installazione»: how many started, how many finished. */
function Steps({ name, title, from, to, labels }: { name: string; title: string; from: number; to: number; labels: [string, string] }) {
  const steps = twoSteps(from, to);
  return (
    <div className="mt-2" data-two-steps={name} data-from={from} data-to={to}>
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="flex items-baseline justify-between gap-3 text-[15px]"><span>{labels[0]} → {labels[1]}</span><b className="tabular-nums">{number(steps.from)} → {number(steps.to)} <span className="font-normal text-[#5E4E3E]">· {steps.percent}%</span></b></p>
    </div>
  );
}

/**
 * «Approfondimenti» 2/2 (PROMPT 32): when the site is used, which functions, the pages not found and the slow ones.
 * Read on the server when the administrator opens the page, on the period chosen; nothing reaches the public.
 */
export async function InsightsMore({ range, hourly }: { range: StatisticsRange; hourly: boolean }) {
  const [cells, uses, missing, lcp, invite] = await Promise.all([hourly ? Promise.resolve([]) : readHeatmap(range), readFunctions(range), readNotFound(range), readLcp(range), readInstallInvite()]);
  const heat = heatmap(cells);
  const slow = slowPages(lcp);
  return (
    <>
      <RestItem card id="giorni-ore" title="Giorni e ore">
        {hourly ? <p className={SOFT} data-heatmap="poco">Per la mappa servono almeno 7 giorni: scegli un periodo più lungo.</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-[3px] text-[12px]" data-heatmap="">
                <thead><tr><th className="sr-only">Giorno</th>{Array.from({ length: 8 }, (_, band) => <th key={band} className="font-normal text-[#5E4E3E]">{bandLabel(band)}</th>)}</tr></thead>
                <tbody>
                  {heat.grid.map((bands, day) => (
                    <tr key={day}>
                      <th scope="row" className="pr-1 text-left font-semibold text-[#5E4E3E]">{WEEK_DAYS[day].slice(0, 3)}</th>
                      {bands.map((visits, band) => (
                        <td key={band} className="h-7 min-w-7 rounded-[4px]" style={{ background: heat.color(visits) }} data-heat-cell={`${day}:${band}`} data-visits={visits}
                          title={`${WEEK_DAYS[day]} ${bandLabel(band)}: ${visits} ${visits === 1 ? "visita" : "visite"}`}><span className="sr-only">{WEEK_DAYS[day]} {bandLabel(band)}: {visits}</span></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[12px] text-[#5E4E3E]" aria-hidden="true">
              meno {HEAT_COLORS.map(color => <span key={color} className="inline-block size-3 rounded-[3px] border border-[#DDCFAE]" style={{ background: color }} />)} più
            </p>
            <p className="mt-2 text-[15px] font-bold text-[#7A1F2B]" data-heat-peak="">{heat.peak || "Nessuna visita nel periodo."}</p>
            <p className="mt-1 text-[12px] text-[#5E4E3E]">Visite (sessioni) del periodo per giorno della settimana e fascia di 3 ore, ora italiana.</p>
          </>
        )}
      </RestItem>

      <RestItem card id="funzioni" title="Funzioni">
        <ul className="space-y-2" data-functions="">
          <Bar name="filtri" label="Filtri" part={uses.filtri} whole={uses.people} />
          <Bar name="edizione" label="Cambio edizione" part={uses.edizione} whole={uses.people} />
          <Bar name="preferiti" label="Preferiti" part={uses.preferiti} whole={uses.people} />
          <Bar name="condivisione" label="Condivisione scheda" part={uses.condivisione} whole={uses.people} />
        </ul>
        <p className="mt-1 text-[12px] text-[#5E4E3E]">% delle {number(uses.people)} persone del periodo. I dadi non compaiono: la sezione non è pubblica.</p>
        <h3 className={SMALL_TITLE}>Due passaggi</h3>
        <Steps name="proponi" title="Proponi il tuo" from={uses.proposalStart} to={uses.proposalSent} labels={["modulo aperto", "inviato"]} />
        <Steps name="installa" title="Avviso di installazione" from={uses.installShown} to={uses.installAccepted} labels={["mostrato", "accettato"]} />
        <InstallInvite counts={invite} />
      </RestItem>

      <RestItem card id="rotte" title="Pagine rotte e lente">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#7A1F2B] [font-variant:small-caps]">Non trovata</h3>
        {missing.length ? (
          <ul className="mt-1 divide-y divide-[#DDCFAE]" data-not-found-list="">
            {missing.map(row => (
              <li key={row.path} className="flex items-baseline justify-between gap-3 py-1 text-[15px]" data-not-found-row={row.path}>
                <code className="min-w-0 break-all text-[14px]">{row.path}</code><b className="shrink-0 tabular-nums" data-value="">× {number(row.times)}</b>
              </li>
            ))}
          </ul>
        ) : <p className={`${SOFT} mt-1`} data-not-found-list="0">Nessuna pagina non trovata nel periodo.</p>}
        <h3 className={SMALL_TITLE}>Lenta su telefono</h3>
        {slow.length ? (
          <ul className="mt-1 divide-y divide-[#DDCFAE]" data-slow-list="">
            {slow.map(row => (
              <li key={row.path} className="flex items-baseline justify-between gap-3 py-1 text-[15px]" data-slow-row={row.path}>
                <code className="min-w-0 break-all text-[14px]">{row.path}</code>
                <b className="shrink-0 tabular-nums" data-value="">{seconds(row.median)} <span className="font-normal text-[#5E4E3E]">· {row.measures} misure</span></b>
              </li>
            ))}
          </ul>
        ) : <p className={`${SOFT} mt-1`} data-slow-list="0">Nessuna pagina lenta nel periodo.</p>}
        <p className="mt-1 text-[12px] text-[#5E4E3E]">Lenta: mediana del caricamento principale (LCP) oltre 2,5 s su telefono, con almeno 3 misure; si misura 1 visita su 10.</p>
      </RestItem>
    </>
  );
}
