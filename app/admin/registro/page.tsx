import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { UndoButton } from "@/components/admin-content/undo-button";
import { isAdmin } from "@/lib/admin-auth";
import { activeOverrideMap, overrideHealth, type ContentOverride } from "@/lib/content-overrides-apply";
import { allOverrides } from "@/lib/content-overrides";
import { CONTENT_SECTIONS, isContentEdition, sectionSpec } from "@/lib/content-sections";
import { documentedRepairs } from "@/lib/documented-repairs";
import { formatWhen } from "@/lib/feedback-input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro modifiche — Il Grimorio.App", robots: { index: false, follow: false } };

const HEALTH: Record<string, string> = {
  orphan: "La scheda o il campo non esiste più nei dati originali: la correzione non ha effetto.",
  "original-changed": "Il valore del manuale è cambiato dopo la correzione: controlla se serve ancora.",
};

function cardName(row: ContentOverride) {
  const section = sectionSpec(row.sezione);
  if (!section || !isContentEdition(row.edizione)) return row.scheda_id;
  return section.items(row.edizione).find(item => item.id === row.scheda_id)?.nome ?? row.scheda_id;
}

export default async function LogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  const sezione = typeof query.sezione === "string" && sectionSpec(query.sezione) ? query.sezione : undefined;
  const stato = query.stato === "annullate" ? "annullate" : query.stato === "tutte" ? "tutte" : "attive";
  const rows = await allOverrides();
  const inForce = new Set([...activeOverrideMap(rows).values()].map(row => row.id));
  const shown = rows.filter(row => (!sezione || row.sezione === sezione) && (stato === "tutte" || (stato === "attive" ? inForce.has(row.id) : !inForce.has(row.id))));
  const href = (next: { sezione?: string; stato?: string }) => {
    const params = new URLSearchParams();
    const s = "sezione" in next ? next.sezione : sezione;
    const t = next.stato ?? stato;
    if (s) params.set("sezione", s);
    if (t !== "attive") params.set("stato", t);
    return `/admin/registro${params.size ? `?${params}` : ""}`;
  };
  const pill = (on: boolean) => `inline-flex min-h-11 shrink-0 items-center rounded-[22px] border-[1.5px] px-3.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`;
  const now = new Date();
  const documented = documentedRepairs();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <h1 className="font-serif text-[30px] font-bold text-primary">Registro modifiche</h1>
      <p className="text-sm text-muted">Tutto ciò che è diverso dal manuale originale, con motivo e possibilità di annullare. I file originali non vengono mai modificati.</p>
      <nav aria-label="Sezione" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Link href={href({ sezione: undefined })} className={pill(!sezione)} aria-current={!sezione ? "page" : undefined}>Tutte</Link>
        {CONTENT_SECTIONS.map(section => <Link key={section.key} href={href({ sezione: section.key })} className={pill(sezione === section.key)} aria-current={sezione === section.key ? "page" : undefined}>{section.title}</Link>)}
      </nav>
      <nav aria-label="Stato" className="flex gap-2">
        {[["attive", "In vigore"], ["annullate", "Annullate"], ["tutte", "Tutto lo storico"]].map(([value, label]) => (
          <Link key={value} href={href({ stato: value })} aria-current={stato === value ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-[18px] px-3.5 text-sm ${stato === value ? "bg-foreground font-semibold text-background" : "bg-elevated text-muted"}`}>{label}</Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-6 text-center text-[15px] text-muted">Nessuna modifica.</p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card" aria-label="Modifiche">
          {shown.map(row => {
            const section = sectionSpec(row.sezione);
            const field = section?.fields.find(item => item.name === row.campo);
            const health = isContentEdition(row.edizione) ? overrideHealth(row, section?.original(row.scheda_id, row.edizione)) : "orphan";
            const active = inForce.has(row.id);
            return (
              <li key={row.id} className="border-t border-elevated px-3.5 py-3 first:border-t-0">
                <div className="flex items-start justify-between gap-2 text-xs text-muted">
                  <span>{formatWhen(new Date(row.creata_il), now)} · {section?.title ?? row.sezione} {row.edizione}</span>
                  {active ? <UndoButton id={row.id} /> : <span>{row.annullata_il ? `annullata ${formatWhen(new Date(row.annullata_il), now)}` : "sostituita"}</span>}
                </div>
                <p className="mt-0.5 text-[15px] font-bold">
                  {active && section && isContentEdition(row.edizione)
                    ? <Link href={`/admin/contenuti/${row.sezione}/${row.scheda_id}?edizione=${row.edizione}`} className="underline underline-offset-4">{cardName(row)}</Link>
                    : cardName(row)} · {field?.label.toLowerCase() ?? row.campo}
                </p>
                <p className="mt-0.5 break-words text-sm"><s className="text-[#8a7a66]">{row.valore_originale || "—"}</s> → <b>{row.valore_nuovo || "—"}</b></p>
                <p className="mt-0.5 break-words text-[13px] text-muted">{row.motivo}</p>
                {health !== "ok" && <p className="mt-1 text-[13px] font-semibold text-primary">{HEALTH[health]}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <a href="/admin/registro/esporta" className="inline-flex min-h-11 items-center self-start rounded-[22px] border-[1.5px] border-primary px-4 text-sm font-bold text-primary">Esporta correzioni (JSON)</a>
      <details className="rounded-[14px] border border-border bg-card p-3.5">
        <summary className="min-h-11 cursor-pointer content-center text-[15px] font-bold">Correzioni documentate ({documented.length}, sola lettura)</summary>
        <p className="mt-1 text-[13px] text-muted">Approvate prima del registro e conservate nei file *-repairs-*.json del progetto: si cambiano solo con una modifica del codice.</p>
        <ul className="mt-2 space-y-2">
          {documented.map((row, i) => (
            <li key={i} className="border-t border-elevated pt-2 text-[13px]">
              <span className="text-muted">{row.sezione} · {row.scheda}</span>
              <span className="block break-words"><s className="text-[#8a7a66]">{row.prima}</s> → <b>{row.dopo}</b></span>
              <span className="block text-muted">{row.nota}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
