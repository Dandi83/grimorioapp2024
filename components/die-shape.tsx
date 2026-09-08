export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

interface Palette {
  hi: string;
  light: string;
  mid: string;
  dark: string;
  edge: string;
  glow: string;
}

const GOLD: Palette = {
  hi: "#FFE080",
  light: "#F4CF5E",
  mid: "#D4AF37",
  dark: "#8B6914",
  edge: "#5C4409",
  glow: "#FFF1B8",
};

const MUTED: Palette = {
  hi: "#3D3D42",
  light: "#2F2F34",
  mid: "#25252A",
  dark: "#18181C",
  edge: "#0C0C10",
  glow: "#4A4A50",
};

interface Props {
  sides: DieSides;
  size: number;
  variant?: "gold" | "muted";
  value?: number | string;
}

const TEXT_Y: Record<number, number> = {
  4: 70,
  6: 58,
  8: 58,
  10: 60,
  12: 58,
  20: 58,
  100: 60,
};

/**
 * Faceted, gradient-shaded polyhedra rendered as SVG, ported 1:1 from the
 * original React Native app so each die keeps its true isometric geometry.
 */
export function DieShape({ sides, size, variant = "gold", value }: Props) {
  const palette = variant === "gold" ? GOLD : MUTED;
  const label = value !== undefined ? String(value) : "";
  const showLabel = value !== undefined;
  const uid = `${sides}-${variant}`;
  const fontSize = label.length > 2 ? 20 : label.length === 2 ? 26 : 30;

  const stroke = { stroke: palette.edge, strokeLinejoin: "round" as const };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`hiGrad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.glow} />
          <stop offset="1" stopColor={palette.light} />
        </linearGradient>
        <linearGradient id={`midGrad-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.mid} />
        </linearGradient>
        <linearGradient id={`darkGrad-${uid}`} x1="0.3" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.mid} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="30%" cy="25%" r="70%">
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
          <stop offset="0.6" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {sides === 4 && <D4 uid={uid} stroke={stroke} />}
      {sides === 6 && <D6 uid={uid} stroke={stroke} />}
      {sides === 8 && <D8 uid={uid} stroke={stroke} />}
      {sides === 10 && <D10 uid={uid} stroke={stroke} />}
      {sides === 12 && <D12 uid={uid} stroke={stroke} />}
      {sides === 20 && <D20 uid={uid} stroke={stroke} />}
      {sides === 100 && <D100 uid={uid} stroke={stroke} />}

      {showLabel && (
        <text
          x="50"
          y={TEXT_Y[sides] ?? 58}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill={palette.edge}
          fontFamily="Georgia, serif"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

type FaceProps = {
  uid: string;
  stroke: { stroke: string; strokeLinejoin: "round" };
};

function D4({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,8 50,60 8,84" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,8 92,84 50,60" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="8,84 92,84 50,60" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,8 92,84 8,84" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,8 50,60 8,84" fill={`url(#glow-${uid})`} />
    </g>
  );
}

function D6({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,8 88,30 50,52 12,30" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="12,30 50,52 50,96 12,74" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="88,30 50,52 50,96 88,74" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,8 88,30 88,74 50,96 12,74 12,30" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,8 88,30 50,52 12,30" fill={`url(#glow-${uid})`} />
    </g>
  );
}

function D8({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,6 50,50 10,50" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,6 90,50 50,50" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="10,50 50,50 50,94" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" opacity="0.85" {...stroke} />
      <polygon points="50,50 90,50 50,94" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,6 90,50 50,94 10,50" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,6 50,50 10,50" fill={`url(#glow-${uid})`} />
    </g>
  );
}

function D10({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,6 10,40 34,58 50,50" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,6 90,40 66,58 50,50" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="34,58 50,50 66,58 50,88" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" opacity="0.9" {...stroke} />
      <polygon points="10,40 22,84 50,88 34,58" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.9" {...stroke} />
      <polygon points="90,40 78,84 50,88 66,58" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,6 90,40 78,84 22,84 10,40" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,6 10,40 34,58 50,50" fill={`url(#glow-${uid})`} />
    </g>
  );
}

function D12({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,6 74,20 66,44 34,44 26,20" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,44 66,44 74,70 50,80 26,70" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="26,20 34,44 26,70 8,52 8,32" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" opacity="0.85" {...stroke} />
      <polygon points="74,20 92,32 92,52 74,70 66,44" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="26,70 50,80 34,88 18,80 8,52" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.9" {...stroke} />
      <polygon points="74,70 92,52 82,80 66,88 50,80" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.75" {...stroke} />
      <polygon points="50,6 74,20 92,32 92,52 82,80 66,88 34,88 18,80 8,52 8,32 26,20" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,6 74,20 66,44 34,44 26,20" fill={`url(#glow-${uid})`} />
    </g>
  );
}

function D20({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,26 74,66 26,66" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,6 50,26 26,66 10,30" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="50,6 90,30 74,66 50,26" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" opacity="0.95" {...stroke} />
      <polygon points="26,66 74,66 50,94" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="10,30 26,66 10,70" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.85" {...stroke} />
      <polygon points="90,30 90,70 74,66" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.8" {...stroke} />
      <polygon points="10,70 26,66 50,94" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.75" {...stroke} />
      <polygon points="90,70 74,66 50,94" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.7" {...stroke} />
      <polygon points="50,6 90,30 90,70 50,94 10,70 10,30" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,6 50,26 26,66 10,30" fill={`url(#glow-${uid})`} />
    </g>
  );
}

function D100({ uid, stroke }: FaceProps) {
  return (
    <g>
      <polygon points="50,6 10,40 34,58 50,50" fill={`url(#hiGrad-${uid})`} strokeWidth="1.2" opacity="0.9" {...stroke} />
      <polygon points="50,6 90,40 66,58 50,50" fill={`url(#midGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="34,58 50,50 66,58 50,88" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.85" {...stroke} />
      <polygon points="10,40 22,84 50,88 34,58" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" {...stroke} />
      <polygon points="90,40 78,84 50,88 66,58" fill={`url(#darkGrad-${uid})`} strokeWidth="1.2" opacity="0.75" {...stroke} />
      <polygon points="50,6 90,40 78,84 22,84 10,40" fill="none" strokeWidth="1.8" {...stroke} />
      <polygon points="50,6 10,40 34,58 50,50" fill={`url(#glow-${uid})`} />
    </g>
  );
}
