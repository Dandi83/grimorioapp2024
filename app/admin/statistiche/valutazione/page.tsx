import Link from "next/link";

import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { readRatings, readWordOfMouth, RATING_PERIODS, type RatingPeriod, type WeekRow } from "@/lib/analytics";
import { countRatingFeedback } from "@/lib/feedback";
import { dayLabel, share } from "@/lib/analytics-stats";

// Administrator only, drawn on every request: never in a cached page, a saved copy or the public bundle.
export const dynamic = "force-dynamic";
export const metadata = { title: "Come si trovano? — Il Grimorio.App", robots: { index: false, follow: false } };

/** Below this the percentages say little: only the number of answers is shown. */
const MIN_ANSWERS = 5;
const PAPER = "flex flex-col gap-3 rounded-[18px] border border-[#DDCFAE] bg-[#FFFBF0] p-4";
const SOFT = "text-[15px] leading-6 text-[#5E4E3E]";
const number = (value: number) => value.toLocaleString("it-IT");

function periodOf(value: unknown): RatingPeriod {
  return value === "7" || value === "sempre" ? value : "30";
}

/** A line of the weeks (percentages from 0 to 100), with an accessible summary. */
function WeekLine({ weeks, percent, label, color }: { weeks: WeekRow[]; percent: boolean; label: string; color: string }) {
  const width = 330, height = 90, pad = 6;
  const values = weeks.map(row => (percent ? share(row.part, row.total) : row.part));
  const max = percent ? 100 : Math.max(1, ...values);
  const x = (index: number) => (weeks.length > 1 ? pad + (index * (width - 2 * pad)) / (weeks.length - 1) : width / 2);
  const y = (value: number) => height - pad - ((height - 2 * pad) * value) / max;
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} className="block h-[90px] w-full" data-chart="settimane">
      <title>{label}</title>
      <path d={`M0 ${height - 1} H${width}`} stroke="#DDCFAE" strokeWidth="1" />
      {points.length > 1 && <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {values.map((value, index) => <circle key={weeks[index].week} cx={x(index)} cy={y(value)} r="3.5" fill={color} />)}
    </svg>
  );
}

const weekSummary = (weeks: WeekRow[], text: (row: WeekRow) => string) =>
  weeks.length ? weeks.map(row => `settimana del ${dayLabel(row.week)}: ${text(row)}`).join("; ") : "nessun dato nel periodo";

