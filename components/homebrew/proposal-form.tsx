"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { MIN_FILL_MS } from "@/lib/feedback-input";
import { EMPTY_DRAFT, HOMEBREW_LICENSE, HOMEBREW_LICENSE_URL, LIMITS, parseProposal, type HomebrewDraft } from "@/lib/homebrew-types";
import { HomebrewEditor } from "./homebrew-editor";

const OFFLINE = "Invio non riuscito: sei offline o la connessione non risponde. La scheda è ancora qui: riprova quando torni online.";
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const inputClass = "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";

/**
 * «Proponi una creatura»: no account. The same protections as «Segnala» (signed time stamp, invisible
 * honeypot, Turnstile when configured, limits on the server). Nothing is published: the administrator decides.
 */
export function ProposalForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [draft, setDraft] = useState<HomebrewDraft>(EMPTY_DRAFT);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [originale, setOriginale] = useState(false);
  const [autorizza, setAutorizza] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const token = useRef<{ value: string; at: number } | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const turnstile = useRef<{ token: string; id?: string }>({ token: "" });
  const turnstileBox = useRef<HTMLDivElement>(null);

  async function fetchToken() {
    const response = await fetch("/api/proposte", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    token.current = { value: ((await response.json()) as { token: string }).token, at: Date.now() };
  }

  useEffect(() => {
    fetchToken().catch(() => undefined);
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
        setSent(true);
        window.scrollTo(0, 0);
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

  if (sent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 px-4 text-center" role="status">
        <Check size={42} strokeWidth={2.4} className="text-primary" aria-hidden="true" />
        <p className="font-serif text-2xl font-bold">Grazie! L’amministratore la guarderà presto.</p>
        <p className="text-[15px] text-muted">Se viene approvata, comparirà nella raccolta Homebrew del Bestiario.</p>
        <Link href="/bestiario" className="mt-2 inline-flex min-h-11 items-center rounded-[8px] bg-primary px-5 text-[15px] font-bold text-primary-foreground">Torna al Bestiario</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <HomebrewEditor value={draft} onChange={setDraft} />
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
      {error && <p role="alert" className="rounded-[10px] border border-primary/40 bg-card px-4 py-3 text-[15px] font-semibold text-primary">{error}</p>}
      <button type="submit" disabled={sending} className="min-h-12 w-full rounded-[8px] bg-primary px-4 text-base font-bold text-primary-foreground disabled:opacity-60">
        {sending ? "Invio…" : "Invia la proposta"}
      </button>
      <p className="text-center text-[13px] text-muted">Niente viene pubblicato subito: l’amministratore guarda ogni proposta.</p>
    </form>
  );
}
