"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { ExpenseSummaryReport } from "@/components/report/expense-summary-report";
import { RedFlaggedExpensesReport } from "@/components/report/red-flagged-expenses-report";
import { TripCostReport } from "@/components/report/trip-cost-report";

// 028-reports.md — three read-only, organization-wide reports (Company
// Administrator only; org-wide read access is requireOwner-gated on
// claim-service). Deliberately has no Claim Status/Aging report and no
// Approved Amount/Variance column on Trip Cost — both depend on the
// Approvals epic (029), which is on hold.
const TABS = ["Expense Summary", "Trip Cost", "Red-Flagged Expenses"] as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
        Reports
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
          {TABS.map((label) => (
            <Tab key={label} value={label} label={label} />
          ))}
        </Tabs>
      </Box>

      {tab === "Expense Summary" ? <ExpenseSummaryReport /> : null}
      {tab === "Trip Cost" ? <TripCostReport /> : null}
      {tab === "Red-Flagged Expenses" ? <RedFlaggedExpensesReport /> : null}
    </Stack>
  );
}