export default async function RatingStatisticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const period = periodOf((await searchParams).periodo);
  const [ratings, word, comments] = await Promise.all([readRatings(period), readWordOfMouth(period), countRatingFeedback()]);
  const enough = ratings.total >= MIN_ANSWERS;
  const rows = [
    { label: "Bene", value: ratings.bene, color: "#1F6B45" },
    { label: "Così così", value: ratings.cosiCosi, color: "#E0A21A" },
    { label: "Male", value: ratings.male, color: "#7A1F2B" },
  ];
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-3.5 bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118]">
      <Link href="/admin/statistiche" className="inline-flex min-h-10 items-center self-start text-[15px] font-bold text-[#7A1F2B]">‹ Statistiche</Link>
      <h1 className="font-serif text-[32px] font-semibold leading-tight">Come si trovano?</h1>
      <nav aria-label="Periodo" className="flex gap-2">
        {(Object.keys(RATING_PERIODS) as RatingPeriod[]).map(key => (
          <Link key={key} href={`/admin/statistiche/valutazione?periodo=${key}`} aria-current={period === key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-[14px] font-semibold ${period === key ? "bg-[#2B2118] text-white" : "border border-[#DDCFAE] bg-[#FFFBF0] text-[#5E4E3E]"}`}>
            {RATING_PERIODS[key]}
          </Link>
        ))}
      </nav>

      <section aria-label="Risposte" className={PAPER} data-ratings={ratings.total}>
        {enough ? (
          <p className={SOFT}>
            <strong className="font-serif text-[34px] text-[#1F6B45]" data-bene-percent={share(ratings.bene, ratings.total)}>{share(ratings.bene, ratings.total)}%</strong>{" "}
            si trova bene · {number(ratings.total)} {ratings.total === 1 ? "risposta" : "risposte"}
          </p>
        ) : (
          <>
            <p className={SOFT}><strong className="font-serif text-[34px] text-[#2B2118]">{number(ratings.total)}</strong> {ratings.total === 1 ? "risposta" : "risposte"} nel periodo</p>
            <p className="text-[14px] font-semibold text-[#5E4E3E]" data-threshold="">Servono almeno {MIN_ANSWERS} risposte per le percentuali.</p>
          </>
        )}
        <ul className="flex flex-col gap-2.5" aria-label="Risposte per faccina">
          {rows.map(row => (
            <li key={row.label} className="grid grid-cols-[92px_1fr_56px] items-center gap-2.5 text-[14px]" data-vote-row={row.label}>
              <span>{row.label}</span>
              <span className="h-3.5 rounded-full bg-[#EDE3CC]" aria-hidden="true">
                <span className="block h-3.5 rounded-full" style={{ width: `${enough ? share(row.value, ratings.total) : 0}%`, background: row.color }} />
              </span>
              <span className="text-right font-bold tabular-nums">{enough ? `${share(row.value, ratings.total)}%` : number(row.value)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="andamento-bene" className={PAPER}>
        <h2 id="andamento-bene" className="text-[15px] font-bold">Andamento di «Bene» per settimana</h2>
        <WeekLine weeks={ratings.weeks} percent color="#1F6B45"
          label={`Percentuale «Bene» per settimana: ${weekSummary(ratings.weeks, row => `${share(row.part, row.total)}% di ${row.total}`)}.`} />
      </section>

      <Link href="/admin/segnalazioni?etichetta=valutazione" data-rating-comments={comments}
        className="flex min-h-[52px] items-center justify-between rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 text-[15px] font-bold text-[#7A1F2B]">
        Commenti arrivati con «Scrivici» <span className="text-[#5E4E3E]">{number(comments)} ›</span>
      </Link>

      <section aria-labelledby="passaparola" className={PAPER} data-word-of-mouth="">
        <h2 id="passaparola" className="font-serif text-[22px] font-bold leading-tight">Passaparola</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[15px]">
          <dt className="text-[#5E4E3E]">Persone che hanno toccato Condividi</dt>
          <dd className="text-right font-bold tabular-nums" data-tapped={word.tapped}>{number(word.tapped)}</dd>
          <dt className="pl-3 text-[14px] text-[#5E4E3E]">dalla Home · dopo la valutazione</dt>
          <dd className="text-right text-[14px] tabular-nums" data-tapped-from={`${word.fromHome}-${word.fromRating}`}>{number(word.fromHome)} · {number(word.fromRating)}</dd>
          <dt className="text-[#5E4E3E]">Persone che hanno inviato o copiato il link</dt>
          <dd className="text-right font-bold tabular-nums" data-sent={word.sent}>{number(word.sent)}</dd>
          <dt className="text-[#5E4E3E]">Persone arrivate dal link di un amico</dt>
          <dd className="text-right font-bold tabular-nums" data-arrived={word.arrived}>{number(word.arrived)}</dd>
        </dl>
        <h3 className="text-[14px] font-bold text-[#5E4E3E]">Arrivi da amico per settimana</h3>
        <WeekLine weeks={word.weeks} percent={false} color="#7A1F2B"
          label={`Persone arrivate da un amico per settimana: ${weekSummary(word.weeks, row => `${row.part}`)}.`} />
        <p className="text-[12px] text-[#5E4E3E]">Persone diverse, non tocchi. Gli eventi si tengono 90 giorni: «Sempre» qui vuol dire gli ultimi 90 giorni.</p>
      </section>
    </main>
  );
}
