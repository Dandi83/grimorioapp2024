import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { theme } from "@/src/theme";

interface Props {
  sides: 4 | 6 | 8 | 10 | 12 | 20 | 100;
  size: number;
  variant?: "gold" | "muted"; // gold = full color; muted = grayscale-ish for inactive states
  value?: number | string;
}

// Palette
const GOLD = {
  hi: "#FFE080",       // brightest highlight (top-lit)
  light: "#F4CF5E",    // light face
  mid: "#D4AF37",      // base gold
  dark: "#8B6914",     // shadow face
  edge: "#5C4409",     // edge stroke
  glow: "#FFF1B8",     // specular highlight
};

const MUTED = {
  hi: "#3D3D42",
  light: "#2F2F34",
  mid: "#25252A",
  dark: "#18181C",
  edge: "#0C0C10",
  glow: "#4A4A50",
};

/**
 * Faceted, gradient-shaded polyhedra rendered with react-native-svg.
 * Each die exposes its true polyhedral geometry (isometric projection) with
 * per-face shading for a 3D metallic look.
 */
export function DieShape({ sides, size, variant = "gold", value }: Props) {
  const palette = variant === "gold" ? GOLD : MUTED;
  const label = value !== undefined ? String(value) : "";
  const showLabel = value !== undefined;
  const uid = `${sides}-${variant}`; // unique per instance to avoid gradient id collisions

  // Text placement per die (values were tuned visually)
  const textY: Record<number, number> = {
    4: 70,
    6: 58,
    8: 58,
    10: 60,
    12: 58,
    20: 58,
    100: 60,
  };

  const fontSize = label.length > 2 ? 20 : label.length === 2 ? 26 : 30;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`hiGrad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.glow} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.light} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={`midGrad-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor={palette.light} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.mid} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={`darkGrad-${uid}`} x1="0.3" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.mid} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.dark} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient
          id={`glow-${uid}`}
          cx="30%"
          cy="25%"
          r="70%"
        >
          <Stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
          <Stop offset="0.6" stopColor={palette.glow} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {sides === 4 && <D4Faces uid={uid} palette={palette} />}
      {sides === 6 && <D6Faces uid={uid} palette={palette} />}
      {sides === 8 && <D8Faces uid={uid} palette={palette} />}
      {sides === 10 && <D10Faces uid={uid} palette={palette} />}
      {sides === 12 && <D12Faces uid={uid} palette={palette} />}
      {sides === 20 && <D20Faces uid={uid} palette={palette} />}
      {sides === 100 && <D100Faces uid={uid} palette={palette} />}

      {showLabel && (
        <SvgText
          x="50"
          y={textY[sides] ?? 58}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill={palette.edge}
          fontFamily="Georgia"
        >
          {label}
        </SvgText>
      )}
    </Svg>
  );
}

interface Palette {
  hi: string;
  light: string;
  mid: string;
  dark: string;
  edge: string;
  glow: string;
}
interface FaceProps {
  uid: string;
  palette: Palette;
}

// d4 — tetrahedron viewed from the front: 3 visible triangular faces meeting at center
function D4Faces({ uid, palette }: FaceProps) {
  // Outer triangle vertices: A (top), B (bottom-right), C (bottom-left)
  // Center point M
  return (
    <G>
      {/* Left face (highlight) */}
      <Polygon points="50,8 50,60 8,84" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Right face (dark) */}
      <Polygon points="50,8 92,84 50,60" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Bottom face (mid) */}
      <Polygon points="8,84 92,84 50,60" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Outer stroke for definition */}
      <Polygon points="50,8 92,84 8,84" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      {/* Specular */}
      <Polygon points="50,8 50,60 8,84" fill={`url(#glow-${uid})`} />
    </G>
  );
}

// d6 — cube in isometric projection: top (light), left (mid), right (dark)
function D6Faces({ uid, palette }: FaceProps) {
  return (
    <G>
      {/* Top face */}
      <Polygon points="50,8 88,30 50,52 12,30" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Left face */}
      <Polygon points="12,30 50,52 50,96 12,74" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Right face */}
      <Polygon points="88,30 50,52 50,96 88,74" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Outer silhouette */}
      <Polygon points="50,8 88,30 88,74 50,96 12,74 12,30" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="50,8 88,30 50,52 12,30" fill={`url(#glow-${uid})`} />
    </G>
  );
}

// d8 — octahedron viewed edge-on: 4 visible triangular faces
function D8Faces({ uid, palette }: FaceProps) {
  return (
    <G>
      {/* Top-left */}
      <Polygon points="50,6 50,50 10,50" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Top-right */}
      <Polygon points="50,6 90,50 50,50" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Bottom-left */}
      <Polygon points="10,50 50,50 50,94" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      {/* Bottom-right */}
      <Polygon points="50,50 90,50 50,94" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Silhouette */}
      <Polygon points="50,6 90,50 50,94 10,50" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="50,6 50,50 10,50" fill={`url(#glow-${uid})`} />
    </G>
  );
}

