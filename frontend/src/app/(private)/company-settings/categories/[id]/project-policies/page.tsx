"use client";

import { useParams } from "next/navigation";
import { ProjectPoliciesForm } from "@/components/category/project-policies-form";
import { WizardPageShell } from "@/components/category/wizard-page-shell";
import { useLoadCategory } from "@/components/category/use-load-category";
import { Spinner } from "@/components/ui/spinner";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";

export default function ProjectPoliciesPage() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);
  const wizard = useCategoryWizard();
  const { isLoading, loadError } = useLoadCategory(categoryId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  if (loadError) {
    return <p className="px-6 py-16 text-center text-sm text-destructive">{loadError}</p>;
  }

  return (
    <WizardPageShell
      categoryId={categoryId}
      currentStep="projectPolicies"
      highestStepIndexReached={wizard.highestStepIndexReached}
      heading={wizard.name || "Edit Category"}
    >
      <ProjectPoliciesForm categoryId={categoryId} />
    </WizardPageShell>
  );
}
