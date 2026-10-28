"use client";

import { useEffect, useState } from "react";

import { CHOICE_EVENT, saveStatisticsChoice } from "@/components/analytics-provider";

type Status = { enabled: boolean; excluded: boolean; consent: "accepted" | "rejected" | null };

/**
 * «Contami nelle statistiche» in /privacy: on unless «No» was chosen; a change at any moment, saved like the
 * bar's buttons. The administrator's devices are never counted and say so.
 */
export function StatisticsSwitch() {
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics", { cache: "no-store", signal: controller.signal })
      .then(response => response.json())
      .then(setStatus)
      .catch(() => {});
    const chosen = (event: Event) => {
      const consent = (event as CustomEvent).detail;
      if (consent === "accepted" || consent === "rejected") setStatus(old => (old ? { ...old, consent } : old));
    };
    window.addEventListener(CHOICE_EVENT, chosen);
    return () => { controller.abort(); window.removeEventListener(CHOICE_EVENT, chosen); };
  }, []);

  const on = status?.consent !== "rejected";
  const locked = !status || status.excluded;
  async function toggle() {
    setSaving(true);
    setError("");
    if (!(await saveStatisticsChoice(on ? "rejected" : "accepted"))) setError("Scelta non salvata. Riprova.");
    setSaving(false);
  }
  return (
    <div className="rounded-[14px] border-[1.5px] border-border bg-card p-3.5" data-statistics-switch="">
      <div className="flex items-center gap-3">
        <span id="statistics-switch-label" className="min-w-0 flex-1 text-[16px] font-semibold text-foreground">Contami nelle statistiche</span>
        <button type="button" role="switch" aria-checked={!locked && on} aria-labelledby="statistics-switch-label"
          disabled={locked || saving} onClick={() => void toggle()}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${!locked && on ? "bg-primary" : "bg-border"}`}>
          <span aria-hidden="true" className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${!locked && on ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
      <p className="mt-1.5 text-[14px] leading-snug text-muted" aria-live="polite">
        {status?.excluded
          ? "Questo dispositivo è dell’amministratore: non viene mai contato."
          : on
            ? "Le tue visite contano, in forma anonima. Puoi spegnere quando vuoi."
            : "Non vieni contato: da questo browser non registriamo niente."}
      </p>
      {error && <p role="alert" className="mt-1 text-[14px] text-destructive">{error}</p>}
    </div>
  );
}
