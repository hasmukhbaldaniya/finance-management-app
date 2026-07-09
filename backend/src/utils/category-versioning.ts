import { Category, CategoryVersion } from "../models";
import type { CategoryWizardStep } from "../models/category-version.model";
import { buildCategorySnapshot, type CategorySnapshot } from "./category-snapshot";

export const WIZARD_STEPS: CategoryWizardStep[] = ["basicDetails", "expenseForm", "policiesAndApprovals", "projectPolicies"];

function extractStepSlice(snapshot: CategorySnapshot, step: CategoryWizardStep): unknown {
  switch (step) {
    case "basicDetails":
      return { name: snapshot.name, description: snapshot.description, ziptrripCategoryKeys: snapshot.ziptrripCategoryKeys };
    case "expenseForm":
      return { fields: snapshot.fields };
    case "policiesAndApprovals":
      return { claimPolicies: snapshot.claimPolicies, exceptionPolicies: snapshot.exceptionPolicies };
    case "projectPolicies":
      return { enableProjectPolicies: snapshot.enableProjectPolicies, projectPolicies: snapshot.projectPolicies };
  }
}

// Postgres's jsonb type does not preserve object key order, so a snapshot
// freshly built here and one read back after a round-trip through the
// `snapshot` JSONB column can carry the same data with differently-ordered
// keys. A plain JSON.stringify comparison would treat that as a spurious
// diff, so object keys are sorted recursively before stringifying — array
// order is left untouched, since arrays here are meaningfully ordered
// (by position/level/stageNumber, see category-snapshot.ts).
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function diffSteps(previous: CategorySnapshot, current: CategorySnapshot): CategoryWizardStep[] {
  return WIZARD_STEPS.filter((step) => stableStringify(extractStepSlice(previous, step)) !== stableStringify(extractStepSlice(current, step)));
}

// The versioning engine's one entry point — called both by Step 4's Submit
// (013's activation call, producing 1.0) and by the edit-session-end trigger
// (015/016 — see 016's Open Questions for why "leaving the wizard" rather
// than any single per-step save is what fires this). Returns the newly
// created version, or null if nothing actually changed since the last one.
export async function createCategoryVersion(category: Category, createdBy: number | null): Promise<CategoryVersion | null> {
  const currentSnapshot = await buildCategorySnapshot(category);

  const previousVersion = await CategoryVersion.findOne({
    where: { categoryId: category.id },
    order: [
      ["majorVersion", "DESC"],
      ["minorVersion", "DESC"],
    ],
  });

  if (!previousVersion) {
    return CategoryVersion.create({
      categoryId: category.id,
      majorVersion: 1,
      minorVersion: 0,
      isMajor: true,
      snapshot: currentSnapshot,
      modifiedSteps: [],
      createdBy,
    });
  }

  const modifiedSteps = diffSteps(previousVersion.snapshot as CategorySnapshot, currentSnapshot);
  if (modifiedSteps.length === 0) {
    return null;
  }

  const isMajor = modifiedSteps.length >= 3;
  return CategoryVersion.create({
    categoryId: category.id,
    majorVersion: isMajor ? previousVersion.majorVersion + 1 : previousVersion.majorVersion,
    minorVersion: isMajor ? 0 : previousVersion.minorVersion + 1,
    isMajor,
    snapshot: currentSnapshot,
    modifiedSteps,
    createdBy,
  });
}
