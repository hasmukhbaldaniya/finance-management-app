import { formatDateTime } from "@/utils/helpers/format.helper";
import type { SplitRequestExpenseSnapshot } from "@/types/split-request.type";

function formatFieldValue(fieldType: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (fieldType === "date" || fieldType === "date_time") {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : formatDateTime(parsed);
  }
  return String(value);
}

// A read-only rendering of the original expense being split — every field
// is shown regardless of conditionalVisibility, since this is a fixed
// historical snapshot for an invited colleague to review, not an editable
// form (a deliberate simplification versus the live ExpenseDynamicForm).
export function SplitRequestExpenseSnapshotView({ expense }: { expense: SplitRequestExpenseSnapshot }) {
  const orderedFields = [...expense.fields].sort((a, b) => a.id - b.id);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{expense.categoryName}</span>
        <span className="text-muted-foreground">{expense.claimName ?? (expense.isTripLinked ? "Trip-linked claim" : "—")}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {orderedFields.map((field) => (
          <div key={field.id} className="contents">
            <dt className="text-muted-foreground">{field.fieldName}</dt>
            <dd>{formatFieldValue(field.fieldType, expense.fieldValues[String(field.id)])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
