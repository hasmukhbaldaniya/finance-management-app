"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { CATEGORY_STEP_SEGMENTS, CATEGORY_WIZARD_STEPS, CATEGORY_WIZARD_STEP_LABELS } from "@/utils/constants/category.constant";
import type { CategoryWizardStep } from "@/types/category.type";

type DetailsStepNavProps = {
  modifiedSteps: CategoryWizardStep[];
};

// Read-only left rail for the Category Details page — scroll-jump only
// (nothing here gates progression, unlike the wizard's own WizardStepNav),
// plus a "Modified" badge per step that differs from the version immediately
// before the one currently being viewed (016's own Screens & Fields table).
export function DetailsStepNav({ modifiedSteps }: DetailsStepNavProps) {
  const [activeId, setActiveId] = useState<string>(CATEGORY_STEP_SEGMENTS[CATEGORY_WIZARD_STEPS[0]!]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0]!.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    CATEGORY_WIZARD_STEPS.forEach((step) => {
      const element = document.getElementById(CATEGORY_STEP_SEGMENTS[step]);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  function handleClick(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Box component="nav" aria-label="Category detail sections" sx={{ position: "sticky", top: 16, width: 256, flexShrink: 0, alignSelf: "flex-start", display: { xs: "none", md: "block" } }}>
      <Box component="ol" sx={{ display: "flex", flexDirection: "column", gap: 0.5, listStyle: "none", p: 0, m: 0 }}>
        {CATEGORY_WIZARD_STEPS.map((step) => {
          const id = CATEGORY_STEP_SEGMENTS[step];
          const isActive = id === activeId;
          const isModified = modifiedSteps.includes(step);
          return (
            <Box component="li" key={step}>
              <Box
                component="button"
                type="button"
                onClick={() => handleClick(id)}
                aria-current={isActive ? "step" : undefined}
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                  textAlign: "left",
                  fontSize: "0.875rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isActive ? "text.primary" : "text.secondary",
                  fontWeight: isActive ? 500 : 400,
                  bgcolor: isActive ? "action.selected" : "transparent",
                  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                }}
              >
                {CATEGORY_WIZARD_STEP_LABELS[step].title}
                {isModified ? <Chip label="Modified" size="small" color="warning" /> : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