// d10 — pentagonal trapezohedron: 5 kite faces visible from front (top pentagon + 4 kites)
function D10Faces({ uid, palette }: FaceProps) {
  // Vertices: apex A=(50,6), pentagon vertices around, bottom apex B=(50,94)
  return (
    <G>
      {/* Top-left kite (highlight) */}
      <Polygon points="50,6 10,40 34,58 50,50" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Top-right kite (mid) */}
      <Polygon points="50,6 90,40 66,58 50,50" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Center/front kite (mid-light) */}
      <Polygon points="34,58 50,50 66,58 50,88" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.9" />
      {/* Bottom-left kite (dark) */}
      <Polygon points="10,40 22,84 50,88 34,58" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.9" />
      {/* Bottom-right kite (dark) */}
      <Polygon points="90,40 78,84 50,88 66,58" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Silhouette */}
      <Polygon points="50,6 90,40 78,84 22,84 10,40" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="50,6 10,40 34,58 50,50" fill={`url(#glow-${uid})`} />
    </G>
  );
}

// d12 — dodecahedron front view: central pentagon + 5 surrounding pentagon faces (only 3 fully visible)
function D12Faces({ uid, palette }: FaceProps) {
  return (
    <G>
      {/* Top pentagon (highlight) */}
      <Polygon points="50,6 74,20 66,44 34,44 26,20" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Central pentagon (mid) */}
      <Polygon points="50,44 66,44 74,70 50,80 26,70" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Reuse: shifted center */}
      {/* Left pentagon (mid-dark) */}
      <Polygon points="26,20 34,44 26,70 8,52 8,32" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      {/* Right pentagon (dark) */}
      <Polygon points="74,20 92,32 92,52 74,70 66,44" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Bottom-left (dark) */}
      <Polygon points="26,70 50,80 34,88 18,80 8,52" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.9" />
      {/* Bottom-right (darker) */}
      <Polygon points="74,70 92,52 82,80 66,88 50,80" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.75" />
      {/* Silhouette */}
      <Polygon points="50,6 74,20 92,32 92,52 82,80 66,88 34,88 18,80 8,52 8,32 26,20" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="50,6 74,20 66,44 34,44 26,20" fill={`url(#glow-${uid})`} />
    </G>
  );
}

// d20 — icosahedron front view: central triangle + 5 surrounding triangles with alternating shades
function D20Faces({ uid, palette }: FaceProps) {
  return (
    <G>
      {/* Central triangle (mid) */}
      <Polygon points="50,26 74,66 26,66" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Top-left triangle (highlight) */}
      <Polygon points="50,6 50,26 26,66 10,30" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Top-right triangle (light) */}
      <Polygon points="50,6 90,30 74,66 50,26" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.95" />
      {/* Bottom triangle (dark) */}
      <Polygon points="26,66 74,66 50,94" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Left side triangle (dark) */}
      <Polygon points="10,30 26,66 10,70" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      {/* Right side triangle (dark) */}
      <Polygon points="90,30 90,70 74,66" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.8" />
      {/* Bottom-left small triangle */}
      <Polygon points="10,70 26,66 50,94" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.75" />
      {/* Bottom-right small triangle */}
      <Polygon points="90,70 74,66 50,94" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.7" />
      {/* Silhouette */}
      <Polygon points="50,6 90,30 90,70 50,94 10,70 10,30" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="50,6 50,26 26,66 10,30" fill={`url(#glow-${uid})`} />
    </G>
  );
}

// d100 — like d10 but with distinctive tone (darker/copper hint) and two-digit prep
function D100Faces({ uid, palette }: FaceProps) {
  return (
    <G>
      {/* Top-left kite (highlight) */}
      <Polygon points="50,6 10,40 34,58 50,50" fill={`url(#hiGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.9" />
      {/* Top-right kite (mid) */}
      <Polygon points="50,6 90,40 66,58 50,50" fill={`url(#midGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Center kite */}
      <Polygon points="34,58 50,50 66,58 50,88" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      {/* Bottom-left kite */}
      <Polygon points="10,40 22,84 50,88 34,58" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Bottom-right kite */}
      <Polygon points="90,40 78,84 50,88 66,58" fill={`url(#darkGrad-${uid})`} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" opacity="0.75" />
      {/* Small "%" hint dot in top-left */}
      <Path d="M 20 20 L 22 22 M 30 30 L 32 32" stroke={palette.glow} strokeWidth="1.5" opacity="0.35" />
      {/* Silhouette */}
      <Polygon points="50,6 90,40 78,84 22,84 10,40" fill="none" stroke={palette.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="50,6 10,40 34,58 50,50" fill={`url(#glow-${uid})`} />
    </G>
  );
}
