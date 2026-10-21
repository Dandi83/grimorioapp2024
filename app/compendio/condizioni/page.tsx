import { ConditionsList } from "@/components/conditions-list";
import { conditionRows } from "@/lib/conditions-list";

export const metadata = { title: "Condizioni — Il Grimorio.App" };

export default function ConditionsPage() {
  return <ConditionsList rows={conditionRows()} />;
}
