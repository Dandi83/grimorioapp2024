import Svg, {
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";

import { theme } from "@/src/theme";

interface Props {
  sides: 4 | 6 | 8 | 10 | 12 | 20 | 100;
  size: number;
  color?: string;
  strokeColor?: string;
  textColor?: string;
  value?: number | string;
}

/**
 * Isometric-style silhouettes of the seven classic D&D polyhedral dice.
 * Rendered with react-native-svg. Each die is drawn on a 100x100 viewBox and
 * scaled to `size`.
 */
export function DieShape({
  sides,
  size,
  color = theme.colors.brand,
  strokeColor = theme.colors.brandSecondary,
  textColor = theme.colors.onBrand,
  value,
}: Props) {
  const label = value !== undefined ? String(value) : String(sides);
  const showLabel = value !== undefined;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {sides === 4 && <D4 color={color} stroke={strokeColor} />}
      {sides === 6 && <D6 color={color} stroke={strokeColor} />}
      {sides === 8 && <D8 color={color} stroke={strokeColor} />}
      {sides === 10 && <D10 color={color} stroke={strokeColor} />}
      {sides === 12 && <D12 color={color} stroke={strokeColor} />}
      {sides === 20 && <D20 color={color} stroke={strokeColor} />}
      {sides === 100 && <D100 color={color} stroke={strokeColor} />}
      {showLabel && (
        <SvgText
          x="50"
          y={sides === 4 ? "72" : sides === 10 || sides === 100 ? "56" : "58"}
          textAnchor="middle"
          fontSize={label.length > 2 ? "22" : "30"}
          fontWeight="700"
          fill={textColor}
          fontFamily="Georgia"
        >
          {label}
        </SvgText>
      )}
    </Svg>
  );
}

// Shared props
interface ShapeProps {
  color: string;
  stroke: string;
}

// d4 — tetrahedron: outer triangle + 3 inner lines to apex
function D4({ color, stroke }: ShapeProps) {
  return (
    <G>
      <Polygon
        points="50,8 92,84 8,84"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Line x1="50" y1="8" x2="50" y2="84" stroke={stroke} strokeWidth="1" opacity={0.5} />
      <Line x1="8" y1="84" x2="50" y2="50" stroke={stroke} strokeWidth="1" opacity={0.5} />
      <Line x1="92" y1="84" x2="50" y2="50" stroke={stroke} strokeWidth="1" opacity={0.5} />
    </G>
  );
}

// d6 — isometric cube (top, left, right faces)
function D6({ color, stroke }: ShapeProps) {
  return (
    <G>
      {/* main hexagon silhouette */}
      <Polygon
        points="50,8 88,30 88,74 50,96 12,74 12,30"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* interior edges of cube */}
      <Line x1="50" y1="8" x2="50" y2="52" stroke={stroke} strokeWidth="1.5" opacity={0.55} />
      <Line x1="50" y1="52" x2="12" y2="30" stroke={stroke} strokeWidth="1.5" opacity={0.55} />
      <Line x1="50" y1="52" x2="88" y2="30" stroke={stroke} strokeWidth="1.5" opacity={0.55} />
    </G>
  );
}

// d8 — octahedron: diamond with horizontal midline
function D8({ color, stroke }: ShapeProps) {
  return (
    <G>
      <Polygon
        points="50,6 90,50 50,94 10,50"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Line x1="10" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth="1.2" opacity={0.55} />
      <Line x1="50" y1="6" x2="50" y2="50" stroke={stroke} strokeWidth="1" opacity={0.35} />
      <Line x1="50" y1="50" x2="50" y2="94" stroke={stroke} strokeWidth="1" opacity={0.35} />
    </G>
  );
}

// d10 — pentagonal trapezohedron (kite/diamond with pentagonal ridge)
function D10({ color, stroke }: ShapeProps) {
  return (
    <G>
      <Polygon
        points="50,6 90,40 78,84 22,84 10,40"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* front central diamond */}
      <Path
        d="M 50 6 L 78 84 L 22 84 Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        opacity={0.55}
      />
      <Line x1="10" y1="40" x2="50" y2="60" stroke={stroke} strokeWidth="1" opacity={0.5} />
      <Line x1="90" y1="40" x2="50" y2="60" stroke={stroke} strokeWidth="1" opacity={0.5} />
      <Line x1="50" y1="60" x2="50" y2="84" stroke={stroke} strokeWidth="1" opacity={0.5} />
    </G>
  );
}

// d12 — dodecahedron: outer pentagon-hexagon with inner pentagon
function D12({ color, stroke }: ShapeProps) {
  return (
    <G>
      <Polygon
        points="50,6 92,32 82,80 18,80 8,32"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* inner pentagon for facets */}
      <Polygon
        points="50,26 74,42 66,72 34,72 26,42"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        opacity={0.5}
      />
      <Line x1="50" y1="6" x2="50" y2="26" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="92" y1="32" x2="74" y2="42" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="8" y1="32" x2="26" y2="42" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="82" y1="80" x2="66" y2="72" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="18" y1="80" x2="34" y2="72" stroke={stroke} strokeWidth="1" opacity={0.45} />
    </G>
  );
}

// d20 — icosahedron: outer hexagon with triangular grid
function D20({ color, stroke }: ShapeProps) {
  return (
    <G>
      {/* outer hex silhouette */}
      <Polygon
        points="50,6 90,30 90,70 50,94 10,70 10,30"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* central triangle (front face) */}
      <Polygon
        points="50,26 74,66 26,66"
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        opacity={0.6}
      />
      {/* connecting edges to outer vertices */}
      <Line x1="50" y1="6" x2="50" y2="26" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="90" y1="30" x2="74" y2="66" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="10" y1="30" x2="26" y2="66" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="90" y1="70" x2="74" y2="66" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="10" y1="70" x2="26" y2="66" stroke={stroke} strokeWidth="1" opacity={0.45} />
      <Line x1="50" y1="94" x2="50" y2="66" stroke={stroke} strokeWidth="1" opacity={0.45} />
    </G>
  );
}

// d100 — percentile die: same shape as d10 with distinctive "%" hint via corner
function D100({ color, stroke }: ShapeProps) {
  return (
    <G>
      <Polygon
        points="50,6 90,40 78,84 22,84 10,40"
        fill={color}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M 50 6 L 78 84 L 22 84 Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        opacity={0.55}
      />
      <Line x1="10" y1="40" x2="50" y2="60" stroke={stroke} strokeWidth="1" opacity={0.5} />
      <Line x1="90" y1="40" x2="50" y2="60" stroke={stroke} strokeWidth="1" opacity={0.5} />
    </G>
  );
}
