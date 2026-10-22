"use client";

import { MessageSquareWarning } from "lucide-react";

/**
 * «Segnala» at the bottom of a public page: opens /segnala with the page, its name and
 * the edition on screen (the visible panel of a 2024 | 2014 selector, else the given one).
 */
export function ReportLink({ edition }: { edition?: "2014" | "2024" }) {
  const target = () => {
    const shown = document.querySelector<HTMLElement>("[data-edition]:not([hidden])");
    const params = new URLSearchParams({ pagina: window.location.pathname });
    const title = (shown?.querySelector("h1") ?? document.querySelector("h1"))?.textContent?.trim();
    if (title) params.set("titolo", title.slice(0, 120));
    const chosen = shown?.dataset.edition ?? edition;
    if (chosen === "2014" || chosen === "2024") params.set("edizione", chosen);
    return `/segnala?${params}`;
  };
  return (
    <p className="mt-8 text-center">
      {/* A plain link: the address is completed at the tap, and the saved form opens offline too. */}
      <a href="/segnala" onClick={event => { event.currentTarget.href = target(); }}
        className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-semibold text-muted underline underline-offset-4">
        <MessageSquareWarning size={17} aria-hidden="true" />
        Segnala
      </a>
    </p>
  );
}
