import { ConditionsList } from "@/components/conditions-list";
import { conditionRows, conditionsOnly2024 } from "@/lib/conditions-list";

export const metadata = { title: "Condizioni — Il Grimorio.App" };

export default function ConditionsPage() {
  return <ConditionsList rows={conditionRows()} only2024={conditionsOnly2024()} />;
}
