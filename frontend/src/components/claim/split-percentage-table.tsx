"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/utils/helpers/format.helper";
import type { EmployeeListItem } from "@/types/employee.type";

export type SplitMember = {
  employeeId: number;
  name: string;
  percentage: number;
  amount: number;
  isRequester: boolean;
};

// Displayed next to a staged split's "Edit Split"/"Edit Claim Split" trigger
// so who it's with is visible without reopening the dialog — the requester
// is left out since they're implied ("Split with: <colleagues>").
export function colleagueNamesLabel(members: SplitMember[]): string {
  return members
    .filter((member) => !member.isRequester)
    .map((member) => member.name)
    .join(", ");
}

// Reconstructs a minimal EmployeeListItem[] from a previously staged split's
// members, so reopening the dialog can prefill SplitAmongSelect's chips —
// only `id`/`firstName`/`lastName` are ever read from these for display, the
// rest are placeholders since a staged split only ever stores id + name.
export function membersToColleagues(members: SplitMember[]): EmployeeListItem[] {
  return members
    .filter((member) => !member.isRequester)
    .map((member) => {
      const [firstName, ...rest] = member.name.split(" ");
      return {
        id: member.employeeId,
        firstName: firstName ?? member.name,
        lastName: rest.join(" "),
        email: "",
        role: null,
        department: null,
        grade: null,
        countryCode: null,
        contactNumber: null,
        invitationStatus: "registered",
        status: "active",
      };
    });
}

// 027's even auto-redistribution — recomputed every time the member *set*
// changes (add/remove), never on a plain percentage/amount edit. The
// requester's row (always first) absorbs the remainder so whole-number
// percentages still sum to exactly 100 (e.g. 3 members -> 34/33/33).
export function distributeEvenly(members: { employeeId: number; name: string; isRequester: boolean }[], totalAmount: number): SplitMember[] {
  const count = members.length;
  if (count === 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return members.map((member, index) => {
    const percentage = base + (index < remainder ? 1 : 0);
    return {
      employeeId: member.employeeId,
      name: member.name,
      isRequester: member.isRequester,
      percentage,
      amount: Number(((percentage / 100) * totalAmount).toFixed(2)),
    };
  });
}

type SplitPercentageTableProps = {
  members: SplitMember[];
  totalAmount: number;
  onChange: (members: SplitMember[]) => void;
};

export function SplitPercentageTable({ members, totalAmount, onChange }: SplitPercentageTableProps) {
  function updatePercentage(employeeId: number, rawPercentage: string): void {
    const percentage = rawPercentage === "" ? 0 : Number(rawPercentage);
    if (Number.isNaN(percentage)) return;
    const amount = Number(((percentage / 100) * totalAmount).toFixed(2));
    onChange(members.map((member) => (member.employeeId === employeeId ? { ...member, percentage, amount } : member)));
  }

  function updateAmount(employeeId: number, rawAmount: string): void {
    const amount = rawAmount === "" ? 0 : Number(rawAmount);
    if (Number.isNaN(amount)) return;
    const percentage = totalAmount > 0 ? Number(((amount / totalAmount) * 100).toFixed(2)) : 0;
    onChange(members.map((member) => (member.employeeId === employeeId ? { ...member, percentage, amount } : member)));
  }

  const amountSum = members.reduce((total, member) => total + member.amount, 0);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", overflow: "hidden" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member Name</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.employeeId}>
                <TableCell>{member.isRequester ? `${member.name} (You)` : member.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={member.percentage}
                    onChange={(event) => updatePercentage(member.employeeId, event.target.value)}
                    sx={{ width: 96 }}
                    endAdornment={<InputAdornment position="end">%</InputAdornment>}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={member.amount}
                    onChange={(event) => updateAmount(member.employeeId, event.target.value)}
                    sx={{ width: 128 }}
                    startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 2, bgcolor: "success.light", px: 2, py: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "success.dark" }}>
          Total Amount
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "success.dark" }}>
          ₹{formatInr(amountSum)}
        </Typography>
      </Stack>
    </Stack>
  );
}
