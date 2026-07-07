"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
    <nav aria-label="Form sections" className="sticky top-4 hidden w-56 shrink-0 self-start md:block">
      <ol className="space-y-1">
        {steps.map((step, index) => {
          const isActive = step.id === activeId;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => handleClick(step.id)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {index + 1}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
