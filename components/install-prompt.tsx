"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Copy, Download, X } from "lucide-react";

import { copyLink, dismissInvite, promptInstall, useDeviceAdvice, useInstallEvent } from "@/components/install/install-events";

/**
 * The invite to install the app, small, above the bottom bar: the «Installa» button where the browser offers it
 * (Chromium on Android and computer), else the steps of the browser's own menu (iPhone, Firefox, Samsung,
 * Huawei, Mi Browser…), or «open the link in the browser» inside WhatsApp, Instagram and the other apps.
 * Never when the app is already installed; «Chiudi» hides it for 7 days. All browsers: /installa.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const event = useInstallEvent();
  const advice = useDeviceAdvice();
  const [late, setLate] = useState(false);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const guide = advice && !advice.installed && !advice.dismissed && advice.guide.kind !== "none" ? advice.guide : null;
  const wait = guide ? (guide.promptFirst ? 4000 : 1200) : 0;

  useEffect(() => {
    if (!wait) return;
    // A moment after the page opens; Chromium on Android waits for its own install event a little longer.
    const timer = setTimeout(() => setLate(true), wait);
    return () => clearTimeout(timer);
  }, [wait]);

  if (!guide || closed || pathname === "/installa") return null;
  const button = guide.promptFirst && event !== null;
  if (!button && (guide.kind === "button" || !late)) return null;

  const close = () => {
    setClosed(true);
    dismissInvite();
  };
  const copy = async () => setCopied(await copyLink());
  const linkOnly = guide.kind === "inapp" || guide.kind === "open-safari";
  const line = button ? "Installala per aprirla a schermo intero, come una vera app."
    : guide.kind === "inapp" ? "Per installare l’app apri il link nel browser."
    : guide.kind === "open-safari" ? "Su questo iPhone l’app si installa da Safari."
    : `${guide.label}:`;

  return (
    <div
      data-install-prompt={button ? "button" : guide.kind}
      className={`fixed inset-x-0 z-50 flex justify-center px-4 pb-3 ${pathname.startsWith("/admin") ? "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "bottom-[calc(80px+env(safe-area-inset-bottom,0px))] lg:bottom-0 lg:pb-4"}`}
    >
      <div role="region" aria-label="Installa l’app" className="animate-dice-in w-full max-w-md rounded-2xl border border-primary-dim/40 bg-elevated/95 p-4 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex items-start gap-3">
          <img src="/icon-install.webp" alt="" className="h-11 w-11 flex-shrink-0 rounded-xl border border-primary-dim/40" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base font-bold text-foreground">Aggiungi Il Grimorio.App</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{line}</p>
          </div>
          <button type="button" onClick={close} aria-label="Chiudi"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors active:bg-card">
            <X size={18} />
          </button>
        </div>

        {button ? (
          <button type="button" onClick={() => void promptInstall()}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold tracking-wide text-primary-foreground transition-opacity active:opacity-80">
            <Download size={18} />
            Installa l&apos;app
          </button>
        ) : linkOnly ? (
          <button type="button" onClick={copy}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-card text-sm font-bold text-primary transition-opacity active:opacity-80">
            <Copy size={16} />
            <span aria-live="polite">{copied ? "Link copiato" : "Copia il link"}</span>
          </button>
        ) : (
          <ol className="mt-2.5 list-decimal space-y-1 rounded-xl border border-border bg-card py-2.5 pl-8 pr-3 text-[13px] leading-snug text-card-foreground">
            {guide.steps.map(step => <li key={step}>{step}</li>)}
          </ol>
        )}
        {!button && (
          <Link href="/installa" prefetch={false} onClick={() => setClosed(true)} className="mt-2 inline-flex min-h-8 items-center text-[13px] font-semibold text-primary underline underline-offset-4">
            Istruzioni per tutti i browser
          </Link>
        )}
      </div>
    </div>
  );
}
