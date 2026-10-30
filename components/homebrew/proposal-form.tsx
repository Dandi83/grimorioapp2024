"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Eye, PenLine, Pencil } from "lucide-react";

import { MIN_FILL_MS } from "@/lib/feedback-input";
import { EMPTY_DRAFT, HOMEBREW_LICENSE, HOMEBREW_LICENSE_URL, LIMITS, parseProposal, type HomebrewDraft } from "@/lib/homebrew-types";
import { HomebrewEditor, type EditorStep } from "./homebrew-editor";
import { FormUnavailable } from "@/components/feedback/form-unavailable";
import { queueUse } from "@/components/statistics/use-report-search";

const OFFLINE = "Invio non riuscito: sei offline o la connessione non risponde. La scheda è ancora qui: riprova quando torni online.";
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const inputClass = "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";

/** The four steps of «Proponi un mostro» (PROMPT 13). */
export const STEPS = ["Identità", "Difese e sensi", "Azioni", "Invio"] as const;
type Step = 1 | 2 | 3 | 4;
/** The draft kept on this device until it is sent (never the email): name, sheet, choices and step. */
export const DRAFT_KEY = "grimorio.proposta-bozza";
type SavedDraft = { draft: HomebrewDraft; nickname: string; originale: boolean; autorizza: boolean; step: Step };

function readSaved(): SavedDraft | null {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as SavedDraft | null;
    return saved && typeof saved === "object" && saved.draft ? { ...saved, draft: { ...EMPTY_DRAFT, ...saved.draft } } : null;
  } catch { return null; }
}

/**
 * «Proponi una creatura»: no account. The same protections as «Segnala» (signed time stamp, invisible
 * honeypot, Turnstile when configured, limits on the server). Nothing is published: the administrator decides.
 */
