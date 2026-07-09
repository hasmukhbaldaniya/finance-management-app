"use client";

import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CATEGORY_STEP_SEGMENTS, CATEGORY_WIZARD_STEPS, CATEGORY_WIZARD_STEP_LABELS } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { CategoryWizardStep } from "@/types/category.type";

type WizardStepNavProps = {
  categoryId: number | null;
  currentStep: CategoryWizardStep;
  highestStepIndexReached: number;
};

// The gated, route-based step nav 013's Shared Behavior specifies: numbered
// steps with a checkmark once completed, and completed steps stay clickable
// to revisit — distinct from employee-invite/step-nav.tsx's scroll-jump
// variant, which never gates anything since that form collapsed to one page.
export function WizardStepNav({ categoryId, currentStep, highestStepIndexReached }: WizardStepNavProps) {
  const router = useRouter();
  const currentIndex = CATEGORY_WIZARD_STEPS.indexOf(currentStep);

  function handleClick(stepIndex: number): void {
    if (categoryId === null || stepIndex > highestStepIndexReached) return;
    const step = CATEGORY_WIZARD_STEPS[stepIndex]!;
    router.push(ROUTES.categoryStep(categoryId, CATEGORY_STEP_SEGMENTS[step]));
  }

  return (
    <nav aria-label="Category wizard steps" className="w-full shrink-0 md:w-72">
      <ol className="space-y-2">
        {CATEGORY_WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = !isActive && index <= highestStepIndexReached;
          const isClickable = !isActive && categoryId !== null && index <= highestStepIndexReached;
          const { title, subtitle } = CATEGORY_WIZARD_STEP_LABELS[step];

          return (
            <li key={step}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => handleClick(index)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border",
                  isClickable ? "cursor-pointer hover:bg-muted/50" : "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <CheckIcon size={14} weight="bold" /> : index + 1}
                </span>
                <span className="flex flex-col">
                  <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-foreground/90")}>{title}</span>
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
