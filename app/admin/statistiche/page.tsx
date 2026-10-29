import Link from "next/link";
import { Fragment } from "react";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin-login";
import { readFavoriteCounts, readNow, readStatistics, readSupport, VERCEL_ANALYTICS_URL } from "@/lib/analytics";
import { publishedHomebrew } from "@/lib/homebrew";
import { readAllTableCounts, type TableCounts } from "@/lib/table-votes";
import { NowDot } from "@/components/home/admin-strip";
import { FAVORITES_NOTE, FAVORITE_PERIODS } from "@/lib/analytics-events";
import { rankFavorites, rankingFilterOf, type RankingCard } from "@/lib/favorite-ranking";
import { getSpellIndex } from "@/lib/spell-index";
import { getMonsterListIndex } from "@/lib/monster-index";
import { spellName } from "@/lib/spell-name";
import { publicSpellId, spellHref } from "@/lib/spell-public-id";
import { appSplit, bestDay, dayLabel, fillDays, percentChange, periodOf, periodRange, share, PERIODS } from "@/lib/analytics-stats";
import { Bars, DailyChart } from "@/components/statistics/charts";
import { Arrow, SmallRing, Sparkline, SplitBar, Tile } from "@/components/statistics/tiles";
import { RestItem } from "@/components/statistics/rest-item";
import { PeriodSelect } from "@/components/statistics/period-select";
import { MarkerForm } from "@/components/statistics/marker-form";
import { deleteMarkerAction, excludeDeviceAction } from "@/app/actions/admin-statistics";
import { deviceExcluded } from "@/lib/analytics-exclusion";

// Administrator only, drawn on every request: never in a cached page or a saved copy of the service worker.
export const dynamic = "force-dynamic";
export const metadata = { title: "Statistiche — Il Grimorio.App", robots: { index: false, follow: false } };

/** «Da Instagram», «Da Google»…: the label of the first origin in the tile. */
const ORIGIN_LABEL: Record<string, string> = { instagram: "Instagram", diretto: "diretto", google: "Google", condiviso: "link condivisi", altro: "altro" };
const SOFT = "text-[15px] leading-6 text-[#5E4E3E]";

