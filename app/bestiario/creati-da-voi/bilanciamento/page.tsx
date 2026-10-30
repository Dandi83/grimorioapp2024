import Link from "next/link";
import { notFound } from "next/navigation";

import { HiddenPartBar } from "@/components/sections/part-block";
import {
  METHOD_DETAILS_TITLE, METHOD_INTRO, METHOD_LIMITS, METHOD_LIMITS_CLOSING, METHOD_LIMITS_TITLE, METHOD_REPORT, METHOD_STEPS,
  METHOD_THRESHOLDS, METHOD_TITLE, METHOD_WARNINGS, referenceTable,
} from "@/lib/balance-method";
import { partId } from "@/lib/public-sections";
import { CLOSED_PART_METADATA, partState, sectionPage } from "@/lib/section-view";

export const revalidate = 300;

/**
 * Open while at least one group of original creatures is (PROMPT 26): «I mostri creati da voi» or «Mostri del
 * Grimorio»; the administrator sees it anyway, with the bar while neither is visible to the public.
 */
async function groups() {
  const [community, grimorio] = await Promise.all([partState("bestiario", "homebrew"), partState("bestiario", "grimorio")]);
  const open = (state: typeof community) => state.shown && !state.hidden;
  return { community, grimorio, shown: community.shown || grimorio.shown, closed: !open(community) && !open(grimorio), back: open(community) || !open(grimorio) ? "community" : "grimorio" } as const;
}

/** While both groups are closed to the visitors, nothing of them in the title either. */
export async function generateMetadata() {
  return (await groups()).shown ? {
    title: `${METHOD_TITLE} — I mostri creati da voi · Il Grimorio.App`,
    description: "Come mettiamo alla prova le creature originali, della community e della redazione: migliaia di combattimenti, tre modi di giocarle, gruppi diversi e la prova del tavolo.",
  } : CLOSED_PART_METADATA;
}

/**
 * «Come valutiamo il bilanciamento» (PROMPT 19, canvas «Bilanciamento trasparente», screen ①): the method in plain words,
 * the same as docs/metodo-bilanciamento.md (lib/balance-method.ts). Only the method: no number of any monster.
 */
export default async function BalanceMethodPage() {
  await sectionPage("bestiario");
  const state = await groups();
  if (!state.shown) notFound();
  const table = referenceTable();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-4 text-[#2B2118]" data-method-page="">
      {state.closed && <div className="pb-2"><HiddenPartBar id={partId("bestiario", "homebrew")} /></div>}
      {state.back === "community"
        ? <Link href="/bestiario/creati-da-voi" className="-ml-2 inline-flex min-h-11 items-center px-2 text-base font-bold text-[#7A1F2B]">‹ I mostri creati da voi</Link>
        : <Link href="/bestiario/del-grimorio" className="-ml-2 inline-flex min-h-11 items-center px-2 text-base font-bold text-[#7A1F2B]">‹ Mostri del Grimorio</Link>}
      <h1 className="mt-1 font-serif text-[34px] font-bold leading-tight">{METHOD_TITLE}</h1>
      <p className="mt-2 text-[16px] leading-7 text-[#3D3128]">{METHOD_INTRO}</p>

      <ol className="mt-5 space-y-3" data-method-steps="">
        {METHOD_STEPS.map((step, index) => (
          <li key={step.title} className="rounded-[14px] border border-[#DDCFAE] bg-[#FFFBF0] p-4" data-method-step={index + 1}>
            <h2 className="flex items-center gap-3 font-serif text-[21px] font-bold leading-tight">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-[#7A1F2B] font-serif text-[16px] text-[#FFFBF0]">{index + 1}</span>
              {step.title}
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-[#3D3128]">{step.text}</p>
          </li>
        ))}
      </ol>

      <section aria-labelledby="method-limits" className="mt-5 rounded-[16px] bg-[#2B2118] p-4 text-[#FFFBF0]" data-method-limits="">
        <h2 id="method-limits" className="font-serif text-[21px] font-bold">{METHOD_LIMITS_TITLE}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-6 text-[#F1E6CC]">
          {METHOD_LIMITS.map(item => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-3 font-serif text-[18px] italic leading-7 text-[#E0A21A]">{METHOD_LIMITS_CLOSING}</p>
      </section>

      <details className="group mt-5 rounded-[14px] border border-[#DDCFAE] bg-[#FFFBF0]" data-method-details="">
        <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
          {METHOD_DETAILS_TITLE}
          <span aria-hidden="true" className="text-[22px] leading-none text-[#7A1F2B] transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="space-y-4 px-4 pb-4 text-[14px] leading-6">
          <div>
            <h3 className="font-bold">Il gruppo di riferimento</h3>
            <p className="text-[#5E4E3E]">Guerriero / chierico / ladro / mago, livello pari al GS. Gli stessi numeri usati dal simulatore.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13px]" data-method-table="">
                <thead><tr className="text-left text-[#5E4E3E]"><th className="py-1 pr-2">Liv.</th><th className="pr-2">CA</th><th className="pr-2">PF</th><th className="pr-2">Attacchi del guerriero</th><th className="pr-2">Danni</th><th>CD</th></tr></thead>
                <tbody>
                  {table.map(row => (
                    <tr key={row.level} className="border-t border-[#E8D3A0] align-top">
                      <td className="py-1 pr-2 font-bold">{row.level}</td><td className="pr-2">{row.ac}</td><td className="pr-2">{row.hp}</td>
                      <td className="pr-2">{row.attacks}</td><td className="pr-2">{row.damage}</td><td>{row.dc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Le soglie</h3>
            <ul className="list-disc space-y-1 pl-5">{METHOD_THRESHOLDS.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3 className="font-bold">Gli avvisi</h3>
            <ul className="list-disc space-y-1 pl-5">{METHOD_WARNINGS.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </details>

      <p className="mt-5 text-[14px] leading-6 text-[#5E4E3E]" data-method-report="">
        {METHOD_REPORT.replace(" Scrivici da Info → Segnala un problema.", " ")}
        Scrivici da <Link href="/info" className="font-semibold text-[#7A1F2B] underline underline-offset-2">Info → Segnala un problema</Link>.
      </p>
    </div>
  );
}
