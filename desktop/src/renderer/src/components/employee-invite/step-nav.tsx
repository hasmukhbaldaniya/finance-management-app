"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type StepNavItem = {
  id: string;
  label: string;
};

type StepNavProps = {
  steps: StepNavItem[];
};

// A left-rail list of the form's sections, one per SectionCard on the page.
// Clicking a step scrolls to its section; an IntersectionObserver highlights
// whichever section is currently in view. Purely a navigation aid — the form
// is one page and every field is always editable, so this doesn't gate anything.
export function StepNav({ steps }: StepNavProps) {
  const [activeId, setActiveId] = useState(steps[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0]!.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    steps.forEach((step) => {
      const element = document.getElementById(step.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [steps]);

  function handleClick(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Box component="nav" aria-label="Form sections" sx={{ position: "sticky", top: 16, width: 224, flexShrink: 0, alignSelf: "flex-start", display: { xs: "none", md: "block" } }}>
      <Box component="ol" sx={{ display: "flex", flexDirection: "column", gap: 0.5, listStyle: "none", p: 0, m: 0 }}>
        {steps.map((step, index) => {
          const isActive = step.id === activeId;
          return (
            <Box component="li" key={step.id}>
              <Box
                component="button"
                type="button"
                onClick={() => handleClick(step.id)}
                aria-current={isActive ? "step" : undefined}
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 1.5,
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
                <Box
                  sx={{
                    display: "flex",
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: 1,
                    borderColor: isActive ? "primary.main" : "divider",
                    bgcolor: isActive ? "primary.main" : "transparent",
                    color: isActive ? "primary.contrastText" : "text.primary",
                    fontSize: "0.75rem",
                  }}
                >
                  {index + 1}
                </Box>
                <Typography component="span" variant="body2" sx={{ color: "inherit", fontWeight: "inherit" }}>
                  {step.label}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
