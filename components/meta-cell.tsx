import type { ReactNode } from "react";

/** Labelled value box used in the spell and creature sheets. */
/** plain: a cell of one ruled panel (proposal A of the spell sheet) instead of a card of its own. */
export function MetaCell({ label, value, note, plain = false }: { label: string; value: ReactNode; note?: string; plain?: boolean }) {
  return (
    <div className={plain ? "min-w-0 px-3.5 py-3" : "w-[calc(50%-6px)] rounded-xl border border-border bg-card p-3"}>
      <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      {/* A note marks a value worked out by the Grimorio, not printed in the source. */}
      <p className={`font-serif ${plain ? "text-[17px] leading-6" : "text-[15px] leading-5"} text-foreground${note ? " italic" : ""}`}>
        {value || "—"}
      </p>
      {note && <p className="mt-1 text-[12px] italic leading-4 text-muted">{note}</p>}
    </div>
  );
}
