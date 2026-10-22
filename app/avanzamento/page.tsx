import { ParentLink } from "@/components/section-tiles";
import { PartBlock } from "@/components/sections/part-block";
import { XpCalculator } from "@/components/advancement/xp-calculator";
import { bonusRises, CLASS_HIT_POINTS, formatNumber, LEVELS } from "@/lib/advancement";
import { bonusFeatsRule, challengeOptions } from "@/lib/advancement-challenge";

export const metadata = { title: "Avanzamento di livello — Il Grimorio.App" };

const SRD_521 = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="border-b-2 border-primary pb-1.5 font-serif text-[24px] font-bold text-primary">{children}</h2>;
}

/** Each block can be hidden from /admin/sezioni (lib/public-sections.ts); with all four hidden the page is unavailable. */
export default function AdvancementPage() {
  const feats = bonusFeatsRule();
  return (
    <div className="space-y-8 px-4 pb-8 pt-4 sm:px-6">
      <div>
        <ParentLink href="/compendio" label="Compendio" />
        <h1 className="border-b-4 border-primary pb-3 font-serif text-[36px] font-bold leading-tight">Avanzamento di livello</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted">PE, bonus di competenza e punti ferita</p>
      </div>

      <PartBlock section="avanzamento" part="tabella">
      <section aria-labelledby="tabella" className="space-y-3">
        <SectionTitle id="tabella">Tabella di avanzamento</SectionTitle>
        <p className="text-sm text-muted">Valida per le regole 2014 e 2024: le due edizioni usano gli stessi PE e bonus di competenza.</p>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div aria-hidden="true" className="grid grid-cols-[4.5rem_1fr_auto] gap-2 bg-elevated px-4 py-2 text-[12px] font-bold tracking-[0.06em] text-muted">
            <span>LIVELLO</span><span className="text-right">PE</span><span className="w-[5.5rem] text-right">COMPETENZA</span>
          </div>
          <ol>
            {LEVELS.map(level => (
              <li key={level.livello} className="grid min-h-12 grid-cols-[4.5rem_1fr_auto] items-center gap-2 border-t border-divider px-4 py-1.5">
                <span className="font-serif text-[22px] font-bold"><span className="sr-only">Livello </span>{level.livello}º</span>
                <span className="text-right text-[17px] tabular-nums"><span className="sr-only">PE </span>{formatNumber(level.pe)}</span>
                <span className="flex w-[5.5rem] justify-end">
                  <span className={`rounded-full px-2.5 py-0.5 text-[15px] font-bold tabular-nums ${bonusRises(level) ? "bg-amber text-foreground" : "text-primary"}`}>
                    <span className="sr-only">Bonus di competenza </span>+{level.bonus}{bonusRises(level) && <span className="sr-only"> (sale)</span>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted"><span className="inline-block size-3 rounded-full bg-amber" aria-hidden="true" />Il bonus di competenza sale ai livelli 5, 9, 13 e 17.</p>
      </section>
      </PartBlock>

      <PartBlock section="avanzamento" part="punti-ferita">
      <section aria-labelledby="punti-ferita" className="space-y-3">
        <SectionTitle id="punti-ferita">Punti ferita fissi per classe</SectionTitle>
        <p className="text-[15px] leading-6">Quando acquisisci un livello puoi tirare il Dado Vita o usare questo valore, sommando sempre il modificatore di Costituzione (minimo 1 PF per livello).</p>
        <ul className="space-y-2">
          {CLASS_HIT_POINTS.map(group => (
            <li key={group.dado} className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[19px] font-bold leading-tight">{group.classi.join(", ")}</span>
                <span className="text-sm text-muted">Dado Vita {group.dado}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-serif text-[28px] font-bold leading-none text-primary">{group.fisso}</span>
                <span className="text-[12px] text-muted">+ mod. Cos</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">Dal 2º livello in su; uguale nelle regole 2014 e 2024.</p>
      </section>
      </PartBlock>

      {feats && (
        <PartBlock section="avanzamento" part="talenti">
        <section aria-labelledby="talenti" className="space-y-3">
          <SectionTitle id="talenti">Talenti bonus oltre il 20º livello</SectionTitle>
          <div className="space-y-2 rounded-[14px] border-[1.5px] border-amber bg-[#FBEBC2] p-4">
            <span className="inline-block rounded-full bg-foreground px-2.5 py-0.5 text-[12px] font-bold text-card">Regola 2024</span>
            <p className="font-serif text-[1.05rem] leading-7">{feats.text}</p>
            <p className="text-sm text-muted">
              Testo integrale: SRD 5.2.1 italiano, «{feats.title}». <a className="underline underline-offset-4" href={`${SRD_521}#page=${feats.page}`} target="_blank" rel="noreferrer">Pagina {feats.page}</a>
            </p>
          </div>
        </section>
        </PartBlock>
      )}

      <PartBlock section="avanzamento" part="calcolatore">
      <section aria-labelledby="calcolatore" className="space-y-3">
        <SectionTitle id="calcolatore">Calcolatore di PE</SectionTitle>
        <p className="text-sm text-muted">I PE di ogni grado sfida vengono dalle schede dei mostri dell’app. Tutto resta sul telefono: niente viene salvato.</p>
        <XpCalculator options={challengeOptions()} />
      </section>
      </PartBlock>
    </div>
  );
}
