import type { DiffPart } from "@/lib/word-diff";

/**
 * One field of a modified SRD card: the SRD text and the current one, one under the other, the changed words
 * marked (removed in the SRD line, added in the current one).
 */
export function FieldDiff({ label, parts }: { label: string; parts: DiffPart[] }) {
  const line = (side: "srd" | "attuale") => parts.filter(part => part.kind === "same" || part.kind === side).map((part, index) =>
    part.kind === "same" ? <span key={index}>{part.text}</span>
      : side === "srd" ? <del key={index} className="rounded-[3px] bg-[#F3DED6] text-[#A2462E] decoration-[#A2462E]">{part.text}</del>
        : <ins key={index} className="rounded-[3px] bg-[#E3EEDF] text-[#2E6B3F] no-underline">{part.text}</ins>);
  return (
    <div data-srd-field="" className="mt-3">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <dl className="mt-1 overflow-hidden rounded-[10px] border border-border text-[14px] leading-6">
        <div className="border-b border-border bg-background px-3 py-2">
          <dt className="text-[12px] font-bold text-muted">Testo SRD</dt>
          <dd data-srd-text="" className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words">{line("srd")}</dd>
        </div>
        <div className="bg-card px-3 py-2">
          <dt className="text-[12px] font-bold text-muted">Testo attuale</dt>
          <dd data-current-text="" className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words">{line("attuale")}</dd>
        </div>
      </dl>
    </div>
  );
}
