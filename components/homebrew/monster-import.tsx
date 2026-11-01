"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileJson } from "lucide-react";

import { checkImportAction, saveImportAction, type ImportCheckResult } from "@/app/actions/admin-monster-import";
import { HOMEBREW_LICENSE, draftToMonster } from "@/lib/homebrew-types";
import { checkImport, type FieldChange, type ImportIssue } from "@/lib/monster-import";
import { HomebrewSheet } from "./homebrew-sheet";

/** A JSON with every field, for «Inserisci un esempio». */
export const IMPORT_EXAMPLE = JSON.stringify({
  id: "custode-delle-ceneri", nome: "Custode delle ceneri", tipo: "Costrutto", taglia: "Grande", allineamento: "neutrale",
  grado_sfida: "5", gs_num: 5, px: "1.800", bonus_competenza: "+3", classe_armatura: "16 (armatura naturale)", iniziativa: "+1 (11)",
  punti_ferita: "95 (10d10 + 40)", velocita: "9 m", forza: 19, destrezza: 12, costituzione: 18, intelligenza: 6, saggezza: 12, carisma: 5,
  tiri_salvezza: "For +7, Des +1, Cos +7, Int −2, Sag +1, Car −3", abilita: "Percezione +4", resistenze: "Fuoco", immunita: "Veleno; Avvelenato",
  sensi: "Scurovisione 18 m, Percezione passiva 14", linguaggi: "capisce il Comune ma non parla", habitat: ["Sottosuolo"],
  descrizione: "Un guardiano di pietra e brace.<br><br>Veglia sulle tombe dimenticate.",
  tratti: "<strong>Corpo di brace.</strong> Una creatura che lo tocca subisce 5 (1d10) danni da fuoco.",
  azioni: "<strong>Pugno.</strong> <em>Tiro per colpire in mischia:</em> +7, portata 1,5 m. <em>Colpito:</em> 13 (2d8 + 4) danni contundenti.",
  azioni_bonus: "", reazioni: "", azioni_leggendarie: "", storia: "Forgiato per vegliare.", tattiche: "", tana: "", agganci: "", varianti: "",
}, null, 2);

