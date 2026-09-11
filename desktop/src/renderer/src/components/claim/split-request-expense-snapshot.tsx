import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Stack spacing={1.5} sx={{ borderRadius: 2, border: 1, borderColor: "divider", p: 2 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem" }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {expense.categoryName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {expense.claimName ?? (expense.isTripLinked ? "Trip-linked claim" : "—")}
        </Typography>
      </Stack>
      <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1, fontSize: "0.875rem", m: 0 }}>
        {orderedFields.map((field) => (
          <Box key={field.id} sx={{ display: "contents" }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {field.fieldName}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {formatFieldValue(field.fieldType, expense.fieldValues[String(field.id)])}
            </Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
