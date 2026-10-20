"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics-client";

export function ShareButton({ path, title, inline = false }: { path: string; title: string; inline?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const shareUrl = new URL(path, "https://ilgrimorio.app");
  shareUrl.searchParams.set("ref", "share");
  const url = shareUrl.href;

  useEffect(() => {
    if (manualCopy) { input.current?.focus(); input.current?.select(); }
  }, [manualCopy]);

  async function share() {
    if (busy) return;
    setBusy(true); setMessage(""); setManualCopy(false);
    trackAnalytics("share_click");
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `${title} — Il Grimorio.App`, url });
          trackAnalytics("share_native");
          return;
        } catch (error) {
          if ((error as { name?: string })?.name === "AbortError") {trackAnalytics("share_cancel");return;}
        }
      }
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(url);
        trackAnalytics("share_copy");
        setMessage("Link copiato! Puoi incollarlo e condividerlo.");
      } catch {
        setManualCopy(true);
      }
    } finally { setBusy(false); }
  }

  return <>
    <button ref={button} type="button" onClick={share} disabled={busy}
      aria-label={`Condividi ${title}`} title="Condividi scheda"
      className={inline ? "flex size-11 items-center justify-center text-primary transition-transform focus-visible:outline-2 focus-visible:outline-primary active:scale-90 disabled:opacity-50" : "absolute right-16 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-elevated text-foreground transition-transform hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-90 disabled:opacity-50"}>
      <Share2 size={20} aria-hidden="true" />
    </button>
    <p role="status" aria-live="polite" className={message ? "absolute right-4 top-16 z-40 max-w-[calc(100%-2rem)] rounded-xl border border-primary/30 bg-card px-3 py-2 text-sm text-primary shadow-lg" : "sr-only"}>{message}</p>
    {manualCopy && <div role="group" aria-label="Condividi link" className="absolute inset-x-4 top-16 z-40 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="share-card-link" className="text-sm text-foreground">Copia e condividi il link</label>
        <button type="button" aria-label="Chiudi condivisione" onClick={() => {setManualCopy(false);button.current?.focus();}} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:text-foreground"><X size={18} aria-hidden="true" /></button>
      </div>
      <input ref={input} id="share-card-link" readOnly value={url} onFocus={event => event.currentTarget.select()} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground focus-visible:outline-primary" />
    </div>}
  </>;
}