function Issues({ title, list, tone }: { title: string; list: ImportIssue[]; tone: "error" | "warn" }) {
  if (!list.length) return null;
  const error = tone === "error";
  return (
    <section role={error ? "alert" : "status"} data-import-issues={tone} className={`rounded-[14px] border-[1.5px] p-4 ${error ? "border-[#7A1F2B] bg-[#F8E1E1]" : "border-[#E0A21A] bg-[#FCEFD0]"}`}>
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-[#2B2118]"><AlertTriangle size={20} aria-hidden="true" />{title}</h2>
      <ul className="mt-2 space-y-1.5 text-[15px] leading-6 text-[#2B2118]">
        {list.map((issue, index) => (
          <li key={index} data-import-issue={issue.campo}>{issue.messaggio}</li>
        ))}
      </ul>
    </section>
  );
}

function Changes({ nome, changes, onOverwrite, onCancel, busy }: { nome: string; changes: FieldChange[]; onOverwrite: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <section role="alert" data-import-confirm="" className="rounded-[14px] border-[1.5px] border-[#7A1F2B] bg-[#FFFBF0] p-4">
      <h2 className="font-serif text-xl font-bold text-[#7A1F2B]">Esiste già «{nome}»</h2>
      <p className="mt-1 text-[15px] leading-6">Sovrascrivendo, la scheda salvata cambia così ({changes.length} {changes.length === 1 ? "campo" : "campi"}). Immagine e visibilità restano come sono.</p>
      {changes.length > 0 ? (
        <div className="mt-2 max-h-80 overflow-auto rounded-[10px] border border-[#DDCFAE]">
          <table className="w-full text-left text-[14px]" data-import-changes="">
            <thead className="bg-[#F6EFDF] text-[12px] font-bold uppercase tracking-[0.06em] text-[#5E4E3E]"><tr><th className="px-2 py-1.5">Campo</th><th className="px-2 py-1.5">Ora</th><th className="px-2 py-1.5">Dopo</th></tr></thead>
            <tbody>{changes.map(change => (
              <tr key={change.campo} className="border-t border-[#DDCFAE] align-top"><td className="px-2 py-1.5 font-semibold">{change.campo}</td><td className="px-2 py-1.5 text-[#5E4E3E]">{change.prima}</td><td className="px-2 py-1.5">{change.dopo}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="mt-2 text-[15px]">Nessun campo cambia.</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 flex-1 rounded-full border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 text-[15px] font-bold">Annulla</button>
        <button type="button" onClick={onOverwrite} disabled={busy} className="min-h-11 flex-1 rounded-full bg-[#7A1F2B] px-4 text-[15px] font-bold text-[#FFFBF0]">{busy ? "Salvataggio…" : "Sovrascrivi"}</button>
      </div>
    </section>
  );
}

/**
 * «Importa mostro» (PROMPT 44): paste the JSON of a draft, «Controlla» lists every problem without saving, the preview
 * shows the card as on the site (hidden sections marked), «Salva» creates it «Dalla redazione», 2014 and 2024, hidden
 * from the public. An existing card is overwritten only after «Sovrascrivi».
 */
export function MonsterImport() {
  const [json, setJson] = useState("");
  const [checked, setChecked] = useState<{ json: string; result: ImportCheckResult } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; nome: string; changes: FieldChange[] } | null>(null);
  const [saved, setSaved] = useState<{ id: string; nome: string; created: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = checked?.json === json ? checked.result : null;
  const ok = !!current && current.errori.length === 0;
  // The preview is drawn here with the same rules the server used.
  const preview = useMemo(() => {
    if (!ok) return null;
    const result = checkImport(json);
    if (!result.draft || !result.id) return null;
    return { monster: { ...draftToMonster(result.draft, result.id), homebrew_edizione: "entrambe" as const, homebrew_autore: null, homebrew_licenza: HOMEBREW_LICENSE, fonte_scheda: "Homebrew" as const }, hidden: result.draft.sezioni_nascoste ?? [] };
  }, [ok, json]);

  async function check() {
    setBusy(true); setError(""); setSaved(null); setConfirm(null);
    try {
      setChecked({ json, result: await checkImportAction(json) });
    } catch {
      setError("Controllo non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }
  async function save(overwrite?: string) {
    setBusy(true); setError("");
    try {
      const result = await saveImportAction(json, overwrite);
      if (result.ok) {
        setSaved({ id: result.id, nome: preview?.monster.nome ?? "", created: result.created });
        setConfirm(null);
      } else if ("confirm" in result) setConfirm(result.confirm);
      else setChecked({ json, result: { errori: result.errori, avvisi: result.avvisi ?? [] } });
    } catch {
      setError("Salvataggio non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-4" data-monster-import="">
      <Link href="/admin/mostri" prefetch={false} className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#7A1F2B]">‹ Mostri</Link>
      <header>
        <h1 className="font-serif text-[30px] font-bold leading-tight">Importa mostro</h1>
        <p className="mt-1 text-[15px] leading-6 text-[#5E4E3E]">
          Incolla il JSON della bozza (un oggetto, o un elenco con un oggetto). «Controlla» non salva nulla; «Salva» crea il mostro
          «Dalla redazione», per 2014 e 2024, <b>nascosto al pubblico</b>: lo mostri tu con l’occhio. Nei testi sono ammessi solo
          &lt;strong&gt;, &lt;em&gt; e &lt;br&gt;; l’immagine si carica dopo, dall’editor.
        </p>
      </header>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor="import-json" className="flex items-center gap-2 text-sm font-semibold"><FileJson size={16} aria-hidden="true" />JSON del mostro</label>
          {!json && <button type="button" onClick={() => setJson(IMPORT_EXAMPLE)} className="min-h-11 px-2 text-[14px] font-semibold text-[#7A1F2B] underline underline-offset-2">Inserisci un esempio</button>}
        </div>
        <textarea id="import-json" value={json} onChange={event => { setJson(event.target.value); setSaved(null); setConfirm(null); }} rows={14} spellCheck={false}
          className="block w-full rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] p-3 font-mono text-[13px] leading-5 outline-none focus:border-[#7A1F2B]" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void check()} disabled={busy || !json.trim()} className="min-h-12 flex-1 rounded-full border-[1.5px] border-[#7A1F2B] bg-[#FFFBF0] px-4 text-[16px] font-bold text-[#7A1F2B] disabled:opacity-50">
          {busy && !ok ? "Controllo…" : "Controlla"}
        </button>
        <button type="button" onClick={() => void save()} disabled={busy || !ok || !!saved} className="min-h-12 flex-1 rounded-full bg-[#7A1F2B] px-4 text-[16px] font-bold text-[#FFFBF0] disabled:opacity-50">
          {busy && ok ? "Salvataggio…" : "Salva"}
        </button>
      </div>
      {checked && checked.json !== json && <p className="text-[14px] text-[#5E4E3E]">Il testo è cambiato: premi di nuovo «Controlla».</p>}
      {error && <p role="alert" className="text-[15px] font-semibold text-[#7A1F2B]">{error}</p>}

      {current && <Issues title={`${current.errori.length} ${current.errori.length === 1 ? "errore" : "errori"}: niente è stato salvato`} list={current.errori} tone="error" />}
      {current && <Issues title="Avvisi (non bloccano il salvataggio)" list={current.avvisi} tone="warn" />}
      {ok && !saved && current?.existing && !confirm && (
        <p className="rounded-[14px] border border-[#DDCFAE] bg-[#FFFBF0] p-3 text-[15px]" data-import-existing="">
          Esiste già «{current.existing.nome}»{current.existing.ours ? ": «Salva» ti chiederà se sovrascriverla." : " dei mostri della community: cambia nome o id."}
        </p>
      )}
      {confirm && <Changes nome={confirm.nome} changes={confirm.changes} busy={busy} onCancel={() => setConfirm(null)} onOverwrite={() => void save(confirm.id)} />}
      {saved && (
        <section role="status" data-import-saved={saved.id} className="rounded-[14px] border-[1.5px] border-[#1F6B45] bg-[#E3F1E8] p-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-[#1F6B45]"><CheckCircle2 size={20} aria-hidden="true" />{saved.created ? "Salvato, nascosto al pubblico" : "Sovrascritto"}</h2>
          <p className="mt-1 text-[15px]">{saved.created ? "Quando è pronto, rendilo visibile con l’occhio nella lista dei mostri o nell’editor." : "Immagine e visibilità sono rimaste quelle di prima."}</p>
          <div className="mt-3 flex gap-2">
            <Link href={`/admin/mostri/${saved.id}`} prefetch={false} className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#7A1F2B] px-4 text-[15px] font-bold text-[#FFFBF0]">Modifica</Link>
            <Link href={`/mostro/${saved.id}`} prefetch={false} className="flex min-h-11 flex-1 items-center justify-center rounded-full border-[1.5px] border-[#7A1F2B] px-4 text-[15px] font-bold text-[#7A1F2B]">Vedi scheda</Link>
          </div>
        </section>
      )}
      {preview && (
        <section aria-label="Anteprima della scheda" data-import-preview="">
          <h2 className="mb-2 font-serif text-xl font-bold">Anteprima</h2>
          <div className="overflow-hidden rounded-xl border border-[#7A1F2B]/20 bg-background">
            <HomebrewSheet monster={preview.monster} hiddenSections={preview.hidden} />
          </div>
        </section>
      )}
    </main>
  );
}
