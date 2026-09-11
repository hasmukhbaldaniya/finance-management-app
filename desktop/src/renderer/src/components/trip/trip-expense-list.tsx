import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr, formatTripOverviewDate } from "@/utils/helpers/format.helper";
import type { TripExpenseRow } from "@/types/trip.type";

type TripExpenseListProps = {
  expenses: TripExpenseRow[];
};

// 020's Trip Details "Expenses" panel — flattened across every Claim linked
// to this trip via tripId (see trip.controller.ts's getTripDetail), one row
// per Expense rather than grouped by claim. Renders only once there's at
// least one row; its sibling EmptyExpenseList still covers the zero case.
export function TripExpenseList({ expenses }: TripExpenseListProps) {
  return (
    <Stack sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Expenses
        </Typography>
      </Box>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Expense Date</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{expense.categoryName}</TableCell>
              <TableCell>{expense.expenseDate ? formatTripOverviewDate(expense.expenseDate) : "—"}</TableCell>
              <TableCell>₹{formatInr(expense.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
