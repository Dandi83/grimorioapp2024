import { shortDay, dayLabel, type HourBar } from "@/lib/analytics-stats";

// Charts of /admin/statistiche, drawn on the server as SVG: no chart library, nothing loaded from elsewhere.
// Each one has an accessible label with the summary of its numbers.
const BORDEAUX = "#7A1F2B", AMBER = "#E0A21A", DARK = "#2B2118", MUTED = "#5E4E3E", LINE = "#DDCFAE";

/** People per day, the area under the line, and a dashed amber line for each marked event of the period. */
export function DailyChart({ days, markers, name = "giorni", what = "Persone" }: { days: { day: string; visitors: number }[]; markers: { giorno: string; etichetta: string }[]; name?: string; what?: string }) {
  const width = 340, height = 180, left = 28, right = 8, top = 34, bottom = 22;
  const max = Math.max(1, ...days.map(row => row.visitors));
  const step = days.length > 1 ? (width - left - right) / (days.length - 1) : 0;
  const x = (index: number) => left + (days.length > 1 ? index * step : (width - left - right) / 2);
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max);
  const points = days.map((row, index) => `${x(index).toFixed(1)},${y(row.visitors).toFixed(1)}`);
  const base = (height - bottom).toFixed(1);
  const area = points.length ? `M${x(0).toFixed(1)},${base} L${points.join(" L")} L${x(days.length - 1).toFixed(1)},${base} Z` : "";
  const shown = markers.filter(marker => days.some(row => row.day === marker.giorno));
  const peak = days.reduce((best, row) => (row.visitors > best.visitors ? row : best), days[0] ?? { day: "", visitors: 0 });
  const label = days.length
    ? `${what} al giorno dal ${dayLabel(days[0].day)} al ${dayLabel(days[days.length - 1].day)}: massimo ${peak.visitors} ${peak.visitors ? `il ${dayLabel(peak.day)}` : ""}.${shown.length ? ` Eventi: ${shown.map(marker => `${marker.etichetta} il ${dayLabel(marker.giorno)}`).join("; ")}.` : ""}`
    : "Nessun dato nel periodo.";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} data-chart={name} className="block h-auto w-full">
      <title>{label}</title>
      {[0, 0.5, 1].map(part => (
        <g key={part}>
          <line x1={left} x2={width - right} y1={y(max * part)} y2={y(max * part)} stroke={LINE} strokeWidth="1" />
          <text x={left - 4} y={y(max * part) + 3} textAnchor="end" fontSize="9" fill={MUTED}>{Math.round(max * part)}</text>
        </g>
      ))}
      {area && <path d={area} fill={BORDEAUX} fillOpacity="0.14" />}
      {points.length > 1 && <polyline points={points.join(" ")} fill="none" stroke={BORDEAUX} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
      {points.length === 1 && <circle cx={x(0)} cy={y(days[0].visitors)} r="3.5" fill={BORDEAUX} />}
      {shown.map((marker, index) => {
        const at = x(days.findIndex(row => row.day === marker.giorno));
        const text = marker.etichetta.length > 26 ? `${marker.etichetta.slice(0, 25)}…` : marker.etichetta;
        return (
          <g key={`${marker.giorno}-${index}`} data-marker={marker.giorno}>
            <line x1={at} x2={at} y1={top - 6} y2={height - bottom} stroke={AMBER} strokeWidth="1.6" strokeDasharray="4 3" />
            <text x={Math.min(Math.max(at, left + 40), width - right - 40)} y={10 + (index % 2) * 11} textAnchor="middle" fontSize="9" fontWeight="700" fill={DARK}>{text}</text>
          </g>
        );
      })}
      {days.length > 0 && (
        <>
          <text x={x(0)} y={height - 6} fontSize="9" fill={MUTED}>{shortDay(days[0].day)}</text>
          <text x={x(days.length - 1)} y={height - 6} textAnchor="end" fontSize="9" fill={MUTED}>{shortDay(days[days.length - 1].day)}</text>
        </>
      )}
    </svg>
  );
}

/**
 * «Andamento ora per ora» (PROMPT 30): the 24 bars of «Ultime 24 ore», 60 minutes each, the clock every 4 bars,
 * and a dashed amber line on the hour of each marked event (markers: the index of its bar and its text).
 */
