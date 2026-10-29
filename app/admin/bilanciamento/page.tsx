import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { VerifiedToggle } from "@/components/admin-balance/verified-toggle";
import { isAdmin } from "@/lib/admin-auth";
import { publishedHomebrew, homebrewMonster, verifiedPill } from "@/lib/homebrew";
import { getAllMonsters } from "@/lib/monsters";
import { balanceApplies, balanceEditions, evaluateMonster, LEVELS, levelSentence, overallLevel, type BalanceEdition } from "@/lib/monster-balance";
import type { Level } from "@/lib/monster-balance/compare";
import { gapFromCr } from "@/lib/monster-balance/compare";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";
import { readAllTableCounts, type TableCounts } from "@/lib/table-votes";

// Administrator only, drawn on every request; read only: nothing is written (the pill toggle is its own action).
export const dynamic = "force-dynamic";
export const metadata = { title: "Bilanciamento — Il Grimorio.App", robots: { index: false, follow: false } };

/** Fewer fights than the box of a sheet (3000 for each tactic): the list computes every original monster at once. */
const LIST_FIGHTS = 1000;

/** The filter of the list (?filtro=), and the order of the groups: out of the CR first. */
const FILTERS = [
  { key: "tutti", label: "Tutti" }, { key: "fuori", label: "Fuori" }, { key: "da-controllare", label: "Da controllare" }, { key: "in-linea", label: "In linea" },
  { key: "con-avvisi", label: "Con avvisi" },
] as const;
const PILL: Record<Level, string> = { "in linea": "bg-[#1F6B45] text-white", "da controllare": "border border-[#7A4E00] bg-[#FCEFD0] text-[#7A4E00]", fuori: "bg-[#7A1F2B] text-white" };
const ORDER: Record<Level | "non simulabile", number> = { fuori: 0, "da controllare": 1, "in linea": 2, "non simulabile": 3 };

/** «Al tavolo»: the votes of the masters beside the verdict of the simulator (all of them, also under 5). */
function tableLine(counts: TableCounts | undefined) {
  if (!counts?.total) return "Al tavolo: nessun voto";
  return `Al tavolo: facile ${counts.facile} · giusto ${counts.giusto} · difficile ${counts.difficile}`;
}

/**
 * «Bilanciamento» (PROMPT 11, 12, 19): the homebrew creatures and the sheets made in the reserved area, each against the
 * SRD monsters of its CR and edition with three ways of playing it: «Fuori dal GS», then «Da controllare», then
 * «In linea», the largest gap first; the warnings, and the votes «al tavolo». The box of each sheet is under it, on its page.
 */
