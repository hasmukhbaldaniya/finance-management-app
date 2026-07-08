"use client";

import { useEffect, useState } from "react";
import { getCategoryDetail } from "@/apis/category";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

// Shared by every /[id]/<step>/page.tsx — always refetches on mount (rather
// than trusting whatever's already in context) so a deep link from the
// listing's Edit icon, or simply navigating back into the wizard later, is
// never stale. Cheap: one GET per step visit, matching 008 edit page's own
// always-refetch precedent.
export function useLoadCategory(categoryId: number) {
  const wizard = useCategoryWizard();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    // Right after Step 1 creates a brand-new category in a Duplicate
    // session, context already holds the source's copied fields/policies —
    // this category has nothing saved server-side for them yet, so skip
    // the fetch this one time instead of overwriting that copied data with
    // an empty snapshot. One-time: cleared immediately so a later revisit
    // of this same step still refetches normally.
    if (wizard.skipNextLoadForCategoryId === categoryId) {
      wizard.setSkipNextLoadForCategoryId(null);
      setIsLoading(false);
      return;
    }

    getCategoryDetail(categoryId)
      .then((response) => {
        if (cancelled) return;
        wizard.loadFromSnapshot({
          id: response.category.id,
          status: response.category.status,
          name: response.category.name,
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
        if (cancelled) return;
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  return { isLoading, loadError };
}