export function ProposalForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [draft, setDraft] = useState<HomebrewDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState<Step>(1);
  const [preview, setPreview] = useState(false);
  const [restored, setRestored] = useState(false);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [originale, setOriginale] = useState(false);
  const [autorizza, setAutorizza] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // The server answers 503 while its form secret is missing: no form, nothing sent.
  const [unavailable, setUnavailable] = useState(false);
  const token = useRef<{ value: string; at: number } | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const turnstile = useRef<{ token: string; id?: string }>({ token: "" });
  const turnstileBox = useRef<HTMLDivElement>(null);

  async function fetchToken() {
    const response = await fetch("/api/proposte", { cache: "no-store" });
    if (response.status === 503) setUnavailable(true);
    if (!response.ok) throw new Error(String(response.status));
    token.current = { value: ((await response.json()) as { token: string }).token, at: Date.now() };
  }

  useEffect(() => {
    fetchToken().catch(() => undefined);
    // «Proponi il tuo» opened (PROMPT 32): the name only, sent with the next event.
    queueUse("proposal_start");
  }, []);

  // The draft saved on this device: back after a reload or another visit, until it is sent.
  useEffect(() => {
    const saved = readSaved();
    /* eslint-disable react-hooks/set-state-in-effect -- read once from the device after the first render */
    if (saved) {
      setDraft(saved.draft); setNickname(saved.nickname || ""); setOriginale(!!saved.originale); setAutorizza(!!saved.autorizza);
      setStep([1, 2, 3, 4].includes(saved.step) ? saved.step : 1);
    }
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!restored || sent) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, nickname, originale, autorizza, step } satisfies SavedDraft)); } catch {}
  }, [restored, sent, draft, nickname, originale, autorizza, step]);

  function go(next: Step) {
    setError("");
    setPreview(false);
    setStep(next);
    window.scrollTo(0, 0);
  }
  function forward() {
    if (step === 1 && !draft.nome.trim()) { setError("Scrivi il nome della creatura."); return; }
    go((step + 1) as Step);
  }

  useEffect(() => {
    if (!turnstileSiteKey) return;
    // The widget lives in the last step: drawn again each time the step opens.
    if (step !== 4) { turnstile.current = { token: "" }; return; }
    const render = () => {
      if (!window.turnstile || !turnstileBox.current || turnstile.current.id) return;
      turnstile.current.id = window.turnstile.render(turnstileBox.current, {
        sitekey: turnstileSiteKey,
        callback: (value: string) => { turnstile.current.token = value; },
        "expired-callback": () => { turnstile.current.token = ""; },
      });
    };
    if (window.turnstile) render();
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
  }, [turnstileSiteKey, step]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const body = { scheda: draft, nickname, email: email.trim() || null, originale, autorizza, licenza: autorizza ? HOMEBREW_LICENSE : null };
    const checked = parseProposal(body);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setSending(true);
    try {
      if (!token.current) await fetchToken();
      const elapsed = Date.now() - token.current!.at;
      if (elapsed < MIN_FILL_MS + 300) await wait(MIN_FILL_MS + 300 - elapsed);
      const send = () => fetch("/api/proposte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token: token.current!.value, sito: honeypot.current?.value ?? "", turnstile: turnstile.current.token }),
      });
      let response = await send();
      let result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; retry?: boolean };
      if (!response.ok && result.retry) {
        await fetchToken();
        await wait(MIN_FILL_MS + 300);
        response = await send();
        result = (await response.json().catch(() => ({}))) as typeof result;
      }
      if (response.ok && result.ok) {
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        queueUse("proposal_sent");
        setSent(true);
        window.scrollTo(0, 0);
      } else if (response.status === 503) {
        setUnavailable(true);
      } else {
        setError(result.error ?? "Invio non riuscito. Riprova tra poco.");
        if (turnstile.current.id) { window.turnstile?.reset(turnstile.current.id); turnstile.current.token = ""; }
      }
    } catch {
      setError(OFFLINE);
    } finally {
      setSending(false);
    }
  }

  if (unavailable) return <FormUnavailable back="/bestiario" backLabel="Torna al Bestiario" />;

  if (sent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 px-4 text-center" role="status">
        <Check size={42} strokeWidth={2.4} className="text-primary" aria-hidden="true" />
        <p className="font-serif text-2xl font-bold">Grazie! L’amministratore la guarderà presto.</p>
        <p className="text-[15px] text-muted">Se viene approvata, comparirà tra «I mostri creati da voi», con il tuo nome.</p>
        <Link href="/bestiario" className="mt-2 inline-flex min-h-11 items-center rounded-[8px] bg-primary px-5 text-[15px] font-bold text-primary-foreground">Torna al Bestiario</Link>
      </div>
    );
  }

  const summary: [string, string][] = [
    ["Nome", draft.nome || "—"], ["Edizione", draft.edizione === "entrambe" ? "2014 e 2024" : draft.edizione],
    ["Taglia e tipo", `${draft.taglia} · ${draft.tipo}`], ["Grado di sfida", draft.grado_sfida],
    ["CA e PF", `${Number.isFinite(draft.ca) ? draft.ca : "—"} · ${Number.isFinite(draft.pf) ? draft.pf : "—"}`],
    ["Azioni", String(draft.azioni.filter(entry => entry.nome.trim() || entry.testo.trim()).length)],
  ];
  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-proposal-step={step}>
      {/* Four segments: the steps done and the current one in bordeaux. */}
      <div>
        <ol className="grid grid-cols-4 gap-1.5" aria-label={`Passo ${step} di 4: ${STEPS[step - 1]}`} data-progress="">
          {STEPS.map((label, index) => (
            <li key={label} className={`h-1.5 rounded-full ${index < step ? "bg-[#7A1F2B]" : "bg-[#DDCFAE]"}`} data-progress-done={index < step ? "" : undefined}><span className="sr-only">{label}</span></li>
          ))}
        </ol>
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
          {step > 1 ? (
            <button type="button" onClick={() => go((step - 1) as Step)} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-[15px] font-bold text-primary" data-step-back="">
              <ChevronLeft size={18} aria-hidden="true" />{STEPS[step - 2]}
            </button>
          ) : <span />}
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Passo {step} di 4 · {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Step 2 (PROMPT 19): how the sheet will be checked, before the defences that weigh on it. */}
      {step === 2 && (
        <p className="text-[14px] leading-6 text-muted" data-method-link="form">
          Prima di pubblicarla mettiamo alla prova la creatura contro i mostri ufficiali del suo GS.{" "}
          <Link href="/bestiario/creati-da-voi/bilanciamento" className="font-semibold text-primary underline underline-offset-2">Come valutiamo il bilanciamento ›</Link>
        </p>
      )}
      {step < 4 && <HomebrewEditor value={draft} onChange={setDraft} step={step as EditorStep} preview={preview} />}
      {step === 4 && preview && <HomebrewEditor value={draft} onChange={setDraft} step={3} preview />}

      {step === 4 && !preview && <>
      <section className="rounded-[14px] border-[1.5px] border-border bg-card p-4" data-proposal-summary="">
        <h2 className="font-serif text-xl font-bold text-primary">Riepilogo</h2>
        <dl className="mt-2 divide-y divide-border text-[15px]">
          {summary.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 py-2"><dt className="text-muted">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>
          ))}
        </dl>
        <button type="button" onClick={() => go(1)} className="mt-2 flex min-h-11 items-center gap-2 text-[15px] font-semibold text-primary">
          <Pencil size={16} aria-hidden="true" />Modifica la scheda
        </button>
      </section>
      <section className="rounded-[14px] border-[1.5px] border-border bg-card p-4">
        <h2 className="font-serif text-xl font-bold text-primary">Chi la propone</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="proposta-nickname" className="mb-1.5 block text-sm font-semibold">Nickname *</label>
            <input id="proposta-nickname" value={nickname} maxLength={LIMITS.nickname} onChange={event => setNickname(event.target.value)} className={inputClass} autoComplete="nickname" />
            <p className="mt-1 text-[13px] text-muted">Comparirà sulla scheda: «Proposta da …».</p>
          </div>
          <div>
            <label htmlFor="proposta-email" className="mb-1.5 block text-sm font-semibold">Email (facoltativa)</label>
            <input id="proposta-email" type="email" value={email} maxLength={254} onChange={event => setEmail(event.target.value)} className={inputClass} autoComplete="email" />
            <p className="mt-1 text-[13px] text-muted">Non viene mai mostrata. Serve solo per avvisarti quando la creatura viene pubblicata, poi viene cancellata.</p>
          </div>
          <label className="flex min-h-11 items-start gap-3 text-[15px] leading-6">
            <input type="checkbox" checked={originale} onChange={event => setOriginale(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[#7A1F2B]" />
            È una mia creazione originale, non copiata da manuali o siti.
          </label>
          <label className="flex min-h-11 items-start gap-3 text-[15px] leading-6">
            <input type="checkbox" checked={autorizza} onChange={event => setAutorizza(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[#7A1F2B]" />
            <span>
              {/* New tabs: the form being filled is not lost. */}
              Pubblico la creatura con licenza{" "}
              <a href={HOMEBREW_LICENSE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">{HOMEBREW_LICENSE}</a>{" "}
              e autorizzo Il Grimorio.App a pubblicarla e a modificarla, come spiegato nei{" "}
              <a href="/termini" target="_blank" rel="noopener" className="font-semibold text-primary underline underline-offset-4">Termini d’uso</a>.
            </span>
          </label>
        </div>
      </section>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Sito web <input ref={honeypot} type="text" name="sito" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {turnstileSiteKey && <div ref={turnstileBox} />}
      <p className="text-center text-[13px] text-muted">Niente viene pubblicato subito: controlliamo ogni proposta prima di pubblicarla.</p>
      </>}

      {error && <p role="alert" className="rounded-[10px] border border-primary/40 bg-card px-4 py-3 text-[15px] font-semibold text-primary">{error}</p>}

      {/* Fixed at the bottom, above the navigation bar: the preview of the sheet and the next step (or the sending). */}
      <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-30 -mx-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0" data-proposal-bar="">
        <button type="button" onClick={() => { setPreview(open => !open); window.scrollTo(0, 0); }} aria-pressed={preview} data-proposal-preview=""
          className="flex min-h-12 items-center gap-2 rounded-[8px] border border-border bg-card px-4 text-[15px] font-semibold">
          {preview ? <Pencil size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{preview ? "Modulo" : "Anteprima"}
        </button>
        {step < 4 ? (
          <button type="button" onClick={forward} data-proposal-next="" className="flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-[8px] bg-primary px-4 text-base font-bold text-primary-foreground">
            <span className="truncate">Avanti: {STEPS[step as 1 | 2 | 3]}</span><ChevronRight size={18} aria-hidden="true" className="shrink-0" />
          </button>
        ) : (
          <button type="submit" disabled={sending} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-base font-bold text-primary-foreground disabled:opacity-60">
            <PenLine size={17} aria-hidden="true" />{sending ? "Invio…" : "Invia la proposta"}
          </button>
        )}
      </div>
    </form>
  );
}
