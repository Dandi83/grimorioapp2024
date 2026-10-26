"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Download } from "lucide-react";

import { copyLink, promptInstall, useDeviceAdvice, useInstallEvent } from "@/components/install/install-events";

/** /installa: the advice for the browser in use, above the list of every browser. Drawn in the browser. */
export function InstallHere() {
  const event = useInstallEvent();
  const state = useDeviceAdvice();
  const [copied, setCopied] = useState(false);

  if (!state) return <div className="mt-5 min-h-[136px] rounded-[16px] border border-border bg-card" aria-hidden="true" />;
  const { installed, guide } = state;
  const box = "mt-5 rounded-[16px] border border-primary/30 bg-card p-4 shadow-[0_1px_0_var(--color-divider)]";
  if (installed) {
    return <section data-install-here="installed" className={box}>
      <p className="flex items-center gap-2 font-serif text-[20px] font-bold text-foreground"><CheckCircle2 size={22} className="text-primary" aria-hidden="true" />L’app è già installata</p>
      <p className="mt-1 text-[15px] leading-snug text-muted">La stai usando dalla schermata Home o come app del computer.</p>
    </section>;
  }
  const linkOnly = guide.kind === "inapp" || guide.kind === "open-safari";
  return (
    <section data-install-here={event && guide.promptFirst ? "button" : guide.kind} aria-labelledby="install-here" className={box}>
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Sul tuo dispositivo</p>
      <h2 id="install-here" className="mt-0.5 font-serif text-[22px] font-bold leading-tight text-foreground">{guide.label}</h2>
      {guide.kind === "inapp" && <p className="mt-1 text-[15px] leading-snug text-foreground">Per installare l’app apri il link nel browser.</p>}
      {guide.kind === "open-safari" && <p className="mt-1 text-[15px] leading-snug text-foreground">Su questa versione di iOS l’app si installa solo da Safari.</p>}
      {guide.kind === "none" && <p className="mt-1 text-[15px] leading-snug text-foreground">Questo browser non installa i siti come app. Puoi usare Il Grimorio.App qui, oppure installarla con Chrome, Edge o Safari: le istruzioni sono qui sotto.</p>}
      {event && guide.promptFirst ? (
        <button type="button" onClick={() => void promptInstall()}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold tracking-wide text-primary-foreground transition-opacity active:opacity-80">
          <Download size={18} />
          Installa l&apos;app
        </button>
      ) : guide.steps.length > 0 && (
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-snug text-foreground">
          {guide.steps.map(step => <li key={step}>{step}</li>)}
        </ol>
      )}
      {linkOnly && (
        <button type="button" onClick={async () => setCopied(await copyLink(`${window.location.origin}/`))}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-background text-sm font-bold text-primary transition-opacity active:opacity-80">
          <Copy size={16} />
          <span aria-live="polite">{copied ? "Link copiato" : "Copia il link"}</span>
        </button>
      )}
    </section>
  );
}
