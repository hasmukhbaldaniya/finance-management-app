"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { ClaimCostReport } from "@/components/report/claim-cost-report";
import { ExpenseSummaryReport } from "@/components/report/expense-summary-report";
import { RedFlaggedExpensesReport } from "@/components/report/red-flagged-expenses-report";
import { TripCostReport } from "@/components/report/trip-cost-report";

// 028-reports.md's four read-only, organization-wide reports now live here
// (moved off the standalone /reports screen, at explicit request) —
// Company Administrator only; org-wide read access is requireOwner-gated
// on claim-service. Deliberately has no Claim Status/Aging report and no
// Approved Amount/Variance column on Trip Cost — both depend on the
// Approvals epic (029), which is on hold.
const TABS = ["Expense Summary", "Claim Cost", "Trip Cost", "Red-Flagged Expenses"] as const;

export default function DashboardPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
          {TABS.map((label) => (
            <Tab key={label} value={label} label={label} />
          ))}
        </Tabs>
      </Box>

      {tab === "Expense Summary" ? <ExpenseSummaryReport /> : null}
      {tab === "Claim Cost" ? <ClaimCostReport /> : null}
      {tab === "Trip Cost" ? <TripCostReport /> : null}
      {tab === "Red-Flagged Expenses" ? <RedFlaggedExpensesReport /> : null}
    </Stack>
  );
}
