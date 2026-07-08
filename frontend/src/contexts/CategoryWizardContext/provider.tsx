"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CategoryWizardContext, type CategoryWizardState } from "./context";
import type { CategoryField, CategoryPolicy, CategoryStatus } from "@/types/category.type";

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
  const [skipNextLoadForCategoryId, setSkipNextLoadForCategoryId] = useState<number | null>(null);

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
    setSkipNextLoadForCategoryId(null);
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
      skipNextLoadForCategoryId,
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
      setSkipNextLoadForCategoryId,
      markStepReached,
      loadFromSnapshot,
      reset,
    }),
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
      skipNextLoadForCategoryId,
    ]
  );

  return <CategoryWizardContext.Provider value={value}>{children}</CategoryWizardContext.Provider>;
}
