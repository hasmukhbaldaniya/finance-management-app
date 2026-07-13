"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCategoryDetail, saveCategoryPolicies } from "@/apis/category";
import { getDepartments } from "@/apis/department";
import { getEmployees, getEmployeesForPicker } from "@/apis/employee";
import { getGrades } from "@/apis/grade";
import { getProjects } from "@/apis/project";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { CATEGORY_STEP_SEGMENTS, MAX_CLAIM_POLICIES, MAX_EXCEPTION_POLICIES } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { CategoryPolicy } from "@/types/category.type";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PlusIcon } from "@phosphor-icons/react";
import { PolicyCard } from "./policy-card";
import { createBlankPolicy, duplicatePolicy } from "./policy-factory";
import type { PolicyPickerOptions } from "./policy-shared-types";
import { WizardFooter } from "./wizard-footer";

const EMPLOYEE_LIST_PAGE_SIZE = 100;

type PoliciesAndApprovalsFormProps = {
  categoryId: number;
};

export function PoliciesAndApprovalsForm({ categoryId }: PoliciesAndApprovalsFormProps) {
  const router = useRouter();
  const wizard = useCategoryWizard();
  const [pickerOptions, setPickerOptions] = useState<PolicyPickerOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingContinue, setIsSavingContinue] = useState(false);

  const showSaveAsDraft = wizard.status !== "active";

  useEffect(() => {
    Promise.all([getDepartments({ pageSize: EMPLOYEE_LIST_PAGE_SIZE }), getGrades({ pageSize: EMPLOYEE_LIST_PAGE_SIZE }), getProjects(), getEmployees({ pageSize: EMPLOYEE_LIST_PAGE_SIZE })])
      .then(([departmentsResponse, gradesResponse, projectsResponse, employeesResponse]) => {
        setPickerOptions({
          departments: departmentsResponse.departments,
          grades: gradesResponse.grades,
          projects: projectsResponse.projects,
          employees: employeesResponse.employees,
        });
      })
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      });
  }, []);

  // Approvers are limited to the privilege-scoped picker (matching the
  // Approver picker used everywhere else in this codebase), unlike the
  // Employee List eligibility multi-select above, which allows any employee.
  const [approverOptions, setApproverOptions] = useState<PolicyPickerOptions["employees"]>([]);
  useEffect(() => {
    getEmployeesForPicker()
      .then((response) => setApproverOptions(response.employees))
      .catch(() => setApproverOptions([]));
  }, []);

  // A brand-new category lands here with zero Claim Policies — 013's Flow
  // point 1 requires one card ("Policy 01") to already be present.
  useEffect(() => {
    if (wizard.claimPolicies.length === 0) {
      wizard.setClaimPolicies([createBlankPolicy([])]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateClaimPolicy(index: number, policy: CategoryPolicy): void {
    wizard.setClaimPolicies(wizard.claimPolicies.map((current, i) => (i === index ? policy : current)));
  }

  function updateExceptionPolicy(index: number, policy: CategoryPolicy): void {
    wizard.setExceptionPolicies(wizard.exceptionPolicies.map((current, i) => (i === index ? policy : current)));
  }

  function addClaimPolicy(): void {
    if (wizard.claimPolicies.length >= MAX_CLAIM_POLICIES) return;
    wizard.setClaimPolicies([...wizard.claimPolicies, createBlankPolicy(wizard.claimPolicies.map((policy) => policy.name))]);
  }

  function addExceptionPolicy(): void {
    if (wizard.exceptionPolicies.length >= MAX_EXCEPTION_POLICIES) return;
    wizard.setExceptionPolicies([...wizard.exceptionPolicies, createBlankPolicy(wizard.exceptionPolicies.map((policy) => policy.name))]);
  }

  function deleteClaimPolicy(index: number): void {
    // At least one Claim Policy always exists — deleting the last one clears
    // it to blank instead of removing the card (013's Flow point 5).
    if (wizard.claimPolicies.length === 1) {
      wizard.setClaimPolicies([createBlankPolicy([])]);
      return;
    }
    wizard.setClaimPolicies(wizard.claimPolicies.filter((_, i) => i !== index));
  }

  function deleteExceptionPolicy(index: number): void {
    wizard.setExceptionPolicies(wizard.exceptionPolicies.filter((_, i) => i !== index));
  }

  async function persist(isDraftSave: boolean): Promise<void> {
    await saveCategoryPolicies(categoryId, { isDraftSave, claimPolicies: wizard.claimPolicies, exceptionPolicies: wizard.exceptionPolicies });
    const detail = await getCategoryDetail(categoryId);
    wizard.setClaimPolicies(detail.category.claimPolicies);
    wizard.setExceptionPolicies(detail.category.exceptionPolicies);
  }

  async function handleSaveAsDraft(): Promise<void> {
    setIsSavingDraft(true);
    setFormError(null);
    try {
      await persist(true);
      toast.success("Category saved as draft.");
      router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSaveAndContinue(): Promise<void> {
    setIsSavingContinue(true);
    setFormError(null);
    try {
      await persist(false);
      wizard.markStepReached(3);
      router.push(ROUTES.categoryStep(categoryId, CATEGORY_STEP_SEGMENTS.projectPolicies));
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSavingContinue(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (!pickerOptions) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {formError ? <p className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">{formError}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Claim Policies</h2>
          <Button type="button" variant="outline" size="sm" disabled={wizard.claimPolicies.length >= MAX_CLAIM_POLICIES} onClick={addClaimPolicy}>
            <PlusIcon size={14} /> Create Claim Policy
          </Button>
        </div>
        <div className="space-y-3">
          {wizard.claimPolicies.map((policy, index) => (
            <PolicyCard
              key={index}
              policy={policy}
              policyKind="claim"
              fields={wizard.fields}
              pickerOptions={{ ...pickerOptions, employees: approverOptions }}
              onChange={(updated) => updateClaimPolicy(index, updated)}
              onDuplicate={() => wizard.setClaimPolicies([...wizard.claimPolicies, duplicatePolicy(policy, wizard.claimPolicies.map((p) => p.name))])}
              onDelete={() => deleteClaimPolicy(index)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Exception Policies</h2>
          <Button type="button" variant="outline" size="sm" disabled={wizard.exceptionPolicies.length >= MAX_EXCEPTION_POLICIES} onClick={addExceptionPolicy}>
            <PlusIcon size={14} /> Add Exception
          </Button>
        </div>
        <div className="space-y-3">
          {wizard.exceptionPolicies.map((policy, index) => (
            <PolicyCard
              key={index}
              policy={policy}
              policyKind="exception"
              fields={wizard.fields}
              pickerOptions={pickerOptions}
              onChange={(updated) => updateExceptionPolicy(index, updated)}
              onDuplicate={() =>
                wizard.setExceptionPolicies([...wizard.exceptionPolicies, duplicatePolicy(policy, wizard.exceptionPolicies.map((p) => p.name))])
              }
              onDelete={() => deleteExceptionPolicy(index)}
            />
          ))}
        </div>
      </section>

      <WizardFooter
        showSaveAsDraft={showSaveAsDraft}
        primaryLabel="Save & Continue"
        isSavingDraft={isSavingDraft}
        isSavingPrimary={isSavingContinue}
        onSaveAsDraft={handleSaveAsDraft}
        onPrimary={handleSaveAndContinue}
      />
    </div>
  );
}
