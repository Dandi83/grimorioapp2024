"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, FileSearch, Pencil, X } from "lucide-react";

import { approveProposalAction, correctProposalAction, createHomebrewAction, refuseProposalAction, updateHomebrewAction } from "@/app/actions/admin-homebrew";
import { setPartVisibilityAction } from "@/app/actions/admin-sections";
import { BADGE_SYNC_EVENT } from "@/lib/app-badge";
import { EMPTY_DRAFT, parseDraft, type HomebrewDraft } from "@/lib/homebrew-types";
import { HomebrewEditor } from "./homebrew-editor";
import { useEditorFrame } from "../admin-editor-frame";

/**
 * «I mostri creati da voi · Visibile al pubblico»: the same switch as the collection in /admin/sezioni. switchedOff: the
 * switch of lib/community.ts keeps it hidden from the visitors whatever this eye says (on with a new deploy).
 */
export function HomebrewSectionEye({ hidden: initial, switchedOff = false }: { hidden: boolean; switchedOff?: boolean }) {
  const [hidden, setHidden] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toggle = () => start(async () => {
    setError("");
    const result = await setPartVisibilityAction("bestiario:homebrew", !hidden).catch(() => ({ ok: false as const, error: "Salvataggio non riuscito." }));
    if (result.ok) setHidden(result.hidden); else setError(result.error);
  });
  return (
    <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-border bg-card px-3.5 py-2.5" data-homebrew-section="">
      <div className="min-w-0 flex-1">
        <p className="font-serif text-xl font-bold text-primary">I mostri creati da voi</p>
        <p className="text-[13px] text-muted">{switchedOff
          ? "Spenta dall’interruttore: i visitatori non vedono card, sezione, modulo, schede e ricerca. La vedi solo tu, con «Nascosta»; si accende con una nuova pubblicazione del sito."
          : hidden ? "Nascosta al pubblico: card, sezione, schede, modulo e ricerca. La vedi solo tu." : "Visibile al pubblico"}</p>
        {error && <p role="alert" className="text-[13px] font-semibold text-primary">{error}</p>}
      </div>
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={hidden}
        aria-label={hidden ? "Mostra «I mostri creati da voi» al pubblico" : "Nascondi «I mostri creati da voi» al pubblico"}
        className={`grid size-11 shrink-0 place-items-center rounded-md ${hidden ? "text-primary" : "text-muted"}`}>
        {hidden ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

/**
 * The guided editor in a dialog: «Correggi» of a proposal, «+ Nuova homebrew», «Modifica» of a published
 * homebrew. page: the editor is the page («Modifica» on the public card), not a dialog over the list.
 */
/** The saved verdict and the pill of a published homebrew, for the box of the editor (PROMPT 26). */
export type VerifiedBox = { saved: "in linea" | "da controllare" | "fuori" | null; shown: boolean };
const SAVED_LABEL = { "in linea": "In linea", "da controllare": "Da controllare", fuori: "Fuori dal GS" } as const;

function HomebrewEditorDialog({ title, initial, onSave, onClose, page = false, ours = false, verifiedBox }: {
  title: string;
  /**
   * The box «Mostra "Bilanciamento verificato"»: enabled only with the saved verdict «In linea» (for «2014 e 2024», in
   * line in both editions); a new creature has none yet. Absent: no box (the proposals have their own).
   */
  verifiedBox?: VerifiedBox | "new";
  /** «Dalla redazione» (no author): the pill of the preview. */
  ours?: boolean;
  initial: HomebrewDraft;
  onSave: (draft: HomebrewDraft, verified: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** saved: true after a successful save. */
  onClose: (saved?: boolean) => void;
  page?: boolean;
}) {
  const { dialog, heading, frame, header } = useEditorFrame(page);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canVerify = typeof verifiedBox === "object" && verifiedBox.saved === "in linea";
  const [verified, setVerified] = useState(typeof verifiedBox === "object" && verifiedBox.shown);
  async function save() {
    const checked = parseDraft(draft);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setSaving(true);
    setError("");
    const result = await onSave(checked.draft, canVerify && verified).catch(() => ({ ok: false as const, error: "Salvataggio non riuscito. Riprova." }));
    setSaving(false);
    if (result.ok) onClose(true); else setError(result.error);
  }
  return (
    <dialog ref={dialog} open={page || undefined} aria-label={title} onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
      className={`${frame} bg-background`}>
      <header className={`${header} flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3`}>
        <h2 ref={heading} tabIndex={-1} className="font-serif text-2xl outline-none">{title}</h2>
        <button type="button" onClick={() => onClose()} disabled={saving} aria-label="Chiudi editor" className="grid size-11 place-items-center rounded-lg text-muted"><X className="h-5 w-5" aria-hidden="true" /></button>
      </header>
      <div className="p-4"><HomebrewEditor value={draft} onChange={setDraft} idPrefix="admin-hb" ours={ours} /></div>
      <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-4 py-3">
        {verifiedBox && (
          <label className="mb-2 flex min-h-11 items-center gap-2.5 text-[14px]" data-editor-verified={typeof verifiedBox === "object" ? verifiedBox.saved ?? "non-simulabile" : "nuova"}>
            <input type="checkbox" className="size-5 accent-[#1F6B45]" checked={canVerify && verified} disabled={!canVerify || saving} onChange={event => setVerified(event.target.checked)} />
            <span>Mostra «Bilanciamento verificato» <span className="text-muted">· {verifiedBox === "new"
              ? "attivabile dopo il salvataggio, se il giudizio è «In linea»"
              : `giudizio salvato: ${verifiedBox.saved ? SAVED_LABEL[verifiedBox.saved] : "nessuno (premi «Ricalcola» in /admin/bilanciamento)"}`}</span></span>
          </label>
        )}
        {error && <p role="alert" className="mb-2 text-sm font-semibold text-primary">{error}</p>}
        <button type="button" onClick={save} disabled={saving} className="min-h-11 w-full rounded-lg bg-primary px-3 text-[15px] font-bold text-primary-foreground disabled:opacity-60">
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </footer>
    </dialog>
  );
}

export interface ProposalCardData {
  id: string;
  nome: string;
  nickname: string;
  quando: string;
  edizione: string;
  gs: string;
  esito: { label: string; tone: "ok" | "warn" } | null;
  formato?: "2024" | "2014";
  simile?: string;
  email: boolean;
  stato: "da-vedere" | "approvata" | "rifiutata";
  motivo?: string | null;
  homebrewId?: string | null;
  /** The licence accepted with the form; null: sent before it, not to be published without the author's consent. */
  licenza: string | null;
  /** Arrived over the hourly ceiling of the site: saved without a notice. */
  picco?: boolean;
  draft: HomebrewDraft;
  /** «Da vedere»: the verdict of the Bilanciamento now (null: nothing to simulate). */
  bilanciamento?: "in linea" | "da controllare" | "fuori" | null;
}

const NOTICE_EVENT = "grimorio:proposte-avviso";

/** The outcome of «Approva» and «Rifiuta», above the list (the card itself moves to another tab). */
export function ProposalsNotice() {
  const [text, setText] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (event: Event) => {
      setText(String((event as CustomEvent).detail ?? ""));
      clearTimeout(timer);
      timer = setTimeout(() => setText(""), 8000);
    };
    window.addEventListener(NOTICE_EVENT, show);
    return () => { window.removeEventListener(NOTICE_EVENT, show); clearTimeout(timer); };
  }, []);
  return text ? <p role="status" className="rounded-[12px] bg-[#2B2118] px-4 py-3 text-[15px] font-semibold text-[#FFFBF0]">{text}</p> : null;
}

const pill = "inline-flex min-h-6 items-center rounded-full border px-2 text-[12px] font-semibold leading-4";

/** A proposal: name, author and time, the pills of the checks, and the four buttons (44 px). */
export function ProposalCard({ data }: { data: ProposalCardData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [motivo, setMotivo] = useState("");
  // «Mostra "Bilanciamento verificato"»: ticked by default only with the verdict «In linea» (PROMPT 19).
  const [verified, setVerified] = useState(data.bilanciamento === "in linea");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  // The page refreshes after the action and the card leaves this tab: the outcome is told by the page notice.
  const done = (text: string) => {
    window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: text }));
    window.dispatchEvent(new Event(BADGE_SYNC_EVENT));
    router.refresh();
  };
  const approve = () => start(async () => {
    const result = await approveProposalAction(data.id, verified);
    if (!result.ok) return setMessage(result.error);
    done(result.email === "sent" ? "Pubblicata. Avviso inviato all’autore." : result.email === "not-configured" ? "Pubblicata. Email non configurata: nessun avviso inviato." : result.email === "failed" ? "Pubblicata. L’avviso email non è partito." : "Pubblicata.");
  });
  const refuse = () => start(async () => {
    const result = await refuseProposalAction(data.id, motivo);
    if (!result.ok) return setMessage(result.error);
    setRefusing(false);
    done("Rifiutata. Niente è stato pubblicato.");
  });
  return (
    <li className="rounded-[14px] border-[1.5px] border-border bg-card p-3.5" data-proposal={data.id}>
      <p className="break-words font-serif text-xl font-bold text-foreground">{data.nome}</p>
      <p className="text-[13px] text-muted">di {data.nickname} · {data.quando}</p>
      {data.picco && <p className="text-[12px] font-bold text-primary" data-picco="">Arrivata durante un picco (senza notifica)</p>}
      <p className="text-[13px] text-muted" data-proposal-license={data.licenza ?? ""}>{data.licenza ? `Licenza accettata: ${data.licenza}` : "Licenza non indicata"}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`${pill} border-border bg-background`}>{data.edizione} · GS {data.gs}</span>
        {data.esito && <span className={`${pill} ${data.esito.tone === "ok" ? "border-[#2D4C7A]/40 bg-[#E8EEF7] text-[#1E3557]" : "border-[#E0A21A] bg-[#F6E3B0] text-[#5C3F00]"}`}>{data.esito.label}</span>}
        {data.formato && <span className={`${pill} border-[#2D4C7A]/40 bg-[#E8EEF7] text-[#1E3557]`}>Formato {data.formato} rilevato</span>}
        {data.simile && <span className={`${pill} border-primary/40 bg-primary-faint text-primary`} title={`Somiglia a «${data.simile}»`}>Nome simile a una creatura del catalogo</span>}
        {data.email && <span className={`${pill} border-border bg-background`}>Email lasciata</span>}
        {!data.licenza && data.stato !== "rifiutata" && <span className={`${pill} border-[#E0A21A] bg-[#F6E3B0] text-[#5C3F00]`}>Chiedere il consenso alla licenza</span>}
      </div>
      {data.stato === "rifiutata" && data.motivo && <p className="mt-2 text-[13px] text-muted">Motivo: {data.motivo}</p>}
      {data.stato === "da-vedere" && (
        <label className="mt-3 flex min-h-11 items-center gap-2.5 text-[14px]" data-verified-box={data.bilanciamento ?? "non-simulabile"}>
          <input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} className="size-5 accent-[#1F6B45]" />
          <span>Mostra «Bilanciamento verificato» <span className="text-muted">· giudizio: {data.bilanciamento === "in linea" ? "In linea" : data.bilanciamento === "da controllare" ? "Da controllare" : data.bilanciamento === "fuori" ? "Fuori dal GS" : "non simulabile"}{data.bilanciamento !== "in linea" && " (la pillola compare solo se «In linea»)"}</span></span>
        </label>
      )}
      {data.stato === "da-vedere" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href={`/admin/proposte/${data.id}`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] border border-border text-[14px] font-semibold"><FileSearch size={16} aria-hidden="true" />Anteprima</Link>
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] border border-border text-[14px] font-semibold"><Pencil size={16} aria-hidden="true" />Correggi</button>
          <button type="button" onClick={approve} disabled={pending || !data.licenza} title={data.licenza ? undefined : "Prima serve il consenso dell’autore alla licenza"} className="flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-60"><Check size={16} aria-hidden="true" />Approva</button>
          <button type="button" onClick={() => setRefusing(open => !open)} disabled={pending} aria-expanded={refusing} className="flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] border border-primary/50 text-[14px] font-semibold text-primary"><X size={16} aria-hidden="true" />Rifiuta</button>
        </div>
      ) : data.homebrewId ? (
        <Link href={`/mostro/${data.homebrewId}`} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-bold text-primary underline underline-offset-4">Apri la scheda pubblicata</Link>
      ) : null}
      {refusing && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`motivo-${data.id}`} className="block text-sm font-semibold">Motivo (facoltativo, resta solo qui)</label>
          <textarea id={`motivo-${data.id}`} value={motivo} maxLength={500} onChange={event => setMotivo(event.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
          <button type="button" onClick={refuse} disabled={pending} className="min-h-11 w-full rounded-[8px] bg-foreground text-[14px] font-bold text-background disabled:opacity-60">Conferma il rifiuto</button>
        </div>
      )}
      {message && <p role="status" className="mt-2 text-[14px] font-semibold text-primary">{message}</p>}
      {editing && (
        <HomebrewEditorDialog title={`Correggi «${data.nome}»`} initial={data.draft} onClose={() => setEditing(false)}
          onSave={async draft => { const result = await correctProposalAction(data.id, draft); if (result.ok) router.refresh(); return result; }} />
      )}
    </li>
  );
}

