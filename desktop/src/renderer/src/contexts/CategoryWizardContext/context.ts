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
  // Set right after Step 1's create call returns a brand-new id for a
  // Duplicate session — the source category's copied fields/policies already
  // live in context at that point, but they only exist server-side under the
  // *source* category, not this new one yet. Without this, each step page's
  // own useLoadCategory would refetch this brand-new (still-empty for
  // whichever steps haven't been saved yet) category and clobber the copied
  // data before the admin ever sees it. Per-step, not one-shot: each of the
  // 4 steps consumes its own skip exactly once (tracked in
  // consumedSkipSteps below), since Step 2's own page visit shouldn't burn
  // the only skip before Step 3/4 ever get a chance to use theirs.
  skipLoadForCategoryId: number | null;
  consumedSkipSteps: CategoryWizardStep[];
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
  startSkippingLoadsFor: (categoryId: number) => void;
  // Returns true exactly once per (categoryId, step) pair — the caller
  // should skip its own fetch when this returns true, and fetch normally
  // (as always) when it returns false, including every time after the
  // first for that step.
  consumeSkipLoad: (categoryId: number, step: CategoryWizardStep) => boolean;
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
