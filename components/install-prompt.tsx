"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Copy, Download, X } from "lucide-react";

import { copyLink, dismissInvite, promptInstall, useDeviceAdvice, useInstallEvent } from "@/components/install/install-events";
import { queueUse } from "@/components/statistics/use-report-search";
import { useUserEdition } from "@/components/edition/edition-provider";
import { setInstallInvite, useRatingShown, useStatisticsNotice } from "@/components/statistics/notice";

/**
 * The invite to install the app, small, above the bottom bar: the «Installa» button where the browser offers it
 * (Chromium on Android and computer), else the steps of the browser's own menu (iPhone, Firefox, Samsung,
 * Huawei, Mi Browser…), or «open the link in the browser» inside WhatsApp, Instagram and the other apps.
 * Never when the app is already installed; «Chiudi» hides it for 7 days. All browsers: /installa.
 * Never together with the statistics bar nor over the welcome screen: it waits until the bar is closed («Ok» or
 * «No»), then its usual moment; a bar closed in an earlier visit changes nothing (components/statistics/notice.ts).
 * Its moment (PROMPT 43): the first touch, click, scroll or key of the person on the page (one passive listener that
 * removes itself), never a timer; without a gesture it does not show. Fixed above the page: nothing moves.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const event = useInstallEvent();
  const advice = useDeviceAdvice();
  const [late, setLate] = useState(false);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const notice = useStatisticsNotice();
  const { firstLaunch } = useUserEdition();
  // Nor together with the question of the Home: it waits until that is answered or closed.
  const rating = useRatingShown();
  const free = notice === "closed" && !firstLaunch;
  const guide = advice && !advice.installed && !advice.dismissed && advice.guide.kind !== "none" ? advice.guide : null;
  // A gesture counts unless the statistics bar or the welcome screen is open (their own taps never bring it at once);
  // one made while the bar is still unknown counts, the invite then waits for the bar like before.
  const waiting = !!guide && notice !== "open" && !firstLaunch && !late;

  useEffect(() => {
    if (!waiting) return;
    // The first gesture of the person (a touch, a click, a scroll, a key).
    const kinds = ["pointerdown", "scroll", "keydown"] as const;
    // Capture: the scroll of a box inside the page counts too (a scroll does not bubble).
    const first = () => {
      for (const kind of kinds) window.removeEventListener(kind, first, true);
      setLate(true);
    };
    for (const kind of kinds) window.addEventListener(kind, first, { passive: true, capture: true });
    return () => { for (const kind of kinds) window.removeEventListener(kind, first, true); };
  }, [waiting]);

  const button = !!guide && guide.promptFirst && event !== null;
  // Told to the question of the Home (components/statistics/notice.ts): it never shows while the invite is due.
  const inviteState = advice === null ? "waiting"
    : !guide || closed || pathname === "/installa" || (!button && guide.kind === "button") ? "none"
      : free && late ? "shown" : "waiting";
  useEffect(() => { setInstallInvite(inviteState); }, [inviteState]);
  // The invite seen and accepted (PROMPT 32): names only, sent with the next event.
  const seen = inviteState === "shown" && !rating;
  useEffect(() => { if (seen) queueUse("install_prompt_shown"); }, [seen]);

  if (!guide || !free || rating || closed || pathname === "/installa") return null;
  if (!late || (!button && guide.kind === "button")) return null;

  const close = () => {
    setClosed(true);
    dismissInvite();
    queueUse("install_prompt_closed");
  };
  const copy = async () => { queueUse("install_prompt_tapped"); setCopied(await copyLink()); };
  const linkOnly = guide.kind === "inapp" || guide.kind === "open-safari";
  const line = button ? "Installala per aprirla a schermo intero, come una vera app." : guide.short;
  return (
    <div
      data-install-prompt={button ? "button" : guide.kind}
      className={`fixed inset-x-0 z-50 flex justify-center px-4 pb-3 ${pathname.startsWith("/admin") ? "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "bottom-[calc(80px+env(safe-area-inset-bottom,0px))] lg:bottom-0 lg:pb-4"}`}
    >
      <div role="region" aria-label="Installa l’app" className="animate-dice-in w-full max-w-md rounded-2xl border border-primary-dim/40 bg-elevated p-4 shadow-2xl shadow-black/30">
        <div className="flex items-start gap-3">
          <img src="/icon-install.webp" alt="" className="h-11 w-11 flex-shrink-0 rounded-xl border border-primary-dim/40" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base font-bold text-foreground">Aggiungi Il Grimorio.App</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{line}</p>
            {!button && (
              <Link href="/installa" prefetch={false} onClick={() => { queueUse("install_prompt_tapped"); setClosed(true); }} className="inline-flex min-h-8 items-center text-[13px] font-semibold text-primary underline underline-offset-4">
                Come si fa, passo per passo
              </Link>
            )}
          </div>
          <button type="button" onClick={close} aria-label="Chiudi"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors active:bg-card">
            <X size={18} />
          </button>
        </div>

        {button ? (
          <button type="button" onClick={() => { queueUse("install_prompt_tapped"); setClosed(true); void promptInstall().then(accepted => { if (accepted) queueUse("install_prompt_accepted"); }); }}
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
        ) : null}
      </div>
    </div>
  );
}
