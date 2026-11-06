"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, X } from "lucide-react";

import { copyLink } from "@/components/install/install-events";
import { TPK_INVITE_LINE, TPK_INVITE_TITLE, TPK_OPEN_SAFARI, type TpkInvite } from "@/lib/install-guide";
import { withoutTpkMark } from "@/lib/tpk-arrival";

/** The events of the invite «da TPK» (lib/analytics-events.ts): sent at once, never with the next page view. */
export type TpkInviteEvent = "tpk_invite_shown" | "tpk_invite_tapped" | "tpk_invite_guide" | "tpk_invite_installed" | "tpk_invite_closed";
export function sendTpkInviteEvent(event: TpkInviteEvent) {
  window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event } }));
}

/**
 * PROMPT 70: the invite to install for who arrives from Total Party Kill (?da=tpk), drawn by components/install-prompt.tsx
 * in place of the usual one (never both). The approved look: a cream box with a thin bordeaux border and the top corners
 * rounded, sitting on the bottom bar (never over it), the icon of the Grimorio, the title in EB Garamond.
 * «Installa» opens the browser's install window (Chromium) or turns the box into a guide step by step (iPhone, iPad,
 * Firefox on Android, Safari on Mac); «Non ora» and ✕ close it for 7 days, «Ho capito» closes the guide.
 * Fixed above the page: nothing moves.
 */
export function TpkInviteBox({ invite, admin, onInstall, onClose, onDone }: {
  invite: TpkInvite;
  /** The reserved area: no bottom bar there. */
  admin: boolean;
  /** «Installa» with the browser's own window (kind «prompt»). */
  onInstall: () => void;
  /** «Non ora» and ✕: 7 days. */
  onClose: () => void;
  /** «Ho capito»: the guide read, the box goes away for this page. */
  onDone: () => void;
}) {
  const [guide, setGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const ios = invite.kind === "ios-safari" || invite.kind === "ios-altro";
  const linkToo = invite.kind === "ios-altro" || invite.kind === "inapp";

  const install = () => {
    sendTpkInviteEvent("tpk_invite_tapped");
    if (invite.kind === "prompt") return onInstall();
    if (ios) sendTpkInviteEvent("tpk_invite_guide");
    setGuide(true);
  };
  const copy = async () => setCopied(await copyLink(withoutTpkMark(window.location.href)));

  return (
    <div
      data-install-prompt="tpk"
      data-tpk-invite={invite.kind}
      data-tpk-guide={guide ? "open" : "closed"}
      className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-2 sm:px-4 ${admin ? "bottom-0" : "bottom-[calc(80px+env(safe-area-inset-bottom,0px))] lg:bottom-0"}`}
    >
      <div role="region" aria-label={TPK_INVITE_TITLE}
        className={`pointer-events-auto w-full max-w-md rounded-t-2xl border border-primary/70 bg-card px-4 pt-3 shadow-[0_-8px_24px_rgba(43,33,24,0.18)] ${admin ? "border-b-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "border-b-0 pb-3 lg:pb-4"}`}>
        <div className="flex items-start gap-3">
          <img src="/icon-install.webp" alt="" className="mt-1 h-11 w-11 flex-shrink-0 rounded-xl border border-primary/40" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[19px] font-bold leading-tight text-foreground">{TPK_INVITE_TITLE}</p>
            {!guide && <p className="mt-0.5 text-[14px] leading-snug text-muted" data-tpk-line="">{TPK_INVITE_LINE}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi"
            className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors active:bg-elevated">
            <X size={20} />
          </button>
        </div>

        {!guide ? (
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="flex h-11 min-w-[44px] flex-shrink-0 items-center justify-center rounded-full px-4 text-[15px] font-semibold text-primary underline-offset-4 active:underline">
              Non ora
            </button>
            <button type="button" onClick={install}
              className="pg-pulsante flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold tracking-wide text-primary-foreground transition-opacity active:opacity-80">
              <Download size={18} aria-hidden="true" />
              Installa
            </button>
          </div>
        ) : (
          <div className="mt-2" data-tpk-steps="">
            {invite.kind === "ios-altro" && (
              <div className="mb-2 rounded-xl border border-border bg-background px-3 py-2" data-tpk-open-safari="">
                <p className="text-[15px] font-bold leading-snug text-foreground">{TPK_OPEN_SAFARI}</p>
                {invite.openInSafari && <p className="mt-0.5 text-[14px] leading-snug text-muted">{invite.openInSafari}</p>}
              </div>
            )}
            {invite.kind === "ios-altro" && <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Poi, da Safari</p>}
            <ol className="mt-1 space-y-1.5 text-[15px] leading-snug text-foreground">
              {invite.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-2" data-tpk-step={index + 1}>
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground" aria-hidden="true">{index + 1}</span>
                  <span className="min-w-0 flex-1 pt-0.5"><span className="sr-only">{index + 1}. </span>{step}
                    {invite.kind === "ios-safari" && index === 0 && (
                      <span className="block text-[13px] text-muted">{invite.arrow === "ipad" ? "Sull’iPad è in alto a destra." : "Sull’iPhone è nella barra in basso; se non la vedi, tocca prima ⋯."}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-col gap-2">
              {linkToo && (
                <button type="button" onClick={copy}
                  className="pg-pulsante-chiaro flex h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-background text-[15px] font-bold text-primary transition-opacity active:opacity-80">
                  <Copy size={16} aria-hidden="true" />
                  <span aria-live="polite">{copied ? "Link copiato" : "Copia il link"}</span>
                </button>
              )}
              <button type="button" onClick={onDone}
                className="pg-pulsante flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-bold text-primary-foreground transition-opacity active:opacity-80">
                Ho capito
              </button>
            </div>
            {/* iPhone: Condividi is in Safari's bar below the page, the arrow points down at the middle of it. */}
            {invite.kind === "ios-safari" && invite.arrow === "iphone" && (
              <div className="mt-2 flex justify-center text-primary" data-tpk-arrow="iphone" aria-hidden="true">
                <ArrowDown size={28} strokeWidth={2.5} className="tpk-freccia" />
              </div>
            )}
          </div>
        )}
      </div>
      {/* iPad: Condividi is at the top right of Safari's bar, above the page. */}
      {guide && invite.kind === "ios-safari" && invite.arrow === "ipad" && (
        <div className="pointer-events-none fixed right-4 top-2 z-50 flex flex-col items-center rounded-full border border-primary/70 bg-card px-2 py-1 text-primary shadow-lg" data-tpk-arrow="ipad" aria-hidden="true">
          <ArrowUp size={28} strokeWidth={2.5} className="tpk-freccia-su" />
        </div>
      )}
    </div>
  );
}
