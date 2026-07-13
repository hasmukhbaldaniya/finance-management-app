"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { toast } from "@/components/ui/toast";
import { PlusIcon } from "@phosphor-icons/react";
import { getCategoryDetail, saveCategoryProjectPolicies } from "@/apis/category";
import { getEmployeesForPicker } from "@/apis/employee";
import { getProjects } from "@/apis/project";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_PROJECT_POLICIES } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PolicyCard } from "./policy-card";
import { createBlankPolicy, duplicatePolicy } from "./policy-factory";
import type { PolicyPickerOptions } from "./policy-shared-types";
import { WizardFooter } from "./wizard-footer";

type ProjectPoliciesFormProps = {
  categoryId: number;
};

export function ProjectPoliciesForm({ categoryId }: ProjectPoliciesFormProps) {
  const router = useRouter();
  const wizard = useCategoryWizard();
  const [pickerOptions, setPickerOptions] = useState<PolicyPickerOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingSubmit, setIsSavingSubmit] = useState(false);

  const showSaveAsDraft = wizard.status !== "active";

  useEffect(() => {
    Promise.all([getProjects(), getEmployeesForPicker()])
      .then(([projectsResponse, employeesResponse]) => {
        setPickerOptions({ departments: [], grades: [], projects: projectsResponse.projects, employees: employeesResponse.employees });
      })
      .catch((error) => setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE));
  }, []);

  function handleToggle(enabled: boolean): void {
    wizard.setEnableProjectPolicies(enabled);
    if (enabled && wizard.projectPolicies.length === 0) {
      wizard.setProjectPolicies([createBlankPolicy([])]);
    }
    if (!enabled) {
      // Switching back to No before Submit discards any Project Policies
      // entered so far — 013's Flow point 2.
      wizard.setProjectPolicies([]);
    }
  }

  function addPolicy(): void {
    if (wizard.projectPolicies.length >= MAX_PROJECT_POLICIES) return;
    wizard.setProjectPolicies([...wizard.projectPolicies, createBlankPolicy(wizard.projectPolicies.map((policy) => policy.name))]);
  }

  function updatePolicy(index: number, policy: ReturnType<typeof createBlankPolicy>): void {
    wizard.setProjectPolicies(wizard.projectPolicies.map((current, i) => (i === index ? policy : current)));
  }

  function deletePolicy(index: number): void {
    // Deleting the last remaining Project Policy while enabled clears it to
    // blank instead of reducing the count below one — 013's Flow point 3.
    if (wizard.projectPolicies.length === 1) {
      wizard.setProjectPolicies([createBlankPolicy([])]);
      return;
    }
    wizard.setProjectPolicies(wizard.projectPolicies.filter((_, i) => i !== index));
  }

  async function persistAndActivate(): Promise<void> {
    const response = await saveCategoryProjectPolicies(categoryId, {
      enableProjectPolicies: wizard.enableProjectPolicies,
      projectPolicies: wizard.enableProjectPolicies ? wizard.projectPolicies : undefined,
    });
    wizard.setStatus(response.status);
    const detail = await getCategoryDetail(categoryId);
    wizard.setProjectPolicies(detail.category.projectPolicies);
  }

  async function handleSaveAsDraft(): Promise<void> {
    setIsSavingDraft(true);
    setFormError(null);
    try {
      await persistAndActivate();
      toast.success("Category created and activated.");
      router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    setIsSavingSubmit(true);
    setFormError(null);
    try {
      await persistAndActivate();
      toast.success("Category created and activated.");
      router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSavingSubmit(false);
    }
  }

  if (loadError) {
    return (
      <Typography variant="body2" color="error">
        {loadError}
      </Typography>
    );
  }

  if (!pickerOptions) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {formError ? (
        <Typography
          variant="body2"
          color="error"
          sx={{ borderRadius: 2, border: 1, borderColor: "error.light", bgcolor: (theme) => alpha(theme.palette.error.main, 0.05), p: 1.5 }}
        >
          {formError}
        </Typography>
      ) : null}

      <Stack spacing={1} sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Enable Project Based Policies and Approval Flow?
        </Typography>
        <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input type="radio" name="enable-project-policies" checked={wizard.enableProjectPolicies} onChange={() => handleToggle(true)} />
            Yes
          </Box>
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input type="radio" name="enable-project-policies" checked={!wizard.enableProjectPolicies} onChange={() => handleToggle(false)} />
            No
          </Box>
        </Stack>
      </Stack>

      {wizard.enableProjectPolicies ? (
        <Stack component="section" spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Project Policies
            </Typography>
            <Button type="button" variant="outline" size="sm" disabled={wizard.projectPolicies.length >= MAX_PROJECT_POLICIES} onClick={addPolicy}>
              <PlusIcon size={14} /> Add Project Policy
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {wizard.projectPolicies.map((policy, index) => (
              <PolicyCard
                key={index}
                policy={policy}
                policyKind="project"
                fields={wizard.fields}
                pickerOptions={pickerOptions}
                onChange={(updated) => updatePolicy(index, updated)}
                onDuplicate={() =>
                  wizard.setProjectPolicies([...wizard.projectPolicies, duplicatePolicy(policy, wizard.projectPolicies.map((p) => p.name))])
                }
                onDelete={() => deletePolicy(index)}
              />
            ))}
          </Stack>
        </Stack>
      ) : null}

      <WizardFooter
        showSaveAsDraft={showSaveAsDraft}
        primaryLabel="Submit"
        isSavingDraft={isSavingDraft}
        isSavingPrimary={isSavingSubmit}
        onSaveAsDraft={handleSaveAsDraft}
        onPrimary={handleSubmit}
      />
    </Stack>
  );
}
