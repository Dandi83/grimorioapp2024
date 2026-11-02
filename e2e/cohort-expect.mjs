// PROMPT 47: what «Chi resta davvero» must show for a person who arrived `arrived` days ago and came back `back` days
// ago, at the moment `now`, with the rule of lib/analytics-stats.ts cohorts(): weeks Monday to Sunday in Rome, a week
// «gap» after counted only once its Sunday is before today (Rome), else «—». Shared by e2e/approfondimenti.spec.mjs and
// tests/cohort-dates.cjs (which checks it on fixed dates: Sunday evening, Monday morning, end of month, clock changes).
export const romeDay = date => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(date);
const shift = (day, days) => { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
export const mondayOf = day => shift(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));

export function expectedCohort(now, arrived, back) {
  const today = romeDay(now);
  const week = mondayOf(romeDay(new Date(now.getTime() - arrived * 864e5)));
  const backWeek = mondayOf(romeDay(new Date(now.getTime() - back * 864e5)));
  const cells = [1, 2, 4].map(gap => {
    const target = shift(week, 7 * gap);
    if (shift(target, 6) >= today) return "—";
    return target === backWeek ? "100%" : "0%";
  });
  return { week, cells };
}
