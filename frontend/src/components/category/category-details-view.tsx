"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { getCategoryLatestVersion, getCategoryVersionDetail, getCategoryVersions } from "@/apis/category";
import { DetailsStepNav } from "./details-step-nav";
import { FieldSummary } from "./field-summary";
import { PolicySummary } from "./policy-summary";
import { SelectField } from "@/components/select-field";
import { Spinner } from "@/components/ui/spinner";
import { CATEGORY_STEP_SEGMENTS } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { CategorySnapshot, CategoryVersionListItem, CategoryWizardStep } from "@/types/category.type";

type CategoryDetailsViewProps = {
  categoryId: number;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, fontSize: "0.875rem" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ gridColumn: "span 2" }}>
        {value}
      </Typography>
    </Box>
  );
}

const sectionSx = { scrollMarginTop: 96, borderRadius: 2, border: 1, borderColor: "divider", p: 2 } as const;

export function CategoryDetailsView({ categoryId }: CategoryDetailsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedVersion = searchParams.get("version");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CategorySnapshot | null>(null);
  const [modifiedSteps, setModifiedSteps] = useState<CategoryWizardStep[]>([]);
  const [versions, setVersions] = useState<CategoryVersionListItem[]>([]);
  const [isDraft, setIsDraft] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    getCategoryVersions(categoryId)
      .then((response) => {
        setIsDraft(response.isDraft);
        setVersions(response.isDraft ? [] : response.versions);
      })
      .catch(() => undefined);
  }, [categoryId]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    const request = requestedVersion ? getCategoryVersionDetail(categoryId, requestedVersion) : getCategoryLatestVersion(categoryId);
    request
      .then((response) => {
        setSnapshot(response.category);
        setModifiedSteps(response.modifiedSteps);
        setCurrentVersion(requestedVersion);
      })
      .catch((error) => setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE))
      .finally(() => setIsLoading(false));
  }, [categoryId, requestedVersion]);

  function handleVersionChange(version: string): void {
    router.push(`${ROUTES.categoryDetails(categoryId)}?version=${version}`);
  }

  if (isLoading && !snapshot) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  if (loadError || !snapshot) {
    return (
      <Typography variant="body2" color="error" sx={{ px: 3, py: 8, textAlign: "center" }}>
        {loadError ?? "This version could not be found."}
      </Typography>
    );
  }

  const displayedVersion = currentVersion ?? versions[0]?.version ?? null;

  return (
    <Box sx={{ mx: "auto", maxWidth: 1152, px: 3, py: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          <MuiLink component={Link} href={ROUTES.COMPANY_SETTINGS.CATEGORIES} sx={{ "&:hover": { textDecoration: "underline" } }}>
            Categories Management
          </MuiLink>{" "}
          / {isDraft ? "Draft" : `Version ${displayedVersion ?? ""}`}
        </Typography>
        {!isDraft && versions.length > 0 ? (
          <SelectField
            value={displayedVersion ?? ""}
            onValueChange={handleVersionChange}
            options={versions.map((version) => ({ value: version.version, label: `Version ${version.version}` }))}
            sx={{ width: "auto" }}
          />
        ) : null}
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <DetailsStepNav modifiedSteps={modifiedSteps} />
        <Stack spacing={4} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {snapshot.name}
          </Typography>

          <Stack component="section" id={CATEGORY_STEP_SEGMENTS.basicDetails} spacing={1} sx={sectionSx}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Basic Details
            </Typography>
            <DetailRow label="Category Name" value={snapshot.name} />
            <DetailRow label="Description" value={snapshot.description || "—"} />
            <DetailRow label="Map Ziptrrip Category" value={snapshot.ziptrripCategoryKeys.join(", ") || "None"} />
          </Stack>

          <Stack component="section" id={CATEGORY_STEP_SEGMENTS.expenseForm} spacing={1} sx={sectionSx}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Expense Form Builder
            </Typography>
            {snapshot.fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No fields configured for this version.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {snapshot.fields.map((field) => (
                  <FieldSummary key={field.id} field={field} />
                ))}
              </Stack>
            )}
          </Stack>

          <Stack component="section" id={CATEGORY_STEP_SEGMENTS.policiesAndApprovals} spacing={2} sx={sectionSx}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Policies &amp; Approvals
            </Typography>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Claim Policies
              </Typography>
              {snapshot.claimPolicies.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No claim policies configured for this version.
                </Typography>
              ) : (
                snapshot.claimPolicies.map((policy) => <PolicySummary key={policy.id} policy={policy} />)
              )}
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Exception Policies
              </Typography>
              {snapshot.exceptionPolicies.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No exception policies configured for this version.
                </Typography>
              ) : (
                snapshot.exceptionPolicies.map((policy) => <PolicySummary key={policy.id} policy={policy} />)
              )}
            </Stack>
          </Stack>

          <Stack component="section" id={CATEGORY_STEP_SEGMENTS.projectPolicies} spacing={1} sx={sectionSx}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Project Based Policies &amp; Approvals
            </Typography>
            {!snapshot.enableProjectPolicies || snapshot.projectPolicies.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No project-based policies configured for this version.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {snapshot.projectPolicies.map((policy) => (
                  <PolicySummary key={policy.id} policy={policy} />
                ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