/** «+ Nuova homebrew» of /admin/mostri: the same editor, published at once «del Grimorio». */
export function NewHomebrewButton({ edition }: { edition: "2014" | "2024" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#E0A21A] bg-[#F6E3B0] px-4 py-2.5 font-semibold text-[#5C3F00]">
        + Nuovo «Dalla redazione»
      </button>
      {open && <HomebrewEditorDialog ours verifiedBox="new" title="Nuovo «Dalla redazione»" initial={{ ...EMPTY_DRAFT, edizione: edition }} onClose={() => setOpen(false)}
        onSave={async draft => { const result = await createHomebrewAction(draft); if (result.ok) router.refresh(); return result; }} />}
    </>
  );
}

/** «+» of /admin/mostri, «Homebrew»: the guided editor of a new homebrew creature, already open. */
export function NewHomebrewDialog({ edition, onClose }: { edition: "2014" | "2024"; onClose: () => void }) {
  const router = useRouter();
  return <HomebrewEditorDialog ours verifiedBox="new" title="Nuovo «Dalla redazione»" initial={{ ...EMPTY_DRAFT, edizione: edition }} onClose={onClose}
    onSave={async draft => { const result = await createHomebrewAction(draft); if (result.ok) router.refresh(); return result; }} />;
}

/** «Modifica» of a published homebrew in /admin/mostri. */
export function EditHomebrewDialog({ id, nome, draft, ours = false, verifiedBox, onClose, page }: {
  id: string; nome: string; draft: HomebrewDraft; ours?: boolean; verifiedBox?: VerifiedBox; onClose: (saved?: boolean) => void; page?: boolean;
}) {
  const router = useRouter();
  return <HomebrewEditorDialog title={`Modifica «${nome}»`} initial={draft} onClose={onClose} page={page} ours={ours} verifiedBox={verifiedBox}
    onSave={async (next, verified) => { const result = await updateHomebrewAction(id, next, verifiedBox ? verified : undefined); if (result.ok) router.refresh(); return result; }} />;
}
