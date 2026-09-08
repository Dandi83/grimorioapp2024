type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

interface Die3DProps {
  sides: DieSides;
  value: number | null;
  size?: number;
}

/**
 * Dado poliedrico "3D" disegnato in SVG: ogni tipo ha la propria silhouette
 * e una tassellatura di facce con gradienti oro metallico differenziati, così
 * le facce esposte sembrano prendere luce da angolazioni diverse. Il numero è
 * inciso sulla faccia frontale (scuro su oro) per il massimo contrasto.
 */
export function Die3D({ sides, value, size = 180 }: Die3DProps) {
  const display = value === null ? "" : String(value);
  // Font più piccolo per numeri lunghi (100, 00).
  const fs = display.length >= 3 ? 30 : display.length === 2 ? 40 : 52;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={value === null ? `Dado a ${sides} facce` : `Risultato ${value}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Gradienti facce: dalla più chiara (luce) alla più scura (ombra) */}
        <linearGradient id="g-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="55%" stopColor="#E7C24C" />
          <stop offset="100%" stopColor="#B8901F" />
        </linearGradient>
        <linearGradient id="g-mid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9B23F" />
          <stop offset="100%" stopColor="#96741B" />
        </linearGradient>
        <linearGradient id="g-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8A6C18" />
          <stop offset="100%" stopColor="#5C4409" />
        </linearGradient>
        <linearGradient id="g-darker" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6E5411" />
          <stop offset="100%" stopColor="#443206" />
        </linearGradient>
        <radialGradient id="g-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="die-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="7"
            floodColor="#000"
            floodOpacity="0.55"
          />
        </filter>
      </defs>

      {/* Ombra a terra */}
      <ellipse cx="100" cy="182" rx="58" ry="12" fill="url(#g-shadow)" />

      <g filter="url(#die-shadow)">
        <Facets sides={sides} />
      </g>

      {display && (
        <text
          x="100"
          y="104"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-serif), Georgia, serif"
          fontWeight="700"
          fontSize={fs}
          fill="#2a2005"
          style={{ paintOrder: "stroke" }}
          stroke="rgba(255,240,190,0.35)"
          strokeWidth="0.75"
        >
          {display}
        </text>
      )}
    </svg>
  );
}

/**
 * Le facce di ogni poliedro. Ogni <polygon> usa un gradiente diverso così le
 * facce laterali/superiori/inferiori leggono come piani orientati nello spazio.
 * La faccia frontale (g-lit) è quella che ospita il numero.
 */
function Facets({ sides }: { sides: DieSides }) {
  switch (sides) {
    case 4:
      // Tetraedro: triangolo grande con 3 sotto-facce
      return (
        <>
          <polygon points="100,18 178,168 22,168" fill="url(#g-lit)" />
          <polygon points="100,18 100,140 22,168" fill="url(#g-mid)" />
          <polygon points="100,18 100,140 178,168" fill="url(#g-dark)" />
          <polyline
            points="100,18 100,140"
            fill="none"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1.5"
          />
        </>
      );
    case 6:
      // Cubo in prospettiva: faccia frontale + top + lato destro
      return (
        <>
          <polygon points="34,62 100,40 100,150 34,172" fill="url(#g-lit)" />
          <polygon points="100,40 166,62 166,172 100,150" fill="url(#g-dark)" />
          <polygon points="34,62 100,40 166,62 100,84" fill="url(#g-mid)" />
        </>
      );
    case 8:
      // Ottaedro: rombo con 4 spicchi
      return (
        <>
          <polygon points="100,16 100,100 22,100" fill="url(#g-lit)" />
          <polygon points="100,16 100,100 178,100" fill="url(#g-mid)" />
          <polygon points="100,184 100,100 22,100" fill="url(#g-dark)" />
          <polygon points="100,184 100,100 178,100" fill="url(#g-darker)" />
        </>
      );
    case 10:
    case 100:
      // Trapezoedro pentagonale (classico d10): losanga allungata
      return (
        <>
          <polygon points="100,14 138,74 100,116 62,74" fill="url(#g-lit)" />
          <polygon points="62,74 100,116 60,150 30,96" fill="url(#g-mid)" />
          <polygon points="138,74 100,116 140,150 170,96" fill="url(#g-dark)" />
          <polygon points="60,150 100,116 140,150 100,186" fill="url(#g-darker)" />
        </>
      );
    case 12:
      // Dodecaedro: pentagono centrale con corona di facce
      return <Polyhedron center={5} ringSides={5} />;
    case 20:
    default:
      // Icosaedro: triangolo centrale con corona di triangoli
      return <Polyhedron center={3} ringSides={6} />;
  }
}

/** Poligono centrale + corona di facce, usato per d12 e d20. */
function Polyhedron({ center, ringSides }: { center: number; ringSides: number }) {
  const cx = 100;
  const cy = 100;
  const rIn = center === 3 ? 46 : 40; // raggio faccia centrale
  const rOut = 86; // raggio silhouette esterna
  const grads = ["url(#g-mid)", "url(#g-dark)", "url(#g-darker)"];

  // Faccia centrale
  const centerPts = polygonPoints(cx, cy, rIn, center, center === 3 ? -90 : 90);

  // Silhouette esterna (poligono regolare) e corona
  const outer = polygonPoints(cx, cy, rOut, ringSides * 2, -90).split(" ");
  const innerVerts = polygonPoints(cx, cy, rIn, center, center === 3 ? -90 : 90)
    .split(" ")
    .map((p) => p.split(",").map(Number));

  // Corona: colleghiamo i vertici esterni per formare facce trapezoidali
  const ringFaces: string[] = [];
  const outerVerts = outer.map((p) => p.split(",").map(Number));
  for (let i = 0; i < outerVerts.length; i++) {
    const a = outerVerts[i];
    const b = outerVerts[(i + 1) % outerVerts.length];
    const inner = innerVerts[i % innerVerts.length];
    ringFaces.push(`${a[0]},${a[1]} ${b[0]},${b[1]} ${inner[0]},${inner[1]}`);
  }

  return (
    <>
      {/* silhouette */}
      <polygon
        points={outer.join(" ")}
        fill="url(#g-darker)"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
      />
      {/* corona di facce */}
      {ringFaces.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill={grads[i % grads.length]}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth="1"
        />
      ))}
      {/* faccia centrale illuminata (ospita il numero) */}
      <polygon
        points={centerPts}
        fill="url(#g-lit)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1.25"
      />
    </>
  );
}

function polygonPoints(
  cx: number,
  cy: number,
  r: number,
  n: number,
  startDeg: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
