import Link from "next/link";
import { Fragment } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { readFavoriteCounts, readStatistics, readSupport, VERCEL_ANALYTICS_URL } from "@/lib/analytics";
import { FAVORITES_NOTE, FAVORITE_PERIODS } from "@/lib/analytics-events";
import { rankFavorites, rankingFilterOf, type RankingCard } from "@/lib/favorite-ranking";
import { getSpellIndex } from "@/lib/spell-index";
import { getMonsterListIndex } from "@/lib/monster-index";
import { spellName } from "@/lib/spell-name";
import { publicSpellId, spellHref } from "@/lib/spell-public-id";
import { bestDay, dayLabel, fillDays, percentChange, periodOf, periodRange, share, signed, summarySentence, PERIODS } from "@/lib/analytics-stats";
import { Bars, DailyChart, Ring } from "@/components/statistics/charts";
import { PeriodSelect } from "@/components/statistics/period-select";
import { MarkerForm } from "@/components/statistics/marker-form";
import { deleteMarkerAction, excludeDeviceAction } from "@/app/actions/admin-statistics";
import { deviceExcluded } from "@/lib/analytics-exclusion";

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
  const params = await searchParams;
  const period = periodOf(params.periodo);
  const saved = rankingFilterOf(params);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const range = periodRange(period, today);
  const [data, excluded, support, counts, spells, monsters] = await Promise.all([
    readStatistics(range), deviceExcluded(), readSupport(range), readFavoriteCounts(saved.period).catch(() => []),
    getSpellIndex().catch(() => []), getMonsterListIndex().catch(() => []),
  ]);
  // «I più salvati»: the catalog of the two kinds with a star, on the address ids the stars are counted on.
  const catalog: RankingCard[] = [
    ...spells.map(spell => ({ kind: "incantesimo" as const, id: publicSpellId(spell.id), title: spellName(spell.nome_italiano, spell.edizione), edition: spell.edizione === "2014" ? "2014" as const : "2024" as const, href: spellHref(spell.id) })),
    ...monsters.map(monster => ({ kind: "mostro" as const, id: monster.id, title: monster.nome, edition: monster.edizione, href: `/mostro/${encodeURIComponent(monster.id)}` })),
  ];
  const mostSaved = rankFavorites(counts, catalog, saved);
  // The address of a filter of «I più salvati», keeping the period of the page and the other two filters.
  const savedHref = (change: Record<string, string>) => {
    const next = { periodo: period, salvati_tipo: saved.kind, salvati_edizione: saved.edition, salvati_periodo: saved.period, ...change };
    return `/admin/statistiche?${new URLSearchParams(next)}#salvati`;
  };
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
        <div className="mt-3 space-y-3 border-t border-[#DDCFAE] pt-3">
          <div data-installs={data.installs.total}>
            <p className={SOFT}>Nuove installazioni nel periodo: <b className="text-[#2B2118]">{number(data.installs.total)}</b></p>
            <p className="text-[13px] leading-5 text-[#5E4E3E]" data-installs-detail="">
              Android e computer: {number(data.installs.confirmed)} confermate · iPhone: {number(data.installs.firstOpen)} al primo avvio dall’icona
            </p>
            <p className="mt-0.5"><Change value={percentChange(data.installs.total, data.previousInstalls)} /></p>
          </div>
          <div data-installed={data.installed}>
            <p className={SOFT}>Usano l’app installata: <b className="text-[#2B2118]">{number(data.installed)}</b> {data.installed === 1 ? "persona" : "persone"} nel periodo</p>
            <p className="mt-0.5"><Change value={percentChange(data.installed, data.previousInstalled)} /></p>
          </div>
        </div>
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

      {/* «I più salvati» (PROMPT 10): people who have the card in their favorites now, not taps on the star. */}
      <section id="salvati" aria-labelledby="salvati-titolo" className={`${PAPER} scroll-mt-4`} data-most-saved="">
        <h2 id="salvati-titolo" className={QUESTION}>I più salvati</h2>
        <p className={`${SOFT} mt-1`}>Quante persone hanno la scheda nei preferiti adesso.</p>
        {([
          ["Tipo", "salvati_tipo", saved.kind, [["tutti", "Tutti"], ["incantesimo", "Incantesimi"], ["mostro", "Mostri"]]],
          ["Edizione", "salvati_edizione", saved.edition, [["tutte", "Tutte"], ["2024", "2024"], ["2014", "2014"]]],
          ["Periodo", "salvati_periodo", saved.period, Object.entries(FAVORITE_PERIODS)],
        ] as const).map(([label, key, current, options]) => (
          <nav key={key} aria-label={`I più salvati: ${label.toLowerCase()}`} className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="w-16 text-[13px] font-semibold text-[#5E4E3E]">{label}</span>
            {options.map(([value, text]) => (
              <Link key={value} href={savedHref({ [key]: value })} scroll={false} aria-current={current === value ? "true" : undefined} data-saved-filter={`${key}:${value}`}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-[14px] font-semibold ${current === value ? "border-[#7A1F2B] bg-[#7A1F2B] text-[#FFFBF0]" : "border-[#DDCFAE] bg-[#F6EFDF] text-[#2B2118]"}`}>{text}</Link>
            ))}
          </nav>
        ))}
        {mostSaved.length ? (
          <ol className="mt-3 divide-y divide-[#DDCFAE]" data-most-saved-list="">
            {mostSaved.map((card, index) => (
              <li key={`${card.kind}-${card.id}`} className="flex items-center gap-3 py-2" data-saved-card={`${card.kind}:${card.id}`}>
                <span className="w-5 text-right font-serif font-bold text-[#7A1F2B]">{index + 1}</span>
                <Link href={card.href} className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#2B2118] underline-offset-4 hover:underline">{card.title}</Link>
                <span className="text-[12px] text-[#5E4E3E]">{card.kind === "incantesimo" ? "Incantesimo" : "Mostro"}</span>
                <span className="rounded-full bg-[#2B2118] px-2 py-0.5 text-[11px] font-bold text-[#F6EFDF]">{card.edition}</span>
                <span className="w-12 text-right text-sm font-bold tabular-nums text-[#7A1F2B]" data-saved-people={card.people}
                  aria-label={`${card.people} ${card.people === 1 ? "persona" : "persone"}`}>{number(card.people)}</span>
              </li>
            ))}
          </ol>
        ) : <p className={`${SOFT} mt-3`}>Nessuna scheda salvata con questi filtri.</p>}
        <p className="mt-3 text-[12px] text-[#5E4E3E]" data-saves-note="">{FAVORITES_NOTE}</p>
      </section>

      {/* «Sostieni il Grimorio» (canvas «Sostieni il Grimorio»): people, not taps; the contributions are on Ko-fi. */}
      <section aria-labelledby="sostegno" className={PAPER} data-support-stats="">
        <h2 id="sostegno" className={QUESTION}>Sostegno</h2>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[15px]">
          <dt className="text-[#5E4E3E]">Persone che hanno aperto la pagina Sostieni</dt>
          <dd className="text-right font-bold tabular-nums" data-support-opened={support.opened}>{number(support.opened)}</dd>
          <dt className="text-[#5E4E3E]">Persone che hanno toccato «Sostieni con…»</dt>
          <dd className="text-right font-bold tabular-nums" data-support-clicked={support.clicked}>{number(support.clicked)}</dd>
          {[1, 3, 5].map(amount => (
            <Fragment key={amount}>
              <dt className="pl-3 text-[14px] text-[#5E4E3E]">con {amount} €</dt>
              <dd className="text-right text-[14px] tabular-nums" data-support-amount={amount}>{number(support.byAmount.find(row => row.amount === amount)?.people ?? 0)}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-3 text-[13px] text-[#5E4E3E]">Le donazioni vere si vedono su Ko-fi: qui solo chi apre la pagina e tocca il pulsante.</p>
      </section>

      {/* The faces of the Home and the sharing of the app (canvas «Valutazione Il Grimorio.App», ③). */}
      <Link href="/admin/statistiche/valutazione" data-rating-link=""
        className={`${PAPER} flex min-h-[64px] items-center justify-between gap-3`}>
        <span>
          <span className={`${QUESTION} block`}>Come si trovano?</span>
          <span className="text-[14px] text-[#5E4E3E]">Le tre faccine della Home e il passaparola</span>
        </span>
        <span aria-hidden="true" className="text-[22px] text-[#7A1F2B]">›</span>
      </Link>

      <section aria-labelledby="contano" className="px-1">
        <h2 id="contano" className="font-serif text-lg font-bold text-[#2B2118]">Come si contano</h2>
        <p className={`${SOFT} mt-1`}>Dettagli di tutti i visitatori tranne chi rinuncia («No»). Le tue visite da admin non contano.</p>
        <p className={`${SOFT} mt-1`}>Le installazioni si contano per chi non ha rinunciato alle statistiche. Su iPhone si contano al primo avvio dall’icona.</p>
        <p className="mt-1 text-xs text-[#5E4E3E]" data-counting-since="">Dal 28 ottobre 2026 si contano tutti i visitatori tranne chi rinuncia (prima solo chi accettava).</p>
        <a href={VERCEL_ANALYTICS_URL} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B] underline underline-offset-4">
          Totale di tutti i visitatori su Vercel Analytics
        </a>
        <p className="text-xs text-[#5E4E3E]">Periodo: {PERIODS[period].charAt(0).toLowerCase() + PERIODS[period].slice(1)} (dal {dayLabel(range.from)}), fuso orario italiano.</p>
      </section>

      {/* This device: marked at the login (lib/analytics-exclusion.ts); the button also from the app installed on iPhone. */}
      <section aria-label="Questo dispositivo" className="border-t border-[#DDCFAE] px-1 pt-3" data-device-excluded={excluded ? "true" : "false"}>
        {excluded ? (
          <p className="text-[15px] font-semibold text-[#1F6B45]">Questo dispositivo: escluso dalle statistiche ✓</p>
        ) : (
          <form action={excludeDeviceAction}>
            <button type="submit" className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-[#7A1F2B] px-4 text-[15px] font-bold text-[#7A1F2B]">Non contare questo dispositivo</button>
          </form>
        )}
      </section>
    </main>
  );
}
