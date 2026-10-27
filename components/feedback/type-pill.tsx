import { TYPE_LABELS, type FeedbackType } from "@/lib/feedback-input";

const PILL: Record<FeedbackType, string> = {
  errore: "bg-[#F3D3D3] text-[#7A1F2B]",
  mancanza: "bg-[#E9DDC2] text-[#5E4E3E]",
  consiglio: "bg-[#DDE8D0] text-[#3F5A2A]",
  diritti: "bg-[#7A1F2B] text-[#FFFBF0]",
};

export function TypePill({ tipo }: { tipo: FeedbackType }) {
  return <span className={`shrink-0 rounded-[10px] px-2.5 py-0.5 text-xs font-bold ${PILL[tipo]}`}>{TYPE_LABELS[tipo]}</span>;
}
