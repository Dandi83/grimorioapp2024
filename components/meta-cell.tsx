/** Labelled value box used in the spell and creature sheets. */
export function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-[calc(50%-6px)] rounded-xl border border-border bg-card p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="font-serif text-[15px] leading-5 text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}
