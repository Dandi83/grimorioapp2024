"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { FormUnavailable } from "@/components/feedback/form-unavailable";
import {
  CONTESTED_PAGE_ERROR, EMAIL_MAX, FEEDBACK_TYPES, FORM_TYPE_LABELS, MESSAGE_MAX, MIN_FILL_MS, RIGHTS_EMAIL_ERROR, RIGHTS_TYPE,
  cleanContestedPage, cleanEdition, cleanPath, cleanText, messageError, ratingLabel, textLength, validEmail, type FeedbackType,
} from "@/lib/feedback-input";

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

interface About { percorso: string; titolo: string; edizione: "2014" | "2024" | null }

const OFFLINE = "Invio non riuscito: sei offline o la connessione non risponde. Il testo è ancora qui: riprova quando torni online.";

/** The page the report is about, from the «Segnala» link (?pagina=…&titolo=…&edizione=…). */
function readAbout(): About | null {
  const params = new URLSearchParams(window.location.search);
  const percorso = cleanPath(params.get("pagina"));
  if (!percorso) return null;
  const titolo = cleanText(params.get("titolo") ?? "").slice(0, 120);
  return { percorso, titolo: titolo || percorso, edizione: cleanEdition(params.get("edizione")) };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Form «Segnala»: type, page, message, optional email; anonymous, protected by honeypot, time and limits. */
export function ReportForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [tipo, setTipo] = useState<FeedbackType>("errore");
  const [about, setAbout] = useState<About | null>(null);
  const [messaggio, setMessaggio] = useState("");
  /** Rights requests only: the address of the contested page, as the person writes it. */
  const [pagina, setPagina] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{ pagina?: string; messaggio?: string; email?: string }>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // The server answers 503 while its form secret is missing: no form, nothing sent.
  const [unavailable, setUnavailable] = useState(false);
  const token = useRef<{ value: string; at: number } | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const turnstile = useRef<{ token: string; id?: string }>({ token: "" });
  const turnstileBox = useRef<HTMLDivElement>(null);
  const ids = { pagina: useId(), messaggio: useId(), email: useId(), count: useId(), emailNote: useId() };
  const rights = tipo === RIGHTS_TYPE;

  function choose(value: FeedbackType) {
    setTipo(value);
    setFieldError({});
    // The page the person came from is the likely contested one: written out in full, still editable.
    if (value === RIGHTS_TYPE && !pagina && about) setPagina(`${window.location.origin}${about.percorso}`);
  }

  async function fetchToken() {
    const response = await fetch("/api/segnalazioni", { cache: "no-store" });
    if (response.status === 503) setUnavailable(true);
    if (!response.ok) throw new Error(String(response.status));
    const { token: value } = (await response.json()) as { token: string };
    token.current = { value, at: Date.now() };
  }

  /** From the faces of the Home (?tipo=consiglio&valutazione=…): the vote travels as an inner label, never shown. */
  const rating = useRef<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is read once, after hydration
    setAbout(readAbout());
    const params = new URLSearchParams(window.location.search);
    const vote = params.get("valutazione");
    if (ratingLabel(vote)) rating.current = vote;
    if ((FEEDBACK_TYPES as readonly string[]).includes(params.get("tipo") ?? "") && params.get("tipo") !== RIGHTS_TYPE) setTipo(params.get("tipo") as FeedbackType);
    fetchToken().catch(() => undefined);
    const online = () => { if (!token.current) fetchToken().catch(() => undefined); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) return;
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
  }, [turnstileSiteKey]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const text = cleanText(messaggio);
    const address = email.trim();
    const contested = rights ? cleanContestedPage(pagina, window.location.host) : null;
    const problems = {
      pagina: rights && !contested ? CONTESTED_PAGE_ERROR : undefined,
      messaggio: messageError(text) ?? undefined,
      email: address && !validEmail(address)
        ? (rights ? "Email non valida: controllala." : "Email non valida: controllala o lasciala vuota.")
        : rights && !address ? RIGHTS_EMAIL_ERROR : undefined,
    };
    setFieldError(problems);
    if (problems.pagina || problems.messaggio || problems.email) return;
    setSending(true);
    try {
      if (!token.current) await fetchToken();
      // The server accepts a report only a few seconds after the form was opened.
      const elapsed = Date.now() - token.current!.at;
      if (elapsed < MIN_FILL_MS + 300) await wait(MIN_FILL_MS + 300 - elapsed);
      const send = () => fetch("/api/segnalazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo, messaggio: text, email: address || null,
          percorso: rights ? contested : about?.percorso ?? null,
          edizione: !rights || contested === about?.percorso ? about?.edizione ?? null : null,
          token: token.current!.value, sito: honeypot.current?.value ?? "", turnstile: turnstile.current.token,
          ...(rating.current && !rights ? { valutazione: rating.current } : {}),
        }),
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

  if (unavailable) return <FormUnavailable back="/" backLabel="Torna alla Home" />;

  if (sent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 px-4 text-center" role="status">
        <div className="flex size-[84px] items-center justify-center rounded-full border-2 border-amber bg-card">
          <Check size={42} strokeWidth={2.4} className="text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-[32px] font-bold text-primary">Grazie!</h1>
        <p className="max-w-[280px] text-base text-muted">
          {rights ? "Ho ricevuto la tua richiesta di rimozione. Ti risponderò all’email che hai indicato." : "Ho ricevuto la tua segnalazione. La leggerò appena possibile."}
        </p>
        <Link href="/" className="mt-3 inline-flex min-h-12 items-center rounded-3xl border-[1.5px] border-primary px-7 font-bold text-primary">Torna alla Home</Link>
      </div>
    );
  }

  const length = textLength(messaggio.trim());
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <header>
        <h1 className="font-serif text-[32px] font-bold leading-[1.05] text-primary">Segnala</h1>
        <p className="mt-1 text-[15px] text-muted">Hai trovato un errore o manca qualcosa? Scrivimelo, in forma anonima.</p>
      </header>

      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">Di cosa si tratta?</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_TYPES.map(value => (
            <button key={value} type="button" aria-pressed={tipo === value} onClick={() => choose(value)}
              className={`inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] px-4 text-[15px] font-semibold ${tipo === value ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`}>
              {FORM_TYPE_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>

      {rights && (
        <div data-rights-form="">
          <p className="mb-3 text-[15px] leading-6 text-muted">
            Indica la pagina e spiega quali diritti ritieni violati. Il contenuto viene nascosto in attesa di verifica e ricevi una risposta all’email che indichi.
          </p>
          <label htmlFor={ids.pagina} className="mb-1.5 block text-sm font-bold">Indirizzo della pagina contestata</label>
          <input id={ids.pagina} type="text" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} value={pagina}
            onChange={event => setPagina(event.target.value)} required aria-required="true" maxLength={300}
            placeholder="https://ilgrimorio.app/spell/…" aria-invalid={!!fieldError.pagina} aria-describedby={fieldError.pagina ? `${ids.pagina}-e` : undefined}
            className="block min-h-12 w-full rounded-[14px] border-[1.5px] border-border bg-card px-3.5 text-base text-foreground outline-none placeholder:text-[#8a7a66] focus:border-primary" />
          {fieldError.pagina && <p id={`${ids.pagina}-e`} role="alert" className="mt-1 text-[13px] text-primary">{fieldError.pagina}</p>}
        </div>
      )}

      {about && !rights && (
        <div className="flex items-center gap-2 rounded-xl bg-elevated py-1 pl-3 pr-1 text-sm text-muted">
          <span className="min-w-0 flex-1 break-words">Riguarda: <b className="text-foreground">{about.titolo}{about.edizione ? ` (${about.edizione})` : ""}</b></span>
          <button type="button" onClick={() => setAbout(null)} className="min-h-11 shrink-0 px-2 font-bold text-primary">Rimuovi</button>
        </div>
      )}

      <div>
        <label htmlFor={ids.messaggio} className="mb-1.5 block text-sm font-bold">Messaggio</label>
        <textarea id={ids.messaggio} value={messaggio} onChange={event => setMessaggio(event.target.value)} rows={6}
          maxLength={MESSAGE_MAX + 200} required aria-invalid={!!fieldError.messaggio} aria-describedby={`${ids.count}${fieldError.messaggio ? ` ${ids.messaggio}-e` : ""}`}
          className="block min-h-[130px] w-full resize-y rounded-[14px] border-[1.5px] border-border bg-card px-3.5 py-3 text-base text-foreground outline-none focus:border-primary" />
        <div className="mt-1 flex justify-between gap-3 text-[13px]">
          <span id={`${ids.messaggio}-e`} className="text-primary" role={fieldError.messaggio ? "alert" : undefined}>{fieldError.messaggio}</span>
          <span id={ids.count} className={`shrink-0 tabular-nums ${length > MESSAGE_MAX ? "font-bold text-primary" : "text-muted"}`}>{length} / {MESSAGE_MAX}</span>
        </div>
      </div>

      <div>
        <label htmlFor={ids.email} className="mb-1.5 block text-sm font-bold">{rights ? "Email per la risposta (obbligatoria)" : "Email per ricevere risposta (facoltativa)"}</label>
        <input id={ids.email} type="email" inputMode="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)}
          maxLength={EMAIL_MAX} placeholder="nome@esempio.it" required={rights} aria-required={rights} aria-invalid={!!fieldError.email} aria-describedby={`${ids.emailNote}${fieldError.email ? ` ${ids.email}-e` : ""}`}
          className="block min-h-12 w-full rounded-[14px] border-[1.5px] border-border bg-card px-3.5 text-base text-foreground outline-none placeholder:text-[#8a7a66] focus:border-primary" />
        {fieldError.email && <p id={`${ids.email}-e`} role="alert" className="mt-1 text-[13px] text-primary">{fieldError.email}</p>}
        <p id={ids.emailNote} className="mt-1 text-[13px] text-muted">{rights ? "Serve per risponderti. Non verrà mostrata a nessuno." : "Solo se vuoi una risposta. Non verrà mostrata a nessuno."}</p>
      </div>

      {/* Invisible to people: only automatic programs fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Sito web <input ref={honeypot} type="text" name="sito" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {turnstileSiteKey && <div ref={turnstileBox} />}

      {error && <p role="alert" className="rounded-xl border border-primary/40 bg-card px-4 py-3 text-[15px] font-semibold text-primary">{error}</p>}

      <div className="mt-2 flex flex-col gap-2">
        <button type="submit" disabled={sending}
          className="min-h-[52px] rounded-[26px] bg-primary text-[17px] font-bold text-primary-foreground disabled:opacity-60">
          {sending ? "Invio in corso…" : rights ? "Invia la richiesta" : "Invia segnalazione"}
        </button>
        <p className="text-center text-xs text-muted">Nessun account, nessun IP salvato. Protetto da antispam.</p>
      </div>
    </form>
  );
}
