import { ConditionsList } from "@/components/conditions-list";
import { ReportLink } from "@/components/feedback/report-link";
import { conditionRows, conditionsOnly2024 } from "@/lib/conditions-list";
import { getCorrectedConditions } from "@/lib/corrected-content";

export const metadata = { title: "Condizioni — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function ConditionsPage() {
  const rows = conditionRows((await getCorrectedConditions()).list);
  return (
    <>
      <ConditionsList rows={rows} only2024={conditionsOnly2024()} />
      <ReportLink />
    </>
  );
}
