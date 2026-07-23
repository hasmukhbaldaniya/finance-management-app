"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CheckIcon } from "@phosphor-icons/react";
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
    <Box component="nav" aria-label="Category wizard steps" sx={{ width: { xs: "100%", md: 288 }, flexShrink: 0 }}>
      <Box component="ol" sx={{ display: "flex", flexDirection: "column", gap: 1, listStyle: "none", p: 0, m: 0 }}>
        {CATEGORY_WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = !isActive && index <= highestStepIndexReached;
          const isClickable = !isActive && categoryId !== null && index <= highestStepIndexReached;
          const { title, subtitle } = CATEGORY_WIZARD_STEP_LABELS[step];

          return (
            <Box component="li" key={step}>
              <Box
                component="button"
                type="button"
                disabled={!isClickable}
                onClick={() => handleClick(index)}
                aria-current={isActive ? "step" : undefined}
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "flex-start",
                  gap: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: isActive ? "primary.main" : "divider",
                  bgcolor: isActive ? "action.selected" : "transparent",
                  px: 2,
                  py: 1.5,
                  textAlign: "left",
                  background: isActive ? undefined : "none",
                  cursor: isClickable ? "pointer" : "default",
                  "&:hover": isClickable ? { bgcolor: "action.hover" } : undefined,
                }}
              >
                <Box
                  sx={{
                    mt: 0.25,
                    display: "flex",
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: 1,
                    borderColor: isActive ? "primary.main" : isCompleted ? "success.main" : "divider",
                    bgcolor: isActive ? "primary.main" : isCompleted ? "success.main" : "transparent",
                    color: isActive ? "primary.contrastText" : isCompleted ? "success.contrastText" : "text.secondary",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  {isCompleted ? <CheckIcon size={14} weight="bold" /> : index + 1}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
