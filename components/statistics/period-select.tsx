"use client";

import { useRouter } from "next/navigation";
import { PERIOD_ORDER, PERIODS, type Period } from "@/lib/analytics-stats";

/** The period of /admin/statistiche: the page is drawn again on the server for the chosen one. */
export function PeriodSelect({ value }: { value: Period }) {
  const router = useRouter();
  return (
    <label className="block">
      <span className="sr-only">Periodo</span>
      <select name="periodo" value={value} onChange={event => router.replace(`/admin/statistiche?periodo=${event.target.value}`, { scroll: false })}
        className="min-h-12 w-full rounded-xl border border-[#DDCFAE] bg-[#FFFBF0] px-4 text-base font-semibold text-[#2B2118] outline-none focus-visible:border-[#7A1F2B]">
        {PERIOD_ORDER.map(key => <option key={key} value={key}>{PERIODS[key]}</option>)}
      </select>
    </label>
  );
}
