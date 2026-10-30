import { readCohortPeople, readFunnel, readInstagram, readSearchMisses, type StatisticsMarker, type StatisticsRange } from "@/lib/analytics";
import { barOf, BIO_LINK, cohorts, cohortShade, COHORT_AFTER, fillDays, fillHours, funnel, markerTime, reasonLabel, share, shortDay, type HourWindow } from "@/lib/analytics-stats";
import { classifySearch } from "@/lib/search-insights";
import { readSynonyms, readTodo, searchWorld } from "@/lib/search-insights-server";
import { rowsOf } from "@/lib/search";
import { addSynonymAction, addTodoAction, deleteSynonymAction, deleteTodoAction } from "@/app/actions/admin-statistics";
import { DailyChart, HourlyChart } from "./charts";
import { CopyLink } from "./copy-link";
import { RestItem } from "./rest-item";

const SOFT = "text-[15px] leading-6 text-[#5E4E3E]";
const number = (value: number) => value.toLocaleString("it-IT");
const AREA_LABEL: Record<string, string> = { incantesimi: "incantesimi", bestiario: "bestiario", globale: "ricerca globale" };
/** A row with its number on the right (the approved card: paper, red small capitals, numbers on the right). */
const Row = ({ label, value, name, children }: { label: string; value: string; name: string; children?: React.ReactNode }) => (
  <li className="py-2" data-insight-row={name}>
    <span className="flex items-baseline justify-between gap-3 text-[15px]"><span className="min-w-0">{label}</span><b className="shrink-0 tabular-nums text-[#2B2118]" data-value="">{value}</b></span>
    {children}
  </li>
);

/**
 * «Approfondimenti» of /admin/statistiche (PROMPT 31): the searches with no result, the path of the people, the
 * arrivals from Instagram with the link of the bio, who stays. Read on the server when the administrator opens the
 * page, on the period chosen (the weeks of «Chi resta davvero» are always the last 8); nothing reaches the public.
 */
