"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CategoryWizardContext, type CategoryWizardState } from "./context";
import type { CategoryField, CategoryPolicy, CategoryStatus, CategoryWizardStep } from "@/types/category.type";

function computeHighestStepReached(snapshot: {
  status?: CategoryStatus;
  fields: CategoryField[];
  claimPolicies: CategoryPolicy[];
  exceptionPolicies: CategoryPolicy[];
  enableProjectPolicies: boolean;
  projectPolicies: CategoryPolicy[];
}): number {
  if (snapshot.status === "active") return 3;
  if (snapshot.enableProjectPolicies || snapshot.projectPolicies.length > 0) return 3;
  if (snapshot.claimPolicies.length > 0 || snapshot.exceptionPolicies.length > 0) return 2;
  if (snapshot.fields.length > 0) return 1;
  return 0;
}

export function CategoryWizardProvider({ children }: { children: ReactNode }) {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<CategoryStatus | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ziptrripCategoryIds, setZiptrripCategoryIds] = useState<string[]>([]);
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [claimPolicies, setClaimPolicies] = useState<CategoryPolicy[]>([]);
  const [exceptionPolicies, setExceptionPolicies] = useState<CategoryPolicy[]>([]);
  const [enableProjectPolicies, setEnableProjectPolicies] = useState(false);
  const [projectPolicies, setProjectPolicies] = useState<CategoryPolicy[]>([]);
  const [highestStepIndexReached, setHighestStepIndexReached] = useState(0);
  const [skipLoadForCategoryId, setSkipLoadForCategoryId] = useState<number | null>(null);
  const [consumedSkipSteps, setConsumedSkipSteps] = useState<CategoryWizardStep[]>([]);

  function reset(): void {
    setCategoryId(null);
    setStatus(null);
    setName("");
    setDescription("");
    setZiptrripCategoryIds([]);
    setFields([]);
    setClaimPolicies([]);
    setExceptionPolicies([]);
    setEnableProjectPolicies(false);
    setProjectPolicies([]);
    setHighestStepIndexReached(0);
    setSkipLoadForCategoryId(null);
    setConsumedSkipSteps([]);
  }

  function startSkippingLoadsFor(categoryId: number): void {
    setSkipLoadForCategoryId(categoryId);
    setConsumedSkipSteps([]);
  }

  // Per-step, not one-shot: each of the 4 steps consumes its own skip
  // exactly once (see context.ts's own doc comment for why this replaced a
  // single one-shot flag that only ever protected whichever step page the
  // admin happened to visit first).
  function consumeSkipLoad(categoryId: number, step: CategoryWizardStep): boolean {
    if (skipLoadForCategoryId !== categoryId || consumedSkipSteps.includes(step)) return false;
    setConsumedSkipSteps((previous) => [...previous, step]);
    return true;
  }

  function loadFromSnapshot(snapshot: {
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
  }): void {
    if (snapshot.id !== undefined) setCategoryId(snapshot.id);
    if (snapshot.status !== undefined) setStatus(snapshot.status);
    setName(snapshot.name);
    setDescription(snapshot.description ?? "");
    setZiptrripCategoryIds(snapshot.ziptrripCategoryKeys);
    setFields(snapshot.fields);
    setClaimPolicies(snapshot.claimPolicies);
    setExceptionPolicies(snapshot.exceptionPolicies);
    setEnableProjectPolicies(snapshot.enableProjectPolicies);
    setProjectPolicies(snapshot.projectPolicies);
    setHighestStepIndexReached((current) => Math.max(current, computeHighestStepReached(snapshot)));
  }

  function markStepReached(stepIndex: number): void {
    setHighestStepIndexReached((current) => Math.max(current, stepIndex));
  }

  const value = useMemo<CategoryWizardState>(
    () => ({
      categoryId,
      status,
      name,
      description,
      ziptrripCategoryIds,
      fields,
      claimPolicies,
      exceptionPolicies,
      enableProjectPolicies,
      projectPolicies,
      highestStepIndexReached,
      skipLoadForCategoryId,
      consumedSkipSteps,
      setCategoryId,
      setStatus,
      setName,
      setDescription,
      setZiptrripCategoryIds,
      setFields,
      setClaimPolicies,
      setExceptionPolicies,
      setEnableProjectPolicies,
      setProjectPolicies,
      startSkippingLoadsFor,
      consumeSkipLoad,
      markStepReached,
      loadFromSnapshot,
      reset,
    }),
    // consumeSkipLoad closes over skipLoadForCategoryId/consumedSkipSteps,
    // both already listed below; adding the function itself here would
    // invalidate this memo every render, since it isn't wrapped in its own
    // useCallback (its own deps would be identical to this memo's own).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      categoryId,
      status,
      name,
      description,
      ziptrripCategoryIds,
      fields,
      claimPolicies,
      exceptionPolicies,
      enableProjectPolicies,
      projectPolicies,
      highestStepIndexReached,
      skipLoadForCategoryId,
      consumedSkipSteps,
    ]
  );

  return <CategoryWizardContext.Provider value={value}>{children}</CategoryWizardContext.Provider>;
}