export default async function BalancePage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const asked = (await searchParams).filtro;
  const filter = FILTERS.find(item => item.key === asked)?.key ?? "tutti";
  const [monsters, homebrew, votes] = await Promise.all([getAllMonsters(), publishedHomebrew().catch(() => []), readAllTableCounts().catch(() => new Map<string, TableCounts>())]);
  const made = monsters.filter(monster => !monster.homebrew_edizione && balanceApplies(monster));
  const all = [
    ...made.map(monster => ({ monster, kind: "Creata qui", editions: balanceEditions(monster, usesLegacyMonsterRules(monster)), row: undefined })),
    ...homebrew.map(row => { const monster = homebrewMonster(row); return { monster, kind: "Creati da voi", editions: balanceEditions(monster, false), row }; }),
  ].map(item => {
    // A creature «2014 e 2024»: both checks (PROMPT 22); the overall verdict, the sentence of the worse, every warning.
    const results = item.editions.map(edition => evaluateMonster(item.monster, edition, LIST_FIGHTS));
    const overall = overallLevel(results);
    const level: Level | "non simulabile" = overall ?? "non simulabile";
    const worst = results.reduce((top, result) => (overall && result.comparison.level === overall && gapFromCr(result.comparison) >= gapFromCr(top.comparison) ? result : top), results[0]);
    const both = results.length > 1;
    const warnings = results.flatMap(result => result.warnings.map(warning => ({ ...warning, text: both ? `${result.edition}: ${warning.text}` : warning.text })));
    const edition = both ? "2014 e 2024" : item.editions[0] as BalanceEdition | string;
    return { ...item, edition, result: { ...worst, warnings }, level, gap: overall ? Math.max(...results.map(result => gapFromCr(result.comparison))) : -1 };
  }).sort((a, b) => ORDER[a.level] - ORDER[b.level] || b.gap - a.gap || a.monster.nome.localeCompare(b.monster.nome, "it"));
  const matches = (item: (typeof all)[number], key: (typeof FILTERS)[number]["key"]) =>
    key === "tutti" ? true : key === "con-avvisi" ? item.result.warnings.length > 0 : item.level !== "non simulabile" && LEVELS[item.level].slug === key;
  const shown = all.filter(item => matches(item, filter));

  return (
    <div className="mx-auto max-w-2xl bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118]" data-balance-page="">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B]">‹ Area riservata</Link>
      <h1 className="font-serif text-[34px] font-bold leading-tight text-[#7A1F2B]">Bilanciamento</h1>
      <p className="mt-1 text-[15px] leading-6 text-[#5E4E3E]">
        «I mostri creati da voi» e schede create nell’area riservata, confrontate con i mostri SRD dello stesso GS e della stessa edizione (fascia dal 10° al 90° percentile), con tre modi di giocarle: ottimale, a caso, prudente. Prima i «Fuori dal GS», poi «Da controllare», poi «In linea».
      </p>
      <nav aria-label="Filtra per giudizio" className="mt-3 flex flex-wrap gap-2" data-balance-filters="">
        {FILTERS.map(item => {
          const count = all.filter(row => matches(row, item.key)).length;
          return (
            <Link key={item.key} href={item.key === "tutti" ? "/admin/bilanciamento" : `/admin/bilanciamento?filtro=${item.key}`} data-balance-filter={item.key}
              aria-current={filter === item.key ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-[14px] font-semibold ${filter === item.key ? "border-[#7A1F2B] bg-[#7A1F2B] text-white" : "border-[#D9C49A] bg-white text-[#2B2118]"}`}>
              {item.label} · {count}
            </Link>
          );
        })}
      </nav>
      {shown.length ? (
        <ol className="mt-4 divide-y divide-[#E8D3A0] overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-[#7A4E00] bg-[#FCEFD0]" data-balance-list="">
          {shown.map(({ monster, kind, edition, result, level, gap, row }) => (
            <li key={monster.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3" data-balance-item={monster.id}>
              <Link href={`/mostro/${encodeURIComponent(monster.id)}`} className="min-w-0 flex-1 text-[16px] font-semibold underline-offset-4 hover:underline">{monster.nome}</Link>
              <span className="text-[13px] text-[#5E4E3E]">{kind} · GS {monster.grado_sfida || "?"} · {edition}</span>
              <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-[14px]" data-balance-outcome={level === "non simulabile" ? "non-simulabile" : LEVELS[level].slug}>
                {level === "non simulabile" ? "Non simulabile" : <>
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-extrabold ${PILL[level]}`}>{LEVELS[level].label}</span>
                  <span>{levelSentence(result.comparison)}</span>
                  {gap > 0 && <span className="text-[#6B4300]">distanza {gap}%</span>}
                </>}
              </span>
              {/* Avvisi: the checks the CR does not measure and the test situations. */}
              <span className="w-full text-[13px]" data-balance-warning-count={result.warnings.length}>
                {result.warnings.length
                  ? <>⚠ Avvisi: {result.warnings.length} — {result.warnings.slice(0, 3).map(warning => warning.text).join("; ")}{result.warnings.length > 3 ? "…" : ""}</>
                  : "Avvisi: nessuno"}
              </span>
              {/* Al tavolo: the votes of the masters beside the simulator (only the cards of «I mostri creati da voi» have them). */}
              {row && <span className="w-full text-[13px]" data-balance-table={monster.id}>{tableLine(votes.get(monster.id))}</span>}
              {row && <span className="w-full"><VerifiedToggle id={monster.id} shown={verifiedPill(row)} possible={row.bilanciamento === "in linea"} /></span>}
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 text-[15px] text-[#5E4E3E]" data-balance-empty="">{all.length ? "Nessuna scheda con questo filtro." : "Nessuna homebrew o scheda creata nell’area riservata."}</p>}
      <p className="mt-3 text-[12px] text-[#5E4E3E]">Simulazione di {LIST_FIGHTS.toLocaleString("it-IT")} combattimenti per tattica per scheda contro 4 PG del livello del GS, più le situazioni di prova; il riquadro sotto ogni scheda ne usa 3000 per tattica. «Al tavolo»: i voti dei master sulla scheda pubblica.</p>
    </div>
  );
}
