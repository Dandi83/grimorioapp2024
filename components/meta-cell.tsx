import type { ReactNode } from "react";

/** Labelled value box used in the spell and creature sheets. */
/** plain: on phones and tablets a cell of one ruled panel (the spell sheet), a card of its own from 1024 px. */
export function MetaCell({ label, value, note, plain = false }: { label: string; value: ReactNode; note?: string; plain?: boolean }) {
  return (
    <div className={plain ? "min-w-0 px-3.5 py-3 lg:w-[calc(50%-6px)] lg:rounded-xl lg:!border lg:!border-border lg:bg-card lg:p-3" : "w-[calc(50%-6px)] rounded-xl border border-border bg-card p-3"}>
      <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      {/* A note marks a value worked out by the Grimorio, not printed in the source. */}
      <p className={`font-serif ${plain ? "text-[17px] leading-6 lg:text-[15px] lg:leading-5" : "text-[15px] leading-5"} text-foreground${note ? " italic" : ""}`}>
        {value || "—"}
      </p>
      {note && <p className="mt-1 text-[12px] italic leading-4 text-muted">{note}</p>}
    </div>
  );
}