export function HourlyChart({ bars, markers, name = "ore", what = "Persone" }: { bars: HourBar[]; markers: { bar: number; etichetta: string }[]; name?: string; what?: string }) {
  const width = 340, height = 180, left = 28, right = 8, top = 34, bottom = 22;
  const max = Math.max(1, ...bars.map(row => row.visitors));
  const slot = (width - left - right) / Math.max(1, bars.length), gap = 2;
  const x = (index: number) => left + index * slot;
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max);
  const peak = bars.reduce<HourBar | null>((best, row) => (row.visitors > (best?.visitors ?? 0) ? row : best), null);
  const shown = markers.filter(marker => marker.bar >= 0 && marker.bar < bars.length);
  const label = bars.length
    ? `${what} ora per ora dalle ${bars[0].label.slice(0, 5)} alle ${bars[bars.length - 1].label.slice(6, 11)}: ${peak ? `massimo ${peak.visitors} tra le ${peak.label}` : "nessuna visita"}.${shown.length ? ` Eventi: ${shown.map(marker => `${marker.etichetta} tra le ${bars[marker.bar].label}`).join("; ")}.` : ""}`
    : "Nessun dato nel periodo.";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} data-chart={name} className="block h-auto w-full">
      <title>{label}</title>
      {[0, 0.5, 1].map(part => (
        <g key={part}>
          <line x1={left} x2={width - right} y1={y(max * part)} y2={y(max * part)} stroke={LINE} strokeWidth="1" />
          <text x={left - 4} y={y(max * part) + 3} textAnchor="end" fontSize="9" fill={MUTED}>{Math.round(max * part)}</text>
        </g>
      ))}
      {bars.map((row, index) => (
        <rect key={row.hour} x={x(index) + gap / 2} width={Math.max(1, slot - gap)} y={y(row.visitors)} height={Math.max(0, height - bottom - y(row.visitors))}
          fill={BORDEAUX} fillOpacity={row.visitors ? 0.85 : 0} data-hour-bar={row.label} data-visitors={row.visitors} />
      ))}
      {shown.map((marker, index) => {
        const at = x(marker.bar) + slot / 2;
        const text = marker.etichetta.length > 26 ? `${marker.etichetta.slice(0, 25)}…` : marker.etichetta;
        return (
          <g key={`${marker.bar}-${index}`} data-marker={bars[marker.bar].label}>
            <line x1={at} x2={at} y1={top - 6} y2={height - bottom} stroke={AMBER} strokeWidth="1.6" strokeDasharray="4 3" />
            <text x={Math.min(Math.max(at, left + 40), width - right - 40)} y={10 + (index % 2) * 11} textAnchor="middle" fontSize="9" fontWeight="700" fill={DARK}>{text}</text>
          </g>
        );
      })}
      {bars.map((row, index) => index % 4 === 0 && (
        <text key={`t-${row.hour}`} x={x(index) + slot / 2} y={height - 6} textAnchor="middle" fontSize="8" fill={MUTED} data-hour-tick="">{row.label.slice(0, 5)}</text>
      ))}
    </svg>
  );
}

/** A ring with a percentage in the middle. */
export function Ring({ percent, label }: { percent: number; label: string }) {
  const radius = 34, length = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 88 88" role="img" aria-label={label} data-chart="anello" className="h-24 w-24 shrink-0">
      <title>{label}</title>
      <circle cx="44" cy="44" r={radius} fill="none" stroke={LINE} strokeWidth="10" />
      <circle cx="44" cy="44" r={radius} fill="none" stroke={BORDEAUX} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(length * Math.min(100, Math.max(0, percent))) / 100} ${length}`} transform="rotate(-90 44 44)" />
      <text x="44" y="50" textAnchor="middle" fontSize="18" fontWeight="700" fill={DARK} fontFamily="var(--font-serif), serif">{percent}%</text>
    </svg>
  );
}

/** Horizontal bars with the number and the share of each row. */
export function Bars({ rows, label }: { rows: { label: string; value: number }[]; label: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...rows.map(row => row.value));
  const height = rows.length * 30;
  return (
    <svg viewBox={`0 0 340 ${height}`} role="img" aria-label={label} data-chart="barre" className="block h-auto w-full">
      <title>{label}</title>
      {rows.map((row, index) => {
        const percent = total ? Math.round((row.value / total) * 100) : 0;
        return (
          <g key={row.label} transform={`translate(0 ${index * 30})`}>
            <text x="0" y="17" fontSize="12" fill={DARK}>{row.label}</text>
            <rect x="104" y="6" width="176" height="14" rx="7" fill={LINE} fillOpacity="0.55" />
            <rect x="104" y="6" width={(176 * row.value) / max} height="14" rx="7" fill={index === 0 ? AMBER : BORDEAUX} />
            <text x="340" y="17" textAnchor="end" fontSize="12" fontWeight="700" fill={DARK}>{percent}%</text>
          </g>
        );
      })}
    </svg>
  );
}
