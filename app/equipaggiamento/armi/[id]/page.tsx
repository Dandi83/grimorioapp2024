import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { EditionPanels } from "@/components/equipment/edition-panels";
import { CorrectionNote } from "@/components/correction-note";
import { getCorrectedWeapons } from "@/lib/corrected-content";
import type { ContentOverride } from "@/lib/content-overrides-apply";
import { compareWeapon, getWeapon, masteryText, propertyCards, specialRule, weaponSources, weapons, type WeaponEditionView } from "@/lib/equipment";
import { WEAPON_GROUP_NAMES, type EquipmentEdition } from "@/lib/equipment-types";
import { ReportLink } from "@/components/feedback/report-link";

export const dynamicParams = false;
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export function generateStaticParams() {
  return weapons.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const weapon = getWeapon((await params).id, (await getCorrectedWeapons()).weapons);
  const name = (weapon?.editions["2024"] ?? weapon?.editions["2014"])?.nome;
  return { title: name ? `${name} — Armi — Il Grimorio.App` : "Arma non trovata" };
}

const FIELD_LABELS: Record<string, string> = { nome: "Nome", danni: "Danni", tipoDanno: "Tipo di danno", costo: "Costo", peso: "Peso", proprieta: "Proprietà", padronanza: "Padronanza" };

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-divider px-2 py-3 text-center last:border-r-0">
      <p className="text-[12px] font-bold tracking-[0.06em] text-muted">{label}</p>
      <p className="font-serif text-2xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function Sheet({ weapon, group, corrections }: { weapon: WeaponEditionView; group: number; corrections?: ContentOverride[] }) {
  const source = weaponSources[weapon.edition];
  const cards = propertyCards(weapon);
  const special = specialRule(weapon);
  const mastery = weapon.padronanza && masteryText(weapon.padronanza);
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-1.5 pt-4 text-center">
        <div className="flex size-[132px] flex-col items-center justify-center rounded-full border-2 border-primary bg-primary-faint shadow-[0_0_0_6px_var(--color-background),0_0_0_7px_var(--color-chip-border)]">
          <span className="font-serif text-[52px] font-bold leading-none text-primary">{weapon.danni || "—"}</span>
          <span className="text-sm font-semibold text-muted">{weapon.tipoDanno || "nessun danno"}</span>
        </div>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight">{weapon.nome}</h1>
        <p className="text-[15px] text-muted">{WEAPON_GROUP_NAMES[group]}</p>
      </div>
      <div className="grid grid-cols-3 rounded-[14px] border border-border bg-card">
        <Cell label="PESO" value={weapon.peso} />
        <Cell label="COSTO" value={weapon.costo} />
        <Cell label="GITTATA" value={weapon.gittata?.replace("/", " / ") ?? "—"} />
      </div>
      {cards.length > 0 && (
        <section className="space-y-2.5" aria-label="Proprietà">
          <h2 className="font-serif text-[22px] font-bold text-primary">Proprietà</h2>
          {cards.map(card => (
            <div key={card.label} className="space-y-1.5 rounded-[14px] border border-border bg-card p-3.5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-chip-border bg-primary-faint px-3 py-0.5 text-sm font-bold text-primary">{card.label}</span>
                {card.detail && <span className="text-sm text-muted">{card.detail}</span>}
              </p>
              {card.text.split("\n\n").map((paragraph, i) => <p key={i} className="text-[15px] leading-6">{paragraph}</p>)}
            </div>
          ))}
        </section>
      )}
      {special && (
        <section className="space-y-2.5" aria-label="Regole speciali">
          <h2 className="font-serif text-[22px] font-bold text-primary">Arma speciale</h2>
          <div className="space-y-1.5 rounded-[14px] border border-border bg-card p-3.5">
            {special.split("\n\n").map((paragraph, i) => <p key={i} className="text-[15px] leading-6">{paragraph}</p>)}
          </div>
        </section>
      )}
      {mastery && (
        <section className="space-y-2.5" aria-label="Padronanza">
          <h2 className="font-serif text-[22px] font-bold text-primary">Padronanza</h2>
          <div className="space-y-1.5 rounded-[14px] border-[1.5px] border-amber bg-[#FBEBC2] p-3.5">
            <p className="font-serif text-2xl font-bold">{weapon.padronanza}</p>
            <p className="text-[15px] leading-6">{mastery}</p>
          </div>
        </section>
      )}
      <aside aria-label="Fonte" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: {source.document} italiano — tabella Armi{weapon.edition === "2014" ? " e «Proprietà delle armi»" : " e voce «Armi» del Manuale"}.</p>
        <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${weapon.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {weapon.page}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
      {corrections && <CorrectionNote corrections={corrections} labels={FIELD_LABELS} />}
    </div>
  );
}

export default async function WeaponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corrected = await getCorrectedWeapons();
  const weapon = getWeapon(id, corrected.weapons);
  if (!weapon) notFound();
  const compare = compareWeapon(weapon);
  const corrections = corrected.corrections.get(id);
  const panels: Partial<Record<EquipmentEdition, React.ReactNode>> = {};
  for (const edition of ["2014", "2024"] as const) {
    const view = weapon.editions[edition];
    if (view) panels[edition] = <Sheet weapon={view} group={weapon.gruppo} corrections={corrections?.[edition]} />;
  }
  return (
    <article className="px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback="/equipaggiamento/armi" label="Tutte le armi" />
      <EditionPanels panels={panels} missing={{ "2024": "Non presente nella tabella 2024", "2014": "Nuova nel 2024" }} />
      {(compare.rows.length > 0 || compare.note) && (
        <section className="mt-5 space-y-2.5" aria-label="Differenze tra le edizioni">
          <h2 className="font-serif text-[22px] font-bold text-primary">2014 → 2024</h2>
          {compare.rows.length > 0 ? (
            <table className="w-full table-fixed overflow-hidden rounded-[14px] border border-border bg-card text-[14px]">
              <thead className="bg-elevated text-left text-[12px] font-bold tracking-[0.06em] text-muted">
                <tr><th className="w-[27%] px-2.5 py-2"><span className="sr-only">Voce</span></th><th className="px-2 py-2">2014</th><th className="px-2 py-2">2024</th></tr>
              </thead>
              <tbody>
                {compare.rows.map(row => (
                  <tr key={row.label} className="border-t border-divider align-top">
                    <th scope="row" className="px-2.5 py-2.5 text-left font-normal text-muted">{row.label}</th>
                    <td className="break-words px-2 py-2.5">{row.before}</td>
                    <td className={`break-words px-2 py-2.5 ${row.changed ? "font-bold text-primary" : ""}`}>{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="rounded-[14px] border border-border bg-card px-4 py-3 text-[15px] font-semibold">{compare.note}</p>
          )}
        </section>
      )}
      <ReportLink />
    </article>
  );
}
