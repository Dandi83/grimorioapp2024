import type { ReactNode } from "react";

/** Labelled value box used in the spell and creature sheets. */
/** icon: drawn before the label (proposal B of the spell sheet). */
export function MetaCell({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: ReactNode }) {
  return (
    <div className="w-[calc(50%-6px)] rounded-xl border border-border bg-card p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">
        {icon}{label}
      </p>
      {/* A note marks a value worked out by the Grimorio, not printed in the source. */}
      <p className={`font-serif ${icon ? "text-[17px] leading-6" : "text-[15px] leading-5"} text-foreground${note ? " italic" : ""}`}>
        {value || "—"}
      </p>
      {note && <p className="mt-1 text-[12px] italic leading-4 text-muted">{note}</p>}
    </div>
  );
}
