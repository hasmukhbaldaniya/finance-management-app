"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { getCategoryDetail } from "@/apis/category";
import { BasicDetailsForm } from "@/components/category/basic-details-form";
import { WizardPageShell } from "@/components/category/wizard-page-shell";
import { Spinner } from "@/components/ui/spinner";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

function NewCategoryPage() {
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get("duplicateFrom");
  const wizard = useCategoryWizard();
  const [isLoading, setIsLoading] = useState(Boolean(duplicateFromId));
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    wizard.reset();

    if (!duplicateFromId) return;

    getCategoryDetail(Number(duplicateFromId))
      .then((response) => {
        wizard.loadFromSnapshot({
          // No `id`/`status` here — a duplicate is a brand-new, unrelated
          // category (015's Duplicate flow), and the source's own id/status
          // must never leak into this session.
          name: "",
          description: response.category.description,
          ziptrripCategoryKeys: response.category.ziptrripCategoryKeys,
          fields: response.category.fields,
          claimPolicies: response.category.claimPolicies,
          exceptionPolicies: response.category.exceptionPolicies,
          enableProjectPolicies: response.category.enableProjectPolicies,
          projectPolicies: response.category.projectPolicies,
        });
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateFromId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <WizardPageShell categoryId={null} currentStep="basicDetails" highestStepIndexReached={0} heading="Create Category">
      <BasicDetailsForm />
    </WizardPageShell>
  );
}

export default function NewCategoryPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size={24} /></div>}>
      <NewCategoryPage />
    </Suspense>
  );
}
