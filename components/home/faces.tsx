import type { Vote } from "@/lib/analytics-events";

/** The three faces of «Come ti trovi con il Grimorio?», drawn (never emoji), with the colours of the canvas. */
const MOUTHS: Record<Vote, string> = {
  male: "M8 16.5c1.2-1.4 2.5-2 4-2s2.8.6 4 2",
  "cosi-cosi": "M8.5 15.5h7",
  bene: "M8 14c1.2 1.6 2.5 2.4 4 2.4s2.8-.8 4-2.4",
};
export const FACE_COLORS: Record<Vote, string> = { male: "#7A1F2B", "cosi-cosi": "#7A4E00", bene: "#1F6B45" };
export const VOTE_LABELS: Record<Vote, string> = { male: "Male", "cosi-cosi": "Così così", bene: "Bene" };

export function Face({ vote, size = 30 }: { vote: Vote; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={FACE_COLORS[vote]} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d={MOUTHS[vote]} />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.6" />
    </svg>
  );
}

/** The share sign of the canvas: three joined dots, white. */
export function ShareIcon({ size = 22, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
