import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { publishedHomebrew, homebrewMonster } from "@/lib/homebrew";
import { getAllMonsters } from "@/lib/monsters";
import { balanceApplies, balanceEdition, evaluateMonster, LEVELS, levelSentence } from "@/lib/monster-balance";
import type { Level } from "@/lib/monster-balance/compare";
import { gapFromCr } from "@/lib/monster-balance/compare";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";

// Administrator only, drawn on every request; read only: nothing is written.
export const dynamic = "force-dynamic";
export const metadata = { title: "Bilanciamento — Il Grimorio.App", robots: { index: false, follow: false } };

/** Fewer fights than the box of a sheet (3000): the list computes every original monster at once. */
const LIST_FIGHTS = 1000;

/** The filter of the list (?filtro=), and the order of the groups: out of the CR first. */
const FILTERS = [
  { key: "tutti", label: "Tutti" }, { key: "fuori", label: "Fuori" }, { key: "da-controllare", label: "Da controllare" }, { key: "in-linea", label: "In linea" },
] as const;
const PILL: Record<Level, string> = { "in linea": "bg-[#1F6B45] text-white", "da controllare": "border border-[#7A4E00] bg-[#FCEFD0] text-[#7A4E00]", fuori: "bg-[#7A1F2B] text-white" };
const ORDER: Record<Level | "non simulabile", number> = { fuori: 0, "da controllare": 1, "in linea": 2, "non simulabile": 3 };

/**
 * «Bilanciamento» (PROMPT 11, 12): the homebrew creatures and the sheets made in the reserved area, each against the SRD
 * monsters of its CR and edition: «Fuori dal GS», then «Da controllare», then «In linea», the largest gap first. The box of each sheet is under it, on its page.
 */
export default async function BalancePage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const asked = (await searchParams).filtro;
  const filter = FILTERS.find(item => item.key === asked)?.key ?? "tutti";
  const [monsters, homebrew] = await Promise.all([getAllMonsters(), publishedHomebrew().catch(() => [])]);
  const made = monsters.filter(monster => !monster.homebrew_edizione && balanceApplies(monster));
  const all = [
    ...made.map(monster => ({ monster, kind: "Creata qui", edition: balanceEdition(monster, usesLegacyMonsterRules(monster)) })),
    ...homebrew.map(row => { const monster = homebrewMonster(row); return { monster, kind: "Creati da voi", edition: balanceEdition(monster, false) }; }),
  ].map(row => {
    const result = evaluateMonster(row.monster, row.edition, LIST_FIGHTS);
    const level: Level | "non simulabile" = result.metrics ? result.comparison.level : "non simulabile";
    return { ...row, result, level, gap: result.metrics ? gapFromCr(result.comparison) : -1 };
  }).sort((a, b) => ORDER[a.level] - ORDER[b.level] || b.gap - a.gap || a.monster.nome.localeCompare(b.monster.nome, "it"));
  const shown = filter === "tutti" ? all : all.filter(row => row.level !== "non simulabile" && LEVELS[row.level].slug === filter);

  return (
    <div className="mx-auto max-w-2xl bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118]" data-balance-page="">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B]">‹ Area riservata</Link>
      <h1 className="font-serif text-[34px] font-bold leading-tight text-[#7A1F2B]">Bilanciamento</h1>
      <p className="mt-1 text-[15px] leading-6 text-[#5E4E3E]">
        «I mostri creati da voi» e schede create nell’area riservata, confrontate con i mostri SRD dello stesso GS e della stessa edizione (fascia dal 10° al 90° percentile). Prima i «Fuori dal GS», poi «Da controllare», poi «In linea».
      </p>
      <nav aria-label="Filtra per giudizio" className="mt-3 flex flex-wrap gap-2" data-balance-filters="">
        {FILTERS.map(item => {
          const count = item.key === "tutti" ? all.length : all.filter(row => row.level !== "non simulabile" && LEVELS[row.level].slug === item.key).length;
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
          {shown.map(({ monster, kind, edition, result, level, gap }) => (
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
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 text-[15px] text-[#5E4E3E]" data-balance-empty="">{all.length ? "Nessuna scheda con questo giudizio." : "Nessuna homebrew o scheda creata nell’area riservata."}</p>}
      <p className="mt-3 text-[12px] text-[#5E4E3E]">Simulazione di {LIST_FIGHTS.toLocaleString("it-IT")} combattimenti per scheda contro 4 PG del livello del GS; il riquadro sotto ogni scheda ne usa 3000.</p>
    </div>
  );
}
