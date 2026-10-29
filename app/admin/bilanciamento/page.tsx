import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { publishedHomebrew, homebrewMonster } from "@/lib/homebrew";
import { getAllMonsters } from "@/lib/monsters";
import { balanceEdition, evaluateMonster } from "@/lib/monster-balance";
import { gapFromCr } from "@/lib/monster-balance/compare";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";

// Administrator only, drawn on every request; read only: nothing is written.
export const dynamic = "force-dynamic";
export const metadata = { title: "Bilanciamento — Il Grimorio.App", robots: { index: false, follow: false } };

/** Fewer fights than the box of a sheet (3000): the list computes every original monster at once. */
const LIST_FIGHTS = 1000;

/**
 * «Bilanciamento» (PROMPT 11): the homebrew creatures and the sheets made in the reserved area, each against the SRD
 * monsters of its CR and edition, the farthest from their CR first. The box of each sheet is under it, on its page.
 */
export default async function BalancePage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [monsters, homebrew] = await Promise.all([getAllMonsters(), publishedHomebrew().catch(() => [])]);
  const made = monsters.filter(monster => !monster.provenienza && (monster.fonte_scheda === "Aggiunta da te" || monster.fonte_scheda === "Sintesi originale"));
  const rows = [
    ...made.map(monster => ({ monster, kind: "Creata qui", edition: balanceEdition(monster, usesLegacyMonsterRules(monster)) })),
    ...homebrew.map(row => { const monster = homebrewMonster(row); return { monster, kind: "Homebrew", edition: balanceEdition(monster, false) }; }),
  ].map(row => {
    const result = evaluateMonster(row.monster, row.edition, LIST_FIGHTS);
    return { ...row, result, gap: result.metrics ? gapFromCr(result.comparison) : -1 };
  }).sort((a, b) => b.gap - a.gap || a.monster.nome.localeCompare(b.monster.nome, "it"));

  return (
    <div className="mx-auto max-w-2xl bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118]" data-balance-page="">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B]">‹ Area riservata</Link>
      <h1 className="font-serif text-[34px] font-bold leading-tight text-[#7A1F2B]">Bilanciamento</h1>
      <p className="mt-1 text-[15px] leading-6 text-[#5E4E3E]">
        Homebrew e schede create nell’area riservata, confrontate con i mostri SRD dello stesso GS e della stessa edizione. Prima i più lontani dal loro GS.
      </p>
      {rows.length ? (
        <ol className="mt-4 divide-y divide-[#E8D3A0] overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-[#7A4E00] bg-[#FCEFD0]" data-balance-list="">
          {rows.map(({ monster, kind, edition, result, gap }) => (
            <li key={monster.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3" data-balance-item={monster.id}>
              <Link href={`/mostro/${encodeURIComponent(monster.id)}`} className="min-w-0 flex-1 text-[16px] font-semibold underline-offset-4 hover:underline">{monster.nome}</Link>
              <span className="text-[13px] text-[#5E4E3E]">{kind} · GS {monster.grado_sfida || "?"} · {edition}</span>
              <span className="w-full text-[14px]" data-balance-outcome={!result.metrics ? "non-simulabile" : result.comparison.inLine ? "in-linea" : "fuori"}>
                {!result.metrics ? "Non simulabile" : result.comparison.inLine ? "In linea con il GS" : `${result.comparison.outside.join("; ")}`}
                {gap > 0 && <span className="text-[#6B4300]"> · distanza {gap}%</span>}
              </span>
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 text-[15px] text-[#5E4E3E]">Nessuna homebrew o scheda creata nell’area riservata.</p>}
      <p className="mt-3 text-[12px] text-[#5E4E3E]">Simulazione di {LIST_FIGHTS.toLocaleString("it-IT")} combattimenti per scheda contro 4 PG del livello del GS; il riquadro sotto ogni scheda ne usa 3000.</p>
    </div>
  );
}