export async function Insights({ range, hourly, from, to, today, markers }: {
  range: StatisticsRange; hourly: HourWindow | null; from: string | null; to: string | null; today: string; markers: StatisticsMarker[];
}) {
  const [misses, steps, instagram, people, world, synonyms, todo] = await Promise.all([
    readSearchMisses(range), readFunnel(range), readInstagram(range), readCohortPeople(), searchWorld(), readSynonyms().catch((): Awaited<ReturnType<typeof readSynonyms>> => []), readTodo().catch((): string[] => []),
  ]);
  const names = [...new Set(rowsOf(world.publicIndex).filter(row => row.section === "incantesimi" || row.section === "mostri").map(row => row.nome))].sort((a, b) => a.localeCompare(b, "it"));
  const nameOf = new Map(rowsOf(world.publicIndex).map(row => [row.href, row.nome]));
  const path = funnel(steps);
  const table = cohorts(today, people);
  const bioDays = from && to ? fillDays(from, to, instagram.bioBuckets) : [];
  const bioBars = hourly ? fillHours(hourly, instagram.bioBuckets) : [];
  const dayMarkers = from && to ? markers.filter(marker => marker.giorno >= from && marker.giorno <= to) : [];
  const hourMarkers = hourly ? markers.map(marker => ({ bar: barOf(hourly, markerTime(marker)), etichetta: marker.etichetta })).filter(marker => marker.bar >= 0) : [];

  return (
    <section aria-labelledby="approfondimenti" className="space-y-3" data-insights="">
      <h2 id="approfondimenti" className="pt-2 font-serif text-[22px] font-bold leading-tight text-[#2B2118]">Approfondimenti</h2>

      <RestItem card id="ricerche" title="Ricerche senza risultato">
        {misses.length ? (
          <ul className="divide-y divide-[#DDCFAE]" data-search-misses="">
            {misses.map(miss => {
              const reason = reasonLabel(classifySearch(miss.query, world));
              const synonym = synonyms.find(item => item.query === miss.query);
              return (
                <Row key={miss.query} name={miss.query} label={`«${miss.query}»`} value={`× ${number(miss.times)}`}>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-[#5E4E3E]">
                    {miss.areas.map(area => <span key={area} className="rounded-full bg-[#F6EFDF] px-2 py-0.5">{AREA_LABEL[area] ?? area}</span>)}
                    {reason && <span className="rounded-full bg-[#FCEFD0] px-2 py-0.5 font-semibold text-[#7A4E00]" data-search-reason={reason}>{reason}</span>}
                    {synonym && <span className="font-semibold text-[#1F6B45]" data-synonym-of={synonym.href}>sinonimo di {nameOf.get(synonym.href) ?? synonym.href}</span>}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <details className="w-full sm:w-auto" data-synonym-form={miss.query}>
                      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] font-bold text-[#7A1F2B]">Aggiungi sinonimo</summary>
                      <form action={addSynonymAction} className="flex flex-wrap items-center gap-2 pb-2">
                        <input type="hidden" name="query" value={miss.query} />
                        <label className="min-w-0 flex-1 text-[13px] text-[#5E4E3E]">
                          <span className="sr-only">Scheda per «{miss.query}»</span>
                          <input name="scheda" list="schede-sinonimi" required placeholder="Nome della scheda" className="min-h-11 w-full rounded-lg border border-[#DDCFAE] bg-white px-3 text-[15px] text-[#2B2118]" />
                        </label>
                        <button type="submit" className="min-h-11 rounded-full bg-[#7A1F2B] px-4 text-[14px] font-bold text-[#FFFBF0]">Collega</button>
                      </form>
                    </details>
                    {!todo.includes(miss.query) && (
                      <form action={addTodoAction}>
                        <input type="hidden" name="query" value={miss.query} />
                        <button type="submit" className="min-h-11 text-[14px] font-bold text-[#7A4E00]">Segna come da fare</button>
                      </form>
                    )}
                  </div>
                </Row>
              );
            })}
          </ul>
        ) : <p className={SOFT} data-search-misses="0">Nessuna ricerca senza risultato nel periodo.</p>}
        <datalist id="schede-sinonimi">{names.map(name => <option key={name} value={name} />)}</datalist>
        <h3 className="mt-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#7A1F2B] [font-variant:small-caps]">Da fare</h3>
        {todo.length ? (
          <ul className="mt-1 divide-y divide-[#DDCFAE]" data-todo="">
            {todo.map(query => (
              <li key={query} className="flex items-center justify-between gap-3 py-1 text-[15px]" data-todo-row={query}>
                «{query}»
                <form action={deleteTodoAction}>
                  <input type="hidden" name="query" value={query} />
                  <button type="submit" className="min-h-11 px-2 text-[14px] font-semibold text-[#7A1F2B]" aria-label={`Cancella «${query}» da fare`}>Cancella</button>
                </form>
              </li>
            ))}
          </ul>
        ) : <p className={`${SOFT} mt-1`} data-todo="0">Niente da fare.</p>}
        {synonyms.length > 0 && (
          <>
            <h3 className="mt-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#7A1F2B] [font-variant:small-caps]">Sinonimi attivi</h3>
            <ul className="mt-1 divide-y divide-[#DDCFAE]" data-synonyms="">
              {synonyms.map(item => (
                <li key={item.query} className="flex items-center justify-between gap-3 py-1 text-[15px]" data-synonym-row={item.query}>
                  <span>«{item.query}» → {nameOf.get(item.href) ?? item.href}</span>
                  <form action={deleteSynonymAction}>
                    <input type="hidden" name="query" value={item.query} />
                    <button type="submit" className="min-h-11 px-2 text-[14px] font-semibold text-[#7A1F2B]" aria-label={`Togli il sinonimo «${item.query}»`}>Togli</button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </RestItem>

      <RestItem card id="percorso" title="Il percorso">
        <ul className="space-y-2" data-funnel="">
          {path.rows.map(row => (
            <li key={row.key} data-funnel-step={row.key} data-people={row.people}>
              <span className="flex items-baseline justify-between gap-3 text-[15px]"><span>{row.label}</span><b className="tabular-nums">{number(row.people)} <span className="font-normal text-[#5E4E3E]">· {row.percent}%</span></b></span>
              <span className="mt-1 block h-2 rounded-full bg-[#EDE3CC]" aria-hidden="true"><span className="block h-2 rounded-full bg-[#7A1F2B]" style={{ width: `${row.percent}%` }} /></span>
            </li>
          ))}
        </ul>
        {path.drop && <p className="mt-3 text-[15px] font-bold text-[#7A1F2B]" data-funnel-drop="">Il calo più grande: da {path.drop.from.toLowerCase()} a {path.drop.to.toLowerCase()} (−{path.drop.percent}%)</p>}
        <p className="mt-2 text-[12px] text-[#5E4E3E]">Ogni persona una volta per passo, nel periodo. «Tornano»: un’altra visita entro 7 giorni dalla prima.</p>
      </RestItem>

      <RestItem card id="instagram" title="Da Instagram">
        <p className="text-[13px] text-[#5E4E3E]">Il link da mettere una volta per sempre nella bio:</p>
        <div className="mt-1"><CopyLink text={BIO_LINK} /></div>
        <ul className="mt-3 divide-y divide-[#DDCFAE]" data-instagram="">
          <Row name="bio" label="Link in bio" value={`${number(instagram.bio.people)} · tornati ${share(instagram.bio.back, instagram.bio.people)}%`} />
          <Row name="altro" label="Instagram (altro)" value={`${number(instagram.other.people)} · tornati ${share(instagram.other.back, instagram.other.people)}%`} />
        </ul>
        <p className="mt-1 text-[12px] text-[#5E4E3E]">«Instagram (altro)»: storie, sponsorizzate, messaggi. «Tornati»: un’altra visita entro 7 giorni.</p>
        <h3 className="mt-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#7A1F2B] [font-variant:small-caps]">Arrivi dal link in bio</h3>
        {hourly
          ? <HourlyChart bars={bioBars} markers={hourMarkers} name="bio" what="Arrivi dal link in bio" />
          : <DailyChart days={bioDays} markers={dayMarkers} name="bio" what="Arrivi dal link in bio" />}
      </RestItem>

      <RestItem card id="restano" title="Chi resta davvero">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]" data-cohorts="">
            <thead>
              <tr className="text-left text-[#5E4E3E]">
                <th className="py-1 pr-2 font-semibold">Settimana</th><th className="py-1 pr-2 font-semibold">Fonte</th><th className="py-1 pr-2 text-right font-semibold">Persone</th>
                {COHORT_AFTER.map(gap => <th key={gap} className="py-1 pl-1 text-right font-semibold">dopo {gap} sett.</th>)}
              </tr>
            </thead>
            <tbody>
              {table.map(row => (
                <tr key={`${row.week}-${row.group}`} className="border-t border-[#EDE3CC]" data-cohort={`${row.week}:${row.group}`}>
                  <td className="py-1 pr-2 whitespace-nowrap">{row.group === "instagram" ? shortDay(row.week) : ""}</td>
                  <td className="py-1 pr-2">{row.group === "instagram" ? "Instagram" : "altre fonti"}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{row.people}</td>
                  {row.after.map((value, index) => (
                    <td key={index} className="py-1 pl-1 text-right tabular-nums" style={{ background: cohortShade(value), color: value !== null && value >= 60 ? "#FFFBF0" : undefined }}
                      data-cohort-cell={COHORT_AFTER[index]}>{value === null ? "—" : `${value}%`}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-[#5E4E3E]">Ultime 8 settimane d’arrivo (lunedì–domenica, ora italiana), qualunque periodo sia scelto sopra. «—»: settimana non ancora passata o nessun arrivo.</p>
      </RestItem>
    </section>
  );
}
