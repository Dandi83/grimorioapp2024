"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "grimorio-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Già installata (standalone)? Non mostrare nulla.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // Chiuso di recente? Rispetta la scelta per 7 giorni.
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) return;
    } catch {
      // localStorage non disponibile: mostra comunque
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const safari = ios && !/crios|fxios|edgios/.test(ua);

    if (ios) {
      // iOS non espone beforeinstallprompt: mostriamo le istruzioni manuali
      // (solo su Safari, dove "Aggiungi a Home" è disponibile).
      if (safari) {
        setIsIOS(true);
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
      return;
    }

    // Android/desktop Chromium: catturiamo l'evento di installazione.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const close = () => {
    setVisible(false);
    try {
      // Non richiedere di nuovo per 7 giorni.
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 864e5));
    } catch {
      // ignora
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="animate-dice-in w-full max-w-md rounded-2xl border border-primary-dim/40 bg-elevated/95 p-4 shadow-2xl shadow-black/60 backdrop-blur">
        <div className="flex items-start gap-3">
          <img
            src="/icon.png"
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-xl border border-primary-dim/40"
          />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base font-bold text-foreground">
              Aggiungi GrimorioApp
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">
              {isIOS
                ? "Installalo sul telefono per aprirlo come un'app, anche offline."
                : "Installalo per aprirlo a schermo intero, come una vera app."}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Chiudi"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors active:bg-card"
          >
            <X size={18} />
          </button>
        </div>

        {isIOS ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] text-card-foreground">
            <span>Tocca</span>
            <Share size={16} className="text-primary" />
            <span>poi</span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Plus size={14} className="text-primary" /> Aggiungi a Home
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={install}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold tracking-wide text-primary-foreground transition-opacity active:opacity-80"
          >
            <Download size={18} />
            Installa l&apos;app
          </button>
        )}
      </div>
    </div>
  );
}
