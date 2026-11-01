import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { ConditionsList } from "@/components/conditions-list";
import { ReportLink } from "@/components/feedback/report-link";
import { conditionRows, conditionsOnly2024 } from "@/lib/conditions-list";
import { getCorrectedConditions } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";

export const metadata = pageMetadata({ name: "Condizioni", section: "Compendio", path: "/compendio/condizioni",
  description: "Le condizioni di D&D 5e in italiano, 2014 e 2024: accecato, avvelenato, prono, spaventato e tutte le altre, con cosa comportano." });

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function ConditionsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("condizioni");
  const rows = conditionRows((await getCorrectedConditions()).list);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Condizioni", path: "/compendio/condizioni" }]} />
    <>
      <ConditionsList rows={rows} only2024={conditionsOnly2024()} />
      <ReportLink />
    </>
    </>
  );
}
