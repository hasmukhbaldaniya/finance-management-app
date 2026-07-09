"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
    <nav aria-label="Category detail sections" className="sticky top-4 hidden w-64 shrink-0 self-start md:block">
      <ol className="space-y-1">
        {CATEGORY_WIZARD_STEPS.map((step) => {
          const id = CATEGORY_STEP_SEGMENTS[step];
          const isActive = id === activeId;
          const isModified = modifiedSteps.includes(step);
          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => handleClick(id)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {CATEGORY_WIZARD_STEP_LABELS[step].title}
                {isModified ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Modified</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
