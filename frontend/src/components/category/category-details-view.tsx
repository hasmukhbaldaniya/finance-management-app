"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategoryLatestVersion, getCategoryVersionDetail, getCategoryVersions } from "@/apis/category";
import { DetailsStepNav } from "./details-step-nav";
import { FieldSummary } from "./field-summary";
import { PolicySummary } from "./policy-summary";
import { Spinner } from "@/components/ui/spinner";
import { CATEGORY_STEP_SEGMENTS } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { CategorySnapshot, CategoryVersionListItem, CategoryWizardStep } from "@/types/category.type";

type CategoryDetailsViewProps = {
  categoryId: number;
};

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
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (loadError || !snapshot) {
    return <p className="px-6 py-16 text-center text-sm text-destructive">{loadError ?? "This version could not be found."}</p>;
  }

  const displayedVersion = currentVersion ?? versions[0]?.version ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <Link href={ROUTES.COMPANY_SETTINGS.CATEGORIES} className="hover:underline">
            Categories Management
          </Link>{" "}
          / {isDraft ? "Draft" : `Version ${displayedVersion ?? ""}`}
        </p>
        {!isDraft && versions.length > 0 ? (
          <select
            value={displayedVersion ?? ""}
            onChange={(event) => handleVersionChange(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {versions.map((version) => (
              <option key={version.version} value={version.version}>
                Version {version.version}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <DetailsStepNav modifiedSteps={modifiedSteps} />
        <div className="min-w-0 flex-1 space-y-8">
          <h1 className="text-2xl font-semibold">{snapshot.name}</h1>

          <section id={CATEGORY_STEP_SEGMENTS.basicDetails} className="scroll-mt-24 space-y-2 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">Basic Details</h2>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">Category Name</span>
              <span className="col-span-2">{snapshot.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">Description</span>
              <span className="col-span-2">{snapshot.description || "—"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">Map Ziptrrip Category</span>
              <span className="col-span-2">{snapshot.ziptrripCategoryKeys.join(", ") || "None"}</span>
            </div>
          </section>

          <section id={CATEGORY_STEP_SEGMENTS.expenseForm} className="scroll-mt-24 space-y-2 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">Expense Form Builder</h2>
            {snapshot.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fields configured for this version.</p>
            ) : (
              <div className="space-y-2">
                {snapshot.fields.map((field) => (
                  <FieldSummary key={field.id} field={field} />
                ))}
              </div>
            )}
          </section>

          <section id={CATEGORY_STEP_SEGMENTS.policiesAndApprovals} className="scroll-mt-24 space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">Policies & Approvals</h2>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Claim Policies</h3>
              {snapshot.claimPolicies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No claim policies configured for this version.</p>
              ) : (
                snapshot.claimPolicies.map((policy) => <PolicySummary key={policy.id} policy={policy} />)
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Exception Policies</h3>
              {snapshot.exceptionPolicies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exception policies configured for this version.</p>
              ) : (
                snapshot.exceptionPolicies.map((policy) => <PolicySummary key={policy.id} policy={policy} />)
              )}
            </div>
          </section>

          <section id={CATEGORY_STEP_SEGMENTS.projectPolicies} className="scroll-mt-24 space-y-2 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">Project Based Policies & Approvals</h2>
            {!snapshot.enableProjectPolicies || snapshot.projectPolicies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project-based policies configured for this version.</p>
            ) : (
              <div className="space-y-2">
                {snapshot.projectPolicies.map((policy) => (
                  <PolicySummary key={policy.id} policy={policy} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
