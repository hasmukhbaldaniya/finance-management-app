import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { WizardStepNav } from "./wizard-step-nav";
import type { CategoryWizardStep } from "@/types/category.type";

type WizardPageShellProps = {
  categoryId: number | null;
  currentStep: CategoryWizardStep;
  highestStepIndexReached: number;
  heading: string;
  children: ReactNode;
};

export function WizardPageShell({ categoryId, currentStep, highestStepIndexReached, heading, children }: WizardPageShellProps) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 3, md: 5 }} sx={{ mx: "auto", maxWidth: 1440, px: 3, py: 4 }}>
      <WizardStepNav categoryId={categoryId} currentStep={currentStep} highestStepIndexReached={highestStepIndexReached} />
      <Stack spacing={3} sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {heading}
        </Typography>
        <Box>{children}</Box>
      </Stack>
    </Stack>
  );
}