const number = (value: number) => value.toLocaleString("it-IT");

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Login in place: a link opened from an email (no strict cookie on arrival) still reaches this page.
  if (!(await isAdmin())) return <AdminLogin />;
  const params = await searchParams;
  const period = periodOf(params.periodo);
  const saved = rankingFilterOf(params);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const range = periodRange(period, today);
  const [data, excluded, support, counts, spells, monsters, now, tableVotes, homebrew] = await Promise.all([
    readStatistics(range), deviceExcluded(), readSupport(range), readFavoriteCounts(saved.period).catch(() => []),
    getSpellIndex().catch(() => []), getMonsterListIndex().catch(() => []), readNow(),
    readAllTableCounts().catch(() => new Map<string, TableCounts>()), publishedHomebrew().catch(() => []),
  ]);
  // «Prove al tavolo» (PROMPT 19): every card of «I mostri creati da voi» with votes, the most voted first.
  const tried = homebrew.map(row => ({ id: row.id, nome: row.scheda.nome, votes: tableVotes.get(row.id) }))
    .filter((row): row is { id: string; nome: string; votes: TableCounts } => !!row.votes?.total)
    .sort((a, b) => b.votes.total - a.votes.total || a.nome.localeCompare(b.nome, "it"));
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
  // «Usano l’app»: the bar and its line divide the people of the big number (PROMPT 17).
  const app = appSplit(data.installedDevices, data.installed);
  const best = bestDay(days);
  const markersInPeriod = data.markers.filter(marker => marker.giorno >= range.from && marker.giorno <= range.to);
  const returning = share(data.returning, data.people);
  // «Tornano»: the change of the share in points, only when the period before had people to compare with.
  const returningChange = data.previousPeople ? returning - share(data.previousReturning, data.previousPeople) : null;
  const origins = [
    { key: "instagram", label: "Instagram", value: data.origins.instagram }, { key: "diretto", label: "Diretto", value: data.origins.diretto },
    { key: "google", label: "Google", value: data.origins.google }, { key: "condiviso", label: "Link condivisi", value: data.origins.condiviso }, { key: "altro", label: "Altro", value: data.origins.altro },
  ];
  const known = origins.reduce((sum, row) => sum + row.value, 0);
  const ranked = [...origins].sort((a, b) => b.value - a.value);
  const first = ranked[0];
  const devices = data.devices.iphone + data.devices.android + data.devices.computer + data.devices.altro;
  const areas = data.areas.incantesimi + data.areas.bestiario + data.areas.compendio;
  // The edition of a card read, from its record (an id like «amicizia-2» is a 2014 card: never guessed from the id).
  const editionOf = new Map<string, string>([
    ...spells.map(spell => [`spell:${spell.id}`, spell.edizione === "2014" ? "2014" : "2024"] as const),
    ...monsters.map(monster => [`monster:${monster.id}`, monster.edizione] as const),
    ...monsters.map(monster => [`animal:${monster.id}`, monster.edizione] as const),
  ]);
  const cardEdition = (card: { kind: string; id: string }) => editionOf.get(`${card.kind}:${card.id}`) ?? (card.id.endsWith("-2014") ? "2014" : "2024");

  return (
    <main className="mx-auto max-w-xl space-y-4 bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118] lg:max-w-5xl">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B]">‹ Area riservata</Link>
      <h1 className="font-serif text-[34px] font-bold leading-tight text-[#7A1F2B]">Statistiche</h1>
      {/* «Adesso» (PROMPT 18): people with an event in the last 5 minutes, as in the strip of the Home. */}
      <p className="-mt-2 flex items-center gap-1.5 text-[13px] text-[#5E4E3E]" data-now={now}>
        <NowDot />{now.toLocaleString("it-IT")} {now === 1 ? "persona" : "persone"} adesso
      </p>
      <PeriodSelect value={period} />

      {/* «Quattro tessere» (canvas «Statistiche che contano», proposal A, PROMPT 16). */}
      <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-4" data-tiles="">
        <Tile name="persone" label="Persone" dark value={number(data.people)} valueColor="#FFFBF0" arrow={<Arrow change={change} dark />}
          chart={<Sparkline days={days} />}
          detail={best && best.visitors > 0 ? <>giorno migliore: {dayLabel(best.day).replace(/^\S+ /, "")}, {number(best.visitors)}</> : "nessuna visita nel periodo"} />
        <Tile name="tornano" label="Tornano" value={`${returning}%`} valueColor="#7A1F2B" arrow={<Arrow change={returningChange} unit=" pt" />}
          chart={<SmallRing percent={returning} label={`${returning}% delle persone è tornato almeno una seconda volta: ${data.returning} su ${data.people}.`} />}
          detail={<>{number(data.returning)} su {number(data.people)} sono tornate almeno una volta</>} />
        <Tile name="app" label="Usano l’app" value={number(data.installed)} valueColor="#1F6B45" arrow={<Arrow change={percentChange(data.installed, data.previousInstalled)} />}
          chart={<div className="space-y-1 pt-2">
            <SplitBar name="installazioni" parts={[{ value: app.android, color: "#1F6B45" }, { value: app.iphone, color: "#9CC5AE" }, { value: app.altro, color: "#CDBB96" }]}
              label={`Persone che usano l’app per sistema: ${app.androidLabel} ${app.android}, iPhone ${app.iphone}${app.altro ? `, altro ${app.altro}` : ""}.`} />
            <p className="text-[12px] text-[#5E4E3E]" data-app-split="">
              {app.androidLabel} {number(app.android)} · iPhone {number(app.iphone)}{app.altro > 0 && <> · altro {number(app.altro)}</>}
            </p>
          </div>}
          detail={<span data-installs={data.installs.total}>{number(data.installs.total)} {data.installs.total === 1 ? "nuova installazione" : "nuove installazioni"}</span>} />
        <Tile name="provenienza" label={`Da ${ORIGIN_LABEL[first.key]}`} value={`${share(first.value, known)}%`} valueColor="#7A4E00"
          chart={<div className="pt-2"><SplitBar name="provenienze" parts={ranked.map((row, index) => ({ value: row.value, color: index === 0 ? "#E0A21A" : index === 1 ? "#7A1F2B" : "#CDBB96" }))}
            label={`Provenienza di ${known} persone: ${ranked.map(row => `${row.label} ${share(row.value, known)}%`).join(", ")}.`} /></div>}
          detail={ranked.slice(1, 3).map(row => `${ORIGIN_LABEL[row.key]} ${share(row.value, known)}%`).join(" · ")} />
      </div>
      <p className="text-[12px] text-[#5E4E3E]" data-tiles-note="">{PERIODS[period]} · i tuoi dispositivi non contano</p>

      <h2 className="pt-2 font-serif text-[22px] font-bold leading-tight text-[#2B2118]">Il resto</h2>
      <div className="overflow-hidden rounded-2xl border border-[#DDCFAE] bg-[#FFFBF0]" data-rest="">
        <RestItem id="andamento" title="Andamento giorno per giorno">
          <DailyChart days={days} markers={markersInPeriod} />
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
        </RestItem>

        <RestItem id="arrivano" title="Da dove arrivano · telefono o computer">
          <Bars rows={origins} label={`Provenienza di ${known} persone: ${origins.map(row => `${row.label} ${share(row.value, known)}%`).join(", ")}.`} />
          <p className={`${SOFT} mt-3`} data-devices="">
            Su iPhone {share(data.devices.iphone, devices)}% · Android {share(data.devices.android, devices)}% · computer {share(data.devices.computer, devices)}%
          </p>
        </RestItem>

        <RestItem id="usano" title="Cosa usano · schede più aperte">
          <ul className="grid grid-cols-3 gap-2" aria-label="Quote delle pagine viste">
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
                <li key={`${card.kind}-${card.id}`} className="flex items-center gap-3 py-2" data-top-card={`${card.kind}:${card.id}`}>
                  <span className="w-5 text-right font-serif font-bold text-[#7A1F2B]">{index + 1}</span>
                  <Link href={card.kind === "spell" ? spellHref(card.id) : `/mostro/${encodeURIComponent(card.id)}`} className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#2B2118] underline-offset-4 hover:underline">{card.title}</Link>
                  <span className="rounded-full bg-[#2B2118] px-2 py-0.5 text-[11px] font-bold text-[#F6EFDF]" data-top-card-edition="">{cardEdition(card)}</span>
                  <span className="w-10 text-right text-sm tabular-nums text-[#5E4E3E]" data-top-card-opens={card.opens}>{number(card.opens)}</span>
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
        </RestItem>

        {/* «I più salvati» (PROMPT 10): people who have the card in their favorites now, not taps on the star. */}
        <RestItem id="salvati" title="I più salvati">
          <div data-most-saved="">
            <p className={SOFT}>Quante persone hanno la scheda nei preferiti adesso.</p>
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
          </div>
        </RestItem>

        {/* «L'hai provato al tavolo?» (PROMPT 19): the votes of the masters on each card, also under 5 (the public sees them from 5). */}
        <RestItem id="tavolo" title="Prove al tavolo">
          {tried.length ? (
            <ul className="divide-y divide-[#E8D3A0]" data-table-stats="">
              {tried.map(row => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-3 py-2 text-[15px]" data-table-row={row.id}>
                  <Link href={`/mostro/${encodeURIComponent(row.id)}`} className="font-semibold underline-offset-4 hover:underline">{row.nome}</Link>
                  <span className="text-[14px] text-[#5E4E3E]">{row.votes.total} {row.votes.total === 1 ? "voto" : "voti"}: facile {row.votes.facile} · giusto {row.votes.giusto} · difficile {row.votes.difficile}</span>
                </li>
              ))}
            </ul>
          ) : <p className={SOFT} data-table-stats="0">Nessun voto ancora. I voti arrivano dal riquadro «L’hai provato al tavolo?» in fondo alle schede di «I mostri creati da voi».</p>}
        </RestItem>

        {/* «Sostieni il Grimorio»: people, not taps; the contributions are on Ko-fi. */}
        <RestItem id="sostegno" title="Sostegno">
          <div data-support-stats="">
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[15px]">
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
          </div>
        </RestItem>

        {/* The faces of the Home and the sharing of the app (canvas «Valutazione Il Grimorio.App», ③). */}
        <RestItem id="valutazione" title="Come si trovano?">
          <Link href="/admin/statistiche/valutazione" data-rating-link="" className="flex min-h-11 items-center justify-between gap-3 text-[15px] font-semibold text-[#7A1F2B]">
            Le tre faccine della Home e il passaparola <span aria-hidden="true" className="text-[22px]">›</span>
          </Link>
        </RestItem>

        <RestItem id="contano" title="Come si contano">
          <p className={SOFT}>Dettagli di tutti i visitatori tranne chi rinuncia («No»). Le tue visite da admin non contano.</p>
          <p className={`${SOFT} mt-1`}>Le installazioni si contano per chi non ha rinunciato alle statistiche. Su iPhone si contano al primo avvio dall’icona.</p>
          <p className="mt-1 text-xs text-[#5E4E3E]" data-counting-since="">Dal 28 ottobre 2026 si contano tutti i visitatori tranne chi rinuncia (prima solo chi accettava).</p>
          <a href={VERCEL_ANALYTICS_URL} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B] underline underline-offset-4">
            Totale di tutti i visitatori su Vercel Analytics
          </a>
          <p className="text-xs text-[#5E4E3E]">Periodo: {PERIODS[period].charAt(0).toLowerCase() + PERIODS[period].slice(1)} (dal {dayLabel(range.from)}), fuso orario italiano.</p>
        </RestItem>
      </div>

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
