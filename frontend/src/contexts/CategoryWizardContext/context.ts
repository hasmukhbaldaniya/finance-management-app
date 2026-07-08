import { createContext } from "react";
import type { CategoryField, CategoryPolicy, CategoryStatus, CategoryWizardStep } from "@/types/category.type";

export type CategoryWizardState = {
  categoryId: number | null;
  status: CategoryStatus | null;
  name: string;
  description: string;
  ziptrripCategoryIds: string[];
  fields: CategoryField[];
  claimPolicies: CategoryPolicy[];
  exceptionPolicies: CategoryPolicy[];
  enableProjectPolicies: boolean;
  projectPolicies: CategoryPolicy[];
  // The furthest step reached this session — pre-seeded from existing data
  // when an already-in-progress category loads, so reopening a draft or
  // active category shows the right steps as already-completed immediately,
  // not just the ones revisited in this particular browser session.
  highestStepIndexReached: number;
  setCategoryId: (categoryId: number | null) => void;
  setStatus: (status: CategoryStatus | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setZiptrripCategoryIds: (ziptrripCategoryIds: string[]) => void;
  setFields: (fields: CategoryField[]) => void;
  setClaimPolicies: (claimPolicies: CategoryPolicy[]) => void;
  setExceptionPolicies: (exceptionPolicies: CategoryPolicy[]) => void;
  setEnableProjectPolicies: (enableProjectPolicies: boolean) => void;
  setProjectPolicies: (projectPolicies: CategoryPolicy[]) => void;
  markStepReached: (stepIndex: number) => void;
  loadFromSnapshot: (snapshot: {
    id?: number;
    status?: CategoryStatus;
    name: string;
    description: string | null;
    ziptrripCategoryKeys: string[];
    fields: CategoryField[];
    claimPolicies: CategoryPolicy[];
    exceptionPolicies: CategoryPolicy[];
    enableProjectPolicies: boolean;
    projectPolicies: CategoryPolicy[];
  }) => void;
  reset: () => void;
};

export type CategoryWizardStepKey = CategoryWizardStep;

export const CategoryWizardContext = createContext<CategoryWizardState | null>(null);
