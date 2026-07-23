"use client";

import { useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PoliciesAndApprovalsForm } from "@/components/category/policies-and-approvals-form";
import { WizardPageShell } from "@/components/category/wizard-page-shell";
import { useLoadCategory } from "@/components/category/use-load-category";
import { Spinner } from "@/components/ui/spinner";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";

export default function PoliciesAndApprovalsPage() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);
  const wizard = useCategoryWizard();
  const { isLoading, loadError } = useLoadCategory(categoryId, "policiesAndApprovals");

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Typography variant="body2" color="error" sx={{ px: 3, py: 8, textAlign: "center" }}>
        {loadError}
      </Typography>
    );
  }

  return (
    <WizardPageShell
      categoryId={categoryId}
      currentStep="policiesAndApprovals"
      highestStepIndexReached={wizard.highestStepIndexReached}
      heading={wizard.name || "Edit Category"}
    >
      <PoliciesAndApprovalsForm categoryId={categoryId} />
    </WizardPageShell>
  );
}
