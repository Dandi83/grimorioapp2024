import type { ReactNode } from "react";

/** Labelled value box used in the spell and creature sheets. */
export function MetaCell({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="w-[calc(50%-6px)] rounded-xl border border-border bg-card p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      {/* A note marks a value worked out by the Grimorio, not printed in the source. */}
      <p className={`font-serif text-[15px] leading-5 text-foreground${note ? " italic" : ""}`}>
        {value || "—"}
      </p>
      {note && <p className="mt-1 text-[11px] italic leading-4 text-muted">{note}</p>}
    </div>
  );
}
